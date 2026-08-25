import { describe, it, expect } from 'vitest';
import { contextoBoardLogs, type EntradaContextoLogs } from './agenteContextoLogs';

const log = (performed_by: string, action: string, entity_type: string, dia: string) => ({
  area: 'tax', entity_type, action, performed_by, performed_at: `${dia}T10:00:00Z`,
});

const base: EntradaContextoLogs = {
  areaLabel: 'Tax + OSG',
  periodoLabel: 'últimos 30 dias',
  janela: { desde: '2026-07-26', ate: '2026-08-25' },
  logs: [
    log('u1', 'updated', 'task', '2026-08-20'),
    log('u1', 'updated', 'task', '2026-08-20'),
    log('u1', 'created', 'project', '2026-08-21'),
    log('u2', 'deleted', 'cliente', '2026-08-21'),
  ],
  nomePorId: { u1: 'Ana' },
  carregando: false,
  falhas: [],
};

const bloco = (ctx: ReturnType<typeof contextoBoardLogs>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardLogs>, id: string, rotulo: string) =>
  bloco(ctx, id)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardLogs', () => {
  it('conta registro, pessoa e DIA com atividade', () => {
    const ctx = contextoBoardLogs(base);
    expect(campo(ctx, 'resumo', 'Registros no período')?.valor).toBe('4');
    expect(campo(ctx, 'resumo', 'Pessoas que registraram algo')?.valor).toBe('2');
    expect(campo(ctx, 'resumo', 'Dias com pelo menos um registro')?.valor).toBe('2');
  });

  it('avisa que contagem de registro NAO e a coluna de produtividade da aba', () => {
    expect(bloco(contextoBoardLogs(base), 'resumo')?.nota)
      .toContain('não é a coluna "processos executados"');
  });

  it('quem nao esta no mapa de nomes vira "nao identificado", nao o uuid', () => {
    const itens = bloco(contextoBoardLogs(base), 'pessoas')?.itens ?? [];
    expect(itens.map((i) => i.pessoa)).toEqual(['Ana', 'não identificado']);
  });

  it('janela aberta diz "todo o historico" em vez de mostrar null cru', () => {
    const ctx = contextoBoardLogs({ ...base, janela: { desde: null, ate: null } });
    expect(campo(ctx, 'resumo', 'Início da janela')?.valor).toBeNull();
    expect(campo(ctx, 'resumo', 'Início da janela')?.nota).toBe('todo o histórico');
    expect(campo(ctx, 'resumo', 'Fim da janela')?.nota).toBe('até agora');
  });

  it('as acoes viram palavra do usuario, nao termo do banco', () => {
    const campos = bloco(contextoBoardLogs(base), 'o_que')?.campos ?? [];
    const rotulos = campos.map((c) => c.rotulo);
    expect(rotulos).toContain('edições');
    expect(rotulos).toContain('criações');
    expect(rotulos).toContain('exclusões');
    expect(rotulos).not.toContain('updated');
  });

  it('acao desconhecida nao some — cai no proprio nome', () => {
    const ctx = contextoBoardLogs({
      ...base, logs: [log('u1', 'restaurou', 'task', '2026-08-20')],
    });
    expect(bloco(ctx, 'o_que')?.campos.map((c) => c.rotulo)).toContain('restaurou');
  });

  it('sem log nenhum, sobra so o resumo — e ele diz zero, nao some', () => {
    const ctx = contextoBoardLogs({ ...base, logs: [] });
    expect(campo(ctx, 'resumo', 'Registros no período')?.valor).toBe('0');
    expect(bloco(ctx, 'pessoas')).toBeUndefined();
    expect(bloco(ctx, 'o_que')).toBeUndefined();
  });
});
