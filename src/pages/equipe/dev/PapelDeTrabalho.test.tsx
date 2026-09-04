import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fireEvent, render as renderCru, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { PropsWithChildren, ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * A tela passou a escolher cliente e OS e a ler o historico, e isso e Supabase.
 * Os hooks entram mockados, como o `ConsultaEFDICMS.test.tsx` faz: o que este
 * arquivo prende e o que a pessoa VE, e nao a consulta.
 */
const mocks = vi.hoisted(() => ({
  clientes: [{ id: 'cli-1', nome: 'Fazenda Aurora' }],
  ordens: [
    {
      id: 'os-1',
      numero_os: 'OS-001',
      situacao: 'em_andamento',
      data_inicio: null,
      data_fim: null,
    },
  ],
  estudos: [] as Array<{ id: string; ordem_servico_id: string | null }>,
  revisoes: [] as unknown[],
  gravar: vi.fn(),
  descartar: vi.fn(),
  isAdmin: false,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAdmin: mocks.isAdmin }),
}));

vi.mock('@/hooks/useDevClients', () => ({
  useClientesList: () => ({ data: mocks.clientes }),
}));

vi.mock('@/hooks/useDomainPapelDeTrabalho', () => ({
  useOrdensDeServicoDoCliente: () => ({ data: mocks.ordens, isLoading: false }),
  useEstudosDoCliente: () => ({ data: mocks.estudos }),
  useRevisoesDoEstudo: () => ({ data: mocks.revisoes, isLoading: false }),
  useImportarPapelDeTrabalho: () => ({ mutateAsync: mocks.gravar, isPending: false }),
  useDescartarRevisao: () => ({ mutate: mocks.descartar, isPending: false }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));

vi.mock('@/components/equipe/dev/DevLayout', () => ({
  DevLayout: ({ children, title }: PropsWithChildren<{ title: string }>) => (
    <main>
      <h1>{title}</h1>
      {children}
    </main>
  ),
}));

import PapelDeTrabalho, { Revisoes } from '@/pages/equipe/dev/PapelDeTrabalho';

/**
 * Confere a tela de conferência do WP.
 *
 * O que este arquivo prende é o que a pessoa vê, e sobretudo a **assimetria entre
 * impedimento e aviso**: se os dois virarem a mesma caixa, o desenho perde o
 * sentido, e isso é o tipo de regressão que passa em revisão de código.
 */

/*
 * O `TooltipProvider` mora no `App.tsx`, então a tela conta com ele em produção. O
 * teste renderiza fora da árvore do app, e o Tooltip do Radix lança sem provider:
 * daí este `render` próprio, em vez de espalhar o provider em cada caso.
 */
const render = (ui: ReactElement) => renderCru(<TooltipProvider>{ui}</TooltipProvider>);

const FIXTURES = join(
  __dirname,
  '..',
  '..',
  '..',
  'lib',
  'planejamento-tributario',
  '__fixtures__',
);

function escolhe(conteudo: BlobPart, nome: string) {
  const arquivo = new File([conteudo], nome);
  const entrada = document.querySelector('input[type="file"]') as HTMLInputElement;

  /*
   * `fireEvent` e não `userEvent.upload`: o input é escondido de propósito, e o
   * clique real vem do botão. O que se testa aqui é a reação à escolha.
   */
  Object.defineProperty(entrada, 'files', { value: [arquivo], configurable: true });
  fireEvent.change(entrada);
}

function fixture(caso: string): BlobPart {
  return readFileSync(join(FIXTURES, caso, 'entrada.xlsx'));
}

describe('PapelDeTrabalho', () => {
  it('abre pedindo o arquivo, sem quebrar', () => {
    render(<PapelDeTrabalho />);

    expect(screen.getByRole('heading', { name: 'Papel de Trabalho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher o WP/ })).toBeInTheDocument();
    expect(screen.getByText(/Escolha o papel de trabalho do estudo/)).toBeInTheDocument();
  });

  /* A promessa que a tela faz, e que sustenta o preview: nada sai daqui. */
  it('avisa que o arquivo não sai do navegador', () => {
    render(<PapelDeTrabalho />);

    expect(screen.getByText(/Nada sai daqui enquanto você não confirmar/)).toBeInTheDocument();
  });

  /*
   * O bloco responde "cada slide tem de onde sair?", e não "quantas células eu li".
   * A contagem crua misturava célula, linha de texto e registro, e ninguém sabe
   * conferir 1.394 valores: o número não pegava leitura incompleta, que era o
   * motivo de existir.
   */
  it('lista os slides com a fonte de cada um', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    expect(screen.getByText('Premissas, cartões')).toBeInTheDocument();
    expect(screen.getByText('Resumo da Tributação')).toBeInTheDocument();
    expect(screen.getByText('Transferência da Atividade Rural')).toBeInTheDocument();
  });

  /*
   * Slide sem fonte tem de aparecer nomeado. Antes ele ficava escondido atrás de
   * um zero numa contagem, e ninguém descobria que a apresentação sairia furada.
   */
  it('conta quantos slides sairiam vazios, e diz quais', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'so-apoio.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    /* A fixture só traz bens e dívidas, então quase todo slide fica sem fonte. */
    expect(screen.getByText(/slides sairiam sem número/)).toBeInTheDocument();
    expect(screen.getByText(/a DRE veio vazia/)).toBeInTheDocument();
    expect(screen.getByText(/o resumo veio vazio/)).toBeInTheDocument();
  });

  /*
   * O cartão de hectares não tem fonte no banco: a tabela de imóveis ficou fora do
   * escopo por decisão de 02/09/2026. A tela precisa dizer isso, senão o slide sai
   * incompleto sem explicação.
   */
  it('avisa que o cart\u00e3o de hect\u00e1res n\u00e3o tem fonte', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );
    expect(screen.getByText(/cartão de hectares não tem fonte/)).toBeInTheDocument();
  });

  /*
   * E o sinal ao lado do slide tem de concordar com esse texto.
   *
   * Enquanto a fonte era um booleano, "Premissas, cartões" mostrava visto verde de
   * completo ao lado do aviso de que faltava o cartão de hectares. Uma linha
   * dizendo duas coisas opostas é pior do que não ter sinal nenhum: quem confia no
   * visto não lê o resto.
   */
  it('não dá visto de completo ao slide que sai com parte dos números', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    const linha = screen.getByText('Premissas, cartões').closest('tr');
    expect(linha).not.toBeNull();
    expect(linha).toHaveTextContent('sai com parte dos números');
    expect(linha).not.toHaveTextContent('tem tudo de que precisa');
    expect(screen.getByText(/slide sai com parte dos números/)).toBeInTheDocument();
  });

  /* Os títulos das colunas dizem o que cada uma é, sem depender do tooltip. */
  it('nomeia as três colunas da tabela de slides', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    expect(screen.getByRole('columnheader', { name: /^Slide/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Origem/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^O que foi encontrado/ })).toBeInTheDocument();
  });

  it('mostra o que foi lido, sem bloco de problema, num WP bom', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP do cliente.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    expect(screen.getByText('O que a planilha informa')).toBeInTheDocument();
    expect(screen.getByText('WP do cliente.xlsx')).toBeInTheDocument();
    expect(screen.queryByText(/impede(m)? a importação/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^\d+ avisos?$/)).not.toBeInTheDocument();
  });

  /*
   * A linha dos anos brigava com o período do cabeçalho: o estudo tem três anos e a
   * Venda de Ativos acha sete, porque segue o cronograma da dívida. Agora a tela
   * diz de onde vêm os anos a mais, em vez de mostrar o intervalo cru.
   */
  it('explica os anos que passam do período do estudo', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('transferencia-rural'), 'venda.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    /* A fixture não traz cabeçalho, então cai no intervalo simples. */
    expect(screen.getByText('2026 a 2032')).toBeInTheDocument();
    expect(screen.getByText('De onde vieram os números')).toBeInTheDocument();
    expect(screen.queryByText('Cenários')).not.toBeInTheDocument();
  });

  /*
   * O botão fica desabilitado nos dois casos, mas por motivos diferentes, e o
   * texto ao lado tem de dizer qual: "ainda não está ligada" é coisa nossa a
   * fazer, "não há o que gravar" é coisa da planilha.
   */
  /*
   * O botao desabilitado sem dizer por que e o defeito que o `ControleBalancetes`
   * evita listando o que falta. Sem cliente e sem OS, a tela nomeia os dois.
   */
  it('sem cliente e sem OS, o botão diz o que falta', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'bom.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    expect(screen.getByRole('button', { name: /Confirmar e gravar/ })).toBeDisabled();
    expect(screen.getByText(/Falta o cliente, a OS/)).toBeInTheDocument();
  });

  /*
   * O nome que a planilha declara nao barra nada, mas tem de aparecer: e a
   * protecao contra subir o WP de um cliente no cadastro de outro.
   */
  it('mostra o cliente que a planilha declara, para conferência', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('cabecalho-do-estudo'), 'cab.xlsx');

    await waitFor(() =>
      expect(screen.getByText(/A planilha diz que o cliente é/)).toBeInTheDocument(),
    );
    /* Aparece duas vezes de propósito: no cabeçalho lido e na linha de conferência. */
    expect(screen.getAllByText('Grupo Aurora Agro').length).toBeGreaterThanOrEqual(2);
  });

  it('num arquivo trocado, mostra o impedimento e diz que não há o que gravar', async () => {
    render(<PapelDeTrabalho />);
    escolhe('isto nao e uma planilha', 'foto.xlsx');

    await waitFor(() => expect(screen.getByText(/impede(m)? a importação/)).toBeInTheDocument());

    expect(screen.getByText(/Corrija a planilha e escolha o arquivo de novo/)).toBeInTheDocument();
    expect(screen.getByText(/corrigir o que impede/)).toBeInTheDocument();
    /* O endereço do problema é o que a pessoa leva para o Excel. */
    expect(screen.getByText(/Esperava uma de/)).toBeInTheDocument();
  });

  it('começar de novo devolve a tela ao estado inicial', async () => {
    render(<PapelDeTrabalho />);
    escolhe(fixture('dre'), 'dre.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Começar de novo/ }));

    expect(screen.getByText(/Escolha o papel de trabalho do estudo/)).toBeInTheDocument();
    expect(screen.queryByText('O que vai para a apresentação')).not.toBeInTheDocument();
  });

  /*
   * Descartar é marca e não exclusão, e a policy do banco só deixa admin fazer.
   * O botão precisa acompanhar isso: quem não é admin não pode nem ver a oferta.
   */
  describe('descartar uma revisão', () => {
    const comRevisao = () => {
      mocks.estudos = [{ id: 'est-1', ordem_servico_id: 'os-1' }];
      mocks.revisoes = [
        {
          id: 'imp-1',
          versao: 1,
          nome_original: 'WP.xlsx',
          cliente_no_wp: null,
          ano_inicial: 2026,
          ano_final: 2028,
          versao_do_mapa: '1.4',
          problemas: 0,
          created_at: '2026-09-03T12:00:00Z',
        },
      ];
    };

    afterEach(() => {
      mocks.estudos = [];
      mocks.revisoes = [];
      mocks.isAdmin = false;
      mocks.descartar.mockClear();
    });

    it('quem não é admin não vê o botão', () => {
      comRevisao();
      mocks.isAdmin = false;
      render(<Revisoes estudoId="est-1" />);

      /* A revisão aparece; só o botão é que não. */
      expect(screen.getByText('WP.xlsx')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Descartar/ })).not.toBeInTheDocument();
    });

    it('admin vê o botão, e ele pergunta antes', () => {
      comRevisao();
      mocks.isAdmin = true;
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<Revisoes estudoId="est-1" />);

      fireEvent.click(screen.getByRole('button', { name: /Descartar/ }));

      expect(confirmar).toHaveBeenCalled();
      /* Respondeu que não: nada acontece. */
      expect(mocks.descartar).not.toHaveBeenCalled();
      confirmar.mockRestore();
    });

    it('confirmado, descarta aquela revisão', () => {
      comRevisao();
      mocks.isAdmin = true;
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(<Revisoes estudoId="est-1" />);

      fireEvent.click(screen.getByRole('button', { name: /Descartar/ }));

      expect(mocks.descartar).toHaveBeenCalledWith(
        { importacaoId: 'imp-1', estudoId: 'est-1', versao: 1 },
        expect.anything(),
      );
      confirmar.mockRestore();
    });
  });
});
