import { describe, expect, it } from 'vitest';
import { isDoAmbiente, isProjetoDoAmbiente, isTarefaDoAmbiente } from './ambienteScope';

// O ambiente é passado explicitamente nos testes (o default vem do hostname).
const AMBIENTE_POR_CLIENTE = {
  'cli-dev': 'dev',
  'cli-prod': 'prod',
};

describe('isDoAmbiente', () => {
  it('cliente do ambiente passa', () => {
    expect(isDoAmbiente('cli-dev', AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
  });

  it('cliente do outro ambiente sai', () => {
    expect(isDoAmbiente('cli-prod', AMBIENTE_POR_CLIENTE, 'dev')).toBe(false);
  });

  it('sem cliente não há ambiente: passa', () => {
    expect(isDoAmbiente(null, AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
    expect(isDoAmbiente(undefined, AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
    expect(isDoAmbiente('', AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
  });

  it('cliente fora da régua (soft delete, RLS) passa em vez de sumir', () => {
    expect(isDoAmbiente('cli-inexistente', AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
  });
});

describe('isProjetoDoAmbiente', () => {
  it('olha o cliente PSA do projeto', () => {
    expect(isProjetoDoAmbiente({ external_client_id: 'cli-dev' }, AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
    expect(isProjetoDoAmbiente({ external_client_id: 'cli-prod' }, AMBIENTE_POR_CLIENTE, 'dev')).toBe(false);
  });

  it('projeto interno (sem cliente) fica visível nos dois ambientes', () => {
    expect(isProjetoDoAmbiente({ external_client_id: null }, AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
    expect(isProjetoDoAmbiente({ external_client_id: null }, AMBIENTE_POR_CLIENTE, 'prod')).toBe(true);
  });
});

describe('isTarefaDoAmbiente', () => {
  it('exige os dois vínculos no ambiente', () => {
    expect(isTarefaDoAmbiente(
      { client_id: 'cli-dev', project: { external_client_id: 'cli-dev' } },
      AMBIENTE_POR_CLIENTE,
      'dev',
    )).toBe(true);
  });

  it('cliente da tarefa de outro ambiente derruba', () => {
    expect(isTarefaDoAmbiente(
      { client_id: 'cli-prod', project: { external_client_id: 'cli-dev' } },
      AMBIENTE_POR_CLIENTE,
      'dev',
    )).toBe(false);
  });

  it('projeto de outro ambiente derruba, mesmo com a tarefa sem cliente', () => {
    // Senão a tarefa ficaria órfã: o projeto dela não está mais na lista.
    expect(isTarefaDoAmbiente(
      { client_id: null, project: { external_client_id: 'cli-prod' } },
      AMBIENTE_POR_CLIENTE,
      'dev',
    )).toBe(false);
  });

  it('tarefa sem cliente e sem projeto resolvido passa', () => {
    expect(isTarefaDoAmbiente({ client_id: null, project: null }, AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
    expect(isTarefaDoAmbiente({ client_id: null }, AMBIENTE_POR_CLIENTE, 'dev')).toBe(true);
  });
});
