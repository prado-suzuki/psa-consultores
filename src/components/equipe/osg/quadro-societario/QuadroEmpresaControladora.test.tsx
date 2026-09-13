import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

Object.defineProperties(Element.prototype, {
  hasPointerCapture: { configurable: true, value: () => false },
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

/**
 * A PORTA ÚNICA do quadro da Controladora.
 *
 * O que se prende aqui é o roteamento: cada opção abre EXATAMENTE um formulário,
 * escolher não grava nada, e nenhum caminho de doação vira outro hook por
 * inferência — que é o defeito que a tela antiga tinha, com "Doar quotas" no
 * cabeçalho e "Doação" no select do avulso disputando o mesmo nome.
 */

const mocks = vi.hoisted(() => ({
  quadro: [] as Record<string, unknown>[],
  registrar: vi.fn(),
  doar: vi.fn(),
  instituir: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/hooks/useMovimentacaoQuotas', () => ({
  useQuadroDaEmpresa: () => ({ data: mocks.quadro, isLoading: false }),
  useMovimentosDaEmpresa: () => ({ data: { movimentos: [], atos: [] }, isPending: false }),
  useRegistrarMovimento: () => ({ mutate: mocks.registrar, isPending: false }),
  useReverterAto: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/useDoacaoDeQuotas', () => ({
  useDoarQuotas: () => ({ mutate: mocks.doar, isPending: false }),
  useOnusDaEmpresa: () => ({ data: [] }),
}));
vi.mock('@/hooks/useInstituicaoDeUsufruto', () => ({
  useInstituirUsufruto: () => ({ mutate: mocks.instituir, isPending: false }),
}));

import { QuadroEmpresaControladora } from './QuadroEmpresaControladora';

const EMPRESA = {
  id: 'EMP', denominacao: 'Holding Teste Ltda', tipo_pessoa: 'PJ', tipo_empresa: 'CN',
  cliente_id: 'CLI', cpf_cnpj: null, conjuge_id: null,
} as unknown as PessoaRow;

const ANA = {
  id: 'P-ANA', denominacao: 'Ana Fundadora', tipo_pessoa: 'PF',
  cliente_id: 'CLI', cpf_cnpj: null, conjuge_id: null, tipo_empresa: null,
} as unknown as PessoaRow;

const comSocio = () => {
  mocks.quadro = [{
    pessoaId: 'P-ANA', denominacao: 'Ana Fundadora', tipoPessoa: 'PF',
    cpfCnpj: null, quotas: 1000, vlrTotal: 1000, ordem: null, movimentoIds: [],
  }];
};

const montar = () =>
  render(
    <TooltipProvider>
      <QuadroEmpresaControladora empresa={EMPRESA} pessoasCliente={[EMPRESA, ANA]} />
    </TooltipProvider>,
  );

/** Abre a porta, marca a opção pelo rótulo e confirma. */
async function escolherGesto(user: ReturnType<typeof userEvent.setup>, rotulo: RegExp) {
  await user.click(screen.getByRole('button', { name: 'Registrar movimento' }));
  const porta = screen.getByRole('dialog');
  await user.click(within(porta).getByRole('radio', { name: rotulo }));
  await user.click(within(porta).getByRole('button', { name: 'Continuar' }));
}

beforeEach(() => {
  mocks.quadro = [];
  mocks.registrar.mockReset();
  mocks.doar.mockReset();
  mocks.instituir.mockReset();
  mocks.navigate.mockReset();
});

describe('Quadro da Controladora', () => {
  it('tem um só comando de registro e nenhuma ação por sócio', () => {
    comSocio();
    montar();

    expect(screen.getAllByRole('button', { name: 'Registrar movimento' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Doar quotas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Instituir usufruto/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Ações' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Valor de capital (R$)' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Participação no capital' })).toBeInTheDocument();
  });

  it('oferece os seis gestos, na ordem do catálogo, cada um com sua própria ajuda', async () => {
    const user = userEvent.setup();
    comSocio();
    montar();

    await user.click(screen.getByRole('button', { name: 'Registrar movimento' }));
    const porta = screen.getByRole('dialog');
    expect(within(porta).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual([
      'aporte', 'cessao', 'doacao', 'doacaoComOnus', 'instituicao', 'reducao',
    ]);
    expect(within(porta).getByRole('button', { name: 'Sobre Doação simples' })).toBeInTheDocument();
    expect(
      within(porta).getByRole('button', { name: 'Sobre Doação com reserva de usufruto ou gravames' }),
    ).toBeInTheDocument();
  });

  it('pedir ajuda não marca a opção, e o texto traz quadro e contrato', async () => {
    const user = userEvent.setup();
    comSocio();
    montar();

    await user.click(screen.getByRole('button', { name: 'Registrar movimento' }));
    await user.click(screen.getByRole('button', { name: 'Sobre Redução' }));

    // O Radix duplica o conteúdo da dica numa cópia só para leitor de tela.
    expect(await screen.findAllByText(/Cancela quotas do titular indicado/)).not.toHaveLength(0);
    expect(screen.getAllByText(/ainda não deriva uma resolução específica/)).not.toHaveLength(0);
    expect(screen.getByRole('radio', { name: /Redução/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });

  it.each([
    ['Aporte', 'Registrar movimento de quotas', 'Aporte'],
    ['Cessão', 'Registrar movimento de quotas', 'Cessão'],
    ['Doação simples', 'Registrar movimento de quotas', 'Doação'],
    ['Redução', 'Registrar movimento de quotas', 'Redução'],
    ['Doação com reserva de usufruto ou gravames', 'Doar quotas', 'Doação com reserva de usufruto ou gravames'],
    ['Instituição de usufruto', 'Instituir usufruto', 'Instituição de usufruto'],
  ])('a opção %s abre %s, com o gesto nomeado e sem gravar nada', async (opcao, titulo, gesto) => {
    const user = userEvent.setup();
    comSocio();
    montar();

    await escolherGesto(user, new RegExp(`^${opcao}`));

    const form = screen.getByRole('dialog');
    expect(within(form).getByText(titulo)).toBeInTheDocument();
    expect(within(form).getByText(gesto)).toBeInTheDocument();
    expect(mocks.registrar).not.toHaveBeenCalled();
    expect(mocks.doar).not.toHaveBeenCalled();
    expect(mocks.instituir).not.toHaveBeenCalled();
  });

  it('sem sócio no quadro, só o aporte fica disponível, e o motivo dos demais é visível', async () => {
    const user = userEvent.setup();
    montar();

    await user.click(screen.getByRole('button', { name: 'Registrar movimento' }));
    const porta = screen.getByRole('dialog');

    expect(within(porta).getByRole('radio', { name: /^Aporte/ })).toBeEnabled();
    for (const r of ['Cessão', 'Doação simples', 'Instituição de usufruto', 'Redução']) {
      expect(within(porta).getByRole('radio', { name: new RegExp(`^${r}`) })).toBeDisabled();
    }
    expect(
      within(porta).getAllByText('Ainda não há sócio no quadro: o primeiro movimento é o aporte.'),
    ).toHaveLength(5);
    // A ajuda de uma opção indisponível continua alcançável.
    expect(within(porta).getByRole('button', { name: 'Sobre Cessão' })).toBeEnabled();
  });

  it('com o draft limpo, Trocar movimento volta ao seletor com a opção anterior marcada', async () => {
    const user = userEvent.setup();
    comSocio();
    montar();

    await escolherGesto(user, /^Cessão/);
    await user.click(screen.getByRole('button', { name: 'Trocar movimento' }));

    const porta = await screen.findByRole('dialog');
    expect(within(porta).getByText('Registrar movimento')).toBeInTheDocument();
    expect(within(porta).getByRole('radio', { name: /^Cessão/ })).toBeChecked();
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();
  });

  it('com o draft sujo, Trocar movimento pergunta antes de descartar', async () => {
    const user = userEvent.setup();
    comSocio();
    montar();

    await escolherGesto(user, /^Aporte/);
    await user.type(screen.getByPlaceholderText('0'), '7');
    await user.click(screen.getByRole('button', { name: 'Trocar movimento' }));

    expect(screen.getByText('Descartar alterações?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descartar e fechar' }));

    const porta = await screen.findByRole('dialog');
    expect(within(porta).getByRole('radio', { name: /^Aporte/ })).toBeChecked();
    expect(mocks.registrar).not.toHaveBeenCalled();
  });

  it('o quadro vazio ensina o primeiro movimento sem inventar um segundo comando', () => {
    montar();
    expect(
      screen.getByText(
        'O quadro começa com um aporte. Use Registrar movimento para informar quem recebe as quotas.',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Registrar movimento' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ir para Qualificação das Partes' })).toBeInTheDocument();
  });
});
