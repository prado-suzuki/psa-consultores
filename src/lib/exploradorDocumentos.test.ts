import { describe, expect, it } from 'vitest';
import {
  destinoDoDocumento, destinoSemVinculo, separarSemVinculo, temVinculo,
} from '@/lib/exploradorDocumentos';
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

const doc = (over: Partial<Parameters<typeof destinoDoDocumento>[0]> = {}) => ({
  pessoa_id: null, matricula_id: null, bem_id: null,
  categoria: 'outros' as DocCategoria, ...over,
});

describe('temVinculo', () => {
  it('reconhece vínculo com pessoa, matrícula ou bem', () => {
    expect(temVinculo(doc({ pessoa_id: 'p1' }))).toBe(true);
    expect(temVinculo(doc({ matricula_id: 'm1' }))).toBe(true);
    expect(temVinculo(doc({ bem_id: 'b1' }))).toBe(true);
  });

  it('documento solto não tem vínculo', () => {
    expect(temVinculo(doc())).toBe(false);
  });
});

describe('destinoSemVinculo', () => {
  it('manda as categorias de pessoa física para Pessoas Físicas', () => {
    for (const c of ['pessoais', 'declaracao_ir', 'sucessorios'] as DocCategoria[]) {
      expect(destinoSemVinculo(c)).toBe('pessoas_pf');
    }
  });

  it('manda societarios para Pessoas Jurídicas', () => {
    expect(destinoSemVinculo('societarios')).toBe('pessoas_pj');
  });

  it('manda as categorias de imóvel para Matrículas, não para Bens', () => {
    for (const c of ['agrarios', 'bens_direitos', 'cadastros_fiscais', 'georreferenciamento'] as DocCategoria[]) {
      expect(destinoSemVinculo(c)).toBe('matriculas');
    }
  });

  it('deixa outros na caixa de triagem', () => {
    expect(destinoSemVinculo('outros')).toBe('sem');
  });

  it('cobre as 9 categorias do enum sem cair em undefined', () => {
    const todas: DocCategoria[] = [
      'pessoais', 'declaracao_ir', 'sucessorios', 'societarios', 'agrarios',
      'bens_direitos', 'cadastros_fiscais', 'georreferenciamento', 'outros',
    ];
    for (const c of todas) {
      expect(['pessoas_pf', 'pessoas_pj', 'matriculas', 'sem']).toContain(destinoSemVinculo(c));
    }
  });
});

describe('destinoDoDocumento', () => {
  it('documento vinculado não tem destino de raiz', () => {
    expect(destinoDoDocumento(doc({ pessoa_id: 'p1', categoria: 'pessoais' }))).toBeNull();
  });

  it('o vínculo manda mesmo quando a categoria aponta para outra pasta', () => {
    // doc de matrícula com categoria pessoais: quem já tem vínculo segue o vínculo
    expect(destinoDoDocumento(doc({ matricula_id: 'm1', categoria: 'pessoais' }))).toBeNull();
  });

  it('documento solto vai pela categoria', () => {
    expect(destinoDoDocumento(doc({ categoria: 'societarios' }))).toBe('pessoas_pj');
  });
});

describe('separarSemVinculo', () => {
  it('separa por destino e ignora os que já têm vínculo', () => {
    const docs = [
      doc({ categoria: 'pessoais' }),
      doc({ categoria: 'societarios' }),
      doc({ categoria: 'agrarios' }),
      doc({ categoria: 'outros' }),
      doc({ categoria: 'pessoais', pessoa_id: 'p1' }),
    ];
    const r = separarSemVinculo(docs);
    expect(r.pessoas_pf).toHaveLength(1);
    expect(r.pessoas_pj).toHaveLength(1);
    expect(r.matriculas).toHaveLength(1);
    expect(r.sem).toHaveLength(1);
  });

  it('preserva a ordem de entrada dentro de cada destino', () => {
    const a = doc({ categoria: 'pessoais' });
    const b = doc({ categoria: 'declaracao_ir' });
    expect(separarSemVinculo([a, b]).pessoas_pf).toEqual([a, b]);
  });

  it('devolve as quatro chaves mesmo sem documento nenhum', () => {
    expect(separarSemVinculo([])).toEqual({
      pessoas_pf: [], pessoas_pj: [], matriculas: [], sem: [],
    });
  });
});
