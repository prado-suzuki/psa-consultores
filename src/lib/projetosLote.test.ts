import { describe, it, expect } from 'vitest';
import {
  buildInitialRows,
  buildLegacyLoteProjectName,
  buildLoteFormData,
  buildLoteFromOs,
  buildLoteOsOptionsByClient,
  buildProdutoLabel,
  buildProdutoNome,
  findProdutosJaCriados,
  resolveLoteRoutes,
  validateLoteRow,
  type LoteCommon,
  type LoteOsAberta,
  type LoteOsCandidata,
  type LoteOsProdutoContratado,
  type LoteProduto,
  type LoteRow,
} from './projetosLote';

const common: LoteCommon = {
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  status: 'active',
  description: 'Descrição da OS',
};

const baseRow: LoteRow = {
  produtoSegmentoId: 'cha',
  produtoLabel: 'CHA — Canal de Chamados',
  include: true,
  name: 'Cliente — OS 035/2026 — CHA — Canal de Chamados',
  equipeId: 'eq1',
  estruturaAreaId: 'area1',
  leaderIds: ['ricardo'],
  responsibleId: '',
  memberIds: ['m1', 'm2'],
  isMultidisciplinar: false,
  semExecutorFixo: false,
};

describe('validateLoteRow', () => {
  it('exige Responsável Executor no fluxo normal', () => {
    expect(validateLoteRow(baseRow, common))
      .toBe('CHA — Canal de Chamados: Selecione o Responsável Executor');
  });

  it('sem executor fixo: dispensa o Responsável Executor', () => {
    expect(validateLoteRow({ ...baseRow, semExecutorFixo: true }, common)).toBeNull();
  });

  it('sem executor fixo não dispensa líder nem membros', () => {
    const row = { ...baseRow, semExecutorFixo: true };
    expect(validateLoteRow({ ...row, leaderIds: [] }, common))
      .toBe('CHA — Canal de Chamados: Selecione ao menos um Líder Geral');
    expect(validateLoteRow({ ...row, memberIds: [] }, common))
      .toBe('CHA — Canal de Chamados: Selecione ao menos um Membro do Projeto');
  });
});

describe('findProdutosJaCriados', () => {
  const cliente = 'Agro Amazônia Produtos Agropecuários S.a.';
  const os = '035/2026';
  const produtos: LoteProduto[] = [
    { produtoSegmentoId: 'dc', produtoLabel: 'DC — Diagnóstico contábil', produtoNome: 'Diagnóstico contábil' },
    { produtoSegmentoId: 'cha', produtoLabel: 'CHA — Canal de Chamados', produtoNome: 'Canal de Chamados' },
    { produtoSegmentoId: 'af', produtoLabel: 'AF — Atendimento a fiscalizações', produtoNome: 'Atendimento a fiscalizações' },
  ];

  it('OS sem projeto: nada marcado como já criado', () => {
    expect(findProdutosJaCriados([], cliente, os, produtos)).toEqual([]);
  });

  it('reconhece pelo nome padrão atual (só o nome do produto)', () => {
    const existentes = [{ name: 'Canal de Chamados' }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['cha']);
  });

  it('reconhece o padrão antigo, criado antes do nome curto', () => {
    const existentes = [{ name: buildLegacyLoteProjectName(cliente, os, 'CHA — Canal de Chamados') }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['cha']);
  });

  it('ignora diferença de caixa e espaço extra nos dois formatos', () => {
    expect(findProdutosJaCriados([{ name: '  DIAGNÓSTICO CONTÁBIL  ' }], cliente, os, produtos)).toEqual(['dc']);
    const legado = buildLegacyLoteProjectName(cliente, os, 'DC — Diagnóstico contábil').toUpperCase();
    expect(findProdutosJaCriados([{ name: `  ${legado}  ` }], cliente, os, produtos)).toEqual(['dc']);
  });

  it('reconhece projeto renomeado que ainda carrega o rótulo do produto', () => {
    const existentes = [{ name: 'Chamados 2026 — AF — Atendimento a fiscalizações (revisado)' }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['af']);
  });

  it('renomeado sem o nome nem o rótulo escapa da detecção (limite conhecido)', () => {
    const existentes = [{ name: 'Projeto de chamados do Agro' }];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual([]);
  });

  it('marca todos quando a OS inteira já foi criada com o nome curto', () => {
    const existentes = produtos.map(produto => ({ name: produto.produtoNome }));
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['dc', 'cha', 'af']);
  });

  it('OS com os dois formatos misturados detecta ambos', () => {
    const existentes = [
      { name: 'Canal de Chamados' },
      { name: buildLegacyLoteProjectName(cliente, os, 'DC — Diagnóstico contábil') },
    ];
    expect(findProdutosJaCriados(existentes, cliente, os, produtos)).toEqual(['dc', 'cha']);
  });

  it('produto sem nome não casa com projeto de nome vazio', () => {
    const semNome: LoteProduto[] = [{ produtoSegmentoId: 'x', produtoLabel: '', produtoNome: '' }];
    expect(findProdutosJaCriados([{ name: '   ' }], cliente, os, semNome)).toEqual([]);
  });
});

describe('buildLoteFormData', () => {
  it('sem executor fixo: envia responsible_id vazio mesmo se algo tinha sido escolhido antes', () => {
    const row = { ...baseRow, responsibleId: 'e1', semExecutorFixo: true };
    expect(buildLoteFormData('cli1', 'os1', common, row).responsible_id).toBe('');
  });

  it('fluxo normal: envia o responsável escolhido', () => {
    const row = { ...baseRow, responsibleId: 'e1' };
    expect(buildLoteFormData('cli1', 'os1', common, row).responsible_id).toBe('e1');
  });
});

describe('resolveLoteRoutes', () => {
  it('mantém o fluxo dentro da área que abriu a tela', () => {
    expect(resolveLoteRoutes('tax')).toEqual({
      lote: '/equipe/tax/projetos/cadastro-lote',
      projetos: '/equipe/tax/projetos/cadastro',
      tarefas: '/equipe/tax/projetos/tarefas',
    });
    expect(resolveLoteRoutes('osg')).toEqual({
      lote: '/equipe/osg/projetos/cadastro-lote',
      projetos: '/equipe/osg/projetos/cadastro',
      tarefas: '/equipe/osg/projetos/tarefas',
    });
  });

  it('área sem tela de lote cai no Tax em vez de rota inexistente', () => {
    expect(resolveLoteRoutes('board').lote).toBe('/equipe/tax/projetos/cadastro-lote');
  });
});

describe('buildProdutoLabel', () => {
  const produto = (patch: Partial<LoteOsProdutoContratado>): LoteOsProdutoContratado =>
    ({ produto_segmento_id: 'ps1', produto_codigo: 'CHA', produto_nome: 'Canal de Chamados', ...patch });

  it('usa "CÓDIGO — Nome" (o formato que findProdutosJaCriados espera)', () => {
    expect(buildProdutoLabel(produto({}))).toBe('CHA — Canal de Chamados');
  });

  it('sem nome, cai no código', () => {
    expect(buildProdutoLabel(produto({ produto_nome: null }))).toBe('CHA');
  });

  it('sem código nem nome, cai no id do produto', () => {
    expect(buildProdutoLabel(produto({ produto_codigo: null, produto_nome: null }))).toBe('ps1');
  });
});

describe('buildLoteFromOs', () => {
  const cliente = { id: 'cli1', nome: '  Cliente Teste  ' };
  const osBase: LoteOsCandidata = {
    id: 'os1',
    numero_os: '035/2026',
    situacao: 'em_andamento',
    data_inicio: '2026-01-01',
    data_fim: '2026-12-31',
    observacoes: 'Escopo da OS',
  };
  const produtosOs: LoteOsProdutoContratado[] = [
    { produto_segmento_id: 'ps-cha', produto_codigo: 'CHA', produto_nome: 'Canal de Chamados' },
    { produto_segmento_id: 'ps-dc', produto_codigo: 'DC', produto_nome: 'Diagnóstico Contábil' },
  ];

  it('monta o snapshot da tela de lote a partir da OS e dos produtos', () => {
    expect(buildLoteFromOs(cliente, osBase, produtosOs)).toEqual({
      clientId: 'cli1',
      clientName: 'Cliente Teste',
      ordemServicoId: 'os1',
      osNumero: '035/2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'active',
      description: 'Escopo da OS',
      produtos: [
        { produtoSegmentoId: 'ps-cha', produtoLabel: 'CHA — Canal de Chamados', produtoNome: 'Canal de Chamados' },
        { produtoSegmentoId: 'ps-dc', produtoLabel: 'DC — Diagnóstico Contábil', produtoNome: 'Diagnóstico Contábil' },
      ],
    });
  });

  it('converte a situação da OS no status do projeto', () => {
    expect(buildLoteFromOs(cliente, { ...osBase, situacao: 'suspenso' }, produtosOs).status).toBe('on_hold');
  });

  it('situação desconhecida ou vazia cai em "active"', () => {
    expect(buildLoteFromOs(cliente, { ...osBase, situacao: null }, produtosOs).status).toBe('active');
    expect(buildLoteFromOs(cliente, { ...osBase, situacao: 'inventada' }, produtosOs).status).toBe('active');
  });

  it('campos ausentes da OS viram string vazia (a tela de lote valida depois)', () => {
    const vazia = buildLoteFromOs(
      cliente,
      { id: 'os2', numero_os: null, situacao: null, data_inicio: null, data_fim: null },
      [],
    );
    expect(vazia).toMatchObject({ osNumero: '', startDate: '', endDate: '', description: '', produtos: [] });
  });

  it('o nome padrão gerado casa com o que findProdutosJaCriados procura', () => {
    const state = buildLoteFromOs(cliente, osBase, produtosOs);
    const existentes = [{ name: buildInitialRows(state)[0].name }];
    expect(findProdutosJaCriados(existentes, state.clientName, state.osNumero, state.produtos)).toEqual(['ps-cha']);
  });

  it('separa rótulo e nome do produto', () => {
    const state = buildLoteFromOs(cliente, osBase, produtosOs);
    expect(state.produtos[0]).toEqual({
      produtoSegmentoId: 'ps-cha',
      produtoLabel: 'CHA — Canal de Chamados',
      produtoNome: 'Canal de Chamados',
    });
  });
});

describe('buildInitialRows', () => {
  const state = buildLoteFromOs(
    { id: 'cli1', nome: 'Fazenda Horizonte' },
    { id: 'os1', numero_os: '035/2026', situacao: 'em_andamento', data_inicio: '2026-01-01', data_fim: '2026-12-31' },
    [
      { produto_segmento_id: 'ps-cha', produto_codigo: 'CHA', produto_nome: 'Canal de Chamados' },
      { produto_segmento_id: 'ps-dc', produto_codigo: 'DC', produto_nome: 'Diagnóstico Contábil' },
    ],
  );

  it('o nome padrão é só o nome do produto, sem cliente, OS nem sigla', () => {
    expect(buildInitialRows(state).map(row => row.name)).toEqual(['Canal de Chamados', 'Diagnóstico Contábil']);
  });

  it('a linha guarda o rótulo completo para identificar o produto na tela', () => {
    expect(buildInitialRows(state)[0].produtoLabel).toBe('CHA — Canal de Chamados');
  });
});

describe('buildProdutoNome', () => {
  it('usa só o nome, deixando a sigla de fora', () => {
    expect(buildProdutoNome({ produto_segmento_id: 'ps1', produto_codigo: 'CHA', produto_nome: 'Canal de Chamados' }))
      .toBe('Canal de Chamados');
  });

  it('sem nome, cai no código para não gerar projeto sem nome', () => {
    expect(buildProdutoNome({ produto_segmento_id: 'ps1', produto_codigo: 'CHA', produto_nome: null })).toBe('CHA');
  });

  it('sem nome nem código, cai no id', () => {
    expect(buildProdutoNome({ produto_segmento_id: 'ps1', produto_codigo: null, produto_nome: null })).toBe('ps1');
  });
});

describe('buildLoteOsOptionsByClient', () => {
  const clientes = [
    { id: 'cli-1', nome: 'Fazenda Horizonte' },
    { id: 'cli-2', nome: 'Agro Cerrado' },
  ];

  const produto = (id: string, codigo: string, nome: string): LoteOsProdutoContratado =>
    ({ produto_segmento_id: id, produto_codigo: codigo, produto_nome: nome });

  const osAberta = (patch: Partial<LoteOsAberta>): LoteOsAberta => ({
    id: 'os-1',
    numero_os: '035/2026',
    cliente_id: 'cli-1',
    cliente_nome: 'Fazenda Horizonte',
    situacao: 'em_andamento',
    data_inicio: '2026-01-01',
    data_fim: '2026-12-31',
    observacoes: null,
    produtos: [produto('ps-cha', 'CHA', 'Canal de Chamados'), produto('ps-dc', 'DC', 'Diagnóstico Contábil')],
    ...patch,
  });

  it('conta os produtos que ainda não viraram projeto', () => {
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({})], []);
    expect(map.get('cli-1')).toHaveLength(1);
    expect(map.get('cli-1')?.[0]).toMatchObject({ total: 2, disponiveis: 2 });
  });

  it('OS de 3 produtos com 2 já criados sobra 1 (o caso que mantém o cliente na lista)', () => {
    const produtos = [
      produto('ps-cha', 'CHA', 'Canal de Chamados'),
      produto('ps-dc', 'DC', 'Diagnóstico Contábil'),
      produto('ps-af', 'AF', 'Auditoria Fiscal'),
    ];
    const projetos = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
      { name: 'Fazenda Horizonte — OS 035/2026 — DC — Diagnóstico Contábil', ordem_servico_id: 'os-1' },
    ];
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({ produtos })], projetos);
    expect(map.get('cli-1')?.[0]).toMatchObject({ total: 3, disponiveis: 1 });
  });

  it('OS esgotada fica com disponiveis 0 (some da lista de clientes, não da de OS)', () => {
    const projetos = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-1' },
      { name: 'Fazenda Horizonte — OS 035/2026 — DC — Diagnóstico Contábil', ordem_servico_id: 'os-1' },
    ];
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({})], projetos);
    expect(map.get('cli-1')?.[0].disponiveis).toBe(0);
  });

  it('projeto de outra OS não conta como já criado', () => {
    const projetos = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: 'os-outra' },
    ];
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({})], projetos);
    expect(map.get('cli-1')?.[0].disponiveis).toBe(2);
  });

  it('projeto sem OS vinculada é ignorado', () => {
    const projetos = [
      { name: 'Fazenda Horizonte — OS 035/2026 — CHA — Canal de Chamados', ordem_servico_id: null },
    ];
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({})], projetos);
    expect(map.get('cli-1')?.[0].disponiveis).toBe(2);
  });

  it('cliente sem OS aberta fica fora do mapa', () => {
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({})], []);
    expect(map.has('cli-2')).toBe(false);
  });

  it('casa por nome: OS sob o UUID do outro ambiente ainda encontra o cliente', () => {
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({ cliente_id: 'cli-1-prod' })], []);
    expect(map.has('cli-1')).toBe(true);
  });

  it('vincula o snapshot ao cliente da tela, não ao id_cliente da OS', () => {
    const map = buildLoteOsOptionsByClient(clientes, [osAberta({ cliente_id: 'cli-1-prod' })], []);
    expect(map.get('cli-1')?.[0].state.clientId).toBe('cli-1');
  });

  it('ordena as OS por número, tratando o número como número', () => {
    const rows = [
      osAberta({ id: 'os-10', numero_os: '010/2026' }),
      osAberta({ id: 'os-2', numero_os: '002/2026' }),
    ];
    const map = buildLoteOsOptionsByClient(clientes, rows, []);
    expect(map.get('cli-1')?.map(option => option.os.numero_os)).toEqual(['002/2026', '010/2026']);
  });
});
