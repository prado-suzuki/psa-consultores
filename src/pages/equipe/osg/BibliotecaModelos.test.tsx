import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import type { PropsWithChildren, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { BlocoComVersao, BlocoVersaoRow } from '@/hooks/useBibliotecaModelos';

const mocks = vi.hoisted(() => ({
  blocos: [] as unknown[],
  flags: [] as unknown[],
  toggle: vi.fn(),
}));

vi.mock('@/components/equipe/osg/OsgLayout', () => ({
  OsgLayout: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

vi.mock('@/components/equipe/osg/EditorBlocoDialog', () => ({
  EditorBlocoDialog: ({
    open,
    bloco,
    onOpenChange,
  }: {
    open: boolean;
    bloco: { nome: string } | null;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div data-testid="editor">
        {bloco?.nome ?? 'novo'}
        <button onClick={() => onOpenChange(false)}>fechar editor</button>
      </div>
    ) : null,
}));

// Select do shadcn vira <select> nativo (mesmo padrão de ExportDialog.test): dirigir
// o dropdown do Radix no jsdom é ruído, e o que estes testes querem é o predicado.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: PropsWithChildren) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: PropsWithChildren) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

vi.mock('@/hooks/useBibliotecaModelos', () => ({
  useBlocos: () => ({ data: mocks.blocos, isLoading: false }),
  useFlags: () => ({ data: mocks.flags }),
  useToggleBlocoAtivo: () => ({ mutate: mocks.toggle }),
}));

import BibliotecaModelos from './BibliotecaModelos';

const versao = (conteudo: string): BlocoVersaoRow =>
  ({ id: 'v', conteudo, numero_versao: 1, atual: true }) as unknown as BlocoVersaoRow;

const bloco = (over: Partial<BlocoComVersao>): BlocoComVersao =>
  ({
    id: 'b',
    nome: 'Bloco',
    tipo: 'paragrafo',
    categoria: 'capital',
    descricao: null,
    ativo: true,
    repete_colecao: null,
    ancora: null,
    familia_id: null,
    variante_seletor: null,
    variante_rotulo: null,
    variante_ordem: null,
    versao_atual: null,
    flag_ids: [],
    variantes: [],
    ...over,
  }) as BlocoComVersao;

// Recorte da família real do banco (seed 20260806140000): cabeça sem versão, com
// descrição, e variantes 'livre' com o nome prefixado pelo rótulo.
const VAR_POSSE = bloco({
  id: 'var-posse',
  nome: 'Descrição de imóvel: Direitos de escritura não averbada',
  tipo: 'livre',
  familia_id: 'familia',
  variante_rotulo: 'Direitos de escritura não averbada',
  variante_seletor: { 'imovel.posse': 'sim' },
  variante_ordem: 1,
  versao_atual: versao('Um imóvel rural de posse, com direitos provenientes de promessa de compra e venda.'),
});

const VAR_RURAL_CONDOMINIO = bloco({
  id: 'var-rural-condominio',
  nome: 'Descrição de imóvel: Rural, condomínio',
  tipo: 'livre',
  familia_id: 'familia',
  variante_rotulo: 'Rural, condomínio',
  variante_seletor: { 'imovel.rural': 'sim', 'imovel.fracionado': 'sim' },
  variante_ordem: 3,
  flag_ids: ['flag-condominio'],
  versao_atual: versao('A área remanescente deste imóvel é de propriedade dos seguintes condôminos: {{ x }}.'),
});

const FAMILIA = bloco({
  id: 'familia',
  nome: 'Descrição de imóvel',
  descricao: 'Família de variantes: uma redação por caso de imóvel.',
  variantes: [VAR_POSSE, VAR_RURAL_CONDOMINIO],
});

const SOLTO = bloco({
  id: 'solto',
  nome: 'Do objeto',
  tipo: 'clausula',
  categoria: 'objeto',
  versao_atual: versao('Texto do objeto.'),
});

/** Espelha a query string para provar que o deep-link limpa o parâmetro. */
const SondaUrl = () => {
  const [params] = useSearchParams();
  return <div data-testid="url">{params.toString()}</div>;
};

const renderPagina = (blocos: BlocoComVersao[], rota = '/', flags: unknown[] = []) => {
  mocks.blocos = blocos;
  mocks.flags = flags;
  render(
    <MemoryRouter initialEntries={[rota]}>
      <BibliotecaModelos />
      <SondaUrl />
    </MemoryRouter>,
  );
};

const buscar = (user: ReturnType<typeof userEvent.setup>, termo: string) =>
  user.type(screen.getByPlaceholderText(/Buscar bloco/), termo);

const abrirFiltros = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: /Filtros/ }));

describe('BibliotecaModelos', () => {
  it('não lista a variante como carta solta: ela vive dentro do deck da cabeça', () => {
    renderPagina([FAMILIA, SOLTO]);

    expect(screen.getByText('Descrição de imóvel')).toBeInTheDocument();
    expect(screen.getByText('Do objeto')).toBeInTheDocument();
    // O nome da variante não vira título de card nenhum; o que aparece é o rótulo dela no deck.
    expect(screen.queryByText('Descrição de imóvel: Direitos de escritura não averbada')).not.toBeInTheDocument();
    expect(screen.getByText('Direitos de escritura não averbada')).toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('busca encontra a família pelo texto de uma variante e o deck abre nela', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA, SOLTO]);

    await buscar(user, 'condôminos');

    expect(screen.getByText('Descrição de imóvel')).toBeInTheDocument();
    expect(screen.queryByText('Do objeto')).not.toBeInTheDocument();
    // A carta da frente é a que casou, senão o resultado aparece sem o termo procurado.
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Rural, condomínio')).toBeInTheDocument();
  });

  it('busca que casa na cabeça não move o deck', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA]);

    await buscar(user, 'uma redação por caso');

    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('filtro por flag de variante não esconde a família', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA, SOLTO], '/', [{ id: 'flag-condominio', nome: 'imóvel em condomínio' }]);

    await abrirFiltros(user);
    // Ordem dos selects no popover: categoria, flag, status.
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'flag-condominio');

    expect(screen.getByText('Descrição de imóvel')).toBeInTheDocument();
    expect(screen.queryByText('Do objeto')).not.toBeInTheDocument();
  });

  it('filtro por categoria olha também a das variantes', async () => {
    const user = userEvent.setup();
    const familiaSemCategoriaNaCabeca = bloco({ ...FAMILIA, categoria: null, variantes: [VAR_POSSE] });
    renderPagina([familiaSemCategoriaNaCabeca, SOLTO]);

    await abrirFiltros(user);
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'capital');

    expect(screen.getByText('Descrição de imóvel')).toBeInTheDocument();
    expect(screen.queryByText('Do objeto')).not.toBeInTheDocument();
  });

  it('status inativos acha a família quando só a variante está desativada', async () => {
    const user = userEvent.setup();
    const varianteInativa = bloco({ ...VAR_RURAL_CONDOMINIO, ativo: false });
    renderPagina([bloco({ ...FAMILIA, variantes: [VAR_POSSE, varianteInativa] }), SOLTO]);

    await abrirFiltros(user);
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[selects.length - 1], 'inativos');

    expect(screen.getByText('Descrição de imóvel')).toBeInTheDocument();
    expect(screen.queryByText('Do objeto')).not.toBeInTheDocument();
    // No recorte "Inativos" a carta precisa dizer por que está aqui, sem depender
    // de ciclar até a variante desligada.
    expect(screen.getByText('1 de 2 inativas')).toBeInTheDocument();
  });

  it('clicar no card abre o editor da cabeça, não da variante', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA]);

    await user.click(screen.getByText('Descrição de imóvel'));

    expect(screen.getByTestId('editor')).toHaveTextContent('Descrição de imóvel');
  });

  it('deep-link de variante resolve para a cabeça e abre o deck naquela variante', async () => {
    renderPagina([FAMILIA, SOLTO], '/?bloco=var-rural-condominio');

    await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('Descrição de imóvel'));
    expect(screen.getByText('2 de 2')).toBeInTheDocument();
    expect(screen.getByText('Rural, condomínio')).toBeInTheDocument();
  });

  it('deep-link de bloco normal continua abrindo o editor dele', async () => {
    renderPagina([FAMILIA, SOLTO], '/?bloco=solto');

    await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('Do objeto'));
    // Sem variante apontada, o deck da família fica na posição inicial.
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('busca vence a variante fixada pelo deep-link', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA], '/?bloco=var-rural-condominio');

    await waitFor(() => expect(screen.getByText('2 de 2')).toBeInTheDocument());
    // Editor ainda aberto: a fixação do deep-link está viva e perde para o termo.
    expect(screen.getByTestId('editor')).toBeInTheDocument();

    await buscar(user, 'promessa de compra');
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Direitos de escritura não averbada')).toBeInTheDocument();
  });

  it('fechar o editor solta a fixação: apagar a busca depois não puxa o deck de volta', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA], '/?bloco=var-rural-condominio');

    await waitFor(() => expect(screen.getByText('2 de 2')).toBeInTheDocument());
    await user.click(screen.getByText('fechar editor'));

    await buscar(user, 'promessa de compra');
    expect(screen.getByText('1 de 2')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/Buscar bloco/));
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('deep-link limpa o parâmetro bloco da URL depois de resolver', async () => {
    renderPagina([FAMILIA, SOLTO], '/?bloco=var-rural-condominio');

    await waitFor(() => expect(screen.getByTestId('editor')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByTestId('url').textContent).toBe(''));
  });

  it('toggle de ativo dentro do deck chama a mutação da cabeça e não abre o editor', async () => {
    const user = userEvent.setup();
    renderPagina([FAMILIA]);

    await user.click(screen.getByTitle('Desativar'));

    expect(mocks.toggle).toHaveBeenCalledWith({ id: 'familia', ativo: false });
    expect(screen.queryByTestId('editor')).not.toBeInTheDocument();
  });
});
