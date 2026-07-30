import { describe, it, expect } from 'vitest';
import {
  agregarPendencias,
  buildPendenciasCsv,
  destinoPendencia,
  MOTIVO_COMO_RESOLVER,
  MOTIVO_LABELS,
  MOTIVOS_POR_SEVERIDADE,
  type EntradaPendencias,
  type LinhaPendencia,
} from './auditPendencias';
import type { AuditLog } from '@/hooks/useDomainAuditLogs';

function log(over: Partial<AuditLog>): AuditLog {
  return {
    id: crypto.randomUUID(),
    area: 'tax',
    entity_type: 'task',
    entity_id: 't1',
    entity_name: 'Apurar ICMS',
    action: 'updated',
    changed_fields: null,
    performed_by: 'u1',
    performed_at: '2026-07-20T10:00:00.000Z',
    details: null,
    ...over,
  };
}

/** Entrada em que t1 está 100% resolvida — cada teste quebra só o elo que quer. */
function entrada(over: Partial<EntradaPendencias> = {}): EntradaPendencias {
  return {
    logs: [log({})],
    existePorId: { t1: true, p1: true },
    clientePorId: { t1: 'cli-1', p1: 'cli-1' },
    servicoPorId: { t1: 'serv-1', p1: 'serv-1' },
    osPorId: { t1: 'os-1', p1: 'os-1' },
    produtoPorId: { t1: 'prod-1', p1: 'prod-1' },
    projetoPorItem: { t1: 'p1' },
    produtosPorOs: { 'os-1': ['prod-1'] },
    nomePorCliente: { 'cli-1': 'Fazenda Horizonte' },
    nomePorProjeto: { p1: 'Recuperação de crédito' },
    nomePorPessoa: { u1: 'Maria Silva' },
    ...over,
  };
}

describe('agregarPendencias', () => {
  it('não lista item com cliente, OS e produto resolvidos', () => {
    const { linhas, resumo } = agregarPendencias(entrada());

    expect(linhas).toEqual([]);
    expect(resumo.total).toBe(0);
    // O denominador continua contando o item avaliado.
    expect(resumo.itensAvaliados).toBe(1);
  });

  it('acusa tarefa fora de projeto', () => {
    const { linhas } = agregarPendencias(entrada({ projetoPorItem: {} }));

    expect(linhas[0].motivo).toBe('sem_projeto');
    expect(linhas[0].projetoNome).toBeNull();
  });

  it('acusa item sem cliente resolvido', () => {
    const { linhas } = agregarPendencias(entrada({ clientePorId: {} }));

    expect(linhas[0].motivo).toBe('sem_cliente');
    expect(linhas[0].clienteNome).toBeNull();
  });

  it('acusa projeto sem OS quando o produto não fechou', () => {
    const { linhas } = agregarPendencias(entrada({ produtoPorId: {}, osPorId: {} }));
    expect(linhas[0].motivo).toBe('sem_os');
  });

  it('acusa OS sem produto contratado', () => {
    const { linhas } = agregarPendencias(entrada({ produtoPorId: {}, produtosPorOs: {} }));
    expect(linhas[0].motivo).toBe('os_sem_produto');
  });

  it('acusa serviço não informado quando a OS tem mais de um produto', () => {
    const { linhas } = agregarPendencias(entrada({
      produtoPorId: {},
      servicoPorId: {},
      produtosPorOs: { 'os-1': ['prod-1', 'prod-2'] },
    }));

    expect(linhas[0].motivo).toBe('sem_servico');
  });

  it('acusa serviço que não pertence a nenhum produto da OS', () => {
    const { linhas } = agregarPendencias(entrada({
      produtoPorId: {},
      servicoPorId: { t1: 'serv-de-outra-os' },
      produtosPorOs: { 'os-1': ['prod-1', 'prod-2'] },
    }));

    expect(linhas[0].motivo).toBe('servico_fora_da_os');
  });

  it('ignora log de item que não existe mais', () => {
    const { linhas, resumo } = agregarPendencias(entrada({
      logs: [log({ entity_id: 'apagada' })],
      existePorId: {},
    }));

    expect(linhas).toEqual([]);
    expect(resumo.itensAvaliados).toBe(0);
  });

  it('lista o item uma vez só, com o nome e a pessoa do toque mais recente', () => {
    const { linhas, resumo } = agregarPendencias(entrada({
      logs: [
        log({ entity_name: 'Nome antigo', performed_by: 'u2', performed_at: '2026-07-18T10:00:00.000Z' }),
        log({ entity_name: 'Nome novo', performed_by: 'u1', performed_at: '2026-07-22T10:00:00.000Z' }),
        log({ entity_name: 'Nome do meio', performed_by: 'u2', performed_at: '2026-07-19T10:00:00.000Z' }),
      ],
      clientePorId: {},
      nomePorPessoa: { u1: 'Maria Silva', u2: 'Bruno Souza' },
    }));

    expect(resumo.total).toBe(1);
    expect(linhas[0].nome).toBe('Nome novo');
    expect(linhas[0].ultimoToquePor).toBe('Maria Silva');
    expect(linhas[0].ultimoToqueEm).toBe('2026-07-22T10:00:00.000Z');
  });

  it('trata projeto sem exigir projeto pai', () => {
    const { linhas } = agregarPendencias(entrada({
      logs: [log({ entity_type: 'project', entity_id: 'p1' })],
      produtoPorId: {},
      osPorId: {},
    }));

    // Projeto não cai em 'sem_projeto' por não ter pai — o motivo é a OS.
    expect(linhas[0].motivo).toBe('sem_os');
    expect(linhas[0].projetoNome).toBeNull();
  });

  it('ordena por severidade e, dentro dela, do toque mais recente', () => {
    const { linhas } = agregarPendencias(entrada({
      logs: [
        log({ entity_id: 'a', performed_at: '2026-07-20T10:00:00.000Z' }),
        log({ entity_id: 'b', performed_at: '2026-07-21T10:00:00.000Z' }),
        log({ entity_id: 'c', performed_at: '2026-07-22T10:00:00.000Z' }),
      ],
      existePorId: { a: true, b: true, c: true },
      projetoPorItem: { b: 'p1', c: 'p1' },
      clientePorId: { c: 'cli-1' },
      produtoPorId: {},
      osPorId: { c: 'os-1' },
      produtosPorOs: {},
    }));

    // a = sem_projeto (mais grave), b = sem_cliente, c = os_sem_produto.
    expect(linhas.map(l => l.itemId)).toEqual(['a', 'b', 'c']);
  });

  it('conta por motivo para alimentar o filtro', () => {
    const { resumo } = agregarPendencias(entrada({
      logs: [
        log({ entity_id: 'a' }),
        log({ entity_id: 'b' }),
      ],
      existePorId: { a: true, b: true },
      projetoPorItem: { b: 'p1' },
      clientePorId: { b: 'cli-1' },
    }));

    // 'a' está fora de projeto; 'b' tem projeto e cliente, mas o projeto não tem
    // OS — cada um cai no seu motivo, e o total é a soma deles.
    expect(resumo.porMotivo.sem_projeto).toBe(1);
    expect(resumo.porMotivo.sem_os).toBe(1);
    expect(resumo.porMotivo.sem_cliente).toBe(0);
    expect(resumo.total).toBe(2);
    expect(resumo.itensAvaliados).toBe(2);
  });

  it('avisa quando o nome do projeto ou do cliente não está no alcance', () => {
    const { linhas } = agregarPendencias(entrada({
      produtoPorId: {},
      osPorId: {},
      nomePorProjeto: {},
      nomePorCliente: {},
    }));

    expect(linhas[0].projetoNome).toBe('Projeto fora do alcance');
    expect(linhas[0].clienteNome).toBe('Cliente fora do alcance');
  });

  it('cai para Desconhecido e Sem nome em vez de mostrar vazio', () => {
    const { linhas } = agregarPendencias(entrada({
      logs: [log({ entity_name: '   ', performed_by: 'fantasma' })],
      clientePorId: {},
    }));

    expect(linhas[0].nome).toBe('Sem nome');
    expect(linhas[0].ultimoToquePor).toBe('Desconhecido');
  });

  it('devolve fila vazia sem logs', () => {
    const { linhas, resumo } = agregarPendencias(entrada({ logs: [] }));
    expect(linhas).toEqual([]);
    expect(resumo.itensAvaliados).toBe(0);
  });
});

describe('destinoPendencia', () => {
  function linha(over: Partial<LinhaPendencia>): LinhaPendencia {
    return {
      itemId: 't1',
      tipo: 'task',
      nome: 'Apurar ICMS',
      projetoId: 'p1',
      projetoNome: 'Recuperação de crédito',
      clienteNome: 'Fazenda Horizonte',
      motivo: 'sem_os',
      ultimoToqueEm: '2026-07-20T10:00:00.000Z',
      ultimoToquePor: 'Maria Silva',
      ...over,
    };
  }

  it('manda para a tarefa quando o campo que falta é da tarefa', () => {
    for (const motivo of ['sem_projeto', 'sem_cliente'] as const) {
      const destino = destinoPendencia(linha({ motivo, projetoId: motivo === 'sem_projeto' ? null : 'p1' }), 'tax');
      expect(destino.rota).toBe('/equipe/tax/projetos/tarefas?taskId=t1');
      expect(destino.curto).toBe('Tarefa');
    }
  });

  it('manda para o projeto quando o campo que falta é do projeto', () => {
    for (const motivo of ['sem_os', 'sem_servico', 'servico_fora_da_os'] as const) {
      const destino = destinoPendencia(linha({ motivo }), 'tax');
      expect(destino.rota).toBe('/equipe/tax/projetos/tarefas?projectId=p1');
      expect(destino.curto).toBe('Projeto');
    }
  });

  it('usa o próprio id quando a linha é de projeto', () => {
    const destino = destinoPendencia(linha({ tipo: 'project', itemId: 'p9', projetoId: null }), 'osg');
    expect(destino.rota).toBe('/equipe/osg/projetos/tarefas?projectId=p9');
  });

  it('manda projeto sem cliente para o cadastro do projeto, não para a tarefa', () => {
    const destino = destinoPendencia(
      linha({ tipo: 'project', itemId: 'p9', projetoId: null, motivo: 'sem_cliente' }),
      'tax',
    );
    expect(destino.rota).toBe('/equipe/tax/projetos/tarefas?projectId=p9');
  });

  it('manda produto contratado para o cadastro de Clientes, onde a OS vive', () => {
    const destino = destinoPendencia(linha({ motivo: 'os_sem_produto' }), 'osg');
    expect(destino.rota).toBe('/equipe/osg/projetos/clientes');
    expect(destino.curto).toBe('Clientes');
  });

  it('cai na tarefa quando não há projeto para abrir', () => {
    const destino = destinoPendencia(linha({ motivo: 'sem_servico', projetoId: null }), 'tax');
    expect(destino.rota).toBe('/equipe/tax/projetos/tarefas?taskId=t1');
  });

  it('respeita a área na rota', () => {
    expect(destinoPendencia(linha({}), 'osg').rota).toContain('/equipe/osg/');
  });
});

describe('rótulos dos motivos', () => {
  it('tem label e como resolver para todo motivo da severidade', () => {
    for (const motivo of MOTIVOS_POR_SEVERIDADE) {
      expect(MOTIVO_LABELS[motivo]).toBeTruthy();
      expect(MOTIVO_COMO_RESOLVER[motivo]).toBeTruthy();
    }
  });
});

describe('buildPendenciasCsv', () => {
  it('gera cabeçalho e linha com o motivo e o como resolver', () => {
    const { linhas } = agregarPendencias(entrada({ clientePorId: {} }));
    const csv = buildPendenciasCsv(linhas).split('\n');

    expect(csv[0]).toBe(
      'item;tipo;projeto;cliente;o_que_falta;como_resolver;ultimo_toque_por;ultimo_toque_em',
    );
    expect(csv[1]).toContain('Apurar ICMS;task;Recuperação de crédito;;Sem cliente;');
    expect(csv[1]).toContain(';Maria Silva;2026-07-20T10:00:00.000Z');
  });

  it('escapa texto com ponto-e-vírgula', () => {
    const { linhas } = agregarPendencias(entrada({
      logs: [log({ entity_name: 'Apurar; conferir' })],
      clientePorId: {},
    }));

    expect(buildPendenciasCsv(linhas)).toContain('"Apurar; conferir"');
  });

  it('gera só o cabeçalho quando a fila está vazia', () => {
    expect(buildPendenciasCsv([]).split('\n')).toHaveLength(1);
  });
});
