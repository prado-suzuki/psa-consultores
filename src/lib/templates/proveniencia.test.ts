import { describe, it, expect } from 'vitest';
import { apararSegmentos, segmentarComProveniencia, type Pedaco } from './proveniencia';
import { renderSegmentos, type SegmentoRender } from './render';
import { comOrigem, type OrigemValor } from './origem';
import { removerMarcas } from './marcas';

const ana: OrigemValor = { tipo: 'pessoa', id: 'p1' };
const beto: OrigemValor = { tipo: 'pessoa', id: 'p2' };

const texto = (t: string): SegmentoRender => ({ tipo: 'texto', texto: t });
const valor = (t: string, caminho: string, origem?: OrigemValor): SegmentoRender => ({
  tipo: 'valor',
  texto: t,
  caminho,
  origem,
});

/** Pedaço esperado, com os estilos desligados por padrão. */
const pedaco = (t: string, extra: Partial<Pedaco> = {}): Pedaco => ({
  texto: t,
  negrito: false,
  italico: false,
  sublinhado: false,
  caminho: undefined,
  origem: undefined,
  ...extra,
});

describe('apararSegmentos (espelho do conteudo.trim())', () => {
  it('apara whitespace das extremidades sem tocar o miolo', () => {
    expect(apararSegmentos([texto('  a'), valor('B', 'x'), texto('c \n')])).toEqual([
      texto('a'),
      valor('B', 'x'),
      texto('c'),
    ]);
  });

  it('segmento de borda só de whitespace some; valor na borda só perde whitespace', () => {
    expect(apararSegmentos([texto('\n '), valor(' Ana', 'x', ana), texto(' ')])).toEqual([
      valor('Ana', 'x', ana),
    ]);
  });

  it('sem nada a aparar, devolve a mesma lista', () => {
    const segs = [texto('a'), valor('B', 'x')];
    expect(apararSegmentos(segs)).toBe(segs);
  });

  it('paridade com trim(): concat aparado === concat.trim()', () => {
    const segs = [texto('  *Cláusula:* '), valor('Ana', 'socio.nome', ana), texto('.\n')];
    const aparados = apararSegmentos(segs);
    expect(aparados.map((s) => s.texto).join('')).toBe(segs.map((s) => s.texto).join('').trim());
  });
});

describe('segmentarComProveniencia — linhas de prosa', () => {
  it('valor com origem vira pedaço próprio no meio do texto', () => {
    const segs = segmentarComProveniencia([texto('Sócio '), valor('Ana', 'socio.nome', ana), texto('.')]);
    expect(segs).toEqual([
      {
        tipo: 'linha',
        pedacos: [
          pedaco('Sócio '),
          pedaco('Ana', { caminho: 'socio.nome', origem: ana }),
          pedaco('.'),
        ],
      },
    ]);
  });

  it('marca atravessando a fronteira texto/valor fatia o run e preserva a origem', () => {
    // "*{{socio.nome}}, qualificada*" → tudo negrito, mas só o nome tem origem.
    const segs = segmentarComProveniencia([
      texto('*'),
      valor('Ana', 'socio.nome', ana),
      texto(', qualificada*'),
    ]);
    expect(segs).toEqual([
      {
        tipo: 'linha',
        pedacos: [
          pedaco('Ana', { negrito: true, caminho: 'socio.nome', origem: ana }),
          pedaco(', qualificada', { negrito: true }),
        ],
      },
    ]);
  });

  it('valor multilinha gera pedaços em linhas separadas, todos com a mesma origem', () => {
    const segs = segmentarComProveniencia([texto('Obs: '), valor('linha 1\nlinha 2', 'obs', ana)]);
    expect(segs).toEqual([
      { tipo: 'linha', pedacos: [pedaco('Obs: '), pedaco('linha 1', { caminho: 'obs', origem: ana })] },
      { tipo: 'linha', pedacos: [pedaco('linha 2', { caminho: 'obs', origem: ana })] },
    ]);
  });

  it('pedaços adjacentes idênticos (mesmo estilo e origem) são fundidos', () => {
    const segs = segmentarComProveniencia([texto('a'), texto('b')]);
    expect(segs).toEqual([{ tipo: 'linha', pedacos: [pedaco('ab')] }]);
  });

  it('junturas sep entre itens não herdam a origem dos vizinhos', () => {
    const ctx = {
      s: [
        { socio: comOrigem({ nome: 'Ana' }, ana) },
        { socio: comOrigem({ nome: 'Beto' }, beto) },
      ],
    };
    const segs = segmentarComProveniencia(
      renderSegmentos('{{#s sep="; "}}{{ socio.nome }}{{/s}}', ctx),
    );
    expect(segs).toEqual([
      {
        tipo: 'linha',
        pedacos: [
          pedaco('Ana', { caminho: 'socio.nome', origem: ana }),
          pedaco('; '),
          pedaco('Beto', { caminho: 'socio.nome', origem: beto }),
        ],
      },
    ]);
  });

  it('invariante: concat dos pedaços de uma linha === removerMarcas(linha crua)', () => {
    const casos: SegmentoRender[][] = [
      [texto('*'), valor('Ana', 'x', ana), texto('* e _'), valor('Beto', 'y', beto), texto('_')],
      [texto('sem marcas '), valor('Ana', 'x', ana)],
      [texto('* solto '), valor('Ana', 'x', ana)],
    ];
    for (const segs of casos) {
      const linhaCrua = segs.map((s) => s.texto).join('');
      const [linha] = segmentarComProveniencia(segs);
      if (linha.tipo !== 'linha') throw new Error('esperava linha');
      expect(linha.pedacos.map((p) => p.texto).join('')).toBe(removerMarcas(linhaCrua));
    }
  });
});

describe('segmentarComProveniencia — tabelas', () => {
  // Tabela típica do quadro societário: linha dinâmica por sócio.
  const tabela = (): SegmentoRender[] => [
    texto('| Sócio | Quotas |\n| --- | --: |\n| '),
    valor('Ana', 'socio.nome', ana),
    texto(' | '),
    valor('100', 'socio.quotas', ana),
    texto(' |\n| *'),
    valor('Beto', 'socio.nome', beto),
    texto('* | 50 |'),
  ];

  it('células carregam a proveniência dos valores, com trim e alinhamentos', () => {
    const [seg] = segmentarComProveniencia(tabela());
    if (seg.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(seg.alinhamentos).toEqual(['left', 'right']);
    expect(seg.cabecalho).toEqual([[pedaco('Sócio')], [pedaco('Quotas')]]);
    expect(seg.corpo[0]).toEqual([
      [pedaco('Ana', { caminho: 'socio.nome', origem: ana })],
      [pedaco('100', { caminho: 'socio.quotas', origem: ana })],
    ]);
    // Marcas resolvidas POR CÉLULA: o negrito não vaza para a célula vizinha.
    expect(seg.corpo[1]).toEqual([
      [pedaco('Beto', { negrito: true, caminho: 'socio.nome', origem: beto })],
      [pedaco('50')],
    ]);
  });

  it('linha-pipe sem separadora não vira tabela (paridade com segmentar)', () => {
    const segs = segmentarComProveniencia([texto('| a | b |\ntexto comum')]);
    expect(segs.map((s) => s.tipo)).toEqual(['linha', 'linha']);
  });

  it('célula com \\| escapado vira | literal mantendo a origem das demais', () => {
    const [seg] = segmentarComProveniencia([
      texto('| A | B |\n| --- | --- |\n| a \\| b | '),
      valor('Ana', 'x', ana),
      texto(' |'),
    ]);
    if (seg.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(seg.corpo[0][0]).toEqual([pedaco('a | b')]);
    expect(seg.corpo[0][1]).toEqual([pedaco('Ana', { caminho: 'x', origem: ana })]);
  });

  it('valor com whitespace na borda da célula perde só o whitespace (trim por célula)', () => {
    const [seg] = segmentarComProveniencia([
      texto('| A |\n| --- |\n|'),
      valor(' Ana ', 'x', ana),
      texto('|'),
    ]);
    if (seg.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(seg.corpo[0][0]).toEqual([pedaco('Ana', { caminho: 'x', origem: ana })]);
  });
});

describe('integração com o render (fluxo da prévia)', () => {
  it('um bloco com prosa + tabela sai com as origens por item da lista', () => {
    const ctx = {
      socios: [
        { socio: comOrigem({ nome: 'Ana', quotas: '100' }, ana) },
        { socio: comOrigem({ nome: 'Beto', quotas: '50' }, beto) },
      ],
    };
    const tpl =
      'Quadro societário:\n| Sócio | Quotas |\n| --- | --- |\n{{#socios}}| {{ socio.nome }} | {{ socio.quotas }} |{{/socios}}';
    const segs = segmentarComProveniencia(apararSegmentos(renderSegmentos(tpl, ctx)));
    expect(segs.map((s) => s.tipo)).toEqual(['linha', 'tabela']);
    const tab = segs[1];
    if (tab.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(tab.corpo.map((cels) => cels[0][0])).toEqual([
      pedaco('Ana', { caminho: 'socio.nome', origem: ana }),
      pedaco('Beto', { caminho: 'socio.nome', origem: beto }),
    ]);
  });
});
