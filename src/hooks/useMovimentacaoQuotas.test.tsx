import { describe, expect, it, vi, beforeEach } from 'vitest';

// Teste de FIAÇÃO das invalidações do livro de quotas.
//
// Ele existe por um defeito que só apareceu no app rodando: `useGravarAporteInicial`
// invalidava o saldo (`quadro-da-empresa`) e não o livro (`movimentos-da-empresa`).
// Enquanto nenhuma tela lia o livro isso não tinha efeito visível. Passou a ter
// quando o card dos imóveis fora do capital começou a derivar dali quais bens já
// estão no capital: com o saldo fresco e o livro velho, a tela anunciava que os
// bens recém-integralizados estavam fora do capital, no instante seguinte ao
// clique que os pôs dentro.
//
// A regra que este arquivo trava: TODA mutação que escreve em
// `movimentacao_quotas` invalida `movimentos-da-empresa` da empresa afetada.

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

import {
  useGravarAporteInicial,
  useGravarAumentoDeCapital,
  useSubirQuotas,
} from '@/hooks/useMovimentacaoQuotas';

const EMPRESA = 'empresa-proprietaria';

/** As chaves invalidadas na chamada, achatadas em string para comparar. */
function chavesInvalidadas(): string[] {
  return qcMocks.invalidateQueries.mock.calls.map(([arg]) =>
    (arg as { queryKey: unknown[] }).queryKey.join('|'),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reactQueryMocks.useQueryClient.mockReturnValue(qcMocks);
});

describe('useGravarAporteInicial', () => {
  it('invalida o LIVRO, e não só o saldo: é o que o card dos imóveis lê', async () => {
    const mutacao = useGravarAporteInicial() as unknown as {
      onSuccess: (dados: unknown) => Promise<void>;
    };

    await mutacao.onSuccess({
      linhas: [{ id: 'mov-1', destino_pessoa_id: 'p1' }],
      aportes: [{ pessoaId: 'p1', denominacao: 'Lucas', bemId: 'bem-1', quotas: 10, valor: 10 }],
      empresaPessoaId: EMPRESA,
    });

    const chaves = chavesInvalidadas();
    // A que faltava, e a razão deste arquivo existir.
    expect(chaves).toContain(`movimentos-da-empresa|${EMPRESA}`);
    // As que já existiam continuam: o saldo da tela e o da tela Gerar.
    expect(chaves).toContain(`quadro-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`socios-geracao|${EMPRESA}`);
    // Os aportes de constituição nascem pendentes e são as alíneas da peça.
    expect(chaves).toContain(`aportes-do-livro|${EMPRESA}`);
  });
});

describe('useGravarAumentoDeCapital', () => {
  it('invalida o livro, o saldo e as duas listas que a tela Gerar lê', async () => {
    const mutacao = useGravarAumentoDeCapital() as unknown as {
      onSuccess: (dados: unknown) => Promise<void>;
    };

    await mutacao.onSuccess({
      atoId: 'ato-1',
      lancamentos: [
        { pessoaId: 'p1', denominacao: 'Lucas', quotas: 10, pagamento: { tipo: 'bem', bemId: 'b1' } },
      ],
      descricao: 'Aumento de capital por integralização de imóveis',
      empresaPessoaId: EMPRESA,
    });

    const chaves = chavesInvalidadas();
    expect(chaves).toContain(`movimentos-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`quadro-da-empresa|${EMPRESA}`);
    expect(chaves).toContain(`socios-geracao|${EMPRESA}`);
    expect(chaves).toContain(`aportes-do-livro|${EMPRESA}`);
    // O bem sai da lista de elegíveis quando a peça é registrada, mas a tela
    // Gerar relê os bens já aqui, e a lista velha mostraria o imóvel duas vezes.
    expect(chaves).toContain(`integralizacoes-geracao|${EMPRESA}`);
  });

  it('registra o ATO na auditoria, e não lançamento a lançamento', async () => {
    const mutacao = useGravarAumentoDeCapital() as unknown as {
      onSuccess: (dados: unknown) => Promise<void>;
    };

    await mutacao.onSuccess({
      atoId: 'ato-1',
      lancamentos: [
        { pessoaId: 'p1', denominacao: 'Lucas', quotas: 10, pagamento: { tipo: 'moeda' } },
        { pessoaId: 'p2', denominacao: 'Marina', quotas: 5, pagamento: { tipo: 'moeda' } },
      ],
      descricao: 'Aumento de capital por integralização de imóveis',
      empresaPessoaId: EMPRESA,
    });

    expect(auditMocks.logAction).toHaveBeenCalledTimes(1);
    expect(auditMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        entity_type: 'ato_societario',
        entity_id: 'ato-1',
        entity_name: 'Aumento de capital por integralização de imóveis',
        action: 'created',
      }),
    );
  });
});

// --- A segunda leitura da ordem do fluxo -----------------------------------
// A tela pode estar com dado velho: o modal fica aberto numa aba enquanto a
// alteração contratual do ingresso é (ou não é) registrada em outra. Quem grava
// o ato relê o fato e recusa com a MESMA frase, e é isso que estes dois travam.

const PROPRIETARIA = 'empresa-pr';
const CONTROLADORA = 'empresa-cn';

/** Encadeamento mínimo do PostgREST: qualquer método volta o próprio thenable. */
function respostaDe(data: unknown) {
  const elo: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'in', 'insert', 'delete', 'order', 'single']) {
    elo[metodo] = () => elo;
  }
  elo.then = (aceitar: (r: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(aceitar);
  return elo;
}

/** Uma linha crua de `movimentacao_quotas`, no recorte que a trava lê. */
const linha = (m: {
  destino?: string | null;
  origem?: string | null;
  quotas?: number;
  documento?: string | null;
}) => ({
  empresa_pessoa_id: PROPRIETARIA,
  origem_pessoa_id: m.origem ?? null,
  destino_pessoa_id: m.destino ?? null,
  quotas: m.quotas ?? 100,
  documento_gerado_id: m.documento ?? null,
});

/** O que a tela manda quando ela acha que pode: plano válido, duas pontas. */
const gesto = {
  clienteId: 'cliente-1',
  proprietariaPessoaId: PROPRIETARIA,
  plano: {
    lancamentos: [
      {
        empresaPessoaId: PROPRIETARIA,
        movimento: {
          tipo: 'cessao',
          origemPessoaId: 'lucas',
          destinoPessoaId: CONTROLADORA,
          quotas: 100,
          dataMovimento: null,
        },
      },
    ],
    problema: null,
    avisoDeProporcao: null,
    totalValorCedido: 100,
    totalValorAportado: 100,
    quadroResultante: [],
  },
  empresas: [
    { pessoaId: PROPRIETARIA, denominacao: 'Farroupilha Comércio Ltda' },
    { pessoaId: CONTROLADORA, denominacao: 'Jatobá Sementes S.A.' },
  ],
  descricao: 'Subida das quotas',
  dataMovimento: null,
};

/** As duas pontas na junta, e o livro que o teste quiser. */
function bancoCom(livro: ReturnType<typeof linha>[]) {
  dbMocks.from.mockImplementation((tabela: string) => {
    if (tabela === 'documento_gerado') {
      return respostaDe([{ pj_pessoa_id: PROPRIETARIA }, { pj_pessoa_id: CONTROLADORA }]);
    }
    if (tabela === 'movimentacao_quotas') return respostaDe(livro);
    if (tabela === 'pessoa') return respostaDe([{ id: 'marina', denominacao: 'Marina Alves' }]);
    if (tabela === 'ato_societario') return respostaDe({ id: 'ato-novo' });
    throw new Error(`tabela inesperada no teste: ${tabela}`);
  });
}

/** O `mutationFn` da subida, que é onde a segunda leitura mora. */
type MutacaoDaSubida = { mutationFn: (args: unknown) => Promise<unknown> };

describe('useSubirQuotas, a trava do ingresso pendente', () => {
  it('recusa mesmo com a tela dizendo que pode: o livro tem ingresso não registrado', async () => {
    bancoCom([
      linha({ destino: 'lucas', documento: 'contrato-social' }),
      linha({ destino: 'marina', quotas: 40 }),
    ]);

    await expect((useSubirQuotas() as unknown as MutacaoDaSubida).mutationFn(gesto)).rejects.toThrow(
      /Há ingresso de sócio que nenhuma peça registrada narra: Marina Alves\./,
    );
    // E recusa ANTES de criar o ato: ato sem lançamento é lixo que a tela
    // ofereceria reverter.
    expect(dbMocks.from).not.toHaveBeenCalledWith('ato_societario');
  });

  it('deixa passar quando o livro só tem movimento já formalizado', async () => {
    bancoCom([
      linha({ destino: 'lucas', documento: 'contrato-social' }),
      linha({ destino: 'marina', quotas: 40, documento: 'contrato-social' }),
    ]);

    await expect((useSubirQuotas() as unknown as MutacaoDaSubida).mutationFn(gesto)).resolves.toMatchObject({ atoId: 'ato-novo' });
  });

  it('não trava o sócio que já estava no quadro por peça registrada e só aumentou', async () => {
    bancoCom([
      linha({ destino: 'lucas', documento: 'contrato-social' }),
      linha({ destino: 'lucas', quotas: 40 }),
    ]);

    await expect((useSubirQuotas() as unknown as MutacaoDaSubida).mutationFn(gesto)).resolves.toMatchObject({ atoId: 'ato-novo' });
  });
});
