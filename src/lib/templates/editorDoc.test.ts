import { describe, expect, it } from 'vitest';
import { docParaString, segmentosLinha, stringParaDoc } from './editorDoc';
import { extrairRunsLinha } from './marcas';

const roundTrip = (s: string) => docParaString(stringParaDoc(s));

describe('stringParaDoc', () => {
  it('linha simples vira um parágrafo com um text node', () => {
    expect(stringParaDoc('Olá mundo')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Olá mundo' }] }],
    });
  });

  it('linhas vazias viram parágrafos vazios', () => {
    expect(stringParaDoc('a\n\nb').content).toHaveLength(3);
    expect(stringParaDoc('a\n\nb').content![1]).toEqual({ type: 'paragraph' });
  });

  it('placeholder vira chip atômico com source exato', () => {
    const doc = stringParaDoc('Olá {{ nome }}!');
    expect(doc.content![0].content).toEqual([
      { type: 'text', text: 'Olá ' },
      { type: 'placeholderChip', attrs: { source: '{{ nome }}', nome: 'nome' } },
      { type: 'text', text: '!' },
    ]);
  });

  it('tokens de seção viram chips com rótulo #nome / /nome', () => {
    const doc = stringParaDoc('{{#socios sep="; "}}{{ socio.nome }}{{/socios}}');
    const inline = doc.content![0].content!;
    expect(inline.map((n) => n.attrs?.nome)).toEqual(['#socios', 'socio.nome', '/socios']);
    expect(inline[0].attrs?.source).toBe('{{#socios sep="; "}}');
  });

  it('marcas viram marks do TipTap, sem os delimitadores no texto', () => {
    const doc = stringParaDoc('a *b* c');
    expect(doc.content![0].content).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'text', text: 'b', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' c' },
    ]);
  });

  it('sobreposição: *a _b_ c* aninha negrito+itálico', () => {
    const doc = stringParaDoc('*a _b_ c*');
    expect(doc.content![0].content).toEqual([
      { type: 'text', text: 'a ', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'b', marks: [{ type: 'bold' }, { type: 'italic' }] },
      { type: 'text', text: ' c', marks: [{ type: 'bold' }] },
    ]);
  });

  it('marca atravessando chip aplica o mark ao próprio chip', () => {
    const doc = stringParaDoc('*x {{ nome }} y*');
    const inline = doc.content![0].content!;
    expect(inline).toHaveLength(3);
    expect(inline[1].type).toBe('placeholderChip');
    expect(inline[1].marks).toEqual([{ type: 'bold' }]);
  });

  it('delimitador dentro de atributo de token NÃO vira formatação', () => {
    const doc = stringParaDoc('a {{#secao sep="a_b"}} b _c_');
    const inline = doc.content![0].content!;
    expect(inline[1].type).toBe('placeholderChip');
    expect(inline[1].marks).toBeUndefined();
    // só o _c_ explícito vira itálico
    const italicos = inline.filter((n) => n.marks?.some((m) => m.type === 'italic'));
    expect(italicos).toEqual([{ type: 'text', text: 'c', marks: [{ type: 'italic' }] }]);
  });

  it('sequências de delimitadores ficam literais (lacunas e snake_case)', () => {
    expect(stringParaDoc('Nome: ______________').content![0].content).toEqual([
      { type: 'text', text: 'Nome: ______________' },
    ]);
    expect(stringParaDoc('shift__name').content![0].content).toEqual([
      { type: 'text', text: 'shift__name' },
    ]);
  });

  it('delimitador sem par fica literal', () => {
    expect(stringParaDoc('a * b').content![0].content).toEqual([{ type: 'text', text: 'a * b' }]);
  });
});

describe('docParaString — round-trip', () => {
  const canonicos = [
    'texto simples',
    'linha 1\nlinha 2\n\nlinha 4',
    '*negrito* e _itálico_ e ~sublinhado~',
    '*a _b_ c*',
    'Olá {{ nome }}!',
    'Um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }})',
    '{{#socios sep="; " fim="; e "}}{{ socio.nome }}{{/socios}}',
    '{{#sePF}}brasileiro{{/sePF}}{{#sePJ}}sociedade{{/sePJ}}',
    '*x {{ nome }} y*',
    '*{{ nome }}*',
    'Nome: ______________',
    'shift__name e a * b sem par',
    '{{#secao sep="a_b"}}miolo{{/secao}}',
    '',
    '\n',
  ];

  for (const s of canonicos) {
    it(`round-trip exato: ${JSON.stringify(s)}`, () => {
      expect(roundTrip(s)).toBe(s);
    });
  }

  it('fixpoint para entradas não-canônicas (idempotência após uma normalização)', () => {
    const naoCanonicos = ['_*ab*_', '*a*_b_~c~', '*a**b*'];
    for (const s of naoCanonicos) {
      const umaVez = roundTrip(s);
      expect(roundTrip(umaVez)).toBe(umaVez);
    }
  });

  it('emite delta de marks entre nós adjacentes', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
            { type: 'text', text: 'b', marks: [{ type: 'bold' }, { type: 'italic' }] },
          ],
        },
      ],
    };
    const s = docParaString(doc);
    expect(s).toBe('*a_b*_');
    // e o re-parse devolve os mesmos marks
    expect(stringParaDoc(s).content![0].content).toEqual(doc.content[0].content);
  });

  it('fecha marks abertos no fim da linha (nunca vazam entre linhas)', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a', marks: [{ type: 'bold' }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
      ],
    };
    expect(docParaString(doc)).toBe('*a*\nb');
  });
});

describe('segmentosLinha — paridade com extrairRunsLinha', () => {
  const linhas = [
    'texto sem marcas',
    '*negrito*',
    '*a _b_ c*',
    'a * b',
    '______________',
    'shift__name',
    '~sub~ e *neg* e _ita_',
    '*a* meio *b*',
    '_*misturado_*',
    '',
  ];

  for (const linha of linhas) {
    it(`mesmos runs que marcas.ts: ${JSON.stringify(linha)}`, () => {
      const viaIndices = segmentosLinha(linha).map((seg) => ({
        texto: linha.slice(seg.inicio, seg.fim),
        negrito: seg.negrito,
        italico: seg.italico,
        sublinhado: seg.sublinhado,
      }));
      // extrairRunsLinha funde runs adjacentes de mesmo estilo e suprime vazios;
      // reproduzimos a fusão para comparar.
      const fundidos: typeof viaIndices = [];
      for (const r of viaIndices) {
        if (r.texto === '') continue;
        const ant = fundidos[fundidos.length - 1];
        if (ant && ant.negrito === r.negrito && ant.italico === r.italico && ant.sublinhado === r.sublinhado) {
          ant.texto += r.texto;
        } else {
          fundidos.push({ ...r });
        }
      }
      expect(fundidos).toEqual(extrairRunsLinha(linha).filter((r) => r.texto !== ''));
    });
  }
});
