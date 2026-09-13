import { beforeEach, describe, expect, it, vi } from 'vitest';

// Teste de FIAÇÃO da doação de quotas: o que o ato grava, em que ordem, e o que
// ele invalida. A regra herdada de useMovimentacaoQuotas.test.tsx vale aqui:
// toda mutação que escreve em `movimentacao_quotas` invalida
// `movimentos-da-empresa` da empresa afetada.

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(),
}));
const qcMocks = vi.hoisted(() => ({ invalidateQueries: vi.fn() }));
const toastMocks = vi.hoisted(() => ({ toast: vi.fn() }));
const auditMocks = vi.hoisted(() => ({ logAction: vi.fn() }));
const dbMocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('@/hooks/use-toast', () => ({ toast: toastMocks.toast }));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: auditMocks.logAction }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: dbMocks.from } }));

import { useDoarQuotas, useOnusDaEmpresa } from '@/hooks/useDoacaoDeQuotas';
import type { PlanoDaDoacao } from '@/lib/osg/doacaoDeQuotas';

const EMPRESA = 'mms-participacoes';

/** Registro de cada escrita: tabela, operação e payload. */
const escritas: Array<{ tabela: string; op: string; payload?: unknown }> = [];

/**
 * Encadeamento mínimo do PostgREST que REGISTRA a escrita e devolve `data`.
 * `falharEm` faz a escrita naquela tabela voltar erro.
 */
function bancoQue(respostas: Record<string, unknown>, falharEm: string | null = null) {
  dbMocks.from.mockImplementation((tabela: string) => {
    const elo: Record<string, unknown> = {};
    let op = 'select';
    for (const metodo of ['select', 'eq', 'in', 'is', 'order', 'single']) elo[metodo] = () => elo;
    for (const metodo of ['insert', 'delete']) {
      elo[metodo] = (payload?: unknown) => {
        op = metodo;
        escritas.push({ tabela, op, payload });
        return elo;
      };
    }
    elo.then = (aceitar: (r: unknown) => unknown) => {
      const erro = falharEm === tabela && op === 'insert' ? { message: `falhou em ${tabela}` } : null;
      return Promise.resolve({ data: erro ? null : respostas[tabela] ?? null, error: erro }).then(aceitar);
    };
    return elo;
  });
}

const plano: PlanoDaDoacao = {
  lancamentos: [
    {
      denominacao: 'Camila',
      movimento: {
        tipo: 'doacao', origemPessoaId: 'jose', destinoPessoaId: 'camila', quotas: 100,
        dataMovimento: '2026-01-15', sequencia: 1,
        quotasLegitima: 50, quotasDisponivel: 50, instrumentoData: '2025-12-24',
      },
      onus: {
        nuProprietarioId: 'camila', usufrutuarioIds: ['jose'], usufrutoOrigem: 'reserva',
        comVoto: true, quotas: 100, gravames: ['inalienabilidade'],
      },
    },
    {
      denominacao: 'Bruna',
      movimento: {
        tipo: 'doacao', origemPessoaId: 'jose', destinoPessoaId: 'bruna', quotas: 50,
        dataMovimento: '2026-01-15', sequencia: 2,
        quotasLegitima: null, quotasDisponivel: null, instrumentoData: null,
      },
      onus: null,
    },
  ],
  problema: null,
  avisos: [],
  quadroResultante: [],
  retirantes: [],
  ingressantes: [],
  usufruto: null,
};

const gesto = {
  clienteId: 'cliente-1',
  empresaPessoaId: EMPRESA,
  plano,
  descricao: 'Doação de 150 quotas de José para Camila e Bruna, com reserva de usufruto',
  dataMovimento: '2026-01-15',
};

type Mutacao = {
  mutationFn: (args: typeof gesto) => Promise<unknown>;
  onSuccess: (dados: unknown) => Promise<void>;
};

const resultadoDoGesto = {
  atoId: 'ato-1',
  plano,
  descricao: gesto.descricao,
  clienteId: gesto.clienteId,
  empresaPessoaId: EMPRESA,
  dataMovimento: gesto.dataMovimento,
  onus: 1,
};

function chavesInvalidadas(): string[] {
  return qcMocks.invalidateQueries.mock.calls.map(([arg]) =>
    (arg as { queryKey: unknown[] }).queryKey.join('|'),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  escritas.length = 0;
  reactQueryMocks.useQueryClient.mockReturnValue(qcMocks);
});

describe('useDoarQuotas, o que grava', () => {
  it('ato, depois os movimentos com as colunas da doação, depois o ônus apontando pela sequência', async () => {
    bancoQue({
      ato_societario: { id: 'ato-1' },
      // Resposta fora de ordem, de propósito: o ônus tem de casar pela sequência.
      movimentacao_quotas: [{ id: 'mov-2', sequencia: 2 }, { id: 'mov-1', sequencia: 1 }],
      onus_quotas: [],
    });
    const { mutationFn } = useDoarQuotas() as unknown as Mutacao;
    const resultado = await mutationFn(gesto);

    expect(escritas.map((e) => `${e.tabela}:${e.op}`)).toEqual([
      'ato_societario:insert', 'movimentacao_quotas:insert', 'onus_quotas:insert',
    ]);
    const movimentos = escritas[1].payload as Array<Record<string, unknown>>;
    expect(movimentos[0]).toMatchObject({
      tipo: 'doacao', empresa_pessoa_id: EMPRESA, origem_pessoa_id: 'jose', destino_pessoa_id: 'camila',
      quotas: 100, vlr_capital_arredondado: 100, ato_id: 'ato-1', sequencia: 1,
      quotas_legitima: 50, quotas_disponivel: 50, instrumento_data: '2025-12-24',
    });
    expect(movimentos[1]).toMatchObject({ sequencia: 2, quotas_legitima: null, instrumento_data: null });
    // created_at escalonado: a ordem dos pares é a ordem das cláusulas.
    expect(movimentos[0].created_at < (movimentos[1].created_at as string)).toBe(true);

    expect(escritas[2].payload).toEqual([{
      cliente_id: 'cliente-1',
      empresa_pessoa_id: EMPRESA,
      ato_id: 'ato-1',
      movimento_id: 'mov-1',
      nu_proprietario_pessoa_id: 'camila',
      usufrutuario_pessoa_ids: ['jose'],
      usufruto_origem: 'reserva',
      usufruto_com_voto: true,
      quotas: 100,
      gravames: ['inalienabilidade'],
    }]);
    expect(resultado).toMatchObject({ atoId: 'ato-1', onus: 1 });
  });

  it('se o ônus falhar, apaga o ato (e o cascade leva os movimentos)', async () => {
    bancoQue({
      ato_societario: { id: 'ato-1' },
      movimentacao_quotas: [{ id: 'mov-1', sequencia: 1 }, { id: 'mov-2', sequencia: 2 }],
    }, 'onus_quotas');
    const { mutationFn } = useDoarQuotas() as unknown as Mutacao;
    await expect(mutationFn(gesto)).rejects.toMatchObject({ message: 'falhou em onus_quotas' });
    expect(escritas.at(-1)).toMatchObject({ tabela: 'ato_societario', op: 'delete' });
  });

  it('recusa doador que já tem quota onerada, sem escrever nada', async () => {
    // O gravame acompanha a quota, e este macro consome o saldo par a par: não
    // sabe repartir um ônus antigo entre vários pares. Recusar com o motivo
    // escrito é melhor do que gravar um contrato dizendo que o doador tem
    // quotas gravadas que ele já não tem.
    bancoQue({ onus_quotas: [{ nu_proprietario_pessoa_id: 'jose' }] });
    const { mutationFn } = useDoarQuotas() as unknown as Mutacao;
    await expect(mutationFn(gesto)).rejects.toMatchObject({
      message: expect.stringContaining('já tem quotas gravadas ou sob usufruto'),
    });
    expect(escritas.filter((e) => e.op === 'insert')).toEqual([]);
  });

  it('recusa plano com problema antes de tocar no banco', async () => {
    bancoQue({});
    const { mutationFn } = useDoarQuotas() as unknown as Mutacao;
    await expect(mutationFn({ ...gesto, plano: { ...plano, problema: 'Par 1: sem saldo.' } }))
      .rejects.toThrow('Par 1: sem saldo.');
    expect(escritas).toEqual([]);
  });
});

describe('useDoarQuotas, o que invalida e audita', () => {
  it('invalida o livro, o saldo, o ônus e as cessões que a tela Gerar lê', async () => {
    const { onSuccess } = useDoarQuotas() as unknown as Mutacao;
    await onSuccess(resultadoDoGesto);

    const chaves = chavesInvalidadas();
    expect(chaves).toContain(`movimentos-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`quadro-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`onus-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`cessoes-do-livro|${EMPRESA}`);
  });

  it('registra o ATO na auditoria, e não lançamento a lançamento', async () => {
    const { onSuccess } = useDoarQuotas() as unknown as Mutacao;
    await onSuccess(resultadoDoGesto);

    expect(auditMocks.logAction).toHaveBeenCalledTimes(1);
    expect(auditMocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      entity_type: 'ato_societario', entity_id: 'ato-1', entity_name: gesto.descricao, action: 'created',
      changed_fields: {
        cliente_id: { old: null, new: 'cliente-1' },
        data: { old: null, new: '2026-01-15' },
        descricao: { old: null, new: gesto.descricao },
      },
    }));
  });
});

describe('useOnusDaEmpresa', () => {
  it('lê só o ônus VIGENTE da empresa e converte as colunas', async () => {
    const filtros: Array<[string, unknown[]]> = [];
    dbMocks.from.mockImplementation(() => {
      const elo: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'is', 'order']) {
        elo[m] = (...args: unknown[]) => { filtros.push([m, args]); return elo; };
      }
      elo.then = (aceitar: (r: unknown) => unknown) => Promise.resolve({
        data: [{
          id: 'onus-1', movimento_id: 'mov-1', nu_proprietario_pessoa_id: 'camila',
          usufrutuario_pessoa_ids: ['jose', 'maria'], usufruto_origem: 'reserva',
          usufruto_com_voto: true, quotas: '100', gravames: ['inalienabilidade'],
        }],
        error: null,
      }).then(aceitar);
      return elo;
    });
    const q = useOnusDaEmpresa(EMPRESA) as unknown as { queryKey: unknown[]; queryFn: () => Promise<unknown> };
    expect(q.queryKey).toEqual(['onus-da-empresa', EMPRESA]);
    const onus = await q.queryFn();
    expect(filtros).toContainEqual(['eq', ['empresa_pessoa_id', EMPRESA]]);
    expect(filtros).toContainEqual(['is', ['extinto_em', null]]);
    expect(onus).toEqual([{
      id: 'onus-1', movimentoId: 'mov-1', nuProprietarioId: 'camila',
      usufrutuarioIds: ['jose', 'maria'], usufrutoOrigem: 'reserva', comVoto: true,
      quotas: 100, gravames: ['inalienabilidade'],
    }]);
  });
});
