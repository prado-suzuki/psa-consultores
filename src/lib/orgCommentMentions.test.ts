import { describe, expect, it } from 'vitest';

import {
  aplicarMencao,
  desserializarMencoes,
  detectarMencaoAtiva,
  extrairMencoes,
  filtrarCandidatos,
  iniciaisDoNome,
  ordenarCandidatos,
  segmentarComMencoes,
  serializarMencoes,
  type MentionCandidate,
} from '@/lib/orgCommentMentions';

const CANDIDATOS: MentionCandidate[] = [
  { id: 'U1', name: 'Ana Souza' },
  { id: 'U2', name: 'Bernardo Kropiwiec' },
  { id: 'U3', name: 'Ângela Nóbrega' },
  { id: 'U4', name: '' },
];

describe('detectarMencaoAtiva', () => {
  it('reconhece o @ no começo do texto e depois de espaço', () => {
    expect(detectarMencaoAtiva('@', 1)).toEqual({ termo: '', inicio: 0 });
    expect(detectarMencaoAtiva('Confira com @an', 15)).toEqual({ termo: 'an', inicio: 12 });
    expect(detectarMencaoAtiva('(@ana', 5)).toEqual({ termo: 'ana', inicio: 1 });
  });

  it('aceita termo com espaço, para nome composto', () => {
    expect(detectarMencaoAtiva('@Ana S', 6)).toEqual({ termo: 'Ana S', inicio: 0 });
  });

  it('ignora @ colado em palavra — e-mail não abre a lista', () => {
    expect(detectarMencaoAtiva('bi@psaconsultores', 17)).toBeNull();
  });

  it('não reabre em cima de uma menção já escolhida', () => {
    const texto = '@Ana Souza ';
    // Sem saber das menções, o `@Ana Souza ` parece uma busca em construção.
    expect(detectarMencaoAtiva(texto, texto.length)).toEqual({ termo: 'Ana Souza ', inicio: 0 });
    // Sabendo, o `@` pertence à menção — e a lista fica fechada.
    expect(detectarMencaoAtiva(texto, texto.length, [CANDIDATOS[0]])).toBeNull();
  });

  it('olha só o que está antes do cursor', () => {
    expect(detectarMencaoAtiva('@ana e o resto', 4)).toEqual({ termo: 'ana', inicio: 0 });
    expect(detectarMencaoAtiva('texto sem gatilho', 5)).toBeNull();
  });
});

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

describe('aplicarMencao', () => {
  it('escreve só o nome no campo — o uuid não aparece na tela', () => {
    const texto = 'Confira com @an';
    const mencao = detectarMencaoAtiva(texto, texto.length)!;

    expect(aplicarMencao(texto, mencao, CANDIDATOS[0])).toEqual({
      text: 'Confira com @Ana Souza ',
      caret: 'Confira com @Ana Souza '.length,
    });
  });

  it('preserva o que vem depois do cursor', () => {
    const texto = '@an, confere?';
    const mencao = detectarMencaoAtiva(texto, 3)!;

    expect(aplicarMencao(texto, mencao, CANDIDATOS[0])).toEqual({
      text: '@Ana Souza , confere?',
      caret: '@Ana Souza '.length,
    });
  });
});

describe('segmentarComMencoes', () => {
  it('separa o `@Nome` escolhido do resto do texto', () => {
    expect(segmentarComMencoes('Confira com @Ana Souza hoje', [CANDIDATOS[0]])).toEqual([
      { text: 'Confira com ' },
      { text: '@Ana Souza', mention: CANDIDATOS[0] },
      { text: ' hoje' },
    ]);
  });

  it('nome maior ganha do menor que é seu prefixo', () => {
    const ana = { id: 'U9', name: 'Ana' };
    expect(segmentarComMencoes('@Ana Souza', [ana, CANDIDATOS[0]])).toEqual([
      { text: '@Ana Souza', mention: CANDIDATOS[0] },
    ]);
  });

  it('um `@` que não é menção escolhida fica texto solto', () => {
    expect(segmentarComMencoes('fale com @alguem', [CANDIDATOS[0]])).toEqual([
      { text: 'fale com @alguem' },
    ]);
  });
});

describe('serializarMencoes e desserializarMencoes', () => {
  it('campo → corpo: cada `@Nome` recebe o uuid da pessoa escolhida', () => {
    expect(
      serializarMencoes('@Ana Souza e @Bernardo Kropiwiec, confiram', [
        CANDIDATOS[0],
        CANDIDATOS[1],
      ]),
    ).toBe('@[Ana Souza](U1) e @[Bernardo Kropiwiec](U2), confiram');
  });

  it('campo → corpo: nome digitado à mão não vira menção', () => {
    expect(serializarMencoes('@Ana Souza', [])).toBe('@Ana Souza');
  });

  it('corpo → campo: o uuid sai da tela e volta na lista de menções', () => {
    expect(desserializarMencoes('@[Ana Souza](U1) e @[Ana Souza](U1), confiram')).toEqual({
      text: '@Ana Souza e @Ana Souza, confiram',
      mencoes: [{ id: 'U1', name: 'Ana Souza' }],
    });
  });

  it('ida e volta preserva o corpo gravado', () => {
    const corpo = 'Alinhar com @[Ana Souza](U1) antes de @[Ângela Nóbrega](U3) revisar';
    const escrito = desserializarMencoes(corpo);
    expect(serializarMencoes(escrito.text, escrito.mencoes)).toBe(corpo);
  });
});

describe('extrairMencoes', () => {
  it('junta os uuids do corpo sem repetir', () => {
    expect(
      extrairMencoes('@[Ana Souza](U1) e @[Bernardo Kropiwiec](U2), veja com @[Ana Souza](U1)'),
    ).toEqual(['U1', 'U2']);
  });

  it('devolve vazio quando não há menção', () => {
    expect(extrairMencoes('comentário sem menção')).toEqual([]);
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
