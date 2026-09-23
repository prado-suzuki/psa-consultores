import { describe, expect, it } from 'vitest';
import { areasDoUsuario } from '@/lib/areasDoUsuario';
import { AREA_CATEGORIES_MAP, AREAS_LIST } from '@/config/areaCategories';

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
    expect(ids(['rotina'])).toEqual(['digital']);
  });

  /*
   * A REGRA DO `some` FICOU SEM CASO REAL, e este teste existe para avisar.
   *
   * O casamento em `areasDoUsuario.ts` é por `some`: UMA categoria já dá a área.
   * Quem exercitava isso era a Digital, com `rotina` e `dev`, até 22/09/2026,
   * quando o Digital Dev virou TAX Work e entrou na categoria `tax`. Desde
   * então NENHUMA área tem duas categorias, e um `every` no lugar do `some`
   * passaria por toda a suíte sem ninguém ver.
   *
   * Este teste é a tripwire: ele quebra no dia em que alguém der uma segunda
   * categoria a alguma área, e a mensagem manda escrever o caso de verdade.
   */
  it('nenhuma área tem duas categorias hoje — ao mudar isso, teste o `some`', () => {
    const comDuasOuMais = Object.entries(AREA_CATEGORIES_MAP)
      .filter(([, area]) => area.categories.length > 1)
      .map(([id]) => id);

    expect(
      comDuasOuMais,
      'Uma área ganhou uma segunda categoria. Acrescente aqui o caso que prova que basta '
        + 'UMA delas para a área aparecer (`some`, e não `every`), que é a regra de '
        + '`areasDoUsuario.ts` e hoje não tem como ser exercitada com dado real.',
    ).toEqual([]);
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
