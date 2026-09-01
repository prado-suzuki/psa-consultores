// O USUFRUTO DO ATO: quem concede o voto de quais quotas, e para quem.
//
// O DADO CENTRAL É A CONCESSÃO — "de X, tantas quotas, para Y". Todo o resto sai dela:
//
//   nua propriedade de X = quotas que X concedeu           (X tem, X não vota)
//   usufruto de Y        = quotas concedidas a Y           (Y não tem, Y vota)
//   propriedade plena    = quotas de X − nua de X          (X tem e vota)
//   voz e voto de X      = plena de X + usufruto de X
//
// Não há papel a escolher. "Instituinte" e "nu-proprietário" são CONSEQUÊNCIA de quem
// concedeu e de quem recebeu — pedir isso num campo era jargão para um dado que a
// própria concessão já responde.
//
// DUAS ORIGENS, e a diferença é fiscal, não estrutural:
//
//   RESERVA — vem da DOAÇÃO e é automática. O doador transmite a nua propriedade e
//             guarda uso, gozo e voto, então cada par doador → donatário da doação
//             gera uma concessão: o donatário concede de volta ao doador o voto do
//             que acabou de receber. Não é guia nova: é a natureza da guia da doação,
//             e o que muda é a base.
//   INSTITUIÇÃO — ato PRÓPRIO, guia própria, imposto próprio, e declarado à mão: quem
//             tem propriedade plena concede usufruto dela a alguém. A direção inverte
//             em relação à doação — na guia 338021 do Agro Aliança o doador declarante
//             é a FILHA e o beneficiário é o PAI.
//
// A instituição existe para COMPLEMENTAR a reserva quando ela não alcança o controle
// que o fundador quer manter:
//
//   quotas a conceder = (alvo de voto × capital) − quotas já sob usufruto
//
// Medido nos dois lados no Agro Aliança: 4.874.552 − 4.448.500 = 426.052 (projetado) e
// 4.874.550 − 3.589.803 = 1.284.747 (executado, GIA 338021, 13,44% do capital).
//
// Santa Terezinha e MMS não precisaram de instituição: nos dois o casal fundador
// detinha 100% da holding, então a reserva sobre o que doaram já devolve 100% do voto.
// A instituição aparece quando a participação do fundador é MENOR que o controle
// desejado — era 46,54% contra 51% no Agro Aliança.

/** De quem sai o voto, quanto, e para quem vai. */
/**
 * O PAPEL DE CADA UM NO ATO DE USUFRUTO, na mesma gramatica de Doador/Donatario da
 * doacao:
 *
 *   usufrui  - USUFRUTUARIO. Recebe uso, gozo e VOTO das quotas de outros. E dele o
 *              percentual-alvo de voz e voto, e e dele o nome que vai como
 *              beneficiario na guia.
 *   concede  - NU-PROPRIETARIO. Continua dono das quotas e passa o voto adiante. E
 *              dele o campo de quanto concede, e e dele a guia, porque instituir
 *              usufruto e ato tributado do proprietario.
 *
 * "Nu-proprietario" e o termo do instrumento: propriedade sem o uso - a casca. Nao ha
 * um terceiro papel: quem nao concede nada e nu-proprietario de zero quota, e continua
 * votando tudo o que tem.
 */
export type PapelDoUsufruto = 'usufrui' | 'concede';

export interface ConcessaoDeUsufruto {
  /** Quem fica com a quota e sem o voto. */
  deId: string;
  /**
   * Quem passa a usufruir. É LISTA porque o casal usufrui EM CONJUNTO: o direito não
   * se divide, e no falecimento de um acresce ao sobrevivente (art. 1.411 do Código
   * Civil). Cada um lê o bloco inteiro, e o total conta o bloco uma vez.
   */
  paraIds: string[];
  quotas: bigint;
  /** `reserva` vem da doação e é automática; `instituicao` é declarada. */
  origem: 'reserva' | 'instituicao';
}

export interface ParticipanteDoUsufruto {
  pessoaId: string;
  nome: string;
  /**
   * Quotas que a pessoa tem DEPOIS da doação — a participação final do quadro. É o
   * número que não muda: o usufruto reparte o VOTO dessas quotas, não as quotas.
   */
  quotas: bigint;
}

export interface LinhaDoUsufruto extends ParticipanteDoUsufruto {
  /** Quotas que ela tem e vota. */
  plena: bigint;
  /** Quotas que ela tem e não vota, porque concedeu o usufruto. */
  nua: bigint;
  /** Quotas de outros que ela usufrui. */
  usufruto: bigint;
  /** Quanto disso veio da reserva da doação — automático, sem campo. */
  nuaDeReserva: bigint;
  /** E quanto veio de instituição declarada. */
  nuaDeInstituicao: bigint;
  /** plena + usufruto. É o que vota. */
  vozEVoto: bigint;
  /** quotas ÷ capital, 4 casas — a participação societária, como no slide. */
  pctParticipacao: string;
  /** vozEVoto ÷ capital, 4 casas. */
  pctVozEVoto: string;
  /** Para quem ela concedeu, em nome, para a tela dizer sem consultar outra lista. */
  concedePara: string[];
}

export interface TotaisDoUsufruto {
  quotas: bigint;
  plena: bigint;
  nua: bigint;
  usufruto: bigint;
  /** Fecha com `quotas` sempre que a lista cobre todo o quadro. */
  vozEVoto: bigint;
  pctParticipacao: string;
  pctVozEVoto: string;
}

export interface ProblemaDoUsufruto {
  codigo: 'concede-mais-do-que-tem' | 'concessao-sem-destino';
  mensagem: string;
}

export interface EntradaDoUsufruto {
  participantes: ParticipanteDoUsufruto[];
  concessoes: ConcessaoDeUsufruto[];
  /** Universo de quotas da sociedade — divisor dos percentuais. */
  capital: bigint;
}

import { repartirProporcional } from './rateioDoAto';

const naoNegativo = (v: bigint) => (v > 0n ? v : 0n);
const br = (q: bigint) => q.toLocaleString('pt-BR');

/** Percentual com 4 casas, meio para cima, sem passar por `number`. */
function pct(parte: bigint, total: bigint): string {
  if (total <= 0n) return '0.0000';
  const escalado = (parte * 100n * 10_000n * 2n + total) / (total * 2n);
  const inteiro = escalado / 10_000n;
  return `${inteiro}.${(escalado % 10_000n).toString().padStart(4, '0')}`;
}

/**
 * O QUADRO DO USUFRUTO — as colunas da planilha de trabalho da OSG:
 *
 *   Pessoa · Quotas · Plena · Nua propriedade · Usufruto (voto) · % de voz e voto
 *
 * O total de voz e voto fecha o capital porque cada quota vota uma vez: ou pela plena
 * de quem a tem, ou pelo usufruto de quem a usufrui.
 */
export function montarUsufruto(entrada: EntradaDoUsufruto): {
  linhas: LinhaDoUsufruto[];
  totais: TotaisDoUsufruto;
  problemas: ProblemaDoUsufruto[];
} {
  const { participantes, concessoes, capital } = entrada;
  const nomeDe = new Map(participantes.map((p) => [p.pessoaId, p.nome]));
  const validas = concessoes.filter((c) => c.quotas > 0n);

  const linhas = participantes.map<LinhaDoUsufruto>((p) => {
    const dela = validas.filter((c) => c.deId === p.pessoaId);
    const paraEla = validas.filter((c) => c.paraIds.includes(p.pessoaId));
    const somar = (cs: ConcessaoDeUsufruto[]) => cs.reduce((a, c) => a + c.quotas, 0n);

    const nua = somar(dela);
    const usufruto = somar(paraEla);
    const plena = naoNegativo(p.quotas - nua);
    const vozEVoto = plena + usufruto;

    return {
      ...p,
      plena,
      nua,
      usufruto,
      nuaDeReserva: somar(dela.filter((c) => c.origem === 'reserva')),
      nuaDeInstituicao: somar(dela.filter((c) => c.origem === 'instituicao')),
      vozEVoto,
      pctParticipacao: pct(p.quotas, capital),
      pctVozEVoto: pct(vozEVoto, capital),
      concedePara: [...new Set(dela.flatMap((c) => c.paraIds))]
        .map((id) => nomeDe.get(id) ?? id),
    };
  });

  // O bloco concedido entra UMA vez, mesmo com dois usufrutuários: o direito é
  // conjunto, e somar por cabeça daria 151% num casal.
  const concedido = validas.reduce((a, c) => a + c.quotas, 0n);
  const plenaTotal = linhas.reduce((a, l) => a + l.plena, 0n);

  const totais: TotaisDoUsufruto = {
    quotas: linhas.reduce((a, l) => a + l.quotas, 0n),
    plena: plenaTotal,
    nua: linhas.reduce((a, l) => a + l.nua, 0n),
    usufruto: concedido,
    vozEVoto: plenaTotal + concedido,
    pctParticipacao: pct(linhas.reduce((a, l) => a + l.quotas, 0n), capital),
    pctVozEVoto: pct(plenaTotal + concedido, capital),
  };

  const problemas: ProblemaDoUsufruto[] = [];

  // Ninguém concede o voto de quota que não tem.
  const excedido = linhas.find((l) => l.nua > l.quotas);
  if (excedido) {
    problemas.push({
      codigo: 'concede-mais-do-que-tem',
      mensagem: `${excedido.nome} concede usufruto de ${br(excedido.nua)} quotas, mas tem `
        + `${br(excedido.quotas)}.`,
    });
  }

  // Concessão sem destino não existe: o voto tem de ficar com alguém.
  const semDestino = validas.find((c) => c.paraIds.length === 0);
  if (semDestino) {
    problemas.push({
      codigo: 'concessao-sem-destino',
      mensagem: `${nomeDe.get(semDestino.deId) ?? semDestino.deId} concede usufruto de `
        + `${br(semDestino.quotas)} quotas e ninguém foi escolhido para receber. Uso, `
        + 'gozo e voto têm de ficar com alguém.',
    });
  }

  return { linhas, totais, problemas };
}

/**
 * QUANTAS QUOTAS CONCEDER para o usufrutuário alcançar o alvo de voz e voto.
 *
 *   alvo em quotas    = percentual desejado × capital (meio para cima)
 *   quotas a conceder = alvo em quotas − quotas já sob usufruto dele
 *
 * Se a reserva da doação já alcança o alvo, o resultado é zero — é o caso do Santa
 * Terezinha e do MMS, onde o casal detinha 100% da holding.
 *
 * O percentual entra escalado em 4 casas (51% = 510000), que é a precisão da guia.
 */
export function quotasAInstituir(
  pctAlvoEscalado: bigint,
  capital: bigint,
  jaSobUsufruto: bigint,
): bigint {
  if (capital <= 0n || pctAlvoEscalado <= 0n) return 0n;
  const alvoEmQuotas = (pctAlvoEscalado * capital + 500_000n) / 1_000_000n;
  return naoNegativo(alvoEmQuotas - jaSobUsufruto);
}

/**
 * EDITAR UMA CONCESSÃO E REACOMODAR AS OUTRAS, mantendo o total.
 *
 * O percentual de voz e voto do usufrutuário é o TOTAL — é o que o cliente contratou
 * ("os fundadores ficam com 51%"). Quanto cada um concede é a DISTRIBUIÇÃO desse
 * total. São perguntas diferentes, e é por isso que zerar a concessão de uma filha
 * deve passar a parte dela para a outra, e não derrubar o percentual do pai.
 *
 * Sem isso, mexer numa linha mudava as duas coisas ao mesmo tempo: quem sai o usufruto
 * E quanto o fundador vota. Para mudar o total, o campo é o percentual da linha dele.
 *
 * Os outros são reacomodados PROPORCIONALMENTE ao que já tinham, para não apagar uma
 * distribuição escolhida antes: se duas estavam iguais, seguem iguais; se uma tinha o
 * dobro, segue com o dobro. Todos em zero divide igual — não há proporção a preservar.
 *
 * `novoValor` é aparado a [0, total]: pedir mais do que o total grava o total e zera os
 * outros.
 */
export function redistribuirConcessoes(
  atuais: Array<{ id: string; quotas: bigint }>,
  editadoId: string,
  novoValor: bigint,
  total: bigint,
): Map<string, bigint> {
  const resultado = new Map<string, bigint>();
  if (total < 0n) return resultado;

  const doEditado = novoValor < 0n ? 0n : (novoValor > total ? total : novoValor);
  const outros = atuais.filter((a) => a.id !== editadoId);

  // Concedente único fica com o total: não há com quem dividir, e aceitar menos
  // derrubaria o percentual do usufrutuário sem que ninguém pedisse.
  if (outros.length === 0) {
    resultado.set(editadoId, total);
    return resultado;
  }

  resultado.set(editadoId, doEditado);
  const soma = outros.reduce((a, o) => a + naoNegativo(o.quotas), 0n);
  const pesos = soma > 0n ? outros.map((o) => naoNegativo(o.quotas)) : outros.map(() => 1n);
  const fatias = repartirProporcional(total - doEditado, pesos);
  outros.forEach((o, i) => resultado.set(o.id, fatias[i]));
  return resultado;
}

/**
 * Como repartir uma instituição entre vários concedentes — e por que importa.
 *
 * A isenção de 500 UPF e as faixas de baixo contam POR BENEFICIÁRIO DE CADA GUIA, e
 * cada concedente emite a sua. Dividir derruba o imposto: no Cenário II do Agro
 * Aliança, 426.052 quotas divididas entre duas custaram R$ 3.433,84 contra R$ 9.411,28
 * numa só — 63% menos.
 *
 * Partes iguais, com o resto nos primeiros, uma quota cada: a soma fecha exata. É
 * palpite de partida; o analista edita quota por quota.
 */
export function repartirInstituicao(total: bigint, quantos: number): bigint[] {
  if (quantos <= 0 || total <= 0n) return new Array(Math.max(0, quantos)).fill(0n);
  const n = BigInt(quantos);
  const cota = total / n;
  const resto = total % n;
  return Array.from({ length: quantos }, (_, i) => cota + (BigInt(i) < resto ? 1n : 0n));
}
