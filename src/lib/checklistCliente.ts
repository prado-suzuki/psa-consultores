// A fase de checklist na área do cliente: as pendências da RPC arrumadas em
// gaveta e entidade.
//
// O eixo mudou em relação à gaveta-balde. Lá a lista era de DOCUMENTOS, com nome
// repetido removido: "CPF" pedido para três pessoas aparecia uma vez, porque o
// cliente jogava tudo no balde e a PSA classificava depois. Aqui a lista é de
// PENDÊNCIAS concretas, uma por documento x entidade, porque o arquivo precisa
// nascer sabendo de quem é. Por isso não há dedup: as três linhas de CPF são o
// ponto.
//
// As 4 gavetas seguem como agrupador, pela coluna `grupo` do item, igual à fase
// anterior. Ver docs/planos/checklist-por-subtracao.md.
import type { PendenciaCliente } from '@/hooks/useDomainPendenciasCliente';
import {
  GRUPOS_DOCUMENTO,
  type GrupoDocumento,
  type GrupoDocumentoKey,
} from '@/lib/agrupadorDocumentos';

/** Uma entidade do cadastro do cliente, com o que falta nela. */
export interface EntidadeChecklist {
  /** Chave estável para lista e estado de UI. */
  chave: string;
  nome: string;
  detalhe: string | null;
  pendencias: PendenciaCliente[];
  faltando: number;
}

/** Uma das 4 gavetas, agora com entidades dentro. */
export interface GavetaChecklist extends GrupoDocumento {
  entidades: EntidadeChecklist[];
  faltando: number;
  recebidos: number;
}

export interface ResumoPendencias {
  faltando: number;
  recebidos: number;
  total: number;
  pct: number;
}

const chaveDoAlvo = (pendencia: PendenciaCliente): string =>
  pendencia.alvo.kind === 'cliente' ? 'cliente' : `${pendencia.alvo.kind}:${pendencia.alvo.id}`;

/**
 * O nome que a entidade recebe na tela do cliente.
 *
 * A RPC já entrega o nome; o fallback existe para cadastro sem denominação, que
 * acontece de verdade, e é melhor que uma linha sem título nenhuma.
 */
const nomeDoAlvo = (pendencia: PendenciaCliente): string => {
  const nome = pendencia.alvo.nome?.trim();
  if (nome) return nome;
  return pendencia.alvo.kind === 'cliente' ? 'Documentos gerais' : 'Sem identificação';
};

/**
 * Monta as gavetas com as entidades e as pendências de cada uma.
 *
 * Gaveta sem nenhuma pendência não entra: o cliente não precisa ver "Pessoas
 * Jurídicas" vazia porque nada de PJ foi pedido a ele. Dentro da gaveta, entidade
 * com pendência aberta vem primeiro, e dentro da entidade o que falta vem antes do
 * que já chegou: o trabalho fica no topo em todos os níveis.
 */
export function montarGavetasChecklist(
  pendencias: readonly PendenciaCliente[],
): GavetaChecklist[] {
  const porGrupo = new Map<GrupoDocumentoKey, Map<string, EntidadeChecklist>>();

  for (const pendencia of pendencias) {
    const entidades = porGrupo.get(pendencia.grupo) ?? new Map<string, EntidadeChecklist>();
    const chave = chaveDoAlvo(pendencia);
    const atual = entidades.get(chave);
    if (atual) {
      atual.pendencias.push(pendencia);
      if (!pendencia.recebido) atual.faltando += 1;
    } else {
      entidades.set(chave, {
        chave,
        nome: nomeDoAlvo(pendencia),
        detalhe: pendencia.alvo.detalhe,
        pendencias: [pendencia],
        faltando: pendencia.recebido ? 0 : 1,
      });
    }
    porGrupo.set(pendencia.grupo, entidades);
  }

  const gavetas: GavetaChecklist[] = [];
  for (const grupo of GRUPOS_DOCUMENTO) {
    const entidades = [...(porGrupo.get(grupo.key)?.values() ?? [])];
    if (entidades.length === 0) continue;

    for (const entidade of entidades) {
      entidade.pendencias.sort((esquerda, direita) =>
        Number(esquerda.recebido) - Number(direita.recebido)
        || esquerda.documento.localeCompare(direita.documento, 'pt-BR'));
    }
    entidades.sort((esquerda, direita) =>
      Number(direita.faltando > 0) - Number(esquerda.faltando > 0)
      || esquerda.nome.localeCompare(direita.nome, 'pt-BR'));

    const faltando = entidades.reduce((soma, entidade) => soma + entidade.faltando, 0);
    const total = entidades.reduce((soma, entidade) => soma + entidade.pendencias.length, 0);
    gavetas.push({ ...grupo, entidades, faltando, recebidos: total - faltando });
  }
  return gavetas;
}

/** Quanto da coleta já está de pé. */
export function resumirPendencias(
  pendencias: readonly PendenciaCliente[],
): ResumoPendencias {
  const total = pendencias.length;
  const recebidos = pendencias.filter((pendencia) => pendencia.recebido).length;
  return {
    faltando: total - recebidos,
    recebidos,
    total,
    pct: total ? Math.round((recebidos / total) * 100) : 0,
  };
}
