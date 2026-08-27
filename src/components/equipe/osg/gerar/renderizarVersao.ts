import {
  comFlagDaPecaRetroativa,
  comporBlocos,
  gerarBlocos,
  marcarRealceDiff,
  unirBlocos,
  type Bloco,
  type BlocoGerado,
  type RegistroFamilias,
} from '@/lib/templates';
import { conteudoParaDeteccao, detectarBindingsDeConteudo, normalizarReferenciasLegadas, normalizarSelecaoLegada } from '@/lib/templates/binding';
import { montarContexto, reidratarItensPorLista } from '@/lib/templates/mapeadores';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';

export interface VersaoRenderizada {
  blocos: BlocoGerado[];
  texto: string;
  erro: string | null;
}

/**
 * O que viaja em `documento_gerado.snapshot_versoes_blocos`.
 *
 * Formato ANTIGO (todo documento selado antes das famílias de variantes): só o
 * array de blocos. Formato novo: blocos + as famílias que participaram, com o
 * texto de cada variante congelado — sem isso, editar uma variante na Biblioteca
 * mudaria a redação de uma versão já selada, que é exatamente o que o snapshot
 * existe para impedir. As duas formas seguem legíveis para sempre.
 */
export type SnapshotVersoes = Bloco[] | { blocos: Bloco[]; familias?: RegistroFamilias };

export interface SnapshotVersoesLido {
  blocos: Bloco[];
  familias: RegistroFamilias;
}

/** Normaliza os dois formatos do snapshot numa forma só. */
export function lerSnapshotVersoes(bruto: SnapshotVersoes | null | undefined): SnapshotVersoesLido {
  if (!bruto) return { blocos: [], familias: {} };
  if (Array.isArray(bruto)) return { blocos: bruto, familias: {} };
  return { blocos: bruto.blocos ?? [], familias: bruto.familias ?? {} };
}

const VAZIO: VersaoRenderizada = { blocos: [], texto: '', erro: null };

/**
 * Renderiza uma versão SELADA puramente a partir do seu snapshot — sem tocar nos
 * cadastros vivos. Espelha o memo `resultado` da tela Gerar, mas lê tudo de
 * snapshot_versoes_blocos (blocos já resolvidos, com overrides aplicados ao
 * conteúdo) + snapshot_dados (seleção/valores livres/listas/total) +
 * snapshot_flags. É o que torna uma versão antiga reproduzível para sempre,
 * mesmo depois que a Biblioteca, os overrides ou os cadastros mudarem.
 */
export function renderizarVersao(
  snapshot: SnapshotVersoes | null | undefined,
  flags: string[] | null | undefined,
  dados: SnapshotDados | null | undefined,
  normalizarSocietario = false,
): VersaoRenderizada {
  const { blocos: blocosSnapshot, familias } = lerSnapshotVersoes(snapshot);
  if (blocosSnapshot.length === 0) return VAZIO;
  try {
    const blocosEfetivos = normalizarSocietario
      ? blocosSnapshot.map((bloco) => ({
          ...bloco,
          conteudo: normalizarReferenciasLegadas(bloco.conteudo),
        }))
      : blocosSnapshot;
    const dadosEfetivos = normalizarSocietario && dados
      ? {
          ...dados,
          selecao: normalizarSelecaoLegada(dados.selecao ?? {}, dados.valoresLivres ?? {}),
        }
      : dados;
    const template = { id: 'versao', nome: 'documento', blocos: blocosEfetivos };
    // Mesma compatibilidade da tela viva: snapshot selado antes de as flags de
    // peça existirem é contrato social e não sabe dizê-lo (ver
    // comFlagDaPecaRetroativa). Sem isto, a versão antiga reabre sem a cláusula
    // de capital, de sede e de objeto.
    const flagsAtivas = comFlagDaPecaRetroativa(flags ?? []);
    // Detecção de bindings roda sobre os COMPOSTOS (bloco excluído não pede valor),
    // como na tela viva.
    const compostos = comporBlocos(template, flagsAtivas);
    const { bindings, listas, desconhecidos, secoesDesconhecidas } = detectarBindingsDeConteudo(
      compostos.map((b) => conteudoParaDeteccao(b, familias)).join(' '),
    );

    const livres: Record<string, string> = {};
    for (const ph of desconhecidos) livres[ph] = dadosEfetivos?.valoresLivres?.[ph] ?? '';
    for (const nome of secoesDesconhecidas) livres[nome] = dadosEfetivos?.valoresLivres?.[nome] ?? '';

    // O snapshot vem do jsonb (round-trip): reidratar religa as referências
    // cruzadas de integralizacoes ({{ refItem.ref }}) perdidas na serialização.
    const itens = reidratarItensPorLista(dadosEfetivos?.itensPorLista ?? {});
    const ctx = montarContexto(bindings, dadosEfetivos?.selecao ?? {}, livres, itens, listas);
    if (listas.some((l) => l.nome === 'socios')) {
      ctx.total = { quotas: '', vlrTotal: '', percentual: '', ...(dadosEfetivos?.total ?? {}) };
    }

    // As famílias vêm do próprio snapshot: a versão selada renderiza com o texto
    // de variante daquele momento, não com o que a Biblioteca tem hoje.
    const blocos = gerarBlocos(template, ctx, flagsAtivas, familias);
    return { blocos, texto: unirBlocos(blocos), erro: null };
  } catch (e) {
    return { blocos: [], texto: '', erro: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Marca, nos blocos de uma versão, o que mudou em relação à versão anterior:
 * casa cada bloco pelo id de posição (estável na linhagem) e realça, por palavra,
 * o texto que difere — reaproveitando o mesmo diff do realce de override. Bloco
 * sem correspondente na versão anterior (cláusula nova, instância de repetidor a
 * mais) é realçado por inteiro. Sem baseline utilizável, nada é realçado: vale
 * tanto para a raiz (sem anterior) quanto para uma anterior NÃO reproduzível
 * (selada antes do snapshot → renderiza vazia) — senão o diff contra vazio
 * marcaria o documento inteiro como novo.
 */
export function realcarMudancas(
  blocos: BlocoGerado[],
  blocosAnteriores: BlocoGerado[] | null,
): BlocoGerado[] {
  if (!blocosAnteriores || blocosAnteriores.length === 0) return blocos;
  const anteriorPorId = new Map(blocosAnteriores.map((b) => [b.id, b.conteudo]));
  return blocos.map((b) => ({
    ...b,
    // Sem baseline (''), o diff marca o bloco inteiro como novo nesta versão.
    segmentos: marcarRealceDiff(b.segmentos, anteriorPorId.get(b.id) ?? ''),
  }));
}
