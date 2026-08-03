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
export type OnboardingChecklistInsert =
  Database['public']['Tables']['checklist_cliente_item']['Insert'];

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

export interface ConsolidatedOnboardingDocument extends OnboardingDocument {
  productIds: string[];
  sourceDocumentIds: string[];
}

export interface OnboardingProduct {
  id: string;
  code: string;
  name: string;
  contracted: boolean;
  documents: OnboardingDocument[];
}

export type DocumentsByProduct = Record<string, OnboardingDocument[]>;

/**
 * Balde dos documentos incluídos direto na solicitação consolidada, quando o
 * analista não está com um produto aberto. Entra na consolidação como se fosse
 * um produto, mas nunca aparece na lista de produtos contratados.
 */
export const SOLICITACAO_BUCKET = '__solicitacao__';

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

export function buildDocumentsByProduct(products: OnboardingProduct[]): DocumentsByProduct {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      product.documents.map((document) => ({ ...document })),
    ]),
  );
}

export function consolidateDocuments(
  documentsByProduct: DocumentsByProduct,
  selectedProductIds: string[],
): ConsolidatedOnboardingDocument[] {
  const consolidated = new Map<string, ConsolidatedOnboardingDocument>();

  selectedProductIds.forEach((productId) => {
    (documentsByProduct[productId] ?? []).forEach((document) => {
      const identity = documentIdentity(document);
      const existing = consolidated.get(identity);

      if (existing) {
        existing.required ||= document.required;
        existing.productIds.push(productId);
        existing.sourceDocumentIds.push(document.id);
        return;
      }

      consolidated.set(identity, {
        ...document,
        id: `consolidated:${identity}`,
        productIds: [productId],
        sourceDocumentIds: [document.id],
      });
    });
  });

  return [...consolidated.values()].sort((left, right) =>
    left.title.localeCompare(right.title, 'pt-BR'),
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

export function buildOnboardingChecklistRows(
  clienteId: string,
  documents: ConsolidatedOnboardingDocument[],
): OnboardingChecklistInsert[] {
  return documents.map((document) => ({
    cliente_id: clienteId,
    item_padrao_id: document.catalogId ?? null,
    modulo: document.module,
    entidade: document.entity,
    documento: document.title,
    nota: document.note.trim() || null,
    categoria: document.category,
    categoria_docbox: document.docboxCategory,
    confidencial: document.confidential,
    obrigatorio: document.required,
    origem: document.catalogId ? 'padrao' : 'manual',
    status: 'solicitado',
    pessoa_id: null,
    bem_id: null,
    matricula_id: null,
  }));
}
