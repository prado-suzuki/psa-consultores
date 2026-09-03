/**
 * Rascunho e regras puras do cadastro de exploração rural (AGR-01).
 *
 * Mesma divisão de `diagnosticoPatrimonialModalModels.ts`: o rascunho guarda tudo
 * como `string` (número só vira número na saída, para não existir `NaN` no meio da
 * digitação) e as chaves repetem o nome da coluna, para o `draftToValues` ser uma
 * tradução sem dicionário.
 *
 * As regras de negócio daqui saem do levantamento da ALE-3 (relatórios 05–14, na
 * branch `ale-3-levantamento-contratos-rurais`) e cada uma cita o contrato real que
 * a sustenta. Nada aqui é hipótese.
 *
 * O que este arquivo NÃO faz: falar com o Supabase (é o hook) e desenhar (é a aba).
 * Por isso ele é testável em milissegundos.
 */
import type { Database } from '@/integrations/supabase/types';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { MatriculaEnriched } from '@/hooks/useDiagnosticoPatrimonial';
import type { ExploracaoRuralOrigemRow } from '@/hooks/useExploracaoRural';
import { converterArea } from '@/components/equipe/osg/diagnostico-patrimonial/areaUtils';

export type TipoExploracaoRural = Database['public']['Enums']['osg_tipo_exploracao'];

/**
 * Papel da parte no instrumento. É o `CHECK` da coluna `exploracao_rural_parte.papel`,
 * repetido aqui porque `text + CHECK` não gera união no `types.ts` (só `enum` gera).
 * O outorgante NÃO está aqui: ele é coluna do cabeçalho, porque a OSG confirmou em
 * 19/08/2026 que é sempre único — se duas empresas cedem, são duas parcerias.
 */
export type PapelDaParte = 'explorador' | 'compossuidor' | 'administrador_nomeado';

export type UnidadeDePrazo = 'dias' | 'meses' | 'anos';
export const UNIDADES_DE_PRAZO: UnidadeDePrazo[] = ['dias', 'meses', 'anos'];

/**
 * Modalidade de exploração pecuária. Não é escolha entre três: um contrato pode
 * ter as três ao mesmo tempo.
 *
 * A pergunta que ela responde é diferente da de `inclui_pecuaria`. Aquele é um
 * sim/não ("este contrato envolve gado?") e governa duas coisas: o documento
 * dizer AGROPECUÁRIA em vez de AGRÍCOLA, e entrar a autorização genérica da
 * Cláusula Terceira ("poderão fazer uso das terras para cria, recria e engorda").
 *
 * A modalidade governa a Cláusula QUINTA, e o que ela define é O QUE SE MEDE na
 * partilha dos frutos — porque "fruto" de gado não é evidente como a saca de soja:
 *
 *   · `recria_engorda` → o GANHO DE PESO, apurado entre o peso de aquisição e o
 *     da alienação, com os animais já existentes pesados em 30 dias;
 *   · `cria`           → os BEZERROS NASCIDOS, entregues em cabeças;
 *   · `ciclo_completo` → o PESO APURADO A CADA 12 MESES, por nota fiscal.
 *
 * Três formas distintas de medir e de pagar — errar isso erra quanto o cliente
 * recebe. E são independentes de verdade: a parceria do MMS traz os três
 * parágrafos (seis na Cláusula Quinta), a do Bela Vista traz dois (cinco).
 */
export type ModalidadePecuaria = 'recria_engorda' | 'cria' | 'ciclo_completo';
export const MODALIDADE_PECUARIA_OPCOES: { valor: ModalidadePecuaria; rotulo: string; dica: string }[] = [
  { valor: 'recria_engorda', rotulo: 'Recria e engorda',
    dica: 'O fruto é o ganho de peso entre a compra e a venda do animal.' },
  { valor: 'cria', rotulo: 'Cria',
    dica: 'O fruto são os bezerros nascidos do rebanho.' },
  { valor: 'ciclo_completo', rotulo: 'Ciclo completo',
    dica: 'O fruto é o peso apurado a cada 12 meses, por nota fiscal.' },
];

export type RegraAdministracao = 'maioria' | 'nomeados';
export type LiquidacaoPeriodicidade = 'mensal' | 'anual';

/**
 * Tipo de instrumento que deu origem à posse de UM imóvel. Grava minúscula, exibe o
 * rótulo do contrato — a grafia espelha o enum `osg_tipo_exploracao` que já existe,
 * mas deliberadamente não o reusa: `heranca` e `outro` não são tipos de instrumento
 * válidos para `exploracao_rural.tipo_exploracao`.
 */
export type OrigemTipo = 'parceria' | 'arrendamento' | 'propria' | 'heranca' | 'outro';
export const ORIGEM_TIPO_OPCOES: { valor: OrigemTipo; rotulo: string }[] = [
  { valor: 'parceria', rotulo: 'Parceria' },
  { valor: 'arrendamento', rotulo: 'Arrendamento' },
  { valor: 'propria', rotulo: 'Exploração própria' },
  { valor: 'heranca', rotulo: 'Herança' },
  { valor: 'outro', rotulo: 'Outro' },
];

/**
 * Os seis tipos do enum do banco. A tela oferece todos, mas só `parceria` e
 * `composse` têm seções próprias — os outros quatro existem na coluna desde antes
 * da ALE-3 e não têm modelo de contrato mapeado. Oferecer todos é mais honesto que
 * esconder: o `FiscalReport` já os rotula.
 */
export const TIPOS_EXPLORACAO_OPCOES: { valor: TipoExploracaoRural; rotulo: string }[] = [
  { valor: 'parceria', rotulo: 'Parceria' },
  { valor: 'composse', rotulo: 'Composse' },
  { valor: 'arrendamento', rotulo: 'Arrendamento' },
  { valor: 'comodato', rotulo: 'Comodato' },
  { valor: 'condominio', rotulo: 'Condomínio' },
  { valor: 'propria', rotulo: 'Exploração própria' },
];

// ── Rascunho ────────────────────────────────────────────────────────────────────

/**
 * `id` é local e serve de `key` de React e de ligação imóvel→origem ANTES de o banco
 * existir; `rowId` é o `id` da linha quando ela já foi gravada. Sem os dois, ou o
 * React perde a identidade da linha ao reordenar, ou o update não sabe o que
 * atualizar.
 */
export interface ParteDraft {
  id: string;
  rowId: string | null;
  pessoa_id: string | null;
  papel: PapelDaParte;
  /** Só compossuidor (o `CHECK` do banco recusa nos outros papéis). */
  fracao: string;
  ordem: number;
}

/**
 * O instrumento anterior de onde vem a posse dos imóveis.
 *
 * Quem cedeu a posse é uma PESSOA do cadastro (`outorgante_pessoa_id`), como o
 * outorgante do próprio instrumento. Os dois campos de texto que sobram são da
 * RELAÇÃO, não da pessoa: o capital social na data daquele contrato (retrato que
 * `pessoa` não guarda) e quem representou a empresa naquele ato.
 */
export interface OrigemExternaDraft {
  id: string;
  rowId: string | null;
  titulo_instrumento: string;
  data_assinatura: string;
  outorgante_pessoa_id: string | null;
  outorgante_capital_social_na_assinatura: string;
  outorgante_representante: string;
}

export interface ImovelDraft {
  id: string;
  rowId: string | null;
  matricula_id: string | null;
  /** Área cedida NESTE instrumento — não é `matricula.area_explorada`. */
  area_explorada: string;
  area_unidade: string;
  ordem: number;
  origem_tipo: OrigemTipo | '';
  /** Origem interna: outro instrumento já cadastrado. Exclusiva com a externa. */
  origem_exploracao_rural_id: string | null;
  /** Origem externa: aponta para o `id` LOCAL de um item de `origens`. */
  origem_externa_local_id: string | null;
  origem_contraparte_pessoa_id: string | null;
}

export interface DraftExploracaoRural {
  tipo_exploracao: TipoExploracaoRural;
  referencia: string;
  outorgante_pessoa_id: string | null;
  /**
   * Capital social da outorgante NA DATA deste instrumento, como o preâmbulo o
   * declara ("com capital social totalmente subscrito e integralizado no valor de
   * R$ 872.674,00…").
   *
   * É retrato, e por isso é campo gravado e não cálculo na hora de gerar: o
   * cadastro registra instrumento que JÁ EXISTE (daí `data_assinatura` no
   * passado), e nesses o número certo é o que está escrito no papel — não o
   * capital da empresa hoje. É a mesma razão da coluna irmã em
   * `exploracao_rural_origem_externa`.
   *
   * Em instrumento NOVO ninguém digita: a tela pré-preenche com o capital vigente
   * no momento do cadastro (ver `PartesPanel`), e o consultor sobrescreve se o
   * papel disser outra coisa.
   */
  outorgante_capital_social_na_assinatura: string;
  data_assinatura: string;
  data_encerramento: string;
  data_inicio_vigencia: string;
  vigencia_prorrogavel: boolean;
  percentual_outorgante: string;
  percentual_explorador: string;
  culturas: string;
  inclui_pecuaria: boolean;
  /** Quais modalidades a parceria explora — ver `ModalidadePecuaria`. */
  pecuaria_modalidades: ModalidadePecuaria[];
  permite_penhor: boolean;
  prazo_indivisao_quantidade: string;
  prazo_indivisao_unidade: UnidadeDePrazo;
  indivisao_prorrogavel: boolean;
  indivisao_aviso_quantidade: string;
  indivisao_aviso_unidade: UnidadeDePrazo;
  regra_administracao: RegraAdministracao;
  liquidacao_periodicidade: LiquidacaoPeriodicidade;
  liquidacao_numero_parcelas: string;
  estudo_fiscal_documento_id: string | null;
  documento_comprobatorio_id: string | null;
  partes: ParteDraft[];
  imoveis: ImovelDraft[];
  /**
   * As origens externas vivem NO RASCUNHO, não dentro de cada imóvel: no `[BV-COM]`
   * 15 imóveis compartilham 6 origens, e embutida a mesma Agro Aliança seria digitada
   * seis vezes. É o mesmo motivo pelo qual a tabela é separada no banco.
   */
  origens: OrigemExternaDraft[];
}

let sequencia = 0;
/** Id local, só para `key` de React e ligação imóvel→origem antes da gravação. */
export const proximoIdLocal = (prefixo: string): string => `${prefixo}-${(sequencia += 1)}`;

export function emptyExploracaoRuralDraft(
  tipo: TipoExploracaoRural = 'parceria',
): DraftExploracaoRural {
  return {
    tipo_exploracao: tipo,
    referencia: '',
    outorgante_pessoa_id: null,
    outorgante_capital_social_na_assinatura: '',
    data_assinatura: '',
    data_encerramento: '',
    data_inicio_vigencia: '',
    // `false` é o default da coluna, e o contrato que prorroga é o caso raro.
    vigencia_prorrogavel: false,
    percentual_outorgante: '',
    percentual_explorador: '',
    culturas: '',
    // `true` é o default da coluna: agropecuária é o caso comum nos contratos lidos.
    inclui_pecuaria: true,
    // Vazio, e não "as três": qual modalidade o contrato explora é fato dele, e
    // chutar aqui poria na Cláusula Quinta uma forma de medir que as partes não
    // pactuaram.
    pecuaria_modalidades: [],
    permite_penhor: false,
    prazo_indivisao_quantidade: '',
    prazo_indivisao_unidade: 'anos',
    indivisao_prorrogavel: false,
    indivisao_aviso_quantidade: '',
    indivisao_aviso_unidade: 'dias',
    regra_administracao: 'maioria',
    liquidacao_periodicidade: 'mensal',
    liquidacao_numero_parcelas: '',
    estudo_fiscal_documento_id: null,
    documento_comprobatorio_id: null,
    partes: [],
    imoveis: [],
    origens: [],
  };
}

export const novaParte = (papel: PapelDaParte, ordem: number): ParteDraft => ({
  id: proximoIdLocal('parte'),
  rowId: null,
  pessoa_id: null,
  papel,
  fracao: '',
  ordem,
});

export const novoImovel = (ordem: number): ImovelDraft => ({
  id: proximoIdLocal('imovel'),
  rowId: null,
  matricula_id: null,
  area_explorada: '',
  area_unidade: 'ha',
  ordem,
  origem_tipo: '',
  origem_exploracao_rural_id: null,
  origem_externa_local_id: null,
  origem_contraparte_pessoa_id: null,
});

export const novaOrigemExterna = (): OrigemExternaDraft => ({
  id: proximoIdLocal('origem'),
  rowId: null,
  titulo_instrumento: '',
  data_assinatura: '',
  outorgante_pessoa_id: null,
  outorgante_capital_social_na_assinatura: '',
  outorgante_representante: '',
});

// ── Regras puras ────────────────────────────────────────────────────────────────

/** As partes de um papel, na ordem declarada. */
export const partesDoPapel = (partes: ParteDraft[], papel: PapelDaParte): ParteDraft[] =>
  partes.filter((p) => p.papel === papel).sort((a, b) => a.ordem - b.ordem);

export interface StatusDasFracoes {
  soma: number;
  /** Quantos compossuidores existem (com pessoa escolhida ou não). */
  quantidade: number;
  fecha: boolean;
  excede: boolean;
  /** Quanto falta para 100 (0 quando fecha ou excede). */
  faltam: number;
}

/**
 * Soma das frações dos compossuidores.
 *
 * Diferente da `titularidade`, aqui a soma DEVE fechar: nos dois instrumentos reais
 * lidos (`[BV-COM]` 70/15/15 e `[ROS-COM]` 25×4) ela fecha, e a Cláusula Segunda
 * reparte os frutos por ela. Quem barra de verdade é a RPC; esta função é o que a
 * tela mostra enquanto se digita.
 *
 * ── POR QUE A TOLERÂNCIA DEPENDE DA QUANTIDADE ─────────────────────────────────
 *
 * Fração periódica não tem representação decimal exata, e o critério da casa (ver
 * `fracaoUtils.ts`) é gravar 4 casas. O resíduo NÃO é fixo:
 *
 *   · 3 × 1/3  → 33,3333 cada → soma  99,9999  (falta   0,0001)
 *   · 6 × 1/6  → 16,6667 cada → soma 100,0002  (excede  0,0002)
 *   · 7 × 1/7  → 14,2857 cada → soma  99,9999  (falta   0,0001)
 *
 * Cada fração carrega até meia unidade da última casa (0,00005) de arredondamento,
 * então N frações carregam até N × 0,00005 — em unidades de 0,0001, isso é N/2. Uma
 * tolerância fixa de 0,0001 recusaria a partilha de sextos, que é correta e está no
 * documento como 16,6667% seis vezes.
 *
 * A conta é feita em INTEIRO (centésimos de milésimo), não em ponto flutuante: 3 ×
 * 33,3333 em `float` dá 99.99990000000001, e comparar isso com 100 pela diferença
 * absoluta já falhou uma vez neste mesmo arquivo.
 */
/** Uma unidade da última casa gravada: 0,0001. */
export const UNIDADE_FRACAO = 0.0001;
const ESCALA = 10_000;
const ALVO = 100 * ESCALA;

export function statusDasFracoes(partes: ParteDraft[]): StatusDasFracoes {
  const compossuidores = partesDoPapel(partes, 'compossuidor');
  const somaEmUnidades = compossuidores.reduce(
    (acc, p) => acc + Math.round((Number(p.fracao) || 0) * ESCALA),
    0,
  );
  // Meia unidade de arredondamento por fração, arredondada para cima.
  const tolerancia = Math.ceil(compossuidores.length / 2);
  const desvio = somaEmUnidades - ALVO;
  const fecha = Math.abs(desvio) <= tolerancia;
  return {
    soma: somaEmUnidades / ESCALA,
    quantidade: compossuidores.length,
    fecha,
    excede: desvio > tolerancia,
    faltam: fecha || desvio > 0 ? 0 : -desvio / ESCALA,
  };
}

export type ModoDeAdministracao = 'isoladamente' | 'em_conjunto';

/**
 * Como os administradores nomeados agem — e por que isso NÃO é campo.
 *
 * É derivado da contagem: 1 nomeado age isoladamente, 2 ou mais em conjunto. A prova
 * é o Termo Aditivo do `[ROS-COM]`, que altera a MESMA cláusula de "em conjunto por
 * Dilceu Rossato e Catia Regina Randon Rossato" para "isoladamente pela compossuidora
 * Catia Regina Randon" — sem negociar nada novo, só porque Dilceu deixou de ser
 * compossuidor. Um campo aqui permitiria o estado contraditório "1 nomeado marcado
 * como conjunto".
 *
 * Devolve `null` quando a regra não é `nomeados` ou quando ninguém foi nomeado ainda:
 * aí não há frase a mostrar, e inventar uma seria pior que calar.
 */
export function modoDeAdministracao(
  regra: RegraAdministracao,
  partes: ParteDraft[],
): ModoDeAdministracao | null {
  if (regra !== 'nomeados') return null;
  const nomeados = partesDoPapel(partes, 'administrador_nomeado').filter((p) => p.pessoa_id);
  if (nomeados.length === 0) return null;
  return nomeados.length === 1 ? 'isoladamente' : 'em_conjunto';
}

/** A frase que o contrato vai gerar, para o consultor conferir sem abrir o gerador. */
export function fraseDeAdministracao(
  regra: RegraAdministracao,
  partes: ParteDraft[],
  pessoas: PessoaRow[],
): string | null {
  const modo = modoDeAdministracao(regra, partes);
  if (!modo) return null;
  const nomes = partesDoPapel(partes, 'administrador_nomeado')
    .map((p) => pessoas.find((pessoa) => pessoa.id === p.pessoa_id)?.denominacao)
    .filter((nome): nome is string => !!nome);
  return modo === 'isoladamente'
    ? `Atos sensíveis: isoladamente por ${nomes[0]}.`
    : `Atos sensíveis: em conjunto por ${nomes.join('; ')}.`;
}

/**
 * Soma das frações do outorgante e do explorador, na parceria.
 *
 * "Na parceria é de forma geral" (OSG, 19/08/2026): o corte é entre os dois LADOS, e
 * não por pessoa — por isso são duas colunas do instrumento, e não fração por parte.
 * Mas continua sendo uma partilha, então continua tendo de fechar 100%: o que não vai
 * para um lado vai para o outro, e não existe terceiro destino.
 *
 * Só avalia quando os DOIS estão preenchidos. Com um só, não há partilha para conferir
 * — é formulário pela metade, não erro.
 */
export interface StatusDaPartilha {
  preenchida: boolean;
  soma: number;
  fecha: boolean;
  excede: boolean;
  faltam: number;
}

export function statusDaPartilha(
  percentualOutorgante: string,
  percentualExplorador: string,
): StatusDaPartilha {
  const vazio = { preenchida: false, soma: 0, fecha: false, excede: false, faltam: 0 };
  if (!percentualOutorgante.trim() || !percentualExplorador.trim()) return vazio;
  const a = Math.round((Number(percentualOutorgante) || 0) * ESCALA);
  const b = Math.round((Number(percentualExplorador) || 0) * ESCALA);
  const desvio = a + b - ALVO;
  // Mesma tolerância de duas frações arredondadas em 4 casas (ver `statusDasFracoes`).
  const fecha = Math.abs(desvio) <= 1;
  return {
    preenchida: true,
    soma: (a + b) / ESCALA,
    fecha,
    excede: desvio > 1,
    faltam: fecha || desvio > 0 ? 0 : -desvio / ESCALA,
  };
}

export interface AreaExcedida {
  imovelLocalId: string;
  matriculaId: string;
  /** Área cedida por ESTE instrumento, convertida para a unidade da matrícula. */
  cedidaNaUnidadeDaMatricula: number;
  /** Área que outros instrumentos ativos já tomam da mesma matrícula. */
  cedidaPorOutros: number;
  areaDaMatricula: number;
  unidadeDaMatricula: string;
  /** `sozinho`: este instrumento já passa. `somado`: só passa com os outros. */
  causa: 'sozinho' | 'somado';
}

/** Instrumento visto de fora, só com o que a conta de área precisa. */
export interface InstrumentoParaAreaCedida {
  id: string;
  tipo_exploracao: string;
  data_encerramento: string | null;
  imoveis: { matricula_id: string | null; area_explorada: number | null; area_unidade: string }[];
}

const emM2 = (valor: number, unidade: string): number => valor * (unidade === 'm2' ? 1 : 10000);

/**
 * Quanto de cada matrícula os OUTROS instrumentos já tomam, em m².
 *
 * "o imóvel ele pode ter duas parcerias associadas a ele com áreas diferentes. Nunca
 * pode ultrapassar 100%" (OSG, 19/08/2026). Uma matrícula sozinha não sabe disso — a
 * conta só existe olhando todos os instrumentos do cliente juntos.
 *
 * Duas restrições no que entra na soma, e as duas mudam o resultado:
 *
 * · **Só instrumento ATIVO.** A frase da OSG é "duas parcerias ativas". Uma parceria
 *   encerrada devolveu a área; contá-la impediria de cadastrar a que a substitui.
 * · **Só o MESMO tipo.** A parceria dá a posse sobre uma área; a composse organiza a
 *   exploração de áreas que já vieram de parcerias. Somar as duas contaria a mesma
 *   terra duas vezes e acusaria excesso onde não há.
 */
export function areaCedidaPorOutrosInstrumentos(
  instrumentos: InstrumentoParaAreaCedida[],
  tipo: string,
  instrumentoEmEdicao: string | null,
  hoje: string,
): Map<string, number> {
  const porMatricula = new Map<string, number>();
  for (const inst of instrumentos) {
    if (inst.id === instrumentoEmEdicao) continue;
    if (inst.tipo_exploracao !== tipo) continue;
    if (inst.data_encerramento && inst.data_encerramento < hoje) continue;
    for (const imovel of inst.imoveis) {
      if (!imovel.matricula_id || imovel.area_explorada == null) continue;
      const atual = porMatricula.get(imovel.matricula_id) ?? 0;
      porMatricula.set(
        imovel.matricula_id,
        atual + emM2(Number(imovel.area_explorada), imovel.area_unidade),
      );
    }
  }
  return porMatricula;
}

/**
 * Imóveis cuja área cedida ultrapassa a área da própria matrícula.
 *
 * `CHECK` não enxerga outra tabela, então isso é validação de aplicação — e precisa
 * CONVERTER a unidade antes de comparar: o item pode estar em ha e a matrícula em m².
 * Comparar os números crus faria 234 ha "caber" numa matrícula de 2.958.600 m².
 *
 * A referência é `matricula.area_documento` (a área que o registro declara), não
 * `area_real` nem `area_explorada` — no Anexo do `[BV-COM]` a área cedida é sempre
 * menor que a área total da mesma linha (234 ha de um imóvel de 295,86 ha).
 */
export function imoveisComAreaExcedida(
  imoveis: ImovelDraft[],
  matriculas: MatriculaEnriched[],
  /** Área em m² que outros instrumentos ativos já tomam, por matrícula. */
  cedidaPorOutros: Map<string, number> = new Map(),
): AreaExcedida[] {
  const excedidos: AreaExcedida[] = [];
  for (const item of imoveis) {
    if (!item.matricula_id || !item.area_explorada.trim()) continue;
    const matricula = matriculas.find((m) => m.id === item.matricula_id);
    if (!matricula || matricula.area_documento == null) continue;
    const convertida = converterArea(item.area_explorada, item.area_unidade, matricula.area_unidade);
    const cedida = Number(convertida.exato);
    if (Number.isNaN(cedida)) continue;

    const disponivel = Number(matricula.area_documento);
    // A soma é feita em m² e só então volta para a unidade da matrícula: o item pode
    // estar em ha e o instrumento vizinho em m². Comparar os números crus faria 234 ha
    // "caber" numa matrícula de 2.958.600 m².
    const outrosNaUnidade =
      (cedidaPorOutros.get(item.matricula_id) ?? 0) / (matricula.area_unidade === 'm2' ? 1 : 10000);
    const total = cedida + outrosNaUnidade;
    if (total <= disponivel) continue;

    excedidos.push({
      imovelLocalId: item.id,
      matriculaId: item.matricula_id,
      cedidaNaUnidadeDaMatricula: cedida,
      cedidaPorOutros: outrosNaUnidade,
      areaDaMatricula: disponivel,
      unidadeDaMatricula: matricula.area_unidade,
      // Distinguir as duas causas muda a frase: "você digitou demais" e "a área já
      // está comprometida com outro contrato" pedem ações diferentes.
      causa: cedida > disponivel ? 'sozinho' : 'somado',
    });
  }
  return excedidos;
}

/**
 * Como a origem se apresenta na lista de escolha do imóvel: quem cedeu a posse.
 *
 * Depende de `pessoas` porque o outorgante da origem é uma pessoa do cadastro, e
 * não um nome guardado na própria origem — dois lugares para o mesmo nome é o que
 * faz um deles envelhecer. Sem pessoa escolhida, o título do instrumento serve de
 * identificação até alguém completar o cadastro.
 */
export function nomeDaOrigem(origem: OrigemExternaDraft, pessoas: PessoaRow[]): string {
  const pessoa = pessoas.find((p) => p.id === origem.outorgante_pessoa_id);
  return pessoa?.denominacao || origem.titulo_instrumento || 'Origem sem nome';
}

/**
 * Nome da composse: o 1º compossuidor listado, em maiúscula, seguido de "E OUTROS".
 * Nunca digitado — é o padrão observado nos títulos de `[BV-COM]` ("Sérgio Pitt e
 * Outros") e `[ROS-COM]`. É por isso que `exploracao_rural_parte.ordem` existe.
 */
export function nomeComposseDe(partes: ParteDraft[], pessoas: PessoaRow[]): string {
  const primeiro = partesDoPapel(partes, 'compossuidor')[0];
  if (!primeiro?.pessoa_id) return '';
  const pessoa = pessoas.find((p) => p.id === primeiro.pessoa_id);
  return pessoa?.denominacao ? `${pessoa.denominacao.toUpperCase()} E OUTROS` : '';
}

/**
 * Campos de `pessoa` que o preâmbulo dos dois modelos de contrato exige de cada parte.
 * Serve para avisar, no cadastro, que a qualificação está incompleta — o contrato
 * sairia com lacuna no meio da frase, e o cadastro rural não tem como saber isso
 * sozinho.
 *
 * Não é hipótese: no sandbox (19/08/2026), de 87 pessoas físicas só 21 tinham
 * naturalidade, 41 data de nascimento, 35 filiação e 53 regime de bens.
 */
const CAMPOS_CONTRATO_PF: { campo: keyof PessoaRow; rotulo: string; soParteExploradora?: boolean }[] = [
  { campo: 'cpf_cnpj', rotulo: 'CPF' },
  { campo: 'nacionalidade', rotulo: 'nacionalidade' },
  { campo: 'naturalidade_municipio', rotulo: 'naturalidade' },
  { campo: 'data_nascimento', rotulo: 'data de nascimento' },
  { campo: 'profissao', rotulo: 'profissão' },
  { campo: 'estado_civil', rotulo: 'estado civil' },
  { campo: 'regime_bens', rotulo: 'regime de bens' },
  { campo: 'documento_identidade_numero', rotulo: 'RG' },
  { campo: 'endereco_logradouro', rotulo: 'endereço' },
  { campo: 'endereco_municipio', rotulo: 'município' },
  // Só o preâmbulo de explorador/compossuidor traz "filh[o/a] de X e Y"; o do
  // outorgante não.
  { campo: 'filiacao_pai', rotulo: 'filiação (pai)', soParteExploradora: true },
  { campo: 'filiacao_mae', rotulo: 'filiação (mãe)', soParteExploradora: true },
];

const CAMPOS_CONTRATO_PJ: { campo: keyof PessoaRow; rotulo: string }[] = [
  { campo: 'cpf_cnpj', rotulo: 'CNPJ' },
  { campo: 'junta_comercial_uf', rotulo: 'UF da Junta Comercial' },
  { campo: 'nire', rotulo: 'NIRE' },
  { campo: 'endereco_logradouro', rotulo: 'endereço da sede' },
  { campo: 'endereco_municipio', rotulo: 'município da sede' },
];

/** Rótulos dos campos que faltam para esta pessoa entrar no contrato sem lacuna. */
export function camposFaltandoNaQualificacao(
  pessoa: PessoaRow | null | undefined,
  opcoes?: { parteExploradora?: boolean },
): string[] {
  if (!pessoa) return [];
  const lista =
    pessoa.tipo_pessoa === 'PJ'
      ? CAMPOS_CONTRATO_PJ
      : CAMPOS_CONTRATO_PF.filter((c) => !c.soParteExploradora || opcoes?.parteExploradora);
  return lista
    .filter(({ campo }) => {
      const valor = pessoa[campo];
      return valor == null || valor === '';
    })
    .map((c) => c.rotulo);
}

// ── Entrada: banco → rascunho ───────────────────────────────────────────────────

type ExploracaoRuralRowBase = Database['public']['Tables']['exploracao_rural']['Row'];
type ParteRow = Database['public']['Tables']['exploracao_rural_parte']['Row'];
type ImovelRow = Database['public']['Tables']['exploracao_rural_imovel']['Row'];
// Escrito à mão no hook (ver ExploracaoRuralOrigemRow): as colunas novas da
// origem só entram em `types.ts` quando a migration 20260901144006 for aplicada.
type OrigemRow = ExploracaoRuralOrigemRow;

/** Data do banco (`2026-03-20`) para o campo de data, que trabalha com o mesmo formato. */
const data = (v: string | null): string => v ?? '';
const str = (v: string | number | null): string => (v == null ? '' : String(v));

/**
 * Monta o rascunho a partir das quatro linhas que o hook carrega.
 *
 * As origens externas ganham id local aqui e os imóveis passam a apontar para ele —
 * assim a aba de imóveis trabalha sempre com id local, sem se importar se a origem
 * veio do banco ou acabou de ser digitada.
 */
export function exploracaoRuralParaDraft(
  row: ExploracaoRuralRowBase,
  partes: ParteRow[],
  imoveis: ImovelRow[],
  origens: OrigemRow[],
): DraftExploracaoRural {
  const localPorRowId = new Map<string, string>();
  const origensDraft: OrigemExternaDraft[] = origens.map((o) => {
    const local = proximoIdLocal('origem');
    localPorRowId.set(o.id, local);
    return {
      id: local,
      rowId: o.id,
      titulo_instrumento: str(o.titulo_instrumento),
      data_assinatura: data(o.data_assinatura),
      outorgante_pessoa_id: o.outorgante_pessoa_id,
      outorgante_capital_social_na_assinatura: str(o.outorgante_capital_social_na_assinatura),
      outorgante_representante: str(o.outorgante_representante),
    };
  });

  return {
    tipo_exploracao: row.tipo_exploracao,
    referencia: str(row.referencia),
    outorgante_pessoa_id: row.outorgante_pessoa_id,
    outorgante_capital_social_na_assinatura: str(row.outorgante_capital_social_na_assinatura),
    data_assinatura: data(row.data_assinatura),
    data_encerramento: data(row.data_encerramento),
    data_inicio_vigencia: data(row.data_inicio_vigencia),
    vigencia_prorrogavel: row.vigencia_prorrogavel,
    percentual_outorgante: str(row.percentual_outorgante),
    percentual_explorador: str(row.percentual_explorador),
    culturas: str(row.culturas),
    inclui_pecuaria: row.inclui_pecuaria,
    // O filtro descarta valor que o catálogo não conhece, em vez de levar para a
    // tela uma caixa que ninguém sabe desenhar.
    pecuaria_modalidades: (row.pecuaria_modalidades ?? [])
      .filter((m): m is ModalidadePecuaria =>
        MODALIDADE_PECUARIA_OPCOES.some((o) => o.valor === m)),
    permite_penhor: row.permite_penhor,
    prazo_indivisao_quantidade: str(row.prazo_indivisao_quantidade),
    // Coluna anulável, campo de tela não: sem valor gravado, cai no default do
    // rascunho novo, para o Select nunca ficar sem opção selecionada.
    prazo_indivisao_unidade: (row.prazo_indivisao_unidade as UnidadeDePrazo) || 'anos',
    indivisao_prorrogavel: row.indivisao_prorrogavel ?? false,
    indivisao_aviso_quantidade: str(row.indivisao_aviso_quantidade),
    indivisao_aviso_unidade: (row.indivisao_aviso_unidade as UnidadeDePrazo) || 'dias',
    regra_administracao: (row.regra_administracao as RegraAdministracao) || 'maioria',
    liquidacao_periodicidade: (row.liquidacao_periodicidade as LiquidacaoPeriodicidade) || 'mensal',
    liquidacao_numero_parcelas: str(row.liquidacao_numero_parcelas),
    estudo_fiscal_documento_id: row.estudo_fiscal_documento_id,
    documento_comprobatorio_id: row.documento_comprobatorio_id,
    partes: [...partes]
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => ({
        id: proximoIdLocal('parte'),
        rowId: p.id,
        pessoa_id: p.pessoa_id,
        papel: p.papel as PapelDaParte,
        fracao: str(p.fracao),
        ordem: p.ordem,
      })),
    imoveis: [...imoveis]
      .sort((a, b) => a.ordem - b.ordem)
      .map((i) => ({
        id: proximoIdLocal('imovel'),
        rowId: i.id,
        matricula_id: i.matricula_id,
        area_explorada: str(i.area_explorada),
        area_unidade: i.area_unidade,
        ordem: i.ordem,
        origem_tipo: (i.origem_tipo as OrigemTipo) ?? '',
        origem_exploracao_rural_id: i.origem_exploracao_rural_id,
        origem_externa_local_id: i.origem_externa_id
          ? localPorRowId.get(i.origem_externa_id) ?? null
          : null,
        origem_contraparte_pessoa_id: i.origem_contraparte_pessoa_id,
      })),
    origens: origensDraft,
  };
}

// ── Saída para o banco ──────────────────────────────────────────────────────────

const texto = (v: string): string | null => (v.trim() ? v.trim() : null);
const numero = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};
const inteiro = (v: string): number | null => {
  const n = numero(v);
  return n == null ? null : Math.trunc(n);
};

type ExploracaoRuralInsert = Database['public']['Tables']['exploracao_rural']['Insert'];

/**
 * Cabeçalho do instrumento, pronto para `insert`/`update`.
 *
 * Campo que só existe num tipo sai `null` no outro — e isso é deliberado: trocar
 * parceria por composse na tela não pode deixar percentual de parceria gravado numa
 * composse, porque o gerador leria os dois e o texto sairia com cláusula que o
 * instrumento não tem.
 */
export function draftParaCabecalho(
  draft: DraftExploracaoRural,
  clienteId: string,
): ExploracaoRuralInsert {
  const parceria = draft.tipo_exploracao === 'parceria';
  const composse = draft.tipo_exploracao === 'composse';
  return {
    cliente_id: clienteId,
    tipo_exploracao: draft.tipo_exploracao,
    referencia: texto(draft.referencia),
    outorgante_pessoa_id: draft.outorgante_pessoa_id,
    // Só a parceria tem outorgante; na composse os compossuidores já são donos da
    // posse, e gravar capital de outorgante ali seria dado sem sujeito.
    outorgante_capital_social_na_assinatura:
      parceria ? numero(draft.outorgante_capital_social_na_assinatura) : null,
    data_assinatura: texto(draft.data_assinatura),
    data_encerramento: parceria ? texto(draft.data_encerramento) : null,
    data_inicio_vigencia: parceria ? texto(draft.data_inicio_vigencia) : null,
    vigencia_prorrogavel: parceria ? draft.vigencia_prorrogavel : false,
    percentual_outorgante: parceria ? numero(draft.percentual_outorgante) : null,
    percentual_explorador: parceria ? numero(draft.percentual_explorador) : null,
    culturas: texto(draft.culturas),
    inclui_pecuaria: draft.inclui_pecuaria,
    // Modalidade só existe na parceria (é a Cláusula Quinta dela) e só faz sentido
    // com pecuária ligada: desligar o interruptor limpa a escolha, senão o contrato
    // guardaria uma forma de medir gado que ele não explora. Mesma regra dos campos
    // que a composse não leva.
    //
    pecuaria_modalidades:
      parceria && draft.inclui_pecuaria ? draft.pecuaria_modalidades : [],
    permite_penhor: draft.permite_penhor,
    prazo_indivisao_quantidade: composse ? inteiro(draft.prazo_indivisao_quantidade) : null,
    prazo_indivisao_unidade: composse ? draft.prazo_indivisao_unidade : null,
    indivisao_prorrogavel: composse ? draft.indivisao_prorrogavel : null,
    indivisao_aviso_quantidade: composse ? inteiro(draft.indivisao_aviso_quantidade) : null,
    indivisao_aviso_unidade: composse ? draft.indivisao_aviso_unidade : null,
    regra_administracao: composse ? draft.regra_administracao : null,
    liquidacao_periodicidade: composse ? draft.liquidacao_periodicidade : null,
    liquidacao_numero_parcelas: composse ? inteiro(draft.liquidacao_numero_parcelas) : null,
    estudo_fiscal_documento_id: draft.estudo_fiscal_documento_id,
    documento_comprobatorio_id: draft.documento_comprobatorio_id,
  };
}

/**
 * Partes prontas para gravar. Fração só sobrevive no compossuidor — o `CHECK`
 * `papel = 'compossuidor' or fracao is null` recusaria o resto, e mandar o banco
 * recusar o que a aplicação já sabe é erro de mensagem, não de dado.
 */
export function draftParaPartes(draft: DraftExploracaoRural) {
  return draft.partes
    .filter((p) => p.pessoa_id)
    .map((p, indice) => ({
      id: p.rowId ?? undefined,
      pessoa_id: p.pessoa_id as string,
      papel: p.papel,
      fracao: p.papel === 'compossuidor' ? numero(p.fracao) : null,
      ordem: indice,
    }));
}

/**
 * Imóveis prontos para gravar. `origem_externa_local_id` ainda é id LOCAL: quem
 * traduz para o `id` real é a gravação, depois de inserir as origens — por isso a
 * chave sai com o nome `origemExternaLocalId` e não com o nome da coluna.
 */
export function draftParaImoveis(draft: DraftExploracaoRural) {
  // A ORIGEM SÓ EXISTE NA COMPOSSE. Confirmado pela OSG em 19/08/2026, sobre este
  // exato campo: "pra parceria não, só pra composse". O motivo é a natureza da
  // parceria — ela recai sobre os imóveis da própria outorgante, que já é quem tem a
  // posse, então não há de onde a posse vir.
  //
  // Zerar aqui, e não só esconder na tela, pela mesma razão do cabeçalho: trocar
  // composse por parceria não pode deixar origem gravada, senão o gerador leria uma
  // cláusula que aquele instrumento não tem.
  const composse = draft.tipo_exploracao === 'composse';
  return draft.imoveis
    .filter((i) => i.matricula_id)
    .map((i, indice) => ({
      id: i.rowId ?? undefined,
      matricula_id: i.matricula_id as string,
      area_explorada: numero(i.area_explorada),
      area_unidade: i.area_unidade,
      ordem: indice,
      origem_tipo: composse ? i.origem_tipo || null : null,
      origem_exploracao_rural_id: composse ? i.origem_exploracao_rural_id : null,
      origemExternaLocalId: composse ? i.origem_externa_local_id : null,
      origem_contraparte_pessoa_id: composse ? i.origem_contraparte_pessoa_id : null,
    }));
}

/** Origens externas prontas para gravar, com o id local preservado para a ligação. */
export function draftParaOrigens(draft: DraftExploracaoRural) {
  // Só as origens de fato referenciadas por algum imóvel: uma origem digitada e
  // depois desvinculada não deve virar linha órfã.
  const usadas = new Set(draft.imoveis.map((i) => i.origem_externa_local_id).filter(Boolean));
  return draft.origens
    .filter((o) => usadas.has(o.id))
    .map((o) => ({
      localId: o.id,
      id: o.rowId ?? undefined,
      titulo_instrumento: texto(o.titulo_instrumento),
      data_assinatura: texto(o.data_assinatura),
      outorgante_pessoa_id: o.outorgante_pessoa_id,
      outorgante_capital_social_na_assinatura: numero(o.outorgante_capital_social_na_assinatura),
      outorgante_representante: texto(o.outorgante_representante),
    }));
}
