import { describe, expect, it } from 'vitest';
import {
  PROJECT_AREA_SOURCE_ALIASES,
  PROJECT_CLIENT_NAME_ALIASES,
  PROJECT_NAME_ALIASES,
  buildProjectImportPayload,
  deduplicateProjectImportPayloads,
  inferProjectArea,
  isValidProjectImportPayload,
  normalizeProjectImportRow,
  prepareProjectImportPayloads,
  readFirstTruthySpreadsheetValue,
  type ProjectImportPayload,
} from '@/lib/equipeProjetos';

describe('readFirstTruthySpreadsheetValue', () => {
  it.each(['Projeto', 'projeto', 'Project', 'name', 'Nome', 'nome'])(
    'aceita o alias de nome %s',
    (alias) => {
      expect(
        readFirstTruthySpreadsheetValue({ [alias]: 'Projeto importado' }, PROJECT_NAME_ALIASES),
      ).toBe('Projeto importado');
    },
  );

  it('respeita a precedência dos aliases e ignora valores falsy', () => {
    const row = {
      Projeto: '',
      projeto: 0,
      Project: false,
      name: null,
      Nome: 'Primeiro valor truthy',
      nome: 'Valor posterior',
    };

    expect(readFirstTruthySpreadsheetValue(row, PROJECT_NAME_ALIASES)).toBe(
      'Primeiro valor truthy',
    );
  });

  it('retorna string vazia quando nenhum alias possui valor truthy', () => {
    expect(
      readFirstTruthySpreadsheetValue(
        { Projeto: 0, projeto: false, Project: null, name: undefined },
        PROJECT_NAME_ALIASES,
      ),
    ).toBe('');
  });
});

describe('normalizeProjectImportRow', () => {
  it.each(['Cliente', 'cliente', 'Client', 'Empresa', 'empresa'])(
    'aceita o alias de origem da área %s',
    (alias) => {
      const normalized = normalizeProjectImportRow({
        Projeto: 'Projeto',
        [alias]: 'Origem',
      });

      expect(normalized.areaSource).toBe('Origem');
    },
  );

  it.each(['Empresa', 'empresa'])('aceita o alias de cliente %s', (alias) => {
    const normalized = normalizeProjectImportRow({
      Projeto: 'Projeto',
      [alias]: 'Cliente final',
    });

    expect(normalized.clientName).toBe('Cliente final');
  });

  it('usa Cliente para a área antes de Empresa, mas mantém Empresa como cliente', () => {
    expect(
      normalizeProjectImportRow({
        Projeto: 'Projeto',
        Cliente: 'Origem prioritária',
        Empresa: 'Cliente do payload',
      }),
    ).toEqual({
      name: 'Projeto',
      areaSource: 'Origem prioritária',
      clientName: 'Cliente do payload',
    });
  });

  it('aplica trim ao nome e produz nome vazio quando só há espaços', () => {
    expect(normalizeProjectImportRow({ Nome: '  Projeto com espaços\t' }).name).toBe(
      'Projeto com espaços',
    );
    expect(normalizeProjectImportRow({ Projeto: ' \n\t ' }).name).toBe('');
  });

  it.each([
    ['número truthy', 42, '42'],
    ['booleano truthy', true, 'true'],
    ['zero', 0, ''],
    ['booleano false', false, ''],
    ['objeto unknown', { código: 1 }, '[object Object]'],
  ])('converte o nome em linha com %s conforme a coerção atual', (_case, value, expected) => {
    expect(normalizeProjectImportRow({ Projeto: value }).name).toBe(expected);
  });

  it('aplica truthiness separadamente aos aliases de área e cliente', () => {
    const normalized = normalizeProjectImportRow({
      Projeto: 'Projeto',
      Cliente: false,
      cliente: 0,
      Client: '',
      Empresa: false,
      empresa: 'Empresa posterior',
    });

    expect(normalized.areaSource).toBe('Empresa posterior');
    expect(normalized.clientName).toBe('Empresa posterior');
  });

  it('usa as listas de aliases esperadas', () => {
    expect(PROJECT_AREA_SOURCE_ALIASES).toEqual([
      'Cliente',
      'cliente',
      'Client',
      'Empresa',
      'empresa',
    ]);
    expect(PROJECT_CLIENT_NAME_ALIASES).toEqual(['Empresa', 'empresa']);
  });
});

describe('inferProjectArea', () => {
  it.each<[string, unknown, string]>([
    ['undefined', undefined, 'Geral'],
    ['null', null, 'Geral'],
    ['string vazia', '', 'Geral'],
    ['zero', 0, 'Geral'],
    ['false', false, 'Geral'],
    ['Fiscal em caixa mista', 'operação FiScAl', 'Fiscal'],
    ['nome Ricardo', 'Equipe Ricardo', 'Fiscal'],
    ['Consultoria em caixa alta', 'CONSULTORIA', 'Consultoria'],
    ['nome Felipe', 'Carteira Felipe', 'Consultoria'],
    ['Fixos em caixa mista', 'Custos FiXoS', 'Fixos'],
    ['nome Washington', 'Washington Silva', 'Fixos'],
    ['texto sem correspondência', 'Operações', 'Transversal'],
    ['número truthy', 123, 'Transversal'],
    ['booleano truthy', true, 'Transversal'],
    ['objeto unknown convertido para string', { toString: () => 'núcleo fiscal' }, 'Fiscal'],
  ])('infere a área para %s', (_case, value, expected) => {
    expect(inferProjectArea(value)).toBe(expected);
  });

  it('mantém a precedência Fiscal, Consultoria e Fixos quando há múltiplas marcas', () => {
    expect(inferProjectArea('consultoria fixos fiscal')).toBe('Fiscal');
    expect(inferProjectArea('fixos consultoria')).toBe('Consultoria');
  });
});

describe('buildProjectImportPayload', () => {
  it('monta os campos fixos, a área inferida, o cliente e o usuário', () => {
    expect(
      buildProjectImportPayload(
        {
          name: 'Projeto fiscal',
          areaSource: 'Equipe Ricardo',
          clientName: 'Empresa XPTO',
        },
        'user-1',
      ),
    ).toEqual({
      name: 'Projeto fiscal',
      description: 'Área: Fiscal | Prioridade: Média',
      status: 'active',
      client_name: 'Empresa XPTO',
      created_by: 'user-1',
    });
  });

  it.each([undefined, null, '', 0, false])(
    'usa PSA CONSULTORES quando clientName é falsy (%s)',
    (clientName) => {
      const payload = buildProjectImportPayload(
        { name: 'Projeto', areaSource: undefined, clientName },
        undefined,
      );

      expect(payload.client_name).toBe('PSA CONSULTORES');
      expect(payload.created_by).toBeUndefined();
    },
  );

  it.each([
    ['número', 123],
    ['booleano', true],
    ['objeto unknown', { id: 'cliente-1' }],
  ])('mantém o valor bruto truthy de clientName quando é %s', (_case, clientName) => {
    const payload = buildProjectImportPayload(
      { name: 'Projeto', areaSource: undefined, clientName },
      'user-1',
    );

    expect(payload.client_name).toBe(clientName);
  });
});

describe('isValidProjectImportPayload', () => {
  const payload = (name: string): ProjectImportPayload => ({
    name,
    description: 'Descrição',
    status: 'active',
    client_name: 'PSA CONSULTORES',
    created_by: undefined,
  });

  it('aceita nome preenchido e rejeita nome vazio', () => {
    expect(isValidProjectImportPayload(payload('Projeto'))).toBe(true);
    expect(isValidProjectImportPayload(payload(''))).toBe(false);
  });
});

describe('deduplicateProjectImportPayloads', () => {
  const payload = (
    name: string,
    description: string,
    clientName: string,
  ): ProjectImportPayload => ({
    name,
    description,
    status: 'active',
    client_name: clientName,
    created_by: undefined,
  });

  it('deduplica nomes sem diferenciar caixa e mantém o último payload completo', () => {
    const firstAlpha = payload('Alpha', 'Primeira versão', 'Cliente antigo');
    const beta = payload('Beta', 'Projeto beta', 'Cliente beta');
    const lastAlpha = payload('ALPHA', 'Última versão', 'Cliente novo');

    expect(deduplicateProjectImportPayloads([firstAlpha, beta, lastAlpha])).toEqual([
      lastAlpha,
      beta,
    ]);
  });
});

describe('prepareProjectImportPayloads', () => {
  it('filtra nomes vazios e preserva coerções de números, booleans e unknown', () => {
    const unknownName = { toString: () => '  Projeto unknown  ' };
    const unknownArea = { toString: () => 'Equipe Felipe' };
    const unknownClient = { id: 'cliente-unknown' };

    const projects = prepareProjectImportPayloads(
      [
        { Projeto: '   ' },
        { Projeto: 42, Cliente: 123, Empresa: 0 },
        { Projeto: true, Cliente: false, Empresa: false },
        {
          Projeto: unknownName,
          Cliente: unknownArea,
          Empresa: unknownClient,
        },
      ],
      'user-1',
    );

    expect(projects).toHaveLength(3);
    expect(projects[0]).toEqual({
      name: '42',
      description: 'Área: Transversal | Prioridade: Média',
      status: 'active',
      client_name: 'PSA CONSULTORES',
      created_by: 'user-1',
    });
    expect(projects[1]).toEqual({
      name: 'true',
      description: 'Área: Geral | Prioridade: Média',
      status: 'active',
      client_name: 'PSA CONSULTORES',
      created_by: 'user-1',
    });
    expect(projects[2]).toEqual({
      name: 'Projeto unknown',
      description: 'Área: Consultoria | Prioridade: Média',
      status: 'active',
      client_name: unknownClient,
      created_by: 'user-1',
    });
  });
});
