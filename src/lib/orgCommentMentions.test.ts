import { describe, expect, it } from 'vitest';

import {
  filtrarCandidatos,
  iniciaisDoNome,
  ordenarCandidatos,
  type MentionCandidate,
} from '@/lib/orgCommentMentions';

const CANDIDATOS: MentionCandidate[] = [
  { id: 'U1', name: 'Ana Souza' },
  { id: 'U2', name: 'Bernardo Kropiwiec' },
  { id: 'U3', name: 'Ângela Nóbrega' },
  { id: 'U4', name: '' },
];

describe('filtrarCandidatos', () => {
  it('devolve o começo da lista quando o termo está vazio', () => {
    expect(filtrarCandidatos(CANDIDATOS, '')).toEqual([
      { id: 'U1', name: 'Ana Souza' },
      { id: 'U2', name: 'Bernardo Kropiwiec' },
      { id: 'U3', name: 'Ângela Nóbrega' },
    ]);
  });

  it('casa por prefixo de qualquer parte do nome, ignorando acento e caixa', () => {
    expect(filtrarCandidatos(CANDIDATOS, 'souz')).toEqual([{ id: 'U1', name: 'Ana Souza' }]);
    expect(filtrarCandidatos(CANDIDATOS, 'an')).toEqual([
      { id: 'U1', name: 'Ana Souza' },
      { id: 'U3', name: 'Ângela Nóbrega' },
    ]);
    expect(filtrarCandidatos(CANDIDATOS, 'NOBREGA')).toEqual([
      { id: 'U3', name: 'Ângela Nóbrega' },
    ]);
  });

  it('não sugere quem está sem nome e respeita o limite', () => {
    expect(filtrarCandidatos(CANDIDATOS, '', 2)).toHaveLength(2);
    expect(filtrarCandidatos(CANDIDATOS, 'zzz')).toEqual([]);
  });
});

describe('ordenarCandidatos e iniciaisDoNome', () => {
  it('ordena em pt-BR sem mutar a origem', () => {
    const origem = [CANDIDATOS[2], CANDIDATOS[1], CANDIDATOS[0]];
    expect(ordenarCandidatos(origem).map((candidate) => candidate.id)).toEqual(['U1', 'U3', 'U2']);
    expect(origem.map((candidate) => candidate.id)).toEqual(['U3', 'U2', 'U1']);
  });

  it('usa até duas letras, com queda para "Usuário"', () => {
    expect(iniciaisDoNome('Ana Souza')).toBe('AS');
    expect(iniciaisDoNome('Ana Beatriz Souza')).toBe('AB');
    expect(iniciaisDoNome(null)).toBe('U');
  });
});
