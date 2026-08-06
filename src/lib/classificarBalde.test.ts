import { describe, expect, it } from 'vitest';
import {
  contarPorGaveta, contarSemDono, filtrarBalde, normalizarTexto, proximoDoBalde, semDono,
} from './classificarBalde';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

const doc = (id: string, extra: Partial<DocumentoArquivoRow> = {}): DocumentoArquivoRow =>
  ({
    id,
    cliente_id: 'C1',
    nome_original: `${id}.pdf`,
    categoria: 'pessoais',
    created_at: '2026-07-20T10:00:00Z',
    pessoa_id: null,
    bem_id: null,
    matricula_id: null,
    triado_em: null,
    ...extra,
  }) as DocumentoArquivoRow;

const SEM_DONO = doc('sem-dono');
const DE_PESSOA = doc('de-pessoa', { pessoa_id: 'P1' });
const DE_BEM = doc('de-bem', { bem_id: 'B1' });
const DE_MATRICULA = doc('de-matricula', { matricula_id: 'M1' });
const TRIADO = doc('triado', { triado_em: '2026-08-05T10:00:00Z' });

describe('semDono', () => {
  it('é sem dono só quando nenhuma coluna de entidade está preenchida', () => {
    expect(semDono(SEM_DONO)).toBe(true);
    expect(semDono(DE_PESSOA)).toBe(false);
    expect(semDono(DE_BEM)).toBe(false);
    expect(semDono(DE_MATRICULA)).toBe(false);
  });

  // A marca de triagem é o que separa "ainda não olharam" de "olharam e
  // concluíram que não é de ninguém". Sem ela os dois seriam o mesmo estado.
  it('arquivo triado como do cliente também sai do balde', () => {
    expect(semDono(TRIADO)).toBe(false);
  });
});

describe('filtrarBalde', () => {
  const docs = [SEM_DONO, DE_PESSOA, DE_BEM, DE_MATRICULA];

  it('traz apenas arquivo sem dono', () => {
    expect(filtrarBalde(docs, { gaveta: 'todas', busca: '' }).map((d) => d.id)).toEqual(['sem-dono']);
  });

  it('respeita a gaveta selecionada', () => {
    const lista = [
      doc('pessoal'),
      doc('societario', { categoria: 'societarios' }),
    ];
    expect(filtrarBalde(lista, { gaveta: 'societarios', busca: '' }).map((d) => d.id)).toEqual(['societario']);
  });

  it('busca por nome ignorando acento e caixa', () => {
    const lista = [doc('a', { nome_original: 'Certidão de Casamento.pdf' }), doc('b', { nome_original: 'RG.pdf' })];
    expect(filtrarBalde(lista, { gaveta: 'todas', busca: 'certidao' }).map((d) => d.id)).toEqual(['a']);
    expect(filtrarBalde(lista, { gaveta: 'todas', busca: 'CERTIDÃO' }).map((d) => d.id)).toEqual(['a']);
  });

  it('a válvula "não é de ninguém" tira o arquivo do balde', () => {
    const triado = [doc('sem-dono', { triado_em: '2026-08-05T10:00:00Z' }), DE_PESSOA];
    expect(filtrarBalde(triado, { gaveta: 'todas', busca: '' })).toEqual([]);
    expect(contarSemDono(triado)).toBe(0);
  });

  it('ordena por recebimento mais recente primeiro', () => {
    const lista = [
      doc('antigo', { created_at: '2026-07-01T10:00:00Z' }),
      doc('novo', { created_at: '2026-07-30T10:00:00Z' }),
    ];
    expect(filtrarBalde(lista, { gaveta: 'todas', busca: '' }).map((d) => d.id)).toEqual(['novo', 'antigo']);
  });
});

describe('contarPorGaveta', () => {
  it('conta só o que está sem dono e abre com "Todas as gavetas"', () => {
    const gavetas = contarPorGaveta([
      SEM_DONO,
      doc('outro-pessoal'),
      doc('societario', { categoria: 'societarios' }),
      DE_PESSOA,
    ]);
    expect(gavetas[0]).toEqual({ value: 'todas', label: 'Todas as gavetas', total: 3 });
    expect(gavetas.slice(1)).toEqual([
      { value: 'pessoais', label: 'Pessoais', total: 2 },
      { value: 'societarios', label: 'Societários', total: 1 },
    ]);
  });
});

describe('proximoDoBalde', () => {
  const lista = [doc('a'), doc('b'), doc('c')];

  it('segue para o vizinho de baixo', () => {
    expect(proximoDoBalde(lista, 'a')?.id).toBe('b');
  });

  it('volta para o de cima quando resolve o último', () => {
    expect(proximoDoBalde(lista, 'c')?.id).toBe('b');
  });

  it('devolve null quando o balde esvazia', () => {
    expect(proximoDoBalde([doc('unico')], 'unico')).toBeNull();
  });
});

describe('normalizarTexto', () => {
  it('remove acento, caixa e espaço nas pontas', () => {
    expect(normalizarTexto('  Matrícula ÁGUA  ')).toBe('matricula agua');
  });
});
