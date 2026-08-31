import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { colunasSemDica, colunasTortas } from './alinhamentoDeTabela';

/**
 * O MODAL ONDE SE MONTA A SIMULAÇÃO — a tela, não o controlador.
 *
 * O controlador tem o teste do fio inteiro (`useCalculadoraItcmdController.test.tsx`).
 * Aqui o que se prende é o que só a tela pode errar, e errou duas vezes:
 *
 *  1. COLUNA TORTA. O cabeçalho declarando um lado e a célula o outro. O teste de
 *     alinhamento cobria a simulação aberta, e o modal — que é onde as capturas
 *     mostravam a tabela torta — não tinha nenhuma cobertura de tela.
 *
 *  2. CAMPO QUE SALTA. Um campo que só existe em certo estado faz a barra crescer e
 *     empurrar a tabela quando o estado muda. Aconteceu com a base da doação (ao marcar
 *     "com reserva"), com a base da instituição (ao digitar o percentual de voz e voto)
 *     e com o selo de percentual dentro do gatilho da aba. Nenhum deles aparece em
 *     teste de conteúdo: o texto certo estava lá, no lugar errado.
 *
 * jsdom não mede pixel, então não se testa a altura — testa-se a CAUSA: que o campo
 * está montado nos dois estados, e que o que muda é só se ele aceita clique.
 */

const mocks = vi.hoisted(() => ({
  pessoas: [] as Record<string, unknown>[],
  socios: [] as Record<string, unknown>[],
  quadroDasEmpresas: [] as Record<string, unknown>[],
  parentescos: [] as Record<string, unknown>[],
  bens: [] as Record<string, unknown>[],
}));

vi.mock('@/hooks/useSimulacoesItcmd', () => ({
  useSimulacoesItcmd: () => ({ data: [], isLoading: false, error: null }),
  useGravarSimulacaoItcmd: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useAlterarStatusSimulacaoItcmd: () => ({
    mutate: vi.fn(), isPending: false, error: null,
  }),
  useRenomearSimulacaoItcmd: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  rotuloDaSimulacao: (s: { nome: string | null; versao: number }) =>
    (s.nome?.trim() ? s.nome.trim() : `Versão ${s.versao}`),
  STATUS_DA_SIMULACAO: ['rascunho', 'gerada', 'aprovada', 'substituida'],
  ROTULO_DO_STATUS: {
    rascunho: 'Rascunho', gerada: 'Gerada', aprovada: 'Aprovada',
    substituida: 'Substituída',
  },
}));
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: vi.fn(), logActionOrThrow: vi.fn() }),
}));
vi.mock('@/contexts/OsgWorkContext', () => ({
  useOsgWork: () => ({ clienteId: 'C1', setClienteId: () => undefined }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: mocks.bens, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useQuadroSocietario', () => ({
  useQuadroSocietarioByEmpresa: () => ({
    data: mocks.socios, isLoading: false, error: null,
  }),
}));
vi.mock('@/hooks/useSociedadesDoacao', () => ({
  useQuadroDasEmpresas: () => ({
    data: mocks.quadroDasEmpresas, isLoading: false, error: null,
  }),
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: mocks.pessoas, isLoading: false, error: null }),
  useParentescosByCliente: () => ({
    data: mocks.parentescos, isLoading: false, error: null,
  }),
}));

import { NovaSimulacaoModal } from './NovaSimulacaoModal';
import {
  useCalculadoraItcmdController,
  type CalculadoraItcmd,
} from '@/hooks/useCalculadoraItcmdController';

const pf = (id: string) => ({
  id,
  denominacao: id,
  tipo_pessoa: 'PF',
  is_fundador: false,
  filiacao_pai_pessoa_id: null,
  filiacao_mae_pessoa_id: null,
  estado_civil: 'Solteiro(a)',
  regime_bens: null,
  conjuge_id: null,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-02-10T12:00:00Z') });
  // O modal se abre por CLIQUE no botão "Nova simulação" — e é assim que o teste
  // começa, para o estado do último gesto não depender da ordem dos testes. A dica só
  // abre no foco quando o foco veio de tabulação, e isto é o oposto disso.
  fireEvent.pointerDown(document.body);
  mocks.bens = [{
    id: 'IR-01',
    cliente_id: 'C1',
    referencia_dp: 'IR-01',
    denominacao: 'Fazenda IR-01',
    tipo_bem: 'IR',
    participa_estruturacao: true,
    valores: {
      contabil: { valor: 6_649_400, comValor: 1 },
      mercado: { valor: null, comValor: 0 },
      itr: { valor: null, comValor: 0 },
      origem: 'matriculas' as const,
      matriculas: 1,
    },
  }];
  mocks.pessoas = [
    {
      id: 'HOLDING',
      denominacao: 'Terezinha Participações',
      tipo_pessoa: 'PJ',
      tipo_empresa: 'CN',
      is_fundador: false,
      filiacao_pai_pessoa_id: null,
      filiacao_mae_pessoa_id: null,
    },
    pf('Cristiano'),
    pf('Gabriel'),
  ];
  mocks.socios = [{
    id: 'S1',
    socio_pessoa_id: 'Cristiano',
    socio_denominacao: 'Cristiano',
    socio_tipo_pessoa: 'PF',
    quotas: 6_649_400,
  }];
  mocks.quadroDasEmpresas = [
    { empresa_pessoa_id: 'HOLDING', socio_pessoa_id: 'Cristiano', quotas: 6_649_400 },
  ];
  mocks.parentescos = [
    { id: 'V1', pessoa_id: 'Gabriel', parente_pessoa_id: 'Cristiano', tipo: 'Filho(a)' },
  ];
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Abre o modal com o ato montado — um doador e um donatário —, e devolve o controlador
 * para o teste mexer nos estados como o analista mexe nos campos.
 *
 * O controlador de verdade, e não um objeto de mentira: um `calc` falso com quarenta
 * campos escritos à mão passaria a testar a mão que o escreveu.
 */
const abrirOModal = () => {
  let calc: CalculadoraItcmd | null = null;
  function Tela() {
    calc = useCalculadoraItcmdController();
    return <NovaSimulacaoModal calc={calc} />;
  }
  render(<Tela />);
  const c = () => calc as CalculadoraItcmd;
  act(() => c().abrirPainel());
  return c;
};

const comAto = () => {
  const c = abrirOModal();
  act(() => c().adicionarParticipante('Cristiano'));
  act(() => c().adicionarParticipante('Gabriel'));
  return c;
};

/** A aba do Radix seleciona no `mouseDown`, não no `click`. */
const irPara = (aba: string) => {
  act(() => {
    screen.getByRole('tab', { name: aba })
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  });
};

describe('o modal não tem coluna torta', () => {
  it('na aba de Doação', () => {
    comAto();
    expect(document.querySelectorAll('table').length).toBeGreaterThan(0);
    expect(colunasTortas().join(' · ')).toBe('');
  });

  it('na aba de Usufruto', () => {
    comAto();
    irPara('Usufruto');
    expect(document.querySelectorAll('table').length).toBeGreaterThan(0);
    expect(colunasTortas().join(' · ')).toBe('');
  });

  it('e toda coluna explica o que é, nas duas abas', () => {
    comAto();
    expect(colunasSemDica()).toEqual([]);
    irPara('Usufruto');
    expect(colunasSemDica()).toEqual([]);
  });

  it('e a coluna de % tem uma régua só: com campo, em leitura e no total', () => {
    // O ALINHAMENTO DECLARADO não bastava. Cabeçalho e célula podem dizer os dois
    // "direita" e os dígitos pararem em lugares diferentes, porque o número dentro de
    // um input termina no padding do INPUT — uma caixa de largura fixa empurrada para a
    // direita — e o número em texto puro termina no padding da célula. Nesta coluna
    // havia TRÊS réguas: a do campo (24px), a da leitura (0) e a do total (12px), e
    // trocar o papel de alguém fazia o valor saltar de uma para a outra.
    //
    // A casca é a mesma nas três: `w-24` de largura e `pr-6` de recuo, que é onde o
    // sinal de % fixo da coluna deixa o dígito parar.
    comAto();
    irPara('Usufruto');
    const tabela = document.querySelector('table') as HTMLTableElement;
    const ultimaCelula = [...tabela.querySelectorAll('tbody tr')]
      .map((tr) => [...tr.querySelectorAll('td')].at(-1))
      .filter((td): td is HTMLTableCellElement => td != null);

    // Uma linha com campo, uma em leitura e a do total. Se a lista encurtar, o teste
    // deixa de provar o que promete — melhor falhar aqui.
    expect(ultimaCelula.length).toBeGreaterThan(2);
    for (const td of ultimaCelula) {
      expect(td.querySelector('.w-24'), 'a casca da coluna').not.toBeNull();
      expect(td.querySelector('.pr-6'), 'a régua do dígito').not.toBeNull();
    }
  });
});

describe('nada nasce nem morre na barra do ato', () => {
  it('a base da doação: sem reserva é TEXTO dizendo 100%, com reserva é escolha', () => {
    const c = comAto();
    const rotulo = () => screen.getByText('Base da doação');
    const campo = () => screen.queryByRole('combobox', { name: 'Base da doação' });

    // O LUGAR está sempre lá — é o desmonte que fazia a barra crescer e encolher.
    expect(rotulo()).toBeInTheDocument();
    // Mas não como controle travado: sem reserva não há escolha a fazer, e a base da
    // guia da doação É integral. `w-28` é a medida do seletor, para a barra não mudar
    // de largura quando a escolha passar a existir.
    expect(campo()).not.toBeInTheDocument();
    expect(screen.getByText('100%').className).toContain('w-28');

    act(() => c().setComReserva(true));
    expect(campo()).toBeEnabled();
    expect(rotulo()).toBeInTheDocument();

    act(() => c().setComReserva(false));
    expect(campo()).not.toBeInTheDocument();
    expect(rotulo()).toBeInTheDocument();
  });

  it('a base da instituição mostra TRAÇO enquanto não há instituição', () => {
    const c = comAto();
    irPara('Usufruto');
    const rotulo = () => screen.getByText('Base da instituição');
    const campo = () => screen.queryByRole('combobox', { name: 'Base da instituição' });

    // Sem quota instituída não existe guia de instituição, e anunciar "100%" seria
    // afirmar uma base para um documento que não vai ser emitido. Foi o que a primeira
    // versão fez, e um seletor cinza travado em 100% lê como defeito.
    expect(rotulo()).toBeInTheDocument();
    expect(campo()).not.toBeInTheDocument();
    expect(screen.getAllByText('—').some((n) => n.className.includes('w-28')))
      .toBe(true);

    // Conceder usufruto é o que cria a guia. Em Gabriel porque o palpite de papel vem
    // da doação: QUEM DOOU USUFRUI (é a mecânica da reserva), então é o donatário que
    // tem quota plena para conceder.
    act(() => c().setInstituicao('Gabriel', '1.000.000'));
    expect(campo()).toBeEnabled();
  });

  it('digitar o percentual de voz e voto também destrava a base da instituição', () => {
    // É o outro caminho, e o que a própria dica promete: o alvo de % reparte a
    // concessão entre os nu-proprietários, e concessão é instituição - logo, guia.
    const c = comAto();
    irPara('Usufruto');
    expect(screen.queryByRole('combobox', { name: 'Base da instituição' }))
      .not.toBeInTheDocument();

    act(() => c().setVozEVoto('Cristiano', '40'));
    expect(c().totalInstituido).toBeGreaterThan(0n);
    expect(screen.getByRole('combobox', { name: 'Base da instituição' })).toBeEnabled();
  });

  it('o contador de GIAs fica na tela mesmo em zero', () => {
    const c = abrirOModal();
    expect(screen.getByText('Nenhuma GIA ainda')).toBeInTheDocument();

    act(() => c().adicionarParticipante('Cristiano'));
    act(() => c().adicionarParticipante('Gabriel'));
    expect(screen.getByText('1 GIA a emitir')).toBeInTheDocument();
  });

  it('nenhuma dica sobe sozinha ao abrir o modal nem ao escolher num campo', () => {
    // O `Dialog` foca o primeiro elemento focável quando abre, e vários deles têm
    // dica: a explicação aparecia junto com o modal, flutuando sobre a tabela.
    const c = comAto();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // E o `Select` devolve o foco ao gatilho quando a lista fecha — o clique é no
    // item, o foco chega depois. A dica subia por cima da escolha recém-feita.
    const papel = screen.getAllByRole('combobox', { name: /^Papel de / })[0];
    fireEvent.pointerDown(document.body);
    fireEvent.focus(papel);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // O teclado continua alcançando a explicação — é para isso que ela abre no foco.
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.focus(papel);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(c().comReserva).toBe(false);
  });

  it('o percentual do usufruto não entra no rótulo da aba', () => {
    // Ele era um selo DENTRO do gatilho: aparecia ao digitar o percentual e a lista de
    // abas mudava de largura embaixo do ponteiro. Agora mora à direita da linha, e o
    // nome da aba é só o nome da aba.
    const c = comAto();
    // Em Gabriel porque o palpite de papel vem da doação: QUEM DOOU USUFRUI (é a
    // mecânica da reserva), então é o donatário que tem quota plena para conceder.
    act(() => c().setInstituicao('Gabriel', '1.000.000'));

    expect(screen.getAllByRole('tab').map((t) => t.textContent))
      .toEqual(['Doação', 'Usufruto']);
    expect(screen.getByText(/Voz e voto reservado/)).toBeInTheDocument();
  });
});
