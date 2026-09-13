import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/queryWrapper';
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
  estudos: [] as Array<{
    id: string;
    ordem_servico_id: string | null;
    projeto_id?: string | null;
  }>,
  revisoes: [] as unknown[],
  projetos: [
    { id: 'prj-1', name: 'Planejamento Tributário', status: 'active', podeVincular: true },
    { id: 'prj-2', name: 'Recuperação de Créditos', status: 'active', podeVincular: true },
  ],
  gravar: vi.fn(),
  descartar: vi.fn(),
  vincular: vi.fn(),
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
  useProjetosDaOrdemDeServico: () => ({ data: mocks.projetos, isLoading: false }),
  useVincularProjetoAoPlanejamento: () => ({ mutateAsync: mocks.vincular, isPending: false }),
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
import { EscolhaDoProjeto } from '@/components/equipe/dev/planejamento-tributario/EscolhaDoProjeto';

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

// O campo de cliente busca o indice de CNPJ (`useCnpjsPorCliente`), entao a tela
// exige um QueryClient. O `rerender` e reembrulhado de proposito: o que o RTL
// devolve remonta SEM o provider, e a segunda renderizacao quebraria sozinha.
function renderComQuery(ui: ReactElement) {
  const client = createTestQueryClient();
  const envolver = (no: ReactElement) => <QueryClientProvider client={client}>{no}</QueryClientProvider>;
  const resultado = render(envolver(ui));
  return { ...resultado, rerender: (no: ReactElement) => resultado.rerender(envolver(no)) };
}

describe('PapelDeTrabalho', () => {
  it('abre pedindo o arquivo, sem quebrar', () => {
    renderComQuery(<PapelDeTrabalho />);

    expect(screen.getByRole('heading', { name: 'Papel de Trabalho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher o WP/ })).toBeInTheDocument();
    expect(screen.getByText(/Escolha o papel de trabalho do planejamento/)).toBeInTheDocument();
  });

  /* A promessa que a tela faz, e que sustenta o preview: nada sai daqui. */
  it('avisa que o arquivo não sai do navegador', () => {
    renderComQuery(<PapelDeTrabalho />);

    expect(screen.getByText(/Nada sai daqui enquanto você não confirmar/)).toBeInTheDocument();
  });

  /*
   * O bloco responde "cada slide tem de onde sair?", e não "quantas células eu li".
   * A contagem crua misturava célula, linha de texto e registro, e ninguém sabe
   * conferir 1.394 valores: o número não pegava leitura incompleta, que era o
   * motivo de existir.
   */
  it('lista os slides com a fonte de cada um', async () => {
    renderComQuery(<PapelDeTrabalho />);
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
    renderComQuery(<PapelDeTrabalho />);
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
    renderComQuery(<PapelDeTrabalho />);
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
    renderComQuery(<PapelDeTrabalho />);
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
    renderComQuery(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    expect(screen.getByRole('columnheader', { name: /^Slide/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^Origem/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^O que foi encontrado/ })).toBeInTheDocument();
  });

  it('mostra o que foi lido, sem bloco de problema, num WP bom', async () => {
    renderComQuery(<PapelDeTrabalho />);
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
    renderComQuery(<PapelDeTrabalho />);
    escolhe(fixture('transferencia-rural'), 'venda.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    /* A fixture não traz cabeçalho, então cai no intervalo simples. */
    expect(screen.getByText('2026 a 2032')).toBeInTheDocument();
    expect(screen.getByText('Abas que trouxeram números')).toBeInTheDocument();
    /* E o rótulo dos anos diz de que anos se trata, em vez de só "Anos". */
    expect(screen.getByText('Exercícios lidos na planilha')).toBeInTheDocument();
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
    renderComQuery(<PapelDeTrabalho />);
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
    renderComQuery(<PapelDeTrabalho />);
    escolhe(fixture('cabecalho-do-estudo'), 'cab.xlsx');

    await waitFor(() =>
      expect(screen.getByText(/A planilha diz que o cliente é/)).toBeInTheDocument(),
    );
    /* Aparece duas vezes de propósito: no cabeçalho lido e na linha de conferência. */
    expect(screen.getAllByText('Grupo Aurora Agro').length).toBeGreaterThanOrEqual(2);
  });

  it('num arquivo trocado, mostra o impedimento e diz que não há o que gravar', async () => {
    renderComQuery(<PapelDeTrabalho />);
    escolhe('isto nao e uma planilha', 'foto.xlsx');

    await waitFor(() => expect(screen.getByText(/impede(m)? a importação/)).toBeInTheDocument());

    expect(screen.getByText(/Corrija a planilha e escolha o arquivo de novo/)).toBeInTheDocument();
    expect(screen.getByText(/corrigir o que impede/)).toBeInTheDocument();
    /* O endereço do problema é o que a pessoa leva para o Excel. */
    expect(screen.getByText(/Esperava uma de/)).toBeInTheDocument();
  });

  it('começar de novo devolve a tela ao estado inicial', async () => {
    renderComQuery(<PapelDeTrabalho />);
    escolhe(fixture('dre'), 'dre.xlsx');

    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Começar de novo/ }));

    expect(screen.getByText(/Escolha o papel de trabalho do planejamento/)).toBeInTheDocument();
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
      renderComQuery(<Revisoes estudoId="est-1" />);

      /* A revisão aparece; só o botão é que não. */
      expect(screen.getByText('WP.xlsx')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Descartar/ })).not.toBeInTheDocument();
    });

    it('admin vê o botão, e ele pergunta antes', () => {
      comRevisao();
      mocks.isAdmin = true;
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
      renderComQuery(<Revisoes estudoId="est-1" />);

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
      renderComQuery(<Revisoes estudoId="est-1" />);

      fireEvent.click(screen.getByRole('button', { name: /Descartar/ }));

      expect(mocks.descartar).toHaveBeenCalledWith(
        { importacaoId: 'imp-1', estudoId: 'est-1', versao: 1 },
        expect.anything(),
      );
      confirmar.mockRestore();
    });
  });
});

/*
 * O modal do projeto, que e o coracao da PT-04.
 *
 * Uma OS tem varios projetos, e antes disso o planejamento se prendia so a OS:
 * ninguem sabia de qual projeto o papel de trabalho era, e o aviso teria de ir
 * para todos. O que estes casos prendem e que a pergunta acontece, que ela nao
 * aceita resposta vazia, e que gravar sem responder nao existe.
 */
describe('PapelDeTrabalho, a escolha do projeto', () => {
  function preparaComArquivoAceito() {
    mocks.estudos = [{ id: 'est-1', ordem_servico_id: 'os-1', projeto_id: null }];
    renderComQuery(<PapelDeTrabalho />);
    escolhe(fixture('bens-e-dividas'), 'WP.xlsx');
  }

  /*
   * O que este caso realmente prova: o modal NAO aparece sozinho. Ele guarda
   * contra abrir no carregamento, que atrapalharia quem só quer conferir a
   * planilha sem gravar. A abertura pelo botão depende de escolher cliente e OS
   * em `Select` do Radix, que não se opera em jsdom, e está coberta pelos casos
   * do próprio modal abaixo.
   */
  it('o modal não aparece antes de a pessoa mandar gravar', async () => {
    preparaComArquivoAceito();
    await waitFor(() =>
      expect(screen.getByText('O que vai para a apresentação')).toBeInTheDocument(),
    );

    expect(
      screen.queryByText(/A que projeto este papel de trabalho pertence/),
    ).not.toBeInTheDocument();
    expect(mocks.gravar).not.toHaveBeenCalled();
  });

  it('o modal lista os projetos daquela OS', () => {
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual={null}
        gravando={false}
        onConfirmar={() => {}}
      />,
    );

    expect(screen.getByText(/A que projeto este papel de trabalho pertence/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Projeto/)).toBeInTheDocument();
  });

  /* Confirmar sem escolher gravaria uma revisão sem a quem avisar, que é
   * exatamente o problema que a PT-04 existe para acabar. */
  it('não deixa confirmar sem escolher projeto', () => {
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual={null}
        gravando={false}
        onConfirmar={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: /Gravar a revisão/ })).toBeDisabled();
  });

  it('devolve o projeto escolhido, e não só o id', async () => {
    const confirmou = vi.fn();
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual="prj-2"
        gravando={false}
        onConfirmar={confirmou}
      />,
    );

    /* Vem pré-selecionado com o que já está ligado, então confirmar já funciona. */
    const botao = screen.getByRole('button', { name: /Gravar a revisão/ });
    expect(botao).toBeEnabled();
    fireEvent.click(botao);

    await waitFor(() => expect(confirmou).toHaveBeenCalledTimes(1));
    expect(confirmou.mock.calls[0][0]).toMatchObject({
      id: 'prj-2',
      name: 'Recuperação de Créditos',
    });
  });

  /*
   * Trocar o projeto de um planejamento que já tem um é permitido, porque errar
   * na primeira revisão não pode virar sentença. O que a tela deve é dizer o que
   * muda: as revisões antigas ficam, o aviso desta em diante vai para o novo.
   */
  it('avisa quando está trocando o projeto', async () => {
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual="prj-1"
        gravando={false}
        onConfirmar={() => {}}
      />,
    );

    /* Começa no que está ligado, então não há troca e não há aviso. */
    expect(screen.queryByText(/Você está trocando o projeto/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/Projeto/));
    fireEvent.click(await screen.findByRole('option', { name: 'Recuperação de Créditos' }));

    expect(await screen.findByText(/Você está trocando o projeto/)).toBeInTheDocument();
  });

  it('quando a OS não tem projeto, diz o que fazer', () => {
    mocks.projetos = [];
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual={null}
        gravando={false}
        onConfirmar={() => {}}
      />,
    );

    expect(
      screen.getByText(/Nenhum projeto foi cadastrado nesta ordem de serviço/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gravar a revisão/ })).toBeDisabled();
  });
});

/*
 * O que a PT-04 acrescentou na tela depois que o vinculo passou a avisar.
 */
describe('PapelDeTrabalho, o aviso do projeto', () => {
  /*
   * Planejamento sem projeto nao avisa ninguem. Antes disso a tela nao dizia, e
   * existia um planejamento assim com revisao importada: o trabalho entrava e
   * nao chegava a projeto nenhum, sem ninguem saber.
   */
  it('avisa quando o planejamento não está ligado a projeto nenhum', () => {
    mocks.revisoes = [
      {
        id: 'rev-1',
        versao: 1,
        nome_original: 'WP.xlsx',
        cliente_no_wp: null,
        ano_inicial: null,
        ano_final: null,
        versao_do_mapa: '1.4',
        problemas: 0,
        created_at: '2026-09-08T12:00:00Z',
      },
    ];
    renderComQuery(<Revisoes estudoId="est-1" semProjeto />);

    expect(screen.getByText(/não está ligado a nenhum projeto da OS/)).toBeInTheDocument();
    expect(screen.getByText(/Na próxima importação a tela pergunta/)).toBeInTheDocument();
  });

  /* Com projeto o aviso nao aparece: ele existe para o caso que precisa de acao. */
  it('não avisa quando o planejamento tem projeto', () => {
    mocks.revisoes = [
      {
        id: 'rev-1',
        versao: 1,
        nome_original: 'WP.xlsx',
        cliente_no_wp: null,
        ano_inicial: null,
        ano_final: null,
        versao_do_mapa: '1.4',
        problemas: 0,
        created_at: '2026-09-08T12:00:00Z',
      },
    ];
    renderComQuery(<Revisoes estudoId="est-1" />);

    expect(screen.queryByText(/não está ligado a nenhum projeto/)).not.toBeInTheDocument();
  });

  /* Sem revisao o aviso tambem nao aparece: nao ha trabalho para deixar de
   * avisar, e a tela ja diz que a primeira importacao cria o planejamento. */
  it('não avisa quando ainda não há revisão', () => {
    mocks.revisoes = [];
    renderComQuery(<Revisoes estudoId="est-1" semProjeto />);

    expect(screen.queryByText(/não está ligado a nenhum projeto/)).not.toBeInTheDocument();
  });
});

/*
 * O modal nao pode oferecer projeto que a funcao vai recusar.
 *
 * Aconteceu de verdade em 08/09: o modal listou "Teste ponta a ponta", que e do
 * Alexandre, o Eduardo escolheu, a revisao gravou e o vinculo foi recusado. A
 * regra estava certa; o fluxo deixava andar ate a parede.
 */
describe('EscolhaDoProjeto, projeto de outra pessoa', () => {
  it('marca o projeto em que a pessoa não está, e não deixa escolher', async () => {
    mocks.projetos = [
      { id: 'prj-1', name: 'Planejamento Tributário', status: 'active', podeVincular: true },
      { id: 'prj-2', name: 'Teste ponta a ponta', status: 'active', podeVincular: false },
    ];
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual={null}
        gravando={false}
        onConfirmar={() => {}}
      />,
    );

    fireEvent.click(screen.getByLabelText(/Projeto/));
    const indisponivel = await screen.findByRole('option', { name: /Teste ponta a ponta/ });
    expect(indisponivel).toHaveTextContent('você não está neste projeto');
    expect(indisponivel).toHaveAttribute('aria-disabled', 'true');
  });

  /* Quando NENHUM projeto da OS é dela, o modal diz o que fazer em vez de
   * mostrar uma lista inteira que não serve. */
  it('quando nenhum projeto é da pessoa, diz o que fazer', () => {
    mocks.projetos = [
      { id: 'prj-2', name: 'Teste ponta a ponta', status: 'active', podeVincular: false },
    ];
    render(
      <EscolhaDoProjeto
        aberto
        onFechar={() => {}}
        ordemServicoId="os-1"
        projetoAtual={null}
        gravando={false}
        onConfirmar={() => {}}
      />,
    );

    expect(
      screen.getByText(/Você não está em nenhum dos projetos desta ordem/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gravar a revisão/ })).toBeDisabled();
  });
});
