import { describe, it, expect } from 'vitest';
import { contextoBoardCapacidade, type EntradaContextoCapacidade } from './agenteContextoCapacidade';

const base: EntradaContextoCapacidade = {
  escopoArea: 'todas',
  filtrosAtivos: 0,
  metrics: {
    totalProjects: 119, activeProjects: 115, completedProjects: 3, onHoldProjects: 1,
    totalTasks: 640, doneTasks: 412, completionRate: 64,
    totalEstHours: 3489.5, overdueCount: 55,
  },
  atrasadas: [
    { title: 'Levantar créditos PIS', project: 'Recuperação', client: 'Alfa', responsible: 'Ana', dueDate: '2026-05-02', daysOverdue: 115 },
    { title: 'Conferir SPED', project: 'Auditoria', client: 'Beta', responsible: 'Bruno', dueDate: '2026-07-10', daysOverdue: 46 },
  ],
  membros: [
    { name: 'Ana', active: 21, hours: 180.5, overdue: 9 },
    { name: 'Bruno', active: 8, hours: 60, overdue: 1 },
  ],
  topClientes: [{ name: 'Alfa', hours: 320 }, { name: 'Beta', hours: 110 }],
  carregando: false,
};

const bloco = (ctx: ReturnType<typeof contextoBoardCapacidade>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardCapacidade>, id: string, rotulo: string) =>
  bloco(ctx, id)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardCapacidade', () => {
  it('nomeia QUEM e O QUE na fila de atraso — e a pergunta desta tela', () => {
    const ctx = contextoBoardCapacidade(base);
    const c = campo(ctx, 'atrasadas', 'Atraso máximo');
    expect(c?.valor).toBe('115 dias');
    expect(c?.nota).toBe('Levantar créditos PIS · Ana');
    expect(bloco(ctx, 'atrasadas')?.itens?.[0]).toMatchObject({
      tarefa: 'Levantar créditos PIS', responsavel: 'Ana', dias_de_atraso: 115,
    });
  });

  it('diz que a hora e ESTIMADA, nao apontada', () => {
    expect(bloco(contextoBoardCapacidade(base), 'carga')?.nota).toContain('ESTIMADAS');
    expect(campo(contextoBoardCapacidade(base), 'carga', 'Horas estimadas em aberto')?.valor)
      .toBe('3.489,5 h');
  });

  it('sem atraso, sem membro e sem cliente, os blocos nao entram vazios', () => {
    const ctx = contextoBoardCapacidade({
      ...base, atrasadas: [], membros: [], topClientes: [],
    });
    expect(bloco(ctx, 'atrasadas')).toBeUndefined();
    expect(bloco(ctx, 'membros')).toBeUndefined();
    expect(bloco(ctx, 'clientes_horas')).toBeUndefined();
    // A carga continua: zero atrasada e uma resposta, nao ausencia de dado.
    expect(bloco(ctx, 'carga')).toBeDefined();
  });

  it('a maior carga sai por HORAS, nao por numero de tarefas', () => {
    const ctx = contextoBoardCapacidade({
      ...base,
      membros: [
        { name: 'Ana', active: 30, hours: 40, overdue: 0 },
        { name: 'Bruno', active: 3, hours: 200, overdue: 0 },
      ],
    });
    expect(campo(ctx, 'membros', 'Maior carga de horas')?.valor).toBe('Bruno · 200 h');
  });

  it('o consolidado se identifica como Tax + OSG', () => {
    expect(contextoBoardCapacidade(base).filtros['área']).toBe('Tax + OSG (consolidado)');
    expect(contextoBoardCapacidade({ ...base, escopoArea: 'osg' }).filtros['área']).toBe('osg');
  });

  it('a fila longa e cortada em 10, e nao mente sobre o total', () => {
    const muitas = Array.from({ length: 40 }, (_, i) => ({
      title: `T${i}`, project: 'P', client: 'C', responsible: 'R',
      dueDate: '2026-01-01', daysOverdue: 40 - i,
    }));
    const ctx = contextoBoardCapacidade({ ...base, atrasadas: muitas });
    expect(bloco(ctx, 'atrasadas')?.itens).toHaveLength(10);
    expect(campo(ctx, 'atrasadas', 'Tarefas atrasadas')?.valor).toBe('40');
  });
});
