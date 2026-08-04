import { describe, expect, it } from 'vitest';
import { markdownParaConteudo, parseInline, pareceMarkdown } from '@/lib/markdownTarefa';

describe('pareceMarkdown', () => {
  it('reconhece cerca, listas, cabeçalho, negrito e código na linha', () => {
    expect(pareceMarkdown('```sql\nselect 1;\n```')).toBe(true);
    expect(pareceMarkdown('- item')).toBe(true);
    expect(pareceMarkdown('1. passo')).toBe(true);
    expect(pareceMarkdown('## Título')).toBe(true);
    expect(pareceMarkdown('texto **forte**')).toBe(true);
    expect(pareceMarkdown('a coluna `grupo`')).toBe(true);
  });

  it('ignora texto comum, para colagem normal seguir o caminho padrão', () => {
    expect(pareceMarkdown('Só um texto colado do e-mail.\nCom duas linhas.')).toBe(false);
    expect(pareceMarkdown('')).toBe(false);
  });
});

describe('parseInline', () => {
  it('aplica negrito, itálico e código na linha', () => {
    expect(parseInline('a **b** c `d` e *f*')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'text', text: 'b', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' c ' },
      { type: 'text', text: 'd', marks: [{ type: 'code' }] },
      { type: 'text', text: ' e ' },
      { type: 'text', text: 'f', marks: [{ type: 'italic' }] },
    ]);
  });

  it('não marca itálico dentro de palavra: snake_case_de_banco sobrevive', () => {
    expect(parseInline('a policy checklist_item_padrao e produto_checklist_item')).toEqual([
      { type: 'text', text: 'a policy checklist_item_padrao e produto_checklist_item' },
    ]);
    // Com fronteira de palavra, o itálico continua valendo.
    expect(parseInline('texto _mesmo_ assim')).toEqual([
      { type: 'text', text: 'texto ' },
      { type: 'text', text: 'mesmo', marks: [{ type: 'italic' }] },
      { type: 'text', text: ' assim' },
    ]);
  });

  it('aninha marca dentro de negrito e mantém o conteúdo do código literal', () => {
    // `code` no TipTap exclui as demais marcas: o trecho em crases fica só com ela.
    expect(parseInline('**a `b`**')).toEqual([
      { type: 'text', text: 'a ', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'b', marks: [{ type: 'code' }] },
    ]);
    expect(parseInline('`**não é negrito**`')).toEqual([
      { type: 'text', text: '**não é negrito**', marks: [{ type: 'code' }] },
    ]);
  });
});

describe('markdownParaConteudo', () => {
  it('converte cerca com linguagem em codeBlock', () => {
    expect(markdownParaConteudo('```sql\nselect 1;\nfrom t;\n```')).toEqual([
      {
        type: 'codeBlock',
        attrs: { language: 'sql' },
        content: [{ type: 'text', text: 'select 1;\nfrom t;' }],
      },
    ]);
  });

  it('cerca sem linguagem e sem fechamento ainda vira bloco', () => {
    expect(markdownParaConteudo('```\nselect 1;')).toEqual([
      { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'select 1;' }] },
    ]);
  });

  it('agrupa itens consecutivos e separa lista numerada de lista com marcadores', () => {
    const blocos = markdownParaConteudo('- um\n- dois\n\n1. passo\n2. outro');
    expect(blocos.map((bloco) => bloco.type)).toEqual(['bulletList', 'orderedList']);
    expect(blocos[0].content).toHaveLength(2);
    expect(blocos[1].content?.[1]).toEqual({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'outro' }] }],
    });
  });

  it('cabeçalho vira parágrafo em negrito e linha em branco não gera bloco', () => {
    expect(markdownParaConteudo('## O QUE É\n\ntexto')).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'O QUE É', marks: [{ type: 'bold' }] }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'texto' }] },
    ]);
  });

  it('mantém a ordem de parágrafo, lista e bloco de código no mesmo texto', () => {
    const blocos = markdownParaConteudo(
      '**Passos**\n\n- carga\n\n```sql\nupdate t set g = 1;\n```\n\nfim',
    );
    expect(blocos.map((bloco) => bloco.type)).toEqual([
      'paragraph',
      'bulletList',
      'codeBlock',
      'paragraph',
    ]);
  });
});
