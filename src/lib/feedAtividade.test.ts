import { describe, expect, it } from 'vitest';

import {
  agruparAtividadePorCliente,
  aplicarLeituraDaSessao,
  carimbosPorProjeto,
  CLIENTE_SEM_CADASTRO,
  consolidarCarimbos,
  contarNovos,
  ehNaoLida,
  NOME_SEM_CLIENTE,
  partirPorNovidade,
  podeCarimbar,
  rotuloDeAtualizacoes,
  rotuloDeNovas,
  type LinhaDeAtividade,
} from '@/lib/feedAtividade';
import { FILTROS_VAZIOS } from '@/lib/feedFiltros';

const linha = (parcial: Partial<LinhaDeAtividade>): LinhaDeAtividade => ({
  client_id: 'cli-1',
  client_nome: 'Cliente Um',
  project_id: 'proj-1',
  project_name: 'Projeto Um',
  total: 1,
  novos: 0,
  ultimo_em: '2026-09-22T10:00:00.000Z',
  visto_ate: '2026-09-15T00:00:00.000Z',
  ...parcial,
});

describe('agruparAtividadePorCliente', () => {
  it('soma os projetos do mesmo cliente', () => {
    const [cliente] = agruparAtividadePorCliente([
      linha({ project_id: 'p1', total: 2, novos: 1, ultimo_em: '2026-09-20T10:00:00.000Z' }),
      linha({ project_id: 'p2', total: 3, novos: 2, ultimo_em: '2026-09-22T10:00:00.000Z' }),
    ]);

    expect(cliente.total).toBe(5);
    expect(cliente.novos).toBe(3);
    expect(cliente.projetos).toHaveLength(2);
    // O último movimento do cliente é o mais recente entre os projetos.
    expect(cliente.ultimoEm).toBe('2026-09-22T10:00:00.000Z');
  });

  it('ordena clientes e projetos pelo movimento mais recente, não pela contagem', () => {
    const clientes = agruparAtividadePorCliente([
      linha({ client_id: 'a', project_id: 'a1', total: 30, ultimo_em: '2026-09-10T00:00:00.000Z' }),
      linha({ client_id: 'b', project_id: 'b1', total: 1, ultimo_em: '2026-09-22T00:00:00.000Z' }),
      linha({ client_id: 'b', project_id: 'b2', total: 9, ultimo_em: '2026-09-21T00:00:00.000Z' }),
    ]);

    expect(clientes.map((cliente) => cliente.clienteId)).toEqual(['b', 'a']);
    expect(clientes[0].projetos.map((projeto) => projeto.projetoId)).toEqual(['b1', 'b2']);
  });

  it('dá nome ao balde da sentinela e ao cliente que a RLS escondeu', () => {
    const clientes = agruparAtividadePorCliente([
      linha({ client_id: CLIENTE_SEM_CADASTRO, client_nome: null, project_id: 'p1' }),
      linha({ client_id: 'oculto', client_nome: null, project_id: 'p2' }),
    ]);

    const nomes = clientes.map((cliente) => cliente.nome);
    expect(nomes).toContain(NOME_SEM_CLIENTE);
    expect(nomes).toContain('Cliente sem nome');
  });

  it('projeto sem nome não vira linha em branco', () => {
    const [cliente] = agruparAtividadePorCliente([linha({ project_name: null })]);
    expect(cliente.projetos[0].nome).toBe('Projeto sem nome');
  });
});

describe('partirPorNovidade', () => {
  it('separa quem tem fala não lida de quem só tem movimento', () => {
    const clientes = agruparAtividadePorCliente([
      linha({ client_id: 'a', project_id: 'a1', novos: 2 }),
      linha({ client_id: 'b', project_id: 'b1', novos: 0 }),
    ]);

    const { novidade, resto } = partirPorNovidade(clientes);
    expect(novidade.map((cliente) => cliente.clienteId)).toEqual(['a']);
    expect(resto.map((cliente) => cliente.clienteId)).toEqual(['b']);
    expect(contarNovos(clientes)).toBe(2);
  });
});

describe('aplicarLeituraDaSessao', () => {
  const clientes = agruparAtividadePorCliente([
    linha({ client_id: 'a', project_id: 'a1', novos: 2, total: 5 }),
    linha({ client_id: 'a', project_id: 'a2', novos: 3, total: 4 }),
    linha({ client_id: 'b', project_id: 'b1', novos: 1, total: 1 }),
  ]);

  it('desconta só o projeto lido, e o resto do cliente continua esperando', () => {
    const [clienteA] = aplicarLeituraDaSessao(clientes, new Set(['a1']));

    expect(clienteA.novosAgora).toBe(3);
    // O número do RETRATO não muda: é dele que sai o balde e a ordem.
    expect(clienteA.novos).toBe(5);
    expect(clienteA.projetos.find((projeto) => projeto.projetoId === 'a1')?.novosAgora).toBe(0);
    expect(clienteA.projetos.find((projeto) => projeto.projetoId === 'a2')?.novosAgora).toBe(3);
  });

  it('cliente lido inteiro zera o contador sem sair do balde de novidade', () => {
    const lidos = aplicarLeituraDaSessao(clientes, new Set(['a1', 'a2']));
    const clienteA = lidos.find((cliente) => cliente.clienteId === 'a')!;

    expect(clienteA.novosAgora).toBe(0);
    expect(contarNovos(lidos)).toBe(1);
    // A linha fica onde está: o balde continua saindo de `novos`.
    expect(partirPorNovidade(lidos).novidade.map((cliente) => cliente.clienteId)).toEqual([
      'a',
      'b',
    ]);
  });

  it('sem leitura na sessão, devolve o que entrou', () => {
    expect(aplicarLeituraDaSessao(clientes, new Set())).toBe(clientes);
  });

  it('projeto lido de outro recorte não mexe em quem não é dele', () => {
    const lidos = aplicarLeituraDaSessao(clientes, new Set(['desconhecido']));
    expect(contarNovos(lidos)).toBe(6);
  });
});

describe('carimbosPorProjeto', () => {
  it('leva o cliente e o carimbo para o lado do stream, que só conhece o projeto', () => {
    const mapa = carimbosPorProjeto([
      linha({ project_id: 'p1', client_id: 'cli-9', visto_ate: '2026-09-15T00:00:00.000Z' }),
    ]);

    expect(mapa.get('p1')).toEqual({ clienteId: 'cli-9', vistoAte: '2026-09-15T00:00:00.000Z' });
    expect(mapa.get('p-fora-da-janela')).toBeUndefined();
  });
});

describe('ehNaoLida', () => {
  const visto = '2026-09-15T00:00:00.000Z';

  it('é nova quando veio depois do carimbo e é de outra pessoa', () => {
    expect(
      ehNaoLida({ created_at: '2026-09-20T00:00:00.000Z', author_id: 'outra' }, visto, 'eu'),
    ).toBe(true);
  });

  it('a minha própria fala nunca é novidade para mim', () => {
    expect(
      ehNaoLida({ created_at: '2026-09-20T00:00:00.000Z', author_id: 'eu' }, visto, 'eu'),
    ).toBe(false);
  });

  it('fala anterior ao carimbo já foi lida', () => {
    expect(
      ehNaoLida({ created_at: '2026-09-01T00:00:00.000Z', author_id: 'outra' }, visto, 'eu'),
    ).toBe(false);
  });

  it('projeto fora da janela da barra conta como lido, não como novidade', () => {
    expect(
      ehNaoLida({ created_at: '2026-09-20T00:00:00.000Z', author_id: 'outra' }, undefined, 'eu'),
    ).toBe(false);
  });
});

describe('podeCarimbar', () => {
  it('carimba o feed do dia, com ou sem filtro de cliente', () => {
    expect(podeCarimbar(FILTROS_VAZIOS)).toBe(true);
    expect(podeCarimbar({ ...FILTROS_VAZIOS, clienteId: 'cli-1' })).toBe(true);
    expect(podeCarimbar({ ...FILTROS_VAZIOS, projetoId: 'p1', apenasMencoes: true })).toBe(true);
  });

  it('não carimba quem está procurando coisa velha', () => {
    expect(podeCarimbar({ ...FILTROS_VAZIOS, busca: 'balancete' })).toBe(false);
    expect(podeCarimbar({ ...FILTROS_VAZIOS, periodo: '30d' })).toBe(false);
    expect(podeCarimbar({ ...FILTROS_VAZIOS, apenasAnexos: true })).toBe(false);
  });

  it('espaço solto no campo de busca não desliga o carimbo', () => {
    expect(podeCarimbar({ ...FILTROS_VAZIOS, busca: '   ' })).toBe(true);
  });
});

describe('consolidarCarimbos', () => {
  const carimbos = carimbosPorProjeto([
    linha({ project_id: 'p1', client_id: 'cli-1' }),
    linha({ project_id: 'p2', client_id: 'cli-1' }),
    linha({ project_id: 'p3', client_id: 'cli-2' }),
  ]);

  it('manda um carimbo por cliente, com o instante mais alto dos blocos lidos', () => {
    const porCliente = consolidarCarimbos(
      [
        { projetoId: 'p1', ate: '2026-09-20T00:00:00.000Z' },
        { projetoId: 'p2', ate: '2026-09-22T00:00:00.000Z' },
        { projetoId: 'p3', ate: '2026-09-19T00:00:00.000Z' },
      ],
      carimbos,
    );

    expect(porCliente.get('cli-1')).toBe('2026-09-22T00:00:00.000Z');
    expect(porCliente.get('cli-2')).toBe('2026-09-19T00:00:00.000Z');
  });

  it('ignora bloco de projeto que a barra não conhece', () => {
    const porCliente = consolidarCarimbos(
      [{ projetoId: 'desconhecido', ate: '2026-09-22T00:00:00.000Z' }],
      carimbos,
    );
    expect(porCliente.size).toBe(0);
  });
});

describe('rótulos', () => {
  it('concorda em número', () => {
    expect(rotuloDeAtualizacoes(1)).toBe('1 atualização');
    expect(rotuloDeAtualizacoes(12)).toBe('12 atualizações');
    expect(rotuloDeNovas(1)).toBe('1 nova');
    expect(rotuloDeNovas(3)).toBe('3 novas');
  });
});
