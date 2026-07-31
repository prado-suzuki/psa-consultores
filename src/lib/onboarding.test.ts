import { describe, expect, it } from 'vitest';
import {
  buildOnboardingChecklistRows,
  consolidateDocuments,
  findAvailableCatalogDocuments,
  getOnboardingGroup,
  getOnboardingGroupDefaults,
  groupOnboardingDocuments,
  SOLICITACAO_BUCKET,
  type OnboardingDocument,
} from './onboarding';

const document = (
  id: string,
  productId: string,
  overrides: Partial<OnboardingDocument> = {},
): OnboardingDocument => ({
  id,
  catalogId: id,
  title: 'Documento',
  entity: 'Cliente',
  module: 'Geral',
  note: '',
  required: false,
  category: 'outros',
  docboxCategory: 'Outros',
  confidential: false,
  productId,
  ...overrides,
});

describe('onboarding document model', () => {
  it('maps catalog entities to the four onboarding groups', () => {
    expect(getOnboardingGroup('Pessoa Física')).toBe('Pessoas Físicas');
    expect(getOnboardingGroup('Pessoa Jurídica')).toBe('Pessoas Jurídicas');
    expect(getOnboardingGroup('Matrícula (Imóvel Rural)')).toBe('Bens e Direitos');
    expect(getOnboardingGroup('Bem')).toBe('Bens e Direitos');
    expect(getOnboardingGroup('Cliente')).toBe('Outros documentos');
  });

  it('maps each visible group to a stable entity and module for manual documents', () => {
    expect(getOnboardingGroupDefaults('Pessoas Físicas')).toEqual({
      entity: 'Pessoa Física',
      module: 'Qualificação das Partes',
    });
    expect(getOnboardingGroupDefaults('Pessoas Jurídicas')).toEqual({
      entity: 'Pessoa Jurídica',
      module: 'Qualificação das Partes',
    });
    expect(getOnboardingGroupDefaults('Bens e Direitos')).toEqual({
      entity: 'Bem',
      module: 'Diagnóstico Patrimonial',
    });
    expect(getOnboardingGroupDefaults('Outros documentos')).toEqual({
      entity: 'Cliente',
      module: 'Diagnóstico Patrimonial',
    });
  });

  it('deduplicates shared catalog documents and preserves their product origins', () => {
    const consolidated = consolidateDocuments(
      {
        productA: [document('shared', 'productA')],
        productB: [document('shared', 'productB', { required: true })],
      },
      ['productA', 'productB'],
    );

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0].productIds).toEqual(['productA', 'productB']);
    expect(consolidated[0].sourceDocumentIds).toEqual(['shared', 'shared']);
    expect(consolidated[0].required).toBe(true);
  });

  it('lists as optional only the catalog documents missing from the current list', () => {
    const catalog = [
      document('already-in', '', { title: 'Já incluído' }),
      document('missing', '', { title: 'Disponível' }),
    ];
    const available = findAvailableCatalogDocuments(catalog, [
      document('already-in', 'productA', { title: 'Já incluído' }),
    ]);

    expect(available.map((item) => item.title)).toEqual(['Disponível']);
  });

  it('keeps documents added straight to the consolidated request', () => {
    const consolidated = consolidateDocuments(
      {
        productA: [document('linked', 'productA')],
        [SOLICITACAO_BUCKET]: [document('extra', SOLICITACAO_BUCKET, { title: 'Extra' })],
      },
      ['productA', SOLICITACAO_BUCKET],
    );

    expect(consolidated).toHaveLength(2);
    expect(consolidated.map((item) => item.title).sort()).toEqual(['Documento', 'Extra']);
  });

  it('returns every group even when some groups have no documents', () => {
    const groups = groupOnboardingDocuments([
      document('pf', 'productA', { entity: 'Pessoa Física' }),
    ]);

    expect(groups['Pessoas Físicas']).toHaveLength(1);
    expect(groups['Pessoas Jurídicas']).toEqual([]);
    expect(groups['Bens e Direitos']).toEqual([]);
    expect(groups['Outros documentos']).toEqual([]);
  });

  it('builds generic requested checklist rows without person, asset or registry links', () => {
    const documents = consolidateDocuments(
      {
        productA: [
          document('catalog-item', 'productA', {
            title: 'Contrato social',
            entity: 'Pessoa Jurídica',
            module: 'DSS',
            note: 'Enviar a última alteração.',
            required: true,
            category: 'societarios',
            docboxCategory: 'Societário',
            confidential: true,
          }),
        ],
      },
      ['productA'],
    );

    expect(buildOnboardingChecklistRows('cliente-1', documents)).toEqual([{
      cliente_id: 'cliente-1',
      item_padrao_id: 'catalog-item',
      modulo: 'DSS',
      entidade: 'Pessoa Jurídica',
      documento: 'Contrato social',
      nota: 'Enviar a última alteração.',
      categoria: 'societarios',
      categoria_docbox: 'Societário',
      confidencial: true,
      obrigatorio: true,
      origem: 'padrao',
      status: 'solicitado',
      pessoa_id: null,
      bem_id: null,
      matricula_id: null,
    }]);
  });

  it('marks documents created outside the catalog as manual checklist rows', () => {
    const documents = consolidateDocuments(
      {
        productA: [
          document('manual-item', 'productA', {
            catalogId: undefined,
            title: 'Documento complementar',
            category: null,
            docboxCategory: null,
          }),
        ],
      },
      ['productA'],
    );

    const [row] = buildOnboardingChecklistRows('cliente-1', documents);
    expect(row.item_padrao_id).toBeNull();
    expect(row.origem).toBe('manual');
    expect(row.status).toBe('solicitado');
  });
});
