import {
  comporBlocos,
  gerarBlocos,
  marcarRealceDiff,
  unirBlocos,
  type Bloco,
  type BlocoGerado,
} from '@/lib/templates';
import { conteudoParaDeteccao, detectarBindingsDeConteudo, normalizarReferenciasLegadas, normalizarSelecaoLegada } from '@/lib/templates/binding';
import { montarContexto, reidratarItensPorLista } from '@/lib/templates/mapeadores';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';

export interface VersaoRenderizada {
  blocos: BlocoGerado[];
  texto: string;
  erro: string | null;
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
  blocosSnapshot: Bloco[] | null | undefined,
  flags: string[] | null | undefined,
  dados: SnapshotDados | null | undefined,
  normalizarSocietario = false,
): VersaoRenderizada {
  if (!blocosSnapshot || blocosSnapshot.length === 0) return VAZIO;
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
    const flagsAtivas = flags ?? [];
    // Detecção de bindings roda sobre os COMPOSTOS (bloco excluído não pede valor),
    // como na tela viva.
    const compostos = comporBlocos(template, flagsAtivas);
    const { bindings, listas, desconhecidos, secoesDesconhecidas } = detectarBindingsDeConteudo(
      compostos.map(conteudoParaDeteccao).join(' '),
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

    const blocos = gerarBlocos(template, ctx, flagsAtivas);
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
