import { describe, it, expect } from 'vitest';
import {
  celulasDaLinha,
  ehLinhaTabela,
  ehSeparadora,
  gruposDoCabecalho,
  segmentar,
} from './tabela';

describe('tabela — detecção de linha e separadora', () => {
  it('reconhece linha de tabela (borda | … |, tolera espaços)', () => {
    expect(ehLinhaTabela('| a | b |')).toBe(true);
    expect(ehLinhaTabela('  | a | b |  ')).toBe(true);
    expect(ehLinhaTabela('texto comum')).toBe(false);
    expect(ehLinhaTabela('a | b')).toBe(false); // sem bordas
  });

  it('reconhece separadora com qualquer alinhamento', () => {
    expect(ehSeparadora('| --- | --- |')).toBe(true);
    expect(ehSeparadora('| :--- | :--: | ---: |')).toBe(true);
    expect(ehSeparadora('| a | b |')).toBe(false);
  });
});

describe('tabela — divisão em células', () => {
  it('descarta bordas externas e apara espaços', () => {
    expect(celulasDaLinha('| Sócio | Quotas | Valor |')).toEqual(['Sócio', 'Quotas', 'Valor']);
  });

  it('desfaz o escape \\| (pipe literal na célula)', () => {
    expect(celulasDaLinha('| a \\| b | c |')).toEqual(['a | b', 'c']);
  });

  it('preserva marcas e placeholders dentro da célula (resolvidos a jusante)', () => {
    expect(celulasDaLinha('| *nome* | {{ valor }} |')).toEqual(['*nome*', '{{ valor }}']);
  });
});

describe('tabela — segmentação do bloco', () => {
  it('só vira tabela com separadora logo abaixo do cabeçalho', () => {
    // Linha-pipe solta (sem separadora) continua texto.
    const segs = segmentar(['| isso é texto |', 'parágrafo normal']);
    expect(segs.every((s) => s.tipo === 'linha')).toBe(true);
  });

  it('separa texto antes/depois de uma tabela e captura alinhamentos', () => {
    const segs = segmentar([
      'Quadro de sócios:',
      '| Sócio | Valor |',
      '| :--- | ---: |',
      '| Fulano | 100 |',
      '| Beltrano | 200 |',
      'Total: 300.',
    ]);
    expect(segs).toHaveLength(3);
    expect(segs[0]).toEqual({ tipo: 'linha', texto: 'Quadro de sócios:' });
    expect(segs[2]).toEqual({ tipo: 'linha', texto: 'Total: 300.' });
    const tab = segs[1];
    expect(tab.tipo).toBe('tabela');
    if (tab.tipo !== 'tabela') return;
    expect(tab.cabecalho).toEqual(['Sócio', 'Valor']);
    expect(tab.corpo).toEqual([['Fulano', '100'], ['Beltrano', '200']]);
    expect(tab.alinhamentos).toEqual(['left', 'right']);
  });

  it('linhas dinâmicas do loop de seção (já renderizadas) viram corpo', () => {
    // Como sai do render: {{#socios}}| {{nome}} | {{quotas}} |{{/socios}} com sep "\n".
    const renderizado = '| Sócio | Quotas |\n| --- | --- |\n| Ana | 50 |\n| Bia | 50 |';
    const segs = segmentar(renderizado.split('\n'));
    expect(segs).toHaveLength(1);
    const tab = segs[0];
    if (tab.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(tab.corpo).toEqual([['Ana', '50'], ['Bia', '50']]);
  });
});

describe('tabela — cabeçalho agrupado (super-cabeçalho)', () => {
  it('agrupa células: cada texto inicia um grupo; vazias estendem o span', () => {
    expect(gruposDoCabecalho(['VÉRTICE', '', '', '', 'SEGMENTO VANTE', '', '', ''])).toEqual([
      { texto: 'VÉRTICE', span: 4 },
      { texto: 'SEGMENTO VANTE', span: 4 },
    ]);
  });

  it('célula vazia no início vira um grupo de texto vazio', () => {
    expect(gruposDoCabecalho(['', '', 'X'])).toEqual([
      { texto: '', span: 2 },
      { texto: 'X', span: 1 },
    ]);
  });

  it('duas linhas-pipe seguidas de separadora viram grupos + cabeçalho', () => {
    const segs = segmentar([
      '| VÉRTICE | | | SEGMENTO VANTE | |',
      '| Cód | Long | Lat | Cód | Azim |',
      '| --- | --- | --- | --- | --- |',
      '| P1 | a | b | P2 | 90° |',
    ]);
    expect(segs).toHaveLength(1);
    const tab = segs[0];
    if (tab.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(tab.grupos).toEqual([
      { texto: 'VÉRTICE', span: 3 },
      { texto: 'SEGMENTO VANTE', span: 2 },
    ]);
    expect(tab.cabecalho).toEqual(['Cód', 'Long', 'Lat', 'Cód', 'Azim']);
    expect(tab.corpo).toEqual([['P1', 'a', 'b', 'P2', '90°']]);
  });

  it('tabela simples (sem grupos) continua sem o campo grupos', () => {
    const segs = segmentar(['| A | B |', '| --- | --- |', '| 1 | 2 |']);
    const tab = segs[0];
    if (tab.tipo !== 'tabela') throw new Error('esperava tabela');
    expect(tab.grupos).toBeUndefined();
  });
});
