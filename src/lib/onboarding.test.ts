import { describe, expect, it } from 'vitest';
import {
  checklistDocumentIdentity,
  documentIdentity,
  findAvailableCatalogDocuments,
  groupOnboardingDocuments,
  type OnboardingDocument,
} from './onboarding';

const document = (
  id: string,
  overrides: Partial<OnboardingDocument> = {},
): OnboardingDocument => ({
  id,
  catalogId: id,
  title: 'Documento',
  note: '',
  grupo: 'outros',
  granularidade: 'cliente',
  ...overrides,
});

describe('groupOnboardingDocuments', () => {
  it('agrupa pela coluna grupo, na ordem das 4 gavetas e sem esconder as vazias', () => {
    const groups = groupOnboardingDocuments([
      document('rg', { grupo: 'pf', granularidade: 'pessoa_pf' }),
      document('matricula', { grupo: 'bens_imoveis', granularidade: 'matricula_rural' }),
      document('cnh', { grupo: 'pf', granularidade: 'pessoa_pf' }),
    ]);

    expect(Object.keys(groups)).toEqual(['pf', 'pj', 'bens_imoveis', 'outros']);
    expect(groups.pf.map((item) => item.id)).toEqual(['rg', 'cnh']);
    expect(groups.bens_imoveis.map((item) => item.id)).toEqual(['matricula']);
    expect(groups.pj).toEqual([]);
    expect(groups.outros).toEqual([]);
  });

  it('não adivinha a gaveta: quem manda é o campo, não o texto do documento', () => {
    // Documento com cara de imóvel, mas gravado em "Outros": vale o que está
    // gravado. Era exatamente aqui que a antiga adivinhação por texto errava.
    const groups = groupOnboardingDocuments([
      document('m1', { title: 'Matrícula do imóvel rural', grupo: 'outros' }),
    ]);

    expect(groups.outros.map((item) => item.id)).toEqual(['m1']);
    expect(groups.bens_imoveis).toEqual([]);
  });
});

describe('identidade do documento', () => {
  it('identifica item de catálogo pelo tipo', () => {
    expect(checklistDocumentIdentity('cat-1', 'RG')).toBe('catalog:cat-1');
  });

  it('identifica item manual só pelo nome, ignorando acento e caixa', () => {
    // É esta comparação que segura a duplicata de item manual, porque o índice
    // único do banco inclui `entidade` — nula aqui — e não protege nada.
    expect(checklistDocumentIdentity(null, 'Certidão de Casamento'))
      .toBe(checklistDocumentIdentity(null, '  certidao de casamento  '));
  });

  it('documentIdentity usa a mesma regra do documento em tela', () => {
    expect(documentIdentity({ catalogId: undefined, title: 'Contrato' }))
      .toBe('manual:contrato');
  });
});

describe('findAvailableCatalogDocuments', () => {
  it('lista como opcional só o que ainda não está na solicitação', () => {
    const catalog = [
      document('already-in', { title: 'Já incluído' }),
      document('missing', { title: 'Disponível' }),
    ];
    const available = findAvailableCatalogDocuments(catalog, [
      document('already-in', { title: 'Já incluído' }),
    ]);

    expect(available.map((item) => item.title)).toEqual(['Disponível']);
  });
});

// Saíram nesta frente, junto com o que cobriam:
// - A lista de rótulos de grupo desta lib, a função que adivinhava a gaveta pelo
//   texto de entidade e o mapa que chutava a entidade a partir da gaveta
//   (ALE-29): a gaveta virou coluna gravada, então não há o que adivinhar nem o
//   que chutar.
// - buildOnboardingChecklistRows, consolidateDocuments e SOLICITACAO_BUCKET
//   (ALE-28): a lista vive em solicitacao_item, sem copiar texto e sem balde por
//   produto. O payload de gravação é coberto por src/lib/solicitacao.test.ts.
