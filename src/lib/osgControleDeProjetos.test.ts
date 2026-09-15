import { describe, expect, it } from 'vitest';

import {
  FILTROS_VAZIOS,
  filtrarControle,
  montarControleDeProjetos,
  ORDEM_PADRAO,
  opcoesDoControle,
  ordenarControle,
  prazoVencido,
  proximaOrdemDoControle,
  situacaoLabel,
  type ClienteCru,
  type OrdemCrua,
  type PessoaCrua,
  type ProdutoSegmento,
  type ProjetoDaOrdem,
} from '@/lib/osgControleDeProjetos';

const OSG = 'cluster-osg';
const TAX = 'cluster-tax';
const HOJE = '2026-09-15';

const produtoPorId = new Map<string, ProdutoSegmento>([
  ['p-gov', { id: 'p-gov', nome: 'Governança', cluster_id: OSG }],
  ['p-suc', { id: 'p-suc', nome: 'Planejamento Sucessório', cluster_id: OSG }],
  ['p-trib', { id: 'p-trib', nome: 'Planejamento Tributário', cluster_id: TAX }],
]);

const clientePorId = new Map<string, ClienteCru>([
  ['c-1', { id: 'c-1', nome: 'Di Domenico', ativo: true }],
  ['c-2', { id: 'c-2', nome: 'Anversa', ativo: false }],
]);

const pessoaPorId = new Map<string, PessoaCrua>([
  ['u-1', { id: 'u-1', first_name: 'Fernando', last_name: 'Prado' }],
  ['u-2', { id: 'u-2', first_name: 'Elvis', last_name: 'Souza' }],
]);

function ordem(over: Partial<OrdemCrua> = {}): OrdemCrua {
  return {
    id: 'os-1',
    numero_os: '111/2026',
    id_cliente: 'c-1',
    situacao: 'em_andamento',
    data_inicio: '2025-10-01',
    data_fim: '2026-12-30',
    observacoes: null,
    regiao: 'BRA',
    ...over,
  };
}

function projeto(over: Partial<ProjetoDaOrdem> = {}): ProjetoDaOrdem {
  return {
    id: 'proj-1',
    name: 'Governança',
    status: 'active',
    ordem_servico_id: 'os-1',
    responsible_id: 'u-2',
    leader_id: 'u-1',
    ...over,
  };
}

function montar(
  ordens: OrdemCrua[],
  contratados: Array<{ ordem_servico_id: string; produto_segmento_id: string }>,
  projetos: ProjetoDaOrdem[] = [],
) {
  return montarControleDeProjetos(
    ordens,
    contratados,
    produtoPorId,
    projetos,
    clientePorId,
    pessoaPorId,
    OSG,
    HOJE,
  );
}

describe('montarControleDeProjetos', () => {
  it('traz a OS que contrata produto da área', () => {
    const linhas = montar([ordem()], [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].clienteNome).toBe('Di Domenico');
    expect(linhas[0].produtos).toEqual(['Governança']);
  });

  it('deixa de fora a OS que só contrata produto de outra área', () => {
    const linhas = montar([ordem()], [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' }]);
    expect(linhas).toEqual([]);
  });

  it('mostra só os produtos da área numa OS mista', () => {
    const linhas = montar(
      [ordem()],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-suc' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
      ],
    );
    expect(linhas[0].produtos).toEqual(['Governança', 'Planejamento Sucessório']);
  });

  it('mantém a OS cujo produto da área está sem nome', () => {
    // O recorte é pela chave do mapa e não pelo tamanho da lista: produto sem
    // `nome` deixaria a lista vazia e a OS sumiria da tela.
    const semNome = new Map(produtoPorId);
    semNome.set('p-gov', { id: 'p-gov', nome: null, cluster_id: OSG });
    const linhas = montarControleDeProjetos(
      [ordem()],
      [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }],
      semNome,
      [],
      clientePorId,
      pessoaPorId,
      OSG,
      HOJE,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].produtos).toEqual([]);
  });

  it('junta os responsáveis dos projetos da OS sem repetir', () => {
    // É o caso Di Domenico: quatro projetos na mesma OS, o mesmo par de pessoas.
    const linhas = montar(
      [ordem()],
      [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }],
      [
        projeto({ id: 'proj-1' }),
        projeto({ id: 'proj-2' }),
        projeto({ id: 'proj-3', leader_id: 'u-2', responsible_id: 'u-2' }),
      ],
    );
    expect(linhas[0].responsaveis).toEqual(['Elvis Souza', 'Fernando Prado']);
    expect(linhas[0].projetos).toBe(3);
  });

  it('aceita OS sem projeto, com a coluna vazia', () => {
    // 61 dos 84 clientes da OSG com OS em produção estão assim.
    const linhas = montar([ordem()], [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }]);
    expect(linhas[0].responsaveis).toEqual([]);
    expect(linhas[0].projetos).toBe(0);
  });

  it('não esconde a linha do cliente inativo', () => {
    const linhas = montar(
      [ordem({ id: 'os-2', id_cliente: 'c-2' })],
      [{ ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' }],
    );
    expect(linhas[0].clienteAtivo).toBe(false);
  });

  it('nomeia o cliente fora do alcance da RLS em vez de sumir com a OS', () => {
    const linhas = montar(
      [ordem({ id: 'os-3', id_cliente: 'c-fora' })],
      [{ ordem_servico_id: 'os-3', produto_segmento_id: 'p-gov' }],
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0].clienteNome).toBe('Cliente não identificado');
  });

  it('ordena por nome de cliente', () => {
    const linhas = montar(
      [ordem(), ordem({ id: 'os-2', id_cliente: 'c-2' })],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
      ],
    );
    expect(linhas.map((linha) => linha.clienteNome)).toEqual(['Anversa', 'Di Domenico']);
  });

  it('ignora projeto sem OS vinculada', () => {
    const linhas = montar(
      [ordem()],
      [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }],
      [projeto({ ordem_servico_id: null })],
    );
    expect(linhas[0].projetos).toBe(0);
  });
});

describe('prazoVencido', () => {
  it('acusa prazo passado em OS em andamento', () => {
    expect(prazoVencido('2026-06-30', 'em_andamento', HOJE)).toBe(true);
  });

  it('acusa prazo passado em OS suspensa', () => {
    expect(prazoVencido('2026-06-30', 'suspenso', HOJE)).toBe(true);
  });

  it('não acusa OS concluída', () => {
    expect(prazoVencido('2026-06-30', 'concluido', HOJE)).toBe(false);
  });

  it('não acusa prazo no futuro', () => {
    expect(prazoVencido('2026-12-30', 'em_andamento', HOJE)).toBe(false);
  });

  it('não acusa OS sem prazo', () => {
    expect(prazoVencido(null, 'em_andamento', HOJE)).toBe(false);
  });

  it('não acusa no próprio dia do prazo', () => {
    expect(prazoVencido(HOJE, 'em_andamento', HOJE)).toBe(false);
  });
});

describe('situacaoLabel', () => {
  it('usa a palavra do cadastro, e nao a da planilha', () => {
    // A planilha diz "Hibernando"; o banco grava `suspenso` e o seletor de OS
    // ja chama isso de "Suspenso". Rotulo proprio desta tela faria duas telas
    // darem nomes diferentes ao mesmo valor.
    expect(situacaoLabel('suspenso')).toBe('Suspenso');
    expect(situacaoLabel('em_andamento')).toBe('Em andamento');
  });

  it('devolve o valor cru quando não há rótulo', () => {
    expect(situacaoLabel('valor_novo')).toBe('valor_novo');
  });

  it('nomeia a ausência', () => {
    expect(situacaoLabel(null)).toBe('Sem situação');
  });
});

describe('filtrarControle', () => {
  const linhas = montar(
    [
      ordem({ observacoes: 'Aguardando guia da Sefaz' }),
      ordem({ id: 'os-2', id_cliente: 'c-2', numero_os: '106/2026', regiao: 'MPT', situacao: 'suspenso' }),
    ],
    [
      { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
      { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
    ],
  );

  it('sem filtro devolve tudo', () => {
    expect(filtrarControle(linhas, FILTROS_VAZIOS)).toHaveLength(2);
  });

  it('filtra por situação', () => {
    const achadas = filtrarControle(linhas, { ...FILTROS_VAZIOS, situacao: 'suspenso' });
    expect(achadas.map((linha) => linha.clienteNome)).toEqual(['Anversa']);
  });

  it('filtra por região', () => {
    const achadas = filtrarControle(linhas, { ...FILTROS_VAZIOS, regiao: 'BRA' });
    expect(achadas.map((linha) => linha.clienteNome)).toEqual(['Di Domenico']);
  });

  it('busca por nome de cliente, sem depender de caixa', () => {
    expect(filtrarControle(linhas, { ...FILTROS_VAZIOS, busca: 'DOMENICO' })).toHaveLength(1);
  });

  it('busca por número da OS', () => {
    expect(filtrarControle(linhas, { ...FILTROS_VAZIOS, busca: '106/2026' })).toHaveLength(1);
  });

  it('busca dentro da observação, que é onde mora o motivo da parada', () => {
    const achadas = filtrarControle(linhas, { ...FILTROS_VAZIOS, busca: 'sefaz' });
    expect(achadas.map((linha) => linha.clienteNome)).toEqual(['Di Domenico']);
  });
});

describe('opcoesDoControle', () => {
  it('oferece só o que a lista tem, e a região na ordem do cadastro', () => {
    const linhas = montar(
      [
        ordem({ regiao: 'MPT' }),
        ordem({ id: 'os-2', id_cliente: 'c-2', regiao: 'BRA', situacao: 'suspenso' }),
      ],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
      ],
    );
    const opcoes = opcoesDoControle(linhas);
    // BRA vem antes de MPT porque é assim em REGIAO_OPTIONS, não por ordem alfabética.
    expect(opcoes.regioes).toEqual(['BRA', 'MPT']);
    expect(opcoes.situacoes).toEqual(['em_andamento', 'suspenso']);
  });

  it('põe no fim a praça que não está na lista das sete', () => {
    // O cadastro deixa `regiao` como texto livre, e produção tem "MT" e "PR".
    const linhas = montar(
      [ordem({ regiao: 'MT' }), ordem({ id: 'os-2', id_cliente: 'c-2', regiao: 'BRA' })],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
      ],
    );
    expect(opcoesDoControle(linhas).regioes).toEqual(['BRA', 'MT']);
  });
});

describe('proximaOrdemDoControle', () => {
  it('cicla crescente, decrescente e volta ao padrão', () => {
    const um = proximaOrdemDoControle(ORDEM_PADRAO, 'prazo');
    expect(um).toEqual({ campo: 'prazo', ascendente: true });
    const dois = proximaOrdemDoControle(um, 'prazo');
    expect(dois).toEqual({ campo: 'prazo', ascendente: false });
    expect(proximaOrdemDoControle(dois, 'prazo')).toEqual(ORDEM_PADRAO);
  });

  it('recomeça o ciclo ao trocar de coluna, em vez de herdar o sentido', () => {
    const decrescente = { campo: 'prazo' as const, ascendente: false };
    expect(proximaOrdemDoControle(decrescente, 'cliente')).toEqual({
      campo: 'cliente',
      ascendente: true,
    });
  });
});

describe('ordenarControle', () => {
  const tres = montar(
    [
      ordem({ id: 'os-1', numero_os: '106/2026', data_fim: '2026-12-30' }),
      ordem({ id: 'os-2', id_cliente: 'c-2', numero_os: '096/2026', data_fim: '2026-06-30' }),
      ordem({ id: 'os-3', id_cliente: 'c-fora', numero_os: '200/2025', data_fim: null }),
    ],
    [
      { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
      { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
      { ordem_servico_id: 'os-3', produto_segmento_id: 'p-gov' },
    ],
  );

  it('o padrão é alfabético por cliente', () => {
    expect(ordenarControle(tres, ORDEM_PADRAO).map((l) => l.clienteNome)).toEqual([
      'Anversa',
      'Cliente não identificado',
      'Di Domenico',
    ]);
  });

  it('ordena o prazo crescente com o vazio no fim', () => {
    const ordenadas = ordenarControle(tres, { campo: 'prazo', ascendente: true });
    expect(ordenadas.map((l) => l.dataFim)).toEqual(['2026-06-30', '2026-12-30', null]);
  });

  it('mantém o vazio no fim também no decrescente', () => {
    // O vazio não inverte com a direção: OS sem prazo no topo enterraria as
    // que têm, que são o motivo de clicar na coluna.
    const ordenadas = ordenarControle(tres, { campo: 'prazo', ascendente: false });
    expect(ordenadas.map((l) => l.dataFim)).toEqual(['2026-12-30', '2026-06-30', null]);
  });

  it('ordena a OS por ano e sequência, não como texto', () => {
    // Como texto, '200/2025' viria depois de '106/2026' pelo primeiro dígito.
    const ordenadas = ordenarControle(tres, { campo: 'os', ascendente: true });
    expect(ordenadas.map((l) => l.numeroOs)).toEqual(['200/2025', '096/2026', '106/2026']);
  });

  it('desempata por cliente quando a coluna empata', () => {
    // As três têm a mesma situação; a ordem de dentro do bloco tem de ser estável.
    const ordenadas = ordenarControle(tres, { campo: 'situacao', ascendente: true });
    expect(ordenadas.map((l) => l.clienteNome)).toEqual([
      'Anversa',
      'Cliente não identificado',
      'Di Domenico',
    ]);
  });

  it('não muta a lista recebida', () => {
    const antes = tres.map((l) => l.osId);
    ordenarControle(tres, { campo: 'prazo', ascendente: false });
    expect(tres.map((l) => l.osId)).toEqual(antes);
  });
});
