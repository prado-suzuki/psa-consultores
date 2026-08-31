import { useEffect, useMemo, useState } from 'react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useBensByCliente, type BemComValores } from '@/hooks/useDiagnosticoPatrimonial';
import { useQuadroDaEmpresa } from '@/hooks/useMovimentacaoQuotas';
import { useParentescosByCliente, usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useQuadroDasEmpresas } from '@/hooks/useSociedadesDoacao';
import { totalizarAcervo, type ImovelDoAcervo } from '@/lib/osg/acervoItcmd';
import { upfSugerida } from '@/lib/osg/itcmd/faixas';
import { formatMoney, parseMoney, quantizar2 } from '@/lib/osg/itcmd/dinheiro';
import { nomesCurtos } from '@/lib/osg/nomeCurto';
import {
  divisaoNoCampo, fatiaIgual, mascararPercentual, percentualEscalado,
} from '@/lib/osg/percentualDigitado';
import { simular, type Cenario, type SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';
import {
  derivarDoadoresFiscais, formaDoCadastro,
  type DoadorFiscal, type FormaDoDoador,
} from '@/lib/osg/doadoresDoAto';
import { ratearAto, repartirProporcional } from '@/lib/osg/rateioDoAto';
import {
  useAlterarStatusSimulacaoItcmd, useGravarSimulacaoItcmd,
  useRenomearSimulacaoItcmd, useSimulacoesItcmd, rotuloDaSimulacao,
  type StatusDaSimulacao,
} from '@/hooks/useSimulacoesItcmd';
import {
  candidatosADoador,
  candidatosADonatario,
} from '@/lib/osg/participantesItcmd';
import { montarQuadro, type Papel } from '@/lib/osg/quadroSimulacaoItcmd';
import {
  aporteDigitado, aporteEmTexto, aporteParaBanco, quotasDoAporte,
} from '@/lib/osg/aporteEmMoeda';
import {
  montarUsufruto, redistribuirConcessoes, repartirInstituicao,
  type ConcessaoDeUsufruto, type PapelDoUsufruto,
} from '@/lib/osg/usufrutoDoAto';

/**
 * Estado e derivações da Calculadora de ITCD. Fica em hook controlador porque a
 * página é uma cadeia de seis passos e o estado de um passo é entrada do
 * seguinte; deixar tudo no `.tsx` estouraria o teto de linhas do AGENTS.md.
 *
 * Sem persistência nesta etapa: o estado é React e morre com a navegação. Salvar,
 * revisar e aprovar são etapa seguinte — e é justamente por isso que a simulação
 * exibe a UPF que usou (SPEC §3.1: UPF nova não recalcula simulação emitida).
 */

/**
 * O acervo doado é TUDO que foi integralizado no capital, não só imóvel.
 *
 * O filtro era por tipo (`IR`, `IB`) e deixava a MOEDA CORRENTE (`OU`) de fora — e é
 * ela que fecha o capital: no Agro Aliança são R$ 40.983,60 sobre 12 imóveis de
 * R$ 9.516.960,40, dando as 9.557.944 quotas. Sem ela a base de cada donatário saía
 * proporcionalmente menor nos três cenários, e o imposto não batia com a GIA.
 *
 * Quem decide é `participa_estruturacao`, que é o campo que diz se o bem entrou no
 * capital. Tipo de bem não decide isso.
 */

/** A FORMA que o analista escolheu para o ato de um titular. */
export type TipoDeForma = 'individual' | 'casal-conjunto' | 'casal-separado';

/** O que o analista declarou por cima do cadastro. */
export interface FormaDeclarada {
  tipo: TipoDeForma;
  conjugeId: string | null;
}

/** Quotas com separador de milhar. Número cru em mensagem é ilegível. */
const quotasBR = (q: bigint): string => q.toLocaleString('pt-BR');

/**
 * Dígitos crus → agrupados, para os CAMPOS numéricos. `1000000` sem separador é o
 * tipo de número que induz erro de uma casa.
 */
const agrupar = (digitos: string): string => {
  const so = digitos.replace(/\D/g, '');
  return so === '' ? '' : so.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/** Empresas que têm quadro societário, como no Quadro Societário. */
const TIPOS_EMPRESA_ELEGIVEIS = ['PR', 'CN'];

export interface DonatarioNaTela {
  pessoaId: string;
  denominacao: string;
  origem: 'parentesco' | 'filiacao' | 'ambos';
  /** Quotas que recebe neste ato. É o que a redistribuição mantém somando o doado. */
  quotas: bigint;
  /**
   * Quanto do recebido vem da parte LEGÍTIMA — declarado, com efeito na colação
   * (CC, arts. 2.005 e 2.006) e NENHUM efeito no ITCD: legítima e disponível compõem
   * uma base única por donatário.
   */
  legitima: bigint;
  /** recebido − legítima. Derivado. */
  disponivel: bigint;
}

/** Uma GIA a emitir: um par doador × donatário, com o que já correu entre eles. */
export interface ParDoAto {
  doadorId: string;
  doadorNome: string;
  donatarioId: string;
  donatarioNome: string;
  quotas: bigint;
}

/**
 * Uma simulação gerada. É um retrato: sai do rascunho no momento em que o
 * analista manda gerar e não muda mais sozinha, nem quando o cadastro mudar.
 *
 * Enquanto não há persistência, mora em memória e morre com a navegação — mas o
 * formato já é o que a tabela vai guardar, e é por isso que a UPF e o nome da
 * sociedade viajam dentro dele em vez de serem lidos de novo na hora de exibir.
 */
export interface SimulacaoGerada {
  /** 1, 2, 3… na ordem em que o analista gerou. É o rótulo do histórico. */
  versao: number;
  saida: SaidaSimulacao;
  empresaNome: string;
  totalDeQuotas: string;
  /** Quem doou e quem recebeu, para o histórico dizer o que cada versão testou. */
  doadores: string[];
  donatarios: string[];
}

export function useCalculadoraItcmdController() {
  const { clienteId } = useOsgWork();

  const historico = useSimulacoesItcmd(clienteId || null);
  const gravar = useGravarSimulacaoItcmd();
  const alterarStatus = useAlterarStatusSimulacaoItcmd();
  const renomear = useRenomearSimulacaoItcmd();

  const bens = useBensByCliente(clienteId || null);
  const pessoas = usePessoasByCliente(clienteId || null);
  const parentescos = useParentescosByCliente(clienteId || null);

  const [empresaEscolhida, setEmpresaEscolhida] = useState<string | null>(null);
  // A lista de participantes é DERIVADA do cadastro, não montada à mão: todas as PF
  // do cliente entram, o papel vem do `is_fundador` e a ordem é por quotas. O que o
  // analista guarda aqui é só o que ele MUDOU — o papel de quem ele trocou e quem
  // ele tirou do ato. Estado mínimo: o resto se recalcula do cadastro.
  /**
   * QUEM ESTÁ NO ATO, na ordem em que o analista montou.
   *
   * Começa VAZIA e nada entra sozinho. O sistema não adivinha quem doa nem quem
   * recebe: os casos não têm molde, e puxar do cadastro enchia a tabela de gente que
   * não participa. O papel vem de QUAL campo adicionou a pessoa, e segue trocável.
   */
  const [participantes, setParticipantes] = useState<
    Array<{ pessoaId: string; papel: Papel }>
  >([]);
  /**
   * Quotas que cada DONATÁRIO recebe da parte DISPONÍVEL.
   *
   * NÃO EXISTE CAMPO DE "QUANTO CADA DOADOR DOA". O tamanho do ato é a soma do que se
   * destinou aqui e na legítima; quem não quer doar tudo baixa esses números, e o resto
   * permanece com quem doa.
   */
  const [disponivelPorDonatario, setDisponivelPorDonatario] =
    useState<Record<string, string>>({});
  /**
   * Quanto cada donatário leva da parte LEGÍTIMA. Declarado, sem teto e sem piso — a
   * OSG não sabe o número de antemão, e mover valor entre legítima e disponível muda a
   * colação, não o imposto.
   */
  const [legitimaPorDonatario, setLegitimaPorDonatario] = useState<Record<string, string>>({});
  /**
   * Forma do ato declarada na tela, por titular. Só existe onde o analista TROCOU o
   * que o cadastro propôs, ou onde o cadastro não responde.
   */
  const [formaDeclarada, setFormaDeclarada] = useState<Record<string, FormaDeclarada>>({});
  /**
   * O TEXTO que o analista está digitando no campo de percentual, pelo mesmo motivo do
   * rascunho da legítima: o valor exibido é DERIVADO, e sem guardar o texto cada tecla
   * era convertida em quotas e reescrita no campo — digitar "5" de "50" gravava 5% e o
   * campo voltava com outro número. Não dava para digitar.
   */
  const [pctDigitado, setPctDigitado] = useState<Record<string, string>>({});
  /**
   * O TEXTO que o analista está digitando no campo de legítima, pelo mesmo motivo do
   * percentual: o valor exibido é o EFETIVO, aparado pelo teto e pelo piso. Sem o
   * rascunho, cada tecla era aparada e reescrita no campo — e, pior, um valor
   * guardado antes de o teto encolher continuava aparecendo, enquanto o motor já
   * usava o menor. Era isso que fazia o campo dizer 1.112.125 e o TOTAL dizer 112.125.
   *
   * O texto vive só enquanto o campo está em edição; ao sair, o efetivo volta a mandar.
   */
  const [legitimaDigitadaDraft, setLegitimaDigitadaDraft] =
    useState<Record<string, string>>({});
  /**
   * O TEXTO no campo de QUOTAS FINAL, pelo mesmo motivo da legítima: o valor exibido é
   * DERIVADO (quotas atuais − doado + recebido), e sem o rascunho cada tecla era
   * reconvertida e reescrita no campo — não dava para digitar.
   */
  const [finalDigitadaDraft, setFinalDigitadaDraft] =
    useState<Record<string, string>>({});
  const [competencia, setCompetencia] = useState<string>(() => mesCorrente());
  // A UPF é DIGITADA. A série conhecida só preenche o campo na abertura, para
  // poupar digitação nos meses já publicados; o valor que apura é o do campo.
  // Vírgula, não ponto: é valor em reais. A série interna guarda com ponto, então a
  // conversão para a forma de exibição acontece aqui, uma vez.
  const [upf, setUpf] = useState<string>(
    () => (upfSugerida(mesCorrente()) ?? '').replace('.', ','),
  );
  /**
   * O ESTADO do ato. Só MT, porque só o ITCD de MT está implementado: as faixas, as
   * deduções e a UPF são da lei mato-grossense (`faixas.ts`), e cada estado tem as
   * suas. O campo existe para o caso não ficar implícito — quem lê a simulação vê de
   * qual lei ela saiu —, e é onde outro estado vai entrar quando houver motor para ele.
   *
   * NÃO É GRAVADO: `itcd_simulacao` não tem coluna de estado, e inventar uma agora
   * seria migration para um campo de um só valor.
   */
  // ── O USUFRUTO ──────────────────────────────────────────────────────────
  // Cada VERSAO da simulacao carrega o seu usufruto: no mesmo cliente, o Cenario I
  // instituiu 426.052 quotas de uma instituinte, o II dividiu em duas e o III nao
  // instituiu nada. Por isso o usufruto e da simulacao, nao do cliente.
  /** A doacao transmite a nua propriedade e o doador guarda o usufruto? */
  const [comReserva, setComReserva] = useState(false);
  /**
   * Percentual da base de calculo, em cada um dos dois atos. `100` encerra a
   * tributacao (Decreto 2.125/03, art. 28, par. 3, III); `70` e a reducao automatica
   * do art. 11, par. 2, I, que deixa parcela devida na extincao.
   */
  const [pctBaseDaDoacao, setPctBaseDaDoacao] = useState<'100' | '70'>('100');
  const [pctBaseDaInstituicao, setPctBaseDaInstituicao] = useState<'100' | '70'>('70');
  /** Quotas que cada pessoa CONCEDE em usufruto, digitadas. */
  const [institucoes, setInstitucoes] = useState<Record<string, string>>({});
  /**
   * PARA QUEM vai o usufruto. UM por ato, nao um por linha: nos tres clientes mapeados
   * o usufruto vai todo para o fundador, e uma coluna de destino repetia N vezes um
   * dado que a coluna de usufruto ja mostra - quem tem numero ali e quem recebe.
   *
   * Ausente = o primeiro doador do ato.
   */
  /**
   * APORTE EM MOEDA CORRENTE, por pessoa, em texto digitado.
   *
   * E UM CENARIO — o que dispensa a reserva de usufruto: em vez de doar tudo e guardar
   * o voto, quem quer participacao integraliza dinheiro, recebe quotas novas e chega ao
   * percentual por PROPRIEDADE.
   *
   * QUALQUER UM APORTA, doador ou donatario: nao ha regra dizendo que so o fundador
   * pode pagar. Por isso e coluna da tabela, e nao campo unico da barra.
   *
   * VIVE SO NO MOTOR. Nada disso vai para o cadastro: o campo de moeda corrente do
   * capital social e outra frente, do tech lead, e enquanto ela nao existe o aporte e
   * uma hipotese desta simulacao.
   */
  const [aportes, setAportes] = useState<Record<string, string>>({});

  /**
   * O QUADRO DO USUFRUTO e o da DOACAO com outras colunas - mesmas pessoas, mesmo
   * papel-na-linha, mesmo lixo e mesmo campo de adicionar. Por isso ele nao e uma
   * copia da lista da doacao, e sim ela mais tres desvios explicitos:
   *
   *   papeisDoUsufruto  - quem usufrui e quem concede, quando difere do palpite
   *   foraDoUsufruto    - quem a doacao trouxe e nao entra neste ato
   *   extrasDoUsufruto  - quem nao doou nem recebeu, mas concede usufruto
   *
   * Copiar a lista faria o quadro do usufruto envelhecer: trocar um donatario na
   * doacao deixaria o antigo aqui. Derivar e guardar so o desvio mantem os dois
   * quadros falando da mesma gente.
   */
  const [papeisDoUsufruto, setPapeisDoUsufruto] = useState<
    Record<string, PapelDoUsufruto>
  >({});
  const [foraDoUsufruto, setForaDoUsufruto] = useState<string[]>([]);
  const [extrasDoUsufruto, setExtrasDoUsufruto] = useState<string[]>([]);
  /**
   * O TEXTO em edicao na coluna de voz e voto, por pessoa. Mesmo motivo do rascunho da
   * participacao final na aba de doacao: o valor exibido e DERIVADO, e sem guardar o
   * texto cada tecla era convertida em quotas e reescrita no campo.
   */
  const [alvoDigitado, setAlvoDigitado] = useState<Record<string, string>>({});

  /**
   * DE QUAL SIMULACAO ESTE ATO PARTE. Vazio = parte do cadastro.
   *
   * A OSG apresenta o fluxo completo: a doacao entre os herdeiros, depois a do fundador
   * para os herdeiros, e o total. O segundo ato nao parte do quadro societario de hoje
   * — parte de onde o primeiro parou, e esse quadro so existe na simulacao anterior.
   *
   * A coluna `origem_simulacao_id` foi criada na primeira migration para isto e nunca
   * teve escritor. O comentario dela ja dizia: "a tela sugere o valor somando o que a
   * pessoa ja recebeu em simulacoes anteriores desta base".
   */
  const [origemId, setOrigemId] = useState<string>('');

  const [estado, setEstado] = useState<string>('MT');
  const [modalAberto, setModalAberto] = useState(false);
  /**
   * A simulação ACABADA DE GERAR, para os três quadros aparecerem no clique sem
   * esperar o refetch do histórico. Não é o histórico: esse vem do banco.
   */
  const [simulacoes, setSimulacoes] = useState<SimulacaoGerada[]>([]);

  // ── Passo 1: imóveis e totais por cenário ────────────────────────────────
  const imoveis = useMemo<ImovelDoAcervo[]>(
    () => (bens.data ?? [])
      .filter((b) => b.participa_estruturacao)
      .map(paraImovelDoAcervo),
    [bens.data],
  );
  const acervo = useMemo(() => totalizarAcervo(imoveis), [imoveis]);
  // Bens fora do acervo aparecem contados, não desaparecidos: o total tem de
  // poder ser conferido contra a lista do Diagnóstico Patrimonial.
  const bensForaDoAcervo = (bens.data ?? []).length - imoveis.length;

  // ── Passo 2: a sociedade cujas quotas serão doadas ───────────────────────
  // Só entram as que têm sócio PESSOA FÍSICA: é sempre a holding que se doa, e o
  // que a identifica é ter PF no quadro, não ter "Participações" no nome. As
  // operacionais têm a holding como sócia — não têm doador possível, e antes
  // apareciam na lista sem carregar nada.
  const todasAsEmpresas = useMemo(
    () => (pessoas.data ?? [])
      .filter((p) => p.tipo_pessoa === 'PJ'
        && TIPOS_EMPRESA_ELEGIVEIS.includes(p.tipo_empresa ?? ''))
      .sort((a, b) => (a.denominacao ?? '').localeCompare(b.denominacao ?? '')),
    [pessoas.data],
  );
  const idsDasEmpresas = useMemo(() => todasAsEmpresas.map((e) => e.id), [todasAsEmpresas]);
  const quadroDasEmpresas = useQuadroDasEmpresas(idsDasEmpresas);

  const idsPf = useMemo(
    () => new Set((pessoas.data ?? []).filter((p) => p.tipo_pessoa === 'PF').map((p) => p.id)),
    [pessoas.data],
  );
  const empresasComSocioPf = useMemo(() => {
    const linhas = quadroDasEmpresas.data;
    // Enquanto o quadro não chegou, não esconde nada: esconder por dado ausente
    // faria a lista piscar de vazia para cheia.
    if (linhas == null) return todasAsEmpresas;
    const comPf = new Set(
      linhas.filter((l) => idsPf.has(l.socio_pessoa_id)).map((l) => l.empresa_pessoa_id),
    );
    return todasAsEmpresas.filter((e) => comPf.has(e.id));
  }, [quadroDasEmpresas.data, todasAsEmpresas, idsPf]);

  const empresas = empresasComSocioPf;
  const empresasOcultas = todasAsEmpresas.length - empresas.length;
  const empresa = empresas.find((e) => e.id === empresaEscolhida) ?? empresas[0] ?? null;
  /**
   * O QUADRO DA EMPRESA ESCOLHIDA. A fonte deixou de ser a tabela
   * `quadro_societario` e passou a ser o acumulado do livro de movimentos, na view
   * `v_quadro_societario` (hook `useQuadroDaEmpresa`).
   *
   * A forma antiga fica na FRONTEIRA, num map de duas linhas: `candidatosADoador` e
   * o motor pedem `socio_pessoa_id`, e trocar isso la dentro seria propagar um
   * rename de coluna do banco por dez arquivos de calculo.
   */
  const quadroDaEmpresa = useQuadroDaEmpresa(empresa?.id ?? null);
  const socios = useMemo(() => ({
    data: (quadroDaEmpresa.data ?? []).map((s) => ({
      socio_pessoa_id: s.pessoaId,
      quotas: s.quotas,
    })),
    error: quadroDaEmpresa.error,
  }), [quadroDaEmpresa.data, quadroDaEmpresa.error]);
  const quotasDoCadastro = socios.data
    .reduce((acc, s) => acc + BigInt(s.quotas ?? 0), 0n);

  /**
   * O ACERVO E O CAPITAL COM O APORTE.
   *
   * O dinheiro entra nos TRES cenarios pelo valor de face, e nao so no contabil. Moeda
   * vale o que diz em qualquer regua de avaliacao — e e assim que a moeda ja e lancada
   * no cadastro destes clientes, com contabil, ITR e mercado iguais. Somar so no
   * contabil daria quotas novas sem valor nos outros dois, e a base por quota cairia
   * nos cenarios de ITR e de mercado: diluição sem contrapartida.
   *
   * O PRECO DA QUOTA sai do acervo contabil ANTES do aporte: e o valor que a quota
   * tinha quando o dinheiro entrou.
   */
  const aporteDe = (pessoaId: string) => aporteDigitado(aportes[pessoaId] ?? '');

  /**
   * O RETRATO DE PARTIDA: o do cadastro, ou o da simulacao de origem.
   *
   * HERDA O RETRATO INTEIRO, e nao so as quotas. Se o ato anterior teve aporte em
   * moeda, o capital e o acervo dele ja nao sao os do cadastro — puxar so as quotas
   * faria o preco da quota saltar e o imposto sair errado, calado. Doacao nao muda o
   * patrimonio da empresa: as quotas trocam de mao e os bens ficam onde estao.
   */
  /**
   * A ORIGEM SO VALE DENTRO DA MESMA SOCIEDADE, e a guarda e AQUI porque daqui sai
   * tudo: as quotas de partida, o acervo de partida e o campo que vai para o banco.
   *
   * A escolha da origem acontece antes da troca de sociedade, e nada obriga as duas a
   * combinarem: escolher um ato da empresa A e depois trocar para a empresa B deixava a
   * tela herdando o quadro de A com o nome de B. Fora da empresa, a origem simplesmente
   * nao resolve, e o ato parte do cadastro.
   */
  const origem = (historico.data ?? []).find(
    (s) => s.id === origemId && empresa != null && s.empresaPessoaId === empresa.id,
  ) ?? null;

  const quotasDeOrigem = new Map<string, bigint>(origem == null ? [] : [
    ...origem.doadores.map((d) => [d.pessoaId, BigInt(d.quotasFinal)] as const),
    ...origem.donatarios.map((d) => [d.pessoaId, BigInt(d.quotasFinal)] as const),
  ]);

  const quotasDePartida = origem == null
    ? quotasDoCadastro
    : BigInt(origem.totalDeQuotas);

  const acervoDePartida = origem == null
    ? { contabil: acervo.contabil.total, itr: acervo.itr.total, mercado: acervo.mercado.total }
    : origem.acervoPorCenario;

  const acervoContabilDePartida = ((): bigint => {
    try {
      return acervoDePartida.contabil == null ? 0n : parseMoney(acervoDePartida.contabil);
    } catch {
      return 0n;
    }
  })();
  const quotasDoAporteDe = (pessoaId: string) => quotasDoAporte(
    aporteDe(pessoaId), acervoContabilDePartida, quotasDePartida,
  );

  // Sobre TODOS os aportados, e nao so sobre quem esta no ato: quem aportou entrou no
  // capital, e o denominador dos percentuais e o capital.
  const idsComAporte = Object.keys(aportes).filter((id) => aporteDe(id) > 0n);
  const aporteTotal = idsComAporte.reduce((a, id) => a + aporteDe(id), 0n);
  const quotasAportadas = idsComAporte.reduce((a, id) => a + quotasDoAporteDe(id), 0n);

  const totalDeQuotas = quotasDePartida + quotasAportadas;
  const acervoComAporte = {
    contabil: somarAoAcervo(acervoDePartida.contabil, aporteTotal),
    itr: somarAoAcervo(acervoDePartida.itr, aporteTotal),
    mercado: somarAoAcervo(acervoDePartida.mercado, aporteTotal),
  };

  // ── Passo 3: a lista de participantes do ato ─────────────────────────────
  //
  // Começa VAZIA. O analista adiciona uma pessoa, escolhe se ela doa ou recebe, e o
  // sistema puxa as quotas dela do quadro societário. Não é uma lista pré-marcada de
  // todos os sócios: quem participa de um ato é decisão, não cadastro — e é isso que
  // torna possível uma doação entre irmãs, que a versão anterior da tela proibia.
  const todosOsSociosPf = useMemo(
    () => candidatosADoador(socios.data, pessoas.data ?? []),
    [socios.data, pessoas.data],
  );
  /**
   * AS QUOTAS DE CADA UM, com o aporte dentro. E o numero que o ato usa em tudo: teto
   * do que se doa, base do rateio e denominador do percentual. Sem isso o aporte
   * apareceria no capital e nao na pessoa que pagou.
   */
  const quotasPorPessoa = useMemo(
    () => new Map(todosOsSociosPf.map((c) => [c.pessoaId, c.quotas])),
    [todosOsSociosPf],
  );
  const quotasComAporte = (pessoaId: string) => (origem == null
    ? quotasPorPessoa.get(pessoaId) ?? 0n
    // COM ORIGEM, quem estava no ato anterior entra com a participacao FINAL de la.
    // Quem nao estava entra com o que o cadastro diz — ele nao participou, entao a
    // posicao dele nao mudou.
    : quotasDeOrigem.get(pessoaId) ?? quotasPorPessoa.get(pessoaId) ?? 0n
  ) + quotasDoAporteDe(pessoaId);

  const nomePorId = useMemo(
    () => new Map((pessoas.data ?? []).map((p) => [p.id, p.denominacao])),
    [pessoas.data],
  );

  const ehFundador = useMemo(
    () => new Set((pessoas.data ?? []).filter((p) => p.is_fundador === true).map((p) => p.id)),
    [pessoas.data],
  );

  /**
   * Papel proposto pelo cadastro: FUNDADOR COM QUOTAS doa, o resto recebe. As duas
   * condições juntas importam — fundador sem quota na sociedade não tem o que doar
   * (é o caso de quem só assina anuência), e entrar como doador com zero deixaria a
   * legítima zerada sem dizer por quê.
   */
  /** O papel de quem está no ato. Vem do campo que adicionou a pessoa. */
  const papelDe = (pessoaId: string): Papel =>
    participantes.find((p) => p.pessoaId === pessoaId)?.papel ?? 'recebe';

  // Quem doa. Sai dos SÓCIOS, e não da lista final, para quebrar a dependência
  // circular: os herdeiros dependem de quem doa, e a lista final inclui herdeiros.
  const doadores = todosOsSociosPf
    .filter((c) => participantes.some((p) => p.pessoaId === c.pessoaId && p.papel === 'doa'))
    .map((c) => ({
      pessoaId: c.pessoaId,
      denominacao: c.denominacao,
      quotas: quotasComAporte(c.pessoaId),
    }));

  // ── A FORMA DO ATO: de titular do quadro a DOADOR FISCAL ────────────────
  // UMA GIA POR DOADOR, com os beneficiários dentro dela. Casal em conjunto é um
  // doador; cada um por si são dois. A escolha vale faixa de alíquota, e o cadastro
  // não a responde: ele sabe o regime de bens, não sabe como o instrumento foi
  // lavrado.
  const propostaPorTitular = useMemo(() => {
    const nomes = new Map((pessoas.data ?? []).map((x) => [x.id, x.denominacao]));
    return new Map(
      (pessoas.data ?? []).map((x) => [x.id, formaDoCadastro(x, nomes)]),
    );
  }, [pessoas.data]);

  /**
   * A forma em vigor para um titular: escolha na coluna, ou a proposta do cadastro.
   *
   * SEM PENDÊNCIA. Cadastro incompleto — sem regime, sem cônjuge vinculado — cai em
   * INDIVIDUAL, que é uma GIA só no nome do titular. Antes caía em "não informado", e
   * isso travava a simulação inteira esperando uma resposta que só o bloco de forma do
   * ato sabia pedir; sem esse bloco, travaria calada. Individual é o caso comum (é o
   * que a comunhão parcial produz) e está à vista na coluna, para trocar.
   */
  const formaDe = (titularId: string): FormaDoDoador => {
    const declarada = formaDeclarada[titularId];
    if (declarada) {
      // A forma de casal exige saber QUEM é o cônjuge; sem ele, individual.
      if (declarada.tipo === 'individual' || !declarada.conjugeId) {
        return { tipo: 'individual' };
      }
      return {
        tipo: declarada.tipo,
        conjugeId: declarada.conjugeId,
        conjugeNome: nomePorId.get(declarada.conjugeId) ?? declarada.conjugeId,
      };
    }
    const proposta = propostaPorTitular.get(titularId);
    // `resolvida` e `escolha` trazem forma pronta — a diferença é só se a tela
    // apresenta como dado do cadastro ou como escolha trocável.
    return proposta && (proposta.estado === 'resolvida' || proposta.estado === 'escolha')
      ? proposta.forma
      : { tipo: 'individual' };
  };

  const blocosDoados = doadores.map((d) => ({
    titularId: d.pessoaId,
    titularNome: d.denominacao,
    quotasDoadas: d.quotas,
    forma: formaDe(d.pessoaId),
  }));

  /** Os doadores fiscais — um por GIA a emitir. */
  const { doadoresFiscais, erroDaForma } = ((): {
    doadoresFiscais: DoadorFiscal[]; erroDaForma: string | null;
  } => {
    try {
      return { doadoresFiscais: derivarDoadoresFiscais(blocosDoados), erroDaForma: null };
    } catch (e) {
      return {
        doadoresFiscais: [],
        erroDaForma: e instanceof Error ? e.message : String(e),
      };
    }
  })();

  const formaResolvida = erroDaForma == null;

  /**
   * QUANTAS GUIAS O ATO TERIA se esta pessoa emitisse em conjunto, ou individual.
   *
   * DERIVADO, e nao afirmado no rotulo. O numero de guias e `doadoresFiscais.length`,
   * e a mesma barra mostra "N GIA a emitir" calculado: um rotulo escrito na mao ao lado
   * de um contador calculado e uma tela que pode se contradizer, e a contradicao nao
   * apareceria em teste nenhum — os dois textos nao se falam.
   *
   * Aqui os dois saem da MESMA funcao. Casal em conjunto e UM doador fiscal (o doador
   * da guia e o casal); cada um por si sao DOIS, porque a meacao faz do conjuge um
   * doador proprio. Se algum dia isso mudar, os dois numeros mudam juntos.
   *
   * Forma que der erro devolve `null`: a tela nao promete contagem sobre um ato que
   * nao fecha.
   */
  const giasSeEmitir = (pessoaId: string, conjunto: boolean): number | null => {
    const proposta = propostaPorTitular.get(pessoaId);
    const doCasal = proposta != null
      && (proposta.estado === 'resolvida' || proposta.estado === 'escolha')
      && (proposta.forma.tipo === 'casal-conjunto'
        || proposta.forma.tipo === 'casal-separado')
      ? proposta.forma
      : null;
    if (doCasal == null) return null;
    try {
      return derivarDoadoresFiscais(blocosDoados.map((b) => (b.titularId === pessoaId
        ? {
          ...b,
          forma: {
            tipo: conjunto ? 'casal-conjunto' as const : 'casal-separado' as const,
            conjugeId: doCasal.conjugeId,
            conjugeNome: doCasal.conjugeNome,
          },
        }
        : b))).length;
    } catch {
      return null;
    }
  };

  // `doadores` é derivado a cada render; a chave estável do memo é a lista de ids.
  const idsDosDoadores = doadores.map((d) => d.pessoaId).join('|');
  const candidatosDonatario = useMemo(
    () => candidatosADonatario(
      idsDosDoadores === '' ? [] : idsDosDoadores.split('|'),
      pessoas.data ?? [],
      parentescos.data ?? [],
    ),
    [idsDosDoadores, pessoas.data, parentescos.data],
  );
  // HERDEIROS ≠ DONATÁRIOS. `candidatosDonatario` são todos os filhos dos doadores:
  // é o universo de herdeiros necessários, e é ele que DIVIDE a legítima. Quem foi
  // adicionado à lista decide só quem recebe neste ato.
  const numeroDeHerdeiros = candidatosDonatario.length;
  /**
   * QUEM É HERDEIRO NECESSÁRIO dos doadores deste ato: os filhos, mais o cônjuge de
   * cada doador (art. 1.845 do Código Civil). É o que decide se a legítima entra no
   * palpite, e vale só com vínculo POSITIVO no cadastro: silêncio não vira legítima.
   *
   * O CÔNJUGE entra pelo campo próprio (`conjuge_id`), que não tem ambiguidade de
   * direção. O ASCENDENTE fica de fora: o cadastro tem o tipo `Pai/Mãe`, mas a direção
   * dele nunca foi conferida ao vivo como a de `Filho(a)` foi, e inverter uma direção
   * troca quem tem legítima. Quem doar para o próprio pai declara a legítima na coluna.
   */
  const idsDosHerdeiros = useMemo(() => {
    const dentro = new Set(candidatosDonatario.map((c) => c.pessoaId));
    const porId = new Map((pessoas.data ?? []).map((p) => [p.id, p]));
    for (const id of idsDosDoadores === '' ? [] : idsDosDoadores.split('|')) {
      const conjuge = porId.get(id)?.conjuge_id;
      if (conjuge != null && conjuge !== '') dentro.add(conjuge);
    }
    return dentro;
  }, [candidatosDonatario, idsDosDoadores, pessoas.data]);

  /**
   * QUEM ENTRA NA TABELA: exatamente quem o analista adicionou, na ordem em que
   * adicionou. Nada entra sozinho — os casos não têm molde (irmã para irmã, avô para
   * netos), e adivinhar enchia a tabela de gente que não participa do ato.
   */
  const pessoasDoAto = participantes.map((p) => ({
    pessoaId: p.pessoaId,
    // COM O APORTE: quem integralizou dinheiro entrou no capital com quotas novas, e
    // e com elas que ele doa, recebe e vota.
    quotas: quotasComAporte(p.pessoaId),
  }));

  /**
   * Nome curto para os quadros: primeiro nome, em caixa de texto, crescendo só onde
   * colide. Resolvido sobre O CONJUNTO EXIBIDO, porque é ali que a colisão importa.
   */
  //
  // O CÔNJUGE DOADOR entra no conjunto mesmo sem estar na tabela: ele aparece na
  // lista de GIAs derivadas, e sairia em CAIXA ALTA e por extenso ao lado de nomes
  // curtos. É o mesmo conjunto exibido, então é aqui que a colisão importa.
  // Entram os cônjuges de QUALQUER forma, inclusive a individual: o nome dela
  // aparece no bloco de doadores ("uma GIA, sem Iracema") mesmo quando ela fica fora
  // do ato, e sairia em CAIXA ALTA e por extenso ao lado dos nomes curtos.
  const idsDosMeeiros = blocosDoados
    .map((b) => (b.forma.tipo === 'casal-conjunto' || b.forma.tipo === 'casal-separado'
      ? b.forma.conjugeId
      : formaDeclarada[b.titularId]?.conjugeId
        ?? (pessoas.data ?? []).find((x) => x.id === b.titularId)?.conjuge_id
        ?? null))
    .filter((id): id is string => id != null);
  const idsExibidos = [...pessoasDoAto.map((p) => p.pessoaId), ...idsDosMeeiros].join('|');
  const nomeCurtoPorId = useMemo(
    () => nomesCurtos(idsExibidos === '' ? [] : idsExibidos.split('|').map((id) => ({
      id,
      nome: nomePorId.get(id) ?? id,
    }))),
    // As duas dependências bastam: `idsExibidos` é a assinatura textual do conjunto
    // exibido, e `nomePorId` é de onde os nomes saem. O `eslint-disable` que estava
    // aqui deixou de ser necessário quando a lista passou a vir da string.
    [idsExibidos, nomePorId],
  );
  const nomeCurto = (pessoaId: string) =>
    nomeCurtoPorId.get(pessoaId) || nomePorId.get(pessoaId) || pessoaId;

  /**
   * O nome do DOADOR FISCAL na tela. Vem das pessoas que assinam, com nome curto:
   * na forma conjunta o doador é o casal, e o rótulo é "Avelino e Iracema".
   */
  const nomeDoDoadorFiscal = (d: DoadorFiscal): string =>
    d.pessoaIds.map(nomeCurto).join(' e ');

  /**
   * A COLUNA "EMISSÃO GIA", uma célula por doador.
   *
   * São duas opções, porque só existem duas guias possíveis: uma no nome do titular, ou
   * uma no nome do casal. O antigo terceiro caso — "uma para cada cônjuge", da comunhão
   * parcial — é INDIVIDUAL visto de cada lado: se os dois são sócios e os dois estão na
   * tabela, saem duas guias porque há duas linhas.
   *
   * QUEM TEM CÔNJUGE NO CADASTRO ESCOLHE. A trava é só para quem não tem — solteiro,
   * viúvo, divorciado, ou casado sem cônjuge vinculado: aí não existe com quem emitir
   * em conjunto, e travar é descrever a impossibilidade, não uma política.
   *
   * O REGIME decide o PADRÃO, não o que é permitido: universal entra como uma guia para
   * o casal, parcial entra como individual (manual, págs. 9 e 16, confirmado pela
   * sênior da OSG). Mas o cadastro sabe o regime, não sabe como o instrumento foi
   * lavrado — o do Agro Aliança é comunhão parcial e saiu em UMA guia, com os dois
   * qualificados como doadores. Travar a parcial em individual, como estava aqui,
   * tornava esse caso real inalcançável.
   */
  const emissaoDaGia = (pessoaId: string): {
    conjunto: boolean;
    podeConjunto: boolean;
    conjugeNome: string | null;
    motivo: string;
  } => {
    const proposta = propostaPorTitular.get(pessoaId);
    // O cadastro sabe de um cônjuge? As duas formas de casal o carregam — a diferença
    // entre elas é o PADRÃO que o regime sugere, e não se há escolha.
    const formaDoCasal = proposta != null
      && (proposta.estado === 'resolvida' || proposta.estado === 'escolha')
      && (proposta.forma.tipo === 'casal-conjunto'
        || proposta.forma.tipo === 'casal-separado')
      ? proposta.forma
      : null;
    const conjugeNome = formaDoCasal ? nomeCurto(formaDoCasal.conjugeId) : null;
    const doCadastro = (pessoas.data ?? []).find((x) => x.id === pessoaId);
    const civil = doCadastro?.estado_civil ?? null;
    const regime = doCadastro?.regime_bens ?? null;
    const universal = (regime ?? '').toLowerCase().includes('universal');

    return {
      conjunto: formaDe(pessoaId).tipo === 'casal-conjunto',
      podeConjunto: formaDoCasal != null,
      conjugeNome,
      motivo: formaDoCasal == null
        ? `${[civil, regime].filter(Boolean).join(' · ') || 'Sem estado civil no cadastro'}`
          + '. Emite a guia sozinho: não há cônjuge no cadastro para uma guia em'
          + ' conjunto.'
        : universal
          ? `Comunhão universal com ${conjugeNome}: o padrão é uma guia para o casal, e `
            + 'dá para emitir só no nome do titular.'
          : `${regime} com ${conjugeNome}: o padrão é cada um emitir a sua guia, e dá `
            + 'para emitir uma só no nome dos dois — há instrumento lavrado assim.',
    };
  };

  /**
   * O nome que a coluna Pessoa mostra.
   *
   * Na forma conjunta o doador da guia é o CASAL, e o instrumento o trata assim:
   * "os DOADORES são proprietários de 4.448.500 quotas". A linha então lê
   * "Avelino e Iracema", porque é quem assina e quem emite a guia.
   *
   * SÓ quando o cônjuge NÃO tem linha própria. Com os dois no quadro, as duas
   * linhas já mostram as duas pessoas, e repetir "Cristiano e Fabiane" nas duas
   * diria que cada uma doa o bloco inteiro.
   */
  const nomeNaTabela = (pessoaId: string): string => {
    const bloco = blocosDoados.find((b) => b.titularId === pessoaId);
    if (bloco?.forma.tipo !== 'casal-conjunto') return nomeCurto(pessoaId);
    const { conjugeId } = bloco.forma;
    if (pessoasDoAto.some((x) => x.pessoaId === conjugeId)) return nomeCurto(pessoaId);
    return `${nomeCurto(pessoaId)} e ${nomeCurto(conjugeId)}`;
  };

  const donatariosConfirmados = pessoasDoAto.filter((p) => papelDe(p.pessoaId) === 'recebe');

  // ── Passo 5: legítima e disponível, DECLARADAS pelo analista ────────────
  //
  // A CALCULADORA NÃO CALCULA A LEGÍTIMA, por decisão da OSG. Na prática ela depende
  // de quanto a pessoa quer doar e do que o sistema da SEFAZ aponta na hora de emitir
  // a guia — a OSG nunca sabe o número de antemão, então ele não entra na simulação
  // como cálculo. Entra como declaração, ao lado da disponível.
  //
  // E os casos não caem num molde: irmã para irmã, avô para netos, cônjuge para
  // cônjuge. Não há "herdeiro necessário" a inferir do cadastro para liberar ou barrar
  // a coluna — qualquer donatário pode receber de qualquer parte.
  //
  // As travas são só as LÓGICAS, e vivem em `quadroSimulacaoItcmd.ts`: ninguém recebe
  // o que não foi doado, ninguém entra duas vezes.

  const naoNegativo = (v: bigint) => (v > 0n ? v : 0n);

  /** Legítima e disponível: DECLARADAS, sem teto. Ausente = zero. */
  const legitimaDe = (pessoaId: string): bigint =>
    inteiroOuZero(legitimaPorDonatario[pessoaId]);
  const disponivelDe = (pessoaId: string): bigint =>
    inteiroOuZero(disponivelPorDonatario[pessoaId]);

  const donatarios: DonatarioNaTela[] = donatariosConfirmados.map((p) => {
    const legitima = legitimaDe(p.pessoaId);
    const disponivel = disponivelDe(p.pessoaId);
    return {
      pessoaId: p.pessoaId,
      denominacao: nomeCurto(p.pessoaId),
      origem: 'parentesco' as const,
      quotas: legitima + disponivel,
      legitima,
      disponivel,
    };
  });

  /** O TETO DO ATO: o que os doadores da lista têm para dar. */
  const quotasDosDoadores = doadores.reduce((acc, d) => acc + d.quotas, 0n);
  /** O que já está destinado como LEGÍTIMA — a parte que os ajustes não movem. */
  const somaDasLegitimas = donatarios.reduce((acc, d) => acc + d.legitima, 0n);

  /**
   * O PALPITE DE PARTIDA: doar tudo, metade de legítima e metade de disponível, em
   * partes iguais entre os donatários.
   *
   * Meio a meio porque é a divisão da lei — a legítima é metade do patrimônio e a
   * disponível é a outra metade —, e é o que os atos reais mostram: no Agro Aliança a
   * legítima de cada donatária é 1.112.125, que é 4.448.500 ÷ 2 ÷ 2.
   *
   * PALPITE, NÃO REGRA: quem não quer doar tudo baixa a legítima e a disponível, e o
   * resto permanece com quem doa. Roda quando o conjunto de doadores ou de donatários
   * muda — é aí que o teto e o número de fatias mudam.
   *
   * SÓ TEM LEGÍTIMA QUEM É HERDEIRO NECESSÁRIO. Irmã não é (art. 1.845 do Código
   * Civil: descendentes, ascendentes e cônjuge), e num ato entre irmãs a legítima do
   * palpite virava um PISO invisível de metade do que a doadora dá: pedir uma
   * participação final menor que `quotas atuais + legítima` não descia. Sem herdeiro
   * necessário entre os donatários, a legítima entra zero e tudo vai para a disponível,
   * que é a parte livre.
   *
   * O sinal é o mesmo que o resto da tela usa: `idsDosHerdeiros`, que são os FILHOS dos
   * doadores pelos dois caminhos do cadastro (`participantesItcmd.ts`). Cônjuge e
   * ascendente também são herdeiros necessários, e o cadastro não os modela como
   * vínculo de legítima — o palpite não vai adivinhar isso, e quem declarar edita a
   * coluna.
   */
  const idsDosDonatarios = donatarios.map((d) => d.pessoaId).join('|');
  const tetoDoPalpite = quotasDosDoadores.toString();
  const idsComLegitima = donatarios
    .filter((d) => idsDosHerdeiros.has(d.pessoaId))
    .map((d) => d.pessoaId)
    .join('|');
  useEffect(() => {
    if (donatarios.length === 0) return;
    const base = BigInt(tetoDoPalpite);
    const herdeirosNoAto = idsComLegitima === '' ? [] : idsComLegitima.split('|');
    const daLegitima = herdeirosNoAto.length === 0 ? 0n : base / 2n;
    // Base ímpar: a quota do meio vai para a disponível, que é a parte livre.
    const daDisponivel = base - daLegitima;
    const fatiar = (total: bigint, entre: string[]) => {
      const n = BigInt(entre.length);
      return entre.map((id, i) => [
        id,
        // O resto vai nos primeiros, uma quota cada: a soma fecha exata.
        (total / n + (BigInt(i) < total % n ? 1n : 0n)).toString(),
      ] as const);
    };
    // Todos os donatários entram com zero e só os herdeiros recebem fatia: um donatário
    // sem legítima precisa do zero ESCRITO, senão o valor anterior dele sobreviveria à
    // troca de papel.
    setLegitimaPorDonatario(Object.fromEntries([
      ...donatarios.map((d) => [d.pessoaId, '0'] as const),
      ...(herdeirosNoAto.length === 0 ? [] : fatiar(daLegitima, herdeirosNoAto)),
    ]));
    setDisponivelPorDonatario(Object.fromEntries(
      fatiar(daDisponivel, donatarios.map((d) => d.pessoaId)),
    ));
    // O rascunho dos campos sai de cena: o valor deles acabou de mudar por baixo.
    setLegitimaDigitadaDraft({});
    setFinalDigitadaDraft({});
    setPctDigitado({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsDosDonatarios, tetoDoPalpite, idsComLegitima]);

  // O quadro pronto para a tela, com percentuais, participação final e as travas.
  const quadro = montarQuadro({
    participantes: pessoasDoAto.map((p) => ({
      pessoaId: p.pessoaId,
      nome: nomeNaTabela(p.pessoaId),
      papel: papelDe(p.pessoaId),
      quotasAtuais: p.quotas,
      legitima: legitimaDe(p.pessoaId),
      disponivel: disponivelDe(p.pessoaId),
    })),
    totalDeQuotas,
  });
  const quotasDoAto = donatarios.reduce((acc, d) => acc + d.quotas, 0n);
  /**
   * Fecha quando o quadro não acusa NADA e há algo a apurar. Sem exigência de
   * "distribuiu tudo": doar parcial é caso legítimo, e o que sobra aparece como sobra.
   */
  const distribuicaoFecha = quadro.problemas.length === 0 && quotasDoAto > 0n;

  // ── Passo 6: competência e valor da UPF, os dois digitados ────────────────
  const upfValida = /^\d+([.,]\d{1,2})?$/.test(upf.trim()) && Number(upf.replace(',', '.')) > 0;
  const competenciaValida = /^\d{4}-(0[1-9]|1[0-2])$/.test(competencia.trim());
  const upfConhecidaDaCompetencia = upfSugerida(competencia);
  // De onde veio o número que está no campo. A tela DIZ isso em vez de sugerir
  // que consultou a SEFAZ: não há integração, e afirmar "atualizado
  // automaticamente" seria mentira sobre a origem de um dado que muda o imposto.
  const upfVeioDaSerie = upfConhecidaDaCompetencia != null
    && upf.trim().replace(',', '.') === upfConhecidaDaCompetencia;
  /** A UPF conhecida do mês, na forma de exibição — para o campo se repreencher. */
  const upfSugeridaDoMes = upfConhecidaDaCompetencia?.replace('.', ',') ?? null;

  // O que os doadores têm, contra o universo.
  const pctDoado = totalDeQuotas > 0n
    ? Number((quotasDosDoadores * 10_000n) / totalDeQuotas) / 100
    : 0;

  /**
   * QUOTAS FINAL, resolvida de volta na DISPONÍVEL. É assim que o analista pensa
   * quando precisa igualar — "quero que ela termine com isto":
   *
   *   final = quotas atuais + legítima + disponível
   *         →  disponível = alvo − quotas atuais − legítima
   *
   * NA LINHA DO DONATÁRIO grava só ele: subir um não desce os outros, que é o que
   * inviabilizava igualar.
   *
   * NA LINHA DO DOADOR é o contrário, e tem de ser: o que ele fica é consequência do
   * que os donatários levam, então dizer "o Cristiano termina com 1.000.000" só pode
   * significar "ajuste os donatários até isso ser verdade". A conta vai de volta pelo
   * rateio:
   *
   *   transmitido = quotas atuais − alvo
   *   levado      = transmitido × (quotas de todos os doadores ÷ quotas deste doador)
   *
   * e o `levado` novo se reparte entre os donatários NA PROPORÇÃO da disponível que
   * cada um já tinha — assim a distribuição escolhida antes não é apagada, só escalada.
   *
   * A LEGÍTIMA NÃO É TOCADA por este caminho. Ela é declarada, tem efeito de colação e
   * quem a decide é o analista; o ajuste mora na disponível, que é a parte livre. Se o
   * alvo não couber nem zerando as disponíveis, a diferença aparece como trava — e aí
   * baixar a legítima é decisão dele, não efeito colateral de um campo.
   */
  /**
   * O TETO DE CADA UM: o maximo com que essa pessoa pode terminar.
   *
   *   doador     o que ele ja tem — doar nao rende quota, so tira
   *   donatario  o que ele tem MAIS tudo o que os doadores podem dar
   *
   * Existe para APARAR, e nao para recusar. Digitar 9.999.999% era ignorado em
   * silencio; o certo e ir ao maximo possivel, que e o que a pessoa quis dizer. So
   * o absurdo em si e aparado — nunca o valor que apenas desagrada aos outros campos.
   */
  const tetoDaParticipacao = (pessoaId: string): bigint => {
    const linha = quadro.linhas.find((l) => l.pessoaId === pessoaId);
    if (!linha) return 0n;
    return linha.papel === 'doa'
      ? linha.quotasAtuais
      : linha.quotasAtuais + quotasDosDoadores;
  };

  const resolverQuotasFinal = (pessoaId: string, alvoPedido: bigint) => {
    const linha = quadro.linhas.find((l) => l.pessoaId === pessoaId);
    if (!linha) return;

    // O QUE FOI DIGITADO MANDA, aparado so pelo impossivel.
    const teto = tetoDaParticipacao(pessoaId);
    const alvo = alvoPedido < 0n ? 0n : (alvoPedido > teto ? teto : alvoPedido);

    if (linha.papel === 'doa') {
      if (donatarios.length === 0 || linha.quotasAtuais <= 0n) return;
      const transmitido = naoNegativo(linha.quotasAtuais - alvo);
      // Meio para cima, sem passar por `number`.
      const levado = (transmitido * quotasDosDoadores * 2n + linha.quotasAtuais)
        / (linha.quotasAtuais * 2n);

      // A LEGITIMA CEDE quando ela sozinha ja passa do alvo.
      //
      // Ela nao era tocada por este caminho, de proposito: e declarada, tem efeito de
      // colacao e quem a decide e o analista. So que isso fazia o campo do doador NAO
      // IR — ele digitava 26% e o numero voltava, porque a legitima de baixo nao
      // batia. Se o usuario mexeu no campo dele, o que esta errado e o outro.
      //
      // A disponivel cede primeiro, que e a parte livre; a legitima so quando zerar a
      // disponivel ainda nao basta.
      if (levado < somaDasLegitimas) {
        const pesosDaLegitima = donatarios.map((d) => naoNegativo(d.legitima));
        const cedidas = repartirProporcional(levado, pesosDaLegitima);
        setLegitimaPorDonatario(Object.fromEntries(
          donatarios.map((d, i) => [d.pessoaId, cedidas[i].toString()]),
        ));
        setDisponivelPorDonatario(Object.fromEntries(
          donatarios.map((d) => [d.pessoaId, '0']),
        ));
        setLegitimaDigitadaDraft({});
        const soDele = (o: Record<string, string>) => {
          const novo: Record<string, string> = {};
          if (o[pessoaId] != null) novo[pessoaId] = o[pessoaId];
          return novo;
        };
        setPctDigitado(soDele);
        setFinalDigitadaDraft(soDele);
        return;
      }

      const paraDistribuir = levado - somaDasLegitimas;
      const pesos = donatarios.map((d) => naoNegativo(d.disponivel));
      const fatias = repartirProporcional(
        paraDistribuir,
        // Todos em zero: divide igual, porque não há proporção a preservar.
        pesos.reduce((a, p) => a + p, 0n) > 0n ? pesos : donatarios.map(() => 1n),
      );
      setDisponivelPorDonatario(Object.fromEntries(
        donatarios.map((d, i) => [d.pessoaId, fatias[i].toString()]),
      ));
      // O rascunho dos OUTROS sai de cena: o valor deles mudou por consequência, e
      // deixar o texto antigo no campo mostraria um número que já não vale. O de quem
      // está digitando fica — é ele que permite escrever "50" sem o campo se reescrever
      // no "5".
      const soODeQuemDigita = (o: Record<string, string>) => {
        const novo: Record<string, string> = {};
        if (o[pessoaId] != null) novo[pessoaId] = o[pessoaId];
        return novo;
      };
      setPctDigitado(soODeQuemDigita);
      setFinalDigitadaDraft(soODeQuemDigita);
      return;
    }

    // A LEGITIMA CEDE AQUI TAMBEM, pelo mesmo motivo do lado do doador: ela era um
    // PISO INVISIVEL. Quem recebe nao perde quota, entao a participacao final dela nao
    // desce abaixo de `quotas atuais`; mas a legitima do palpite tambem nao cedia, e o
    // piso virava `atuais + legitima`. Digitar 26,7288% numa donataria com 1.483.000
    // quotas e legitima de 1.813.222 devolvia 34,4867% - o campo mostrava um numero que
    // ninguem pediu, sem dizer por que.
    //
    // A disponivel cede primeiro, que e a parte livre. A legitima cede depois, e sem
    // culpa: ela e um PALPITE ate alguem declarar outro, e se o usuario mexeu no campo
    // dele, o que esta errado e o outro.
    const espacoLivre = naoNegativo(alvo - linha.quotasAtuais);
    if (espacoLivre < legitimaDe(pessoaId)) {
      setLegitimaPorDonatario((o) => ({ ...o, [pessoaId]: espacoLivre.toString() }));
      setDisponivelPorDonatario((o) => ({ ...o, [pessoaId]: '0' }));
      // O rascunho do campo de legitima sai: ele mostraria o texto antigo sobre um
      // numero novo.
      setLegitimaDigitadaDraft((o) => {
        const novo = { ...o };
        delete novo[pessoaId];
        return novo;
      });
      return;
    }

    setDisponivelPorDonatario((o) => ({
      ...o, [pessoaId]: (espacoLivre - legitimaDe(pessoaId)).toString(),
    }));
  };

  // ── Passo 7: o quadro de saída ───────────────────────────────────────────
  // `donatarios` é derivado a cada render (bigint dentro), então a dependência do
  // memo é a assinatura textual do que muda o resultado: quem recebe, quanto, e
  // quanto já recebeu antes.
  /**
   * OS PARES DO ATO — uma linha de beneficiário cada. Fica fora do memo da simulação porque a tela
   * precisa deles para pedir a doação anterior de cada par.
   *
   * O bloco que cada doador TRANSMITE é a fatia proporcional do que o ato
   * movimenta, e não o patrimônio dele: com herdeiro fora do ato, a legítima de
   * quem não recebe permanece com o doador.
   */
  const { paresDoAto, erroDoRateio } = ((): {
    paresDoAto: ParDoAto[]; erroDoRateio: string | null;
  } => {
    if (doadoresFiscais.length === 0 || donatarios.length === 0 || quotasDoAto <= 0n) {
      return { paresDoAto: [], erroDoRateio: null };
    }
    try {
      const blocos = repartirProporcional(
        quotasDoAto,
        doadoresFiscais.map((d) => d.quotasDoadas),
      );
      const nomeDoDoador = new Map(
        doadoresFiscais.map((d) => [d.doadorId, nomeDoDoadorFiscal(d)]),
      );
      const celulas = ratearAto(
        doadoresFiscais.map((d, i) => ({ id: d.doadorId, quotas: blocos[i] })),
        donatarios.map((d) => ({ id: d.pessoaId, quotas: d.quotas })),
      );
      return {
        paresDoAto: celulas.map((c) => ({
          doadorId: c.doadorId,
          doadorNome: nomeDoDoador.get(c.doadorId) ?? c.doadorId,
          donatarioId: c.donatarioId,
          donatarioNome: nomeCurto(c.donatarioId),
          quotas: c.quotas,
        })),
        erroDoRateio: null,
      };
    } catch (e) {
      // Sem fallback silencioso: o rateio impossível sobe como mensagem.
      return { paresDoAto: [], erroDoRateio: e instanceof Error ? e.message : String(e) };
    }
  })();

  const assinaturaDosDonatarios = donatarios
    .map((d) => `${d.pessoaId}:${d.quotas}`)
    .join('|');
  /** Muda a faixa de uma guia, então é entrada do memo. */
  const assinaturaDosPares = paresDoAto
    .map((x) => `${x.doadorId}>${x.donatarioId}:${x.quotas}`)
    .join('|');
  // Mesma razão para os doadores fiscais: mudar a meação muda quantas GIAs saem e
  // com que base cada uma, então é entrada do memo.
  const assinaturaDosDoadoresFiscais = doadoresFiscais
    .map((d) => `${d.doadorId}:${d.quotasDoadas}`)
    .join('|');

  // ── Passo 5b: O QUADRO DO USUFRUTO ───────────────────────────────────────
  //
  // Le o quadro da doacao e responde a pergunta que a doacao nao responde: quem fica
  // com o VOTO. A regua e outra - para quem recebeu com reserva conta so a plena, e
  // para o fundador conta o usufruto.
  const institucaoDe = (pessoaId: string): bigint =>
    inteiroOuZero(institucoes[pessoaId]);

  /**
   * O PAPEL NO USUFRUTO, com palpite vindo da doacao: QUEM DOOU USUFRUI, quem recebeu
   * concede. E a mecanica da reserva - o fundador transmite a nua propriedade e guarda
   * uso, gozo e voto - e acerta nos tres clientes mapeados.
   *
   * O palpite e so palpite: o papel e lista suspensa na linha, como na doacao.
   */
  const papelNoUsufruto = (pessoaId: string): PapelDoUsufruto =>
    papeisDoUsufruto[pessoaId]
    ?? (papelDe(pessoaId) === 'doa' ? 'usufrui' : 'concede');

  /**
   * QUEM ESTA NO QUADRO DO USUFRUTO: quem a doacao trouxe, menos quem foi tirado, mais
   * quem entrou a mais. Os extras trazem as quotas do quadro societario - eles nao
   * doaram nem receberam, entao a participacao deles nao mudou.
   */
  const participantesDoUsufruto = [
    ...quadro.linhas
      .filter((l) => !foraDoUsufruto.includes(l.pessoaId))
      .map((l) => ({
        pessoaId: l.pessoaId,
        nome: l.nome,
        // O numero NAO muda: o usufruto reparte o voto destas quotas, nao as quotas.
        quotas: l.participacaoFinal,
      })),
    ...extrasDoUsufruto.map((id) => ({
      pessoaId: id,
      nome: nomeCurto(id),
      quotas: quotasPorPessoa.get(id) ?? 0n,
    })),
  ];

  /**
   * QUEM RECEBE O USUFRUTO sao os marcados como usufrutuarios - e nao um campo
   * separado de destino. Havia um: uma lista suspensa "Usufruto para" que repetia os
   * nomes que o quadro ja tem, com uma opcao a mais para o casal junto. Duas pessoas
   * marcadas usufrutuarias dizem a mesma coisa, e dizem no lugar onde a pessoa esta.
   *
   * QUANTOS SAO VALE IMPOSTO: com um beneficiario a base inteira cai numa apuracao e
   * paga uma isencao de 500 UPF; com dois, cada um ganha a sua. Na instituicao do Agro
   * Alianca, declarar o casal em vez de so o Avelino daria R$ 20.366,92 em vez dos
   * R$ 28.169,92 que a guia recolheu.
   */
  const usufrutuarios = participantesDoUsufruto
    .filter((x) => papelNoUsufruto(x.pessoaId) === 'usufrui')
    .map((x) => x.pessoaId);

  /**
   * AS CONCESSOES - o dado central do usufruto: de quem, quantas quotas, para quem.
   *
   * A RESERVA e automatica e sai da propria doacao: cada par doador -> donatario gera
   * uma concessao de volta, porque o doador transmite a nua propriedade e guarda o
   * voto. O numero nao se digita duas vezes.
   *
   * A INSTITUICAO e declarada: quem tem propriedade plena concede parte dela.
   */
  const concessoes: ConcessaoDeUsufruto[] = [
    ...(comReserva
      ? paresDoAto.map((x) => ({
        deId: x.donatarioId,
        paraIds: doadoresFiscais
          .find((d) => d.doadorId === x.doadorId)?.pessoaIds ?? [x.doadorId],
        quotas: x.quotas,
        origem: 'reserva' as const,
      }))
      : []),
    ...participantesDoUsufruto
      .map((x) => ({
        deId: x.pessoaId,
        // Ninguem concede usufruto para si mesmo: quem esta marcado usufrutuario e
        // tambem concede esta transferindo voto para os OUTROS usufrutuarios.
        paraIds: usufrutuarios.filter((id) => id !== x.pessoaId),
        quotas: institucaoDe(x.pessoaId),
        origem: 'instituicao' as const,
      }))
      .filter((c) => c.quotas > 0n),
  ];

  const usufruto = montarUsufruto({
    capital: totalDeQuotas,
    concessoes,
    participantes: participantesDoUsufruto,
  });

  /** O que a reserva da doacao ja colocou sob usufruto. */
  const jaSobUsufruto = usufruto.linhas.reduce((a, l) => a + l.nuaDeReserva, 0n);
  /**
   * DIGITAR O ALVO DE VOZ E VOTO de alguem, e a calculadora resolve de quem sai.
   *
   *   alvo em quotas   = % x capital
   *   precisa usufruir = alvo - propriedade plena dela
   *   delta            = precisa usufruir - o que ela ja usufrui
   *
   * Delta positivo se REPARTE entre quem tem propriedade plena, em partes iguais, com
   * todos concedendo a ela - e cada um emite a sua guia, com a propria isencao de 500
   * UPF. Delta negativo desfaz instituição, nunca reserva: a reserva e da doacao, e
   * mexer nela aqui seria mudar o outro ato pelas costas.
   */
  const resolverAlvoDeVozEVoto = (pessoaId: string, pctEscalado: bigint) => {
    const linha = usufruto.linhas.find((l) => l.pessoaId === pessoaId);
    if (!linha || totalDeQuotas <= 0n) return;

    const alvoEmQuotas = (pctEscalado * totalDeQuotas + 500_000n) / 1_000_000n;
    const precisaUsufruir = naoNegativo(alvoEmQuotas - linha.plena);
    const delta = precisaUsufruir - linha.usufruto;
    if (delta === 0n) return;

    if (delta > 0n) {
      const candidatos = usufruto.linhas.filter(
        (l) => l.pessoaId !== pessoaId && l.plena > 0n,
      );
      if (candidatos.length === 0) return;
      const fatias = repartirInstituicao(delta, candidatos.length);
      setInstitucoes((o) => ({
        ...o,
        ...Object.fromEntries(candidatos.map((c, i) => [
          c.pessoaId, (institucaoDe(c.pessoaId) + fatias[i]).toString(),
        ])),
      }));
      return;
    }

    // Devolver: tira das instituicoes que apontam para ela, das maiores primeiro.
    let devolver = -delta;
    const doadoras = usufruto.linhas
      .filter((l) => l.nuaDeInstituicao > 0n && l.concedePara.includes(linha.nome))
      .sort((a, b) => (b.nuaDeInstituicao > a.nuaDeInstituicao ? 1 : -1));
    const novo: Record<string, string> = {};
    for (const d of doadoras) {
      if (devolver <= 0n) break;
      const tira = d.nuaDeInstituicao < devolver ? d.nuaDeInstituicao : devolver;
      novo[d.pessoaId] = (d.nuaDeInstituicao - tira).toString();
      devolver -= tira;
    }
    if (Object.keys(novo).length > 0) setInstitucoes((o) => ({ ...o, ...novo }));
  };

  /** Quem pode conceder: tem propriedade plena sobrando. */
  const candidatosAInstituinte = usufruto.linhas
    .filter((l) => l.plena + l.nuaDeInstituicao > 0n)
    .map((l) => ({
      pessoaId: l.pessoaId,
      nome: l.nome,
      plenaDisponivel: l.plena + l.nuaDeInstituicao,
    }));
  const totalInstituido = usufruto.linhas.reduce((a, l) => a + l.nuaDeInstituicao, 0n);

  const { saida, erro } = useMemo<{ saida: SaidaSimulacao | null; erro: string | null }>(() => {
    if (!distribuicaoFecha || paresDoAto.length === 0 || totalDeQuotas <= 0n
        || !upfValida || !competenciaValida || !formaResolvida) {
      return { saida: null, erro: null };
    }
    try {
      return {
        saida: simular({
          competencia: competencia.trim(),
          upf: upf.trim().replace(',', '.'),
          totalDeQuotas: totalDeQuotas.toString(),
          totaisDoAcervo: acervoComAporte,
          doadores: doadoresFiscais.map((d) => ({
            id: d.doadorId,
            nome: nomeDoDoadorFiscal(d),
          })),
          donatarios: donatarios.map((d) => ({
            id: d.pessoaId,
            nome: d.denominacao,
          })),
          doacoes: paresDoAto.map((x) => ({
            doadorId: x.doadorId,
            donatarioId: x.donatarioId,
            quotasRecebidas: x.quotas.toString(),
            // A OSG não acompanha doação anterior: o sistema da SEFAZ acumula sozinho
            // ao emitir a guia, e declarar aqui era um dado que ninguém tinha. O motor
            // mantém a capacidade (Lei 10.488/2016) sem produtor na tela.
            doacaoAnterior: null,
          })),
          // Com reserva de usufruto, a base pode ser reduzida a 70% - e a escolha
          // muda o imposto em 30%. Sem reserva o campo nao existe.
          pctDaBase: comReserva ? pctBaseDaDoacao : undefined,
        }),
        erro: null,
      };
    } catch (e) {
      // Sem fallback silencioso: a mensagem sobe para a tela em vez de virar
      // um quadro de zeros.
      return { saida: null, erro: e instanceof Error ? e.message : String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    competencia, upf, upfValida, competenciaValida, distribuicaoFecha, totalDeQuotas,
    acervoComAporte.contabil, acervoComAporte.itr, acervoComAporte.mercado,
    assinaturaDosDonatarios, assinaturaDosDoadoresFiscais, assinaturaDosPares,
    formaResolvida, comReserva, pctBaseDaDoacao,
  ]);

  // ── Passo 7b: A APURACAO DA INSTITUICAO DE USUFRUTO ──────────────────────
  //
  // Ato PROPRIO, guia propria, imposto proprio - e a direcao inverte: quem "doa" e
  // quem tem a propriedade plena (a filha) e quem recebe e o fundador. Na guia 338021
  // do Agro Alianca o doador declarante e a Regina e o beneficiario e o Avelino.
  //
  // Uma apuracao por INSTITUINTE, como na doacao e uma por doador: a isencao de 500
  // UPF e as faixas de baixo contam por beneficiario de cada guia. E por isso que
  // dividir a instituicao entre dois instituintes derrubou 63% do imposto no Cenario
  // II do Agro Alianca - R$ 9.411,28 para R$ 3.433,84.
  const assinaturaDoUsufruto = concessoes
    .filter((c) => c.origem === 'instituicao')
    .map((c) => `${c.deId}>${c.paraIds.join('+')}:${c.quotas}`)
    .join('|');

  const { saidaDaInstituicao, erroDaInstituicao } = useMemo<{
    saidaDaInstituicao: SaidaSimulacao | null; erroDaInstituicao: string | null;
  }>(() => {
    const daInstituicao = concessoes.filter((c) => c.origem === 'instituicao');
    const recebemIds = [...new Set(daInstituicao.flatMap((c) => c.paraIds))];
    if (daInstituicao.length === 0 || recebemIds.length === 0 || totalDeQuotas <= 0n
        || !upfValida || !competenciaValida) {
      return { saidaDaInstituicao: null, erroDaInstituicao: null };
    }
    const nome = (id: string) => usufruto.linhas.find((l) => l.pessoaId === id)?.nome
      ?? nomeCurto(id);
    try {
      return {
        saidaDaInstituicao: simular({
          competencia: competencia.trim(),
          upf: upf.trim().replace(',', '.'),
          totalDeQuotas: totalDeQuotas.toString(),
          totaisDoAcervo: acervoComAporte,
          doadores: daInstituicao.map((c) => ({ id: c.deId, nome: nome(c.deId) })),
          donatarios: recebemIds.map((id) => ({ id, nome: nome(id) })),
          // Cada instituinte reparte o que institui entre os usufrutuarios. Com o
          // casal, declarar os dois divide a base e cada um ganha a sua isencao: no
          // Agro Alianca isso seria R$ 20.366,92 em vez dos R$ 28.169,92 que a guia
          // recolheu com um beneficiario so.
          doacoes: daInstituicao.flatMap((c) => {
            const fatias = repartirInstituicao(c.quotas, c.paraIds.length);
            return c.paraIds
              .map((id, i) => ({
                doadorId: c.deId,
                donatarioId: id,
                quotasRecebidas: fatias[i].toString(),
                doacaoAnterior: null,
              }))
              .filter((x) => x.quotasRecebidas !== '0');
          }),
          pctDaBase: pctBaseDaInstituicao,
        }),
        erroDaInstituicao: null,
      };
    } catch (e) {
      return {
        saidaDaInstituicao: null,
        erroDaInstituicao: e instanceof Error ? e.message : String(e),
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    competencia, upf, upfValida, competenciaValida, totalDeQuotas,
    acervoComAporte.contabil, acervoComAporte.itr, acervoComAporte.mercado,
    assinaturaDoUsufruto, pctBaseDaInstituicao,
  ]);

  /**
   * O IMPOSTO DO ATO INTEIRO, por cenario de valor: doacao + instituicao.
   *
   * E o numero que decide, e e assim que o cliente compara - o deck do Agro Alianca
   * escolheu o Cenario I "por apresentar o menor custo tributario TOTAL". Mostrar so
   * a doacao seria mostrar metade da conta.
   *
   * `null` em qualquer das duas parcelas mantem o cenario indisponivel: somar com um
   * lado ausente afirmaria um total que ninguem apurou.
   */
  const impostoTotalPorCenario = ((): Record<Cenario, string | null> => {
    const somar = (cenario: Cenario): string | null => {
      const daDoacao = saida?.totaisPorCenario[cenario] ?? null;
      const daInstituicao = saidaDaInstituicao?.totaisPorCenario[cenario] ?? null;
      if (daDoacao == null) return null;
      if (daInstituicao == null) return daDoacao;
      return formatMoney(quantizar2(parseMoney(daDoacao))
        + quantizar2(parseMoney(daInstituicao)));
    };
    return { contabil: somar('contabil'), itr: somar('itr'), mercado: somar('mercado') };
  })();

  /**
   * ZERAR O ATO. Chamado ao GERAR: dali em diante o ato está fechado, e o modal tem de
   * abrir em branco para a próxima simulação.
   *
   * Recuperar o que estava digitado faz sentido ANTES de gerar (fechar o modal sem
   * querer e voltar com tudo no lugar), e deixa de fazer depois: o quadro que reabria
   * era o de um ato que já virou linha no histórico, e o analista corrigia a mão para
   * começar a Versão 2.
   *
   * O CASO NÃO SE ZERA: sociedade, estado, competência e UPF são parâmetros do cliente
   * e do mês, e retecá-los a cada simulação seria trabalho à toa. O que se zera é o ATO:
   * quem entra, em que papel, com quanto, e as duas modalidades de usufruto.
   */
  const zerarOAto = () => {
    setParticipantes([]);
    setLegitimaPorDonatario({});
    setDisponivelPorDonatario({});
    setFormaDeclarada({});
    setAportes({});
    setComReserva(false);
    setPctBaseDaDoacao('100');
    setPctBaseDaInstituicao('70');
    setInstitucoes({});
    setPapeisDoUsufruto({});
    setForaDoUsufruto([]);
    setExtrasDoUsufruto([]);
    setOrigemId('');
    // Os rascunhos dos campos, que são texto em edição e não valor.
    setPctDigitado({});
    setLegitimaDigitadaDraft({});
    setFinalDigitadaDraft({});
    setAlvoDigitado({});
  };

  return {
    clienteId,
    carregando: bens.isLoading || pessoas.isLoading,
    erroDeConsulta: bens.error ?? pessoas.error ?? parentescos.error ?? socios.error ?? null,

    imoveis,
    acervo,
    bensForaDoAcervo,

    empresas,
    empresa,
    empresasOcultas,
    setEmpresaEscolhida,
    socios: socios.data,
    totalDeQuotas,

    linhasDoQuadro: quadro.linhas,
    totaisDoQuadro: quadro.totais,
    // ENQUANTO A MEAÇÃO NÃO FECHA, o quadro cala. Sem doador fiscal não há legítima,
    // então a disponível é zero e os donatários levam zero — e o "os doadores dão X e
    // os donatários levam 0" é CONSEQUÊNCIA disso, não um segundo problema. Quatro
    // avisos para um campo em branco é o que tornava a tela ilegível.
    problemasDoQuadro: quadro.problemas,
    definirPapel: (pessoaId: string, papel: Papel) =>
      setParticipantes((o) => o.map((p) => (p.pessoaId === pessoaId ? { ...p, papel } : p))),
    removerParticipante: (pessoaId: string) =>
      setParticipantes((o) => o.filter((p) => p.pessoaId !== pessoaId)),
    /**
     * QUEM PODE ENTRAR: qualquer pessoa física do cliente que ainda não está na
     * tabela, com as quotas dela quando houver.
     *
     * UM CAMPO SÓ, e não um para doador e outro para donatário. Quem tem quota entra
     * como doador e quem não tem como donatário, que acerta na quase totalidade dos
     * casos — e o papel é uma lista suspensa na linha, então errar o palpite custa um
     * clique. Dois campos obrigavam a decidir o papel antes de ver a pessoa.
     */
    candidatosAParticipante: (pessoas.data ?? [])
      .filter((x) => x.tipo_pessoa === 'PF'
        && !participantes.some((p) => p.pessoaId === x.id))
      .map((x) => ({
        pessoaId: x.id,
        denominacao: x.denominacao,
        quotas: todosOsSociosPf.find((c) => c.pessoaId === x.id)?.quotas ?? 0n,
      })),
    adicionarParticipante: (pessoaId: string) =>
      setParticipantes((o) => (o.some((p) => p.pessoaId === pessoaId)
        ? o
        : [...o, {
          pessoaId,
          // Tem quota, pode doar: entra como doador. Sem quota, só há um papel
          // possível hoje — receber.
          papel: (todosOsSociosPf.find((c) => c.pessoaId === pessoaId)?.quotas ?? 0n) > 0n
            ? 'doa' as Papel
            : 'recebe' as Papel,
        }])),
    adicionarDoador: (pessoaId: string) =>
      setParticipantes((o) => (o.some((p) => p.pessoaId === pessoaId)
        ? o
        : [...o, { pessoaId, papel: 'doa' as Papel }])),
    adicionarDonatario: (pessoaId: string) =>
      setParticipantes((o) => (o.some((p) => p.pessoaId === pessoaId)
        ? o
        : [...o, { pessoaId, papel: 'recebe' as Papel }])),
    doadores,
    quotasDosDoadores,
    pctDoado,

    // ── Emissão da GIA: uma por doador, ou uma para o casal ────────────────
    emissaoDaGia,
    doadoresFiscais,
    erroDaForma,
    formaResolvida,
    /** Quantas guias o ato gera. Uma por doador, com os beneficiários dentro. */
    numeroDeGias: doadoresFiscais.length,
    giasSeEmitir,
    /**
     * VALE PARA OS DOIS CÔNJUGES, e tem de valer: "uma guia para o casal" é uma
     * afirmação sobre o casal, não sobre uma linha. Com os dois sócios na tabela e a
     * escolha valendo só para quem foi clicado, saíam DUAS guias — a do casal e a do
     * outro cônjuge sozinho —, que é o oposto do que se pediu.
     *
     * As duas linhas caem no mesmo doador fiscal porque o id do casal é ordenado
     * (`idDoCasal`), então as quotas dos dois somam numa guia só.
     */
    definirEmissao: (titularId: string, conjunto: boolean) =>
      setFormaDeclarada((o) => {
        const conjugeId = o[titularId]?.conjugeId
          ?? (pessoas.data ?? []).find((x) => x.id === titularId)?.conjuge_id
          ?? null;
        const tipo: TipoDeForma = conjunto ? 'casal-conjunto' : 'individual';
        const novo = { ...o, [titularId]: { tipo, conjugeId } };
        if (conjugeId) novo[conjugeId] = { tipo, conjugeId: titularId };
        return novo;
      }),
    candidatosDonatario,
    nomeDaPessoa: (pessoaId: string) => nomePorId.get(pessoaId) ?? pessoaId,
    donatarios,

    quotasDoAto,
    distribuicaoFecha,

    // ── QUANTO CADA DONATÁRIO RECEBE ───────────────────────────────────────
    disponivelDigitada: (pessoaId: string) => agrupar(disponivelPorDonatario[pessoaId] ?? ''),
    /**
     * Campo LIVRE: grava só esta pessoa, sem mexer nas outras — como todos os campos
     * do quadro. Mexer num campo mexendo nos outros tirava a liberdade de destinar
     * menos do que se pode dar, que é justamente como se doa parcial.
     */
    setDisponivel: (pessoaId: string, valor: string) =>
      setDisponivelPorDonatario((o) => ({
        ...o, [pessoaId]: valor.replace(/\D/g, ''),
      })),

    // ── CLASSIFICAÇÃO: quanto do recebido é LEGÍTIMA ───────────────────────
    /**
     * O que o campo mostra: o rascunho em edição, ou o valor EM VIGOR. Sem teto e sem
     * padrão — a legítima é declarada, e quem declara é o analista.
     */
    legitimaDigitada: (pessoaId: string) => agrupar(
      legitimaDigitadaDraft[pessoaId]
      ?? (donatarios.find((d) => d.pessoaId === pessoaId)?.legitima ?? 0n).toString(),
    ),
    /** Ao sair do campo, o rascunho sai de cena e o efetivo volta. */
    confirmarLegitima: (pessoaId: string) =>
      setLegitimaDigitadaDraft((o) => {
        const novo = { ...o };
        delete novo[pessoaId];
        return novo;
      }),
    paresDoAto,
    erroDoRateio,

    /** Campo LIVRE: a OSG declara, e nada aqui apara. */
    setLegitima: (pessoaId: string, valor: string) => {
      const digitos = valor.replace(/\D/g, '');
      // Guarda o texto ANTES de qualquer coisa: é ele que fica no campo.
      setLegitimaDigitadaDraft((o) => ({ ...o, [pessoaId]: digitos }));
      setLegitimaPorDonatario((o) => ({ ...o, [pessoaId]: digitos }));
    },
    /**
     * QUOTAS FINAL: um dos dois campos por onde se IGUALA. O que mostra é o rascunho em
     * edição, ou o valor em vigor — que é derivado, e sem o rascunho não dava para
     * digitar.
     */
    quotasFinalDigitada: (pessoaId: string, canonico: bigint) =>
      agrupar(finalDigitadaDraft[pessoaId] ?? canonico.toString()),
    /** Ao sair do campo, o rascunho sai de cena e o valor em vigor volta. */
    confirmarQuotasFinal: (pessoaId: string) =>
      setFinalDigitadaDraft((o) => {
        const novo = { ...o };
        delete novo[pessoaId];
        return novo;
      }),
    /**
     * QUOTAS FINAL. Mesma regra da %: o que se digita entra, e o teto da pessoa apara
     * la dentro. Pedir mais quotas do que existem vai ao maximo possivel, em vez de o
     * campo nao reagir.
     */
    setQuotasFinal: (pessoaId: string, valor: string) => {
      // A CONTA, quando tem barra: `/2` divide o que o ato movimenta; `5109444/2`
      // divide o numero escrito. A divisao e de quota inteira, entao a igualdade e
      // exata - e por isso ela mora aqui e nao no percentual.
      const conta = divisaoNoCampo(valor);
      if (conta != null) {
        const texto = `${conta.esquerda.replace(/\D/g, '')}/${conta.partes}`;
        setFinalDigitadaDraft((o) => ({ ...o, [pessoaId]: texto }));
        const dividendo = conta.esquerda.replace(/\D/g, '') === ''
          ? quadro.totais.quotasAtuais
          : BigInt(conta.esquerda.replace(/\D/g, ''));
        resolverQuotasFinal(pessoaId, fatiaIgual(dividendo, conta.partes));
        return;
      }
      const digitos = valor.replace(/\D/g, '');
      setFinalDigitadaDraft((o) => ({ ...o, [pessoaId]: digitos }));
      resolverQuotasFinal(pessoaId, digitos === '' ? 0n : BigInt(digitos));
    },

    /**
     * PART. FINAL EM PORCENTAGEM: a outra porta da mesma conta, para quem pensa em
     * "quero que ela fique com 20%". A % é sobre o capital da sociedade — é a mesma
     * régua do contrato social e da Part. atual ao lado.
     *
     * A conta é em `bigint` na escala de 4 casas do percentual: passar por `number`
     * reintroduziria o float que a especificação proíbe para quota.
     */
    /**
     * O que o campo de % mostra: o texto em edição, ou o canônico com VÍRGULA.
     *
     * As quatro casas do canônico ficam: é a precisão que a guia usa (25,91% / 74,09%
     * saem com quatro), e arredondar para duas na exibição faria o campo mostrar um
     * número diferente do que apura.
     */
    percentualDigitado: (pessoaId: string, canonico: string) =>
      pctDigitado[pessoaId] ?? canonico.replace('.', ','),
    /**
     * O campo do DOADOR só resolve se houver quem receba: o que ele fica é a sobra do
     * que os donatários levam. Sem nenhum donatário não há o que ajustar, e a tela
     * DESABILITA o campo dizendo isso — antes ele aceitava a digitação e voltava ao
     * valor antigo no blur, sem explicar nada.
     */
    finalEditavel: (pessoaId: string) =>
      papelDe(pessoaId) === 'recebe' || donatarios.length > 0,
    motivoDoFinalTravado: 'O que este doador fica é o que os donatários não levaram. '
      + 'Adicione um donatário para poder ajustar por aqui.',
    confirmarPercentual: (pessoaId: string) =>
      setPctDigitado((o) => {
        const novo = { ...o };
        delete novo[pessoaId];
        return novo;
      }),
    /**
     * O QUE SE DIGITA ENTRA. Sempre.
     *
     * Aqui havia um `return` antes de guardar o rascunho, e ele engolia a digitacao em
     * silencio: o valor exibido JA TEM quatro casas (`26,4329`), entao qualquer tecla a
     * mais dava cinco, o regex recusava, e o campo voltava ao canonico. Parecia campo
     * travado, e a pessoa nao tinha como saber por que.
     *
     * Agora o texto e guardado primeiro e as casas que sobram sao TRUNCADAS para
     * resolver — a precisao da apuracao e de quatro, e digitar a quinta e engano, nao
     * ordem. Letra e sinal continuam fora: nao ha o que interpretar deles.
     */
    setPercentualFinal: (pessoaId: string, valor: string) => {
      // MASCARA, e nao validacao: a virgula entra sozinha no lugar onde cabe, entao
      // `5555` vira 55,55. Antes o texto ia cru para a interpretacao, `5555` era lido
      // como 5.555% e o teto abaixo mostrava 100% — o numero que se queria nao era
      // alcancavel digitando quatro digitos.
      const digitado = mascararPercentual(valor);
      setPctDigitado((o) => ({ ...o, [pessoaId]: digitado }));

      // A CONTA tambem entra aqui, e resolve EM QUOTAS: `/2` e a fatia igual do que o
      // ato movimenta, e `53,4576/2` e a metade daquele percentual. Digitar o
      // percentual arredondado na mao deixava as duas linhas com quotas diferentes
      // (2.554.724 contra 2.554.720 no caso das irmas), porque uma casa de percentual
      // vale ~956 quotas. Dividir quota inteira fecha exato.
      const conta = divisaoNoCampo(digitado);
      if (conta != null) {
        const daEsquerda = percentualEscalado(conta.esquerda);
        const dividendo = daEsquerda == null
          ? quadro.totais.quotasAtuais
          : (daEsquerda * totalDeQuotas + 500_000n) / 1_000_000n;
        resolverQuotasFinal(pessoaId, fatiaIgual(dividendo, conta.partes));
        return;
      }

      const escalado = percentualEscalado(digitado);
      if (escalado == null || totalDeQuotas <= 0n) return;
      // Com a mascara isto quase nao dispara: so passa de 100 quem continua digitando
      // depois de `100`. Fica porque o teto e regra da apuracao, nao do campo.
      const pct = escalado > 1_000_000n ? 1_000_000n : escalado;
      // Meio para cima: (a + d/2) / d, com d = 100 × 10.000.
      resolverQuotasFinal(pessoaId, (pct * totalDeQuotas + 500_000n) / 1_000_000n);
    },

    // ── USUFRUTO ───────────────────────────────────────────────────────────
    /**
     * A doacao transmite a nua propriedade e o doador guarda uso, gozo e VOTO?
     *
     * Nao e guia nova: e a natureza da guia da doacao (`DOACAO COM RESERVA DE
     * USUFRUTO`), e o que ela muda e a base. Os tres clientes mapeados usaram reserva.
     */
    comReserva,
    setComReserva,
    /** `100` encerra a tributacao; `70` deixa parcela devida na extincao. */
    pctBaseDaDoacao,
    setPctBaseDaDoacao,
    pctBaseDaInstituicao,
    setPctBaseDaInstituicao,
    /**
     * PARA QUEM o usufruto pode ir, e o destino escolhido de cada concedente.
     *
     * Nao ha papel a escolher: quem concede e quem tem numero na coluna de conceder, e
     * quem recebe e quem esta no destino. "Instituinte" e "nu-proprietario" eram jargao
     * para um dado que a propria concessao responde.
     */
    /**
     * O APORTE EM MOEDA, por pessoa. Campo livre em reais; o valor vira quotas ao preco
     * da quota do proprio acervo, e ele NAO e fato gerador de ITCD — ninguem transmite
     * nada, a pessoa entrega dinheiro e recebe quotas.
     */
    aporteDigitado: (pessoaId: string) => aportes[pessoaId] ?? '',
    setAporte: (pessoaId: string, valor: string) => {
      // Aceita apenas digito, ponto de milhar e uma virgula: o campo e de reais.
      if (!/^[\d.]*,?\d{0,2}$/.test(valor.trim())) return;
      setAportes((o) => ({ ...o, [pessoaId]: valor.trim() }));
    },
    confirmarAporte: (pessoaId: string) =>
      setAportes((o) => ({ ...o, [pessoaId]: aporteEmTexto(aporteDe(pessoaId)) })),
    /** Quantas quotas o aporte desta pessoa comprou, ao preco da quota do acervo. */
    quotasDoAporteDe,
    /**
     * O total aportado no ato, e as quotas que ele criou. O total vai TAMBEM em texto
     * decimal, para a tela formatar sem passar dinheiro por `number`.
     */
    aporteTotal,
    aporteTotalEmTexto: aporteParaBanco(aporteTotal),
    quotasAportadas,
    /** As quotas do cadastro, sem o aporte: e o que a tela contrasta com o total. */
    quotasDoCadastro,

    /**
     * DE ONDE ESTE ATO PARTE. Vazio = do cadastro.
     *
     * A LISTA NAO FILTRA NADA, e nao precisa: o modal sempre monta uma simulacao NOVA,
     * que ainda nao existe no historico e portanto nao pode ser ancestral de si mesma.
     * Ciclo aqui e impossivel por construcao, nao por guarda.
     *
     * (Este comentario afirmava um filtro de descendentes que o codigo nao tinha. A
     * guarda de ciclo que existe de verdade e a de LEITURA, no `cadeiaDe`, e ela e
     * defensiva contra dado ruim: `origem_simulacao_id` e FK livre e alguem pode
     * fechar um laco por SQL. No dia em que houver "editar simulacao gravada", o
     * filtro passa a ser necessario AQUI.)
     */
    origemDoAto: origemId,
    setOrigemDoAto: setOrigemId,
    origemEscolhida: origem,
    /**
     * SO A MESMA SOCIEDADE PODE SER ORIGEM. O historico e por CLIENTE, e um cliente
     * tem mais de uma sociedade: no Agro Alianca sao tres. Sem este filtro dava para
     * escolher a empresa B, herdar o quadro e o acervo de uma simulacao da empresa A e
     * gravar o resultado como B. O quadro de partida seria de outra sociedade, e nada
     * na tela diria isso.
     */
    origensPossiveis: (historico.data ?? [])
      .filter((s) => empresa != null && s.empresaPessoaId === empresa.id)
      .map((s) => ({
        id: s.id,
        rotulo: rotuloDaSimulacao(s),
        competencia: s.competencia,
        status: s.status,
      })),

    /** O PAPEL na linha, como na doacao: usufrutuario recebe, o outro concede. */
    papelNoUsufruto,
    definirPapelNoUsufruto: (pessoaId: string, papel: PapelDoUsufruto) =>
      setPapeisDoUsufruto((o) => ({ ...o, [pessoaId]: papel })),
    /**
     * TIRAR do quadro do usufruto sem tirar da doacao: sao dois atos. Quem veio da
     * doacao entra na lista de excluidos; quem foi adicionado a mais so sai dela. A
     * concessao dele e zerada junto - deixar o numero la faria o total continuar
     * contando quota de quem nao esta no ato.
     */
    removerDoUsufruto: (pessoaId: string) => {
      setExtrasDoUsufruto((o) => o.filter((x) => x !== pessoaId));
      if (quadro.linhas.some((l) => l.pessoaId === pessoaId)) {
        setForaDoUsufruto((o) => (o.includes(pessoaId) ? o : [...o, pessoaId]));
      }
      setPapeisDoUsufruto((o) => {
        const novo = { ...o };
        delete novo[pessoaId];
        return novo;
      });
      setInstitucoes((o) => ({ ...o, [pessoaId]: '' }));
    },
    /**
     * QUEM PODE ENTRAR A MAIS: pessoa fisica do cliente que nao esta no quadro. Existe
     * porque conceder usufruto NAO exige ter doado - um socio que ficou de fora da
     * doacao pode instituir usufruto sobre as quotas que sempre teve. E tambem devolve
     * quem foi tirado por engano.
     */
    candidatosAoUsufruto: (pessoas.data ?? [])
      .filter((x) => x.tipo_pessoa === 'PF'
        && !participantesDoUsufruto.some((y) => y.pessoaId === x.id))
      .map((x) => ({
        pessoaId: x.id,
        denominacao: x.denominacao,
        quotas: quotasPorPessoa.get(x.id) ?? 0n,
      })),
    adicionarAoUsufruto: (pessoaId: string) => {
      setForaDoUsufruto((o) => o.filter((x) => x !== pessoaId));
      if (!quadro.linhas.some((l) => l.pessoaId === pessoaId)) {
        setExtrasDoUsufruto((o) => (o.includes(pessoaId) ? o : [...o, pessoaId]));
      }
    },
    /** O quadro: plena, nua, usufruto e o % de voz e voto de cada um. */
    linhasDoUsufruto: usufruto.linhas,
    totaisDoUsufruto: usufruto.totais,
    problemasDoUsufruto: usufruto.problemas,
    /** Quotas que a reserva da doacao ja colocou sob usufruto. */
    jaSobUsufruto,
    /**
     * O percentual de voz e voto de quem usufrui - o numero que a aba persegue.
     * `null` quando ninguem usufrui nada, para o selo da aba nao mostrar zero.
     */
    percentualDoUsufrutuario: usufruto.linhas
      .filter((l) => l.usufruto > 0n)
      .sort((a, b) => (b.usufruto > a.usufruto ? 1 : -1))[0]?.pctVozEVoto ?? null,
    /**
     * A ULTIMA COLUNA e o alvo: o que se le e o percentual atual, e o que se digita e
     * o desejado. Era campo unico na barra, valendo para "o fundador" - mas quem
     * recebe o usufruto e escolha, e pode ser mais de um.
     */
    vozEVotoDigitado: (pessoaId: string, canonico: string) =>
      alvoDigitado[pessoaId] ?? canonico.replace('.', ','),
    confirmarVozEVoto: (pessoaId: string) =>
      setAlvoDigitado((o) => {
        const novo = { ...o };
        delete novo[pessoaId];
        return novo;
      }),
    setVozEVoto: (pessoaId: string, valor: string) => {
      // A MESMA MASCARA do percentual final: um campo de percentual se digita igual em
      // toda a tela. Aqui o regex antigo era pior que la — ele RECUSAVA a tecla, e o
      // campo voltava sozinho ao valor de antes, como se estivesse travado.
      const digitado = mascararPercentual(valor);
      setAlvoDigitado((o) => ({ ...o, [pessoaId]: digitado }));
      const escalado = percentualEscalado(digitado);
      if (escalado == null || escalado > 1_000_000n) return;
      resolverAlvoDeVozEVoto(pessoaId, escalado);
    },
    totalInstituido,
    candidatosAInstituinte,
    institucaoDigitada: (pessoaId: string) => agrupar(institucoes[pessoaId] ?? ''),
    /**
     * QUANTO ESTA PESSOA CONCEDE - e os outros concedentes REACOMODAM, mantendo o
     * total. O percentual de voz e voto do usufrutuario e o total contratado; quanto
     * cada um concede e a distribuicao dele.
     *
     * Sem isso, zerar a concessao de uma filha derrubava o percentual do pai - mexia
     * nas duas coisas de uma vez. Para mudar o total, o campo e a % da linha dele.
     */
    setInstituicao: (pessoaId: string, valor: string) => {
      const digitos = valor.replace(/\D/g, '');
      const querido = digitos === '' ? 0n : BigInt(digitos);
      const concedentes = usufruto.linhas
        .filter((l) => l.plena + l.nuaDeInstituicao > 0n)
        .map((l) => ({ id: l.pessoaId, quotas: l.nuaDeInstituicao }));

      // Sem outro concedente, ou sem total a preservar, e digitacao direta.
      if (totalInstituido <= 0n || concedentes.length < 2) {
        setInstitucoes((o) => ({ ...o, [pessoaId]: digitos }));
        return;
      }
      const nova = redistribuirConcessoes(
        concedentes, pessoaId, querido, totalInstituido,
      );
      setInstitucoes((o) => ({
        ...o,
        ...Object.fromEntries([...nova].map(([id, q]) => [id, q.toString()])),
        // O que se digitou fica exatamente como se digitou, mesmo aparado.
        [pessoaId]: digitos,
      }));
    },
    /** A apuracao da INSTITUICAO - guia propria, imposto proprio. */
    saidaDaInstituicao,
    erroDaInstituicao,
    /** Doacao + instituicao, por cenario de valor. E o numero que decide. */
    impostoTotalPorCenario,

    estado,
    setEstado,
    /** Um item, e é honesto: só o ITCD de MT tem motor aqui. */
    estadosComItcd: ['MT'] as const,

    competencia,
    // Trocar o mês repreenche a UPF com a conhecida daquele mês, quando há. Sem
    // isso o campo ficaria com o valor de outra competência sem dizer nada.
    setCompetencia: (nova: string) => {
      setCompetencia(nova);
      const conhecida = upfSugerida(nova);
      if (conhecida != null) setUpf(conhecida.replace('.', ','));
    },
    competenciaValida,
    upf,
    setUpf,
    upfValida,
    upfConhecidaDaCompetencia,
    upfSugeridaDoMes,
    upfVeioDaSerie,

    saida,
    erro,

    // O rascunho vira simulação por ação do analista, não a cada tecla: é ele
    // que decide quando o que está na tela é uma apuração.
    painelAberto: modalAberto,
    abrirPainel: () => setModalAberto(true),
    fecharPainel: () => setModalAberto(false),
    podeGerar: saida != null && quadro.problemas.length === 0,

    // ── HISTÓRICO, agora GRAVADO ───────────────────────────────────────────
    // Cada geração é uma linha nova em `itcd_simulacao`, com o retrato inteiro. A
    // anterior não é tocada: revisar não é editar. A versão é contada no banco.
    //
    // `simulacoes` (memória) continua, mas só para a simulação ACABADA DE GERAR
    // aparecer na hora, sem esperar o refetch. O histórico da tela é o do banco.
    simulacoes,
    simulacaoGerada: simulacoes[simulacoes.length - 1] ?? null,
    historicoSalvo: historico.data ?? [],
    carregandoHistorico: historico.isLoading,
    erroDoHistorico: historico.error as Error | null,
    gravando: gravar.isPending,
    erroDeGravacao: gravar.error as Error | null,
    /**
     * POR QUE esta simulação não vai para o banco. `null` = vai.
     *
     * A tabela exige os três cenários, e está certa: a apuração completa é o
     * entregável. Cenário sem valor é cadastro incompleto, e a tela diz isso em vez
     * de gravar zero — zero seria afirmar um imposto que ninguém calculou.
     */
    motivoDeNaoGravar: saida == null || saida.cenariosIndisponiveis.length === 0
      ? null
      : `Sem valor de ${saida.cenariosIndisponiveis
        .map((c) => ({ contabil: 'contábil', itr: 'ITR', mercado: 'mercado' }[c]))
        .join(' e ')} no cadastro dos bens: a simulação fica nesta sessão e não é `
        + 'gravada. O histórico guarda os três cenários apurados.',
    /**
     * TROCAR STATUS e RENOMEAR levam o estado ANTERIOR junto.
     *
     * A trilha de auditoria registra `changed_fields` com o de-para, e sem o valor de
     * antes ela diria apenas "mudou para aprovada" — que e metade do fato. O anterior
     * sai do proprio historico, que a tela ja tem carregado.
     */
    alterandoStatus: alterarStatus.isPending,
    erroDoStatus: alterarStatus.error as Error | null,
    alterarStatus: (id: string, status: StatusDaSimulacao) => {
      const atual = (historico.data ?? []).find((s) => s.id === id);
      if (atual == null) return;
      alterarStatus.mutate({
        id,
        status,
        statusAnterior: atual.status,
        nome: atual.nome,
        versao: atual.versao,
      });
    },

    /** Renomear nao mexe no retrato: so no rotulo pelo qual se procura o cenario. */
    renomeando: renomear.isPending,
    erroDeRenomear: renomear.error as Error | null,
    renomear: (id: string, nome: string) => {
      const atual = (historico.data ?? []).find((s) => s.id === id);
      if (atual == null) return;
      renomear.mutate({ id, nome, nomeAnterior: atual.nome, versao: atual.versao });
    },
    gerar: () => {
      if (saida == null || clienteId == null || empresa == null) return;
      setSimulacoes((anteriores) => [...anteriores, {
        versao: (historico.data?.[0]?.versao ?? 0) + 1,
        saida,
        empresaNome: empresa.denominacao,
        totalDeQuotas: totalDeQuotas.toString(),
        doadores: doadores.map((d) => d.denominacao),
        donatarios: donatarios.map((d) => d.denominacao),
      }]);
      setModalAberto(false);
      // E O ATO FECHOU: o modal volta em branco. O payload abaixo já está montado a
      // partir do render atual, então zerar aqui não o alcança.
      zerarOAto();
      // SÓ GRAVA COM OS TRÊS CENÁRIOS. Sem um deles a simulação vale para a sessão e a
      // tela diz por que não foi ao banco (`motivoDeNaoGravar`) — nada de gravar zero
      // onde não houve apuração.
      if (saida.cenariosIndisponiveis.length > 0) return;
      // O erro sobe para `erroDeGravacao` e a tela diz: simulação que não gravou não
      // pode parecer gravada.
      gravar.mutate({
        clienteId,
        empresaPessoaId: empresa.id,
        saida,
        // DE ONDE ESTE ATO PARTIU. E o que permite ler a cadeia depois e somar o
        // consolidado que a apresentacao mostra.
        //
        // A GUARDA e no gravar, e nao so na lista: a origem se escolhe antes e a
        // sociedade pode ser trocada depois, e ai o id escolhido ficaria apontando
        // para um ato de outra empresa. Aqui ele cai para nulo, que significa "parte
        // do cadastro" - o quadro em tela ja e o da empresa certa.
        origemSimulacaoId: origem != null && origem.empresaPessoaId === empresa.id
          ? origem.id
          : null,
        // O QUADRO INTEIRO sai daqui, das mesmas linhas que a tela mostra — e não de
        // uma segunda conta. O que estiver gravado é exatamente o que estava na tela.
        doadores: doadores.map((d) => {
          const linha = quadro.linhas.find((l) => l.pessoaId === d.pessoaId);
          const forma = formaDe(d.pessoaId);
          const conjunta = forma.tipo === 'casal-conjunto';
          return {
            pessoaId: d.pessoaId,
            quotas: d.quotas.toString(),
            quotasTransmitidas: (linha?.transmitido ?? 0n).toString(),
            quotasFinal: (linha?.participacaoFinal ?? d.quotas).toString(),
            emissaoConjunta: conjunta,
            conjugePessoaId: conjunta ? forma.conjugeId : null,
            vlrAporteMoeda: aporteParaBanco(aporteDe(d.pessoaId)),
            quotasDoAporte: quotasDoAporteDe(d.pessoaId).toString(),
          };
        }),
        donatarios: donatarios.map((d) => {
          const linha = quadro.linhas.find((l) => l.pessoaId === d.pessoaId);
          return {
            pessoaId: d.pessoaId,
            quotasAtuais: (linha?.quotasAtuais ?? 0n).toString(),
            quotasLegitima: d.legitima.toString(),
            quotasDisponivel: d.disponivel.toString(),
            quotasFinal: (linha?.participacaoFinal ?? 0n).toString(),
            vlrAporteMoeda: aporteParaBanco(aporteDe(d.pessoaId)),
            quotasDoAporte: quotasDoAporteDe(d.pessoaId).toString(),
          };
        }),

        // ── AS GUIAS ──────────────────────────────────────────────────────────
        // O resultado, por par. Ja vem apurado por guia do motor — `saida.gias` —, que
        // e a unidade em que a SEFAZ tributa: uma por doador declarante.
        //
        // O `doadorId` da guia pode ser COMPOSTO. Na emissao conjunta o doador fiscal e
        // o casal, e o id dele e `titular+conjuge` (`idDoCasal`), que nao e `pessoa.id`
        // nenhum. Gravar isso quebraria a chave estrangeira, entao aqui ele volta a ser
        // o TITULAR — e quem diz que a guia saiu no nome do casal e o `emissao_conjunta`
        // da linha do doador.
        gias: saida.gias.map((g) => {
          const fiscal = doadoresFiscais.find((d) => d.doadorId === g.doadorId);
          return {
            doadorPessoaId: fiscal?.pessoaIds[0] ?? g.doadorId,
            donatarioPessoaId: g.donatarioId,
            quotasRecebidas: g.quotasRecebidas,
            pctDaGia: g.percentualDaGia,
            doacaoAnterior: g.doacaoAnterior,
            basePorCenario: {
              contabil: g.porCenario.contabil?.base ?? null,
              itr: g.porCenario.itr?.base ?? null,
              mercado: g.porCenario.mercado?.base ?? null,
            },
            impostoPorCenario: {
              contabil: g.porCenario.contabil?.imposto ?? null,
              itr: g.porCenario.itr?.imposto ?? null,
              mercado: g.porCenario.mercado?.imposto ?? null,
            },
          };
        }),

        // ── O USUFRUTO ────────────────────────────────────────────────────────
        comReserva,
        pctBaseReserva: pctBaseDaDoacao,
        pctBaseInstituicao: pctBaseDaInstituicao,
        // O QUADRO VAI SEMPRE, inclusive quando nao ha ato: sem reserva e sem
        // instituicao ele diz que cada um vota o que tem e que nada foi recolhido.
        // Isso e uma afirmacao, e e diferente de nao haver registro.
        usufruto: usufruto.linhas.map((l) => ({
          pessoaId: l.pessoaId,
          papel: papelNoUsufruto(l.pessoaId),
          quotas: l.quotas.toString(),
          quotasPlena: l.plena.toString(),
          quotasNuaReserva: l.nuaDeReserva.toString(),
          quotasNuaInstituicao: l.nuaDeInstituicao.toString(),
          quotasUsufruto: l.usufruto.toString(),
        })),
        concessoes: [
          // A RESERVA: um par por beneficiario, com o BLOCO INTEIRO em cada. Com o
          // casal os dois usufruem o mesmo bloco em conjunto (art. 1.411 CC) — somar
          // a coluna conta o bloco duas vezes, e e por isso que ela nao e somada em
          // lugar nenhum. Sem valor: a reserva nao tem guia propria.
          ...concessoes
            .filter((c) => c.origem === 'reserva')
            .flatMap((c) => c.paraIds.map((paraId) => ({
              deId: c.deId,
              paraId,
              origem: 'reserva' as const,
              quotas: c.quotas.toString(),
              basePorCenario: null,
              impostoPorCenario: null,
            }))),
          // A INSTITUICAO: uma linha por GIA, com a FATIA que aquela guia tributou.
          // Aqui a soma fecha o total instituido, porque cada beneficiario recebeu
          // uma parte — e cada um com a propria isencao de 500 UPF.
          ...(saidaDaInstituicao?.gias ?? []).map((g) => ({
            deId: g.doadorId,
            paraId: g.donatarioId,
            origem: 'instituicao' as const,
            quotas: String(g.quotasRecebidas),
            basePorCenario: {
              contabil: g.porCenario.contabil?.base ?? null,
              itr: g.porCenario.itr?.base ?? null,
              mercado: g.porCenario.mercado?.base ?? null,
            },
            impostoPorCenario: {
              contabil: g.porCenario.contabil?.imposto ?? null,
              itr: g.porCenario.itr?.imposto ?? null,
              mercado: g.porCenario.mercado?.imposto ?? null,
            },
          })),
        ],
      });
    },
  };
}

/**
 * O ACERVO MAIS O APORTE, em texto decimal. Soma em `bigint` na escala do `Money` —
 * dinheiro nao passa por `number` nem aqui, no caminho entre o acervo e o motor.
 *
 * CENARIO INDISPONIVEL CONTINUA INDISPONIVEL. `total` nulo significa que nenhum imovel
 * tem valor naquela regua, e o aporte NAO completa isso: somar o dinheiro daria um
 * total que parece apurado e esconde os imoveis sem valor. Quem diz que o cenario esta
 * incompleto e a propria simulacao (`cenariosIndisponiveis`), e ela precisa continuar
 * dizendo.
 *
 * Acervo ilegivel devolve o texto original: quem reclama de valor invalido e o motor,
 * com a mensagem dele, e nao esta funcao inventando um numero.
 */
function somarAoAcervo(total: string | null, aporte: bigint): string | null {
  if (total == null || aporte <= 0n) return total;
  try {
    return formatMoney(parseMoney(total) + aporte);
  } catch {
    return total;
  }
}

function paraImovelDoAcervo(b: BemComValores): ImovelDoAcervo {
  return {
    id: b.id,
    referencia: b.referencia_dp,
    denominacao: b.denominacao,
    // Os três cenários já vêm derivados das matrículas por `valoresDoBem`.
    valores: b.valores,
  };
}

/** Quotas digitadas pelo analista; vazio conta como zero distribuído. */
function inteiroOuZero(valor: string | undefined): bigint {
  const texto = (valor ?? '').trim();
  if (texto === '' || !/^\d+$/.test(texto)) return 0n;
  return BigInt(texto);
}

const mesCorrente = () => new Date().toISOString().slice(0, 7);

/**
 * "1.234,56" ou "1234.56" → "1234.56"; vazio → `null`. Vazio é AUSÊNCIA de doação
 * anterior, não zero — e o motor trata os dois igual, mas a saída registra `null`
 * para o quadro não afirmar que houve doação de R$ 0,00.
 */
function normalizarDinheiro(valor: string): string | null {
  const texto = valor.trim();
  if (texto === '') return null;
  const limpo = texto.replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(limpo) ? limpo : null;
}

export type CalculadoraItcmd = ReturnType<typeof useCalculadoraItcmdController>;
