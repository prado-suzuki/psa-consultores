import { avaliarTravaDoConstitutivo, type SociedadeDoConstitutivo } from './travaDoConstitutivo';
import { avaliarTravaDaSucessao, type SucessorDaPeca } from './travaDaSucessao';

// A máquina de estados do fluxo societário, que até aqui existia só espalhada:
// `papelDaRaiz` sabia do constitutivo, `useDocumentoSucessor` sabia da sucessão,
// o controller sabia do erro de composição, e nenhuma das três sabia da outra
// nem sabia responder "em que estado esta sociedade está".
//
// Aqui ela responde as duas coisas de uma vez: o ESTADO da peça da vez e, para
// cada GESTO, `{ liberado, motivo }`. As travas já escritas não foram
// reimplementadas, viraram casos deste módulo: `avaliarTravaDoConstitutivo` e
// `avaliarTravaDaSucessao` continuam sendo quem decide, e continuam sendo as
// mesmas funções que os hooks releem no instante de gravar.
//
// Fora daqui, de propósito: `avaliarTravaDaSubida`. Ela é o padrão-ouro do
// repositório, já é pura+dupla duas vezes, e a pergunta dela é sobre DUAS
// sociedades ao mesmo tempo, não sobre a peça da vez desta tela.

/** A decisão e a frase, juntas. É o formato de toda trava de ordem. */
export interface Trava {
  liberado: boolean;
  /** Título curto (o toast precisa de um); null quando liberado. */
  titulo: string | null;
  /** O que falta, por extenso, para tooltip e toast; null quando liberado. */
  motivo: string | null;
}

/**
 * Em que ponto do fluxo a peça da vez está. Segue o diagrama do plano
 * `blindagem-ordem-do-fluxo`, com um nome para cada caixa.
 */
export type EstadoDaSociedade =
  /** Modelo de escopo avulso: não é peça de sociedade, e a ordem não se aplica. */
  | 'peca-avulsa'
  /** Nenhuma peça ainda: a que nascer daqui é a constituição. */
  | 'sem-peca'
  | 'constitutivo-em-rascunho'
  /** Peça registrada na junta, e nada em curso a partir dela. */
  | 'registrada'
  /** Peça registrada que JÁ foi substituída por outra. */
  | 'sucedida'
  /** O assistente foi respondido: a alteração compõe ao vivo e ainda não existe. */
  | 'alteracao-em-composicao'
  | 'alteracao-em-rascunho';

/** Os gestos da tela de geração que a ordem do fluxo governa. */
export type GestoDaPeca = 'validar' | 'atualizarDoCadastro' | 'registrar' | 'gerarAlteracao';

export interface FatosDaPeca {
  /** A sociedade do contrato (pessoaId null em peça sem empresa). */
  sociedade: SociedadeDoConstitutivo;
  /** O modelo é de escopo `sociedade`. */
  ehSocietario: boolean;
  /** Status da peça na cabeça da tela; null quando ainda não há nenhuma. */
  statusDaPeca: string | null;
  /** Papel carimbado na cabeça (`constitutivo` | `alterador`), quando há. */
  papelDaPeca: string | null;
  /** `pj_pessoa_id` das sociedades com constitutivo REGISTRADO. */
  constitutivosRegistrados: ReadonlySet<string>;
  /**
   * A peça que já sucede a base, quando ela não é a própria peça da tela. Quem
   * chama é responsável por essa exclusão: o sucessor de uma peça base É a
   * alteração em cena depois de validada, e travar por causa dela travaria o
   * gesto que a criou.
   */
  sucessorDaBase: SucessorDaPeca | null;
  /** Há respostas de evento ancoradas na peça registrada. */
  alteracaoEmCurso: boolean;
  /**
   * Existe uma peça REGISTRADA de onde a alteração nasce: a que está em cena, ou
   * a que a alteração em rascunho declara substituir. Sem ela não há o que
   * alterar, e é o que separa "gerar alteração" de "rever os eventos da minha".
   */
  temBaseRegistrada: boolean;
  /** A folha não compõe (placeholder órfão, âncora sem alvo), ou null. */
  erroDeComposicao: string | null;
}

const LIBERADO: Trava = { liberado: true, titulo: null, motivo: null };
const travar = (titulo: string, motivo: string): Trava => ({ liberado: false, titulo, motivo });

const ERRO_TITULO = 'A folha está em erro de composição';
/**
 * O que o erro de composição custa em cada gesto. Os três selam (congelam o
 * snapshot), e por isso a frase muda só no verbo: o estrago é o mesmo, uma
 * versão que guarda um texto que não existe.
 */
const AVISO_DO_ERRO: Record<GestoDaPeca, string | null> = {
  validar: 'Conserte antes de validar: selar uma folha em erro grava um documento que não existe como texto.',
  atualizarDoCadastro:
    'Conserte antes de atualizar: recongelar uma folha em erro grava um documento que não existe como texto.',
  registrar: 'Registrar é o gesto irreversível: ele carimba o ledger e vira o status dos bens.',
  // Responder o assistente não sela nada: ele grava as respostas, e quem congela
  // é o "Validar versão" seguinte, que já tem o porteiro.
  gerarAlteracao: null,
};

const PECA_REGISTRADA = travar(
  'A peça já foi registrada',
  'Esta peça está travada: ela já produziu efeito e não se reescreve. ' +
    'Para mudar a sociedade, gere uma alteração contratual a partir dela.',
);

const SEM_PECA_REGISTRADA = travar(
  'Ainda não há peça registrada',
  'A alteração contratual nasce de uma peça registrada na junta, e substitui aquela. ' +
    'Registre o contrato social antes de alterar a sociedade.',
);

const NAO_SOCIETARIA = travar(
  'Esta peça não é ato societário',
  'A junta comercial registra ato de sociedade. Este modelo é de escopo avulso: ' +
    'ele não se registra na junta nem se sucede por alteração contratual.',
);

export interface FluxoDaSociedade {
  estado: EstadoDaSociedade;
  travas: Record<GestoDaPeca, Trava>;
}

/** O estado da peça da vez, a partir dos fatos. */
function estadoDaPeca(fatos: FatosDaPeca): EstadoDaSociedade {
  if (!fatos.ehSocietario) return 'peca-avulsa';
  if (fatos.statusDaPeca == null) return 'sem-peca';
  if (fatos.alteracaoEmCurso) return 'alteracao-em-composicao';
  if (fatos.statusDaPeca === 'registrado') {
    return fatos.sucessorDaBase ? 'sucedida' : 'registrada';
  }
  return fatos.papelDaPeca === 'alterador' ? 'alteracao-em-rascunho' : 'constitutivo-em-rascunho';
}

/**
 * O estado da sociedade e a trava de cada gesto, numa leitura só.
 *
 * Pura: recebe os fatos já lidos e não vai ao banco. É isso que permite a tela e
 * o teste chamarem a MESMA função, e é o que os hooks releem gesto a gesto no
 * instante de gravar (a tela pode estar com dado velho).
 */
export function avaliarFluxoDaSociedade(fatos: FatosDaPeca): FluxoDaSociedade {
  const estado = estadoDaPeca(fatos);

  // As duas travas já escritas, avaliadas uma vez e reusadas pelos gestos que
  // dependem delas. Reimplementar a regra aqui é o que faria as duas divergirem.
  const doConstitutivo = avaliarTravaDoConstitutivo(fatos.sociedade, fatos.constitutivosRegistrados);
  const daSucessao = avaliarTravaDaSucessao(fatos.sucessorDaBase);

  const jaConstituida = travar('A sociedade já foi constituída', doConstitutivo.motivo ?? '');
  const jaSucedida = travar('Esta peça já tem alteração', daSucessao.motivo ?? '');

  const comErro = (gesto: GestoDaPeca, trava: Trava): Trava => {
    const aviso = AVISO_DO_ERRO[gesto];
    if (!fatos.erroDeComposicao || !aviso) return trava;
    // A razão de ORDEM vem primeiro, quando existe. Sobre uma peça registrada,
    // dizer "conserte a folha antes de validar" manda consertar algo que não
    // destravaria nada: validar ali está fechado porque a peça já valeu, e é
    // isso que o consultor precisa ler. O erro de composição é a razão de quem
    // PODERIA fazer o gesto e não pode por causa da folha.
    if (!trava.liberado) return trava;
    return travar(ERRO_TITULO, `${ERRO_TITULO}: ${fatos.erroDeComposicao}. ${aviso}`);
  };

  const validar = (): Trava => {
    if (estado === 'peca-avulsa' || estado === 'constitutivo-em-rascunho' || estado === 'alteracao-em-rascunho') {
      return LIBERADO;
    }
    // Validar sobre peça registrada não atualiza nada: sem head em rascunho, a
    // validação cria a RAIZ de uma linhagem nova, que nasce constitutivo.
    if (estado === 'registrada' || estado === 'sucedida') {
      return doConstitutivo.liberado ? PECA_REGISTRADA : jaConstituida;
    }
    if (estado === 'alteracao-em-composicao') {
      return daSucessao.liberado ? LIBERADO : jaSucedida;
    }
    // 'sem-peca': a raiz nasce constitutivo, e a sociedade se constitui uma vez.
    return doConstitutivo.liberado ? LIBERADO : jaConstituida;
  };

  const registrar = (): Trava => {
    if (estado === 'peca-avulsa') return NAO_SOCIETARIA;
    if (fatos.statusDaPeca !== 'rascunho') return PECA_REGISTRADA;
    // Rascunho de papel constitutivo com OUTRO constitutivo já na junta: é este
    // o gesto que o índice único barra.
    if (fatos.papelDaPeca === 'constitutivo' && !doConstitutivo.liberado) return jaConstituida;
    return LIBERADO;
  };

  const gerarAlteracao = (): Trava => {
    if (estado === 'peca-avulsa') return NAO_SOCIETARIA;
    if (!daSucessao.liberado) return jaSucedida;
    // Vale para os dois gestos que abrem o assistente: gerar a alteração sobre a
    // peça registrada em cena, e REVER os eventos da alteração já validada, cuja
    // base registrada só existe em `substitui_documento_id`. Travar o segundo
    // deixaria o consultor sem como corrigir uma resposta.
    if (!fatos.temBaseRegistrada) return SEM_PECA_REGISTRADA;
    return LIBERADO;
  };

  const atualizarDoCadastro = (): Trava =>
    fatos.statusDaPeca === 'rascunho' || estado === 'peca-avulsa' ? LIBERADO : PECA_REGISTRADA;

  return {
    estado,
    travas: {
      validar: comErro('validar', validar()),
      atualizarDoCadastro: comErro('atualizarDoCadastro', atualizarDoCadastro()),
      registrar: comErro('registrar', registrar()),
      gerarAlteracao: comErro('gerarAlteracao', gerarAlteracao()),
    },
  };
}

// --- A metade "avisar" ------------------------------------------------------
// Travar o estado inválido é metade do trabalho; a outra é a peça DIZER o que
// ela é. Foi a ausência disso que fez uma alteração com dois atos parecer que
// estava concatenando alterações, quando era uma peça só que nunca tinha sido
// registrada. Dois atos na mesma peça é legítimo (a 2ª alteração da MMS Agro
// publica aumento de capital e cessão no mesmo instrumento): declara-se, não se
// trava.

/** Como a peça se chama na tela, curto: "Contrato social", "1ª alteração". */
export function nomeDaPeca(numeroAlteracao: number): string {
  return numeroAlteracao >= 1 ? `${numeroAlteracao}ª alteração` : 'Contrato social';
}

const SITUACAO: Record<EstadoDaSociedade, string | null> = {
  'peca-avulsa': null,
  'sem-peca': 'ainda não validada',
  'constitutivo-em-rascunho': 'rascunho',
  'alteracao-em-rascunho': 'rascunho',
  'alteracao-em-composicao': 'em composição, ainda não validada',
  registrada: 'registrada na junta',
  sucedida: 'registrada na junta, já substituída',
};

export interface DeclaracaoDaPeca {
  peca: string;
  situacao: string;
  /** Atos pendentes que esta peça formaliza; 0 quando não formaliza nenhum. */
  atos: number;
  /** A linha pronta para a folha. */
  linha: string;
}

/**
 * Em que peça o consultor está, em que situação ela está e quantos atos
 * pendentes ela formaliza. Null em peça avulsa, que não tem vida societária a
 * declarar.
 *
 * A contagem de atos é omitida na peça já registrada: ela não está formalizando
 * nada, já formalizou.
 */
export function declararPeca(
  estado: EstadoDaSociedade,
  dados: { numeroAlteracao: number; atosAFormalizar: number },
): DeclaracaoDaPeca | null {
  const situacao = SITUACAO[estado];
  if (situacao == null) return null;

  const jaProduziuEfeito = estado === 'registrada' || estado === 'sucedida';
  const atos = jaProduziuEfeito ? 0 : dados.atosAFormalizar;
  const partes = [nomeDaPeca(dados.numeroAlteracao), situacao];
  if (atos > 0) {
    partes.push(`formalizando ${atos} ato${atos === 1 ? '' : 's'} pendente${atos === 1 ? '' : 's'}`);
  }
  return { peca: partes[0], situacao, atos, linha: partes.join(' · ') };
}
