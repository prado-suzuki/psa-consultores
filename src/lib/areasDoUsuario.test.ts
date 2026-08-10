import { describe, expect, it } from 'vitest';
import { areasDoUsuario } from '@/lib/areasDoUsuario';
import { AREAS_LIST } from '@/config/areaCategories';

const ids = (categorias: string[] | null) => areasDoUsuario(categorias).map((a) => a.id);

describe('areasDoUsuario', () => {
  it('admin (null) vê todas as áreas', () => {
    expect(areasDoUsuario(null)).toEqual(AREAS_LIST);
  });

  it('sem nenhuma categoria, não vê área nenhuma', () => {
    expect(areasDoUsuario([])).toEqual([]);
  });

  it('cada categoria abre a sua área', () => {
    expect(ids(['tax'])).toEqual(['tax']);
    expect(ids(['osg'])).toEqual(['osg']);
    expect(ids(['board'])).toEqual(['board']);
    expect(ids(['gestao'])).toEqual(['controle_site']);
  });

  it('Digital aparece com rotina OU dev, não só com as duas', () => {
    // `every` no lugar de `some` esconderia a Digital de quem tem só uma das
    // duas categorias, que é a maioria.
    expect(ids(['rotina'])).toEqual(['digital']);
    expect(ids(['dev'])).toEqual(['digital']);
    expect(ids(['rotina', 'dev'])).toEqual(['digital']);
  });

  it('mantém a ordem de AREAS_LIST, e não a das categorias recebidas', () => {
    expect(ids(['tax', 'board', 'osg'])).toEqual(['board', 'osg', 'tax']);
  });

  it('categoria fora do mapa de áreas não inventa área', () => {
    expect(ids(['categoria_que_nao_existe'])).toEqual([]);
    expect(ids(['categoria_que_nao_existe', 'tax'])).toEqual(['tax']);
  });

  it('não devolve a lista original, para o chamador não conseguir mutá-la', () => {
    const todas = areasDoUsuario(null);
    todas.pop();
    expect(areasDoUsuario(null)).toHaveLength(AREAS_LIST.length);
  });
});
