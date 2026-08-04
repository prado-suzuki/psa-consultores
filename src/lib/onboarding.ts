import type { Database } from '@/integrations/supabase/types';

export const ONBOARDING_GROUPS = [
  'Pessoas Físicas',
  'Pessoas Jurídicas',
  'Bens e Direitos',
  'Outros documentos',
] as const;

export type OnboardingGroup = (typeof ONBOARDING_GROUPS)[number];
export interface OnboardingGroupDefaults {
  entity: string;
  module: string;
}

export const ONBOARDING_GROUP_DEFAULTS: Record<
  OnboardingGroup,
  OnboardingGroupDefaults
> = {
  'Pessoas Físicas': {
    entity: 'Pessoa Física',
    module: 'Qualificação das Partes',
  },
  'Pessoas Jurídicas': {
    entity: 'Pessoa Jurídica',
    module: 'Qualificação das Partes',
  },
  'Bens e Direitos': {
    entity: 'Bem',
    module: 'Diagnóstico Patrimonial',
  },
  'Outros documentos': {
    entity: 'Cliente',
    module: 'Diagnóstico Patrimonial',
  },
};

export type OnboardingDocumentCategory =
  Database['public']['Enums']['osg_doc_categoria'];

export interface OnboardingDocument {
  id: string;
  catalogId?: string;
  code?: string;
  title: string;
  entity: string;
  module: string;
  note: string;
  required: boolean;
  category: OnboardingDocumentCategory | null;
  docboxCategory: string | null;
  confidential: boolean;
  productId: string;
}

// `OnboardingProduct` saiu junto: a tela não monta mais lista por produto. Os
// produtos contratados vêm da OS (`OnboardingProdutoContratado`, em
// `useOnboarding`) e servem só para exibir quais são — o catálogo de documentos
// não se organiza mais por produto.

// O balde por produto (`SOLICITACAO_BUCKET`, `DocumentsByProduct`,
// `buildDocumentsByProduct`, `consolidateDocuments` e o tipo consolidado) saiu na
// ALE-28: a lista passou a viver em `solicitacao_item`, que não tem coluna de
// produto — o rascunho não é mais uma pilha de baldes em memória para consolidar
// no fim.

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export function getOnboardingGroup(entity: string): OnboardingGroup {
  const normalizedEntity = normalize(entity);

  if (normalizedEntity.startsWith('pessoa fisica')) return 'Pessoas Físicas';
  if (normalizedEntity.startsWith('pessoa juridica')) return 'Pessoas Jurídicas';
  if (
    normalizedEntity === 'bem'
    || normalizedEntity.startsWith('matricula')
    || normalizedEntity.includes('imovel rural')
    || normalizedEntity.includes('imovel urbano')
  ) {
    return 'Bens e Direitos';
  }

  return 'Outros documentos';
}

export function getOnboardingGroupDefaults(
  group: OnboardingGroup,
): OnboardingGroupDefaults {
  return ONBOARDING_GROUP_DEFAULTS[group];
}

export function checklistDocumentIdentity(
  catalogId: string | null | undefined,
  title: string,
  entity: string,
) {
  return catalogId
    ? `catalog:${catalogId}`
    : `manual:${normalize(title)}:${normalize(entity)}`;
}

export function documentIdentity(document: OnboardingDocument) {
  return checklistDocumentIdentity(
    document.catalogId,
    document.title,
    document.entity,
  );
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

export function groupOnboardingDocuments<T extends OnboardingDocument>(
  documents: T[],
): Record<OnboardingGroup, T[]> {
  const groups = Object.fromEntries(
    ONBOARDING_GROUPS.map((group) => [group, []]),
  ) as Record<OnboardingGroup, T[]>;

  documents.forEach((document) => {
    groups[getOnboardingGroup(document.entity)].push(document);
  });

  return groups;
}
