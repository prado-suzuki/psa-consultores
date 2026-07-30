import { describe, it, expect } from 'vitest';
import { extractErrorMessage, taskSaveErrorMessage } from './rlsMessages';

const MAPPED =
  'Esta tarefa foi criada por outra pessoa. Você pode alterar status, horas e revisor. ' +
  'Título, descrição e os demais campos só quem criou a tarefa pode mudar.';

const FALLBACK = 'Não foi possível salvar a tarefa. Tente novamente.';

describe('extractErrorMessage', () => {
  it('extrai de Error', () => {
    expect(extractErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('extrai de objeto do supabase-js', () => {
    expect(
      extractErrorMessage({ message: 'permission denied', code: '42501', details: null, hint: null }),
    ).toBe('permission denied');
  });

  it('extrai de string', () => {
    expect(extractErrorMessage('  falhou  ')).toBe('falhou');
  });

  it('retorna null sem mensagem utilizável', () => {
    expect(extractErrorMessage(null)).toBeNull();
    expect(extractErrorMessage(undefined)).toBeNull();
    expect(extractErrorMessage({})).toBeNull();
    expect(extractErrorMessage({ message: '' })).toBeNull();
    expect(extractErrorMessage({ message: '   ' })).toBeNull();
    expect(extractErrorMessage({ message: 42 })).toBeNull();
  });
});

describe('taskSaveErrorMessage', () => {
  it('mapeia a variante de tarefa delegada', () => {
    const err = {
      message: 'Tarefa delegada: team_member so pode alterar status, horas e revisor (RLS-06)',
    };
    expect(taskSaveErrorMessage(err)).toBe(MAPPED);
  });

  it('mapeia a variante de tarefa própria', () => {
    const err = new Error(
      'team_member so pode alterar status, horas e revisor da propria tarefa (RLS-06)',
    );
    expect(taskSaveErrorMessage(err)).toBe(MAPPED);
  });

  it('mapeia mesmo com acento', () => {
    expect(
      taskSaveErrorMessage({ message: 'team_member só pode alterar status, horas e revisor' }),
    ).toBe(MAPPED);
  });

  it('não prefixa a mensagem mapeada', () => {
    expect(
      taskSaveErrorMessage(
        { message: 'team_member so pode alterar status, horas e revisor (RLS-06)' },
        { prefix: 'Erro ao atualizar tarefa: ' },
      ),
    ).toBe(MAPPED);
  });

  it('preserva mensagem não mapeada', () => {
    expect(taskSaveErrorMessage({ message: 'null value in column "title"' })).toBe(
      'null value in column "title"',
    );
  });

  it('prefixa mensagem não mapeada quando pedido', () => {
    expect(
      taskSaveErrorMessage({ message: 'coluna invalida' }, { prefix: 'Erro ao atualizar tarefa: ' }),
    ).toBe('Erro ao atualizar tarefa: coluna invalida');
  });

  it('usa fallback sem prefixo quando não há mensagem', () => {
    expect(taskSaveErrorMessage({}, { prefix: 'Erro ao atualizar tarefa: ' })).toBe(FALLBACK);
    expect(taskSaveErrorMessage(null)).toBe(FALLBACK);
  });
});
