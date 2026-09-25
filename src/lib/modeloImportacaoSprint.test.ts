import { describe, expect, it } from 'vitest';
import { processExcelData } from '@/lib/excelImporter';
import { hasTarefaRichTextMarker } from '@/lib/tarefaRichText';
import {
  ABA_DE_DADOS,
  ABA_DE_INSTRUCOES,
  linhasDeInstrucoesDoModelo,
  linhasDoModeloDeSprint,
  montarPastaDoModelo,
} from '@/lib/modeloImportacaoSprint';

describe('modelo de importação de sprint', () => {
  it('é lido pelo importador sem campo vazio', () => {
    const preview = processExcelData(linhasDoModeloDeSprint(), [], [], []);

    expect(preview.sprintName).toBe('Sprint 1 - Outubro');
    expect(preview.totalTasks).toBe(3);
    expect(preview.totalSubtasks).toBe(7);
    expect(preview.totalHours).toBe(26);

    preview.taskGroups.forEach((grupo) => {
      expect(grupo.subtasks.length).toBeGreaterThan(1);
      expect(hasTarefaRichTextMarker(grupo.description)).toBe(true);
      grupo.subtasks.forEach((subtarefa) => {
        expect(subtarefa.taskCode).not.toBe('');
        expect(subtarefa.subtaskTitle).not.toBe('');
        expect(subtarefa.description).not.toBe('');
        expect(subtarefa.estimatedHours).toBeGreaterThan(0);
        expect(subtarefa.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(subtarefa.projectName).not.toBe('');
        expect(subtarefa.processName).not.toBe('');
      });
    });
  });

  // O modelo ensina a regra pelo exemplo: se a segunda linha de um grupo viesse
  // preenchida, quem copia a planilha repetiria a descrição em toda linha.
  it('preenche a descrição da tarefa pai só na primeira linha de cada grupo', () => {
    const porTitulo = new Map<string, string[]>();
    linhasDoModeloDeSprint().forEach((linha) => {
      const grupo = porTitulo.get(linha.Título) ?? [];
      grupo.push(linha['Descrição da Tarefa Pai'] ?? '');
      porTitulo.set(linha.Título, grupo);
    });

    expect(porTitulo.size).toBe(3);
    porTitulo.forEach(([primeira, ...demais]) => {
      expect(primeira).not.toBe('');
      expect(demais.length).toBeGreaterThan(0);
      demais.forEach((celula) => expect(celula).toBe(''));
    });
  });

  // `parseExcelFile` lê `SheetNames[0]`: instruções na frente dos dados quebrariam a
  // reimportação do próprio modelo preenchido.
  it('põe a aba de dados antes da aba de instruções', () => {
    expect(montarPastaDoModelo().SheetNames).toEqual([ABA_DE_DADOS, ABA_DE_INSTRUCOES]);
  });

  it('explica todas as colunas que a planilha usa', () => {
    const instrucoes = linhasDeInstrucoesDoModelo();
    const explicadas = new Set(instrucoes.map(([primeira]) => primeira));
    const colunas = Object.keys(linhasDoModeloDeSprint()[0]);

    colunas.forEach((coluna) => expect(explicadas).toContain(coluna));

    // O texto para colar na IA precisa listar as colunas na mesma ordem da aba de dados.
    const listagem = instrucoes.flat().find((texto) => texto.includes(' | '));
    expect(listagem).toContain(colunas.join(' | '));
  });
});
