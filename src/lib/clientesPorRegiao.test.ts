import { describe, it, expect } from 'vitest';
import {
  agregarClientesPorRegiao,
  calcularFaixas,
  chaveMunicipio,
  escalaDaAgregacao,
  indiceDaFaixa,
  municipiosDaUf,
  normalizarMunicipio,
  normalizarUf,
  pintarEstados,
  rotuloFaixa,
  SEM_MUNICIPIO_ROTULO,
  SEM_UF,
  UF_SIGLAS,
  type ClienteRegiao,
} from './clientesPorRegiao';

const cliente = (over: Partial<ClienteRegiao> & { id: string }): ClienteRegiao => ({
  nome: 'Cliente',
  uf: 'MT',
  municipio: 'Cuiabá',
  ativo: true,
  ...over,
});

describe('normalizarUf', () => {
  it('aceita sigla minúscula', () => {
    expect(normalizarUf('sp')).toBe('SP');
    expect(normalizarUf('mt')).toBe('MT');
  });

  it('aceita sigla com espaço sobrando', () => {
    expect(normalizarUf('  SP  ')).toBe('SP');
    expect(normalizarUf(' rs')).toBe('RS');
    expect(normalizarUf('Sp ')).toBe('SP');
  });

  it('aceita o nome do estado por extenso, com e sem acento', () => {
    expect(normalizarUf('Mato Grosso')).toBe('MT');
    expect(normalizarUf('mato grosso do sul')).toBe('MS');
    expect(normalizarUf('SÃO PAULO')).toBe('SP');
    expect(normalizarUf('sao paulo')).toBe('SP');
    expect(normalizarUf('  Espirito   Santo ')).toBe('ES');
    expect(normalizarUf('Distrito Federal')).toBe('DF');
  });

  it('devolve null para uf inválida', () => {
    expect(normalizarUf('XX')).toBeNull();
    expect(normalizarUf('BR')).toBeNull();
    expect(normalizarUf('Brasil')).toBeNull();
    expect(normalizarUf('São Paulo - Capital')).toBeNull();
    expect(normalizarUf('')).toBeNull();
    expect(normalizarUf('   ')).toBeNull();
  });

  it('devolve null para uf nula/indefinida', () => {
    expect(normalizarUf(null)).toBeNull();
    expect(normalizarUf(undefined)).toBeNull();
  });
});

describe('normalizarMunicipio', () => {
  it('colapsa espaços e aplica capitalização consistente', () => {
    expect(normalizarMunicipio('  são   paulo ')).toBe('São Paulo');
    expect(normalizarMunicipio('CUIABA')).toBe('Cuiaba');
    expect(normalizarMunicipio('rio de janeiro')).toBe('Rio de Janeiro');
    expect(normalizarMunicipio('SANTO ANTONIO DO LESTE')).toBe('Santo Antonio do Leste');
  });

  it('capitaliza depois de hífen e apóstrofo', () => {
    expect(normalizarMunicipio('MOGI-MIRIM')).toBe('Mogi-Mirim');
    expect(normalizarMunicipio("olho d'agua")).toBe("Olho D'Agua");
  });

  it('devolve null para vazio/nulo', () => {
    expect(normalizarMunicipio('')).toBeNull();
    expect(normalizarMunicipio('   ')).toBeNull();
    expect(normalizarMunicipio(null)).toBeNull();
    expect(normalizarMunicipio(undefined)).toBeNull();
  });
});

describe('chaveMunicipio', () => {
  it('ignora acento e caixa — grafias diferentes viram a mesma chave', () => {
    expect(chaveMunicipio('São Paulo')).toBe(chaveMunicipio('SAO PAULO'));
    expect(chaveMunicipio('são  paulo')).toBe(chaveMunicipio('Sao Paulo'));
  });
});

describe('agregarClientesPorRegiao', () => {
  it('lista vazia devolve agregação zerada e sem UFs', () => {
    const ag = agregarClientesPorRegiao([]);
    expect(ag.totalClientes).toBe(0);
    expect(ag.totalValor).toBe(0);
    expect(ag.ufsComDado).toEqual([]);
    expect(ag.semUf.clientes).toBe(0);
    expect(ag.semUf.municipios).toEqual([]);
  });

  it('agrega por UF normalizando a sigla suja', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'mt' }),
      cliente({ id: '2', uf: ' MT ' }),
      cliente({ id: '3', uf: 'Mato Grosso' }),
      cliente({ id: '4', uf: 'sp', municipio: 'São Paulo' }),
    ]);

    expect(ag.porUf.MT.clientes).toBe(3);
    expect(ag.porUf.MT.valor).toBe(3);
    expect(ag.porUf.SP.clientes).toBe(1);
    expect(ag.porUf.MT.nome).toBe('Mato Grosso');
    expect(ag.totalClientes).toBe(4);
    expect(ag.ufsComDado).toEqual(['MT', 'SP']);
  });

  it('cliente com uf inválida ou nula NÃO desaparece — vai para o bucket semUf', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'MT' }),
      cliente({ id: '2', uf: 'XX', municipio: 'Qualquer' }),
      cliente({ id: '3', uf: null, municipio: null }),
      cliente({ id: '4', uf: '   ', municipio: '' }),
      cliente({ id: '5', uf: undefined }),
    ]);

    expect(ag.totalClientes).toBe(5);
    expect(ag.porUf.MT.clientes).toBe(1);
    expect(ag.semUf.clientes).toBe(4);
    expect(ag.semUf.uf).toBe(SEM_UF);
    expect(ag.semUf.nome).toBe('Sem UF informada');
    // O bucket sem UF nunca polui as UFs pintáveis do mapa.
    expect(ag.ufsComDado).toEqual(['MT']);
    expect(ag.porUf[SEM_UF]).toBeUndefined();
    // A soma fecha: UFs reais + semUf = total.
    const somaUf = ag.ufsComDado.reduce((t, uf) => t + ag.porUf[uf].clientes, 0);
    expect(somaUf + ag.semUf.clientes).toBe(ag.totalClientes);
  });

  it('município repetido com grafias diferentes vira UMA linha só', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'SP', municipio: 'são paulo' }),
      cliente({ id: '2', uf: 'SP', municipio: 'SAO PAULO' }),
      cliente({ id: '3', uf: 'SP', municipio: '  São   Paulo  ' }),
      cliente({ id: '4', uf: 'SP', municipio: 'Campinas' }),
    ]);

    const municipios = municipiosDaUf(ag, 'SP');
    expect(municipios).toHaveLength(2);
    expect(municipios[0].rotulo).toBe('São Paulo');
    expect(municipios[0].clientes).toBe(3);
    expect(municipios[1].rotulo).toBe('Campinas');
    expect(municipios[1].clientes).toBe(1);
  });

  it('município não informado ganha linha própria rotulada', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'BA', municipio: null }),
      cliente({ id: '2', uf: 'BA', municipio: '  ' }),
      cliente({ id: '3', uf: 'BA', municipio: 'Salvador' }),
    ]);

    const municipios = municipiosDaUf(ag, 'BA');
    expect(municipios).toHaveLength(2);
    const semMunicipio = municipios.find((m) => m.municipio === null);
    expect(semMunicipio?.rotulo).toBe(SEM_MUNICIPIO_ROTULO);
    expect(semMunicipio?.clientes).toBe(2);
  });

  it('municípios do bucket semUf também ficam acessíveis', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'XX', municipio: 'sinop' }),
      cliente({ id: '2', uf: null, municipio: 'SINOP' }),
    ]);

    const municipios = municipiosDaUf(ag, SEM_UF);
    expect(municipios).toHaveLength(1);
    expect(municipios[0].rotulo).toBe('Sinop');
    expect(municipios[0].clientes).toBe(2);
  });

  it('conta clientes ativos e inativos, sem descartar os inativos', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'GO', ativo: true }),
      cliente({ id: '2', uf: 'GO', ativo: false }),
      cliente({ id: '3', uf: 'GO', ativo: null }),
    ]);

    expect(ag.porUf.GO.clientes).toBe(3);
    expect(ag.porUf.GO.ativos).toBe(1);
    expect(ag.totalClientes).toBe(3);
    expect(ag.totalAtivos).toBe(1);
  });

  it('municípios saem ordenados do maior para o menor', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'MT', municipio: 'Sinop' }),
      cliente({ id: '2', uf: 'MT', municipio: 'Cuiabá' }),
      cliente({ id: '3', uf: 'MT', municipio: 'Cuiabá' }),
      cliente({ id: '4', uf: 'MT', municipio: 'Rondonópolis' }),
      cliente({ id: '5', uf: 'MT', municipio: 'Cuiabá' }),
    ]);

    expect(municipiosDaUf(ag, 'MT').map((m) => m.rotulo)).toEqual([
      'Cuiabá',
      'Rondonópolis',
      'Sinop',
    ]);
  });
});

describe('agregarClientesPorRegiao — peso parametrizável', () => {
  it('o peso padrão é 1 por cliente, ou seja, a contagem', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'MT' }),
      cliente({ id: '2', uf: 'MT' }),
    ]);
    expect(ag.porUf.MT.valor).toBe(ag.porUf.MT.clientes);
    expect(ag.totalValor).toBe(ag.totalClientes);
  });

  it('peso customizado soma outra métrica SEM mexer na contagem de clientes', () => {
    // Contrato que a coloração por outra métrica (ex.: faturamento) vai usar:
    // basta passar outro peso; a agregação e o mapa não mudam.
    const valores: Record<string, number> = { '1': 10, '2': 2.5, '3': 0 };
    const ag = agregarClientesPorRegiao(
      [
        cliente({ id: '1', uf: 'MT', municipio: 'Cuiabá' }),
        cliente({ id: '2', uf: 'MT', municipio: 'Cuiabá' }),
        cliente({ id: '3', uf: 'SP', municipio: 'São Paulo' }),
      ],
      (c) => valores[c.id] ?? 0,
    );

    expect(ag.porUf.MT.valor).toBe(12.5);
    expect(ag.porUf.MT.clientes).toBe(2);
    expect(ag.porUf.SP.valor).toBe(0);
    expect(ag.porUf.SP.clientes).toBe(1);
    expect(ag.totalValor).toBe(12.5);
    expect(ag.totalClientes).toBe(3);
    expect(municipiosDaUf(ag, 'MT')[0].valor).toBe(12.5);
    // Valor zero não apaga o cliente: SP continua com 1 cliente cadastrado.
    expect(ag.ufsComDado).toContain('SP');
  });

  it('peso não-finito não contamina a soma', () => {
    const ag = agregarClientesPorRegiao(
      [cliente({ id: '1', uf: 'MT' }), cliente({ id: '2', uf: 'MT' })],
      (c) => (c.id === '1' ? Number.NaN : 5),
    );
    expect(ag.porUf.MT.valor).toBe(5);
    expect(ag.porUf.MT.clientes).toBe(2);
  });
});

describe('calcularFaixas', () => {
  it('lista vazia não gera faixa nem divisão por zero', () => {
    const escala = calcularFaixas([]);
    expect(escala.faixas).toEqual([]);
    expect(escala.minimo).toBe(0);
    expect(escala.maximo).toBe(0);
    expect(indiceDaFaixa(0, escala)).toBeNull();
    expect(indiceDaFaixa(7, escala)).toBeNull();
  });

  it('só zeros equivale a não ter nada para colorir', () => {
    const escala = calcularFaixas([0, 0, 0]);
    expect(escala.faixas).toEqual([]);
  });

  it('um único valor gera UMA faixa não degenerada', () => {
    const escala = calcularFaixas([4]);
    expect(escala.faixas).toEqual([{ indice: 0, min: 4, max: 4 }]);
    expect(escala.minimo).toBe(4);
    expect(escala.maximo).toBe(4);
    expect(indiceDaFaixa(4, escala)).toBe(0);
    expect(rotuloFaixa(escala.faixas[0])).toBe('4');
  });

  it('o mesmo valor repetido também gera uma faixa só', () => {
    const escala = calcularFaixas([3, 3, 3, 3, 3, 3]);
    expect(escala.faixas).toHaveLength(1);
    expect(escala.faixas[0]).toEqual({ indice: 0, min: 3, max: 3 });
    expect(indiceDaFaixa(3, escala)).toBe(0);
  });

  it('menos valores distintos do que faixas pedidas → uma faixa por valor', () => {
    const escala = calcularFaixas([1, 2, 2, 5], 5);
    expect(escala.faixas).toEqual([
      { indice: 0, min: 1, max: 1 },
      { indice: 1, min: 2, max: 2 },
      { indice: 2, min: 5, max: 5 },
    ]);
  });

  it('faixas cobrem os valores em ordem, sem buraco e sem sobreposição', () => {
    const escala = calcularFaixas([1, 2, 3, 4, 5, 6, 40], 3);
    expect(escala.faixas).toHaveLength(3);
    expect(escala.minimo).toBe(1);
    expect(escala.maximo).toBe(40);
    escala.faixas.forEach((faixa, i) => {
      expect(faixa.min).toBeLessThanOrEqual(faixa.max);
      if (i > 0) expect(faixa.min).toBeGreaterThan(escala.faixas[i - 1].max);
    });
    expect(indiceDaFaixa(40, escala)).toBe(2);
    expect(indiceDaFaixa(1, escala)).toBe(0);
  });

  it('ignora valores negativos e não-finitos', () => {
    const escala = calcularFaixas([-5, Number.NaN, Number.POSITIVE_INFINITY, 2]);
    expect(escala.faixas).toEqual([{ indice: 0, min: 2, max: 2 }]);
  });

  it('valor acima do máximo cai na última faixa', () => {
    const escala = calcularFaixas([1, 2, 3], 3);
    expect(indiceDaFaixa(99, escala)).toBe(2);
  });

  it('quantidade inválida não quebra a escala', () => {
    expect(calcularFaixas([1, 2, 3], 0).faixas).toHaveLength(1);
    expect(calcularFaixas([1, 2, 3], -3).faixas).toHaveLength(1);
  });

  it('rotuloFaixa descreve intervalo e valor único', () => {
    expect(rotuloFaixa({ indice: 0, min: 2, max: 5 })).toBe('2 a 5');
    expect(rotuloFaixa({ indice: 0, min: 7, max: 7 })).toBe('7');
  });
});

describe('pintarEstados', () => {
  it('distingue "zero clientes" de valor real, e cobre as 27 UFs', () => {
    const ag = agregarClientesPorRegiao([
      cliente({ id: '1', uf: 'MT' }),
      cliente({ id: '2', uf: 'MT' }),
      cliente({ id: '3', uf: 'SP' }),
      cliente({ id: '4', uf: null }),
    ]);
    const escala = escalaDaAgregacao(ag);
    const pintura = pintarEstados(ag, escala);

    expect(Object.keys(pintura)).toHaveLength(27);
    expect(Object.keys(pintura).sort()).toEqual([...UF_SIGLAS].sort());

    expect(pintura.MT.categoria).toBe('faixa');
    expect(pintura.MT.valor).toBe(2);
    expect(pintura.MT.indiceFaixa).not.toBeNull();

    expect(pintura.SP.categoria).toBe('faixa');
    expect(pintura.SP.valor).toBe(1);

    // Estado sem cliente é ZERO (fato), nunca "sem dado".
    expect(pintura.AC.categoria).toBe('zero');
    expect(pintura.AC.valor).toBe(0);
    expect(pintura.AC.indiceFaixa).toBeNull();
    expect(pintura.AC.clientes).toBe(0);

    // O cliente sem UF não vira estado pintado nenhum.
    expect(pintura[SEM_UF]).toBeUndefined();
    expect(ag.semUf.clientes).toBe(1);
  });

  it('sem nenhum cliente, todos os estados ficam "zero" (e nada explode)', () => {
    const ag = agregarClientesPorRegiao([]);
    const pintura = pintarEstados(ag, escalaDaAgregacao(ag));
    expect(Object.values(pintura).every((e) => e.categoria === 'zero')).toBe(true);
  });
});
