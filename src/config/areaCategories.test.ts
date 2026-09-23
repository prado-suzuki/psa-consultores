import { describe, it, expect } from 'vitest';
import {
  AREA_CATEGORIES_MAP,
  ALL_AREA_CATEGORIES,
  AREA_ROUTES,
  AREAS_LIST,
} from './areaCategories';
import { PROTECTED_PAGES } from './protectedPages';

describe('AREA_CATEGORIES_MAP', () => {
  it('possui exatamente as áreas internas esperadas', () => {
    // A lista é a asserção; o título não repete a contagem, que envelhece a
    // cada área nova. `adm_fin` entrou em 14/09/2026 — chave e caminho
    // escritos à mão, nunca derivados do nome ("Adm & Fin" não sobrevive a URL).
    expect(Object.keys(AREA_CATEGORIES_MAP).sort()).toEqual([
      'adm_fin',
      'auditoria',
      'board',
      'controle_site',
      'digital',
      'juridico',
      'osg',
      'tax',
    ]);
  });

  it('cada área tem ao menos UMA categoria com páginas registradas em PROTECTED_PAGES', () => {
    // Regressão do bug do PR #1: a inferência de áreas usava `every()` sobre as
    // categorias da área. Se nenhuma das categorias tem página registrada, a
    // área nunca aparece marcada na edição. Garantimos aqui que cada área
    // tem PELO MENOS uma categoria com páginas reais.
    const protectedCategories = new Set<string>(PROTECTED_PAGES.map((p) => p.category as string));
    for (const [areaKey, def] of Object.entries(AREA_CATEGORIES_MAP)) {
      const hasAtLeastOne = def.categories.some((cat) => protectedCategories.has(cat));
      expect(
        hasAtLeastOne,
        `Área "${areaKey}" não tem nenhuma categoria com páginas registradas em protectedPages.ts`,
      ).toBe(true);
    }
  });

  it('Tax mapeia exatamente para ["tax"], cobrindo as duas portas da área', () => {
    // As 30 ferramentas do ex-Digital Dev entraram nesta MESMA categoria em
    // 22/09/2026, no desenho da OSG: uma categoria para TAX Projects e TAX Work.
    // Uma versão intermediária separou `tax_work`, e foi desfeita — o argumento
    // dela não se sustentou (ver o cabeçalho da migração do dia).
    expect(AREA_CATEGORIES_MAP.tax.categories).toEqual(['tax']);
  });
});

describe('ALL_AREA_CATEGORIES', () => {
  it('contém a união de todas as categorias', () => {
    const expected = Object.values(AREA_CATEGORIES_MAP).flatMap((a) => a.categories);
    expect(ALL_AREA_CATEGORIES.sort()).toEqual(expected.sort());
  });
});

describe('AREA_ROUTES', () => {
  it('possui rota para cada área de AREA_CATEGORIES_MAP', () => {
    for (const areaKey of Object.keys(AREA_CATEGORIES_MAP)) {
      expect(AREA_ROUTES).toHaveProperty(areaKey);
      expect(typeof AREA_ROUTES[areaKey as keyof typeof AREA_ROUTES]).toBe('string');
    }
  });
});

describe('AREAS_LIST', () => {
  it('lista todas as áreas para o select de login', () => {
    const ids = AREAS_LIST.map((a) => a.id).sort();
    expect(ids).toEqual(Object.keys(AREA_CATEGORIES_MAP).sort());
  });
});
