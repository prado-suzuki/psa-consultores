import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Wiring das duas queries que alimentam a DESCRIÇÃO DE IMÓVEL do gerador. Elas
// convertem o resultado com `as unknown as <interface à mão>`, e o types.ts
// autogerado ainda não conhece as colunas novas de `bem`: nada no TypeScript
// pega um nome de coluna errado, e um erro assim vira 400 do PostgREST que
// derruba a tela Gerar inteira, inclusive o caminho rural. Estes testes travam
// as colunas pedidas (e o nível em que são pedidas) e o mapeamento das linhas.

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
// Pessoas, bens e cartórios têm cobertura própria e não participam da descrição
// do imóvel: entram vazios para isolar a query de matrícula.
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: [], isFetching: false }),
}));
const bensDoCliente = vi.hoisted(() => ({ linhas: [] as unknown[] }));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: bensDoCliente.linhas, isFetching: false }),
  useCartorios: () => ({ data: [], isFetching: false }),
}));

import { useIntegralizacoesAprovadas, useRegistrosPorTipo } from '@/hooks/useGeracaoDocumento';
import { supabase } from '@/integrations/supabase/client';
import { mapearMatricula, type MatriculaParaMapear } from '@/lib/templates/mapeadores';

interface DbCall {
  table: string;
  method: string;
  args: unknown[];
}

const dbCalls: DbCall[] = [];
const dbResults = new Map<string, { data: unknown; error: unknown }>();
/** Dados devolvidos por queryKey serializada (o useMemo do hook lê `.data`). */
const dadosPorQuery = new Map<string, unknown>();

function makeSupabaseChain(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'is', 'order', 'limit']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      dbCalls.push({ table, method, args });
      return chain;
    });
  }
  chain.then = (onFulfilled: (r: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(dbResults.get(table) ?? { data: [], error: null }).then(onFulfilled);
  return chain;
}

function selectDe(table: string): string {
  const call = dbCalls.find((c) => c.table === table && c.method === 'select');
  return String(call?.args[0] ?? '');
}

function queryRegistrations() {
  return reactQueryMocks.useQuery.mock.calls.map(([o]) => o as Record<string, unknown>);
}

function queryPorKey(key: unknown[]) {
  const alvo = queryRegistrations().find((q) => JSON.stringify(q.queryKey) === JSON.stringify(key));
  if (!alvo) throw new Error(`Query não registrada: ${JSON.stringify(key)}`);
  return alvo;
}

/**
 * Colunas pedidas num nível do select do PostgREST: as do topo (fora de
 * parênteses) ou as de uma relação embutida ("bem:bem_id ( … )"). Nome errado no
 * nível errado é justamente o que o PostgREST rejeita com 400.
 */
function colunasDoSelect(select: string, relacao?: string): string[] {
  let escopo = select;
  if (relacao) {
    const inicio = select.indexOf(relacao);
    if (inicio < 0) throw new Error(`Relação ${relacao} não pedida no select`);
    const abre = select.indexOf('(', inicio);
    let profundidade = 0;
    let fim = abre;
    for (let i = abre; i < select.length; i++) {
      if (select[i] === '(') profundidade++;
      if (select[i] === ')') profundidade--;
      if (profundidade === 0) {
        fim = i;
        break;
      }
    }
    escopo = select.slice(abre + 1, fim);
  }
  // Só os tokens de nível 0 do escopo: relações embutidas ficam de fora.
  const colunas: string[] = [];
  let profundidade = 0;
  let token = '';
  for (const ch of escopo) {
    if (ch === '(') profundidade++;
    else if (ch === ')') profundidade--;
    if (ch === ',' && profundidade === 0) {
      colunas.push(token);
      token = '';
    } else {
      token += ch;
    }
  }
  colunas.push(token);
  return colunas
    .map((c) => c.trim())
    .filter((c) => c && !c.includes('('))
    .map((c) => c.split(':')[0].trim())
    // Ordenado para a comparação ser de CONJUNTO: a ordem no select não importa
    // para o PostgREST, os nomes importam.
    .sort();
}

beforeEach(() => {
  vi.clearAllMocks();
  dbCalls.length = 0;
  dbResults.clear();
  dadosPorQuery.clear();
  bensDoCliente.linhas = [];
  reactQueryMocks.useQuery.mockImplementation((options: Record<string, unknown>) => ({
    ...options,
    data: dadosPorQuery.get(JSON.stringify(options.queryKey)),
    isFetching: false,
  }));
  vi.mocked(supabase.from).mockImplementation((t: string) => makeSupabaseChain(t) as never);
});

// Uma linha do JOIN de matrícula como o PostgREST a devolve para um imóvel urbano.
const LINHA_URBANA = {
  id: 'mat-1', numero: '30.482', livro: '2', folha: '15',
  municipio_imovel: 'Cuiabá', uf_imovel: 'MT',
  area_documento: 360, area_unidade: 'm2', vlr_contabil: 450000,
  confrontacoes_texto: 'frente para a Rua das Acácias', descricao_psa_completa: null,
  tipo_bem: 'IB', tipo_exploracao_posse: 'Exploração Direta',
  bem: {
    denominacao: 'Sala 12', vlr_contabil: null, ccir_codigo: null,
    cliente_id: 'cliente-1', tipo_bem: 'IB', inscricao_municipal: '1.234.567-8',
    endereco_logradouro: 'Rua das Acácias', endereco_numero: '119',
    endereco_complemento: 'apartamento 302', endereco_bairro: 'Centro',
    endereco_cep: '78000-000', area_construida_m2: 180,
  },
  cartorio: { nome_completo: 'Cartório do 2º Ofício', comarca: 'Cuiabá', uf: 'MT' },
  titularidade: [
    { integralizador: true, fracao: null, titular: { id: 'p-1', denominacao: 'José Eduardo', cliente_id: 'cliente-1' } },
  ],
};

describe('useRegistrosPorTipo — colunas da query de matrícula', () => {
  async function rodarQuery() {
    renderHook(() => useRegistrosPorTipo('cliente-1'));
    const q = queryPorKey(['matriculas-geracao', 'cliente-1']);
    await (q.queryFn as () => Promise<unknown>)();
  }

  it('pede da MATRÍCULA a área com sua unidade e a classificação do imóvel', async () => {
    await rodarQuery();
    // Conjunto COMPLETO, não "contém": coluna a mais com nome errado também é 400
    // do PostgREST, e o TypeScript não olha para dentro desta string.
    expect(colunasDoSelect(selectDe('matricula'))).toEqual([
      'area_documento', 'area_unidade', 'confrontacoes_texto', 'descricao_psa_completa',
      'folha', 'id', 'livro', 'municipio_imovel', 'numero', 'tipo_bem',
      'tipo_exploracao_posse', 'uf_imovel', 'vlr_contabil',
    ]);
  });

  it('pede do BEM o endereço, a área construída, a inscrição municipal e o tipo (fallback)', async () => {
    await rodarQuery();
    expect(colunasDoSelect(selectDe('matricula'), 'bem:bem_id')).toEqual([
      'area_construida_m2', 'ccir_codigo', 'cliente_id', 'denominacao',
      'endereco_bairro', 'endereco_cep', 'endereco_complemento',
      'endereco_logradouro', 'endereco_numero', 'inscricao_municipal',
      'participa_estruturacao', 'tipo_bem', 'vlr_contabil',
    ]);
  });

  it('entrega a linha no formato de MatriculaParaMapear, e o binding descreve o urbano', () => {
    dadosPorQuery.set(JSON.stringify(['matriculas-geracao', 'cliente-1']), [LINHA_URBANA]);
    const { result } = renderHook(() => useRegistrosPorTipo('cliente-1'));

    const row = result.current.registros.matricula[0].row as MatriculaParaMapear;
    expect(row.tipo_bem).toBe('IB');
    expect(row.tipo_exploracao_posse).toBe('Exploração Direta');
    expect(row.bem?.tipo_bem).toBe('IB');
    expect(row.bem?.endereco_logradouro).toBe('Rua das Acácias');
    expect(row.bem?.area_construida_m2).toBe(180);
    expect(row.bem?.inscricao_municipal).toBe('1.234.567-8');

    const campos = mapearMatricula(row);
    expect(campos.urbano).toBe('sim');
    expect(campos.area).toBe('360,0000 m²');
    expect(campos.areaExtenso).toBe('trezentos e sessenta metros quadrados');
    expect(campos.temAreaConstruida).toBe('sim');
    // "n.º", com ponto: é a abreviação da casa (68 contra 8 nos instrumentos
    // agrários assinados, 71 contra 2 nos Contratos Sociais). Ver `numeroProsa`.
    expect(campos.enderecoNumeroProsa).toBe('n.º 119');
    expect(campos.inscricaoMunicipal).toBe('1.234.567-8');
  });
});

// "Bem com participa_estruturacao desligado não aparece em NENHUM documento
// gerado" é confirmação de regressão do e2e. A fonte dos seletores da tela Gerar
// não olhava a coluna — e a seleção múltipla de imóveis passou a expor essa fonte
// num caminho novo, onde marcar o bem errado é um clique.
describe('useRegistrosPorTipo — recorte da estruturação', () => {
  const bemDoCliente = (id: string, participa: boolean) => ({
    denominacao: `Bem ${id}`, vlr_contabil: null, ccir_codigo: null, cliente_id: 'cliente-1',
    tipo_bem: 'IR', inscricao_municipal: null, endereco_logradouro: null, endereco_numero: null,
    endereco_complemento: null, endereco_bairro: null, endereco_cep: null, area_construida_m2: null,
    participa_estruturacao: participa,
  });

  it('tira dos seletores a matrícula do bem fora da estruturação, e mantém as demais', () => {
    dadosPorQuery.set(JSON.stringify(['matriculas-geracao', 'cliente-1']), [
      { ...LINHA_URBANA, id: 'mat-dentro', numero: '9.617', bem: bemDoCliente('dentro', true) },
      { ...LINHA_URBANA, id: 'mat-fora', numero: '51.001', bem: bemDoCliente('fora', false) },
      // Matrícula ÓRFÃ (sem bem) do titular do cliente: não tem flag para
      // consultar e continua disponível — é o caminho da matrícula digitada.
      { ...LINHA_URBANA, id: 'mat-orfa', numero: '24.318', bem: null },
    ]);
    const { result } = renderHook(() => useRegistrosPorTipo('cliente-1'));

    expect(result.current.registros.matricula.map((r) => r.id)).toEqual(['mat-dentro', 'mat-orfa']);
  });

  it('tira o próprio bem fora da estruturação do seletor de bem', () => {
    bensDoCliente.linhas = [
      { id: 'bem-dentro', referencia_dp: 'BS-01', denominacao: 'Fazenda', participa_estruturacao: true },
      { id: 'bem-fora', referencia_dp: 'BS-51', denominacao: 'Quotas Cooperbio', participa_estruturacao: false },
      // Sem a coluna (linha antiga): o default é participar.
      { id: 'bem-antigo', referencia_dp: 'BS-02', denominacao: 'Sítio' },
    ];
    const { result } = renderHook(() => useRegistrosPorTipo('cliente-1'));

    expect(result.current.registros.bem.map((r) => r.id)).toEqual(['bem-dentro', 'bem-antigo']);
  });

  it('a query de integralização também recorta pela estruturação', async () => {
    renderHook(() => useIntegralizacoesAprovadas('empresa-1'));
    const q = queryPorKey(['integralizacoes-geracao', 'empresa-1']);
    await (q.queryFn as () => Promise<unknown>)();

    expect(dbCalls).toContainEqual({
      table: 'bem',
      method: 'eq',
      args: ['participa_estruturacao', true],
    });
  });
});

describe('useIntegralizacoesAprovadas — colunas da query de bem + matrícula', () => {
  const BEM_APROVADO = {
    id: 'bem-1', denominacao: 'Sala 12', vlr_contabil: 450000, ccir_codigo: null,
    tipo_bem: 'IB', inscricao_municipal: '1.234.567-8',
    endereco_logradouro: 'Rua das Acácias', endereco_numero: 's/n',
    endereco_complemento: null, endereco_bairro: 'Centro', endereco_cep: '78000-000',
    area_construida_m2: 180,
    matricula: [
      {
        ...LINHA_URBANA,
        titularidade: [{ id: 't-1', integralizador: true, fracao: 100, titular: { id: 'p-1', denominacao: 'José Eduardo', tipo_pessoa: 'PF', cpf_cnpj: '000' } }],
        impedimento: [],
      },
    ],
  };

  async function rodarQuery() {
    renderHook(() => useIntegralizacoesAprovadas('empresa-1'));
    const q = queryPorKey(['integralizacoes-geracao', 'empresa-1']);
    return (await (q.queryFn as () => Promise<unknown>)()) as MatriculaParaMapear[];
  }

  it('pede do BEM as colunas do imóvel urbano e o tipo do bem', async () => {
    await rodarQuery();
    expect(colunasDoSelect(selectDe('bem'))).toEqual([
      'area_construida_m2', 'ccir_codigo', 'denominacao', 'endereco_bairro',
      'endereco_cep', 'endereco_complemento', 'endereco_logradouro',
      'endereco_numero', 'id', 'inscricao_municipal', 'tipo_bem', 'vlr_contabil',
    ]);
  });

  it('pede da MATRÍCULA embutida a área com unidade e a classificação', async () => {
    await rodarQuery();
    expect(colunasDoSelect(selectDe('bem'), 'matricula')).toEqual([
      'area_documento', 'area_unidade', 'confrontacoes_texto', 'descricao_psa_completa',
      'folha', 'id', 'livro', 'municipio_imovel', 'numero', 'tipo_bem',
      'tipo_exploracao_posse', 'uf_imovel', 'vlr_contabil',
    ]);
  });

  it('achata bem + matrícula no formato do mapeador (é o caminho real do documento)', async () => {
    dbResults.set('bem', { data: [BEM_APROVADO], error: null });
    const [m] = await rodarQuery();

    expect(m.tipo_bem).toBe('IB');
    expect(m.bem?.tipo_bem).toBe('IB');
    expect(m.bem?.endereco_logradouro).toBe('Rua das Acácias');
    expect(m.bem?.area_construida_m2).toBe(180);

    const campos = mapearMatricula(m);
    expect(campos.urbano).toBe('sim');
    expect(campos.area).toBe('360,0000 m²');
    expect(campos.areaConstruida).toBe('180,0000 m²');
    expect(campos.temAreaConstruida).toBe('sim');
    expect(campos.enderecoNumeroProsa).toBe('s/n.º');
  });
});
