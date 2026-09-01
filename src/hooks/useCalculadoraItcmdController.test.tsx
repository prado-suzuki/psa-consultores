import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O FIO INTEIRO: cadastro → controlador → motor → quadro.
//
// Testado pelo controlador, e não pela tela, de propósito: os campos de papel e forma
// são `Select` do Radix, que em jsdom depende de pointer events e quebra por motivo de
// biblioteca, não de regra. O que precisa estar preso aqui é a LIGAÇÃO — que as quotas
// vêm do quadro societário, que os campos são livres, que a redistribuição mantém o
// total e que a forma do ato decide quantas GIAs saem. A aritmética tem os seus
// próprios testes em `src/lib/osg/`.
//
// CAMPOS LIVRES é decisão da OSG: a legítima não é calculada — depende de quanto se
// quer doar e do que a SEFAZ aponta na guia —, e os casos não têm molde (irmã para
// irmã, avô para netos). As travas são só as lógicas.

const mocks = vi.hoisted(() => ({
  bens: [] as Record<string, unknown>[],
  pessoas: [] as Record<string, unknown>[],
  parentescos: [] as Record<string, unknown>[],
  socios: [] as Record<string, unknown>[],
  quadroDasEmpresas: [] as Record<string, unknown>[],
  historico: [] as Record<string, unknown>[],
  gravarSpy: vi.fn(),
  // A gravação FALHA quando isto é true: o `mutate` não chama o `onSuccess`, que é onde
  // o ato passou a zerar. Sem esse degrau no mock, o teste não distingue "gravou" de
  // "tentou gravar" — e era exatamente aí que o formulário se perdia.
  gravarFalha: false,
  statusSpy: vi.fn(),
  renomearSpy: vi.fn(),
  auditoriaSpy: vi.fn(),
}));

vi.mock('@/hooks/useSimulacoesItcmd', () => ({
  // A persistência é do banco, e o banco não entra em teste de unidade: o que se
  // prende aqui é a apuração. `gravarSpy` deixa ver QUE gravou e COM QUê.
  useSimulacoesItcmd: () => ({ data: mocks.historico, isLoading: false, error: null }),
  useGravarSimulacaoItcmd: () => ({
    // O `mutate` do react-query aceita callbacks por chamada e só roda `onSuccess`
    // quando o banco confirma. O mock reproduz esse degrau porque o comportamento em
    // teste depende dele.
    mutate: (vars: unknown, opts?: { onSuccess?: () => void }) => {
      mocks.gravarSpy(vars);
      if (!mocks.gravarFalha) opts?.onSuccess?.();
    },
    isPending: false,
    error: null,
  }),
  useAlterarStatusSimulacaoItcmd: () => ({
    mutate: mocks.statusSpy, isPending: false, error: null,
  }),
  useRenomearSimulacaoItcmd: () => ({
    mutate: mocks.renomearSpy, isPending: false, error: null,
  }),
  rotuloDaSimulacao: (s: { nome: string | null; versao: number }) =>
    (s.nome?.trim() ? s.nome.trim() : `Versão ${s.versao}`),
  STATUS_DA_SIMULACAO: ['rascunho', 'gerada', 'aprovada', 'substituida'],
  ROTULO_DO_STATUS: {
    rascunho: 'Rascunho', gerada: 'Gerada',
    aprovada: 'Aprovada', substituida: 'Substituída',
  },
}));

vi.mock('@/contexts/OsgWorkContext', () => ({
  useOsgWork: () => ({ clienteId: 'C1', setClienteId: () => undefined }),
}));
vi.mock('@/hooks/useDiagnosticoPatrimonial', () => ({
  useBensByCliente: () => ({ data: mocks.bens, isLoading: false, error: null }),
}));
// O QUADRO vem do livro de movimentos (`v_quadro_societario`), e o hook devolve
// `pessoaId`. O mock segue a forma NOVA: mockar a antiga esconderia o rename.
vi.mock('@/hooks/useMovimentacaoQuotas', () => ({
  useQuadroDaEmpresa: () => ({
    data: mocks.socios.map((s) => ({
      pessoaId: s.socio_pessoa_id,
      denominacao: s.socio_denominacao,
      tipoPessoa: s.socio_tipo_pessoa,
      cpfCnpj: null,
      quotas: s.quotas,
      vlrTotal: 0,
      ordem: null,
      movimentoIds: [],
    })),
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/hooks/useSociedadesDoacao', () => ({
  useQuadroDasEmpresas: () => ({ data: mocks.quadroDasEmpresas, isLoading: false, error: null }),
}));
vi.mock('@/hooks/useQualificacaoDasPartes', () => ({
  usePessoasByCliente: () => ({ data: mocks.pessoas, isLoading: false, error: null }),
  useParentescosByCliente: () => ({ data: mocks.parentescos, isLoading: false, error: null }),
}));

import { useCalculadoraItcmdController } from '@/hooks/useCalculadoraItcmdController';
import { derivarValoresDoBem } from '@/lib/osg/valoresDoBem';

// A DERIVACAO DE VERDADE, e nao um objeto montado a mao: quando `ValorDerivado`
// ganhou o campo `decimal` (a soma exata, sem float), as fixtures escritas a mao
// continuaram compilando e passaram a devolver acervo indisponivel em silencio.
const valoresDe = (contabil: number | null, mercado: number | null, itr: number | null) =>
  derivarValoresDoBem(
    { vlr_contabil: null, vlr_mercado: null, vlr_imposto_anual: null },
    [{ vlr_contabil: contabil, vlr_mercado: mercado, vlr_imposto_anual: itr }],
  );

/**
 * Um imóvel do acervo. Por padrão SEM valor de mercado nem de ITR: é o estado do
 * sandbox, e é o que faz o cenário aparecer como indisponível em vez de R$ 0,00.
 */
const imovel = (
  id: string,
  contabil: number | null,
  mercado: number | null = null,
  itr: number | null = null,
) => ({
  id,
  cliente_id: 'C1',
  referencia_dp: id,
  denominacao: `Fazenda ${id}`,
  tipo_bem: 'IR',
  participa_estruturacao: true,
  valores: valoresDe(contabil, mercado, itr),
});

const pf = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  denominacao: id,
  tipo_pessoa: 'PF',
  is_fundador: false,
  filiacao_pai_pessoa_id: null,
  filiacao_mae_pessoa_id: null,
  estado_civil: 'Solteiro(a)',
  regime_bens: null,
  conjuge_id: null,
  ...extra,
});

/**
 * Monta o ato como o analista faz na tela: adiciona os doadores e os donatários. A
 * lista começa VAZIA — nada entra sozinho —, então todo teste que precisa de um ato
 * chama isto primeiro.
 */
const montarAto = (
  calc: () => ReturnType<typeof useCalculadoraItcmdController>,
) => {
  act(() => calc().adicionarDoador('Cristiano'));
  act(() => calc().adicionarDoador('Fabiane'));
  act(() => calc().adicionarDonatario('Gabriel'));
  act(() => calc().adicionarDonatario('Rafael'));
};

beforeEach(() => {
  // Relógio fixo em fevereiro de 2026, cuja UPF conhecida é R$ 255,20.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-02-10T12:00:00Z') });

  mocks.bens = [imovel('IR-01', 4_000_000), imovel('IR-02', 2_649_400)];
  mocks.pessoas = [
    { id: 'HOLDING', denominacao: 'Terezinha Participações', tipo_pessoa: 'PJ', tipo_empresa: 'CN', is_fundador: false, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null },
    // Casal em separação total: cada um doa o próprio bloco, uma GIA para cada.
    pf('Cristiano', {
      is_fundador: true,
      estado_civil: 'Casado(a)',
      regime_bens: 'Separação Total',
      conjuge_id: 'Fabiane',
    }),
    pf('Fabiane', {
      is_fundador: true,
      estado_civil: 'Casado(a)',
      regime_bens: 'Separação Total',
      conjuge_id: 'Cristiano',
    }),
    // Filhos DOS DOIS: o casal doa em separacao total, cada um o proprio bloco, e a
    // legitima existe nas duas pontas. Sem a mae na filiacao, a doacao dela para o
    // filho entraria sem legitima nenhuma.
    pf('Gabriel', { filiacao_pai_pessoa_id: 'Cristiano', filiacao_mae_pessoa_id: 'Fabiane' }),
    pf('Rafael', { filiacao_pai_pessoa_id: 'Cristiano', filiacao_mae_pessoa_id: 'Fabiane' }),
  ];
  mocks.socios = [
    { id: 'S1', socio_pessoa_id: 'Cristiano', socio_denominacao: 'Cristiano', socio_tipo_pessoa: 'PF', quotas: 6_086_672 },
    { id: 'S2', socio_pessoa_id: 'Fabiane', socio_denominacao: 'Fabiane', socio_tipo_pessoa: 'PF', quotas: 562_728 },
  ];
  mocks.quadroDasEmpresas = [
    { empresa_pessoa_id: 'HOLDING', socio_pessoa_id: 'Cristiano', quotas: 6_086_672 },
    { empresa_pessoa_id: 'HOLDING', socio_pessoa_id: 'Fabiane', quotas: 562_728 },
  ];
  mocks.parentescos = [
    { id: 'V1', pessoa_id: 'Gabriel', parente_pessoa_id: 'Cristiano', tipo: 'Filho(a)' },
    { id: 'V2', pessoa_id: 'Rafael', parente_pessoa_id: 'Cristiano', tipo: 'Filho(a)' },
  ];
});

afterEach(() => {
  vi.useRealTimers();
});

// A TRILHA DE AUDITORIA no padrão do resto do sistema. Mockada para o teste ver o que
// foi registrado sem depender do contexto de autenticação.
vi.mock('@/hooks/useAuditLog', () => ({
  useAuditLog: () => ({ logAction: mocks.auditoriaSpy, logActionOrThrow: vi.fn() }),
}));

describe('controlador da calculadora — o fio inteiro', () => {
  it('a lista começa VAZIA: nada entra sozinho', () => {
    // Decisão da OSG: o sistema não puxa doador nem donatário. Os casos não têm
    // molde, e adivinhar enchia a tabela de gente que não participa do ato.
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    expect(calc().totalDeQuotas).toBe(6_649_400n);
    expect(calc().upf).toBe('255,20');
    expect(calc().linhasDoQuadro).toEqual([]);
    expect(calc().podeGerar).toBe(false);
  });

  it('UM campo de participantes: quem tem quota entra doador, e o papel troca', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // Qualquer PF do cliente pode entrar — irmã para irmã, avô para netos —, com as
    // quotas ao lado do nome quando houver.
    expect(calc().candidatosAParticipante.map((c) => [c.pessoaId, c.quotas]))
      .toEqual([
        ['Cristiano', 6_086_672n],
        ['Fabiane', 562_728n],
        ['Gabriel', 0n],
        ['Rafael', 0n],
      ]);

    // O PAPEL vem das quotas: quem tem entra doador, quem não tem entra donatário.
    act(() => calc().adicionarParticipante('Cristiano'));
    act(() => calc().adicionarParticipante('Gabriel'));
    expect(calc().linhasDoQuadro.map((l) => l.nome)).toEqual(['Cristiano', 'Gabriel']);
    expect(calc().linhasDoQuadro.map((l) => l.papel)).toEqual(['doa', 'recebe']);
    expect(calc().linhasDoQuadro.map((l) => l.quotasAtuais)).toEqual([6_086_672n, 0n]);

    // Quem entrou sai da lista — ninguém entra duas vezes.
    expect(calc().candidatosAParticipante.map((c) => c.pessoaId))
      .toEqual(['Fabiane', 'Rafael']);

    // O palpite é palpite: o papel troca na coluna.
    act(() => calc().definirPapel('Gabriel', 'doa'));
    expect(calc().linhasDoQuadro.map((l) => l.papel)).toEqual(['doa', 'doa']);

    // O × tira de vez: não há "incluir de volta", basta adicionar outra vez.
    act(() => calc().removerParticipante('Gabriel'));
    expect(calc().linhasDoQuadro.map((l) => l.nome)).toEqual(['Cristiano']);
    expect(calc().candidatosAParticipante.map((c) => c.pessoaId)).toContain('Gabriel');
  });

  it('o PALPITE DE PARTIDA: doar tudo, meio a meio, em partes iguais', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // Os doadores têm 6.649.400. Metade de legítima e metade de disponível — é a
    // divisão da lei —, cada metade repartida entre os dois donatários.
    expect(calc().quotasDosDoadores).toBe(6_649_400n);
    expect(calc().legitimaDigitada('Gabriel')).toBe('1.662.350');
    expect(calc().disponivelDigitada('Gabriel')).toBe('1.662.350');
    expect(calc().legitimaDigitada('Rafael')).toBe('1.662.350');
    expect(calc().disponivelDigitada('Rafael')).toBe('1.662.350');

    // Fecha de saída: a última linha repete a primeira coluna.
    expect(calc().totaisDoQuadro.participacaoFinal)
      .toBe(calc().totaisDoQuadro.quotasAtuais);
    expect(calc().totaisDoQuadro.pctFinal).toBe('100.0000');
    expect(calc().totaisDoQuadro.sobra).toBe(0n);
    expect(calc().problemasDoQuadro).toEqual([]);
    expect(calc().podeGerar).toBe(true);

    // O campo direto mexe SÓ nesta pessoa, e o total SEGUE fechando: o que o Gabriel
    // deixa de receber fica com quem doa, e aparece na participação final dele.
    act(() => calc().setDisponivel('Gabriel', '0'));
    expect(calc().disponivelDigitada('Rafael')).toBe('1.662.350');
    expect(calc().totaisDoQuadro.sobra).toBe(1_662_350n);
    expect(calc().totaisDoQuadro.participacaoFinal)
      .toBe(calc().totaisDoQuadro.quotasAtuais);
    expect(calc().problemasDoQuadro).toEqual([]);
  });

  it('adicionar doador ou donatário REFAZ o palpite', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().adicionarDoador('Fabiane'));
    act(() => calc().adicionarDonatario('Gabriel'));
    // 562.728 ÷ 2 = 281.364 de cada parte, num donatário só.
    expect(calc().legitimaDigitada('Gabriel')).toBe('281.364');
    expect(calc().disponivelDigitada('Gabriel')).toBe('281.364');

    // Entra outro doador: o teto do ato cresce, e o palpite acompanha.
    act(() => calc().adicionarDoador('Cristiano'));
    expect(calc().legitimaDigitada('Gabriel')).toBe('3.324.700');
    expect(calc().disponivelDigitada('Gabriel')).toBe('3.324.700');

    // Entra outro donatário: as duas metades se repartem entre os dois.
    act(() => calc().adicionarDonatario('Rafael'));
    expect(calc().legitimaDigitada('Gabriel')).toBe('1.662.350');
    expect(calc().legitimaDigitada('Rafael')).toBe('1.662.350');
    expect(calc().totaisDoQuadro.sobra).toBe(0n);
  });

  it('a LEGÍTIMA é campo livre, sem teto e para qualquer donatário', () => {
    // Não é calculada: a OSG não sabe o número de antemão. E não há herdeiro
    // necessário a inferir — irmã para irmã, avô para netos.
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    act(() => calc().setLegitima('Gabriel', '9999999'));
    act(() => calc().confirmarLegitima('Gabriel'));
    // Nada apara: o que se digita é o que vale.
    expect(calc().legitimaDigitada('Gabriel')).toBe('9.999.999');
    expect(calc().linhasDoQuadro[2].legitima).toBe(9_999_999n);
    // E aí a trava LÓGICA aparece: recebe mais do que foi doado.
    expect(calc().problemasDoQuadro.map((x) => x.codigo))
      .toContain('distribuido-passa-do-doado');

    // Dentro do doado, passa sem reclamação — e mover valor entre legítima e
    // disponível não muda o imposto, porque compõem base única.
    act(() => calc().setLegitima('Gabriel', '2000000'));
    act(() => calc().setDisponivel('Gabriel', '1324700'));
    expect(calc().linhasDoQuadro[2].recebido).toBe(3_324_700n);
    expect(calc().problemasDoQuadro).toEqual([]);
  });

  it('DOAÇÃO PARCIAL: não há campo de quanto se doa — destina-se menos', () => {
    // Quem não quer doar tudo simplesmente não destina toda a legítima e toda a
    // disponível. Havia um campo para isso, e era o mesmo número dito duas vezes.
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // Os dois donatários recebem metade do palpite: o ato cai para 3.324.700.
    act(() => calc().setLegitima('Gabriel', '831175'));
    act(() => calc().setDisponivel('Gabriel', '831175'));
    act(() => calc().setLegitima('Rafael', '831175'));
    act(() => calc().setDisponivel('Rafael', '831175'));

    expect(calc().totaisDoQuadro.recebido).toBe(3_324_700n);
    expect(calc().totaisDoQuadro.sobra).toBe(3_324_700n);
    expect(calc().problemasDoQuadro).toEqual([]);
    expect(calc().podeGerar).toBe(true);

    // O RESTO FICA COM QUEM DOA, rateado na proporção do que cada um tem — e é isso
    // que a quotas final mostra, em vez de zero.
    const [cristiano, fabiane] = calc().linhasDoQuadro;
    expect(cristiano.transmitido).toBe(3_043_336n);
    expect(cristiano.participacaoFinal).toBe(6_086_672n - 3_043_336n);
    expect(fabiane.participacaoFinal).toBe(562_728n - 281_364n);
    // E a conferência segue fechando: nada evapora.
    expect(calc().totaisDoQuadro.participacaoFinal)
      .toBe(calc().totaisDoQuadro.quotasAtuais);
    expect(calc().totaisDoQuadro.pctFinal).toBe('100.0000');
  });

  it('separação total: uma GIA para cada, e a base é por par', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    expect(calc().numeroDeGias).toBe(2);
    act(() => calc().gerar());
    const saida = calc().simulacaoGerada!.saida;
    // Dois doadores × dois donatários = quatro linhas de beneficiário.
    expect(saida.gias).toHaveLength(4);
    expect(saida.linhas.map((l) => l.numeroDeGias)).toEqual([2, 2]);
  });

  it('comunhão UNIVERSAL é uma GIA para o casal; PARCIAL é uma para cada', () => {
    // A regra do manual (págs. 9 e 16), confirmada pela sênior da OSG. Fica trocável
    // na tela porque o caso concreto pode ter sido lavrado de outro jeito.
    const comRegime = (regime: string) => {
      mocks.pessoas = mocks.pessoas.map((x) => (
        x.id === 'Cristiano' || x.id === 'Fabiane' ? { ...x, regime_bens: regime } : x
      ));
      const r = renderHook(() => useCalculadoraItcmdController());
      montarAto(() => r.result.current);
      return r;
    };

    const universal = comRegime('Comunhão Universal');
    expect(universal.result.current.numeroDeGias).toBe(1);
    expect(universal.result.current.doadoresFiscais[0].ehCasalConjunto).toBe(true);
    expect(universal.result.current.doadoresFiscais[0].quotasDoadas).toBe(6_649_400n);
    universal.unmount();

    const parcial = comRegime('Comunhão Parcial');
    expect(parcial.result.current.numeroDeGias).toBe(2);
    expect(parcial.result.current.doadoresFiscais.map((d) => d.quotasDoadas))
      .toEqual([6_086_672n, 562_728n]);
  });

  it('cadastro incompleto cai em INDIVIDUAL, e a célula diz por quê', () => {
    // Antes isto interrompia a simulação esperando a forma do ato. A pergunta vivia
    // num bloco acima da tabela; sem o bloco, interromper seria travar calada — e
    // individual é o caso comum, à vista na coluna para trocar.
    mocks.pessoas = mocks.pessoas.map((x) => (
      x.id === 'Cristiano'
        ? { ...x, regime_bens: null, estado_civil: 'Casado(a)', conjuge_id: null }
        : x
    ));
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // Casado, mas SEM cônjuge vinculado: não há com quem emitir em conjunto, e a
    // trava descreve essa impossibilidade em vez de esconder a opção.
    const emissao = calc().emissaoDaGia('Cristiano');
    expect(emissao.conjunto).toBe(false);
    expect(emissao.podeConjunto).toBe(false);
    expect(emissao.motivo).toMatch(/não há cônjuge no cadastro/i);
    expect(calc().numeroDeGias).toBe(2);
    expect(calc().podeGerar).toBe(true);
  });

  it('EMISSÃO GIA: com CÔNJUGE no cadastro, a escolha é do analista', () => {
    // O REGIME decide o padrão, não o que é permitido: a comunhão parcial entra como
    // individual, e segue trocável — há instrumento de parcial lavrado em UMA guia,
    // com os dois qualificados como doadores. Travar tornava esse caso inalcançável.
    //
    // (Na separação total do fixture não há escolha, e isso está certo: sem meação não
    // há patrimônio comum para uma guia do casal.)
    mocks.pessoas = mocks.pessoas.map((x) => (
      x.id === 'Cristiano' || x.id === 'Fabiane'
        ? { ...x, regime_bens: 'Comunhão Parcial' }
        : x
    ));
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    const parcial = calc().emissaoDaGia('Cristiano');
    expect(parcial).toMatchObject({ conjunto: false, podeConjunto: true });
    expect(parcial.conjugeNome).toBe('Fabiane');
    expect(parcial.motivo).toMatch(/cada um emitir a sua guia/i);
    expect(calc().numeroDeGias).toBe(2);

    act(() => calc().definirEmissao('Cristiano', true));
    expect(calc().emissaoDaGia('Cristiano').conjunto).toBe(true);
    expect(calc().numeroDeGias).toBe(1);
  });

  it('EMISSÃO GIA: comunhão universal entra em conjunto, e é trocável', () => {
    mocks.pessoas = mocks.pessoas.map((x) => (
      x.id === 'Cristiano' || x.id === 'Fabiane'
        ? { ...x, regime_bens: 'Comunhão Universal' }
        : x
    ));
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // O cadastro resolve: universal com cônjuge vinculado → uma guia para o casal.
    const emissao = calc().emissaoDaGia('Cristiano');
    expect(emissao).toMatchObject({ conjunto: true, podeConjunto: true });
    expect(emissao.conjugeNome).toBe('Fabiane');
    expect(calc().numeroDeGias).toBe(1);

    // E trocável: o instrumento pode ter sido lavrado de outro jeito.
    act(() => calc().definirEmissao('Cristiano', false));
    expect(calc().emissaoDaGia('Cristiano').conjunto).toBe(false);
    expect(calc().numeroDeGias).toBe(2);
  });

  it('IGUALAR: o campo grava o que promete, sem mexer nos outros', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    expect(calc().linhasDoQuadro[2].pctFinal).toBe('50.0000');

    // Subir um NÃO desce o outro. Descia, e era isso que inviabilizava igualar: o
    // analista perseguia a conta em vez de fechá-la.
    act(() => calc().setQuotasFinal('Gabriel', '4000000'));
    // A legítima dele segue onde estava; quem se ajusta é a disponível.
    expect(calc().disponivelDigitada('Gabriel')).toBe('2.337.650');
    expect(calc().legitimaDigitada('Gabriel')).toBe('1.662.350');
    expect(calc().disponivelDigitada('Rafael')).toBe('1.662.350');
    expect(calc().quotasFinalDigitada('Gabriel', 4_000_000n)).toBe('4.000.000');
    // E o que não cabe vira TRAVA, em vez de aparo silencioso.
    expect(calc().problemasDoQuadro.map((x) => x.codigo))
      .toEqual(['distribuido-passa-do-doado']);

    // Fechando a conta na outra linha, a trava sai.
    act(() => calc().setQuotasFinal('Rafael', '2649400'));
    expect(calc().linhasDoQuadro[3].participacaoFinal).toBe(2_649_400n);
    expect(calc().totaisDoQuadro.sobra).toBe(0n);
    expect(calc().problemasDoQuadro).toEqual([]);
    // E as duas linhas de total seguem iguais.
    expect(calc().totaisDoQuadro.participacaoFinal)
      .toBe(calc().totaisDoQuadro.quotasAtuais);
  });

  it('a PORCENTAGEM é a outra porta do mesmo campo', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // 60% de 6.649.400 = 3.989.640, e a legítima de 1.662.350 já está dentro disso.
    act(() => calc().setPercentualFinal('Gabriel', '60'));
    expect(calc().linhasDoQuadro[2].participacaoFinal).toBe(3_989_640n);
    expect(calc().linhasDoQuadro[2].pctFinal).toBe('60.0000');
    expect(calc().disponivelDigitada('Gabriel')).toBe('2.327.290');
    // O Rafael não se move: o que o Gabriel leva a mais sai de quem doa.
    expect(calc().linhasDoQuadro[3].pctFinal).toBe('50.0000');

    // O TEXTO digitado fica no campo enquanto se digita, mesmo quando o valor
    // aplicado é limitado — era isso que impedia de escrever "50".
    act(() => calc().setPercentualFinal('Gabriel', '5'));
    expect(calc().percentualDigitado('Gabriel', '0.0000')).toBe('5');
  });

  it('na linha do DOADOR, digitar AJUSTA OS DONATÁRIOS', () => {
    // O que ele fica é consequência do que os donatários levam, então "o Cristiano
    // termina com 1.000.000" só pode significar "ajuste os donatários até isso ser
    // verdade". A conta volta pelo rateio, e o alvo bate exato.
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // Com o palpite inteiro destinado, ele termina com zero.
    expect(calc().linhasDoQuadro[0].participacaoFinal).toBe(0n);

    act(() => calc().setQuotasFinal('Cristiano', '1000000'));
    expect(calc().linhasDoQuadro[0].participacaoFinal).toBe(1_000_000n);

    // Os donatários receberam menos, na PROPORÇÃO da disponível que cada um tinha.
    expect(calc().disponivelDigitada('Gabriel')).toBe('1.116.124');
    expect(calc().disponivelDigitada('Rafael')).toBe('1.116.124');
    // E a LEGÍTIMA não foi tocada: ela é declarada, e este campo não a declara.
    expect(calc().legitimaDigitada('Gabriel')).toBe('1.662.350');

    // O quadro segue fechando, e sem trava.
    expect(calc().totaisDoQuadro.participacaoFinal)
      .toBe(calc().totaisDoQuadro.quotasAtuais);
    expect(calc().problemasDoQuadro).toEqual([]);

    // O que MOVE a linha dele também pelo outro lado: o donatário receber menos.
    act(() => calc().setLegitima('Gabriel', '0'));
    act(() => calc().setDisponivel('Gabriel', '0'));
    expect(calc().linhasDoQuadro[0].participacaoFinal).toBeGreaterThan(1_000_000n);
  });

  it('USUFRUTO: a reserva transfere o voto, e o quadro fecha em 100%', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // Sem reserva a doacao transmite a plena: quem recebe passa a votar.
    expect(calc().totaisDoUsufruto.nua).toBe(0n);
    expect(calc().linhasDoQuadro[2].participacaoFinal).toBe(3_324_700n);

    // Com reserva, o que foi recebido vira nua propriedade e o voto fica com quem doa.
    act(() => calc().setComReserva(true));

    const porNome = (nome: string) =>
      calc().linhasDoUsufruto.find((l) => l.nome === nome)!;

    // Quem recebeu com reserva tem a quota e nao vota.
    expect(porNome('Gabriel')).toMatchObject({
      plena: 0n, nua: 3_324_700n, usufruto: 0n, vozEVoto: 0n,
    });
    expect(porNome('Gabriel').concedePara).toEqual(['Cristiano', 'Fabiane']);

    // A CONCESSAO E POR PAR: cada doador guarda o voto do que ELE doou. Em separacao
    // total sao dois doadores distintos, e nao um bloco conjunto.
    expect(porNome('Cristiano')).toMatchObject({
      usufruto: 6_086_672n, pctVozEVoto: '91.5372',
    });
    expect(porNome('Fabiane')).toMatchObject({
      usufruto: 562_728n, pctVozEVoto: '8.4628',
    });
    // E o total fecha o capital: cada quota vota uma vez.
    expect(calc().totaisDoUsufruto.pctVozEVoto).toBe('100.0000');
    expect(calc().problemasDoUsufruto).toEqual([]);

    // Ja com todo o voto na mao dos doadores, nada a conceder: e o caso do Santa
    // Terezinha e do MMS, onde o casal detinha 100% da holding.
    expect(calc().totalInstituido).toBe(0n);
  });

  it('O CAMPO DIGITADO MANDA: a % aceita a tecla e o resto se acomoda', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // Cristiano doa (6.086.672) e o Gabriel recebe. O palpite doa tudo: metade na
    // legitima, metade na disponivel.
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));
    const cristiano = () => calc().linhasDoQuadro.find((l) => l.nome === 'Cristiano')!;
    const gabriel = () => calc().linhasDoQuadro.find((l) => l.nome === 'Gabriel')!;
    expect(cristiano().participacaoFinal).toBe(0n);

    // O CANONICO JA TEM QUATRO CASAS. Digitar em cima dele dava cinco, o regex
    // recusava e o campo voltava ao valor de antes — parecia travado, sem dizer por
    // que. Hoje quem cuida disso e a MASCARA: a quinta casa nao entra no texto, e o
    // que esta na tela e o que vai ser apurado. O campo nao volta, ele para.
    act(() => calc().setPercentualFinal('Cristiano', '30,00001'));
    expect(calc().percentualDigitado('Cristiano', 'x')).toBe('30,0000');
    // 30% de 6.649.400 = 1.994.820.
    expect(cristiano().participacaoFinal).toBe(1_994_820n);
    // E o Gabriel assumiu o resto, sem ninguem mexer no campo dele.
    expect(gabriel().participacaoFinal).toBe(6_086_672n - 1_994_820n);

    // A VIRGULA ENTRA SOZINHA. Era o relato: quatro digitos liam como 5.555%, o teto
    // aparava e o campo mostrava 100% — 55,55 nao era alcancavel digitando `5555`.
    act(() => calc().setPercentualFinal('Gabriel', '5555'));
    expect(calc().percentualDigitado('Gabriel', 'x')).toBe('55,55');
    // 55,55% de 6.649.400, meio para cima.
    expect(gabriel().participacaoFinal).toBe(3_693_742n);
  });

  it('GERAR fecha o ato: o modal volta em branco, e o caso fica', () => {
    // Recuperar o que estava digitado faz sentido antes de gerar. Depois, o quadro que
    // reabria era o de um ato que ja virou linha no historico.
    mocks.gravarFalha = false;
    // COM OS TRES CENARIOS: o ato so zera quando a gravacao volta, e com o acervo
    // incompleto do fixture padrao nada ia ao banco. O teste antigo passava justamente
    // pelo defeito — zerava a tela numa simulacao que nao gravou.
    mocks.bens = [imovel('IR-01', 4_000_000, 5_000_000, 3_000_000),
      imovel('IR-02', 2_649_400, 3_000_000, 1_800_000)];
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);
    act(() => calc().setComReserva(true));
    act(() => calc().setAporte('Gabriel', '1.000,00'));
    expect(calc().linhasDoQuadro.length).toBe(4);

    act(() => calc().gerar());

    expect(calc().linhasDoQuadro).toEqual([]);
    expect(calc().comReserva).toBe(false);
    expect(calc().aporteDigitado('Gabriel')).toBe('');
    expect(calc().painelAberto).toBe(false);
    // O CASO fica: sociedade, competencia e UPF nao se reteclam a cada simulacao.
    expect(calc().upf).toBe('255,20');
    expect(calc().competencia).toBe('2026-02');
    expect(calc().empresa?.denominacao).toBe('Terezinha Participações');
  });

  it('A LEGITIMA CEDE: a participacao final pedida DESCE abaixo do palpite', () => {
    // O quadro do Agro Alianca: quatro socios, e o ato e so entre duas irmas. O
    // universo do ato e 5.109.444 quotas (53,4576% do capital), e e por isso que
    // "igualar as duas" nao e 50%: e 26,7288% para cada uma.
    mocks.socios = [
      { id: 'S1', socio_pessoa_id: 'Cristiano', socio_denominacao: 'Cristiano', socio_tipo_pessoa: 'PF', quotas: 4_448_500 },
      { id: 'S2', socio_pessoa_id: 'Fabiane', socio_denominacao: 'Fabiane', socio_tipo_pessoa: 'PF', quotas: 3_626_444 },
      { id: 'S3', socio_pessoa_id: 'Gabriel', socio_denominacao: 'Gabriel', socio_tipo_pessoa: 'PF', quotas: 1_483_000 },
    ];
    mocks.quadroDasEmpresas = mocks.socios.map((s) => ({
      empresa_pessoa_id: 'HOLDING', socio_pessoa_id: s.socio_pessoa_id, quotas: s.quotas,
    }));
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    const linha = (n: string) => calc().linhasDoQuadro.find((l) => l.nome === n)!;

    // Fabiane doa para o filho Gabriel, que JA TEM quota: as duas pontas tem capital, e
    // e nesse desenho que a legitima do palpite virava piso.
    act(() => calc().adicionarParticipante('Fabiane'));
    act(() => calc().adicionarParticipante('Gabriel'));
    act(() => calc().definirPapel('Gabriel', 'recebe'));
    expect(calc().totaisDoQuadro.pctFinal).toBe('53.4576');

    // A LEGITIMA ERA PISO INVISIVEL. Antes deste conserto, digitar 26,7288% aqui
    // devolvia 34,4867%: a disponivel ia a zero e a participacao final parava em
    // `quotas atuais + legitima do palpite`, sem nada dizer por que.
    act(() => calc().setPercentualFinal('Gabriel', '26,7288'));
    expect(linha('Gabriel').pctFinal).toBe('26.7288');
    expect(linha('Fabiane').pctFinal).toBe('26.7288');

    // E cedeu quem tinha de ceder: a legitima do palpite era 1.813.222.
    expect(BigInt(calc().legitimaDigitada('Gabriel').replace(/\D/g, '')))
      .toBeLessThan(1_813_222n);
  });

  it('IRMA PARA IRMA: sem vinculo de herdeiro, a legitima entra ZERO', () => {
    // Irma nao e herdeira necessaria (art. 1.845: descendentes, ascendentes e conjuge).
    // O palpite antigo dividia o que a doadora da em metade legitima e metade
    // disponivel para QUALQUER par, e era essa legitima que travava o campo por baixo.
    mocks.pessoas = [
      { id: 'HOLDING', denominacao: 'Alianca', tipo_pessoa: 'PJ', tipo_empresa: 'CN', is_fundador: false, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null },
      pf('Regina'), pf('Cristina'), pf('Avelino'),
    ];
    mocks.parentescos = [];
    mocks.socios = [
      { id: 'S1', socio_pessoa_id: 'Avelino', socio_denominacao: 'Avelino', socio_tipo_pessoa: 'PF', quotas: 4_448_500 },
      { id: 'S2', socio_pessoa_id: 'Regina', socio_denominacao: 'Regina', socio_tipo_pessoa: 'PF', quotas: 3_626_444 },
      { id: 'S3', socio_pessoa_id: 'Cristina', socio_denominacao: 'Cristina', socio_tipo_pessoa: 'PF', quotas: 1_483_000 },
    ];
    mocks.quadroDasEmpresas = mocks.socios.map((s) => ({
      empresa_pessoa_id: 'HOLDING', socio_pessoa_id: s.socio_pessoa_id, quotas: s.quotas,
    }));
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    const linha = (n: string) => calc().linhasDoQuadro.find((l) => l.nome === n)!;

    act(() => calc().adicionarParticipante('Regina'));
    act(() => calc().adicionarParticipante('Cristina'));
    act(() => calc().definirPapel('Cristina', 'recebe'));

    // Nenhuma legitima, e a disponivel leva o que a Regina tem para dar.
    expect(calc().legitimaDigitada('Cristina')).toBe('0');
    expect(calc().disponivelDigitada('Cristina')).toBe('3.626.444');

    // E o campo desce sem piso nenhum: a Cristina fica com o que se pedir.
    act(() => calc().setPercentualFinal('Cristina', '20'));
    expect(linha('Cristina').pctFinal).toBe('20.0000');
  });

  it('A CONTA NO CAMPO: `/2` divide o ato em quotas exatas, sem conta na mao', () => {
    // O universo do ato e 5.109.444 quotas (53,4576% do capital), e "as duas iguais" e
    // 26,7288% para cada. Pelo percentual arredondado as duas linhas ficavam com quotas
    // diferentes (2.554.724 contra 2.554.720): uma casa de percentual vale ~956 quotas.
    mocks.pessoas = [
      { id: 'HOLDING', denominacao: 'Alianca', tipo_pessoa: 'PJ', tipo_empresa: 'CN', is_fundador: false, filiacao_pai_pessoa_id: null, filiacao_mae_pessoa_id: null },
      pf('Regina'), pf('Cristina'), pf('Avelino'),
    ];
    mocks.parentescos = [];
    mocks.socios = [
      { id: 'S1', socio_pessoa_id: 'Avelino', socio_denominacao: 'Avelino', socio_tipo_pessoa: 'PF', quotas: 4_448_500 },
      { id: 'S2', socio_pessoa_id: 'Regina', socio_denominacao: 'Regina', socio_tipo_pessoa: 'PF', quotas: 3_626_444 },
      { id: 'S3', socio_pessoa_id: 'Cristina', socio_denominacao: 'Cristina', socio_tipo_pessoa: 'PF', quotas: 1_483_000 },
    ];
    mocks.quadroDasEmpresas = mocks.socios.map((s) => ({
      empresa_pessoa_id: 'HOLDING', socio_pessoa_id: s.socio_pessoa_id, quotas: s.quotas,
    }));
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    const linha = (n: string) => calc().linhasDoQuadro.find((l) => l.nome === n)!;

    act(() => calc().adicionarParticipante('Regina'));
    act(() => calc().adicionarParticipante('Cristina'));
    act(() => calc().definirPapel('Cristina', 'recebe'));
    expect(calc().totaisDoQuadro.quotasAtuais).toBe(5_109_444n);

    // `/2` no campo de PERCENTUAL: resolve em quota inteira, e as duas fecham iguais.
    act(() => calc().setPercentualFinal('Cristina', '/2'));
    expect(linha('Cristina').participacaoFinal).toBe(2_554_722n);
    expect(linha('Regina').participacaoFinal).toBe(2_554_722n);

    // O texto fica no campo enquanto se digita, e o blur devolve o canonico.
    expect(calc().percentualDigitado('Cristina', 'x')).toBe('/2');
    act(() => calc().confirmarPercentual('Cristina'));
    expect(calc().percentualDigitado('Cristina', linha('Cristina').pctFinal)).toBe('26,7288');

    // `/2` no campo de QUOTAS faz a mesma conta.
    act(() => calc().setQuotasFinal('Regina', '/2'));
    expect(linha('Regina').participacaoFinal).toBe(2_554_722n);

    // E com dividendo escrito, divide o numero escrito: 5.109.444 / 3.
    act(() => calc().setQuotasFinal('Cristina', '5109444/3'));
    expect(linha('Cristina').participacaoFinal).toBe(1_703_148n);
  });

  it('O ABSURDO APARA para o maximo possivel, em vez de nao reagir', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    // Sete noves viram 99,9999% pela mascara (a virgula entra onde cabe), e 99,9999%
    // do capital e mais do que o Cristiano pode ter — a Fabiane detem o resto. O teto
    // da pessoa apara: ele vai ao maximo dele, que e ficar com tudo o que e dele.
    act(() => calc().setPercentualFinal('Cristiano', '9999999'));
    const cristiano = () => calc().linhasDoQuadro.find((l) => l.nome === 'Cristiano')!;
    expect(cristiano().participacaoFinal).toBe(6_086_672n);

    // E o donatario vai ao maximo DELE: o que tem mais tudo o que os doadores dao.
    act(() => calc().setQuotasFinal('Gabriel', '99999999999'));
    expect(calc().linhasDoQuadro.find((l) => l.nome === 'Gabriel')!.participacaoFinal)
      .toBe(6_086_672n);
    // E o doador ficou sem nada, porque foi isso que o numero digitado pediu.
    expect(cristiano().participacaoFinal).toBe(0n);
  });

  it('a LEGITIMA cede quando ela sozinha ja passa do que o doador quer dar', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    // Toda a doacao na legitima, nada na disponivel.
    act(() => calc().setLegitima('Gabriel', '6086672'));
    act(() => calc().setDisponivel('Gabriel', '0'));
    expect(calc().linhasDoQuadro.find((l) => l.nome === 'Cristiano')!.participacaoFinal)
      .toBe(0n);

    // Agora ele quer ficar com metade. A disponivel ja esta em zero, entao nao ha o
    // que ceder ali — e antes disso o campo simplesmente NAO IA.
    act(() => calc().setQuotasFinal('Cristiano', '3043336'));
    expect(calc().linhasDoQuadro.find((l) => l.nome === 'Cristiano')!.participacaoFinal)
      .toBe(3_043_336n);
    expect(calc().linhasDoQuadro.find((l) => l.nome === 'Gabriel')!.legitima)
      .toBe(3_043_336n);
  });

  it('a TRILHA registra o de-para de status e de nome, com o anterior', () => {
    // `changed_fields` sem o valor de antes diria "mudou para aprovada", que e metade
    // do fato. O anterior sai do historico, que a tela ja tem carregado.
    mocks.historico = [{
      empresaPessoaId: 'HOLDING',
      id: 'S1', versao: 2, nome: 'Sem reserva', status: 'gerada',
      competencia: '2026-08', upf: '263.78', totalDeQuotas: '6649400',
      criadaEm: '2026-08-28T12:00:00Z', observacao: null, origemSimulacaoId: null,
      acervoPorCenario: { contabil: '6649400.00', itr: null, mercado: null },
      impostoPorCenario: { contabil: '100.00', itr: null, mercado: null },
      totalPorCenario: { contabil: '100.00', itr: null, mercado: null },
      comReserva: false, pctBaseReserva: '100.00', pctBaseInstituicao: '70.00',
      usufruto: [], concessoes: [], gias: [], doadores: [], donatarios: [],
    }];

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().alterarStatus('S1', 'aprovada'));
    expect(mocks.statusSpy).toHaveBeenCalledWith({
      id: 'S1', status: 'aprovada', statusAnterior: 'gerada',
      nome: 'Sem reserva', versao: 2,
    });

    act(() => calc().renomear('S1', '51% pelo Avelino'));
    expect(mocks.renomearSpy).toHaveBeenCalledWith({
      id: 'S1', nome: '51% pelo Avelino', nomeAnterior: 'Sem reserva', versao: 2,
    });
  });

  it('sem a simulacao no historico, nao registra de-para inventado', () => {
    // O `mocks` e de modulo e o `beforeEach` nao zera os spies: sem isto, a chamada do
    // teste anterior conta como se fosse desta.
    mocks.statusSpy.mockClear();
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    // Id que nao esta na lista: nao ha valor anterior para declarar, e inventar um
    // poria dado falso na trilha.
    act(() => calc().alterarStatus('FANTASMA', 'aprovada'));
    expect(mocks.statusSpy).not.toHaveBeenCalled();
  });

  it('ENCADEADA: origem de OUTRA SOCIEDADE nao entra, e o ato parte do cadastro', () => {
    // O cliente tem mais de uma sociedade (no Agro Alianca sao tres) e o historico e
    // por CLIENTE. Sem guarda, dava para escolher a empresa B, herdar o quadro e o
    // acervo de um ato da empresa A e gravar o resultado como B.
    mocks.historico = [{
      id: 'DE-OUTRA', versao: 1, nome: 'Ato da outra sociedade', status: 'gerada',
      empresaPessoaId: 'OUTRA-HOLDING',
      competencia: '2026-08', upf: '263.78', totalDeQuotas: '9000000',
      criadaEm: '2026-08-28T12:00:00Z', observacao: null, origemSimulacaoId: null,
      acervoPorCenario: { contabil: '9000000.00', itr: null, mercado: null },
      impostoPorCenario: { contabil: '100.00', itr: null, mercado: null },
      totalPorCenario: { contabil: '100.00', itr: null, mercado: null },
      comReserva: false, pctBaseReserva: '100.00', pctBaseInstituicao: '70.00',
      usufruto: [], concessoes: [], gias: [],
      doadores: [{
        pessoaId: 'Cristiano', nome: 'Cristiano', quotas: '9000000',
        quotasTransmitidas: '0', quotasFinal: '9000000', emissaoConjunta: false,
        conjugeNome: null, vlrAporteMoeda: '0.00', quotasDoAporte: '0',
      }],
      donatarios: [],
    }];
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // Ela NAO aparece como origem possivel...
    expect(calc().origensPossiveis).toEqual([]);

    // ...e mesmo forcando o id, o quadro continua vindo do cadastro: 6.649.400 quotas
    // da HOLDING, e nao os 9.000.000 da outra.
    act(() => calc().setOrigemDoAto('DE-OUTRA'));
    expect(calc().totalDeQuotas).toBe(6_649_400n);
    expect(calc().origemEscolhida).toBeNull();
  });

  it('ENCADEADA: o ato parte do quadro que o anterior deixou', () => {
    // O ATO 1, ja gravado: o Cristiano doou 3.043.336 das 6.086.672 dele para o
    // Gabriel. Sobrou com 3.043.336, e o Gabriel ficou com 3.043.336.
    mocks.historico = [{
      empresaPessoaId: 'HOLDING',
      id: 'SIM-1',
      versao: 1,
      nome: 'Entre os herdeiros',
      status: 'gerada',
      competencia: '2026-02',
      upf: '255.20',
      totalDeQuotas: '6649400',
      criadaEm: '2026-02-10T12:00:00Z',
      observacao: null,
      origemSimulacaoId: null,
      acervoPorCenario: { contabil: '6649400.00', itr: null, mercado: null },
      impostoPorCenario: { contabil: '100000.00', itr: null, mercado: null },
      totalPorCenario: { contabil: '100000.00', itr: null, mercado: null },
      comReserva: false,
      pctBaseReserva: '100.00',
      pctBaseInstituicao: '70.00',
      usufruto: [],
      concessoes: [],
      doadores: [{
        pessoaId: 'Cristiano', nome: 'Cristiano',
        quotas: '6086672', quotasTransmitidas: '3043336', quotasFinal: '3043336',
        emissaoConjunta: false, conjugeNome: null,
        vlrAporteMoeda: '0.00', quotasDoAporte: '0',
      }],
      donatarios: [{
        pessoaId: 'Gabriel', nome: 'Gabriel',
        quotasAtuais: '0', quotasLegitima: '3043336', quotasDisponivel: '0',
        quotasFinal: '3043336', vlrAporteMoeda: '0.00', quotasDoAporte: '0',
        percentual: '45.7761',
        basePorCenario: { contabil: '3043336.00', itr: null, mercado: null },
        impostoPorCenario: { contabil: '100000.00', itr: null, mercado: null },
      }],
    }];

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // SEM origem, parte do cadastro: o Cristiano tem as 6.086.672 de la.
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Rafael'));
    expect(calc().linhasDoQuadro[0].quotasAtuais).toBe(6_086_672n);

    // COM origem, parte do que o ato 1 deixou.
    act(() => calc().setOrigemDoAto('SIM-1'));
    expect(calc().linhasDoQuadro[0].quotasAtuais).toBe(3_043_336n);
    // E o CAPITAL vem de la tambem — nao do cadastro.
    expect(calc().totalDeQuotas).toBe(6_649_400n);

    // Quem NAO estava no ato anterior entra com o que o cadastro diz: ele nao
    // participou, entao a posicao dele nao mudou.
    act(() => calc().adicionarDonatario('Fabiane'));
    const fabiane = calc().linhasDoQuadro.find((l) => l.nome === 'Fabiane')!;
    expect(fabiane.quotasAtuais).toBe(562_728n);

    // E o Gabriel, que recebeu no ato 1, entra ja com as quotas de la.
    act(() => calc().adicionarDonatario('Gabriel'));
    const gabriel = calc().linhasDoQuadro.find((l) => l.nome === 'Gabriel')!;
    expect(gabriel.quotasAtuais).toBe(3_043_336n);
  });

  it('ENCADEADA: herda o ACERVO da origem, e nao o do cadastro', () => {
    // A origem tem acervo de 9.000.000 — mais que os 6.649.400 do cadastro, como
    // aconteceria depois de um aporte em moeda no ato anterior. Puxar so as quotas
    // faria o preco da quota saltar e o imposto sair errado, calado.
    mocks.historico = [{
      empresaPessoaId: 'HOLDING',
      id: 'SIM-1', versao: 1, nome: null, status: 'gerada', competencia: '2026-02',
      upf: '255.20', totalDeQuotas: '9000000', criadaEm: '2026-02-10T12:00:00Z',
      observacao: null, origemSimulacaoId: null,
      acervoPorCenario: { contabil: '9000000.00', itr: null, mercado: null },
      impostoPorCenario: { contabil: '0.00', itr: null, mercado: null },
      totalPorCenario: { contabil: '0.00', itr: null, mercado: null },
      comReserva: false, pctBaseReserva: '100.00', pctBaseInstituicao: '70.00',
      usufruto: [], concessoes: [],
      doadores: [{
        pessoaId: 'Cristiano', nome: 'Cristiano',
        quotas: '6086672', quotasTransmitidas: '0', quotasFinal: '8437272',
        emissaoConjunta: false, conjugeNome: null,
        vlrAporteMoeda: '2350600.00', quotasDoAporte: '2350600',
      }],
      donatarios: [],
    }];

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));
    act(() => calc().setOrigemDoAto('SIM-1'));

    expect(calc().totalDeQuotas).toBe(9_000_000n);
    expect(calc().linhasDoQuadro[0].quotasAtuais).toBe(8_437_272n);
    // O ACERVO tambem: a quota continua valendo R$ 1,00, como no ato anterior.
    expect(calc().saida?.acervoPorCenario.contabil).toBe('9000000.00');
  });

  it('QUANTAS GUIAS: depende de quantos CONJUGES tem quota, nao da escolha', () => {
    // COMUNHAO UNIVERSAL nos dois, e os DOIS sao socios do fixture — 6.086.672 e
    // 562.728. Aqui a escolha muda a contagem.
    mocks.pessoas = mocks.pessoas.map((x) => (
      x.id === 'Cristiano' || x.id === 'Fabiane'
        ? { ...x, regime_bens: 'Comunhão Universal' }
        : x));

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDoador('Fabiane'));
    act(() => calc().adicionarDonatario('Gabriel'));

    // EM CONJUNTO os dois blocos caem no MESMO doador fiscal — o casal —, e sai UMA
    // guia com a soma. INDIVIDUAL sao dois doadores fiscais: DUAS guias.
    expect(calc().giasSeEmitir('Cristiano', true)).toBe(1);
    expect(calc().giasSeEmitir('Cristiano', false)).toBe(2);

    // E o CONTADOR da barra concorda, porque sai da mesma funcao. E o que impede o
    // rotulo da celula e o contador de discordarem na tela.
    act(() => calc().definirEmissao('Cristiano', true));
    expect(calc().numeroDeGias).toBe(1);
    act(() => calc().definirEmissao('Cristiano', false));
    expect(calc().numeroDeGias).toBe(2);
  });

  it('com UM conjuge no quadro, as duas formas dao UMA guia', () => {
    // A pegadinha: `casal-separado` NAO parte um bloco em dois. Quem nao tem quota no
    // quadro nao tem o que doar por si, entao o doador fiscal e o titular sozinho — e a
    // escolha muda o NOME na guia, nao a quantidade.
    //
    // Foi assim que eu errei antes: as duas guias que eu tinha visto vinham de DOIS
    // SOCIOS, e eu atribui a escolha.
    mocks.pessoas = mocks.pessoas.map((x) => (
      x.id === 'Cristiano' ? { ...x, regime_bens: 'Comunhão Universal' } : x));

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    expect(calc().giasSeEmitir('Cristiano', true)).toBe(1);
    expect(calc().giasSeEmitir('Cristiano', false)).toBe(1);
    expect(calc().numeroDeGias).toBe(1);
  });

  it('SEM CONJUGE nao ha escolha, e individual e UMA guia', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // O Cristiano do fixture esta em SEPARACAO TOTAL: o conjuge nao tem parte no que
    // ele doa, entao nao existe forma conjunta e ele emite sozinho.
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    expect(calc().emissaoDaGia('Cristiano').podeConjunto).toBe(false);
    expect(calc().numeroDeGias).toBe(1);
    // Sem forma de casal nao ha contagem hipotetica: a tela cai no texto fixo.
    expect(calc().giasSeEmitir('Cristiano', true)).toBeNull();
  });

  it('APORTE EM MOEDA: vira quotas, cresce o capital e NAO recolhe ITCD', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // Capital do cadastro: 6.086.672 (Cristiano) + 562.728 (Fabiane) = 6.649.400,
    // com acervo contabil de 6.649.400,00 — quota de R$ 1,00.
    expect(calc().totalDeQuotas).toBe(6_649_400n);

    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    // O GABRIEL, que e DONATARIO e nao tinha quota nenhuma, aporta R$ 1.000.000.
    // Qualquer um aporta: nao ha regra dizendo que so o fundador paga.
    act(() => calc().setAporte('Gabriel', '1.000.000,00'));

    expect(calc().quotasDoAporteDe('Gabriel')).toBe(1_000_000n);
    expect(calc().quotasAportadas).toBe(1_000_000n);
    // O CAPITAL CRESCE: e o denominador de todos os percentuais.
    expect(calc().totalDeQuotas).toBe(7_649_400n);

    // E as quotas ficam COM QUEM PAGOU, nao no ar.
    const gabriel = () => calc().linhasDoQuadro.find((l) => l.nome === 'Gabriel')!;
    expect(gabriel().quotasAtuais).toBe(1_000_000n);
    // 1.000.000 / 7.649.400 = 13,0729%
    expect(gabriel().pctAtual).toBe('13.0729');

    // O APORTE NAO E FATO GERADOR: o que ele recebeu por DOACAO nao inclui as quotas
    // que ele mesmo comprou. A base sai do doado, e as 1.000.000 do aporte nao entram.
    const linha = calc().saida!.linhas.find((l) => l.donatarioId === 'Gabriel')!;
    const doado = gabriel().recebido;
    expect(BigInt(linha.quotasRecebidas)).toBe(doado);
    // E a participacao final dele fecha nas duas origens: o que comprou mais o que
    // recebeu. Uma paga imposto, a outra nao.
    expect(gabriel().participacaoFinal).toBe(1_000_000n + doado);
  });

  it('o APORTE soma nos cenarios COM valor, e nao completa os que faltam', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // O fixture tem contabil nos dois imoveis e NADA de ITR nem de mercado.
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));
    expect(calc().acervo.contabil.total).toBe('6649400.00');
    expect(calc().acervo.itr.total).toBeNull();

    act(() => calc().setAporte('Cristiano', '1.000.000,00'));

    // Moeda vale o que diz na regua que EXISTE: o contabil cresce pelo valor de face.
    expect(calc().saida?.acervoPorCenario.contabil).toBe('7649400.00');
    // E o cenario SEM valor continua sem valor. Somar o dinheiro daria um total que
    // parece apurado e esconde os imoveis sem avaliacao.
    expect(calc().saida?.acervoPorCenario.itr).toBeNull();
    expect(calc().saida?.cenariosIndisponiveis).toContain('itr');
  });

  it('MOEDA NAO SE REAVALIA: soma o valor de face nos tres cenarios', () => {
    // O acervo com as TRES reguas, e de proposito com valores BEM diferentes: contabil
    // 6.649.400 (a quota vale R$ 1,00), mercado 20.000.000 (a quota valeria R$ 3,00) e
    // ITR 4.000.000 (R$ 0,60). Se o aporte fosse convertido em quotas e essas quotas
    // fossem avaliadas pelo preco do cenario, R$ 1.000.000 em dinheiro entrariam como
    // R$ 3.000.000 no mercado. Dinheiro nao tem risco de avaliacao: entra pelo que diz.
    mocks.bens = [imovel('IR-01', 6_649_400, 20_000_000, 4_000_000)];

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    const antes = calc().saida!.acervoPorCenario;
    expect(antes).toEqual({
      contabil: '6649400.00', mercado: '20000000.00', itr: '4000000.00',
    });

    act(() => calc().setAporte('Cristiano', '1.000.000,00'));

    // CADA cenario cresce EXATAMENTE R$ 1.000.000,00 — nem mais, nem proporcional.
    expect(calc().saida!.acervoPorCenario).toEqual({
      contabil: '7649400.00', mercado: '21000000.00', itr: '5000000.00',
    });
  });

  it('o APORTE preserva o PRECO da quota; o que cresce e a quantidade doada', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    // Acervo e capital iguais: a quota vale R$ 1,00, e a base do que se doa le o
    // mesmo numero das quotas doadas.
    const antes = calc().saida!.linhas[0];
    expect(antes.porCenario.contabil!.base).toBe('6086672.00');
    expect(antes.quotasRecebidas).toBe('6086672');

    // Com o aporte, o Cristiano tem MAIS quotas — e a legitima sai do que ele tem,
    // entao ele doa mais. A base cresce junto, e o preco da quota NAO muda: e o
    // aporte entrando nas duas reguas na mesma proporcao.
    act(() => calc().setAporte('Cristiano', '1.000.000,00'));
    const depois = calc().saida!.linhas[0];
    expect(depois.porCenario.contabil!.base).toBe('7086672.00');
    expect(depois.quotasRecebidas).toBe('7086672');
  });

  it('PAPEL no usufruto: quem doou usufrui, quem recebeu concede', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // O palpite vem da DOACAO, e e a mecanica da reserva: o fundador transmite a nua
    // propriedade e guarda uso, gozo e voto.
    expect(calc().papelNoUsufruto('Cristiano')).toBe('usufrui');
    expect(calc().papelNoUsufruto('Fabiane')).toBe('usufrui');
    expect(calc().papelNoUsufruto('Gabriel')).toBe('concede');
    expect(calc().papelNoUsufruto('Rafael')).toBe('concede');

    // E e so palpite: o papel e lista suspensa na linha, como na doacao.
    act(() => calc().definirPapelNoUsufruto('Rafael', 'usufrui'));
    expect(calc().papelNoUsufruto('Rafael')).toBe('usufrui');
    // Trocar o papel no usufruto NAO mexe na doacao: sao dois atos.
    expect(calc().linhasDoQuadro.find((l) => l.nome === 'Rafael')?.papel).toBe('recebe');
  });

  it('QUEM RECEBE e o papel, e ter DOIS usufrutuarios corta o imposto', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Fabiane'));
    act(() => calc().setComReserva(true));
    act(() => calc().setVozEVoto('Cristiano', '100'));

    // Um usufrutuario: uma guia, uma isencao de 500 UPF.
    expect(calc().saidaDaInstituicao!.gias).toHaveLength(1);
    expect(calc().saidaDaInstituicao!.totaisPorCenario.contabil).toBe('8100.38');

    // O Gabriel nao doou nem recebeu, e entra no quadro do usufruto para tambem
    // receber. Isso NAO e um campo de destino: e o papel dele na linha.
    act(() => calc().adicionarAoUsufruto('Gabriel'));
    act(() => calc().definirPapelNoUsufruto('Gabriel', 'usufrui'));

    // DOIS beneficiarios: a base se reparte e cada um recomeca nas faixas de baixo,
    // com a propria isencao. E a alavanca medida no Agro Alianca.
    const inst = calc().saidaDaInstituicao!;
    expect(inst.gias).toHaveLength(2);
    expect(inst.gias.map((g) => g.donatarioNome).sort()).toEqual(['Cristiano', 'Gabriel']);
    // 562.728,00 x 0,70 = 393.909,60, repartido em 196.954,80 para cada um: 771,8
    // UPF cai na faixa de 2% com deducao de 10 UPF, em vez dos 4% e 30 UPF que a base
    // inteira alcancava. R$ 8.100,38 -> R$ 2.774,20.
    expect(inst.totaisPorCenario.contabil).toBe('2774.20');
  });

  it('a LIXEIRA tira do usufruto sem tirar da doacao, e zera a concessao', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Fabiane'));
    act(() => calc().setComReserva(true));
    act(() => calc().setVozEVoto('Cristiano', '100'));
    expect(calc().totalInstituido).toBe(562_728n);

    act(() => calc().removerDoUsufruto('Fabiane'));

    // Fora do quadro do usufruto...
    expect(calc().linhasDoUsufruto.map((l) => l.nome)).toEqual(['Cristiano']);
    // ...e a concessao dela vai com ela: deixar o numero faria o total contar quota
    // de quem nao esta no ato.
    expect(calc().totalInstituido).toBe(0n);
    // ...mas segue DONATARIA na doacao, com as quotas dela.
    expect(calc().linhasDoQuadro.map((l) => l.nome)).toEqual(['Cristiano', 'Fabiane']);

    // E volta pelo mesmo campo de adicionar, no papel de palpite.
    act(() => calc().adicionarAoUsufruto('Fabiane'));
    expect(calc().linhasDoUsufruto.map((l) => l.nome)).toEqual(['Cristiano', 'Fabiane']);
    expect(calc().papelNoUsufruto('Fabiane')).toBe('concede');
  });

  it('ADICIONAR ao usufruto quem nao doou: conceder nao exige ter doado', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Gabriel'));

    // A Fabiane e socia de 562.728 quotas e ficou fora da doacao. Ela pode instituir
    // usufruto sobre as quotas que sempre teve.
    expect(calc().candidatosAoUsufruto.find((c) => c.pessoaId === 'Fabiane'))
      .toMatchObject({ quotas: 562_728n });

    act(() => calc().adicionarAoUsufruto('Fabiane'));
    const fabiane = calc().linhasDoUsufruto.find((l) => l.nome === 'Fabiane')!;
    // As quotas dela vem do quadro societario: ela nao doou nem recebeu.
    expect(fabiane).toMatchObject({ quotas: 562_728n, plena: 562_728n });
    // E ela entra podendo conceder, nao usufruindo: nao doou nada.
    expect(calc().papelNoUsufruto('Fabiane')).toBe('concede');
  });

  it('INSTITUICAO: complementa a reserva, com guia e imposto proprios', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // A Fabiane e socia (562.728 quotas) e entra como DONATARIA. Recebendo com
    // reserva, o Cristiano fica com o voto de 6.086.672 - 91,54% do capital.
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Fabiane'));
    act(() => calc().setComReserva(true));

    expect(calc().linhasDoUsufruto[0].pctVozEVoto).toBe('91.5372');
    expect(calc().linhasDoUsufruto[1]).toMatchObject({
      plena: 562_728n, nua: 6_086_672n,
    });

    // Para o Cristiano chegar a 100%, digita-se 100 NA LINHA DELE - e a calculadora
    // reparte a concessao entre quem tem propriedade plena. So a Fabiane tem.
    act(() => calc().setVozEVoto('Cristiano', '100'));
    expect(calc().institucaoDigitada('Fabiane')).toBe('562.728');
    expect(calc().linhasDoUsufruto[1]).toMatchObject({
      plena: 0n,
      nua: 6_649_400n,
      nuaDeReserva: 6_086_672n,
      nuaDeInstituicao: 562_728n,
    });
    // E a tela diz PARA QUEM ela concedeu, sem consultar outra lista.
    expect(calc().linhasDoUsufruto[1].concedePara).toEqual(['Cristiano']);
    expect(calc().linhasDoUsufruto[0].pctVozEVoto).toBe('100.0000');

    // O IMPOSTO DA INSTITUICAO, com a base reduzida a 70% (o padrao do campo):
    // 562.728,00 x 0,70 = 393.909,60 -> faixa de 4%, deducao de 30 UPF a 255,20.
    const inst = calc().saidaDaInstituicao!;
    expect(inst.gias).toHaveLength(1);
    expect(inst.gias[0].doadorNome).toBe('Fabiane');
    expect(inst.gias[0].donatarioNome).toBe('Cristiano');
    expect(inst.gias[0].porCenario.contabil?.base).toBe('393909.60');
    expect(inst.totaisPorCenario.contabil).toBe('8100.38');

    // E o total do ato soma os dois: doacao + instituicao.
    const daDoacao = Number(calc().saida!.totaisPorCenario.contabil);
    expect(Number(calc().impostoTotalPorCenario.contabil))
      .toBeCloseTo(daDoacao + 8100.38, 2);
  });

  it('o ESTADO do ato é campo, e vem com MT', () => {
    // Só MT porque só o ITCD de MT tem motor: faixa, dedução e UPF são da lei
    // mato-grossense. O campo existe para o caso não ficar implícito.
    const { result } = renderHook(() => useCalculadoraItcmdController());
    expect(result.current.estado).toBe('MT');
    expect(result.current.estadosComItcd).toEqual(['MT']);
  });

  it('quem só recebe não perde quotas: pedir menos do que já tem grava zero', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    // A Fabiane é sócia e entra como DONATÁRIA — sogro para genro, irmã para irmã.
    act(() => calc().adicionarDoador('Cristiano'));
    act(() => calc().adicionarDonatario('Fabiane'));

    act(() => calc().setLegitima('Fabiane', '0'));
    act(() => calc().setQuotasFinal('Fabiane', '100000'));
    expect(calc().disponivelDigitada('Fabiane')).toBe('0');
    expect(calc().linhasDoQuadro[1].participacaoFinal).toBe(562_728n);
  });

  it('o total NÃO precisa fechar 100%: nem todo sócio entra no ato', () => {
    // Irmã para irmã, avô para netos, sogro para genro — e nem sempre com 100% das
    // quotas. O total é a fatia do capital que este ato movimenta, e um número menor
    // é o normal, não um erro que impeça de gerar.
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;

    act(() => calc().adicionarDoador('Fabiane'));
    act(() => calc().adicionarDonatario('Gabriel'));

    expect(calc().totaisDoQuadro.pctAtual).toBe('8.4628');
    expect(calc().totaisDoQuadro.pctFinal).toBe('8.4628');
    expect(calc().problemasDoQuadro).toEqual([]);
    expect(calc().podeGerar).toBe(true);
  });

  it('cenário sem valor no cadastro sai indisponível, nunca zerado', () => {
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);
    act(() => calc().gerar());
    const saida = calc().simulacaoGerada!.saida;
    expect(saida.upf).toBe('255.20');
    expect(saida.cenariosIndisponiveis).toEqual(['itr', 'mercado']);
    expect(saida.totaisPorCenario.itr).toBeNull();
    expect(saida.totaisPorCenario.mercado).toBeNull();
    expect(saida.totaisPorCenario.contabil).not.toBeNull();
  });

  it('GERAR grava o retrato: pai, doadores e donatários', () => {
    // Com os três cenários apurados — é o que a tabela exige, e a apuração completa
    // é o entregável.
    mocks.bens = [imovel('IR-01', 4_000_000, 5_000_000, 3_000_000),
                  imovel('IR-02', 2_649_400, 3_000_000, 1_800_000)];
    mocks.gravarSpy.mockClear();

    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    expect(calc().motivoDeNaoGravar).toBeNull();
    act(() => calc().gerar());

    expect(mocks.gravarSpy).toHaveBeenCalledTimes(1);
    const gravado = mocks.gravarSpy.mock.calls[0][0];
    expect(gravado.clienteId).toBe('C1');
    expect(gravado.empresaPessoaId).toBe('HOLDING');
    // As quotas de cada doador NO MOMENTO da simulação: é retrato, não referência.
    // O QUADRO INTEIRO: com quantas quotas cada doador estava, o que saiu dele, com
    // quanto termina e em que guia emite. É o registro de execução do ato.
    expect(gravado.doadores).toEqual([
      {
        pessoaId: 'Cristiano',
        quotas: '6086672',
        quotasTransmitidas: '6086672',
        quotasFinal: '0',
        emissaoConjunta: false,
        conjugePessoaId: null,
        vlrAporteMoeda: '0.00',
        quotasDoAporte: '0',
      },
      {
        pessoaId: 'Fabiane',
        quotas: '562728',
        quotasTransmitidas: '562728',
        quotasFinal: '0',
        emissaoConjunta: false,
        conjugePessoaId: null,
        vlrAporteMoeda: '0.00',
        quotasDoAporte: '0',
      },
    ]);
    // E do outro lado: o que cada donatário já tinha, o que levou de cada parte e com
    // quanto termina. Os dois começam em zero e terminam com o que receberam.
    expect(gravado.donatarios).toEqual([
      {
        pessoaId: 'Gabriel',
        quotasAtuais: '0',
        quotasLegitima: '1662350',
        quotasDisponivel: '1662350',
        quotasFinal: '3324700',
        vlrAporteMoeda: '0.00',
        quotasDoAporte: '0',
      },
      {
        pessoaId: 'Rafael',
        quotasAtuais: '0',
        quotasLegitima: '1662350',
        quotasDisponivel: '1662350',
        quotasFinal: '3324700',
        vlrAporteMoeda: '0.00',
        quotasDoAporte: '0',
      },
    ]);
    expect(gravado.saida.totaisPorCenario.mercado).not.toBeNull();
  });

  it('cenário sem valor NÃO grava, e a tela diz por quê', () => {
    // A tabela exige os três cenários, e está certa. Gravar zero no cenário faltante
    // afirmaria um imposto que ninguém apurou; recusar em silêncio faria a simulação
    // parecer gravada. Então ela vale para a sessão e a tela nomeia o que falta.
    mocks.gravarSpy.mockClear();
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // O aviso NOMEIA A CAUSA, e as duas causas pedem coisas diferentes: nenhum bem
    // avaliado naquela régua, ou alguns bens sem valor. Aqui é a primeira.
    expect(calc().motivoDeNaoGravar).toMatch(/nenhum dos 2 bens tem valor de ITR/);
    expect(calc().motivoDeNaoGravar).toMatch(/nenhum dos 2 bens tem valor de mercado/);
    act(() => calc().gerar());
    expect(mocks.gravarSpy).not.toHaveBeenCalled();
    // Mas a simulação da sessão existe: os três quadros aparecem, com o cenário
    // faltante tracejado.
    expect(calc().simulacaoGerada?.saida.cenariosIndisponiveis)
      .toEqual(['itr', 'mercado']);
    // E O ATO FICA: nada foi ao banco, então o analista completa o cadastro do bem e
    // gera de novo sem reteclar o quadro.
    expect(calc().linhasDoQuadro.length).toBeGreaterThan(0);
  });

  it('ACERVO INCOMPLETO nao gera imposto: um bem de fora basta', () => {
    // O achado do parecer. Havia dois imoveis, um deles sem valor de mercado: o total
    // somava so o completo, o cenario continuava disponivel e a simulacao gravava base
    // de mercado MENOR que o acervo real — imposto a menos, calado. Agora o cenario cai
    // em `cenariosIndisponiveis` e o aviso diz quantos bens faltam.
    mocks.gravarSpy.mockClear();
    mocks.bens = [
      imovel('IR-01', 4_000_000, 5_000_000, 3_000_000),
      // O bem INCOMPLETO: contabil sim, mercado e ITR nao.
      imovel('IR-02', 1_000_000, null, null),
    ];
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);

    // O contabil tem os dois bens: soma e apura.
    expect(calc().saida?.acervoPorCenario.contabil).toBe('5000000.00');
    // Mercado e ITR tem UM de DOIS: nao ha base, e o aviso diz a proporcao.
    expect(calc().saida?.cenariosIndisponiveis).toEqual(['itr', 'mercado']);
    expect(calc().motivoDeNaoGravar).toMatch(/1 de 2 bens sem valor de ITR/);
    expect(calc().motivoDeNaoGravar).toMatch(/1 de 2 bens sem valor de mercado/);
    // UMA FONTE SÓ: o quadro do cenário recebe esta mesma frase. Elas se contradisseram
    // em tela — o aviso contava os bens que faltavam e o quadro, ao lado, dizia que não
    // havia valor nenhum nas matrículas do cliente.
    expect(calc().faltaNoCenario.itr).toBe('1 de 2 bens sem valor de ITR');
    expect(calc().faltaNoCenario.mercado).toBe('1 de 2 bens sem valor de mercado');
    expect(calc().faltaNoCenario.contabil).toBeNull();
    expect(calc().motivoDeNaoGravar).toContain(calc().faltaNoCenario.itr!);

    act(() => calc().gerar());
    expect(mocks.gravarSpy).not.toHaveBeenCalled();
  });

  it('ERRO DE USUFRUTO IMPEDE GERAR: aviso na tela nao e decoracao', () => {
    // O portao olhava so o quadro. Os problemas de usufruto e o erro da instituicao
    // apareciam escritos na tela e nao travavam nada: dava para gerar e gravar um
    // quadro que contradiz o proprio aviso.
    mocks.gravarSpy.mockClear();
    mocks.bens = [imovel('IR-01', 4_000_000, 5_000_000, 3_000_000),
      imovel('IR-02', 2_649_400, 3_000_000, 1_800_000)];
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);
    expect(calc().podeGerar).toBe(true);

    // Institui voz e voto sem escolher quem recebe: concessao sem destino.
    act(() => calc().setInstituicao('Cristiano', '1000'));

    expect(calc().problemasDoUsufruto.length).toBeGreaterThan(0);
    // Quem barrou foi o USUFRUTO: o quadro segue fechado e a apuracao existe. Sem estas
    // duas linhas o teste passaria mesmo que o portao continuasse olhando so o quadro.
    expect(calc().problemasDoQuadro).toEqual([]);
    expect(calc().saida).not.toBeNull();
    expect(calc().podeGerar).toBe(false);
    // E a acao tambem recusa, nao so o botao: `podeGerar` desabilita, e desabilitar e
    // aparencia.
    act(() => calc().gerar());
    expect(mocks.gravarSpy).not.toHaveBeenCalled();
  });

  it('GRAVACAO QUE FALHA nao apaga o formulario', () => {
    // Zerar o ato antes da resposta do banco custava tudo numa falha de rede ou de RLS:
    // participantes, aportes e usufruto apagados, com o erro na tela e nada para tentar
    // de novo a nao ser redigitar. Agora o ato so zera com a gravacao confirmada.
    mocks.gravarSpy.mockClear();
    mocks.gravarFalha = true;
    mocks.bens = [imovel('IR-01', 4_000_000, 5_000_000, 3_000_000),
      imovel('IR-02', 2_649_400, 3_000_000, 1_800_000)];
    const { result } = renderHook(() => useCalculadoraItcmdController());
    const calc = () => result.current;
    montarAto(calc);
    act(() => calc().setAporte('Gabriel', '1.000,00'));
    const linhasAntes = calc().linhasDoQuadro.length;

    act(() => calc().gerar());

    expect(mocks.gravarSpy).toHaveBeenCalledTimes(1);
    // O que a tela mostrava continua na tela.
    expect(calc().linhasDoQuadro.length).toBe(linhasAntes);
    expect(calc().aporteDigitado('Gabriel')).toBe('1.000,00');
    mocks.gravarFalha = false;
  });
});
