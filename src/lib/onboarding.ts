// A linha de documento como a TELA do consultor a mostra.
//
// Três coisas saíram desta lib na ALE-29, e o motivo de cada uma:
//
// - A lista de 4 rótulos de grupo que vivia aqui era o quarto vocabulário do
//   sistema para a mesma coisa, e chamava a terceira gaveta por outro nome. O
//   vocabulário oficial é o de `GRUPOS_DOCUMENTO`
//   (src/lib/agrupadorDocumentos.ts), fechado na EDU-26: chave `bens_imoveis`,
//   rótulo "Bens e Imóveis".
// - A função que descobria a gaveta a partir do texto livre de `entidade`:
//   qualquer variação de grafia caía em "Outros" sem erro. Hoje a gaveta é COLUNA
//   gravada em `solicitacao_item` e em `documento_tipo` — não há o que adivinhar.
// - O mapa que fazia o inverso, e era pior: a partir da gaveta escolhida, CHUTAVA
//   uma entidade. Foi dele que saiu o `entidade = 'Bem'` que apareceu em 7 de 475
//   linhas de cliente, enquanto o catálogo, corrigido depois, dizia 'Cliente'.
//
// Por isso o campo de entidade também saiu daqui: entidade é só rótulo derivado
// do grão, e quem agrupa é a gaveta.

import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import { GRUPOS_DOCUMENTO } from '@/lib/agrupadorDocumentos';
import { normalizarNomeDocumento, type Granularidade } from '@/lib/solicitacao';

export interface OnboardingDocument {
  id: string;
  /** Ausente = documento criado à mão, que não existe no catálogo. */
  catalogId?: string;
  code?: string;
  title: string;
  note: string;
  /** A gaveta da área do cliente. Dado gravado, nunca inferido de texto. */
  grupo: GrupoDocumentoKey;
  /** O grão: por qual coisa o documento se repete. */
  granularidade: Granularidade;
}

/**
 * Identidade de um documento na solicitação.
 *
 * O item de catálogo se identifica pelo tipo. O manual passa a se identificar só
 * pelo nome, porque `entidade` saiu do formulário.
 *
 * O banco recusa a duplicata exata pela constraint
 * `uq_solicitacao_item_documento`. Esta identidade normaliza caixa, espaço e
 * acento, então cobre também as variações de grafia que a constraint deixa
 * passar — e é o que evita oferecer nos opcionais um documento já pedido.
 */
export function checklistDocumentIdentity(
  catalogId: string | null | undefined,
  title: string,
) {
  return catalogId ? `catalog:${catalogId}` : `manual:${normalizarNomeDocumento(title)}`;
}

export function documentIdentity(
  document: Pick<OnboardingDocument, 'catalogId' | 'title'>,
) {
  return checklistDocumentIdentity(document.catalogId, document.title);
}

/**
 * Documentos que existem no catálogo mas ainda não estão na lista em tela — são
 * os "opcionais", que o analista inclui com um clique.
 */
export function findAvailableCatalogDocuments(
  catalogDocuments: OnboardingDocument[],
  currentDocuments: OnboardingDocument[],
): OnboardingDocument[] {
  const used = new Set(currentDocuments.map(documentIdentity));
  return catalogDocuments.filter((document) => !used.has(documentIdentity(document)));
}

/**
 * Agrupa pelas 4 gavetas, na ordem de `GRUPOS_DOCUMENTO`.
 *
 * Genérica em `{ grupo }` de propósito: serve tanto ao item da solicitação
 * quanto ao documento do catálogo, sem os dois precisarem ser o mesmo tipo.
 * Devolve todas as gavetas, inclusive as vazias — o accordion mostra as quatro.
 */
export function groupOnboardingDocuments<T extends { grupo: GrupoDocumentoKey }>(
  documents: T[],
): Record<GrupoDocumentoKey, T[]> {
  const groups = Object.fromEntries(
    GRUPOS_DOCUMENTO.map((grupo) => [grupo.key, [] as T[]]),
  ) as Record<GrupoDocumentoKey, T[]>;

  documents.forEach((document) => {
    groups[document.grupo].push(document);
  });

  return groups;
}
