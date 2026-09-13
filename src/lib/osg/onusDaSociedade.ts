import { GRAVAMES, type Gravame, type SocioQueDoa } from './doacaoDeQuotas';
import {
  conferirSomasDoUsufruto,
  montarUsufruto,
  type ConcessaoDeUsufruto,
  type LinhaDoUsufruto,
  type TotaisDoUsufruto,
} from './usufrutoDoAto';

// AS MUTAÇÕES DO ÔNUS QUE NÃO SÃO A DOAÇÃO.
//
// A doação cria ônus (doacaoDeQuotas.ts) e a consolidação o republica
// (mapearEstadoDosOnus). Faltam as duas pontas em que o ônus muda sem uma doação
// no meio, que são as variantes que o corpus mostra:
//
//   SUB-ROGAÇÃO — quota gravada muda de mão. O gravame não fica com quem cedeu,
//     porque ele é da QUOTA, não da pessoa: acompanha o bem. Sem isto, desfazer
//     o percurso de uma quota gravada produziria um contrato dizendo que fulano
//     tem quotas gravadas que ele já não tem, e que o adquirente tem quotas
//     livres que na verdade não pode alienar.
//
//   INSTITUIÇÃO AVULSA — ato PRÓPRIO, com guia própria: quem tem propriedade
//     plena concede o usufruto dela a alguém, e nenhuma quota muda de mão. É o
//     que a guia 338021 do Agro Aliança registra, e existe para COMPLEMENTAR a
//     reserva quando ela não alcança o controle que o fundador quer manter.
//
// Tudo puro: a tela acusa o problema antes de gravar, e o teste trava a regra.

/** Um ônus em vigor, como `onus_quotas` o guarda. */
export interface OnusVigente {
  id: string;
  nuProprietarioId: string;
  usufrutuarioIds: string[];
  usufrutoOrigem: 'reserva' | 'instituicao' | null;
  comVoto: boolean;
  quotas: number;
  gravames: Gravame[];
}

const inteiro = (v: number) => v.toLocaleString('pt-BR');
const nomeDe = (nomes: ReadonlyMap<string, string>, id: string) => nomes.get(id) ?? id;
const rotulo = (g: Gravame) => GRAVAMES[g]?.label.toLocaleLowerCase('pt-BR') ?? g;

// ---------------------------------------------------------------------------
// SUB-ROGAÇÃO: a quota gravada muda de mão e o ônus vai junto.
// ---------------------------------------------------------------------------

/** O movimento que desloca as quotas, no recorte que a sub-rogação precisa. */
export interface MovimentoQueDesloca {
  tipo: 'cessao' | 'doacao' | 'reducao';
  origemPessoaId: string;
  /** Nulo na redução: as quotas são canceladas, não vão para ninguém. */
  destinoPessoaId: string | null;
  quotas: number;
}

/** Uma linha de `onus_quotas` que nasce para o adquirente. */
export interface OnusSubrogado {
  /** Ônus de origem, para a trilha dizer de onde a linha veio. */
  deOnusId: string;
  nuProprietarioId: string;
  usufrutuarioIds: string[];
  usufrutoOrigem: 'reserva' | 'instituicao' | null;
  comVoto: boolean;
  quotas: number;
  gravames: Gravame[];
}

export interface PlanoDaSubrogacao {
  /**
   * As linhas que nascem, TODAS presas ao movimento que as criou: a parte que
   * foi para o adquirente e, quando a sub-rogação é parcial, a parte que ficou
   * com o cedente.
   *
   * Nasce tudo de novo em vez de encolher a linha antiga porque assim o
   * desfazer é sempre o mesmo gesto: o cascade leva estas, e o ônus antigo
   * volta a viger apagando o `extinto_em`. Encolher exigiria guardar o número
   * anterior em algum lugar para restaurá-lo depois.
   */
  novos: OnusSubrogado[];
  /** Ônus do cedente que a sub-rogação encerra. Sempre por inteiro. */
  extintos: string[];
  /** Quantas das quotas movidas estavam gravadas ou sob usufruto. */
  quotasOneradasQueSaem: number;
  /** Por que o movimento NÃO pode ser gravado como está, ou null. */
  problema: string | null;
  /** O que o consultor precisa saber antes de gravar, sem impedir. */
  avisos: string[];
}

const PLANO_VAZIO: PlanoDaSubrogacao = {
  novos: [], extintos: [], quotasOneradasQueSaem: 0, problema: null, avisos: [],
};

/**
 * O QUE ACONTECE COM O ÔNUS quando as quotas dele mudam de mão.
 *
 * A regra de qual quota sai é a única escolha real aqui, e ela é
 * **as livres primeiro**: mover quota gravada é o ato excepcional (a
 * inalienabilidade existe justamente para impedi-lo), então o plano só toca nas
 * oneradas quando o movimento é maior do que o saldo livre do cedente, e avisa
 * quando toca. O contrário (consumir as gravadas primeiro) faria uma cessão
 * pequena de quem tem quota livre disparar um alarme que não existe no mundo.
 *
 * Consome os ônus na ordem em que vieram, que é a de criação: o mais antigo é o
 * que a peça mais antiga publicou, e manter essa ordem faz o histórico ler na
 * mesma sequência dos instrumentos.
 */
export function planejarSubrogacao(args: {
  movimento: MovimentoQueDesloca;
  /** Ônus vigentes DA EMPRESA. Os de outras pessoas são ignorados. */
  onusVigentes: readonly OnusVigente[];
  /** Quotas que o cedente tem hoje (o saldo do quadro). */
  saldoDoCedente: number;
  nomes: ReadonlyMap<string, string>;
}): PlanoDaSubrogacao {
  const { movimento, onusVigentes, saldoDoCedente, nomes } = args;
  const doCedente = onusVigentes.filter((o) => o.nuProprietarioId === movimento.origemPessoaId);
  if (doCedente.length === 0 || movimento.quotas <= 0) return PLANO_VAZIO;

  const oneradas = doCedente.reduce((s, o) => s + o.quotas, 0);
  const livres = Math.max(0, saldoDoCedente - oneradas);
  const precisa = movimento.quotas - livres;
  if (precisa <= 0) return PLANO_VAZIO;

  const avisos: string[] = [];
  const novos: OnusSubrogado[] = [];
  const extintos: string[] = [];

  let falta = precisa;
  for (const onus of doCedente) {
    if (falta <= 0) break;
    const sai = Math.min(falta, onus.quotas);
    const fica = onus.quotas - sai;
    falta -= sai;

    extintos.push(onus.id);
    // Sub-rogação parcial: o que não saiu volta como linha nova do cedente,
    // presa ao mesmo movimento. Mesmo ônus, mesma pessoa, número menor.
    if (fica > 0) {
      novos.push({
        deOnusId: onus.id,
        nuProprietarioId: onus.nuProprietarioId,
        usufrutuarioIds: onus.usufrutuarioIds,
        usufrutoOrigem: onus.usufrutoOrigem,
        comVoto: onus.comVoto,
        quotas: fica,
        gravames: onus.gravames,
      });
    }

    if (!movimento.destinoPessoaId) continue;

    // O usufruto se extingue pela CONSOLIDAÇÃO quando a nua propriedade vai
    // parar nas mãos de quem já usufrui (art. 1.410, VI, do Código Civil): quem
    // passa a ter e a usufruir tem propriedade plena, e não ônus nenhum. O
    // gravame, esse, continua.
    const consolida = onus.usufrutuarioIds.includes(movimento.destinoPessoaId);
    if (consolida) {
      avisos.push(
        `${nomeDe(nomes, movimento.destinoPessoaId)} já usufrui estas quotas: recebendo a nua `
        + 'propriedade, o usufruto se extingue por consolidação (art. 1.410, VI, do Código Civil).',
      );
    }
    const usufrutuarioIds = consolida ? [] : onus.usufrutuarioIds;
    if (usufrutuarioIds.length === 0 && onus.gravames.length === 0) continue;

    novos.push({
      deOnusId: onus.id,
      nuProprietarioId: movimento.destinoPessoaId,
      usufrutuarioIds,
      usufrutoOrigem: usufrutuarioIds.length > 0 ? onus.usufrutoOrigem : null,
      comVoto: onus.comVoto,
      quotas: sai,
      gravames: onus.gravames,
    });
  }

  const gravamesTocados = [...new Set(
    doCedente.flatMap((o) => o.gravames),
  )];
  if (movimento.destinoPessoaId && gravamesTocados.length > 0) {
    avisos.push(
      `${inteiro(precisa)} quota(s) gravada(s) com ${gravamesTocados.map(rotulo).join(', ')} mudam de `
      + `titular: o gravame é da quota e acompanha ${nomeDe(nomes, movimento.destinoPessoaId)}.`,
    );
  }

  // A inalienabilidade impede a alienação, que é o ato ONEROSO. A transmissão
  // gratuita e o cancelamento não são alienação nesse sentido, e o acervo tem
  // cessão gratuita de quota gravada justamente por isso.
  const inalienavel = doCedente.some((o) => o.gravames.includes('inalienabilidade'));
  const problema = inalienavel && movimento.tipo === 'cessao'
    ? `${nomeDe(nomes, movimento.origemPessoaId)} tem ${inteiro(oneradas)} quota(s) gravada(s) com `
      + `inalienabilidade, e a cessão onerosa alcançaria ${inteiro(precisa)} delas. Revogue o gravame `
      + 'antes, ou registre a transferência pelo título que o instrumento previu.'
    : null;

  return { novos, extintos, quotasOneradasQueSaem: precisa, problema, avisos };
}

// ---------------------------------------------------------------------------
// INSTITUIÇÃO AVULSA: o usufruto sem quota mudando de mão.
// ---------------------------------------------------------------------------

/** Quem concede o usufruto de quantas quotas, e a quem. */
export interface ParDaInstituicao {
  /** Quem tem a quota e passa a não votar por ela. */
  nuProprietarioId: string;
  /** Quem passa a usufruir. Lista, porque o casal usufrui em conjunto. */
  usufrutuarioIds: string[];
  quotas: number;
}

/** Uma linha de `onus_quotas` que a instituição cria. Sem movimento: nada se moveu. */
export interface OnusInstituido {
  nuProprietarioId: string;
  usufrutuarioIds: string[];
  usufrutoOrigem: 'instituicao';
  comVoto: boolean;
  quotas: number;
  gravames: Gravame[];
}

export interface PlanoDaInstituicao {
  /** Na ordem dos pares, que é a ordem das cláusulas do instrumento. */
  onus: OnusInstituido[];
  problema: string | null;
  avisos: string[];
  /** A tabela de usufruto e voto DEPOIS do ato. Nula sem par válido. */
  usufruto: { linhas: LinhaDoUsufruto[]; totais: TotaisDoUsufruto } | null;
}

/**
 * O PLANO DA INSTITUIÇÃO DE USUFRUTO AVULSA.
 *
 * Diferente da doação em três coisas, e as três importam:
 *
 *   1. nenhuma quota muda de mão, então não há lançamento no livro. O ato
 *      produz só linhas de `onus_quotas`, com `movimento_id` nulo;
 *   2. a direção inverte. Na reserva, quem doou guarda o voto; aqui quem TEM a
 *      quota entrega o voto a outra pessoa, por ato próprio e guia própria;
 *   3. o limite não é o saldo do quadro, é o saldo LIVRE: quota cujo voto já foi
 *      concedido não pode ser concedida de novo, e é o defeito que esta função
 *      existe para impedir. O saldo é consumido par a par, porque dois pares do
 *      mesmo concedente não podem, juntos, passar do que ele tem livre.
 */
export function planejarInstituicaoDeUsufruto(args: {
  empresaPessoaId: string;
  /** Quadro atual (saldo) da empresa. */
  quadro: readonly SocioQueDoa[];
  /** Ônus já vigentes: é deles que sai o que já está concedido. */
  onusVigentes: readonly OnusVigente[];
  nomes: ReadonlyMap<string, string>;
  pares: readonly ParDaInstituicao[];
  /** O usufruto alcança o voto (art. 114 da Lei 6.404/76 via art. 1.053 do CC). */
  comVoto: boolean;
  gravames?: readonly Gravame[];
}): PlanoDaInstituicao {
  const { empresaPessoaId, quadro, onusVigentes, nomes, pares, comVoto } = args;
  const gravames = [...(args.gravames ?? [])];
  const avisos: string[] = [];

  const saldo = new Map(quadro.map((s) => [s.pessoaId, s.quotas]));
  const jaConcedido = new Map<string, number>();
  for (const onus of onusVigentes) {
    if (onus.usufrutuarioIds.length === 0) continue;
    jaConcedido.set(
      onus.nuProprietarioId,
      (jaConcedido.get(onus.nuProprietarioId) ?? 0) + onus.quotas,
    );
  }

  const onus: OnusInstituido[] = [];
  let problema: string | null = null;
  /** Consumido par a par: o limite é do concedente, não de cada linha. */
  const consumido = new Map<string, number>();

  for (const [i, par] of pares.entries()) {
    const ordem = pares.length > 1 ? ` (par ${i + 1})` : '';
    const quem = nomeDe(nomes, par.nuProprietarioId);

    if (!par.nuProprietarioId) { problema ??= `Informe quem concede o usufruto${ordem}.`; continue; }
    if (par.usufrutuarioIds.length === 0) {
      problema ??= `Informe quem passa a usufruir as quotas de ${quem}${ordem}.`;
      continue;
    }
    if (par.usufrutuarioIds.includes(par.nuProprietarioId)) {
      problema ??= `${quem} não pode usufruir a própria quota${ordem}: isso é propriedade plena.`;
      continue;
    }
    if (par.nuProprietarioId === empresaPessoaId
      || par.usufrutuarioIds.includes(empresaPessoaId)) {
      problema ??= 'A empresa não figura no usufruto das próprias quotas.';
      continue;
    }
    if (!Number.isInteger(par.quotas) || par.quotas < 1) {
      problema ??= `A quantidade de quotas de ${quem}${ordem} precisa ser um inteiro maior que zero.`;
      continue;
    }

    const tem = saldo.get(par.nuProprietarioId) ?? 0;
    if (tem <= 0) { problema ??= `${quem} não tem quotas nesta empresa${ordem}.`; continue; }

    const livre = tem - (jaConcedido.get(par.nuProprietarioId) ?? 0)
      - (consumido.get(par.nuProprietarioId) ?? 0);
    if (par.quotas > livre) {
      problema ??= livre <= 0
        ? `${quem} já concedeu o usufruto de todas as ${inteiro(tem)} quotas que tem${ordem}.`
        : `${quem} tem ${inteiro(livre)} quota(s) com usufruto livre: não é possível instituir `
          + `sobre ${inteiro(par.quotas)}${ordem}.`;
      continue;
    }
    consumido.set(par.nuProprietarioId, (consumido.get(par.nuProprietarioId) ?? 0) + par.quotas);

    onus.push({
      nuProprietarioId: par.nuProprietarioId,
      usufrutuarioIds: [...par.usufrutuarioIds],
      usufrutoOrigem: 'instituicao',
      comVoto,
      quotas: par.quotas,
      gravames,
    });
  }

  if (pares.length === 0) problema ??= 'Nenhuma instituição de usufruto foi descrita.';
  if (problema) return { onus, problema, avisos, usufruto: null };

  // Quem entrega o voto de tudo o que tem deixa de votar. Não impede: é o
  // desenho do Agro Aliança, onde o fundador quis exatamente isso do outro lado.
  for (const [pessoaId, quotas] of consumido) {
    const tem = saldo.get(pessoaId) ?? 0;
    if (quotas + (jaConcedido.get(pessoaId) ?? 0) >= tem) {
      avisos.push(`${nomeDe(nomes, pessoaId)} fica sem voz e voto próprios: concedeu o usufruto de todas as quotas que tem.`);
    }
  }

  const usufruto = montarQuadroDepoisDaInstituicao({ quadro, onusVigentes, novos: onus, nomes });
  avisos.push(...conferirSomasDoUsufruto(
    usufruto.linhas, usufruto.totais, usufruto.totais.quotas,
  ).map((p) => p.mensagem));

  return { onus, problema: null, avisos, usufruto };
}

/**
 * A tabela de usufruto e voto como ela fica DEPOIS do ato: os ônus que já
 * vigiam mais os que a instituição cria. Quem só usufrui entra com zero quotas,
 * senão o voto dele não teria linha.
 */
function montarQuadroDepoisDaInstituicao(args: {
  quadro: readonly SocioQueDoa[];
  onusVigentes: readonly OnusVigente[];
  novos: readonly OnusInstituido[];
  nomes: ReadonlyMap<string, string>;
}): { linhas: LinhaDoUsufruto[]; totais: TotaisDoUsufruto } {
  const { quadro, onusVigentes, novos, nomes } = args;
  const concessoes: ConcessaoDeUsufruto[] = [
    ...onusVigentes.filter((o) => o.usufrutuarioIds.length > 0).map((o) => ({
      deId: o.nuProprietarioId,
      paraIds: o.usufrutuarioIds,
      quotas: BigInt(o.quotas),
      origem: o.usufrutoOrigem === 'instituicao' ? 'instituicao' as const : 'reserva' as const,
      comVoto: o.comVoto,
    })),
    ...novos.map((o) => ({
      deId: o.nuProprietarioId,
      paraIds: o.usufrutuarioIds,
      quotas: BigInt(o.quotas),
      origem: 'instituicao' as const,
      comVoto: o.comVoto,
    })),
  ];

  const participantes = quadro.map((s) => ({
    pessoaId: s.pessoaId,
    nome: s.denominacao || nomeDe(nomes, s.pessoaId),
    quotas: BigInt(s.quotas),
  }));
  const vistos = new Set(participantes.map((p) => p.pessoaId));
  for (const id of concessoes.flatMap((c) => [c.deId, ...c.paraIds])) {
    if (vistos.has(id)) continue;
    participantes.push({ pessoaId: id, nome: nomeDe(nomes, id), quotas: 0n });
    vistos.add(id);
  }

  const capital = participantes.reduce((total, p) => total + p.quotas, 0n);
  const { linhas, totais } = montarUsufruto({ participantes, concessoes, capital });
  return { linhas, totais };
}

/**
 * Quanto falta conceder para o usufrutuário alcançar um alvo de voz e voto,
 * lendo o que já está concedido a ele nos ônus vigentes. É o cálculo que faz a
 * instituição existir: ela complementa a reserva quando esta não alcança o
 * controle que o fundador quer manter (46,54% contra 51%, no Agro Aliança).
 *
 * O percentual entra escalado em 4 casas (51% = 510000), que é a precisão da guia.
 */
export function quotasQueFaltamParaOAlvo(args: {
  usufrutuarioId: string;
  pctAlvoEscalado: bigint;
  capital: bigint;
  onusVigentes: readonly OnusVigente[];
  /** Quotas que a própria pessoa tem e vota (propriedade plena dela). */
  quotasProprias: bigint;
}): bigint {
  const { usufrutuarioId, pctAlvoEscalado, capital, onusVigentes, quotasProprias } = args;
  if (capital <= 0n || pctAlvoEscalado <= 0n) return 0n;
  const jaVota = quotasProprias + onusVigentes
    .filter((o) => o.comVoto && o.usufrutuarioIds.includes(usufrutuarioId))
    .reduce((s, o) => s + BigInt(o.quotas), 0n);
  const alvo = (pctAlvoEscalado * capital + 500_000n) / 1_000_000n;
  return alvo > jaVota ? alvo - jaVota : 0n;
}

/** A frase que nomeia o ato no card de Atos Societários. */
export function descricaoDaInstituicao(
  plano: PlanoDaInstituicao,
  nomes: ReadonlyMap<string, string>,
): string {
  const concedentes = [...new Set(plano.onus.map((o) => o.nuProprietarioId))].map((id) => nomeDe(nomes, id));
  const usufrutuarios = [...new Set(plano.onus.flatMap((o) => o.usufrutuarioIds))].map((id) => nomeDe(nomes, id));
  const total = plano.onus.reduce((s, o) => s + o.quotas, 0);
  const voto = plano.onus.every((o) => o.comVoto) ? ', com direito de voto' : '';
  return `Instituição de usufruto sobre ${inteiro(total)} quotas de ${concedentes.join(' e ')}`
    + ` em favor de ${usufrutuarios.join(' e ')}${voto}`;
}
