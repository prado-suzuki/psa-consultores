/**
 * O conteudo dos slides da OSG, montado sem tocar no banco e sem tocar em XML.
 *
 * Mesmo arranjo do `_shared/planejamento-tributario/slides.ts`, que faz isso para o
 * deck tributario desde a PT-01: o gerador de CONTEUDO e puro e tem teste; a
 * montagem do .pptx fica na Edge Function, que so recebe a estrutura pronta.
 *
 * Aqui e a metade que faltava do lado da OSG. Ate 09/2026 esta modelagem morava
 * dentro das funcoes `carregar*` do `data.ts`, coladas nas queries — e por isso a
 * aritmetica que reparte quotas entre titulares, que e a coisa mais delicada do
 * modulo, nunca teve um unico teste.
 *
 * As REGRAS de quem entra ficam em `regras.ts`. Aqui e o que sai depois delas.
 */

import {
  bemIntegraliza, motivoDaMatriculaFora, ONDE, plural, relatoDasMatriculas,
  temImpedimentoAtivo, type MotivoDaMatricula,
} from "./regras.ts";
/* O `anota` e o `Probs` vem do canonico, e nao reexportados pelo `regras.ts`: a
   indireção fazia parecer que o vocabulario de avisos e da OSG, quando ele e dos
   dois geradores. */
import { anota, type Probs } from "../apresentacao/problema.ts";

// ---------------------------------------------------------------------------
// Formatacao
// ---------------------------------------------------------------------------

export function fmtBRL(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n));
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(n));
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + "%";
}

// ---------------------------------------------------------------------------
// Patrimonial
// ---------------------------------------------------------------------------

export interface LinhaPatrimonial {
  /** MOM. — o momento da integralizacao. Ver `momentoDoBem`. */
  momento: string;
  /** TITULAR NA MATRICULA — a propriedade de DIREITO. */
  propriedade: string;
  /** DE FATO — quem explora ou se comporta como proprietario. */
  deFato: string;
  referencia: string;
  matriculaLabel: string;
  municipioUf: string;
  /** AREA (ha), sempre em hectares, venha o cadastro na unidade que vier. */
  area: string;
  /** SITUACAO — Regular · Pendente · Sem matricula. Ver `situacaoDaMatricula`. */
  situacao: string;
  /** VALOR: o CONTABIL declarado. */
  valor: string;
}

export interface SociedadePatrimonial {
  nome: string;
  linhas: LinhaPatrimonial[];
}

/** Uma linha da tabela dos bens que ficaram FORA da estruturacao. */
export interface BemForaDaEstrutura {
  referencia: string;
  matriculaLabel: string;
  municipioUf: string;
  titular: string;
  motivo: string;
}

/** A forma crua que a query do `bem` devolve. Frouxa de proposito: e JSON do PostgREST. */
export interface BemCru {
  /** IR imovel rural · IB imovel urbano · AP arrendamento/parceria · PS participacao · OU outros. */
  tipo_bem?: string | null;
  /** O que o "Outros" e, em texto livre (moeda, veiculo, maquina). */
  descricao_outros?: string | null;
  denominacao?: string | null;
  vlr_contabil?: number | string | null;
  participa_estruturacao?: boolean | null;
  status_integralizacao?: string | null;
  motivo_nao_integralizacao?: string | null;
  empresa_destino?: { denominacao?: string | null } | null;
  titularidade?: Array<TitularidadeCrua> | null;
  matricula?: Array<{
    numero?: string | null;
    municipio_imovel?: string | null;
    uf_imovel?: string | null;
    vlr_contabil?: number | string | null;
    area_documento?: number | string | null;
    area_unidade?: string | null;
    georref_prejudica_transferencia?: boolean | null;
    impedimento?: Array<{ cancelado?: unknown; impede_transferencia?: unknown }> | null;
    titularidade?: Array<TitularidadeCrua> | null;
  }> | null;
}

export interface TitularidadeCrua {
  tipo?: string | null;
  titular?: { denominacao?: string | null } | null;
}

export const SOCIEDADE_A_DEFINIR = "Sociedade a definir";
export const MATRICULA_NAO_SE_APLICA = "Não se aplica";
export const SEM_MOTIVO_DECLARADO = "Motivo não declarado no cadastro";

/** Imovel e o que pode ter matricula (rural e urbano): a mesma fronteira de `matricula_tipo_bem_check`. */
export function ehImovel(b: Pick<BemCru, "tipo_bem">): boolean {
  return b.tipo_bem === "IR" || b.tipo_bem === "IB";
}

/** O tipo do bem como a tabela de outros bens escreve. "Outros" usa a descricao, se houver. */
export function tipoDoOutroBem(b: Pick<BemCru, "tipo_bem" | "descricao_outros">): string {
  if (b.tipo_bem === "PS") return "Participação societária";
  if (b.tipo_bem === "AP") return "Arrendamento e/ou parceria";
  return b.descricao_outros?.trim() || "Outros";
}

/**
 * Nomes dos titulares, sem repetir e na ordem do cadastro; `especie` filtra DIREITO ou FATO.
 * Sem ninguem na especie, devolve vazio: o placeholder e de quem monta a linha.
 */
export function nomesTitulares(
  titularidades: Array<TitularidadeCrua> | null | undefined,
  especie?: "DIREITO" | "FATO",
): string {
  if (!titularidades || titularidades.length === 0) return "";
  const nomes: string[] = [];
  for (const t of titularidades) {
    if (especie && t?.tipo !== especie) continue;
    const n = t?.titular?.denominacao;
    if (n && !nomes.includes(n)) nomes.push(n);
  }
  return nomes.join(", ");
}

/** A propriedade de DIREITO; sem nenhuma, cai para o que houver. */
const titularDeDireito = (ts: Array<TitularidadeCrua> | null | undefined): string =>
  nomesTitulares(ts, "DIREITO") || nomesTitulares(ts);

// ---------------------------------------------------------------------------
// As tres colunas que o modelo da consultoria pede e o cadastro deriva
// ---------------------------------------------------------------------------

/** m² vira hectare; `ha` e `ha_m2` já são hectare (a segunda só muda a leitura). */
export function emHectares(valor: number | string | null | undefined, unidade?: string | null): string {
  if (valor == null || valor === "") return "—";
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  const ha = unidade === "m2" ? n / 10_000 : n;
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(ha);
}

/**
 * A coluna MOM.: 1o momento o que ja foi a peca registrada, 2o o aprovado que ainda nao foi. Sai do
 * status porque `movimentacao_quotas.ato_id` e `.sequencia` estao nulos em producao.
 */
export function momentoDoBem(status: string | null | undefined): string {
  if (status === "Integralizado") return "1º";
  if (status === "Aprovado" || status === "Aprovado para 2ª Instancia") return "2º";
  return "—";
}

/** A coluna REGISTRO do modelo: Regular · Pendente · Sem matricula. */
export function situacaoDaMatricula(m: {
  numero?: string | null;
  georref_prejudica_transferencia?: boolean | null;
  impedimento?: Array<{ cancelado?: unknown; impede_transferencia?: unknown }> | null;
} | null): string {
  if (!m || !m.numero) return "Sem matrícula";
  const travado = (m.impedimento ?? []).some((i) => i && i.cancelado !== true && i.impede_transferencia === true);
  if (travado || m.georref_prejudica_transferencia === true) return "Pendente";
  return "Regular";
}

/**
 * Agrupa os bens por sociedade de destino, uma linha por matricula.
 *
 * Bem sem matricula vira UMA linha com "Nao se aplica" — nao some. Bem sem
 * sociedade de destino cai no balde "Sociedade a definir". Os dois sao
 * placeholders que VAO IMPRESSOS, e por isso viram aviso: sem ele, chegam ao
 * cliente parecendo conteudo.
 */
export function montaPatrimonial(bensCrus: readonly BemCru[], probs?: Probs): SociedadePatrimonial[] {
  /* So imovel da estruturacao: os fora dela saem na pagina propria, e os que nao sao imovel na de
     outros bens. Quem avisa quando o molde nao tem essas paginas e o `gerarPatrimonial`. */
  const bens = bensCrus.filter((b) => b.participa_estruturacao !== false && ehImovel(b));

  const buckets = new Map<string, LinhaPatrimonial[]>();
  let semDestino = 0;
  let semMatricula = 0;

  for (const b of bens) {
    const destino = b.empresa_destino?.denominacao;
    const soc = destino || SOCIEDADE_A_DEFINIR;
    if (!destino) semDestino++;
    if (!buckets.has(soc)) buckets.set(soc, []);
    const linhas = buckets.get(soc)!;
    const refBem = b.denominacao ?? "";
    const titulBem = nomesTitulares(b.titularidade);

    const momento = momentoDoBem(b.status_integralizacao);
    const deFatoBem = nomesTitulares(b.titularidade, "FATO");

    const mats = b.matricula ?? [];
    if (mats.length === 0) {
      semMatricula++;
      linhas.push({
        momento,
        propriedade: titulBem || "—",
        deFato: deFatoBem || "—",
        referencia: refBem,
        matriculaLabel: MATRICULA_NAO_SE_APLICA,
        municipioUf: "—",
        area: "—",
        situacao: situacaoDaMatricula(null),
        valor: fmtBRL(b.vlr_contabil as number),
      });
      continue;
    }
    for (const m of mats) {
      const titulMat = titularDeDireito(m.titularidade) || titulBem;
      const numero = m.numero ?? null;
      const mun = [m.municipio_imovel, m.uf_imovel].filter(Boolean).join("/") || "—";
      const situacao = situacaoDaMatricula(m);
      linhas.push({
        momento,
        propriedade: titulMat || "—",
        /* A propriedade de fato mora na matricula; sem ela, herda a do bem, que e
           onde ela vive para quota, moeda e o que nao tem registro. */
        deFato: nomesTitulares(m.titularidade, "FATO") || deFatoBem || "—",
        referencia: refBem,
        matriculaLabel: numero ? `Mat. ${numero}` : MATRICULA_NAO_SE_APLICA,
        municipioUf: mun,
        area: emHectares(m.area_documento, m.area_unidade),
        situacao,
        valor: fmtBRL((m.vlr_contabil ?? b.vlr_contabil) as number),
      });
    }
  }

  if (semDestino > 0) {
    anota(probs, ONDE.patrimonial, `${plural(semDestino, "bem sai", "bens saem")} em "${SOCIEDADE_A_DEFINIR}" — falta a sociedade de destino no cadastro.`);
  }
  if (semMatricula > 0) {
    anota(probs, ONDE.patrimonial, `${plural(semMatricula, "bem sai", "bens saem")} com matrícula "${MATRICULA_NAO_SE_APLICA}" — nenhuma matrícula vinculada.`);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([nome, linhas]) => ({ nome, linhas }));
}

/** Os bens fora da estruturacao (`participa_estruturacao = false`), com o motivo. */
export function montaForaDaEstrutura(bensCrus: readonly BemCru[], probs?: Probs): BemForaDaEstrutura[] {
  const fora = bensCrus.filter((b) => b.participa_estruturacao === false);
  const linhas: BemForaDaEstrutura[] = [];
  let semMotivo = 0;

  for (const b of fora) {
    const refBem = b.denominacao ?? "—";
    const motivo = (b.motivo_nao_integralizacao ?? "").trim();
    if (!motivo) semMotivo++;
    const mats = b.matricula ?? [];
    const comum = {
      referencia: refBem,
      motivo: motivo || SEM_MOTIVO_DECLARADO,
    };
    if (mats.length === 0) {
      linhas.push({
        ...comum,
        matriculaLabel: MATRICULA_NAO_SE_APLICA,
        municipioUf: "—",
        titular: titularDeDireito(b.titularidade) || "—",
      });
      continue;
    }
    for (const m of mats) {
      linhas.push({
        ...comum,
        matriculaLabel: m.numero ? `Mat. ${m.numero}` : MATRICULA_NAO_SE_APLICA,
        municipioUf: [m.municipio_imovel, m.uf_imovel].filter(Boolean).join("/") || "—",
        titular: titularDeDireito(m.titularidade) || titularDeDireito(b.titularidade) || "—",
      });
    }
  }

  /* O motivo e a unica coluna sem substituto: sem ele a linha nao diz por que o bem ficou de fora. */
  if (semMotivo > 0) {
    anota(
      probs,
      ONDE.patrimonial,
      `${plural(semMotivo, "bem fora da estruturação está", "bens fora da estruturação estão")} sem motivo declarado no cadastro.`,
    );
  }

  return linhas.sort((a, b) => a.referencia.localeCompare(b.referencia, "pt-BR"));
}

/** Uma linha da tabela dos bens integralizados que nao sao imovel. */
export interface LinhaOutroBem {
  referencia: string;
  tipo: string;
  sociedade: string;
  propriedade: string;
  valor: string;
}

export interface OutrosBens {
  linhas: LinhaOutroBem[];
  /** O TOTAL de valor da tabela inteira. */
  total: string;
}

/**
 * Os bens da estruturacao que nao sao imovel, numa tabela so com a coluna da sociedade: na de
 * imoveis sairiam sem matricula, municipio nem area.
 */
export function montaOutrosBens(bensCrus: readonly BemCru[], probs?: Probs): OutrosBens {
  const bens = bensCrus.filter((b) => b.participa_estruturacao !== false && !ehImovel(b));
  let semDestino = 0;
  let soma = 0;
  const linhas = bens.map((b) => {
    const destino = b.empresa_destino?.denominacao;
    if (!destino) semDestino++;
    soma += Number(b.vlr_contabil ?? 0) || 0;
    return {
      referencia: b.denominacao ?? "—",
      tipo: tipoDoOutroBem(b),
      sociedade: destino || SOCIEDADE_A_DEFINIR,
      propriedade: titularDeDireito(b.titularidade) || "—",
      valor: fmtBRL(b.vlr_contabil as number),
    };
  });
  if (semDestino > 0) {
    anota(probs, ONDE.patrimonial,
      `${plural(semDestino, "outro bem sai", "outros bens saem")} em "${SOCIEDADE_A_DEFINIR}" — falta a sociedade de destino no cadastro.`);
  }
  linhas.sort((a, b) => a.sociedade.localeCompare(b.sociedade, "pt-BR") || a.referencia.localeCompare(b.referencia, "pt-BR"));
  return { linhas, total: fmtBRL(soma) };
}

export interface TotalDaSociedade {
  area: string;
  valor: string;
}

/** O TOTAL de cada sociedade pela mesma regra das linhas do `montaPatrimonial`, para nao divergir da coluna. */
export function totaisPorSociedade(bens: readonly BemCru[]): Map<string, TotalDaSociedade> {
  const acumulado = new Map<string, { area: number; valor: number }>();
  for (const b of bens) {
    if (b.participa_estruturacao === false || !ehImovel(b)) continue;
    const soc = b.empresa_destino?.denominacao || SOCIEDADE_A_DEFINIR;
    const t = acumulado.get(soc) ?? { area: 0, valor: 0 };
    const mats = b.matricula ?? [];
    if (mats.length === 0) t.valor += Number(b.vlr_contabil ?? 0) || 0;
    for (const m of mats) {
      const a = Number(m.area_documento);
      if (m.area_documento != null && Number.isFinite(a)) t.area += m.area_unidade === "m2" ? a / 10_000 : a;
      t.valor += Number(m.vlr_contabil ?? b.vlr_contabil ?? 0) || 0;
    }
    acumulado.set(soc, t);
  }
  return new Map([...acumulado].map(([soc, t]) => [soc, { area: emHectares(t.area, "ha"), valor: fmtBRL(t.valor) }]));
}

// ---------------------------------------------------------------------------
// Organograma: a exploracao rural
// ---------------------------------------------------------------------------

/** Uma linha de `exploracao_rural` com as partes, como o gerador le. */
// ---------------------------------------------------------------------------
// Quadro derivado dos bens (empresa a integralizar)
// ---------------------------------------------------------------------------

export interface QuadroLinha { socio: string; quotas: number; valor: number; pct: number }
export interface SocioIdent {
  pessoaId: string | null;
  denominacao: string;
  tipoPessoa: string | null;
  tipoEmpresa: string | null;
}
export interface QuadroResult {
  linhas: QuadroLinha[];
  totalQuotas: number;
  totalValor: number;
  socios: SocioIdent[];
}

export interface Titular {
  pessoaId: string | null;
  denominacao: string;
  tipoPessoa: string | null;
  tipoEmpresa: string | null;
  integralizador: boolean;
  fracao: number | null;
}

/**
 * Uma linha por PESSOA, e nao por titularidade.
 *
 * A mesma pessoa pode aparecer duas vezes na mesma matricula (uma como
 * integralizadora, outra nao). Vence o `integralizador` de qualquer uma das duas,
 * e a fracao e a PRIMEIRA nao-nula — o resto seria somar fracao repetida.
 *
 * Titular sem `pessoaId` nao dedupa: sem id nao ha como afirmar que sao a mesma
 * pessoa, e juntar pelo nome erraria homonimo.
 */
export function dedupTitulares(raw: readonly Titular[]): Titular[] {
  const porPessoa = new Map<string, Titular>();
  const saida: Titular[] = [];
  for (const t of raw) {
    if (!t.pessoaId) { saida.push({ ...t }); continue; }
    const ex = porPessoa.get(t.pessoaId);
    if (ex) {
      ex.integralizador = ex.integralizador || t.integralizador;
      if (ex.fracao == null) ex.fracao = t.fracao;
      continue;
    }
    const novo = { ...t };
    porPessoa.set(t.pessoaId, novo);
    saida.push(novo);
  }
  return saida;
}

/**
 * Reparte o valor de UMA matricula entre os titulares dela, em centavos.
 *
 * CENTAVOS, e nao reais: repartir em ponto flutuante e depois somar nao fecha, e
 * o quadro societario que nao fecha e o quadro que ninguem assina.
 *
 * "Fechada" = todos tem fracao e a soma bate 100%. Nesse caso o ULTIMO absorve o
 * residuo do arredondamento, para o total bater exatamente. Quando ha titular sem
 * fracao, o que sobrou depois dos com fracao e dividido igualmente entre eles, e
 * de novo o ultimo absorve a diferenca.
 */
export function rateioDaMatricula(titulares: readonly Titular[], valor: number): Map<Titular, number> {
  const totalCent = Math.round(valor * 100);
  const comFracao = titulares.filter((t) => t.fracao != null);
  const semFracao = titulares.filter((t) => t.fracao == null);
  const fechada =
    semFracao.length === 0 &&
    Math.abs(comFracao.reduce((s, t) => s + (t.fracao as number), 0) - 100) < 0.001;

  const centDe = new Map<Titular, number>();
  let alocado = 0;
  comFracao.forEach((t, i) => {
    const cent = fechada && i === comFracao.length - 1
      ? totalCent - alocado
      : Math.round((totalCent * (t.fracao as number)) / 100);
    alocado += cent;
    centDe.set(t, cent);
  });

  const restante = totalCent - alocado;
  let alocadoSem = 0;
  semFracao.forEach((t, i) => {
    const cent = i === semFracao.length - 1
      ? restante - alocadoSem
      : Math.round(restante / Math.max(semFracao.length, 1));
    alocadoSem += cent;
    centDe.set(t, cent);
  });

  return centDe;
}

/** A matricula como o quadro derivado a enxerga. */
export interface MatriculaParaQuadro {
  vlr_contabil?: number | string | null;
  titularidade?: Array<{
    integralizador?: boolean | null;
    fracao?: number | string | null;
    titular?: { id?: string | null; denominacao?: string | null; tipo_pessoa?: string | null; tipo_empresa?: string | null } | null;
  }> | null;
  impedimento?: Array<{ cancelado?: unknown }> | null;
}

export interface BemParaQuadro {
  vlr_contabil?: number | string | null;
  status_integralizacao?: string | null;
  matricula?: MatriculaParaQuadro[] | null;
}

/**
 * O quadro de uma empresa a integralizar (PR), derivado dos bens destinados a ela.
 *
 * So entra bem APROVADO — regra de negocio, nao falta de dado: bem pendente ainda
 * nao virou quota. Era muda antes de 09/2026, e um cliente com tudo "Em analise"
 * gerava quadro vazio sem ninguem avisar.
 */
export function montaQuadroDerivado(
  bensCrus: readonly BemParaQuadro[], denominacao = "", probs?: Probs,
): QuadroResult {
  const integralizam = bensCrus.filter((b) => bemIntegraliza(b.status_integralizacao));
  if (foraPorStatus > 0) {
    anota(probs, ONDE.quadro, `${plural(foraPorStatus, "bem não entrou", "bens não entraram")} no quadro de "${denominacao}": status de integralização diferente de "Aprovado".`);
  }

  interface Acc extends SocioIdent { cent: number }
  const porChave = new Map<string, Acc>();
  const descartes: MotivoDaMatricula[] = [];

  for (const b of integralizam) {
    for (const m of b.matricula ?? []) {
      const vlrRaw = m.vlr_contabil ?? b.vlr_contabil;
      const vlr = vlrRaw == null ? null : Number(vlrRaw);
      const titularesCrus = m.titularidade ?? [];
      const motivo = motivoDaMatriculaFora({
        temImpedimentoAtivo: temImpedimentoAtivo(m.impedimento),
        valor: vlr,
        totalDeTitulares: titularesCrus.length,
      });
      if (motivo) { descartes.push(motivo); continue; }
      /* `motivoDaMatriculaFora` ja devolveu "sem_valor" se fosse nulo; o
         TypeScript nao enxerga isso atravessando a funcao, entao a guarda repete
         a condicao — e nao um `!`, que esconderia a invariante de quem le. */
      if (vlr == null) continue;

      const titulares = dedupTitulares(titularesCrus.map((t) => ({
        pessoaId: t?.titular?.id ?? null,
        denominacao: t?.titular?.denominacao ?? "—",
        tipoPessoa: t?.titular?.tipo_pessoa ?? null,
        tipoEmpresa: t?.titular?.tipo_empresa ?? null,
        integralizador: !!t?.integralizador,
        fracao: t?.fracao == null ? null : Number(t.fracao),
      })));
      /* O dedup nunca esvazia lista nao-vazia — a regra acima ja barrou matricula
         sem titular. Guarda sem relato proprio: disparar seria bug do dedup. */
      if (titulares.length === 0) continue;

      const centDe = rateioDaMatricula(titulares, vlr);
      for (const t of titulares) {
        const chave = t.pessoaId ?? `nome:${t.denominacao}`;
        const ex = porChave.get(chave);
        const cent = centDe.get(t) ?? 0;
        if (ex) ex.cent += cent;
        else porChave.set(chave, {
          pessoaId: t.pessoaId, denominacao: t.denominacao,
          tipoPessoa: t.tipoPessoa, tipoEmpresa: t.tipoEmpresa, cent,
        });
      }
    }
  }

  /*
    O RELATO SAI ANTES DO RETORNO ANTECIPADO, e essa ordem e o ponto.

    Com capital zero a funcao devolve quadro vazio e encerra — e esse e justamente
    o caso em que TODAS as matriculas foram descartadas, ou seja, quando o motivo
    mais importa. Emitir depois do `return` era engolir a explicacao exatamente na
    hora em que ela e a unica coisa que o consultor tem para agir.
  */
  for (const linha of relatoDasMatriculas(denominacao, descartes)) anota(probs, ONDE.quadro, linha);

  const capitalCent = [...porChave.values()].reduce((s, a) => s + a.cent, 0);
  if (capitalCent === 0) return { linhas: [], totalQuotas: 0, totalValor: 0, socios: [] };

  const ordenados = [...porChave.values()].sort((a, z) => z.cent - a.cent);
  const linhas: QuadroLinha[] = ordenados.map((a) => ({
    socio: a.denominacao,
    valor: a.cent / 100,
    quotas: Math.round(a.cent / 100),
    pct: (a.cent / capitalCent) * 100,
  }));
  // O ultimo absorve o residuo para a soma das quotas bater o capital.
  const totalQuotas = Math.round(capitalCent / 100);
  const somaQuotas = linhas.reduce((s, p) => s + p.quotas, 0);
  if (linhas.length > 0) linhas[linhas.length - 1].quotas += totalQuotas - somaQuotas;

  const socios: SocioIdent[] = ordenados.map((a) => ({
    pessoaId: a.pessoaId, denominacao: a.denominacao,
    tipoPessoa: a.tipoPessoa, tipoEmpresa: a.tipoEmpresa,
  }));
  return { linhas, totalQuotas, totalValor: capitalCent / 100, socios };
}
