import { describe, it, expect } from 'vitest';
import { contextoBoardClientes, type EntradaContextoClientes } from './agenteContextoClientes';

const base: EntradaContextoClientes = {
  escopoTotal: true,
  ticket: 250_000,
  regioes: [
    { chave: 'MT', rotulo: 'Mato Grosso', clientes: 30, ativos: 26, os: 40, ticket: 200_000, contratado: 6_000_000 },
    { chave: 'sem_regiao', rotulo: 'Sem região', clientes: 4, ativos: 3, os: 2, ticket: null, contratado: 0 },
  ],
  servicos: [
    { chave: 's1', rotulo: 'ITCMD', os: 20, clientes: 18, ticket: 180_000, contratado: 3_600_000 },
    { chave: 'sem_servico', rotulo: 'Sem serviço', os: 5, clientes: 5, ticket: 10_000, contratado: 50_000 },
  ],
  lacunas: [
    {
      cliente_id: 'c', cliente_nome: 'Gama', rotuloRegiao: 'Mato Grosso',
      servico: 's1', rotuloServico: 'ITCMD', ocorreNaRegiao: 18, clientesNaRegiao: 30,
    },
  ],
  falhas: [],
};

const bloco = (ctx: ReturnType<typeof contextoBoardClientes>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardClientes>, id: string, rotulo: string) =>
  bloco(ctx, id)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardClientes', () => {
  it('serviço sem cadastro não some — e não entra como produto', () => {
    const ctx = contextoBoardClientes(base);
    expect(bloco(ctx, 'servicos')?.nota).toContain('5 OS sem serviço');
    expect(bloco(ctx, 'servicos')?.itens?.some((i) => i.servico === 'Sem serviço')).toBe(false);
  });

  it('cliente sem região não some', () => {
    const c = campo(contextoBoardClientes(base), 'regioes', 'Clientes sem região');
    expect(c?.valor).toBe('4');
    expect(c?.nota).toContain('não somem');
  });

  it('quem não é admin vê o aviso de escopo', () => {
    expect(bloco(contextoBoardClientes({ ...base, escopoTotal: false }), 'regioes')?.nota)
      .toContain('não é o total da empresa');
    expect(contextoBoardClientes({ ...base, escopoTotal: false }).filtros.escopo)
      .toBe('somente os clientes do seu acesso');
  });

  it('ticket nulo continua nulo', () => {
    expect(campo(contextoBoardClientes({ ...base, ticket: null }), 'servicos', 'Ticket médio da carteira')?.valor)
      .toBeNull();
  });

  it('lacuna de aditivo nomeia cliente, praça e serviço', () => {
    const itens = bloco(contextoBoardClientes(base), 'aditivo')?.itens ?? [];
    expect(itens[0]).toMatchObject({ cliente: 'Gama', servico: 'ITCMD', regiao: 'Mato Grosso' });
  });

  it('falha vira aviso', () => {
    expect(contextoBoardClientes({ ...base, falhas: ['contratos e clientes'] }).avisos)
      .toEqual(['falha ao carregar: contratos e clientes']);
  });
});
