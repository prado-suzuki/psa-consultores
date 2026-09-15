import { describe, expect, it } from 'vitest';

import {
  FILTROS_VAZIOS,
  ORDEM_PADRAO,
  filtrarControle,
  montarControleDeProjetos,
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

const nomeDoCluster = new Map<string, string>([
  [OSG, 'OSG'],
  [TAX, 'TAX'],
]);

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
  ['u-3', { id: 'u-3', first_name: 'Monica', last_name: 'Matunaga' }],
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
    produto_segmento_id: 'p-gov',
    responsible_id: 'u-2',
    leader_id: 'u-1',
    ...over,
  };
}

function montar(
  ordens: OrdemCrua[],
  contratados: Array<{ ordem_servico_id: string; produto_segmento_id: string }>,
  projetos: ProjetoDaOrdem[] = [],
  produtos = produtoPorId,
) {
  return montarControleDeProjetos(
    ordens,
    contratados,
    produtos,
    projetos,
    clientePorId,
    pessoaPorId,
    nomeDoCluster,
    OSG,
    HOJE,
  );
}

describe('montarControleDeProjetos', () => {
  it('faz uma linha por produto contratado', () => {
    const linhas = montar(
      [ordem()],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-suc' },
      ],
    );
    expect(linhas.map((l) => l.produtoNome)).toEqual(['Governança', 'Planejamento Sucessório']);
    expect(linhas.every((l) => l.osId === 'os-1')).toBe(true);
  });

  it('MOSTRA o produto de outra área, marcado com a área dele', () => {
    // É o caso Família Lunardi: três produtos OSG e cinco TAX na mesma OS. No
    // grão da OS os cinco desapareciam dentro de uma célula.
    const linhas = montar(
      [ordem()],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' },
      ],
    );
    const tributario = linhas.find((l) => l.produtoNome === 'Planejamento Tributário');
    expect(tributario?.area).toBe('TAX');
    expect(tributario?.daArea).toBe(false);
    expect(linhas.find((l) => l.produtoNome === 'Governança')?.daArea).toBe(true);
  });

  it('deixa de fora a OS que não contrata nenhum produto da área', () => {
    const linhas = montar([ordem()], [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' }]);
    expect(linhas).toEqual([]);
  });

  it('dá a cada produto o responsável do projeto DAQUELE produto', () => {
    // Sem casar por produto, o executor da TAX apareceria na linha da OSG.
    const linhas = montar(
      [ordem()],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' },
      ],
      [
        projeto({ id: 'proj-1', produto_segmento_id: 'p-gov' }),
        projeto({
          id: 'proj-2',
          produto_segmento_id: 'p-trib',
          leader_id: null,
          responsible_id: 'u-3',
        }),
      ],
    );
    expect(linhas.find((l) => l.produtoNome === 'Governança')?.responsaveis).toEqual([
      'Elvis Souza',
      'Fernando Prado',
    ]);
    expect(linhas.find((l) => l.produtoNome === 'Planejamento Tributário')?.responsaveis).toEqual([
      'Monica Matunaga',
    ]);
  });

  it('junta sem repetir quando o par OS/produto tem mais de um projeto', () => {
    // São 3 pares assim em produção.
    const linhas = montar(
      [ordem()],
      [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }],
      [
        projeto({ id: 'proj-1' }),
        projeto({ id: 'proj-2', leader_id: 'u-2', responsible_id: 'u-2' }),
      ],
    );
    expect(linhas[0].responsaveis).toEqual(['Elvis Souza', 'Fernando Prado']);
    expect(linhas[0].projetos).toBe(2);
  });

  it('deixa a coluna vazia no produto sem projeto', () => {
    const linhas = montar([ordem()], [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }]);
    expect(linhas[0].responsaveis).toEqual([]);
    expect(linhas[0].projetos).toBe(0);
  });

  it('ignora projeto sem produto, em vez de pendurá-lo num produto qualquer', () => {
    // São 2 em produção. Pendurar poria o responsável no produto errado.
    const linhas = montar(
      [ordem()],
      [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }],
      [projeto({ produto_segmento_id: null })],
    );
    expect(linhas[0].projetos).toBe(0);
  });

  it('ignora projeto sem OS vinculada', () => {
    const linhas = montar(
      [ordem()],
      [{ ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' }],
      [projeto({ ordem_servico_id: null })],
    );
    expect(linhas[0].projetos).toBe(0);
  });

  it('nomeia o produto e a área que não reconhece, em vez de sumir com a linha', () => {
    const comOrfao = new Map(produtoPorId);
    comOrfao.set('p-orfao', { id: 'p-orfao', nome: null, cluster_id: null });
    const linhas = montar(
      [ordem()],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-orfao' },
      ],
      [],
      comOrfao,
    );
    expect(linhas).toHaveLength(2);
    const orfao = linhas.find((l) => l.produtoId === 'p-orfao');
    expect(orfao?.produtoNome).toBe('Produto não identificado');
    expect(orfao?.area).toBe('Sem área');
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
    expect(linhas[0].clienteNome).toBe('Cliente não identificado');
  });

  it('ordena por cliente, com a área desta página antes da outra', () => {
    const linhas = montar(
      [ordem(), ordem({ id: 'os-2', id_cliente: 'c-2' })],
      [
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' },
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-suc' },
        { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
      ],
    );
    expect(linhas.map((l) => `${l.clienteNome}/${l.produtoNome}`)).toEqual([
      'Anversa/Governança',
      'Di Domenico/Planejamento Sucessório',
      'Di Domenico/Planejamento Tributário',
    ]);
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
  it('usa a palavra do cadastro, e não a da planilha', () => {
    // A planilha diz "Hibernando"; o banco grava `suspenso` e o seletor de OS
    // já chama isso de "Suspenso".
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
      ordem({
        id: 'os-2',
        id_cliente: 'c-2',
        numero_os: '106/2026',
        regiao: 'MPT',
        situacao: 'suspenso',
      }),
    ],
    [
      { ordem_servico_id: 'os-1', produto_segmento_id: 'p-gov' },
      { ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' },
      { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
    ],
  );

  it('sem filtro devolve tudo', () => {
    expect(filtrarControle(linhas, FILTROS_VAZIOS)).toHaveLength(3);
  });

  it('filtra por área, que é o recorte novo do grão por produto', () => {
    const achadas = filtrarControle(linhas, { ...FILTROS_VAZIOS, area: 'TAX' });
    expect(achadas.map((l) => l.produtoNome)).toEqual(['Planejamento Tributário']);
  });

  it('filtra por situação', () => {
    const achadas = filtrarControle(linhas, { ...FILTROS_VAZIOS, situacao: 'suspenso' });
    expect(achadas.map((l) => l.clienteNome)).toEqual(['Anversa']);
  });

  it('filtra por região', () => {
    expect(filtrarControle(linhas, { ...FILTROS_VAZIOS, regiao: 'BRA' })).toHaveLength(2);
  });

  it('busca por nome de produto', () => {
    const achadas = filtrarControle(linhas, { ...FILTROS_VAZIOS, busca: 'tributário' });
    expect(achadas).toHaveLength(1);
  });

  it('busca por nome de cliente, sem depender de caixa', () => {
    expect(filtrarControle(linhas, { ...FILTROS_VAZIOS, busca: 'DOMENICO' })).toHaveLength(2);
  });

  it('busca dentro da observação, que é onde mora o motivo da parada', () => {
    expect(filtrarControle(linhas, { ...FILTROS_VAZIOS, busca: 'sefaz' })).toHaveLength(2);
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
        { ordem_servico_id: 'os-1', produto_segmento_id: 'p-trib' },
        { ordem_servico_id: 'os-2', produto_segmento_id: 'p-gov' },
      ],
    );
    const opcoes = opcoesDoControle(linhas);
    // BRA antes de MPT porque é assim em REGIAO_OPTIONS, não por ordem alfabética.
    expect(opcoes.regioes).toEqual(['BRA', 'MPT']);
    expect(opcoes.situacoes).toEqual(['em_andamento', 'suspenso']);
    expect(opcoes.areas).toEqual(['OSG', 'TAX']);
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
    const ordenadas = ordenarControle(tres, { campo: 'prazo', ascendente: false });
    expect(ordenadas.map((l) => l.dataFim)).toEqual(['2026-12-30', '2026-06-30', null]);
  });

  it('ordena a OS por ano e sequência, não como texto', () => {
    const ordenadas = ordenarControle(tres, { campo: 'os', ascendente: true });
    expect(ordenadas.map((l) => l.numeroOs)).toEqual(['200/2025', '096/2026', '106/2026']);
  });

  it('desempata pela ordem padrão quando a coluna empata', () => {
    const ordenadas = ordenarControle(tres, { campo: 'situacao', ascendente: true });
    expect(ordenadas.map((l) => l.clienteNome)).toEqual([
      'Anversa',
      'Cliente não identificado',
      'Di Domenico',
    ]);
  });

  it('não muta a lista recebida', () => {
    const antes = tres.map((l) => l.chave);
    ordenarControle(tres, { campo: 'prazo', ascendente: false });
    expect(tres.map((l) => l.chave)).toEqual(antes);
  });
});
