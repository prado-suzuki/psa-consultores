import { describe, it, expect } from 'vitest';
import { AREA_CATEGORIES_MAP } from '@/config/areaCategories';
import {
  CHAVES_DE_AREA,
  areasDeAcessoDoUsuario,
  areasDeAcessoPorUsuario,
  paginasDaArea,
} from './areasDeAcessoDoUsuario';

/* Teste de CARACTERIZAÇÃO da inferência que morava no `useEffect` do
   `EditUserDialog`. O caso que importa é o do `some` vs `every`: `digital` tem
   DUAS categorias (`rotina` e `dev`), e quem alcança só uma delas tem a área. */

const paginas = [
  { id: 'p-rotina-1', category: 'rotina' },
  { id: 'p-rotina-2', category: 'rotina' },
  { id: 'p-dev-1', category: 'dev' },
  { id: 'p-tax-1', category: 'tax' },
  { id: 'p-osg-1', category: 'osg' },
  { id: 'p-geral-1', category: 'geral' },
];

const acessos = [
  { user_id: 'u-so-rotina', page_permission_id: 'p-rotina-1' },
  { user_id: 'u-duas-areas', page_permission_id: 'p-dev-1' },
  { user_id: 'u-duas-areas', page_permission_id: 'p-tax-1' },
  { user_id: 'u-so-geral', page_permission_id: 'p-geral-1' },
  { user_id: 'u-pagina-fantasma', page_permission_id: 'p-que-nao-existe' },
];

describe('areasDeAcessoPorUsuario', () => {
  const porUsuario = areasDeAcessoPorUsuario(paginas, acessos);

  it('UMA categoria já dá a área — `some`, não `every`', () => {
    expect([...porUsuario['u-so-rotina']]).toEqual(['digital']);
    expect([...porUsuario['u-duas-areas']].sort()).toEqual(['digital', 'tax']);
  });

  it('categoria fora de área nenhuma não inventa área', () => {
    expect(porUsuario['u-so-geral']).toEqual(new Set());
  });

  it('acesso apontando para página inexistente é ignorado sem quebrar', () => {
    /* Ele nem chega a ganhar entrada no mapa: a linha órfã é descartada antes.
       Quem lê pelo `areasDeAcessoDoUsuario` recebe `[]` de qualquer jeito. */
    expect(porUsuario['u-pagina-fantasma']).toBeUndefined();
    expect(areasDeAcessoDoUsuario('u-pagina-fantasma', paginas, acessos)).toEqual([]);
  });

  it('quem não tem nenhum acesso nem aparece no mapa', () => {
    expect(porUsuario['u-sem-nada']).toBeUndefined();
  });
});

describe('areasDeAcessoDoUsuario', () => {
  it('devolve lista na ordem do mapa, não na ordem dos acessos', () => {
    expect(areasDeAcessoDoUsuario('u-duas-areas', paginas, acessos)).toEqual(['digital', 'tax']);
  });

  it('quem não tem acesso nenhum devolve lista vazia, não `undefined`', () => {
    expect(areasDeAcessoDoUsuario('u-sem-nada', paginas, acessos)).toEqual([]);
  });

  it('não vaza o acesso de outro usuário', () => {
    expect(areasDeAcessoDoUsuario('u-so-rotina', paginas, acessos)).toEqual(['digital']);
  });
});

describe('paginasDaArea', () => {
  it('junta as páginas de TODAS as categorias da área', () => {
    expect(paginasDaArea('digital', paginas).sort()).toEqual(['p-dev-1', 'p-rotina-1', 'p-rotina-2']);
  });

  it('área sem página cadastrada devolve vazio em vez de quebrar', () => {
    expect(paginasDaArea('board', paginas)).toEqual([]);
  });
});

describe('CHAVES_DE_AREA', () => {
  it('cobre o mapa inteiro — área nova no mapa entra na matriz sozinha', () => {
    expect(CHAVES_DE_AREA.sort()).toEqual(Object.keys(AREA_CATEGORIES_MAP).sort());
  });
});
