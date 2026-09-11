import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';

Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

/**
 * CARACTERIZAÇÃO dos três formulários do Quadro Societário.
 *
 * Escrito ANTES da reorganização da interface (docs/planos/ui-ux-fluxo-societario-osg-work.md)
 * e deliberadamente preso ao que a reorganização NÃO pode mudar: quem aparece em
 * cada lista de pessoas, quais lados o tipo do movimento tem, os padrões
 * marcados dos macros e — sobretudo — o payload que cada hook recebe.
 *
 * Não trava a NAVEGAÇÃO (qual botão abre qual formulário): essa é exatamente a
 * parte que o plano substitui, e travá-la aqui seria escrever o teste para
 * reescrevê-lo no commit seguinte. O que ela trava é que, seja qual for a
 * porta, o que chega ao banco continua o mesmo.
 */

const mocks = vi.hoisted(() => ({
  registrar: vi.fn(),
  doar: vi.fn(),
  instituir: vi.fn(),
  onus: [] as Record<string, unknown>[],
}));

vi.mock('@/hooks/useMovimentacaoQuotas', () => ({
  useRegistrarMovimento: () => ({ mutate: mocks.registrar, isPending: false }),
}));
vi.mock('@/hooks/useDoacaoDeQuotas', () => ({
  useDoarQuotas: () => ({ mutate: mocks.doar, isPending: false }),
  useOnusDaEmpresa: () => ({ data: mocks.onus }),
}));
vi.mock('@/hooks/useInstituicaoDeUsufruto', () => ({
  useInstituirUsufruto: () => ({ mutate: mocks.instituir, isPending: false }),
}));

import { DoarQuotasDialog } from './DoarQuotasDialog';
import { InstituirUsufrutoDialog } from './InstituirUsufrutoDialog';
import { MovimentoModal } from './MovimentoModal';

const pessoa = (id: string, denominacao: string, tipo: 'PF' | 'PJ', extra: Record<string, unknown> = {}) =>
  ({
    id,
    denominacao,
    tipo_pessoa: tipo,
    cpf_cnpj: null,
    cliente_id: 'CLI',
    conjuge_id: null,
    tipo_empresa: tipo === 'PJ' ? 'CN' : null,
    ...extra,
  }) as unknown as PessoaRow;

const socio = (id: string, denominacao: string, quotas: number, tipoPessoa: 'PF' | 'PJ' = 'PF'): SocioDoQuadro => ({
  pessoaId: id,
  denominacao,
  tipoPessoa,
  cpfCnpj: null,
  quotas,
  vlrTotal: quotas,
  ordem: null,
  movimentoIds: [],
});

const EMPRESA = pessoa('EMP', 'Holding Teste Ltda', 'PJ');
const ANA = pessoa('P-ANA', 'Ana Fundadora', 'PF', { conjuge_id: 'P-BRUNO' });
const BRUNO = pessoa('P-BRUNO', 'Bruno Fundador', 'PF', { conjuge_id: 'P-ANA' });
const CLARA = pessoa('P-CLARA', 'Clara Filha', 'PF');
const OUTRA_PJ = pessoa('P-PJ', 'Operacional Ltda', 'PJ');
const PESSOAS = [EMPRESA, ANA, BRUNO, CLARA, OUTRA_PJ];

const QUADRO = [socio('P-ANA', 'Ana Fundadora', 600), socio('P-BRUNO', 'Bruno Fundador', 400)];

const comProvider = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);

/** Abre o combobox de índice `i` e escolhe a opção cujo nome casa com `nome`. */
async function escolher(user: ReturnType<typeof userEvent.setup>, i: number, nome: RegExp) {
  await user.click(screen.getAllByRole('combobox')[i]);
  await user.click(await screen.findByRole('option', { name: nome }));
}

beforeEach(() => {
  mocks.registrar.mockReset();
  mocks.doar.mockReset();
  mocks.instituir.mockReset();
  mocks.onus = [];
});

describe('MovimentoModal (movimento avulso)', () => {
  it('no aporte não há lado de origem, e o destino alcança PF e PJ do cliente menos a própria empresa', async () => {
    const user = userEvent.setup();
    comProvider(
      <MovimentoModal
        open
        tipo="aporte"
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Quem cede as quotas')).not.toBeInTheDocument();
    expect(screen.getByText('Quem recebe as quotas')).toBeInTheDocument();

    await user.click(screen.getAllByRole('combobox')[0]);
    const opcoes = (await screen.findAllByRole('option')).map((o) => o.textContent);
    expect(opcoes).toEqual([
      'Ana Fundadora', 'Bruno Fundador', 'Clara Filha', 'Operacional Ltda',
    ]);
    expect(opcoes).not.toContain('Holding Teste Ltda');
  });

  it('grava o aporte com o payload exato do hook, e o valor de capital sai das quotas ao nominal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    comProvider(
      <MovimentoModal
        open
        tipo="aporte"
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={onClose}
      />,
    );

    await escolher(user, 0, /Clara Filha/);
    await user.type(screen.getByPlaceholderText('0'), '250');

    await user.click(screen.getByRole('button', { name: /Registrar aporte/i }));

    expect(mocks.registrar).toHaveBeenCalledTimes(1);
    const [payload, opcoes] = mocks.registrar.mock.calls[0];
    expect(payload).toEqual({
      clienteId: 'CLI',
      empresaPessoaId: 'EMP',
      movimento: {
        tipo: 'aporte',
        origemPessoaId: null,
        destinoPessoaId: 'P-CLARA',
        quotas: 250,
        dataMovimento: null,
      },
      entityName: 'Clara Filha',
    });

    opcoes.onSuccess();
    expect(onClose).toHaveBeenCalled();
  });

  it('na cessão a origem é só quem tem quotas no quadro, e o log nomeia quem recebe', async () => {
    const user = userEvent.setup();
    comProvider(
      <MovimentoModal
        open
        tipo="cessao"
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getAllByRole('combobox')[0]);
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      'Ana Fundadora · 600 quotas', 'Bruno Fundador · 400 quotas',
    ]);
    await user.click(screen.getByRole('option', { name: /Ana Fundadora/ }));

    await escolher(user, 1, /Operacional Ltda/);
    await user.type(screen.getByPlaceholderText('0'), '100');
    await user.click(screen.getByRole('button', { name: /Registrar cessão/i }));

    const [payload] = mocks.registrar.mock.calls[0];
    expect(payload.movimento).toEqual({
      tipo: 'cessao',
      origemPessoaId: 'P-ANA',
      destinoPessoaId: 'P-PJ',
      quotas: 100,
      dataMovimento: null,
    });
    expect(payload.entityName).toBe('Operacional Ltda');
  });

  it('na redução não há destino, e o log nomeia de quem as quotas saíram', async () => {
    const user = userEvent.setup();
    comProvider(
      <MovimentoModal
        open
        tipo="reducao"
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText('Quem recebe as quotas')).not.toBeInTheDocument();
    await escolher(user, 0, /Bruno Fundador/);
    await user.type(screen.getByPlaceholderText('0'), '40');
    await user.click(screen.getByRole('button', { name: /Registrar redução/i }));

    const [payload] = mocks.registrar.mock.calls[0];
    expect(payload.movimento).toEqual({
      tipo: 'reducao',
      origemPessoaId: 'P-BRUNO',
      destinoPessoaId: null,
      quotas: 40,
      dataMovimento: null,
    });
    expect(payload.entityName).toBe('Bruno Fundador');
  });

  it('com saldo insuficiente o botão trava e o motivo aparece, sem chamar o hook', async () => {
    const user = userEvent.setup();
    comProvider(
      <MovimentoModal
        open
        tipo="cessao"
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={vi.fn()}
      />,
    );

    await escolher(user, 0, /Ana Fundadora/);
    await escolher(user, 1, /Clara Filha/);
    await user.type(screen.getByPlaceholderText('0'), '9999');

    expect(screen.getByText(/Quem cede tem 600 quota\(s\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar cessão/i })).toBeDisabled();
    expect(mocks.registrar).not.toHaveBeenCalled();
  });

  it('fechar sem mexer em nada não pergunta nada; com o draft sujo, pergunta antes de descartar', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = comProvider(
      <MovimentoModal open tipo="aporte" empresa={EMPRESA} quadro={QUADRO} pessoasCliente={PESSOAS} onClose={onClose} />,
    );

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <MovimentoModal open tipo="aporte" empresa={EMPRESA} quadro={QUADRO} pessoasCliente={PESSOAS} onClose={onClose} />
      </TooltipProvider>,
    );
    await user.type(screen.getByPlaceholderText('0'), '5');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Descartar alterações?')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Descartar e fechar' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe('DoarQuotasDialog (doação em ato)', () => {
  const abrir = (onClose = vi.fn()) =>
    comProvider(
      <DoarQuotasDialog
        open
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={onClose}
      />,
    );

  it('abre com reserva, voto, origem declarada e os três gravames padrão marcados', () => {
    abrir();
    expect(screen.getByRole('switch', { name: /reserva o usufruto/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /estendido ao voto/i })).toBeChecked();
    expect(screen.getByRole('switch', { name: /origem no patrimônio/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Inalienabilidade/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Impenhorabilidade/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Incomunicabilidade/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Reversibilidade/ })).not.toBeChecked();
  });

  it('só PF doa e só PF recebe: a PJ do cliente não entra em nenhum dos dois lados', async () => {
    const user = userEvent.setup();
    abrir();

    await user.click(screen.getAllByRole('combobox')[0]);
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      'Ana Fundadora · 600 quotas', 'Bruno Fundador · 400 quotas',
    ]);
    await user.keyboard('{Escape}');

    await user.click(screen.getAllByRole('combobox')[1]);
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      'Ana Fundadora', 'Bruno Fundador', 'Clara Filha',
    ]);
  });

  it('grava o plano com reserva, cônjuge em conjunto e os gravames padrão', async () => {
    const user = userEvent.setup();
    abrir();

    await escolher(user, 0, /Ana Fundadora/);
    await escolher(user, 1, /Clara Filha/);
    await user.type(screen.getByPlaceholderText('0'), '101');

    await user.click(screen.getByRole('button', { name: /Registrar doação/i }));

    expect(mocks.doar).toHaveBeenCalledTimes(1);
    const [payload] = mocks.doar.mock.calls[0];
    expect(payload.clienteId).toBe('CLI');
    expect(payload.empresaPessoaId).toBe('EMP');
    expect(payload.dataMovimento).toBeNull();
    expect(payload.plano.problema).toBeNull();
    expect(payload.plano.lancamentos).toHaveLength(1);

    const [lancamento] = payload.plano.lancamentos;
    // Metade legítima, metade disponível, sobra na legítima.
    expect(lancamento.movimento).toMatchObject({
      tipo: 'doacao',
      origemPessoaId: 'P-ANA',
      destinoPessoaId: 'P-CLARA',
      quotas: 101,
      quotasLegitima: 51,
      quotasDisponivel: 50,
    });
    expect(lancamento.onus).toMatchObject({
      nuProprietarioId: 'P-CLARA',
      usufrutuarioIds: ['P-ANA', 'P-BRUNO'],
      comVoto: true,
      gravames: ['inalienabilidade', 'impenhorabilidade', 'incomunicabilidade'],
    });
  });

  it('sem reserva o ônus continua existindo pelos gravames marcados, e sem voto', async () => {
    const user = userEvent.setup();
    abrir();

    await escolher(user, 0, /Bruno Fundador/);
    await escolher(user, 1, /Clara Filha/);
    await user.type(screen.getByPlaceholderText('0'), '10');
    await user.click(screen.getByRole('switch', { name: /reserva o usufruto/i }));

    await user.click(screen.getByRole('button', { name: /Registrar doação/i }));

    const [payload] = mocks.doar.mock.calls[0];
    const [lancamento] = payload.plano.lancamentos;
    expect(lancamento.onus.usufrutuarioIds).toEqual([]);
    expect(lancamento.onus.comVoto).toBe(false);
    expect(lancamento.onus.gravames).toEqual([
      'inalienabilidade', 'impenhorabilidade', 'incomunicabilidade',
    ]);
  });

  it('sem reserva e sem gravame nenhum não há ônus: é a doação simples, e o plano avisa', async () => {
    const user = userEvent.setup();
    abrir();

    await escolher(user, 0, /Bruno Fundador/);
    await escolher(user, 1, /Clara Filha/);
    await user.type(screen.getByPlaceholderText('0'), '10');
    await user.click(screen.getByRole('switch', { name: /reserva o usufruto/i }));
    for (const g of ['Inalienabilidade', 'Impenhorabilidade', 'Incomunicabilidade']) {
      await user.click(screen.getByRole('checkbox', { name: new RegExp(g) }));
    }

    await user.click(screen.getByRole('button', { name: /Registrar doação/i }));

    const [payload] = mocks.doar.mock.calls[0];
    expect(payload.plano.lancamentos[0].onus).toBeNull();
  });
});

describe('InstituirUsufrutoDialog (instituição avulsa)', () => {
  const abrir = (onClose = vi.fn()) =>
    comProvider(
      <InstituirUsufrutoDialog
        open
        empresa={EMPRESA}
        quadro={QUADRO}
        pessoasCliente={PESSOAS}
        onClose={onClose}
      />,
    );

  it('concede qualquer sócio do quadro, usufrui só PF, e o voto entra ligado', async () => {
    const user = userEvent.setup();
    abrir();

    expect(screen.getByRole('switch', { name: /direito de voto/i })).toBeChecked();

    await user.click(screen.getAllByRole('combobox')[0]);
    expect((await screen.findAllByRole('option')).map((o) => o.textContent)).toEqual([
      'Ana Fundadora · 600 quotas', 'Bruno Fundador · 400 quotas',
    ]);
    await user.click(screen.getByRole('option', { name: /Ana Fundadora/ }));

    // Quem concede não pode usufruir o que já é seu: some da lista de caixas.
    const caixas = screen.getAllByRole('checkbox').map((c) => c.getAttribute('aria-label') ?? c.closest('label')?.textContent);
    expect(caixas.join('|')).not.toMatch(/Ana Fundadora/);
  });

  it('grava a concessão com o payload do hook, e o voto desligado chega como falso', async () => {
    const user = userEvent.setup();
    abrir();

    await escolher(user, 0, /Bruno Fundador/);
    const linha = screen.getByText('Quem passa a usufruir').closest('div')!;
    await user.click(within(linha).getByRole('checkbox', { name: /Clara Filha/ }));
    await user.type(screen.getAllByRole('textbox')[0], '150');
    await user.click(screen.getByRole('switch', { name: /direito de voto/i }));

    await user.click(screen.getByRole('button', { name: /Registrar instituição/i }));

    expect(mocks.instituir).toHaveBeenCalledTimes(1);
    const [payload] = mocks.instituir.mock.calls[0];
    expect(payload.clienteId).toBe('CLI');
    expect(payload.empresaPessoaId).toBe('EMP');
    expect(payload.dataDoAto).toBeNull();
    expect(payload.plano.problema).toBeNull();
    expect(payload.plano.onus).toHaveLength(1);
    expect(payload.plano.onus[0]).toMatchObject({
      nuProprietarioId: 'P-BRUNO',
      usufrutuarioIds: ['P-CLARA'],
      quotas: 150,
      comVoto: false,
    });
  });
});
