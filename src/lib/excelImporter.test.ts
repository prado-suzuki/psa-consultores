import { describe, expect, it } from 'vitest';
import { processExcelData, type ExcelRow } from '@/lib/excelImporter';
import { hasTarefaRichTextMarker, parseTarefaRichText } from '@/lib/tarefaRichText';

function linha(descricao: string): ExcelRow {
  return {
    Sprint: '11_Sprint OSG',
    ID: 'EDU-01',
    Título: 'Cadastro e Vínculo',
    Subtarefa: 'Converter a descrição importada',
    Responsável: 'Eduardo',
    Descrição: descricao,
    'Estimativa (h)': 4,
    'Data de Entrega': '05/08/2026',
  };
}

function primeiraDescricao(descricao: string): string {
  const preview = processExcelData([linha(descricao)], [], [], []);
  return preview.taskGroups[0].subtasks[0].description;
}

describe('processExcelData — descrição em markdown', () => {
  it('converte a célula em documento do editor de tarefa', () => {
    const valor = primeiraDescricao(
      ['## O QUE É', '', 'Ligar a **origem** do documento.', '', '- primeiro', '- segundo'].join(
        '\n',
      ),
    );

    expect(hasTarefaRichTextMarker(valor)).toBe(true);
    expect(parseTarefaRichText(valor)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'O QUE É', marks: [{ type: 'bold' }] }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Ligar a ' },
            { type: 'text', text: 'origem', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' do documento.' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'primeiro' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'segundo' }] }] },
          ],
        },
      ],
    });
  });

  it('preserva bloco de código com linguagem', () => {
    const doc = parseTarefaRichText(
      primeiraDescricao(['```sql', 'select 1;', '```'].join('\n')),
    );
    expect(doc.content?.[0]).toEqual({
      type: 'codeBlock',
      attrs: { language: 'sql' },
      content: [{ type: 'text', text: 'select 1;' }],
    });
  });

  it('descrição vazia continua vazia, para o entregável gravar null', () => {
    expect(primeiraDescricao('')).toBe('');
    expect(primeiraDescricao('   \n  ')).toBe('');
  });
});

describe('processExcelData — descrição da tarefa pai', () => {
  function grupo(rows: Partial<ExcelRow>[]) {
    return processExcelData(
      rows.map((row) => ({ ...linha(''), ...row })) as ExcelRow[],
      [],
      [],
      [],
    ).taskGroups[0];
  }

  it('lê a coluna própria e a converte em documento do editor', () => {
    const { description } = grupo([
      { 'Descrição da Tarefa Pai': '## O QUE É\n\nLigar o cadastro ao vínculo.' },
      { Subtarefa: 'Outra subtarefa' },
    ]);

    expect(hasTarefaRichTextMarker(description)).toBe(true);
    expect(parseTarefaRichText(description)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'O QUE É', marks: [{ type: 'bold' }] }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Ligar o cadastro ao vínculo.' }] },
      ],
    });
  });

  it('cai na Descrição da linha sem Subtarefa, que é onde a exportação grava o pai', () => {
    const { description } = grupo([
      { Subtarefa: '', Descrição: 'Descrição do pai exportada' },
      { Subtarefa: 'Filha', Descrição: 'Descrição da filha' },
    ]);

    expect(parseTarefaRichText(description)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Descrição do pai exportada' }] }],
    });
  });

  it('não empresta a descrição de uma subtarefa para o pai', () => {
    expect(grupo([{ Subtarefa: 'Filha', Descrição: 'Só da filha' }]).description).toBe('');
  });
});
