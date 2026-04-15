import { describe, it, expect } from 'vitest';
import {
  AREA_CATEGORIES_MAP,
  ALL_AREA_CATEGORIES,
  AREA_ROUTES,
  AREAS_LIST,
} from './areaCategories';
import { PROTECTED_PAGES } from './protectedPages';

describe('AREA_CATEGORIES_MAP', () => {
  it('possui exatamente as 5 áreas internas esperadas', () => {
    expect(Object.keys(AREA_CATEGORIES_MAP).sort()).toEqual([
      'board',
      'controle_site',
      'digital',
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

  it('Tax mapeia exatamente para ["tax"] (categorias fantasma removidas no PR #1)', () => {
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
