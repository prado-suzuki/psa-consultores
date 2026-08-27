// O fluxo da bancada Produtos & Serviços, travado nos seis pontos que a
// curadoria reprovou em 27/08/2026 — e que passaram TODOS pela mesma tela sem
// nenhum teste olhando.
//
// Por que teste de tela e não de função pura: cinco dos seis defeitos eram de
// composição, não de cálculo. A coluna do meio era substituída por um cartaz e
// levava com ela os botões de criar; o lápis do produto não existia em lugar
// nenhum; a lista escondia 72 itens atrás de sanfonas; e o aviso afirmava um
// bloqueio que o banco não tem. Nenhum deles apareceria num teste de `lib`.
//
// Os diálogos de formulário entram como dublês. Não é economia: o defeito era o
// pai NUNCA passar um produto para o diálogo editar, então o que precisa ser
// verificado é justamente o que a bancada entrega na prop — abrir o formulário
// de verdade só empurraria a asserção para dentro de um `<Input>`.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProdutoSegmento, ServicoPrestado } from '@/hooks/useCategorias';

const CLUSTER_TAX = 'c-tax';
const CLUSTER_OSG = 'c-osg';

const produto = (
  id: string, codigo: string, nome: string, clusterId: string | null, clusterNome: string | null,
): ProdutoSegmento => ({
  id, codigo, nome, is_active: true, cluster_id: clusterId,
  estrutura_clusters: clusterNome ? { name: clusterNome } : null,
});

const servico = (
  id: string, nome: string, clusterId: string | null, clusterNome: string | null,
): ServicoPrestado => ({
  id, nome, cluster_id: clusterId, estrutura_clusters: clusterNome ? { name: clusterNome } : null,
});

const mocks = vi.hoisted(() => ({
  toggle: vi.fn(),
  lote: vi.fn(),
  remover: vi.fn(),
  sucesso: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { success: mocks.sucesso, error: vi.fn() } }));

vi.mock('@/hooks/useCategorias', () => ({
  isVinculoOtimista: (id: string) => id.startsWith('otimista:'),
  useProdutoSegmentoList: () => ({ data: dados.produtos }),
  useServicosPrestadosList: () => ({ data: dados.servicos }),
  useProdutoServicoList: () => ({ data: dados.vinculos, isLoading: false }),
  useProdutoServicoToggle: () => ({ mutateAsync: mocks.toggle }),
  useProdutoServicoLote: () => ({ mutateAsync: mocks.lote }),
  useServicosPrestadosDelete: () => ({ remove: mocks.remover }),
}));

// Dublês dos formulários: revelam em texto o que a bancada passou na prop.
vi.mock('@/components/equipe/produto-servico/ProdutoFormDialog', () => ({
  default: ({ aberto, produto: alvo }: { aberto: boolean; produto: ProdutoSegmento | null }) => (
    aberto ? <div data-testid="form-produto">{alvo ? `editar:${alvo.nome}` : 'novo'}</div> : null
  ),
}));
vi.mock('@/components/equipe/produto-servico/ServicoFormDialog', () => ({
  default: ({ aberto, servico: alvo }: { aberto: boolean; servico: ServicoPrestado | null }) => (
    aberto ? <div data-testid="form-servico">{alvo ? `editar:${alvo.nome}` : 'novo'}</div> : null
  ),
}));

import ProdutosServicosTab from '@/components/equipe/ProdutosServicosTab';

/**
 * O catálogo é um recorte fiel do de produção (consultado em 27/08/2026): a Tax
 * numera "1.1" e a OSG "1.01", existem serviços sem prefixo nenhum e existe um
 * serviço sem cluster. É essa mistura que quebrava o agrupamento antigo.
 */
const dados = {
  produtos: [] as ProdutoSegmento[],
  servicos: [] as ServicoPrestado[],
  vinculos: [] as Array<{
    id: string;
    produto_segmento_id: string;
    servico_prestado_id: string;
    produto_segmento: { codigo: string; nome: string } | null;
    servicos_prestados: { nome: string } | null;
  }>,
};

const CHA = 'Canal de Chamados';
const CONTABIL = 'Consultoria contábil';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.toggle.mockResolvedValue({ action: 'created', id: 'novo-vinculo' });
  mocks.lote.mockResolvedValue({ acao: 'vincular', criados: [] });

  dados.produtos = [
    produto('p-cha', 'CHA', CHA, CLUSTER_TAX, 'TAX'),
    produto('p-cc', '03-CC', CONTABIL, CLUSTER_TAX, 'TAX'),
  ];
  dados.servicos = [
    // Fora de ordem de propósito: é a tela que ordena.
    servico('s-110', '1.10.Décimo item da primeira', CLUSTER_TAX, 'TAX'),
    servico('s-12', '1.2.Revisão de plano de contas', CLUSTER_TAX, 'TAX'),
    servico('s-outros', 'Outros', CLUSTER_TAX, 'TAX'),
    servico('s-21', '2.1.Análise das demonstrações financeiras', CLUSTER_TAX, 'TAX'),
    servico('s-11', '1.1.Apoio na implantação de práticas contábeis', CLUSTER_TAX, 'TAX'),
    servico('s-osg', '1.01.Levantar a estrutura societária', CLUSTER_OSG, 'OSG'),
    servico('s-sem', '6.2.Elaboração de PER/DCOMP', null, null),
  ];
  dados.vinculos = [{
    id: 'v-cc-12',
    produto_segmento_id: 'p-cc',
    servico_prestado_id: 's-12',
    produto_segmento: { codigo: '03-CC', nome: CONTABIL },
    servicos_prestados: { nome: '1.2.Revisão de plano de contas' },
  }];
});

const TITULO_DA_LINHA = 'Clique para ver os detalhes · Shift+clique para selecionar a faixa';

/** Os nomes de serviço na ORDEM em que a tela os mostra. */
const servicosNaTela = () => screen.getAllByTitle(TITULO_DA_LINHA).map((b) => b.textContent);

const abrirProduto = async (user: ReturnType<typeof userEvent.setup>, nome: string) => {
  await user.click(screen.getByRole('button', { name: new RegExp(nome) }));
};

describe('produto sem serviço nenhum', () => {
  // O caso do Canal de Chamados: 0 vínculos é ESTADO DESEJADO, e a tela tratava
  // como beco sem saída — trocava a coluna do meio por um cartaz.
  it('mantém na tela as saídas que o cartaz engolia', async () => {
    render(<ProdutosServicosTab />);
    await abrirProduto(userEvent.setup(), CHA);

    expect(screen.getByRole('button', { name: /Novo serviço/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar produto/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Buscar serviço...')).toBeInTheDocument();
    // e a lista continua clicável: o produto sem vínculo é onde mais se vincula
    expect(servicosNaTela().length).toBeGreaterThan(0);
  });

  /*
   * A frase antiga — "Sem vínculo, nenhum projeto pode ser cadastrado para ele"
   * — era FALSA, e este teste é o que impede sua volta. Conferido nos dois
   * lados: `validateProjectForm` não exige `servico_id`, e
   * `gerar_tarefas_projeto` sai por `select` vazio devolvendo 0, sem exceção.
   */
  it('avisa sem prometer bloqueio que o banco não tem', async () => {
    render(<ProdutosServicosTab />);
    await abrirProduto(userEvent.setup(), CHA);

    expect(screen.getByText(/nascem sem tarefa nenhuma/i)).toBeInTheDocument();
    expect(screen.queryByText(/nenhum projeto pode ser cadastrado/i)).not.toBeInTheDocument();
  });

  it('o contador 0/y não é alerta — nem na linha, nem na cor', () => {
    render(<ProdutosServicosTab />);

    const linha = screen.getByRole('button', { name: new RegExp(CHA) });
    const contador = within(linha).getByTitle(/nascem sem tarefa/i);
    expect(contador).toHaveTextContent('0/5');
    expect(contador.className).not.toMatch(/warning/);
  });
});

describe('lista de serviços', () => {
  it('mostra tudo de uma vez, na ordem do código, sem sanfona', async () => {
    render(<ProdutosServicosTab />);
    await abrirProduto(userEvent.setup(), CHA);

    // "1.10" DEPOIS de "1.2": a comparação é numérica, segmento a segmento.
    // "Outros", sem código, fecha a lista em vez de virar grupo à parte.
    expect(servicosNaTela()).toEqual([
      'Apoio na implantação de práticas contábeis',
      'Revisão de plano de contas',
      'Décimo item da primeira',
      'Análise das demonstrações financeiras',
      'Outros',
    ]);
    expect(screen.queryByText(/Seção/i)).not.toBeInTheDocument();
  });

  it('esconde os outros clusters até alguém pedir', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CHA);

    expect(screen.queryByText('Levantar a estrutura societária')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Ver 2 serviços de outros clusters/ }));

    expect(screen.getByText('Levantar a estrutura societária')).toBeInTheDocument();
    // O serviço sem cluster também está ali — é o único caminho até ele.
    expect(screen.getByText('Elaboração de PER/DCOMP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ocultar os 2 serviços/ })).toBeInTheDocument();
  });

  it('trocar de produto fecha os outros clusters de novo', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CHA);
    await user.click(screen.getByRole('button', { name: /Ver 2 serviços de outros clusters/ }));

    await abrirProduto(user, CONTABIL);

    expect(screen.queryByText('Levantar a estrutura societária')).not.toBeInTheDocument();
  });

  it('a busca recorta a lista sem mexer na ordem', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CHA);

    // "1." é como se pede a antiga seção 1 — e daí sai o "Vincular visíveis".
    await user.type(screen.getByPlaceholderText('Buscar serviço...'), 'contábeis');

    expect(servicosNaTela()).toEqual(['Apoio na implantação de práticas contábeis']);
  });
});

describe('vincular e desvincular', () => {
  it('a caixa vincula na hora, com o produto e o serviço certos', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CHA);

    await user.click(screen.getByRole('checkbox', {
      name: 'Vincular Apoio na implantação de práticas contábeis',
    }));

    expect(mocks.toggle).toHaveBeenCalledWith(expect.objectContaining({
      produtoSegmentoId: 'p-cha',
      servicoPrestadoId: 's-11',
      vinculoAtual: null,
    }));
    expect(mocks.sucesso).toHaveBeenCalled();
  });

  it('serviço já vinculado desvincula mandando o vínculo existente', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CONTABIL);

    const caixa = screen.getByRole('checkbox', { name: 'Desvincular Revisão de plano de contas' });
    expect(caixa).toBeChecked();
    await user.click(caixa);

    expect(mocks.toggle).toHaveBeenCalledWith(expect.objectContaining({
      produtoSegmentoId: 'p-cc',
      servicoPrestadoId: 's-12',
      vinculoAtual: expect.objectContaining({ id: 'v-cc-12' }),
    }));
  });
});

describe('editar o que a tela mostra', () => {
  // O defeito: `ProdutoFormDialog` sempre soube editar, mas nada na tela lhe
  // passava um produto — só existia o caminho de criar.
  it('o lápis abre o formulário DO produto aberto', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CHA);

    await user.click(screen.getByRole('button', { name: /Editar produto/ }));

    expect(screen.getByTestId('form-produto')).toHaveTextContent(`editar:${CHA}`);
  });

  it('"Novo produto" abre o mesmo formulário em branco', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);

    await user.click(screen.getByRole('button', { name: /Novo produto/ }));

    expect(screen.getByTestId('form-produto')).toHaveTextContent('novo');
  });

  it('clicar no nome do serviço abre o painel, e é lá que ele se edita', async () => {
    const user = userEvent.setup();
    render(<ProdutosServicosTab />);
    await abrirProduto(user, CHA);

    await user.click(screen.getByText('Análise das demonstrações financeiras'));
    await user.click(screen.getByRole('button', { name: /Editar serviço/ }));

    expect(screen.getByTestId('form-servico'))
      .toHaveTextContent('editar:2.1.Análise das demonstrações financeiras');
  });
});
