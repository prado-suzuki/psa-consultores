import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));
const dbMocks = vi.hoisted(() => ({ from: vi.fn() }));
const logMock = vi.hoisted(() => ({ logAction: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => logMock }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: dbMocks.from } }));

import { mockSupabaseChain } from '@/test/supabaseMock';
import { QUORUNS_PADRAO, mecanismosPadrao } from '@/lib/acordoQuotistasPadrao';
import { useAcordoMutations } from '@/hooks/useDomainAcordoQuotistas';

/** `useMutation` devolve as próprias opções, então `mutationFn` é chamável direto. */
type ComMutationFn = { mutationFn: (arg: never) => Promise<unknown> };

const ACORDO = { id: 'ac1', versao: 1, cliente_id: 'c1' };

/**
 * Espia o que cada tabela recebeu, e devolve `single()` com uma linha plausível.
 *
 * As formas divergem de propósito: `.single()` do insert espera uma linha, e a
 * cadeia awaitada de um insert em lote não espera nada.
 */
function espiar(atual: Record<string, unknown> = ACORDO) {
  const inserts: Record<string, unknown[]> = {};
  const updates: Record<string, unknown[]> = {};
  const deletes: string[] = [];

  dbMocks.from.mockImplementation((tabela: string) => {
    const chain = mockSupabaseChain({ data: [], error: null });
    chain.single = vi.fn().mockResolvedValue({ data: { ...ACORDO, ...atual }, error: null });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: { ...ACORDO, ...atual }, error: null });
    chain.insert = vi.fn((p: unknown) => {
      (inserts[tabela] ??= []).push(p);
      return chain;
    });
    chain.update = vi.fn((p: unknown) => {
      (updates[tabela] ??= []).push(p);
      return chain;
    });
    chain.delete = vi.fn(() => {
      deletes.push(tabela);
      return chain;
    });
    return chain;
  });

  return { inserts, updates, deletes };
}

describe('criarAcordo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('semeia os sete quóruns com os valores medidos no modelo', async () => {
    const { inserts } = espiar();
    const { criarAcordo } = useAcordoMutations('c1');

    await (criarAcordo as unknown as ComMutationFn).mutationFn(undefined as never);

    const linhas = inserts['acordo_quorum']?.[0] as Record<string, unknown>[];
    expect(linhas).toHaveLength(7);
    expect(linhas.map((l) => l.chave)).toEqual(QUORUNS_PADRAO.map((q) => q.chave));
    // A ordem gravada é a posição na semente, que é a ordem em que a tela mostra.
    expect(linhas.map((l) => l.ordem)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('a semente respeita o CHECK: percentual só onde o tipo pede', async () => {
    // `acordo_quorum_percentual_ck` recusa maioria com número. Se a semente
    // nascesse assim, o cadastro estouraria na criação do primeiro acordo.
    const { inserts } = espiar();
    const { criarAcordo } = useAcordoMutations('c1');

    await (criarAcordo as unknown as ComMutationFn).mutationFn(undefined as never);

    for (const l of inserts['acordo_quorum']![0] as Record<string, unknown>[]) {
      if (l.tipo === 'percentual') expect(l.percentual).toBeGreaterThan(0);
      else expect(l.percentual).toBeNull();
    }
  });

  it('marca os mecanismos padrão no cabeçalho', async () => {
    const { inserts } = espiar();
    const { criarAcordo } = useAcordoMutations('c1');

    await (criarAcordo as unknown as ComMutationFn).mutationFn(undefined as never);

    expect((inserts['acordo_quotistas']![0] as Record<string, unknown>).mecanismos)
      .toEqual(mecanismosPadrao());
  });

  it('sem cliente não cria, e diz por quê', async () => {
    espiar();
    const { criarAcordo } = useAcordoMutations(null);
    await expect(
      (criarAcordo as unknown as ComMutationFn).mutationFn(undefined as never),
    ).rejects.toThrow(/Selecione um cliente/);
  });
});

describe('salvarAcordo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não grava nem audita quando nada mudou', async () => {
    // Sem isto o histórico encheria de linha vazia de quem só abriu e fechou.
    const { updates } = espiar({ vigencia_anos: 10 });
    const { salvarAcordo } = useAcordoMutations('c1');

    await (salvarAcordo as unknown as ComMutationFn).mutationFn(
      { id: 'ac1', campos: { vigencia_anos: 10 } } as never,
    );

    expect(updates['acordo_quotistas']).toBeUndefined();
    expect(logMock.logAction).not.toHaveBeenCalled();
  });

  it('audita em nome de gente, e não pelo nome da coluna', async () => {
    const { updates } = espiar({ nao_concorrencia_prazo_anos: 3 });
    const { salvarAcordo } = useAcordoMutations('c1');

    await (salvarAcordo as unknown as ComMutationFn).mutationFn(
      { id: 'ac1', campos: { nao_concorrencia_prazo_anos: 5 } } as never,
    );

    expect(updates['acordo_quotistas']).toHaveLength(1);
    expect(logMock.logAction).toHaveBeenCalledWith(expect.objectContaining({
      entity_type: 'acordo_quotistas',
      action: 'updated',
      changed_fields: { 'Prazo da não concorrência, em anos': { old: '3', new: '5' } },
    }));
  });
});

describe('salvarListas', () => {
  beforeEach(() => vi.clearAllMocks());

  const antesVazio = { quoruns: 'nenhum', ramos: 'nenhum', ordem: 'nenhuma' };

  it('zera o percentual em maioria e unanimidade antes de mandar ao banco', async () => {
    // O CHECK recusaria, e o consultor veria erro de banco na tela. Melhor o hook
    // limpar do que o formulário conseguir montar um estado inválido.
    const { inserts } = espiar();
    const { salvarListas } = useAcordoMutations('c1');

    await (salvarListas as unknown as ComMutationFn).mutationFn({
      acordoId: 'ac1',
      versao: 1,
      quoruns: [
        { materia: 'Assunto comum', tipo: 'maioria', percentual: 50.01, base: 'presentes' },
        { materia: 'Alterar o contrato', tipo: 'percentual', percentual: 75, base: 'presentes' },
      ],
      ramos: [],
      ordemPreferencia: [],
      antes: antesVazio,
    } as never);

    const linhas = inserts['acordo_quorum']![0] as Record<string, unknown>[];
    expect(linhas[0].percentual).toBeNull();
    expect(linhas[1].percentual).toBe(75);
  });

  it('apaga as três listas antes de regravar', async () => {
    const { deletes } = espiar();
    const { salvarListas } = useAcordoMutations('c1');

    await (salvarListas as unknown as ComMutationFn).mutationFn({
      acordoId: 'ac1',
      versao: 1,
      quoruns: [{ materia: 'X', tipo: 'maioria', base: 'presentes' }],
      ramos: [{ nome: 'Silva', rotulo: 'ramo' }],
      ordemPreferencia: ['Holding'],
      antes: antesVazio,
    } as never);

    expect(deletes).toEqual([
      'acordo_quorum', 'acordo_ramo_familiar', 'acordo_ordem_preferencia',
    ]);
  });

  it('a posição na tela vira a ordem gravada, que é a ordem do documento', async () => {
    const { inserts } = espiar();
    const { salvarListas } = useAcordoMutations('c1');

    await (salvarListas as unknown as ComMutationFn).mutationFn({
      acordoId: 'ac1',
      versao: 1,
      quoruns: [],
      ramos: [],
      ordemPreferencia: ['Holding', 'Descendentes', 'Demais quotistas'],
      antes: antesVazio,
    } as never);

    const linhas = inserts['acordo_ordem_preferencia']![0] as Record<string, unknown>[];
    expect(linhas.map((l) => [l.ordem, l.quem])).toEqual([
      [0, 'Holding'], [1, 'Descendentes'], [2, 'Demais quotistas'],
    ]);
  });

  it('nada mudou, nada é apagado nem regravado', async () => {
    const { deletes, inserts } = espiar();
    const { salvarListas } = useAcordoMutations('c1');

    await (salvarListas as unknown as ComMutationFn).mutationFn({
      acordoId: 'ac1',
      versao: 1,
      quoruns: [],
      ramos: [],
      ordemPreferencia: [],
      antes: antesVazio,
    } as never);

    expect(deletes).toEqual([]);
    expect(inserts).toEqual({});
    expect(logMock.logAction).not.toHaveBeenCalled();
  });
});

describe('excluirAcordo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('é soft, porque acordo que virou cláusula assinada é história', async () => {
    const { updates, deletes } = espiar();
    const { excluirAcordo } = useAcordoMutations('c1');

    await (excluirAcordo as unknown as ComMutationFn).mutationFn(
      { id: 'ac1', versao: 1 } as never,
    );

    expect(deletes).toEqual([]);
    expect((updates['acordo_quotistas']![0] as Record<string, unknown>).excluido).toBe(true);
    expect(logMock.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'deleted' }),
    );
  });
});

describe('conferido não é preenchido', () => {
  beforeEach(() => vi.clearAllMocks());

  it('salvar o bloco marca conferido MESMO sem mudar nada', async () => {
    /*
     * É o caso mais comum, e o motivo de a marca existir: o acordo nasce semeado,
     * então o bloco correto é o que a pessoa abre, lê e fecha sem digitar. Se só
     * o que muda contasse, ele ficaria eternamente por conferir.
     */
    const { updates } = espiar({ grupos_conferidos: [], vigencia_anos: 10 });
    const { salvarAcordo } = useAcordoMutations('c1');

    await (salvarAcordo as unknown as ComMutationFn).mutationFn(
      { id: 'ac1', campos: { vigencia_anos: 10 }, grupo: 'quorum' } as never,
    );

    expect((updates['acordo_quotistas']![0] as Record<string, unknown>).grupos_conferidos)
      .toEqual(['quorum']);
  });

  it('não desmarca o que já estava conferido, e não duplica', async () => {
    const { updates } = espiar({ grupos_conferidos: ['quorum'], vigencia_anos: 10 });
    const { salvarAcordo } = useAcordoMutations('c1');

    await (salvarAcordo as unknown as ComMutationFn).mutationFn(
      { id: 'ac1', campos: { vigencia_anos: 12 }, grupo: 'quorum' } as never,
    );

    expect((updates['acordo_quotistas']![0] as Record<string, unknown>).grupos_conferidos)
      .toEqual(['quorum']);
  });

  it('sem grupo e sem mudança, não grava nada', async () => {
    const { updates } = espiar({ grupos_conferidos: [], vigencia_anos: 10 });
    const { salvarAcordo } = useAcordoMutations('c1');

    await (salvarAcordo as unknown as ComMutationFn).mutationFn(
      { id: 'ac1', campos: { vigencia_anos: 10 } } as never,
    );

    expect(updates['acordo_quotistas']).toBeUndefined();
  });
});

describe('novaVersao', () => {
  beforeEach(() => vi.clearAllMocks());

  it('nasce EM BRANCO e com a semente, e não copiando a anterior', async () => {
    // Decisão de 15/09: o acordo que se renegocia é outro documento, e partir do
    // anterior arrastaria valor que ninguém reviu no momento em que tudo é revisto.
    const { inserts } = espiar();
    const { novaVersao } = useAcordoMutations('c1');

    await (novaVersao as unknown as ComMutationFn).mutationFn({ versaoAtual: 1 } as never);

    const cabecalho = inserts['acordo_quotistas']![0] as Record<string, unknown>;
    expect(cabecalho.versao).toBe(2);
    expect(cabecalho.mecanismos).toEqual(mecanismosPadrao());
    // Nenhum valor do acordo anterior veio junto.
    expect(cabecalho.vigencia_anos).toBeUndefined();
    expect(cabecalho.camara_arbitral).toBeUndefined();
    // E os sete quóruns entram semeados, como na primeira versão.
    expect(inserts['acordo_quorum']![0]).toHaveLength(QUORUNS_PADRAO.length);
  });
});
