import { describe, expect, it } from 'vitest';
import {
  GRUPOS_DOCUMENTO,
  grupoDaCategoria,
  type GrupoDocumentoKey,
} from '@/lib/agrupadorDocumentos';
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

// Os 9 valores de osg_doc_categoria, escritos à mão de propósito: se o enum
// mudar, este teste falha e obriga a revisar o mapa.
const CATEGORIAS_DO_ENUM: DocCategoria[] = [
  'bens_direitos',
  'cadastros_fiscais',
  'declaracao_ir',
  'agrarios',
  'pessoais',
  'societarios',
  'sucessorios',
  'outros',
  'georreferenciamento',
];

describe('GRUPOS_DOCUMENTO', () => {
  it('são 4, na ordem fixa da área do cliente', () => {
    expect(GRUPOS_DOCUMENTO.map((g) => g.key)).toEqual(['pf', 'pj', 'imoveis', 'outros']);
  });

  it('cada grupo grava uma categoria diferente', () => {
    const categorias = GRUPOS_DOCUMENTO.map((g) => g.categoria);
    expect(new Set(categorias).size).toBe(categorias.length);
  });

  it('a categoria que o grupo grava aponta de volta para ele', () => {
    for (const grupo of GRUPOS_DOCUMENTO) {
      expect(grupoDaCategoria(grupo.categoria)).toBe(grupo.key);
    }
  });
});

describe('grupoDaCategoria', () => {
  it('cobre os 9 valores do enum', () => {
    for (const categoria of CATEGORIAS_DO_ENUM) {
      expect(GRUPOS_DOCUMENTO.some((g) => g.key === grupoDaCategoria(categoria))).toBe(true);
    }
  });

  it('manda as 4 categorias que o cliente grava para os grupos de sempre', () => {
    expect(grupoDaCategoria('pessoais')).toBe('pf');
    expect(grupoDaCategoria('societarios')).toBe('pj');
    expect(grupoDaCategoria('agrarios')).toBe('imoveis');
    expect(grupoDaCategoria('outros')).toBe('outros');
  });

  it('manda as categorias de pessoa física para Pessoas Físicas', () => {
    expect(grupoDaCategoria('declaracao_ir')).toBe('pf');
    expect(grupoDaCategoria('sucessorios')).toBe('pf');
  });

  it('manda as categorias de imóvel para Matrículas e Imóveis', () => {
    expect(grupoDaCategoria('cadastros_fiscais')).toBe('imoveis');
    expect(grupoDaCategoria('bens_direitos')).toBe('imoveis');
    expect(grupoDaCategoria('georreferenciamento')).toBe('imoveis');
  });

  it('não deixa nenhuma categoria sem grupo', () => {
    const semGrupo = CATEGORIAS_DO_ENUM.filter((c) => !grupoDaCategoria(c));
    expect(semGrupo).toEqual([]);
  });

  it('categoria fora do enum cai em outros', () => {
    const desconhecida = 'inventada_amanha' as DocCategoria;
    const grupo: GrupoDocumentoKey = grupoDaCategoria(desconhecida);
    expect(grupo).toBe('outros');
  });
});
