import { describe, it, expect } from 'vitest';
import {
  agregarClientePorProduto,
  agregarPessoaPorProduto,
  agregarPorProduto,
  agregarProdutividade,
  agregarProdutoPorPessoa,
  buildProdutividadeCsv,
  buildProdutosCsv,
  CLIENTE_SEM_VINCULO,
  COLUNAS_POR_VISAO,
  direcaoInicial,
  formatarHoras,
  idsConcluidos,
  idsTocados,
  ORDENACAO_INICIAL,
  ordenarProdutividade,
  PRODUTO_SEM_VINCULO,
  resolverProdutoContratado,
  resolverVinculos,
  resumirProdutividade,
  TODAS_AS_COLUNAS,
  type LinhaProdutividade,
} from './auditProdutividade';
import type { AuditLog } from '@/hooks/useDomainAuditLogs';

function log(over: Partial<AuditLog>): AuditLog {
  return {
    id: crypto.randomUUID(),
    area: 'osg',
    entity_type: 'task',
    entity_id: 'ent-1',
    entity_name: 'Tarefa',
    action: 'updated',
    changed_fields: null,
    performed_by: 'u1',
    performed_at: '2026-07-20T10:00:00.000Z',
    details: null,
    ...over,
  };
}

const NOMES = { u1: 'Maria Silva', u2: 'Bruno Souza' };

describe('agregarProdutividade', () => {
  it('conta ações por tipo, itens distintos e dias ativos por colaborador', () => {
    const linhas = agregarProdutividade([
      log({ performed_by: 'u1', action: 'created', entity_id: 'a', performed_at: '2026-07-20T10:00:00.000Z' }),
      log({ performed_by: 'u1', action: 'updated', entity_id: 'a', performed_at: '2026-07-20T18:00:00.000Z' }),
      log({ performed_by: 'u1', action: 'deleted', entity_id: 'b', performed_at: '2026-07-21T09:00:00.000Z' }),
      log({ performed_by: 'u2', action: 'created', entity_id: 'c', performed_at: '2026-07-22T09:00:00.000Z' }),
    ], NOMES);

    expect(linhas).toHaveLength(2);
    const [maria, bruno] = linhas;

    expect(maria.nome).toBe('Maria Silva');
    expect(maria.registros).toBe(3);
    expect(maria.criacoes).toBe(1);
    expect(maria.edicoes).toBe(1);
    expect(maria.exclusoes).toBe(1);
    // 'a' aparece duas vezes → 2 itens distintos, não 3.
    expect(maria.itensDistintos).toBe(2);
    // Dois registros no dia 20 contam como 1 dia ativo.
    expect(maria.diasAtivos).toBe(2);
    expect(maria.mediaPorDiaAtivo).toBeCloseTo(1.5);
    expect(maria.ultimoRegistro).toBe('2026-07-21T09:00:00.000Z');

    expect(bruno.registros).toBe(1);
  });

  it('ordena por registros desc e desempata por nome', () => {
    const linhas = agregarProdutividade([
      log({ performed_by: 'u2', entity_id: 'a' }),
      log({ performed_by: 'u1', entity_id: 'b' }),
    ], NOMES);

    expect(linhas.map(l => l.nome)).toEqual(['Bruno Souza', 'Maria Silva']);
  });

  it('elege o entity_type mais frequente', () => {
    const [linha] = agregarProdutividade([
      log({ entity_type: 'project', entity_id: 'p1' }),
      log({ entity_type: 'task', entity_id: 't1' }),
      log({ entity_type: 'task', entity_id: 't2' }),
    ], NOMES);

    expect(linha.tipoMaisFrequente).toBe('task');
  });

  it('cai para Desconhecido quando o profile não está no mapa', () => {
    const [linha] = agregarProdutividade([log({ performed_by: 'fantasma' })], NOMES);
    expect(linha.nome).toBe('Desconhecido');
  });

  it('devolve lista vazia sem logs', () => {
    expect(agregarProdutividade([], NOMES)).toEqual([]);
  });
});

describe('processosExecutados', () => {
  const concluiu = (over: Partial<AuditLog>) => log({
    action: 'updated',
    changed_fields: { status: { old: 'in_progress', new: 'done' } },
    ...over,
  });

  it('conta itens distintos levados a Concluído', () => {
    const [linha] = agregarProdutividade([
      concluiu({ entity_id: 'a' }),
      concluiu({ entity_id: 'b' }),
    ], NOMES);

    expect(linha.processosExecutados).toBe(2);
    expect(linha.registros).toBe(2);
  });

  it('aceita completed como conclusão', () => {
    const [linha] = agregarProdutividade([
      concluiu({ entity_id: 'a', changed_fields: { status: { old: 'pending', new: 'completed' } } }),
    ], NOMES);

    expect(linha.processosExecutados).toBe(1);
  });

  it('não conta duas vezes o item reaberto e concluído de novo', () => {
    const [linha] = agregarProdutividade([
      concluiu({ entity_id: 'a', performed_at: '2026-07-20T10:00:00.000Z' }),
      log({ entity_id: 'a', action: 'updated', changed_fields: { status: { old: 'done', new: 'todo' } } }),
      concluiu({ entity_id: 'a', performed_at: '2026-07-22T10:00:00.000Z' }),
    ], NOMES);

    expect(linha.processosExecutados).toBe(1);
    expect(linha.registros).toBe(3);
  });

  it('ignora edição sem status, mudança para status não-final e criação', () => {
    const [linha] = agregarProdutividade([
      log({ entity_id: 'a', action: 'updated', changed_fields: { title: { old: 'x', new: 'y' } } }),
      log({ entity_id: 'b', action: 'updated', changed_fields: { status: { old: 'todo', new: 'in_progress' } } }),
      log({ entity_id: 'c', action: 'updated', changed_fields: null }),
      log({ entity_id: 'd', action: 'created', changed_fields: { status: { old: null, new: 'done' } } }),
    ], NOMES);

    expect(linha.processosExecutados).toBe(0);
    expect(linha.registros).toBe(4);
  });

  it('atribui a conclusão a quem executou a mudança', () => {
    const linhas = agregarProdutividade([
      concluiu({ performed_by: 'u1', entity_id: 'a' }),
      concluiu({ performed_by: 'u2', entity_id: 'b' }),
      concluiu({ performed_by: 'u2', entity_id: 'c' }),
    ], NOMES);

    const porNome = Object.fromEntries(linhas.map(l => [l.nome, l.processosExecutados]));
    expect(porNome).toEqual({ 'Maria Silva': 1, 'Bruno Souza': 2 });
  });

  it('soma no resumo os itens concluídos por qualquer colaborador, sem duplicar', () => {
    const resumo = resumirProdutividade([
      concluiu({ performed_by: 'u1', entity_id: 'a' }),
      concluiu({ performed_by: 'u2', entity_id: 'a' }),
      concluiu({ performed_by: 'u2', entity_id: 'b' }),
      log({ entity_id: 'c' }),
    ]);

    expect(resumo.processosExecutados).toBe(2);
  });
});

describe('horas planejadas/executadas e tempo médio', () => {
  const concluiu = (over: Partial<AuditLog>) => log({
    action: 'updated',
    changed_fields: { status: { old: 'in_progress', new: 'done' } },
    ...over,
  });

  it('soma as horas dos itens concluídos e calcula a média', () => {
    const [linha] = agregarProdutividade(
      [concluiu({ entity_id: 'a' }), concluiu({ entity_id: 'b' })],
      NOMES,
      {
        a: { planejadas: 4, executadas: 5 },
        b: { planejadas: 2, executadas: 4 },
      },
    );

    expect(linha.horasPlanejadas).toBe(6);
    expect(linha.horasExecutadas).toBe(9);
    expect(linha.itensComHorasExecutadas).toBe(2);
    expect(linha.tempoMedioProcesso).toBe(4.5);
  });

  it('divide a média só pelos itens com apontamento', () => {
    const [linha] = agregarProdutividade(
      [concluiu({ entity_id: 'a' }), concluiu({ entity_id: 'b' }), concluiu({ entity_id: 'c' })],
      NOMES,
      {
        a: { planejadas: 3, executadas: 6 },
        b: { planejadas: 3, executadas: null },
        c: { planejadas: null, executadas: null },
      },
    );

    expect(linha.processosExecutados).toBe(3);
    expect(linha.horasPlanejadas).toBe(6);
    expect(linha.horasExecutadas).toBe(6);
    expect(linha.itensComHorasExecutadas).toBe(1);
    // 6h / 1 item apontado — não 6h / 3 itens concluídos.
    expect(linha.tempoMedioProcesso).toBe(6);
  });

  it('não soma as horas duas vezes quando o item é reaberto e concluído de novo', () => {
    const [linha] = agregarProdutividade(
      [
        concluiu({ entity_id: 'a', performed_at: '2026-07-20T10:00:00.000Z' }),
        concluiu({ entity_id: 'a', performed_at: '2026-07-23T10:00:00.000Z' }),
      ],
      NOMES,
      { a: { planejadas: 4, executadas: 5 } },
    );

    expect(linha.horasPlanejadas).toBe(4);
    expect(linha.horasExecutadas).toBe(5);
  });

  it('devolve null quando não há apontamento nem estimativa', () => {
    const [linha] = agregarProdutividade([concluiu({ entity_id: 'a' })], NOMES, {});

    expect(linha.horasPlanejadas).toBeNull();
    expect(linha.horasExecutadas).toBeNull();
    expect(linha.itensComHorasExecutadas).toBe(0);
    expect(linha.tempoMedioProcesso).toBeNull();
  });

  it('ignora horas de item que a pessoa não concluiu', () => {
    const [linha] = agregarProdutividade(
      [log({ entity_id: 'a', action: 'updated', changed_fields: { title: { old: 'x', new: 'y' } } })],
      NOMES,
      { a: { planejadas: 10, executadas: 10 } },
    );

    expect(linha.horasPlanejadas).toBeNull();
    expect(linha.tempoMedioProcesso).toBeNull();
  });
});

describe('resolverVinculos', () => {
  it('prefere o vínculo da própria tarefa', () => {
    const { clientePorId, contribuintePorId, servicoPorId, osPorId } = resolverVinculos(
      [{ id: 't1', client_id: 'cli-A', contribuinte_id: 'contrib-1', servico_id: 'srv-1', project_id: 'p1' }],
      [{ id: 'p1', contribuinte_id: 'contrib-2', servico_id: 'srv-2', ordem_servico_id: 'os-1' }],
      { 'contrib-1': 'cli-B', 'contrib-2': 'cli-C' },
    );

    expect(clientePorId.t1).toBe('cli-A');
    expect(contribuintePorId.t1).toBe('contrib-1');
    expect(servicoPorId.t1).toBe('srv-1');
    // OS só existe no projeto — a tarefa herda a do projeto dela.
    expect(osPorId.t1).toBe('os-1');
  });

  it('cai para o cliente do contribuinte quando a tarefa não tem client_id', () => {
    const { clientePorId } = resolverVinculos(
      [{ id: 't1', client_id: null, contribuinte_id: 'contrib-1', servico_id: null, project_id: 'p1' }],
      [{ id: 'p1', contribuinte_id: 'contrib-2', servico_id: null, ordem_servico_id: null }],
      { 'contrib-1': 'cli-B', 'contrib-2': 'cli-C' },
    );

    expect(clientePorId.t1).toBe('cli-B');
  });

  it('cai para o projeto quando a tarefa não tem vínculo próprio', () => {
    const { clientePorId, contribuintePorId, servicoPorId, osPorId } = resolverVinculos(
      [{ id: 't1', client_id: null, contribuinte_id: null, servico_id: null, project_id: 'p1' }],
      [{ id: 'p1', contribuinte_id: 'contrib-2', servico_id: 'srv-2', ordem_servico_id: 'os-1' }],
      { 'contrib-2': 'cli-C' },
    );

    expect(clientePorId.t1).toBe('cli-C');
    expect(contribuintePorId.t1).toBe('contrib-2');
    expect(servicoPorId.t1).toBe('srv-2');
    expect(osPorId.t1).toBe('os-1');
    // O próprio projeto também fica resolvido, para logs de entity_type project.
    expect(clientePorId.p1).toBe('cli-C');
    expect(servicoPorId.p1).toBe('srv-2');
  });

  it('usa external_client_id do projeto quando não há contribuinte', () => {
    const { clientePorId } = resolverVinculos(
      [{ id: 't1', client_id: null, contribuinte_id: null, servico_id: null, project_id: 'p1' }],
      [{
        id: 'p1', contribuinte_id: null, external_client_id: 'cli-D',
        servico_id: null, ordem_servico_id: null,
      }],
      {},
    );

    // Mesmo espaço de ids de org_tasks.client_id — o projeto e a tarefa dele
    // ficam no cliente D em vez de contarem como "sem cliente".
    expect(clientePorId.p1).toBe('cli-D');
    expect(clientePorId.t1).toBe('cli-D');
  });

  it('prefere o cliente do contribuinte ao external_client_id', () => {
    const { clientePorId } = resolverVinculos(
      [],
      [{
        id: 'p1', contribuinte_id: 'contrib-1', external_client_id: 'cli-D',
        servico_id: null, ordem_servico_id: null,
      }],
      { 'contrib-1': 'cli-C' },
    );

    expect(clientePorId.p1).toBe('cli-C');
  });

  it('mantém o contribuinte mesmo quando o cliente dele não é visível', () => {
    const { clientePorId, contribuintePorId } = resolverVinculos(
      [{ id: 't1', client_id: null, contribuinte_id: 'contrib-9', servico_id: null, project_id: null }],
      [],
      {},
    );

    // Sem o cliente na base, o item não conta como cliente — mas o CNPJ conta.
    expect(clientePorId.t1).toBeUndefined();
    expect(contribuintePorId.t1).toBe('contrib-9');
  });

  it('herda o produto declarado do projeto para as tarefas dele', () => {
    const { produtoExplicitoPorId } = resolverVinculos(
      [
        { id: 't1', client_id: null, contribuinte_id: null, servico_id: null, project_id: 'p1' },
        { id: 't2', client_id: null, contribuinte_id: null, servico_id: null, project_id: 'p2' },
        { id: 't3', client_id: null, contribuinte_id: null, servico_id: null, project_id: null },
      ],
      [
        { id: 'p1', contribuinte_id: null, servico_id: null, ordem_servico_id: 'os-1', produto_segmento_id: 'prod-A' },
        { id: 'p2', contribuinte_id: null, servico_id: null, ordem_servico_id: 'os-2' },
      ],
      {},
    );

    expect(produtoExplicitoPorId.p1).toBe('prod-A');
    expect(produtoExplicitoPorId.t1).toBe('prod-A');
    // Projeto antigo sem a coluna e tarefa órfã ficam de fora: quem decide o que
    // fazer com isso é `resolverProdutoContratado`, caindo na dedução.
    expect(produtoExplicitoPorId.p2).toBeUndefined();
    expect(produtoExplicitoPorId.t2).toBeUndefined();
    expect(produtoExplicitoPorId.t3).toBeUndefined();
  });

  it('omite o item sem nenhum vínculo', () => {
    const { clientePorId, contribuintePorId, servicoPorId, osPorId } = resolverVinculos(
      [{ id: 't1', client_id: null, contribuinte_id: null, servico_id: null, project_id: null }],
      [],
      {},
    );

    expect(clientePorId.t1).toBeUndefined();
    expect(contribuintePorId.t1).toBeUndefined();
    expect(servicoPorId.t1).toBeUndefined();
    expect(osPorId.t1).toBeUndefined();
  });
});

describe('resolverProdutoContratado', () => {
  it('usa o produto que o projeto declara, sem passar pela dedução', () => {
    const produtoPorId = resolverProdutoContratado(
      { p1: 'prod-declarado', t1: 'prod-declarado' },
      { t1: 'srv-1' },
      { t1: 'os-1', p1: 'os-1' },
      { 'os-1': ['prod-A', 'prod-B'] },
      { 'srv-1': ['prod-B'] },
    );

    // A dedução fecharia em prod-B pelo serviço; o cadastro diz outra coisa e é
    // o cadastro que vale.
    expect(produtoPorId.t1).toBe('prod-declarado');
    expect(produtoPorId.p1).toBe('prod-declarado');
  });

  it('vale o produto declarado mesmo sem OS ou sem produto contratado nela', () => {
    const produtoPorId = resolverProdutoContratado(
      { semOs: 'prod-declarado', osVazia: 'prod-declarado' },
      {},
      { osVazia: 'os-1' },
      { 'os-1': [] },
      {},
    );

    expect(produtoPorId.semOs).toBe('prod-declarado');
    expect(produtoPorId.osVazia).toBe('prod-declarado');
  });

  it('deduz quando o projeto não declara nada (projeto antigo)', () => {
    const produtoPorId = resolverProdutoContratado(
      { outro: 'prod-declarado' },
      { t1: 'srv-1' },
      { t1: 'os-1' },
      { 'os-1': ['prod-A', 'prod-B'] },
      { 'srv-1': ['prod-B'] },
    );

    expect(produtoPorId.t1).toBe('prod-B');
  });

  it('escolhe o produto da OS que casa com o serviço do item', () => {
    const produtoPorId = resolverProdutoContratado(
      {},
      { t1: 'srv-1' },
      { t1: 'os-1' },
      { 'os-1': ['prod-A', 'prod-B'] },
      { 'srv-1': ['prod-B', 'prod-Z'] },
    );

    // prod-Z está no serviço mas não foi contratado nessa OS; prod-A foi
    // contratado mas não é desse serviço.
    expect(produtoPorId.t1).toBe('prod-B');
  });

  it('usa o produto único da OS quando o serviço não casa com nenhum', () => {
    const produtoPorId = resolverProdutoContratado(
      {},
      { t1: 'srv-9' },
      { t1: 'os-1' },
      { 'os-1': ['prod-A'] },
      { 'srv-9': ['prod-Z'] },
    );

    expect(produtoPorId.t1).toBe('prod-A');
  });

  it('usa o produto único da OS quando o item não tem serviço', () => {
    const produtoPorId = resolverProdutoContratado(
      {},
      {},
      { t1: 'os-1' },
      { 'os-1': ['prod-A'] },
      {},
    );

    expect(produtoPorId.t1).toBe('prod-A');
  });

  it('não escolhe no chute quando a OS tem vários produtos e nenhum casa', () => {
    const produtoPorId = resolverProdutoContratado(
      {},
      { t1: 'srv-9' },
      { t1: 'os-1' },
      { 'os-1': ['prod-A', 'prod-B'] },
      { 'srv-9': [] },
    );

    expect(produtoPorId.t1).toBeUndefined();
  });

  it('desempata pelo menor id, para o número não mudar entre carregamentos', () => {
    const produtoPorId = resolverProdutoContratado(
      {},
      { t1: 'srv-1' },
      { t1: 'os-1' },
      { 'os-1': ['prod-B', 'prod-A'] },
      { 'srv-1': ['prod-A', 'prod-B'] },
    );

    expect(produtoPorId.t1).toBe('prod-A');
  });

  it('ignora item sem OS e OS sem produto contratado', () => {
    const produtoPorId = resolverProdutoContratado(
      {},
      { t1: 'srv-1', t2: 'srv-1' },
      { t2: 'os-vazia' },
      { 'os-vazia': [] },
      { 'srv-1': ['prod-A'] },
    );

    expect(produtoPorId.t1).toBeUndefined();
    expect(produtoPorId.t2).toBeUndefined();
  });
});

describe('projetosFinalizados', () => {
  const finalizou = (over: Partial<AuditLog>) => log({
    action: 'updated',
    changed_fields: { status: { old: 'active', new: 'completed' } },
    ...over,
  });

  it('separa projeto finalizado de processo executado', () => {
    const [linha] = agregarProdutividade([
      finalizou({ entity_type: 'project', entity_id: 'p1' }),
      finalizou({ entity_type: 'task', entity_id: 't1', changed_fields: { status: { old: 'todo', new: 'done' } } }),
      finalizou({ entity_type: 'subtask', entity_id: 's1', changed_fields: { status: { old: 'todo', new: 'done' } } }),
    ], NOMES);

    expect(linha.projetosFinalizados).toBe(1);
    // Projeto NÃO infla processos executados: 1 tarefa + 1 subtarefa.
    expect(linha.processosExecutados).toBe(2);
  });

  it('não conta o projeto reaberto e finalizado de novo duas vezes', () => {
    const [linha] = agregarProdutividade([
      finalizou({ entity_type: 'project', entity_id: 'p1', performed_at: '2026-07-20T10:00:00.000Z' }),
      log({ entity_type: 'project', entity_id: 'p1', changed_fields: { status: { old: 'completed', new: 'active' } } }),
      finalizou({ entity_type: 'project', entity_id: 'p1', performed_at: '2026-07-25T10:00:00.000Z' }),
    ], NOMES);

    expect(linha.projetosFinalizados).toBe(1);
  });

  it('soma no resumo sem duplicar entre pessoas', () => {
    const logs = [
      finalizou({ performed_by: 'u1', entity_type: 'project', entity_id: 'p1' }),
      finalizou({ performed_by: 'u2', entity_type: 'project', entity_id: 'p1' }),
      finalizou({ performed_by: 'u2', entity_type: 'project', entity_id: 'p2' }),
    ];

    expect(resumirProdutividade(logs).projetosFinalizados).toBe(2);
    expect(resumirProdutividade(logs).processosExecutados).toBe(0);
  });
});

describe('projetosAbertos / tarefasAbertas', () => {
  const STATUS = {
    p1: 'active', p2: 'planned', p3: 'completed', p4: 'cancelled',
    t1: 'in_progress', t2: 'review', t3: 'done',
  };

  it('conta o que foi tocado no período e hoje não está concluído nem cancelado', () => {
    const [linha] = agregarProdutividade([
      log({ entity_type: 'project', entity_id: 'p1' }),
      log({ entity_type: 'project', entity_id: 'p2' }),
      log({ entity_type: 'project', entity_id: 'p3' }),
      log({ entity_type: 'project', entity_id: 'p4' }),
      log({ entity_type: 'task', entity_id: 't1' }),
      log({ entity_type: 'subtask', entity_id: 't2' }),
      log({ entity_type: 'task', entity_id: 't3' }),
    ], NOMES, {}, {}, {}, STATUS);

    // p3 concluído e p4 cancelado ficam fora; t3 concluída fica fora.
    expect(linha.projetosAbertos).toBe(2);
    expect(linha.tarefasAbertas).toBe(2);
  });

  it('não conta item sem status conhecido como aberto', () => {
    const [linha] = agregarProdutividade([
      log({ entity_type: 'project', entity_id: 'apagado' }),
      log({ entity_type: 'task', entity_id: 'apagada' }),
    ], NOMES, {}, {}, {}, STATUS);

    expect(linha.projetosAbertos).toBe(0);
    expect(linha.tarefasAbertas).toBe(0);
  });

  it('tira dos abertos o projeto que a própria pessoa finalizou no período', () => {
    const [linha] = agregarProdutividade([
      log({ entity_type: 'project', entity_id: 'p1' }),
      log({
        entity_type: 'project', entity_id: 'p3',
        changed_fields: { status: { old: 'active', new: 'completed' } },
      }),
    ], NOMES, {}, {}, {}, STATUS);

    expect(linha.projetosAbertos).toBe(1);
    expect(linha.projetosFinalizados).toBe(1);
  });

  it('conta uma vez só o item tocado várias vezes', () => {
    const [linha] = agregarProdutividade([
      log({ entity_type: 'project', entity_id: 'p1', action: 'created' }),
      log({ entity_type: 'project', entity_id: 'p1', action: 'updated' }),
      log({ entity_type: 'task', entity_id: 't1', action: 'updated' }),
      log({ entity_type: 'task', entity_id: 't1', action: 'updated' }),
    ], NOMES, {}, {}, {}, STATUS);

    expect(linha.projetosAbertos).toBe(1);
    expect(linha.tarefasAbertas).toBe(1);
  });

  it('fica em zero quando o status não é informado', () => {
    const [linha] = agregarProdutividade([
      log({ entity_type: 'project', entity_id: 'p1' }),
      log({ entity_type: 'task', entity_id: 't1' }),
    ], NOMES);

    expect(linha.projetosAbertos).toBe(0);
    expect(linha.tarefasAbertas).toBe(0);
  });
});

describe('contribuintesDistintos', () => {
  it('conta CNPJs, não clientes: um cliente com dois CNPJs dá 1 cliente e 2 contribuintes', () => {
    const [linha] = agregarProdutividade(
      [log({ entity_id: 't1' }), log({ entity_id: 't2' })],
      NOMES,
      {},
      { t1: 'cli-A', t2: 'cli-A' },
      { t1: 'contrib-1', t2: 'contrib-2' },
    );

    expect(linha.clientesDistintos).toBe(1);
    expect(linha.contribuintesDistintos).toBe(2);
  });

  it('ignora item sem contribuinte vinculado', () => {
    const [linha] = agregarProdutividade(
      [log({ entity_id: 't1' }), log({ entity_id: 't2' })],
      NOMES,
      {},
      {},
      { t1: 'contrib-1' },
    );

    expect(linha.contribuintesDistintos).toBe(1);
  });

  it('conta a equipe no resumo sem duplicar', () => {
    const logs = [
      log({ performed_by: 'u1', entity_id: 't1' }),
      log({ performed_by: 'u2', entity_id: 't1' }),
      log({ performed_by: 'u2', entity_id: 't2' }),
    ];
    const contribuintes = { t1: 'contrib-1', t2: 'contrib-2' };

    expect(resumirProdutividade(logs, {}, contribuintes).contribuintesDistintos).toBe(2);
  });
});

describe('agregarPorProduto', () => {
  const concluiu = (entityId: string, over: Partial<AuditLog> = {}) => log({
    entity_id: entityId,
    action: 'updated',
    changed_fields: { status: { old: 'in_progress', new: 'done' } },
    ...over,
  });

  it('agrupa itens concluídos por produto e calcula o tempo médio de cada um', () => {
    const linhas = agregarPorProduto(
      [concluiu('t1'), concluiu('t2'), concluiu('t3')],
      {
        t1: { planejadas: 2, executadas: 3 },
        t2: { planejadas: 2, executadas: 5 },
        t3: { planejadas: 10, executadas: 12 },
      },
      { t1: 'srv-1', t2: 'srv-1', t3: 'srv-2' },
      { 'srv-1': 'Apuração', 'srv-2': 'Reorganização' },
    );

    // Ordenado por tempo médio desc: srv-2 (12h) antes de srv-1 (4h).
    expect(linhas.map(l => l.nome)).toEqual(['Reorganização', 'Apuração']);
    const [reorg, apuracao] = linhas;
    expect(reorg.tempoMedio).toBe(12);
    expect(apuracao.concluidos).toBe(2);
    expect(apuracao.horasPlanejadas).toBe(4);
    expect(apuracao.horasExecutadas).toBe(8);
    expect(apuracao.tempoMedio).toBe(4);
  });

  it('joga item sem produto identificado num bucket próprio em vez de descartar', () => {
    const linhas = agregarPorProduto(
      [concluiu('t1'), concluiu('t2')],
      { t1: { planejadas: 1, executadas: 1 }, t2: { planejadas: 1, executadas: 1 } },
      { t1: 'srv-1' },
      { 'srv-1': 'Apuração' },
    );

    const semProduto = linhas.find(l => l.produtoId === PRODUTO_SEM_VINCULO);
    expect(semProduto?.nome).toBe('Sem produto identificado');
    expect(semProduto?.concluidos).toBe(1);
  });

  it('deixa sem tempo médio o produto sem apontamento, e manda para o fim', () => {
    const linhas = agregarPorProduto(
      [concluiu('t1'), concluiu('t2')],
      { t1: { planejadas: 3, executadas: null }, t2: { planejadas: 1, executadas: 2 } },
      { t1: 'srv-1', t2: 'srv-2' },
      { 'srv-1': 'Sem apontamento', 'srv-2': 'Com apontamento' },
    );

    expect(linhas.map(l => l.nome)).toEqual(['Com apontamento', 'Sem apontamento']);
    expect(linhas[1].tempoMedio).toBeNull();
    expect(linhas[1].horasExecutadas).toBeNull();
    expect(linhas[1].horasPlanejadas).toBe(3);
    expect(linhas[1].itensComHorasExecutadas).toBe(0);
  });

  it('conta o item concluído uma vez só e ignora projeto e não-conclusão', () => {
    const linhas = agregarPorProduto(
      [
        concluiu('t1', { performed_at: '2026-07-20T10:00:00.000Z' }),
        concluiu('t1', { performed_at: '2026-07-22T10:00:00.000Z' }),
        concluiu('p1', { entity_type: 'project', changed_fields: { status: { old: 'active', new: 'completed' } } }),
        log({ entity_id: 't9', changed_fields: { title: { old: 'a', new: 'b' } } }),
      ],
      { t1: { planejadas: 4, executadas: 6 } },
      { t1: 'srv-1', p1: 'srv-1', t9: 'srv-1' },
      { 'srv-1': 'Apuração' },
    );

    expect(linhas).toHaveLength(1);
    expect(linhas[0].concluidos).toBe(1);
    expect(linhas[0].horasExecutadas).toBe(6);
  });

  it('devolve vazio sem conclusões', () => {
    expect(agregarPorProduto([log({})], {}, {}, {})).toEqual([]);
  });

  it('exporta a aba Produtos na mesma ordem da tabela, com célula vazia sem horas', () => {
    const linhas = agregarPorProduto(
      [concluiu('t1'), concluiu('t2')],
      { t1: { planejadas: 3, executadas: 4.5 }, t2: { planejadas: 1, executadas: null } },
      { t1: 'srv-1', t2: 'srv-2' },
      { 'srv-1': 'Apuração; mensal', 'srv-2': 'Sem apontamento' },
    );

    const csv = buildProdutosCsv(linhas).split('\n');
    expect(csv[0]).toBe(
      'produto;concluidos;horas_planejadas;horas_executadas;itens_com_horas_apontadas;tempo_medio_h',
    );
    expect(csv[1]).toBe('"Apuração; mensal";1;3;4,5;1;4,5');
    expect(csv[2]).toBe('Sem apontamento;1;1;;0;');
  });
});

describe('clientesDistintos', () => {
  it('conta clientes diferentes sobre tudo que a pessoa tocou, não só o concluído', () => {
    const [linha] = agregarProdutividade(
      [
        log({ entity_id: 't1' }),
        log({ entity_id: 't2' }),
        log({ entity_id: 't3' }),
      ],
      NOMES,
      {},
      { t1: 'cli-A', t2: 'cli-B', t3: 'cli-A' },
    );

    // t1 e t3 são do mesmo cliente → 2 clientes, 3 itens.
    expect(linha.clientesDistintos).toBe(2);
    expect(linha.itensDistintos).toBe(3);
    expect(linha.processosExecutados).toBe(0);
  });

  it('ignora item sem cliente vinculado', () => {
    const [linha] = agregarProdutividade(
      [log({ entity_id: 't1' }), log({ entity_id: 'sem-vinculo' })],
      NOMES,
      {},
      { t1: 'cli-A' },
    );

    expect(linha.clientesDistintos).toBe(1);
    expect(linha.itensDistintos).toBe(2);
  });

  it('conta por pessoa, e no resumo conta a equipe sem duplicar', () => {
    const logs = [
      log({ performed_by: 'u1', entity_id: 't1' }),
      log({ performed_by: 'u2', entity_id: 't1' }),
      log({ performed_by: 'u2', entity_id: 't2' }),
    ];
    const clientes = { t1: 'cli-A', t2: 'cli-B' };

    const porNome = Object.fromEntries(
      agregarProdutividade(logs, NOMES, {}, clientes).map(l => [l.nome, l.clientesDistintos]),
    );
    expect(porNome).toEqual({ 'Maria Silva': 1, 'Bruno Souza': 2 });
    expect(resumirProdutividade(logs, clientes).clientesDistintos).toBe(2);
  });
});

describe('idsTocados', () => {
  it('separa tarefas de projetos, sem repetir', () => {
    const ids = idsTocados([
      log({ entity_type: 'task', entity_id: 't1' }),
      log({ entity_type: 'task', entity_id: 't1' }),
      log({ entity_type: 'subtask', entity_id: 's1' }),
      log({ entity_type: 'project', entity_id: 'p1' }),
    ]);

    expect(ids.tarefas.sort()).toEqual(['s1', 't1']);
    expect(ids.projetos).toEqual(['p1']);
  });
});

describe('idsConcluidos', () => {
  it('devolve só tarefas e subtarefas concluídas, sem repetir', () => {
    const ids = idsConcluidos([
      log({ entity_type: 'task', entity_id: 't1', changed_fields: { status: { old: 'todo', new: 'done' } } }),
      log({ entity_type: 'task', entity_id: 't1', changed_fields: { status: { old: 'todo', new: 'done' } } }),
      log({ entity_type: 'subtask', entity_id: 's1', changed_fields: { status: { old: 'todo', new: 'done' } } }),
      // Projeto não existe em org_tasks — fica fora da busca de horas.
      log({ entity_type: 'project', entity_id: 'p1', changed_fields: { status: { old: 'active', new: 'done' } } }),
      // Sem conclusão.
      log({ entity_type: 'task', entity_id: 't2', changed_fields: { title: { old: 'a', new: 'b' } } }),
    ]);

    expect(ids.sort()).toEqual(['s1', 't1']);
  });

  it('devolve vazio sem logs', () => {
    expect(idsConcluidos([])).toEqual([]);
  });
});

describe('agregarProdutoPorPessoa', () => {
  const concluiu = (entityId: string, over: Partial<AuditLog> = {}) => log({
    entity_id: entityId,
    action: 'updated',
    changed_fields: { status: { old: 'in_progress', new: 'done' } },
    ...over,
  });

  it('lista os produtos de cada pessoa separadamente', () => {
    const porPessoa = agregarProdutoPorPessoa(
      [
        concluiu('t1', { performed_by: 'u1' }),
        concluiu('t2', { performed_by: 'u2' }),
      ],
      { t1: { planejadas: 2, executadas: 3 }, t2: { planejadas: 1, executadas: 1 } },
      { t1: 'prod-A', t2: 'prod-B' },
      { 'prod-A': 'CT — Consultoria', 'prod-B': 'ECF' },
    );

    expect(porPessoa.u1.map(l => l.nome)).toEqual(['CT — Consultoria']);
    expect(porPessoa.u2.map(l => l.nome)).toEqual(['ECF']);
    expect(porPessoa.u1[0].concluidos).toBe(1);
    expect(porPessoa.u1[0].tempoMedio).toBe(3);
  });

  it('conta item tocado sem conclusão — é o que mostra no que a pessoa está mexendo', () => {
    const porPessoa = agregarProdutoPorPessoa(
      [
        log({ entity_id: 't1', changed_fields: { title: { old: 'a', new: 'b' } } }),
        log({ entity_id: 't2', changed_fields: { status: { old: 'todo', new: 'in_progress' } } }),
      ],
      { t1: { planejadas: 5, executadas: 5 }, t2: { planejadas: 5, executadas: 5 } },
      { t1: 'prod-A', t2: 'prod-A' },
      { 'prod-A': 'CT — Consultoria' },
    );

    const [linha] = porPessoa.u1;
    expect(linha.itensTocados).toBe(2);
    expect(linha.concluidos).toBe(0);
    // Horas só entram pelo item concluído: nada concluído, nada de horas.
    expect(linha.horasExecutadas).toBeNull();
    expect(linha.tempoMedio).toBeNull();
  });

  it('ordena por itens tocados desc e joga item sem produto no bucket', () => {
    const porPessoa = agregarProdutoPorPessoa(
      [
        log({ entity_id: 't1' }),
        log({ entity_id: 't2' }),
        log({ entity_id: 't3' }),
        log({ entity_id: 'sem' }),
      ],
      {},
      { t1: 'prod-A', t2: 'prod-B', t3: 'prod-B' },
      { 'prod-A': 'CT', 'prod-B': 'ECF' },
    );

    expect(porPessoa.u1.map(l => [l.nome, l.itensTocados])).toEqual([
      ['ECF', 2],
      ['CT', 1],
      ['Sem produto identificado', 1],
    ]);
  });

  it('não conta o mesmo item duas vezes quando tem vários logs', () => {
    const porPessoa = agregarProdutoPorPessoa(
      [
        log({ entity_id: 't1', performed_at: '2026-07-20T10:00:00.000Z' }),
        concluiu('t1', { performed_at: '2026-07-21T10:00:00.000Z' }),
        concluiu('t1', { performed_at: '2026-07-22T10:00:00.000Z' }),
      ],
      { t1: { planejadas: 4, executadas: 6 } },
      { t1: 'prod-A' },
      { 'prod-A': 'CT' },
    );

    const [linha] = porPessoa.u1;
    expect(linha.itensTocados).toBe(1);
    expect(linha.concluidos).toBe(1);
    expect(linha.horasExecutadas).toBe(6);
  });

  it('devolve objeto vazio sem logs', () => {
    expect(agregarProdutoPorPessoa([], {}, {}, {})).toEqual({});
  });
});

describe('agregarPessoaPorProduto', () => {
  const concluiu = (entityId: string, over: Partial<AuditLog> = {}) => log({
    entity_id: entityId,
    action: 'updated',
    changed_fields: { status: { old: 'in_progress', new: 'done' } },
    ...over,
  });

  it('lista quem trabalhou em cada produto', () => {
    const porProduto = agregarPessoaPorProduto(
      [
        concluiu('t1', { performed_by: 'u1' }),
        concluiu('t2', { performed_by: 'u2' }),
        concluiu('t3', { performed_by: 'u2' }),
      ],
      { t1: { planejadas: 2, executadas: 3 } },
      { t1: 'prod-A', t2: 'prod-A', t3: 'prod-B' },
      NOMES,
    );

    expect(porProduto['prod-A'].map(l => l.nome)).toEqual(['Bruno Souza', 'Maria Silva']);
    expect(porProduto['prod-B'].map(l => l.nome)).toEqual(['Bruno Souza']);
    const maria = porProduto['prod-A'].find(l => l.userId === 'u1');
    expect(maria?.concluidos).toBe(1);
    expect(maria?.tempoMedio).toBe(3);
  });

  it('mostra os mesmos números que a expansão por pessoa, para o mesmo par', () => {
    const logs = [
      log({ entity_id: 't1', performed_by: 'u1' }),
      concluiu('t2', { performed_by: 'u1' }),
    ];
    const horas = { t2: { planejadas: 4, executadas: 6 } };
    const produtos = { t1: 'prod-A', t2: 'prod-A' };

    const porPessoa = agregarProdutoPorPessoa(logs, horas, produtos, { 'prod-A': 'CT' });
    const porProduto = agregarPessoaPorProduto(logs, horas, produtos, NOMES);

    const daPessoa = porPessoa.u1[0];
    const doProduto = porProduto['prod-A'][0];
    expect(doProduto.itensTocados).toBe(daPessoa.itensTocados);
    expect(doProduto.concluidos).toBe(daPessoa.concluidos);
    expect(doProduto.horasExecutadas).toBe(daPessoa.horasExecutadas);
    expect(doProduto.tempoMedio).toBe(daPessoa.tempoMedio);
  });

  it('ordena por itens tocados desc com desempate por nome', () => {
    const porProduto = agregarPessoaPorProduto(
      [
        log({ entity_id: 't1', performed_by: 'u1' }),
        log({ entity_id: 't2', performed_by: 'u1' }),
        log({ entity_id: 't3', performed_by: 'u2' }),
      ],
      {},
      { t1: 'prod-A', t2: 'prod-A', t3: 'prod-A' },
      NOMES,
    );

    expect(porProduto['prod-A'].map(l => [l.nome, l.itensTocados])).toEqual([
      ['Maria Silva', 2],
      ['Bruno Souza', 1],
    ]);
  });

  it('conta as duas pessoas que mexeram no mesmo item', () => {
    const porProduto = agregarPessoaPorProduto(
      [
        log({ entity_id: 't1', performed_by: 'u1' }),
        log({ entity_id: 't1', performed_by: 'u2' }),
      ],
      {},
      { t1: 'prod-A' },
      NOMES,
    );

    // Cada uma tocou 1 item; a linha do produto conta o item uma vez só.
    expect(porProduto['prod-A'].map(l => l.itensTocados)).toEqual([1, 1]);
  });

  it('joga item sem produto no bucket e cai para Desconhecido sem nome', () => {
    const porProduto = agregarPessoaPorProduto(
      [log({ entity_id: 'sem', performed_by: 'fantasma' })],
      {},
      {},
      NOMES,
    );

    expect(porProduto[PRODUTO_SEM_VINCULO][0].nome).toBe('Desconhecido');
  });

  it('devolve objeto vazio sem logs', () => {
    expect(agregarPessoaPorProduto([], {}, {}, {})).toEqual({});
  });
});

describe('formatarHoras', () => {
  it('formata inteiro, decimal e ausência de valor', () => {
    expect(formatarHoras(12)).toBe('12h');
    expect(formatarHoras(9.5)).toBe('9,5h');
    expect(formatarHoras(0)).toBe('0h');
    expect(formatarHoras(null)).toBe('—');
  });
});

describe('ordenarProdutividade', () => {
  function linha(over: Partial<LinhaProdutividade>): LinhaProdutividade {
    return {
      userId: 'u',
      nome: 'Nome',
      processosExecutados: 0,
      tarefasAbertas: 0,
      projetosFinalizados: 0,
      projetosAbertos: 0,
      clientesDistintos: 0,
      contribuintesDistintos: 0,
      horasPlanejadas: 0,
      horasExecutadas: 0,
      itensComHorasExecutadas: 0,
      tempoMedioProcesso: 0,
      registros: 0,
      criacoes: 0,
      edicoes: 0,
      exclusoes: 0,
      itensDistintos: 0,
      diasAtivos: 0,
      mediaPorDiaAtivo: 0,
      tipoMaisFrequente: 'task',
      ultimoRegistro: '2026-07-20T10:00:00.000Z',
      ...over,
    };
  }

  const base = [
    linha({ userId: 'a', nome: 'Ana', registros: 5, mediaPorDiaAtivo: 1.2, ultimoRegistro: '2026-07-22T10:00:00.000Z' }),
    linha({ userId: 'b', nome: 'Bruno', registros: 12, mediaPorDiaAtivo: 4, ultimoRegistro: '2026-07-20T10:00:00.000Z' }),
    linha({ userId: 'c', nome: 'Carla', registros: 9, mediaPorDiaAtivo: 2.5, ultimoRegistro: '2026-07-25T10:00:00.000Z' }),
  ];

  it('ordena número do maior para o menor e vice-versa', () => {
    expect(ordenarProdutividade(base, 'registros', 'desc').map(l => l.userId)).toEqual(['b', 'c', 'a']);
    expect(ordenarProdutividade(base, 'registros', 'asc').map(l => l.userId)).toEqual(['a', 'c', 'b']);
  });

  it('ordena decimal, texto e data', () => {
    expect(ordenarProdutividade(base, 'mediaPorDiaAtivo', 'desc').map(l => l.userId)).toEqual(['b', 'c', 'a']);
    expect(ordenarProdutividade(base, 'nome', 'asc').map(l => l.userId)).toEqual(['a', 'b', 'c']);
    expect(ordenarProdutividade(base, 'ultimoRegistro', 'desc').map(l => l.userId)).toEqual(['c', 'a', 'b']);
  });

  it('não muta o array recebido', () => {
    const original = [...base];
    ordenarProdutividade(base, 'nome', 'desc');
    expect(base).toEqual(original);
  });

  it('desempata por nome', () => {
    const empatados = [
      linha({ userId: 'z', nome: 'Zeca', registros: 3 }),
      linha({ userId: 'd', nome: 'Davi', registros: 3 }),
    ];
    expect(ordenarProdutividade(empatados, 'registros', 'desc').map(l => l.userId)).toEqual(['d', 'z']);
  });

  it('mantém quem não tem horas apontadas no fim nas duas direções', () => {
    const comVazio = [
      linha({ userId: 'sem', horasExecutadas: null, tempoMedioProcesso: null }),
      linha({ userId: 'baixo', horasExecutadas: 2, tempoMedioProcesso: 1 }),
      linha({ userId: 'alto', horasExecutadas: 8, tempoMedioProcesso: 4 }),
    ];

    expect(ordenarProdutividade(comVazio, 'horasExecutadas', 'desc').map(l => l.userId))
      .toEqual(['alto', 'baixo', 'sem']);
    expect(ordenarProdutividade(comVazio, 'horasExecutadas', 'asc').map(l => l.userId))
      .toEqual(['baixo', 'alto', 'sem']);
    expect(ordenarProdutividade(comVazio, 'tempoMedioProcesso', 'desc').map(l => l.userId))
      .toEqual(['alto', 'baixo', 'sem']);
  });

  it('mantém tipo nulo no fim nas duas direções', () => {
    const comNulo = [
      linha({ userId: 'n', tipoMaisFrequente: null }),
      linha({ userId: 'p', tipoMaisFrequente: 'project' }),
      linha({ userId: 't', tipoMaisFrequente: 'task' }),
    ];
    expect(ordenarProdutividade(comNulo, 'tipoMaisFrequente', 'asc').map(l => l.userId)).toEqual(['p', 't', 'n']);
    expect(ordenarProdutividade(comNulo, 'tipoMaisFrequente', 'desc').map(l => l.userId)).toEqual(['t', 'p', 'n']);
  });
});

describe('direcaoInicial', () => {
  it('começa desc em número/data e asc em texto', () => {
    expect(direcaoInicial('registros')).toBe('desc');
    expect(direcaoInicial('ultimoRegistro')).toBe('desc');
    expect(direcaoInicial('nome')).toBe('asc');
    expect(direcaoInicial('tipoMaisFrequente')).toBe('asc');
  });
});

describe('resumirProdutividade', () => {
  it('conta colaboradores, registros, itens e dias distintos', () => {
    const resumo = resumirProdutividade([
      log({ performed_by: 'u1', entity_id: 'a', performed_at: '2026-07-20T10:00:00.000Z' }),
      log({ performed_by: 'u2', entity_id: 'a', performed_at: '2026-07-20T11:00:00.000Z' }),
      log({ performed_by: 'u2', entity_id: 'b', performed_at: '2026-07-21T11:00:00.000Z' }),
    ]);

    expect(resumo).toEqual({
      colaboradoresAtivos: 2,
      processosExecutados: 0,
      projetosFinalizados: 0,
      clientesDistintos: 0,
      contribuintesDistintos: 0,
      registros: 3,
      itensDistintos: 2,
      diasComAtividade: 2,
    });
  });

  it('zera tudo sem logs', () => {
    expect(resumirProdutividade([])).toEqual({
      colaboradoresAtivos: 0,
      processosExecutados: 0,
      projetosFinalizados: 0,
      clientesDistintos: 0,
      contribuintesDistintos: 0,
      registros: 0,
      itensDistintos: 0,
      diasComAtividade: 0,
    });
  });
});

describe('buildProdutividadeCsv', () => {
  const logsCsv = [
    log({ performed_by: 'u1', action: 'created', entity_id: 'a', performed_at: '2026-07-20T10:00:00.000Z' }),
    log({
      performed_by: 'u1', action: 'updated', entity_id: 'a',
      performed_at: '2026-07-20T18:00:00.000Z',
      changed_fields: { status: { old: 'todo', new: 'done' } },
    }),
  ];

  it('gera cabeçalho e linha com decimal em vírgula', () => {
    const linhas = agregarProdutividade(
      logsCsv,
      NOMES,
      { a: { planejadas: 3, executadas: 4.5 } },
      { a: 'cli-A' },
      { a: 'contrib-1' },
    );

    const csv = buildProdutividadeCsv(linhas).split('\n');
    expect(csv[0]).toBe(
      'colaborador;projetos_abertos;projetos_finalizados;tarefas_abertas;processos_executados;clientes_distintos;contribuintes_distintos;horas_planejadas;horas_executadas;itens_com_horas_apontadas;tempo_medio_processo_h;registros;criacoes;edicoes;exclusoes;itens_distintos;dias_ativos;media_por_dia_ativo;tipo_mais_frequente;ultimo_registro',
    );
    expect(csv[1]).toBe('Maria Silva;0;0;0;1;1;1;3;4,5;1;4,5;2;1;1;0;1;1;2,0;task;2026-07-20T18:00:00.000Z');
  });

  it('deixa a célula vazia quando não há horas, em vez de escrever zero', () => {
    const linhas = agregarProdutividade(logsCsv, NOMES);
    expect(buildProdutividadeCsv(linhas).split('\n')[1])
      .toBe('Maria Silva;0;0;0;1;0;0;;;0;;2;1;1;0;1;1;2,0;task;2026-07-20T18:00:00.000Z');
  });

  it('escapa nome com ponto-e-vírgula', () => {
    const linhas = agregarProdutividade([log({ performed_by: 'u3' })], { u3: 'Souza; Bruno' });
    expect(buildProdutividadeCsv(linhas).split('\n')[1]).toContain('"Souza; Bruno"');
  });

  it('exporta só as colunas da aba pedida, na ordem dela', () => {
    const linhas = agregarProdutividade(
      logsCsv,
      NOMES,
      { a: { planejadas: 3, executadas: 4.5 } },
      { a: 'cli-A' },
      { a: 'contrib-1' },
    );

    const produtividade = buildProdutividadeCsv(linhas, COLUNAS_POR_VISAO.produtividade).split('\n');
    expect(produtividade[0]).toBe(
      'colaborador;projetos_abertos;projetos_finalizados;tarefas_abertas;processos_executados;clientes_distintos;contribuintes_distintos;horas_planejadas;horas_executadas;itens_com_horas_apontadas;tempo_medio_processo_h',
    );
    expect(produtividade[1]).toBe('Maria Silva;0;0;0;1;1;1;3;4,5;1;4,5');

    const atividade = buildProdutividadeCsv(linhas, COLUNAS_POR_VISAO.atividade).split('\n');
    expect(atividade[0]).toBe(
      'colaborador;registros;criacoes;edicoes;exclusoes;itens_distintos;dias_ativos;media_por_dia_ativo;tipo_mais_frequente;ultimo_registro',
    );
    expect(atividade[1]).toBe('Maria Silva;2;1;1;0;1;1;2,0;task;2026-07-20T18:00:00.000Z');
  });
});

describe('COLUNAS_POR_VISAO', () => {
  it('reparte todas as colunas entre as duas abas, repetindo só o colaborador', () => {
    const { produtividade, atividade } = COLUNAS_POR_VISAO;
    const repetidas = produtividade.filter(coluna => atividade.includes(coluna));

    expect(repetidas).toEqual(['nome']);
    expect([...produtividade, ...atividade.filter(c => c !== 'nome')].sort())
      .toEqual([...TODAS_AS_COLUNAS].sort());
  });

  it('abre cada aba ordenada por uma coluna que ela mostra', () => {
    expect(COLUNAS_POR_VISAO.produtividade).toContain(ORDENACAO_INICIAL.produtividade);
    expect(COLUNAS_POR_VISAO.atividade).toContain(ORDENACAO_INICIAL.atividade);
  });
});

describe('agregarClientePorProduto', () => {
  const concluiu = (entityId: string, over: Partial<AuditLog> = {}) => log({
    entity_id: entityId,
    action: 'updated',
    changed_fields: { status: { old: 'in_progress', new: 'done' } },
    ...over,
  });

  // t3 é tocado sem concluir; t4 é concluído sem cliente resolvido.
  const LOGS = [
    concluiu('t1', { performed_by: 'u1' }),
    concluiu('t2', { performed_by: 'u2' }),
    log({ entity_id: 't3', performed_by: 'u1' }),
    concluiu('t4', { performed_by: 'u1' }),
    concluiu('t5', { performed_by: 'u1' }),
  ];
  const HORAS = {
    t1: { planejadas: 2, executadas: 6 },
    t2: { planejadas: 3, executadas: 4 },
    t4: { planejadas: 1, executadas: 2 },
    t5: { planejadas: 5, executadas: 5 },
  };
  const PRODUTOS = { t1: 'prod-A', t2: 'prod-A', t3: 'prod-A', t4: 'prod-A', t5: 'prod-B' };
  // t4 fica de fora: é o item sem cliente resolvido.
  const CLIENTES = { t1: 'cli-1', t2: 'cli-1', t3: 'cli-2', t5: 'cli-1' };
  const NOMES_CLIENTE = { 'cli-1': 'Grupo Agro Norte', 'cli-2': 'Usina Leste' };

  const agregar = () => agregarClientePorProduto(
    LOGS, HORAS, PRODUTOS, CLIENTES, NOMES_CLIENTE, NOMES,
  );

  it('quebra o produto por cliente, do que mais consumiu hora para o que menos', () => {
    const { clientes } = agregar()['prod-A'];

    expect(clientes.map(c => c.nome)).toEqual([
      'Grupo Agro Norte',      // 10h executadas
      'Sem cliente identificado', // 2h
      'Usina Leste',           // sem apontamento vai para o fim
    ]);

    const [agro, semCliente, usina] = clientes;
    expect(agro.itensTocados).toBe(2);
    expect(agro.concluidos).toBe(2);
    expect(agro.horasPlanejadas).toBe(5);
    expect(agro.horasExecutadas).toBe(10);
    expect(agro.tempoMedio).toBe(5);

    expect(semCliente.clienteId).toBe(CLIENTE_SEM_VINCULO);
    expect(semCliente.concluidos).toBe(1);

    // Tocado e ainda aberto: aparece em Tocados, mas não vira hora nem média.
    expect(usina.itensTocados).toBe(1);
    expect(usina.concluidos).toBe(0);
    expect(usina.horasExecutadas).toBeNull();
    expect(usina.tempoMedio).toBeNull();
  });

  it('soma dos clientes fecha com a linha do produto', () => {
    const { clientes } = agregar()['prod-A'];
    // Buscar pelo id: `agregarPorProduto` vem ordenado por tempo médio, não pela
    // ordem em que os produtos aparecem nos logs.
    const produto = agregarPorProduto(LOGS, HORAS, PRODUTOS, {})
      .find(p => p.produtoId === 'prod-A')!;

    expect(clientes.reduce((t, c) => t + c.concluidos, 0)).toBe(produto.concluidos);
    expect(clientes.reduce((t, c) => t + (c.horasPlanejadas ?? 0), 0)).toBe(produto.horasPlanejadas);
    expect(clientes.reduce((t, c) => t + (c.horasExecutadas ?? 0), 0)).toBe(produto.horasExecutadas);
    expect(clientes.reduce((t, c) => t + c.itensComHorasExecutadas, 0))
      .toBe(produto.itensComHorasExecutadas);
  });

  it('lista quem executou dentro de cada cliente, e só naquele produto', () => {
    const porProduto = agregar();
    const noAgro = porProduto['prod-A'].pessoasPorCliente['cli-1'];

    expect(noAgro.map(p => p.nome)).toEqual(['Maria Silva', 'Bruno Souza']);
    expect(noAgro[0].horasExecutadas).toBe(6);
    expect(noAgro[1].horasExecutadas).toBe(4);

    // t5 é do mesmo cliente, mas de outro produto: não entra no painel do prod-A.
    expect(noAgro.reduce((t, p) => t + p.concluidos, 0)).toBe(2);
    expect(porProduto['prod-B'].pessoasPorCliente['cli-1']).toHaveLength(1);
  });

  it('conta o item uma vez no cliente e uma vez para cada pessoa que mexeu nele', () => {
    const logs = [...LOGS, log({ entity_id: 't1', performed_by: 'u2' })];
    const { clientes, pessoasPorCliente } = agregarClientePorProduto(
      logs, HORAS, PRODUTOS, CLIENTES, NOMES_CLIENTE, NOMES,
    )['prod-A'];

    const agro = clientes.find(c => c.clienteId === 'cli-1');
    expect(agro?.itensTocados).toBe(2);
    // Duas pessoas em t1: a soma das pessoas passa o total do cliente, de propósito.
    expect(pessoasPorCliente['cli-1'].reduce((t, p) => t + p.itensTocados, 0)).toBe(3);
  });
});
