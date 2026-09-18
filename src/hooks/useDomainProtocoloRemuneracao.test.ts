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
import {
  type ProtocoloDoCliente,
  useProtocoloMutations,
} from '@/hooks/useDomainProtocoloRemuneracao';

/** `useMutation` devolve as próprias opções, então `mutationFn` é chamável direto. */
type ComMutationFn = { mutationFn: (arg: never) => Promise<unknown> };

const TEMA = { id: 'tV', nome: 'Veículos', ordem: 30 };

const ATUAL = {
  protocolo: {
    id: 'p1',
    cliente_id: 'c1',
    versao: 1,
  },
  beneficiarios: [
    { id: 'bA', nome: 'Fundadores', ordem: 10 },
    { id: 'bB', nome: 'Sócios Gestores', ordem: 20 },
  ],
  linhas: [
    { id: 'lA', ordem: 10, item: { id: 'iA', nome: 'Modelo do Veículo', ordem: 10, tema: TEMA } },
    { id: 'lB', ordem: 30, item: { id: 'iB', nome: 'Abastecimento', ordem: 30, tema: TEMA } },
  ],
  regras: [
    { linha_id: 'lA', beneficiario_id: 'bA', texto: 'Hilux para o fundador' },
    { linha_id: 'lA', beneficiario_id: 'bB', texto: 'Strada para o gestor' },
    { linha_id: 'lB', beneficiario_id: 'bA', texto: 'Combustível por conta da sociedade' },
  ],
} as unknown as ProtocoloDoCliente;

/**
 * Espia o que cada tabela recebeu.
 *
 * **As colunas e as linhas voltam do banco NA ORDEM INVERTIDA, de propósito.** É
 * o que prova que o remapeamento das regras casa velho com novo por chave de
 * negócio (nome da coluna, item da linha) e não pela posição no array. Casar por
 * posição passaria num teste que devolvesse na mesma ordem, e quebraria calado no
 * dia em que o Postgres devolvesse noutra, trocando a regra do Fundador com a do
 * Gestor.
 */
function espiar() {
  const inserts: Record<string, unknown[]> = {};

  const retornoPorTabela: Record<string, unknown> = {
    protocolo_beneficiario: [
      { id: 'bB2', nome: 'Sócios Gestores' },
      { id: 'bA2', nome: 'Fundadores' },
    ],
    protocolo_linha: [
      { id: 'lB2', item_id: 'iB' },
      { id: 'lA2', item_id: 'iA' },
    ],
  };

  dbMocks.from.mockImplementation((tabela: string) => {
    const chain = mockSupabaseChain({ data: retornoPorTabela[tabela] ?? [], error: null });
    chain.single = vi
      .fn()
      .mockResolvedValue({ data: { id: 'p2', versao: 2, cliente_id: 'c1' }, error: null });
    chain.insert = vi.fn((p: unknown) => {
      (inserts[tabela] ??= []).push(p);
      return chain;
    });
    return chain;
  });

  return { inserts };
}

describe('novaVersao', () => {
  beforeEach(() => vi.clearAllMocks());

  it('copia a anterior, e NÃO recomeça do modelo como faz o Acordo', async () => {
    /*
     * Divergência consciente do Acordo de Quotistas, registrada no hook: lá o
     * campo é curto e tem semente, aqui a célula é parágrafo escrito à mão, e
     * recomeçar faria a consultoria redigitar 90 parágrafos.
     */
    const { inserts } = espiar();
    const { novaVersao } = useProtocoloMutations('c1');

    await (novaVersao as unknown as ComMutationFn).mutationFn({ atual: ATUAL } as never);

    const cabecalho = inserts['protocolo_remuneracao']![0] as Record<string, unknown>;
    expect(cabecalho.versao).toBe(2);

    expect(inserts['protocolo_beneficiario']![0]).toHaveLength(2);
    expect(inserts['protocolo_linha']![0]).toHaveLength(2);
    expect(inserts['protocolo_regra']![0]).toHaveLength(3);
  });

  it('remapeia as regras por nome e item, e não pela ordem que o banco devolveu', async () => {
    const { inserts } = espiar();
    const { novaVersao } = useProtocoloMutations('c1');

    await (novaVersao as unknown as ComMutationFn).mutationFn({ atual: ATUAL } as never);

    const regras = inserts['protocolo_regra']![0] as Array<Record<string, string>>;

    /* "Hilux" era do Fundador na linha do Modelo: tem de continuar em bA2/lA2. */
    expect(regras).toContainEqual(
      expect.objectContaining({
        linha_id: 'lA2',
        beneficiario_id: 'bA2',
        texto: 'Hilux para o fundador',
      }),
    );
    expect(regras).toContainEqual(
      expect.objectContaining({
        linha_id: 'lA2',
        beneficiario_id: 'bB2',
        texto: 'Strada para o gestor',
      }),
    );
    expect(regras).toContainEqual(
      expect.objectContaining({
        linha_id: 'lB2',
        beneficiario_id: 'bA2',
        texto: 'Combustível por conta da sociedade',
      }),
    );
  });

  it('não carrega id velho nenhum para a versão nova', async () => {
    const { inserts } = espiar();
    const { novaVersao } = useProtocoloMutations('c1');

    await (novaVersao as unknown as ComMutationFn).mutationFn({ atual: ATUAL } as never);

    const regras = inserts['protocolo_regra']![0] as Array<Record<string, string>>;
    const idsVelhos = ['lA', 'lB', 'bA', 'bB', 'p1'];

    for (const r of regras) {
      expect(idsVelhos).not.toContain(r.linha_id);
      expect(idsVelhos).not.toContain(r.beneficiario_id);
    }
  });

  it('audita a criação com o número da versão, que é como se procura depois', async () => {
    espiar();
    const { novaVersao } = useProtocoloMutations('c1');

    await (novaVersao as unknown as ComMutationFn).mutationFn({ atual: ATUAL } as never);

    expect(logMock.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'protocolo_remuneracao',
        entity_id: 'p2',
        entity_name: 'Protocolo de Remuneração, versão 2',
        action: 'created',
      }),
    );
  });
});
