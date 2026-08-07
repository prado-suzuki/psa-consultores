import { describe, expect, it } from 'vitest';
import {
  AVISO_CHAMADO_ENCERRADO_CLIENTE,
  DIAS_ATE_FECHAMENTO_AUTOMATICO,
  TOOLTIP_FECHADO_INDISPONIVEL,
  clientePodeResponder,
  equipePodeSelecionarStatus,
  isChamadoEncerrado,
  isJanelaDeAceite,
} from './chamadosStatus';

const TODOS_OS_STATUS = ['aberto', 'em_andamento', 'resolvido', 'fechado'];

describe('isChamadoEncerrado', () => {
  it('só `fechado` é terminal', () => {
    expect(isChamadoEncerrado('fechado')).toBe(true);
    expect(isChamadoEncerrado('resolvido')).toBe(false);
    expect(isChamadoEncerrado('aberto')).toBe(false);
    expect(isChamadoEncerrado('em_andamento')).toBe(false);
  });

  it('tolera nulo e desconhecido sem encerrar por acidente', () => {
    expect(isChamadoEncerrado(null)).toBe(false);
    expect(isChamadoEncerrado(undefined)).toBe(false);
    expect(isChamadoEncerrado('')).toBe(false);
    expect(isChamadoEncerrado('status_novo_qualquer')).toBe(false);
  });
});

describe('clientePodeResponder', () => {
  it('libera a janela de aceite — é o ponto do desenho', () => {
    // Em `resolvido` o cliente TEM que poder contestar; são os 3 dias dele.
    expect(clientePodeResponder('resolvido')).toBe(true);
  });

  it('bloqueia apenas em fechado', () => {
    expect(clientePodeResponder('fechado')).toBe(false);
    for (const status of TODOS_OS_STATUS.filter((s) => s !== 'fechado')) {
      expect(clientePodeResponder(status)).toBe(true);
    }
  });
});

describe('equipePodeSelecionarStatus', () => {
  it('a equipe escolhe tudo, menos fechado', () => {
    expect(equipePodeSelecionarStatus('aberto')).toBe(true);
    expect(equipePodeSelecionarStatus('em_andamento')).toBe(true);
    expect(equipePodeSelecionarStatus('resolvido')).toBe(true);
    expect(equipePodeSelecionarStatus('fechado')).toBe(false);
  });

  it('reabrir continua possível: sair de fechado não é bloqueado', () => {
    // O bloqueio é sobre ESCOLHER fechado, não sobre transicionar para fora.
    expect(equipePodeSelecionarStatus('em_andamento')).toBe(true);
  });
});

describe('isJanelaDeAceite', () => {
  it('vale só para resolvido', () => {
    expect(isJanelaDeAceite('resolvido')).toBe(true);
    expect(isJanelaDeAceite('fechado')).toBe(false);
    expect(isJanelaDeAceite('em_andamento')).toBe(false);
    expect(isJanelaDeAceite(null)).toBe(false);
  });
});

describe('textos', () => {
  it('o aviso ao cliente não usa termo interno nem afirma fechamento automático', () => {
    const texto = `${AVISO_CHAMADO_ENCERRADO_CLIENTE.titulo} ${AVISO_CHAMADO_ENCERRADO_CLIENTE.descricao}`;
    expect(texto).not.toMatch(/autom[áa]tic|3 dias|resolvido|status|RLS|trigger/i);
    expect(AVISO_CHAMADO_ENCERRADO_CLIENTE.descricao).toMatch(/novo chamado/i);
    expect(AVISO_CHAMADO_ENCERRADO_CLIENTE.descricao).toMatch(/\.$/);
  });

  it('o tooltip da equipe explica a regra e cita o prazo real', () => {
    expect(TOOLTIP_FECHADO_INDISPONIVEL).toContain(String(DIAS_ATE_FECHAMENTO_AUTOMATICO));
    expect(TOOLTIP_FECHADO_INDISPONIVEL).toMatch(/autom[áa]tic/i);
    expect(TOOLTIP_FECHADO_INDISPONIVEL).toMatch(/Resolvido/);
  });

  it('o prazo é 3 dias, espelhando a função do banco', () => {
    expect(DIAS_ATE_FECHAMENTO_AUTOMATICO).toBe(3);
  });
});
