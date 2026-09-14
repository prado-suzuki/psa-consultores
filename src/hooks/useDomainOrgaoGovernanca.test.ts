import { describe, expect, it, vi, beforeEach } from 'vitest';

const reactQueryMocks = vi.hoisted(() => ({
  useQuery: vi.fn((options: unknown) => options),
  useMutation: vi.fn((options: unknown) => options),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));
const dbMocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('@tanstack/react-query', () => reactQueryMocks);
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/hooks/useAuditLog', () => ({ useAuditLog: () => ({ logAction: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: dbMocks.from } }));

import { mockSupabaseChain } from '@/test/supabaseMock';
import { ORGAOS_GOVERNANCA_PADRAO } from '@/lib/orgaosGovernancaPadrao';
import {
  useOrgaoGovernancaMutations,
  type OrgaoGovernancaInput,
} from '@/hooks/useDomainOrgaoGovernanca';

/**
 * `useMutation` está mockado para devolver as próprias opções, então
 * `criar.mutationFn` é chamável direto, sem React. É o padrão dos outros testes
 * de hook deste repositório.
 */
type ComMutationFn = { mutationFn: (arg: never) => Promise<unknown> };

/**
 * Tudo o que foi para `.insert()`, na ordem, achatado.
 *
 * A cadeia awaitada e o `.single()` resolvem com FORMAS DIFERENTES de propósito:
 * a leitura de `buscarPorCliente` espera lista, e o `.select().single()` do
 * insert espera uma linha. `semear` faz os dois na mesma chamada.
 */
function espiarInserts(listaExistente: Record<string, unknown>[] = []) {
  const inseridos: Record<string, unknown>[] = [];
  dbMocks.from.mockImplementation(() => {
    const chain = mockSupabaseChain({ data: listaExistente, error: null });
    chain.single = vi.fn().mockResolvedValue({ data: { id: 'novo', nome: 'x' }, error: null });
    chain.insert = vi.fn((payload: Record<string, unknown>) => {
      inseridos.push(payload);
      return chain;
    });
    return chain;
  });
  return inseridos;
}

describe('semear: o botão "usar os padrões da OSG"', () => {
  beforeEach(() => vi.clearAllMocks());

  it('grava o GÊNERO e a CHAVE de cada padrão, e não só o nome', async () => {
    /*
     * O defeito que este teste tranca, achado em 14/09: o laço passava apenas
     * `nome` e `entraNoContrato`, embora o catálogo tivesse os quatro campos
     * desde 11/09. Todo cliente semeado pelo botão nascia sem chave (o vínculo
     * automático da tela Gerar voltava a perguntar qual órgão era qual) e sem
     * gênero (a cláusula saía "A Diretoria Executiva será compostO"). No
     * sandbox, 3 de 25 órgãos tinham chave.
     */
    const inseridos = espiarInserts();
    const { semear } = useOrgaoGovernancaMutations('cliente-1');

    await (semear as unknown as ComMutationFn).mutationFn([] as never);

    expect(inseridos).toHaveLength(ORGAOS_GOVERNANCA_PADRAO.length);
    for (const padrao of ORGAOS_GOVERNANCA_PADRAO) {
      const linha = inseridos.find((i) => i.nome === padrao.nome);
      expect(linha, `faltou inserir ${padrao.nome}`).toBeDefined();
      expect(linha!.genero).toBe(padrao.genero);
      expect(linha!.padrao_chave).toBe(padrao.chave);
      expect(linha!.entra_no_contrato).toBe(padrao.entraNoContrato);
    }
  });

  it('semeia só o que falta, com os campos completos', async () => {
    const inseridos = espiarInserts();
    const { semear } = useOrgaoGovernancaMutations('cliente-1');

    await (semear as unknown as ComMutationFn).mutationFn(
      [{ nome: 'Reunião de Sócios' }] as never,
    );

    expect(inseridos.map((i) => i.nome)).toEqual([
      'Conselho de Administração',
      'Diretoria Executiva',
    ]);
    expect(inseridos.every((i) => i.padrao_chave && i.genero)).toBe(true);
  });
});

describe('criar e atualizar: a parametrização do órgão', () => {
  beforeEach(() => vi.clearAllMocks());

  const base: OrgaoGovernancaInput = {
    nome: 'Comitê de Auditoria',
    entra_no_contrato: true,
    genero: 'M',
    membros_minimo: 3,
    membros_maximo: 6,
    mandato_anos: 2,
    cargos_do_orgao: ['Presidente'],
  };

  it('leva as cinco colunas de parametrização no insert', async () => {
    const inseridos = espiarInserts();
    const { criar } = useOrgaoGovernancaMutations('cliente-1');

    await (criar as unknown as ComMutationFn).mutationFn(base as never);

    expect(inseridos[0]).toMatchObject({
      nome: 'Comitê de Auditoria',
      genero: 'M',
      membros_minimo: 3,
      membros_maximo: 6,
      mandato_anos: 2,
      cargos_do_orgao: ['Presidente'],
    });
  });

  it('órgão criado pelo modal não recebe chave de padrão', async () => {
    // A chave é identidade dos três da OSG. Um órgão do cliente com chave
    // entraria na trava de ordem e no vínculo automático como se fosse padrão.
    const inseridos = espiarInserts();
    const { criar } = useOrgaoGovernancaMutations('cliente-1');

    await (criar as unknown as ComMutationFn).mutationFn(base as never);

    expect(inseridos[0].padrao_chave).toBeNull();
  });

  it('salvar pelo modal NÃO apaga a chave de um órgão padrão', async () => {
    /*
     * `atualizar` monta o payload a partir do input, e o modal não tem campo de
     * chave. Se `padrao_chave` estivesse na lista, editar o mandato do Conselho
     * mandaria a chave como nula e soltaria a trava de ordem junto com o
     * vínculo automático da tela Gerar.
     */
    const atualizados: Record<string, unknown>[] = [];
    dbMocks.from.mockImplementation(() => {
      const chain = mockSupabaseChain({
        data: {
          id: 'o1',
          nome: 'Conselho de Administração',
          entra_no_contrato: true,
          ordem: 1,
          vigencia_inicio: null,
          vigencia_fim: null,
          genero: 'M',
          membros_minimo: 3,
          membros_maximo: 6,
          mandato_anos: 2,
          cargos_do_orgao: null,
          padrao_chave: 'conselho_administracao',
        },
        error: null,
      });
      chain.update = vi.fn((payload: Record<string, unknown>) => {
        atualizados.push(payload);
        return chain;
      });
      return chain;
    });

    const { atualizar } = useOrgaoGovernancaMutations('cliente-1');
    await (atualizar as unknown as ComMutationFn).mutationFn({
      id: 'o1',
      nome: 'Conselho de Administração',
      entra_no_contrato: true,
      genero: 'M',
      membros_minimo: 3,
      membros_maximo: 6,
      mandato_anos: 4, // só o mandato muda
      cargos_do_orgao: null,
    } as never);

    expect(atualizados).toHaveLength(1);
    expect(atualizados[0].mandato_anos).toBe(4);
    expect(atualizados[0]).not.toHaveProperty('padrao_chave');
  });
});
