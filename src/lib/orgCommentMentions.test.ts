import { describe, expect, it } from 'vitest';

import {
  ehMencaoTodos,
  expandirMencaoTodos,
  filtrarCandidatos,
  iniciaisDoNome,
  MENCAO_TODOS,
  MENCAO_TODOS_ID,
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
  it('devolve o começo da lista quando o termo está vazio, com o @todos no fim', () => {
    expect(filtrarCandidatos(CANDIDATOS, '')).toEqual([
      { id: 'U1', name: 'Ana Souza' },
      { id: 'U2', name: 'Bernardo Kropiwiec' },
      { id: 'U3', name: 'Ângela Nóbrega' },
      MENCAO_TODOS,
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
    // O limite conta PESSOAS: o @todos não ocupa a vaga de ninguém.
    expect(filtrarCandidatos(CANDIDATOS, '', 2)).toEqual([
      { id: 'U1', name: 'Ana Souza' },
      { id: 'U2', name: 'Bernardo Kropiwiec' },
      MENCAO_TODOS,
    ]);
    expect(filtrarCandidatos(CANDIDATOS, 'zzz')).toEqual([]);
  });
});

describe('filtrarCandidatos — o @todos', () => {
  it('nunca fica em primeiro: "@" + Enter continua escolhendo gente', () => {
    // A lista abre com o primeiro item em destaque, e o primeiro Enter não pode
    // avisar o projeto inteiro sem ninguém ter pedido.
    expect(filtrarCandidatos(CANDIDATOS, '')[0]).toEqual({ id: 'U1', name: 'Ana Souza' });
  });

  it('é achado por prefixo, como qualquer nome', () => {
    expect(filtrarCandidatos(CANDIDATOS, 'tod')).toEqual([MENCAO_TODOS]);
    expect(filtrarCandidatos(CANDIDATOS, 'TODOS')).toEqual([MENCAO_TODOS]);
  });

  it('não aparece com menos de duas pessoas na roda', () => {
    expect(filtrarCandidatos([CANDIDATOS[0]], '')).toEqual([{ id: 'U1', name: 'Ana Souza' }]);
    expect(filtrarCandidatos([], '')).toEqual([]);
    // Quem está sem nome não conta como gente para este piso.
    expect(filtrarCandidatos([CANDIDATOS[0], CANDIDATOS[3]], '')).toEqual([
      { id: 'U1', name: 'Ana Souza' },
    ]);
  });
});

describe('expandirMencaoTodos', () => {
  it('não mexe em menção sem o @todos', () => {
    expect(expandirMencaoTodos(['U1'], CANDIDATOS)).toEqual(['U1']);
    expect(expandirMencaoTodos([], CANDIDATOS)).toEqual([]);
  });

  it('troca o sentinel pela roda de gente, sem quem escreveu', () => {
    expect(expandirMencaoTodos([MENCAO_TODOS_ID], CANDIDATOS, 'U2')).toEqual(['U1', 'U3', 'U4']);
  });

  it('não repete quem já estava mencionado à mão', () => {
    expect(expandirMencaoTodos(['U3', MENCAO_TODOS_ID], CANDIDATOS)).toEqual([
      'U3',
      'U1',
      'U2',
      'U4',
    ]);
  });

  it('o sentinel NUNCA sobra, nem sem ninguém para expandir', () => {
    // `criar_org_comment` recebe `_mentions uuid[]`: um "todos" que escapasse
    // mataria a gravação inteira no cast.
    expect(expandirMencaoTodos([MENCAO_TODOS_ID], [])).toEqual([]);
    expect(expandirMencaoTodos([MENCAO_TODOS_ID], [MENCAO_TODOS])).toEqual([]);
  });

  it('reconhece o sentinel pelo id', () => {
    expect(ehMencaoTodos(MENCAO_TODOS_ID)).toBe(true);
    expect(ehMencaoTodos('U1')).toBe(false);
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
