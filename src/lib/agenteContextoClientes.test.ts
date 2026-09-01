import { describe, it, expect } from 'vitest';
import { contextoBoardClientes, type EntradaContextoClientes } from './agenteContextoClientes';
import type { AgregacaoRegiao } from './clientesPorRegiao';

const uf = (sigla: string, nome: string, clientes: number, ativos: number, municipio?: string) => ({
  uf: sigla, nome, valor: clientes, clientes, ativos,
  municipios: municipio
    ? [{ municipio, rotulo: municipio, valor: clientes, clientes, ativos }]
    : [],
});

const agregacao: AgregacaoRegiao = {
  porUf: {
    MT: uf('MT', 'Mato Grosso', 30, 26, 'Cuiabá'),
    SP: uf('SP', 'São Paulo', 12, 10, 'São Paulo'),
  },
  ufsComDado: ['MT', 'SP'],
  semUf: uf('__sem_uf__', 'Sem estado', 4, 3),
  totalClientes: 46,
  totalAtivos: 39,
  totalValor: 0,
};

const base: EntradaContextoClientes = { agregacao, escopoTotal: true, falhas: [] };

const bloco = (ctx: ReturnType<typeof contextoBoardClientes>, id: string) =>
  ctx.blocos.find((b) => b.id === id);
const campo = (ctx: ReturnType<typeof contextoBoardClientes>, id: string, rotulo: string) =>
  bloco(ctx, id)?.campos.find((c) => c.rotulo === rotulo);

describe('contextoBoardClientes', () => {
  it('cliente sem estado NAO some — ele nao cabe no mapa, mas cabe na resposta', () => {
    const ctx = contextoBoardClientes(base);
    const c = campo(ctx, 'carteira', 'Clientes sem estado cadastrado');
    expect(c?.valor).toBe('4');
    expect(c?.nota).toContain('não aparecem no mapa');
  });

  it('sem cliente sem estado, nao inventa nota', () => {
    const ctx = contextoBoardClientes({
      ...base,
      agregacao: { ...agregacao, semUf: uf('__sem_uf__', 'Sem estado', 0, 0) },
    });
    expect(campo(ctx, 'carteira', 'Clientes sem estado cadastrado')?.nota).toBeUndefined();
  });

  it('quem nao e admin ve o aviso de escopo, e o admin nao', () => {
    expect(bloco(contextoBoardClientes({ ...base, escopoTotal: false }), 'carteira')?.nota)
      .toContain('não é o total da empresa');
    expect(bloco(contextoBoardClientes(base), 'carteira')?.nota).toBeUndefined();
    expect(contextoBoardClientes({ ...base, escopoTotal: false }).filtros.escopo)
      .toBe('somente os clientes do seu acesso');
  });

  it('a fatia usa o total da carteira, nao a soma dos estados listados', () => {
    // MT tem 30 de 46 no total (65,2%), nao 30 de 42 (os dois estados).
    const itens = bloco(contextoBoardClientes(base), 'estados')?.itens ?? [];
    expect(itens[0]).toMatchObject({ estado: 'Mato Grosso (MT)', clientes: 30, fatia: '65,2%' });
  });

  it('carteira vazia nao divide por zero nem desenha bloco de estados', () => {
    const vazia: AgregacaoRegiao = {
      porUf: {}, ufsComDado: [], semUf: uf('__sem_uf__', 'Sem estado', 0, 0),
      totalClientes: 0, totalAtivos: 0, totalValor: 0,
    };
    const ctx = contextoBoardClientes({ ...base, agregacao: vazia });
    expect(campo(ctx, 'carteira', 'Clientes ativos')?.nota).toBeUndefined();
    expect(bloco(ctx, 'estados')).toBeUndefined();
  });

  it('estado sem municipio cadastrado devolve null, nao string vazia', () => {
    const itens = bloco(contextoBoardClientes({
      ...base,
      agregacao: { ...agregacao, porUf: { MT: uf('MT', 'Mato Grosso', 30, 26) }, ufsComDado: ['MT'] },
    }), 'estados')?.itens ?? [];
    expect(itens[0].maior_municipio).toBeNull();
  });

  it('concentração entra na frente quando a tela a desenha', () => {
    const ctx = contextoBoardClientes({
      ...base,
      concentracao: {
        total: 1_000_000,
        clientes: 4,
        top: [
          { cliente_id: 'a', nome: 'Alfa', receita: 600_000, share: 0.6, acumulado: 0.6 },
        ],
        shareTop1: 0.6,
        shareTop5: 1,
        clientesParaMetade: 1,
      },
      ticket: 250_000,
    });
    expect(ctx.blocos[0]?.id).toBe('concentracao');
    expect(campo(ctx, 'concentracao', 'Metade do contratado')?.valor).toBe('1');
    expect(campo(ctx, 'concentracao', 'Ticket médio')?.valor).toBe('R$ 250 mil');
  });

  it('falha vira aviso', () => {
    expect(contextoBoardClientes({ ...base, falhas: ['distribuição de clientes'] }).avisos)
      .toEqual(['falha ao carregar: distribuição de clientes']);
    expect(contextoBoardClientes(base).avisos).toBeUndefined();
  });
});
