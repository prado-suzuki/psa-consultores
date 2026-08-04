import { describe, expect, it } from 'vitest';
import {
  findAvailableCatalogDocuments,
  getOnboardingGroup,
  getOnboardingGroupDefaults,
  groupOnboardingDocuments,
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

  it('returns every group even when some groups have no documents', () => {
    const groups = groupOnboardingDocuments([
      document('pf', 'productA', { entity: 'Pessoa Física' }),
    ]);

    expect(groups['Pessoas Físicas']).toHaveLength(1);
    expect(groups['Pessoas Jurídicas']).toEqual([]);
    expect(groups['Bens e Direitos']).toEqual([]);
    expect(groups['Outros documentos']).toEqual([]);
  });
});

// Saíram nesta onda, junto com o que elas cobriam:
// - buildOnboardingChecklistRows (ALE-28): a gravação deixou de copiar texto do
//   catálogo para a linha do cliente. Quem cobre o payload novo é
//   src/lib/solicitacao.test.ts.
// - consolidateDocuments e o balde SOLICITACAO_BUCKET (ALE-28): a lista passou a
//   viver em solicitacao_item, que não tem coluna de produto — não há mais
//   baldes por produto para consolidar.
