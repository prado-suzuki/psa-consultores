import { describe, expect, it } from 'vitest';
import {
  SEM_FILTRO,
  cidadeUf,
  documentoFormatado,
  enderecoDeCobranca,
  filtrarLinhas,
  montarLinhasFaturamentoOs,
  opcoesDeCliente,
  opcoesDeEmpresa,
  opcoesDeOs,
  ordenarPorEntrada,
  quantidadeDeFiltros,
  situacaoLabel,
  type LinhaFaturamentoOs,
  type RawLogCriacaoOs,
  type RawOsFaturamento,
} from './admFinFaturamentoOs';

const os = (o: Partial<RawOsFaturamento> & { id: string }): RawOsFaturamento => ({
  numero_os: null,
  id_cliente: 'cli-1',
  contribuinte_id: null,
  cluster_id: null,
  situacao: 'em_andamento',
  created_at: '2026-09-01T10:00:00Z',
  id_servico: null,
  observacoes: null,
  data_emissao: null,
  data_inicio: null,
  data_fim: null,
  valor_projeto: null,
  numero_parcelas: null,
  valor_entrada: null,
  valor_reembolso_km: null,
  valor_reembolso_refeicao: null,
  ...o,
});

const CLIENTES = [{ id: 'cli-1', nome: '[TESTE] Aurora' }];
const CONTRIBUINTES = [
  {
    id: 'con-1',
    nome_razao_social: 'Aurora Agropecuária S.A.',
    tipo_pessoa: 'PJ',
    // Gravado SEM máscara de propósito: é assim que parte da base está, e a tela
    // tem de mostrar os dois jeitos iguais.
    cpf_cnpj: '26825052839506',
    inscricao_estadual: null,
    telefone: '65999998888',
    cep: '78000000',
    logradouro: 'Rua de Teste',
    complemento: null,
    numero: null,
    bairro: 'Centro',
    municipio: 'BARRA DO BUGRES',
    uf: 'MT',
  },
];
const CLUSTERS = [{ id: 'clu-1', name: 'PSA Norte', nome_empresa: 'Ouro Verde Transportes Ltda' }];
const CENTROS = [{ id: 'cc-1', codigo: 'CC-0006', nome: 'PSA CONSULTORIA EMPRESARIAL' }];

const montar = (osRows: RawOsFaturamento[], extra: Partial<Parameters<typeof montarLinhasFaturamentoOs>[0]> = {}) =>
  montarLinhasFaturamentoOs({
    os: osRows,
    clientes: CLIENTES,
    contribuintes: CONTRIBUINTES,
    clusters: CLUSTERS,
    rateio: [],
    centrosCusto: CENTROS,
    ...extra,
  });

describe('montarLinhasFaturamentoOs', () => {
  it('monta os quatro blocos da aba de Faturamento numa linha só', () => {
    const [linha] = montar([
      os({
        id: 'os-1',
        numero_os: '092/2026',
        contribuinte_id: 'con-1',
        cluster_id: 'clu-1',
        valor_projeto: 12000,
        valor_entrada: 2000,
        numero_parcelas: 5,
        valor_reembolso_km: 1.5,
        valor_reembolso_refeicao: 40,
      }),
    ]);

    expect(linha.cliente_nome).toBe('[TESTE] Aurora');
    expect(linha.situacao_label).toBe('Em andamento');
    expect(linha.contribuinte_nome).toBe('Aurora Agropecuária S.A.');
    expect(linha.cpf_cnpj).toBe('26.825.052/8395-06');
    expect(linha.telefone).toBe('(65) 99999-8888');
    expect(linha.cep).toBe('78000-000');
    expect(linha.endereco).toBe('Rua de Teste');
    expect(linha.cidade_uf).toBe('BARRA DO BUGRES / MT');
    // Derivado como na aba: (12000 - 2000) / 5.
    expect(linha.valor_parcela).toBe(2000);
    expect(linha.empresa_faturamento).toBe('Ouro Verde Transportes Ltda');
  });

  it('OS de cliente fora da lista sai — é o recorte de ambiente da tela', () => {
    const linhas = montar([os({ id: 'os-1' }), os({ id: 'os-2', id_cliente: 'cli-de-outro-ambiente' })]);
    expect(linhas.map((l) => l.os_id)).toEqual(['os-1']);
  });

  it('OS sem contribuinte e sem cluster continua na lista, com as células vazias', () => {
    const [linha] = montar([os({ id: 'os-1' })]);
    expect(linha.contribuinte_nome).toBeNull();
    expect(linha.empresa_faturamento).toBeNull();
    // Sem contribuinte não há sobre quem afirmar isenção.
    expect(linha.inscricao_estadual).toBeNull();
  });

  it('inscrição estadual em branco vira "Isento" quando há contribuinte', () => {
    const [linha] = montar([os({ id: 'os-1', contribuinte_id: 'con-1' })]);
    expect(linha.inscricao_estadual).toBe('Isento');
  });

  it('sem parcelamento não inventa parcela', () => {
    const [linha] = montar([os({ id: 'os-1', valor_projeto: 9000 })]);
    expect(linha.numero_parcelas).toBeNull();
    expect(linha.valor_parcela).toBeNull();
  });

  it('resolve o rateio pelo centro de custo, maior fatia primeiro', () => {
    const [linha] = montar([os({ id: 'os-1' })], {
      rateio: [
        { id_ordem_servico: 'os-1', id_centro_custo: 'cc-fantasma', percentual_rateio: 30 },
        { id_ordem_servico: 'os-1', id_centro_custo: 'cc-1', percentual_rateio: 70 },
        { id_ordem_servico: 'os-outra', id_centro_custo: 'cc-1', percentual_rateio: 100 },
      ],
    });
    expect(linha.rateio).toEqual([
      { label: 'CC-0006 - PSA CONSULTORIA EMPRESARIAL', percentual: 70 },
      // Centro de custo fora do catálogo cai no id em vez de sumir.
      { label: 'cc-fantasma', percentual: 30 },
    ]);
  });
});

describe('serviço, produtos, observação e contato', () => {
  const SERVICOS = [{ id: 'srv-1', nome: 'Planejamento Tributário' }];
  const CATALOGO = [
    { id: 'pro-1', codigo: 'P-01', nome: 'Governança' },
    { id: 'pro-2', codigo: 'P-02', nome: 'Sucessão' },
  ];

  it('traz o serviço, os produtos em ordem e as horas', () => {
    const [linha] = montar([os({ id: 'os-1', id_servico: 'srv-1' })], {
      servicos: SERVICOS,
      produtos: CATALOGO,
      produtosDaOs: [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'pro-2', horas_contratadas: 40 },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'pro-1', horas_contratadas: null },
        { ordem_servico_id: 'outra', produto_segmento_id: 'pro-1', horas_contratadas: 10 },
      ],
    });
    expect(linha.servico_nome).toBe('Planejamento Tributário');
    expect(linha.produtos).toEqual([
      { label: 'P-01 - Governança', horas: null },
      { label: 'P-02 - Sucessão', horas: 40 },
    ]);
  });

  it('observação em branco vira nulo, e não uma linha vazia na tela', () => {
    const [comEspaco] = montar([os({ id: 'os-1', observacoes: '   ' })]);
    expect(comEspaco.observacoes).toBeNull();
    const [comTexto] = montar([os({ id: 'os-2', observacoes: 'Serviços de Auditoria 2026' })]);
    expect(comTexto.observacoes).toBe('Serviços de Auditoria 2026');
  });

  it('contato: só quem tem e-mail ou telefone, com quem tem e-mail na frente', () => {
    const [linha] = montar([os({ id: 'os-1' })], {
      representantes: [
        { id_representante: 'r1', id_cliente: 'cli-1', nome: 'Zilda', cargo: null, email: null, telefone: '65999998888', tipo_representante: null },
        { id_representante: 'r2', id_cliente: 'cli-1', nome: 'Ana', cargo: 'Financeiro', email: 'ana@x.com', telefone: null, tipo_representante: null },
        { id_representante: 'r3', id_cliente: 'cli-1', nome: 'Sem contato', cargo: null, email: '  ', telefone: null, tipo_representante: null },
        { id_representante: 'r4', id_cliente: 'outro-cliente', nome: 'De outro', cargo: null, email: 'z@x.com', telefone: null, tipo_representante: null },
      ],
    });
    expect(linha.contatos).toEqual([
      { nome: 'Ana', cargo: 'Financeiro', email: 'ana@x.com', telefone: null },
      { nome: 'Zilda', cargo: null, email: null, telefone: '(65) 99999-8888' },
    ]);
  });

  it('as datas da OS vêm como estão, para a tela formatar', () => {
    const [linha] = montar([os({ id: 'os-1', data_emissao: '2026-03-12', data_fim: '2026-12-31' })]);
    expect(linha.data_emissao).toBe('2026-03-12');
    expect(linha.data_inicio).toBeNull();
    expect(linha.data_fim).toBe('2026-12-31');
  });
});

describe('criado_por', () => {
  const PERFIS = [
    { id: 'usr-1', first_name: 'Maritsa', last_name: 'Padilha' },
    { id: 'usr-2', first_name: 'Layara', last_name: 'Maranguelli' },
  ];
  const log = (l: Partial<RawLogCriacaoOs> = {}): RawLogCriacaoOs => ({
    entity_id: 'cli-1',
    entity_name: '092/2026',
    performed_by: 'usr-1',
    performed_at: '2026-09-01T10:00:02Z',
    ...l,
  });

  it('casa o log pelo par cliente + número da OS, não pelo id da OS', () => {
    // O log de criação guarda o id do CLIENTE em `entity_id` — é o defeito
    // conhecido de `useSaveClientTransaction`, e é o que esta função contorna.
    const [linha] = montar([os({ id: 'os-1', numero_os: '092/2026' })], {
      logsCriacao: [log()],
      perfis: PERFIS,
    });
    expect(linha.criado_por).toBe('Maritsa Padilha');
  });

  it('log de outro cliente com o mesmo número não vaza para esta OS', () => {
    const [linha] = montar([os({ id: 'os-1', numero_os: '092/2026' })], {
      logsCriacao: [log({ entity_id: 'cli-2', performed_by: 'usr-2' })],
      perfis: PERFIS,
    });
    expect(linha.criado_por).toBeNull();
  });

  it('OS sem número encontra o log pelo rótulo "(sem número)"', () => {
    const [linha] = montar([os({ id: 'os-1', numero_os: null })], {
      logsCriacao: [log({ entity_name: '(sem número)', performed_by: 'usr-2' })],
      perfis: PERFIS,
    });
    expect(linha.criado_por).toBe('Layara Maranguelli');
  });

  it('com dois logs para o mesmo par, o mais antigo é o criador', () => {
    const [linha] = montar([os({ id: 'os-1', numero_os: '092/2026' })], {
      logsCriacao: [
        log({ performed_by: 'usr-2', performed_at: '2026-09-05T08:00:00Z' }),
        log({ performed_by: 'usr-1', performed_at: '2026-09-01T10:00:02Z' }),
      ],
      perfis: PERFIS,
    });
    expect(linha.criado_por).toBe('Maritsa Padilha');
  });

  it('OS anterior à trilha de auditoria fica sem criador, e não com um chute', () => {
    const [linha] = montar([os({ id: 'os-1', numero_os: '001/2026' })], {
      logsCriacao: [log()],
      perfis: PERFIS,
    });
    expect(linha.criado_por).toBeNull();
  });

  it('autor sem perfil legível some em vez de virar UUID na tela', () => {
    const [linha] = montar([os({ id: 'os-1', numero_os: '092/2026' })], {
      logsCriacao: [log({ performed_by: 'usr-fantasma' })],
      perfis: PERFIS,
    });
    expect(linha.criado_por).toBeNull();
  });
});

describe('ordenarPorEntrada', () => {
  const linha = (l: Partial<LinhaFaturamentoOs> & { os_id: string }) =>
    ({ numero_os: null, entrou_em: null, ...l }) as LinhaFaturamentoOs;

  it('a mais recente no topo', () => {
    const ordenada = ordenarPorEntrada([
      linha({ os_id: 'antiga', entrou_em: '2026-01-05T09:00:00Z' }),
      linha({ os_id: 'nova', entrou_em: '2026-09-14T09:00:00Z' }),
      linha({ os_id: 'meio', entrou_em: '2026-05-02T09:00:00Z' }),
    ]);
    expect(ordenada.map((l) => l.os_id)).toEqual(['nova', 'meio', 'antiga']);
  });

  it('OS sem data de entrada vai para o fim, não para o topo', () => {
    const ordenada = ordenarPorEntrada([
      linha({ os_id: 'sem-data' }),
      linha({ os_id: 'com-data', entrou_em: '2026-01-05T09:00:00Z' }),
    ]);
    expect(ordenada.map((l) => l.os_id)).toEqual(['com-data', 'sem-data']);
  });

  it('empate de timestamp (carga em lote) desempata pelo número da OS', () => {
    const mesmoInstante = '2026-07-09T13:00:00Z';
    const ordenada = ordenarPorEntrada([
      linha({ os_id: 'a', numero_os: '009/2026', entrou_em: mesmoInstante }),
      linha({ os_id: 'b', numero_os: '101/2026', entrou_em: mesmoInstante }),
      linha({ os_id: 'c', numero_os: '020/2026', entrou_em: mesmoInstante }),
    ]);
    expect(ordenada.map((l) => l.numero_os)).toEqual(['101/2026', '020/2026', '009/2026']);
  });

  it('não altera o array recebido', () => {
    const entrada = [
      linha({ os_id: 'antiga', entrou_em: '2026-01-05T09:00:00Z' }),
      linha({ os_id: 'nova', entrou_em: '2026-09-14T09:00:00Z' }),
    ];
    ordenarPorEntrada(entrada);
    expect(entrada.map((l) => l.os_id)).toEqual(['antiga', 'nova']);
  });
});

describe('filtrarLinhas', () => {
  const OUTRO_CLIENTE = [...CLIENTES, { id: 'cli-2', nome: '[TESTE] Bravo' }];
  const linhas = montar(
    [
      os({ id: 'os-1', numero_os: '092/2026', contribuinte_id: 'con-1', cluster_id: 'clu-1' }),
      os({ id: 'os-2', numero_os: 'OS-TESTE-B' }),
      os({ id: 'os-3', numero_os: '077/2026', id_cliente: 'cli-2', cluster_id: 'clu-1' }),
    ],
    { clientes: OUTRO_CLIENTE },
  );

  it('sem filtro nenhum, devolve tudo', () => {
    expect(filtrarLinhas(linhas, SEM_FILTRO)).toHaveLength(3);
  });

  it('recorta por cliente, por empresa e por OS', () => {
    expect(filtrarLinhas(linhas, { ...SEM_FILTRO, clienteId: 'cli-2' }).map((l) => l.os_id))
      .toEqual(['os-3']);
    expect(filtrarLinhas(linhas, { ...SEM_FILTRO, clusterId: 'clu-1' }).map((l) => l.os_id).sort())
      .toEqual(['os-1', 'os-3']);
    expect(filtrarLinhas(linhas, { ...SEM_FILTRO, osId: 'os-2' }).map((l) => l.numero_os))
      .toEqual(['OS-TESTE-B']);
  });

  it('os filtros se somam, não se substituem', () => {
    expect(filtrarLinhas(linhas, { ...SEM_FILTRO, clienteId: 'cli-1', clusterId: 'clu-1' }).map((l) => l.os_id))
      .toEqual(['os-1']);
  });

  it('OS sem empresa não aparece quando se filtra por uma empresa', () => {
    const semEmpresa = filtrarLinhas(linhas, { ...SEM_FILTRO, clusterId: 'clu-1' });
    expect(semEmpresa.map((l) => l.os_id)).not.toContain('os-2');
  });

  it('conta os filtros ativos para o botão de limpar', () => {
    expect(quantidadeDeFiltros(SEM_FILTRO)).toBe(0);
    expect(quantidadeDeFiltros({ clienteId: 'cli-1', clusterId: 'clu-1', osId: null })).toBe(2);
  });
});

describe('opções dos filtros', () => {
  const OUTRO_CLIENTE = [...CLIENTES, { id: 'cli-2', nome: '[TESTE] Alfa' }];
  const linhas = montar(
    [
      os({ id: 'os-1', numero_os: '092/2026', contribuinte_id: 'con-1', cluster_id: 'clu-1' }),
      os({ id: 'os-2', numero_os: '091/2026', cluster_id: 'clu-1' }),
      os({ id: 'os-3', numero_os: '077/2026', id_cliente: 'cli-2' }),
    ],
    { clientes: OUTRO_CLIENTE },
  );

  it('cliente: um por cliente com OS, em ordem alfabética', () => {
    expect(opcoesDeCliente(linhas).map((c) => c.nome)).toEqual(['[TESTE] Alfa', '[TESTE] Aurora']);
  });

  it('empresa: só as que aparecem em alguma OS, sem repetir', () => {
    expect(opcoesDeEmpresa(linhas)).toEqual([
      { id: 'clu-1', nome: 'Ouro Verde Transportes Ltda' },
    ]);
  });

  it('OS: na ordem da lista, com cliente e documento para a busca', () => {
    const opcoes = opcoesDeOs(linhas);
    expect(opcoes.map((o) => o.id)).toEqual(linhas.map((l) => l.os_id));
    expect(opcoes[0]).toEqual({
      id: 'os-1',
      numero: '092/2026',
      cliente: '[TESTE] Aurora',
      documento: '26.825.052/8395-06',
    });
  });

  it('OS sem número não vira opção em branco', () => {
    const [semNumero] = opcoesDeOs(montar([os({ id: 'os-x' })]));
    expect(semNumero.numero).toBe('sem número');
  });
});

describe('documentoFormatado', () => {
  it('mascara o que está gravado cru, dos dois tipos', () => {
    expect(documentoFormatado('26825052839506', 'PJ')).toBe('26.825.052/8395-06');
    expect(documentoFormatado('12345678909', 'PF')).toBe('123.456.789-09');
  });

  it('sem tipo de pessoa, decide pela contagem de dígitos', () => {
    expect(documentoFormatado('12345678909', null)).toBe('123.456.789-09');
    expect(documentoFormatado('26825052839506', null)).toBe('26.825.052/8395-06');
  });

  it('documento de tamanho estranho volta como está, sem inventar máscara', () => {
    expect(documentoFormatado('123', 'PF')).toBe('123');
    expect(documentoFormatado('', 'PJ')).toBeNull();
    expect(documentoFormatado(null, null)).toBeNull();
  });
});

describe('rótulos e endereço', () => {
  it('situação fora da lista volta como veio', () => {
    expect(situacaoLabel('concluido')).toBe('Concluído');
    expect(situacaoLabel('situacao_nova_do_banco')).toBe('situacao_nova_do_banco');
    expect(situacaoLabel(null)).toBe('—');
  });

  it('endereço junta o complemento; sem logradouro não há endereço', () => {
    expect(enderecoDeCobranca({ logradouro: 'Rua A', complemento: 'sala 3' })).toBe('Rua A, sala 3');
    expect(enderecoDeCobranca({ logradouro: 'Rua A', complemento: null })).toBe('Rua A');
    expect(enderecoDeCobranca({ logradouro: null, complemento: 'sala 3' })).toBeNull();
    expect(enderecoDeCobranca(undefined)).toBeNull();
  });

  it('cidade sem UF não vira "cidade / "', () => {
    expect(cidadeUf({ municipio: 'Cuiabá', uf: null })).toBe('Cuiabá');
    expect(cidadeUf({ municipio: null, uf: 'MT' })).toBeNull();
  });
});
