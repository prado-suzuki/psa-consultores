import { beforeEach, describe, expect, it, vi } from 'vitest';

// Teste de FIAÇÃO da instituição de usufruto avulsa: o que o ato grava, em que
// ordem, e o que ele invalida.
//
// O que este teste trava e o da doação não: aqui NÃO se escreve em
// `movimentacao_quotas`. Nenhuma quota muda de mão, e um insert no livro seria
// exatamente o defeito — um lançamento fantasma que mexeria no quadro
// societário. Em compensação o ônus tem de nascer com `ato_id`, que é o único
// vínculo que permite desfazer o ato.

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

import { useInstituirUsufruto } from '@/hooks/useInstituicaoDeUsufruto';
import type { PlanoDaInstituicao } from '@/lib/osg/onusDaSociedade';

const EMPRESA = 'agro-alianca';
const escritas: Array<{ tabela: string; op: string; payload?: unknown }> = [];

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

const plano: PlanoDaInstituicao = {
  onus: [
    {
      nuProprietarioId: 'filha', usufrutuarioIds: ['pai'], usufrutoOrigem: 'instituicao',
      comVoto: true, quotas: 426_052, gravames: [],
    },
  ],
  problema: null,
  avisos: [],
  usufruto: null,
};

const gesto = {
  clienteId: 'cliente-1',
  empresaPessoaId: EMPRESA,
  plano,
  descricao: 'Instituição de usufruto sobre 426.052 quotas de Ana em favor de João, com direito de voto',
  dataDoAto: '2026-03-04',
};

type Mutacao = {
  mutationFn: (args: typeof gesto) => Promise<unknown>;
  onSuccess: (dados: unknown, args: typeof gesto) => Promise<void>;
};

const chavesInvalidadas = () => qcMocks.invalidateQueries.mock.calls.map(
  ([arg]) => (arg as { queryKey: unknown[] }).queryKey.join('|'),
);

beforeEach(() => {
  vi.clearAllMocks();
  escritas.length = 0;
  reactQueryMocks.useQueryClient.mockReturnValue(qcMocks);
});

describe('useInstituirUsufruto, o que grava', () => {
  it('o ato e o ônus preso a ele, e nada no livro de movimentos', async () => {
    bancoQue({ ato_societario: { id: 'ato-9' }, onus_quotas: [] });
    const { mutationFn } = useInstituirUsufruto() as unknown as Mutacao;
    const resultado = await mutationFn(gesto);

    expect(escritas.map((e) => `${e.tabela}:${e.op}`)).toEqual([
      'ato_societario:insert', 'onus_quotas:insert',
    ]);
    expect(escritas.some((e) => e.tabela === 'movimentacao_quotas')).toBe(false);

    expect(escritas[1].payload).toEqual([{
      cliente_id: 'cliente-1',
      empresa_pessoa_id: EMPRESA,
      ato_id: 'ato-9',
      movimento_id: null,
      nu_proprietario_pessoa_id: 'filha',
      usufrutuario_pessoa_ids: ['pai'],
      usufruto_origem: 'instituicao',
      usufruto_com_voto: true,
      quotas: 426_052,
      gravames: [],
    }]);
    expect(resultado).toMatchObject({ atoId: 'ato-9', quantos: 1 });
  });

  it('se o ônus falhar, apaga o ato: não fica ato vazio no card', async () => {
    bancoQue({ ato_societario: { id: 'ato-9' } }, 'onus_quotas');
    const { mutationFn } = useInstituirUsufruto() as unknown as Mutacao;
    await expect(mutationFn(gesto)).rejects.toMatchObject({ message: 'falhou em onus_quotas' });
    expect(escritas.at(-1)).toMatchObject({ tabela: 'ato_societario', op: 'delete' });
  });

  it('recusa plano com problema antes de tocar no banco', async () => {
    bancoQue({});
    const { mutationFn } = useInstituirUsufruto() as unknown as Mutacao;
    await expect(mutationFn({
      ...gesto, plano: { ...plano, problema: 'Ana já concedeu o usufruto de todas as quotas que tem.' },
    })).rejects.toMatchObject({ message: 'Ana já concedeu o usufruto de todas as quotas que tem.' });
    expect(escritas).toEqual([]);
  });

  it('invalida o ônus e os atos da empresa, e audita o ato', async () => {
    bancoQue({ ato_societario: { id: 'ato-9' }, onus_quotas: [] });
    const mutacao = useInstituirUsufruto() as unknown as Mutacao;
    await mutacao.onSuccess(await mutacao.mutationFn(gesto), gesto);

    const chaves = chavesInvalidadas();
    expect(chaves).toContain(`onus-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`movimentos-da-empresa|${EMPRESA}`);
    // O quadro societário NÃO muda: nenhuma quota mudou de mão. Invalidá-lo
    // seria dizer que mudou.
    expect(chaves).not.toContain(`quadro-da-empresa|${EMPRESA}`);

    expect(auditMocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
      area: 'osg', entity_type: 'ato_societario', entity_id: 'ato-9', action: 'created',
    }));
  });
});
