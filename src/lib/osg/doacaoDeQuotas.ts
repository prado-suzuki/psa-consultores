import { problemaDoMovimento, type MovimentoDeQuotas } from './movimentoQuotas';
import {
  montarUsufruto,
  type ConcessaoDeUsufruto,
  type LinhaDoUsufruto,
  type ParticipanteDoUsufruto,
  type TotaisDoUsufruto,
} from './usufrutoDoAto';

// A DOAÇÃO DE QUOTAS COM RESERVA DE USUFRUTO: o ato que os fundadores da
// holding praticam quando passam as quotas aos filhos e guardam o comando.
//
// É um macro, como a subida das quotas (subidaDeQuotas.ts): dado quem doa,
// para quem e quanto, tudo o mais se deriva. A 3ª alteração da MMS Participações
// é o caso de referência: o casal doa a totalidade às duas filhas (quatro pares
// doador → donatária), cada doador reserva para si o usufruto vitalício do que
// doou, inclusive o voto, e as quotas saem gravadas com inalienabilidade,
// impenhorabilidade, incomunicabilidade e reversibilidade. Os doadores zeram e
// retiram-se do quadro; seguem votando 100%.
//
// O que este módulo produz é o PLANO: os lançamentos de `doacao` no livro (um
// por par), o ônus que cada um cria (`onus_quotas`), o quadro resultante, quem
// sai e quem entra, e a tabela de usufruto e voto que a peça publica na cláusula
// de nua-propriedade. Tudo puro, para a tela acusar o problema antes de gravar
// e para o teste travar a aritmética.
//
// Três regras vêm dos instrumentos, e não de opinião:
//   1. a ORIGEM (legítima/disponível) se divide em metades, e a sobra da quota
//      ímpar fica na legítima (MMS 3ª: 3.149.048 legítima, 3.149.047 disponível);
//   2. a reserva é do DOADOR, e o donatário não usufrui o que recebeu: quem
//      recebe fica com a nua propriedade;
//   3. sem usufruto e sem gravame não há ônus, e a doação é uma cessão gratuita
//      simples, que o livro já sabia registrar. O plano continua válido, só sem
//      linha de ônus.

export type Gravame = 'inalienabilidade' | 'impenhorabilidade' | 'incomunicabilidade' | 'reversibilidade';

export interface FormaDoGravame {
  label: string;
  /** Uma frase, para a tela, sobre o que o gravame impede. */
  descricao: string;
  /** Entra ligado por padrão: o núcleo estável dos precedentes recentes. */
  padrao: boolean;
}

/**
 * Os quatro gravames que a Biblioteca sabe escrever. Espelha o
 * `onus_quotas_gravames_check`: mexer aqui sem mexer na constraint faz a
 * gravação falhar com erro de check.
 *
 * "Indisponibilidade" (tríade de 2016) fica de fora de propósito: serve para
 * ler o passivo herdado, nunca para gravar ônus novo.
 */
export const GRAVAMES: Record<Gravame, FormaDoGravame> = {
  inalienabilidade: {
    label: 'Inalienabilidade',
    descricao: 'O donatário não pode vender nem ceder as quotas.',
    padrao: true,
  },
  impenhorabilidade: {
    label: 'Impenhorabilidade',
    descricao: 'As quotas não respondem por dívidas do donatário.',
    padrao: true,
  },
  incomunicabilidade: {
    label: 'Incomunicabilidade',
    descricao: 'As quotas não entram na comunhão do casamento do donatário.',
    padrao: true,
  },
  reversibilidade: {
    label: 'Reversibilidade',
    descricao: 'Se o donatário morrer antes do doador, as quotas voltam ao doador.',
    padrao: false,
  },
};

export const TODOS_OS_GRAVAMES = Object.keys(GRAVAMES) as Gravame[];
export const GRAVAMES_PADRAO = TODOS_OS_GRAVAMES.filter((g) => GRAVAMES[g].padrao);

/** De onde saem as quotas doadas, no patrimônio do doador. */
export interface OrigemDaDoacao {
  legitima: number;
  disponivel: number;
}

/**
 * Metade legítima, metade disponível, sobra na legítima. É a regra dos
 * instrumentos registrados (MMS 3ª, cláusulas segunda e terceira), fixada aqui
 * para o gerador ser consistente em vez de arredondar em silêncio.
 */
export function repartirOrigem(quotas: number): OrigemDaDoacao {
  const disponivel = Math.floor(quotas / 2);
  return { legitima: quotas - disponivel, disponivel };
}

/** Um par doador → donatário, como o consultor o descreve. */
export interface ParDaDoacao {
  doadorId: string;
  donatarioId: string;
  quotas: number;
  /** Nula quando o instrumento não declara a origem. */
  origem: OrigemDaDoacao | null;
}

export interface UsufrutoDaDoacao {
  /** O doador guarda uso, gozo (e voto) do que doou. */
  reservado: boolean;
  /**
   * Quem usufrui, por doador. Sempre inclui o próprio doador; o cônjuge entra
   * quando o instrumento o nomeia cousufrutuário (o casal em conjunto, com
   * acrescimento ao sobrevivente). Doador sem entrada usufrui sozinho.
   */
  usufrutuariosPorDoador: Readonly<Record<string, readonly string[]>>;
  /** O usufruto alcança o voto (art. 114 da Lei 6.404/76 via art. 1.053 do CC). */
  comVoto: boolean;
}

/** Um sócio do quadro atual, com o saldo de onde a doação sai. */
export interface SocioQueDoa {
  pessoaId: string;
  denominacao: string;
  quotas: number;
}

export interface ArgsDaDoacao {
  empresaPessoaId: string;
  /** Quadro atual da empresa (saldo). */
  quadro: readonly SocioQueDoa[];
  /** Nome de toda pessoa citada (doadores, donatários, usufrutuários). */
  nomes: ReadonlyMap<string, string>;
  pares: readonly ParDaDoacao[];
  usufruto: UsufrutoDaDoacao;
  gravames: readonly Gravame[];
  /** Data do instrumento particular de doação (yyyy-mm-dd), se conhecida. */
  dataInstrumento: string | null;
  /** Data do ato societário (yyyy-mm-dd). A mesma em todos os lançamentos. */
  dataMovimento: string | null;
}

/** O movimento de doação com o que ele declara sobre si (colunas da doação). */
export interface MovimentoDeDoacao extends MovimentoDeQuotas {
  tipo: 'doacao';
  origemPessoaId: string;
  destinoPessoaId: string;
  quotasLegitima: number | null;
  quotasDisponivel: number | null;
  instrumentoData: string | null;
}

/** O ônus que um lançamento cria, na forma da tabela `onus_quotas`. */
export interface OnusProposto {
  nuProprietarioId: string;
  usufrutuarioIds: string[];
  usufrutoOrigem: 'reserva' | null;
  comVoto: boolean;
  quotas: number;
  gravames: Gravame[];
}

export interface LancamentoDaDoacao {
  /** Nome de quem entra na trilha de auditoria: o donatário. */
  denominacao: string;
  movimento: MovimentoDeDoacao;
  /** Nulo quando a doação não reserva usufruto nem grava as quotas. */
  onus: OnusProposto | null;
}

export interface QuadroDaDoacao {
  linhas: LinhaDoUsufruto[];
  totais: TotaisDoUsufruto;
}

export interface PlanoDaDoacao {
  /** Na ordem dos pares, que é a ordem das cláusulas do instrumento. */
  lancamentos: LancamentoDaDoacao[];
  /** Por que o plano NÃO pode ser gravado, ou null. Uma frase para a tela. */
  problema: string | null;
  /** O que o consultor precisa saber antes de gravar, sem impedir. */
  avisos: string[];
  quadroResultante: SocioQueDoa[];
  /** Doadores que zeram: retiram-se do quadro (e seguem como usufrutuários). */
  retirantes: string[];
  /** Donatários que não estavam no quadro: sócios ingressantes. */
  ingressantes: string[];
  /**
   * A tabela de usufruto e voto DEPOIS do ato (a cláusula de nua-propriedade).
   * Nula quando nenhum par reserva usufruto: sem concessão não há o que separar.
   */
  usufruto: QuadroDaDoacao | null;
}

const inteiro = (v: number) => v.toLocaleString('pt-BR');

function nomeDe(nomes: ReadonlyMap<string, string>, id: string): string {
  return nomes.get(id) ?? id;
}

/** Quem usufrui o que este doador doou: ele mesmo, mais quem o instrumento nomear. */
export function usufrutuariosDe(usufruto: UsufrutoDaDoacao, doadorId: string): string[] {
  const extras = usufruto.usufrutuariosPorDoador[doadorId] ?? [];
  return [...new Set([doadorId, ...extras])];
}

/**
 * Monta os lançamentos, confere a aritmética e diz o que a tela deve mostrar
 * antes de gravar. Puro: não toca no banco.
 */
export function planejarDoacaoDeQuotas(args: ArgsDaDoacao): PlanoDaDoacao {
  const { empresaPessoaId, quadro, nomes, pares, usufruto, gravames, dataInstrumento, dataMovimento } = args;

  const vazio: PlanoDaDoacao = {
    lancamentos: [],
    problema: null,
    avisos: [],
    quadroResultante: quadro.map((s) => ({ ...s })),
    retirantes: [],
    ingressantes: [],
    usufruto: null,
  };

  const validos = pares.filter((p) => p.doadorId || p.donatarioId || p.quotas > 0);
  if (validos.length === 0) {
    return { ...vazio, problema: 'Informe ao menos um par doador → donatário.' };
  }

  // O saldo é consumido par a par: dois pares do mesmo doador não podem, juntos,
  // passar do que ele tem, e `problemaDoMovimento` só enxerga um movimento.
  const saldo = new Map(quadro.map((s) => [s.pessoaId, s.quotas]));
  const lancamentos: LancamentoDaDoacao[] = [];
  const onusDoCatalogo = [...new Set(gravames)];

  for (const [i, par] of validos.entries()) {
    const movimento: MovimentoDeDoacao = {
      tipo: 'doacao',
      origemPessoaId: par.doadorId,
      destinoPessoaId: par.donatarioId,
      quotas: par.quotas,
      dataMovimento,
      sequencia: i + 1,
      quotasLegitima: par.origem?.legitima ?? null,
      quotasDisponivel: par.origem?.disponivel ?? null,
      instrumentoData: dataInstrumento,
    };
    const problema = problemaDoMovimento(movimento, saldo, empresaPessoaId);
    if (problema) {
      return { ...vazio, problema: `Par ${i + 1}: ${problema}` };
    }
    if (par.origem) {
      const { legitima, disponivel } = par.origem;
      if (!Number.isInteger(legitima) || !Number.isInteger(disponivel) || legitima < 0 || disponivel < 0) {
        return { ...vazio, problema: `Par ${i + 1}: a origem (legítima e disponível) precisa ser em quotas inteiras, sem negativo.` };
      }
      if (legitima + disponivel !== par.quotas) {
        return {
          ...vazio,
          problema: `Par ${i + 1}: legítima (${inteiro(legitima)}) e disponível (${inteiro(disponivel)}) somam ${inteiro(legitima + disponivel)}, não as ${inteiro(par.quotas)} quotas doadas.`,
        };
      }
    }
    saldo.set(par.doadorId, (saldo.get(par.doadorId) ?? 0) - par.quotas);

    let onus: OnusProposto | null = null;
    const usufrutuarios = usufruto.reservado ? usufrutuariosDe(usufruto, par.doadorId) : [];
    if (usufrutuarios.includes(par.donatarioId)) {
      return {
        ...vazio,
        problema: `Par ${i + 1}: ${nomeDe(nomes, par.donatarioId)} não pode usufruir as quotas que recebe; quem recebe fica com a nua propriedade.`,
      };
    }
    if (usufrutuarios.some((id) => id === empresaPessoaId)) {
      return { ...vazio, problema: `Par ${i + 1}: a empresa não pode ser usufrutuária das próprias quotas.` };
    }
    if (usufrutuarios.length > 0 || onusDoCatalogo.length > 0) {
      onus = {
        nuProprietarioId: par.donatarioId,
        usufrutuarioIds: usufrutuarios,
        usufrutoOrigem: usufrutuarios.length > 0 ? 'reserva' : null,
        comVoto: usufrutuarios.length > 0 && usufruto.comVoto,
        quotas: par.quotas,
        gravames: onusDoCatalogo,
      };
    }
    lancamentos.push({ denominacao: nomeDe(nomes, par.donatarioId), movimento, onus });
  }

  // O quadro depois do ato: quem zerou sai, quem não estava entra.
  const antes = new Set(quadro.map((s) => s.pessoaId));
  const resultante = new Map<string, SocioQueDoa>(quadro.map((s) => [s.pessoaId, { ...s }]));
  for (const { movimento } of lancamentos) {
    const doador = resultante.get(movimento.origemPessoaId)!;
    doador.quotas -= movimento.quotas;
    const donatario = resultante.get(movimento.destinoPessoaId)
      ?? { pessoaId: movimento.destinoPessoaId, denominacao: nomeDe(nomes, movimento.destinoPessoaId), quotas: 0 };
    donatario.quotas += movimento.quotas;
    resultante.set(donatario.pessoaId, donatario);
  }
  const quadroResultante = [...resultante.values()].filter((s) => s.quotas > 0);
  const noFim = new Set(quadroResultante.map((s) => s.pessoaId));
  const retirantes = [...new Set(lancamentos.map((l) => l.movimento.origemPessoaId))].filter((id) => !noFim.has(id));
  const ingressantes = [...new Set(lancamentos.map((l) => l.movimento.destinoPessoaId))].filter((id) => !antes.has(id));

  const avisos: string[] = [];
  if (retirantes.length > 0) {
    avisos.push(
      `${retirantes.map((id) => nomeDe(nomes, id)).join(' e ')} ${retirantes.length === 1 ? 'doa' : 'doam'} a totalidade das quotas e ${retirantes.length === 1 ? 'retira-se' : 'retiram-se'} do quadro societário.`
      + (usufruto.reservado && usufruto.comVoto
        ? ' Como usufrutuário(a), continua votando e assinando o instrumento.'
        : ''),
    );
  }
  if (ingressantes.length > 0) {
    avisos.push(`${ingressantes.map((id) => nomeDe(nomes, id)).join(' e ')} ${ingressantes.length === 1 ? 'ingressa' : 'ingressam'} na sociedade.`);
  }
  if (!usufruto.reservado && onusDoCatalogo.length === 0) {
    avisos.push('Sem reserva de usufruto e sem gravame: é uma doação simples, e nenhum ônus fica sobre as quotas.');
  }
  if (usufruto.reservado && !usufruto.comVoto) {
    avisos.push('Usufruto sem o voto: os usufrutuários recebem os frutos, mas quem vota é o donatário.');
  }
  if (lancamentos.some((l) => l.movimento.quotasLegitima === null)) {
    avisos.push('Origem não declarada: a cláusula não dirá quanto saiu da legítima e quanto da disponível.');
  }

  return {
    lancamentos,
    problema: null,
    avisos,
    quadroResultante,
    retirantes,
    ingressantes,
    usufruto: quadroDoUsufruto(quadroResultante, lancamentos, nomes),
  };
}

/**
 * A tabela de usufruto e voto depois do ato, a mesma que a cláusula de
 * nua-propriedade publica: cada quota vota uma vez, ou pela plena de quem a
 * tem, ou pelo usufruto de quem a usufrui. Nula sem concessão nenhuma.
 */
export function quadroDoUsufruto(
  quadroResultante: readonly SocioQueDoa[],
  lancamentos: readonly LancamentoDaDoacao[],
  nomes: ReadonlyMap<string, string>,
): QuadroDaDoacao | null {
  const concessoes: ConcessaoDeUsufruto[] = lancamentos
    .filter((l) => l.onus && l.onus.usufrutuarioIds.length > 0)
    .map((l) => ({
      deId: l.onus!.nuProprietarioId,
      paraIds: l.onus!.usufrutuarioIds,
      quotas: BigInt(l.movimento.quotas),
      origem: 'reserva' as const,
      comVoto: l.onus!.comVoto,
    }));
  if (concessoes.length === 0) return null;
  return montarQuadroDeVoto(quadroResultante, concessoes, nomes);
}

/**
 * O quadro de voto de uma sociedade dado o saldo e as concessões vigentes.
 * Usufrutuário sem quota (o doador que zerou, o cônjuge) entra com zero e vota
 * pelo que usufrui. Serve à tela do quadro societário e ao plano da doação.
 */
export function montarQuadroDeVoto(
  quadro: readonly SocioQueDoa[],
  concessoes: readonly ConcessaoDeUsufruto[],
  nomes: ReadonlyMap<string, string>,
): QuadroDaDoacao {
  const participantes: ParticipanteDoUsufruto[] = quadro.map((s) => ({
    pessoaId: s.pessoaId,
    nome: s.denominacao,
    quotas: BigInt(s.quotas),
  }));
  const presentes = new Set(participantes.map((p) => p.pessoaId));
  for (const c of concessoes) {
    for (const id of [c.deId, ...c.paraIds]) {
      if (presentes.has(id)) continue;
      presentes.add(id);
      participantes.push({ pessoaId: id, nome: nomeDe(nomes, id), quotas: 0n });
    }
  }
  const capital = participantes.reduce((s, p) => s + p.quotas, 0n);
  const { linhas, totais } = montarUsufruto({ participantes, concessoes: [...concessoes], capital });
  return { linhas, totais };
}

/** A frase que nomeia o ato para o consultor (vira a procedência no quadro). */
export function descricaoDaDoacao(plano: PlanoDaDoacao, nomes: ReadonlyMap<string, string>): string {
  const doadores = [...new Set(plano.lancamentos.map((l) => l.movimento.origemPessoaId))].map((id) => nomeDe(nomes, id));
  const donatarios = [...new Set(plano.lancamentos.map((l) => l.movimento.destinoPessoaId))].map((id) => nomeDe(nomes, id));
  const total = plano.lancamentos.reduce((s, l) => s + l.movimento.quotas, 0);
  const comReserva = plano.lancamentos.some((l) => (l.onus?.usufrutuarioIds.length ?? 0) > 0);
  return `Doação de ${inteiro(total)} quotas de ${doadores.join(' e ')} para ${donatarios.join(' e ')}`
    + (comReserva ? ', com reserva de usufruto' : '');
}
