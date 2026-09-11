import {
  comporBlocos,
  gerarBlocos,
  marcarRealceDiff,
  unirBlocos,
  type Bloco,
  type BlocoGerado,
  type RegistroFamilias,
  type Contexto,
} from '@/lib/templates';
import { compilar, type No } from '@/lib/templates/render';
import { resolverVariante } from '@/lib/templates/familia';
import { conteudoParaDeteccao, detectarBindingsDeConteudo } from '@/lib/templates/binding';
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
 * existe para impedir. Legados só são reproduzidos quando têm dados suficientes.
 */
export type SnapshotVersoes = Bloco[] | {
  blocos: Bloco[];
  familias?: RegistroFamilias;
  /** Contexto efetivamente usado na prévia, inclusive campos derivados e georef. */
  contextoRender?: Contexto;
};

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

// O motor trata seção ausente como falsa. Na reprodução isso esconderia perda
// de dados. Verificamos apenas os ramos visitados, sem exigir campos de ramos falsos.
function conferirSecoes(nos: No[], escopos: Contexto[], familias: RegistroFamilias, pilha: string[] = []): void {
  const ler = (caminho: string): unknown => {
    for (const escopo of escopos) {
      let valor: unknown = escopo;
      for (const parte of caminho.split('.')) {
        valor = valor != null && typeof valor === 'object' ? (valor as Contexto)[parte] : undefined;
      }
      if (valor !== undefined) return valor;
    }
    return undefined;
  };
  for (const no of nos) {
    if (no.tipo === 'inclusao') {
      if (pilha.includes(no.familia)) throw new Error(`Família circular: ${no.familia}.`);
      const variantes = familias[no.familia];
      if (!variantes?.length) throw new Error(`Família ausente: ${no.familia}.`);
      for (const variante of variantes) {
        for (const campo of Object.keys(variante.seletor)) {
          if (ler(campo) === undefined) throw new Error(`Seletor ausente: ${campo}.`);
        }
      }
      const variante = resolverVariante(variantes, ler, no.familia);
      conferirSecoes(compilar(variante.conteudo), escopos, familias, [...pilha, no.familia]);
    } else if (no.tipo === 'secao') {
      const valor = ler(no.nome);
      if (valor === undefined) throw new Error(`Seção ausente: ${no.nome}.`);
      if (Array.isArray(valor)) {
        for (const item of valor) conferirSecoes(no.filhos, [item, ...escopos], familias, pilha);
      } else if (valor && valor !== 'false') {
        conferirSecoes(no.filhos, escopos, familias, pilha);
      }
    }
  }
}

/**
 * Renderiza uma versão SELADA puramente a partir do seu snapshot — sem tocar nos
 * cadastros vivos. Espelha o memo `resultado` da tela Gerar, mas lê tudo de
 * snapshot_versoes_blocos (blocos já resolvidos, com overrides aplicados ao
 * conteúdo) + snapshot_dados (seleção/valores livres/listas/total) +
 * snapshot_flags. Contexto completo, quando presente, prevalece sobre os dados
 * legados. Não reconstrói lacunas a partir do estado atual do sistema.
 */
export function renderizarVersao(
  snapshot: SnapshotVersoes | null | undefined,
  flags: string[] | null | undefined,
  dados: SnapshotDados | null | undefined,
): VersaoRenderizada {
  try {
    const { blocos: blocosSnapshot, familias } = lerSnapshotVersoes(snapshot);
    if (blocosSnapshot.length === 0) throw new Error('Blocos ausentes no snapshot.');
    if (!Array.isArray(flags)) throw new Error('Flags ausentes no snapshot.');
    const contextoSalvo = snapshot && !Array.isArray(snapshot) ? snapshot.contextoRender : undefined;
    const dadosEfetivos = dados;
    const template = { id: 'versao', nome: 'documento', blocos: blocosSnapshot };
    const flagsAtivas = flags;
    // Detecção de bindings roda sobre os COMPOSTOS (bloco excluído não pede valor),
    // como na tela viva.
    const compostos = comporBlocos(template, flagsAtivas);
    const { bindings, listas, desconhecidos, secoesDesconhecidas } = detectarBindingsDeConteudo(
      compostos.map((b) => conteudoParaDeteccao(b, familias)).join(' '),
    );

    let ctx: Contexto;
    if (contextoSalvo) {
      ctx = structuredClone(contextoSalvo);
      const colecoes = Object.fromEntries(Object.entries(ctx).filter(([, v]) => Array.isArray(v))) as Parameters<typeof reidratarItensPorLista>[0];
      reidratarItensPorLista(colecoes);
    } else {
      if (!dadosEfetivos) throw new Error('Dados ausentes no snapshot.');
      for (const lista of listas) {
        if (!Array.isArray(dadosEfetivos.itensPorLista?.[lista.nome])) throw new Error(`Lista ausente: ${lista.nome}.`);
      }
      const livres: Record<string, string> = {};
      for (const ph of [...desconhecidos, ...secoesDesconhecidas]) {
        if (ph.startsWith('total.') && dadosEfetivos.total) continue;
        const valor = dadosEfetivos.valoresLivres?.[ph];
        if (valor === undefined) throw new Error(`Valor ausente: ${ph}.`);
        livres[ph] = valor;
      }

      // O snapshot vem do jsonb: reidratar religa as referências cruzadas perdidas.
      const itens = reidratarItensPorLista(structuredClone(dadosEfetivos.itensPorLista ?? {}));
      ctx = montarContexto(bindings, structuredClone(dadosEfetivos.selecao ?? {}), livres, itens, listas);
      if (dadosEfetivos.total) ctx.total = { ...dadosEfetivos.total };
    }
    for (const bloco of compostos) {
      const conteudo = bloco.repeteColecao
        ? `{{#${bloco.repeteColecao}}}${bloco.conteudo}{{/${bloco.repeteColecao}}}`
        : bloco.conteudo;
      conferirSecoes(compilar(conteudo), [ctx], familias);
    }

    // As famílias vêm do próprio snapshot: a versão selada renderiza com o texto
    // de variante daquele momento, não com o que a Biblioteca tem hoje.
    const blocos = gerarBlocos(template, ctx, flagsAtivas, familias);
    return { blocos, texto: unirBlocos(blocos), erro: null };
  } catch (e) {
    return { blocos: [], texto: '', erro: `Não é possível reproduzir esta versão com o snapshot disponível. ${e instanceof Error ? e.message : String(e)} Nenhum dado da Biblioteca ou do cadastro atual foi usado.` };
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
