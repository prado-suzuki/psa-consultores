import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('sonner', () => ({ toast: mocks.toast }));
// A ficha expandida É o PessoaModal de produção; estes são os hooks que ele usa.
// Nenhum deles chega a ser exercitado aqui: quem grava é o classificador.
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  useUpsertPessoa: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertParentesco: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteParentesco: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useParentescosByCliente: () => ({ data: [] }),
}));
vi.mock('@/hooks/useDocumentoGerado', () => ({
  useClienteTemDocumentoGerado: () => ({ data: false }),
}));
// Formulários de bem/matrícula: pesados (cartório, titularidades) e cobertos
// pelos testes dos próprios modais. Aqui interessa só o vaivém do rascunho.
vi.mock('@/components/equipe/osg/documentos/classificar/FichaFormularios', () => ({
  FormBem: () => <div>Formulário de bem</div>,
  FormMatricula: () => <div>Formulário de matrícula</div>,
}));
vi.mock('@/contexts/OsgWorkContext', () => ({ useOsgWork: () => ({ clienteId: 'C1' }) }));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useUpsertBem: () => ({ mutate: vi.fn(), isPending: false }),
  useUpsertMatricula: () => ({ mutate: vi.fn(), isPending: false }),
  useMatriculasByBem: () => ({ data: [], isLoading: false }),
  useDeleteMatricula: () => ({ mutate: vi.fn() }),
  useSetMatriculaBem: () => ({ mutate: vi.fn() }),
  useTitularidadesByMatricula: () => ({ data: [] }),
}));

import { FichaColuna } from './FichaColuna';

function renderFicha(overrides: Partial<React.ComponentProps<typeof FichaColuna>> = {}) {
  const props = {
    doc: null,
    naLeva: 2,
    clienteId: 'C1',
    pessoasCliente: [],
    imoveis: [],
    opcoes: { pessoas: [], bens: [], matriculas: [] },
    salvando: false,
    sugestao: null,
    modo: 'novo' as const,
    onModo: vi.fn(),
    alvo: '',
    onAlvo: vi.fn(),
    onCadastrar: vi.fn(),
    onVincular: vi.fn(),
    onLimpar: vi.fn(),
    ...overrides,
  };
  return { ...render(<FichaColuna {...props} />), props };
}

const coluna = () => within(screen.getByRole('region', { name: 'Ficha do cadastro' }));
const popout = () => within(screen.getByRole('dialog'));

function campo(escopo: ReturnType<typeof coluna>, label: RegExp | string) {
  const rotulo = escopo.getByText(label, { selector: 'label' });
  const controle = rotulo.parentElement?.querySelector('input');
  if (!controle) throw new Error(`Campo não encontrado: ${String(label)}`);
  return controle;
}

const abrirPopout = () => userEvent.click(screen.getByRole('button', { name: 'Abrir o formulário em tela cheia' }));

beforeAll(() => {
  // APIs de ponteiro que o Radix usa e o jsdom não tem.
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => vi.clearAllMocks());

describe('FichaColuna — o formulário em tela cheia', () => {
  it('leva para o modal o que já estava digitado na coluna', async () => {
    renderFicha();
    fireEvent.change(campo(coluna(), /Nome completo/), { target: { value: 'Maria Aparecida' } });
    await abrirPopout();

    // É o modal de cadastro de verdade, já preenchido — não um formulário em branco.
    expect(screen.getByRole('heading', { name: /Nova pessoa/ })).toBeInTheDocument();
    expect(campo(popout(), /Nome completo/)).toHaveValue('Maria Aparecida');
  });

  it('devolve para a coluna o que foi digitado no modal', async () => {
    renderFicha();
    fireEvent.change(campo(coluna(), /Nome completo/), { target: { value: 'Maria' } });
    await abrirPopout();

    fireEvent.change(campo(popout(), /Nome completo/), { target: { value: 'Maria Aparecida Ferreira' } });
    fireEvent.change(campo(popout(), 'CPF'), { target: { value: '123.456.789-01' } });
    await userEvent.click(popout().getByRole('button', { name: 'Cancelar' }));

    // Fechar não é descartar: o rascunho volta inteiro, sem perguntar nada.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Descartar alterações?')).not.toBeInTheDocument();
    expect(campo(coluna(), /Nome completo/)).toHaveValue('Maria Aparecida Ferreira');
    expect(campo(coluna(), 'CPF')).toHaveValue('123.456.789-01');
  });

  it('gravar de dentro do modal segue o mesmo caminho do botão da coluna', async () => {
    const { props } = renderFicha();
    await abrirPopout();
    fireEvent.change(campo(popout(), /Nome completo/), { target: { value: 'Maria Aparecida' } });

    // O rótulo do botão promete a leva inteira, e é a leva inteira que é gravada.
    await userEvent.click(popout().getByRole('button', { name: 'Cadastrar e vincular 2 arquivos' }));

    expect(props.onCadastrar).toHaveBeenCalledWith({
      tipo: 'pessoa',
      values: expect.objectContaining({ cliente_id: 'C1', tipo_pessoa: 'PF', denominacao: 'Maria Aparecida' }),
      parentesco: { parenteId: '', tipo: '', natureza: '' },
    });
  });

  it('em Vincular não há formulário para expandir', () => {
    renderFicha({ modo: 'existente' });
    expect(screen.queryByRole('button', { name: 'Abrir o formulário em tela cheia' })).not.toBeInTheDocument();
  });

  it('matrícula sem imóvel escolhido não expande: o modal não tem esse campo', async () => {
    renderFicha();
    await userEvent.click(screen.getByRole('button', { name: 'Matrícula' }));
    expect(screen.getByRole('button', { name: 'Abrir o formulário em tela cheia' })).toBeDisabled();
  });
});
