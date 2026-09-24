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
  propriedade: string;
  referencia: string;
  matriculaLabel: string;
  municipioUf: string;
  valor: string;
}

export interface SociedadePatrimonial {
  nome: string;
  linhas: LinhaPatrimonial[];
}

/** A forma crua que a query do `bem` devolve. Frouxa de proposito: e JSON do PostgREST. */
export interface BemCru {
  denominacao?: string | null;
  vlr_contabil?: number | string | null;
  participa_estruturacao?: boolean | null;
  empresa_destino?: { denominacao?: string | null } | null;
  titularidade?: Array<{ titular?: { denominacao?: string | null } | null }> | null;
  matricula?: Array<{
    numero?: string | null;
    municipio_imovel?: string | null;
    uf_imovel?: string | null;
    vlr_contabil?: number | string | null;
    titularidade?: Array<{ titular?: { denominacao?: string | null } | null }> | null;
  }> | null;
}

export const SOCIEDADE_A_DEFINIR = "Sociedade a definir";
export const MATRICULA_NAO_SE_APLICA = "Não se aplica";

/** Nomes dos titulares, sem repetir e na ordem do cadastro. */
export function nomesTitulares(
  titularidades: Array<{ titular?: { denominacao?: string | null } | null }> | null | undefined,
): string {
  if (!titularidades || titularidades.length === 0) return "";
  const nomes: string[] = [];
  for (const t of titularidades) {
    const n = t?.titular?.denominacao;
    if (n && !nomes.includes(n)) nomes.push(n);
  }
  return nomes.join(", ");
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
  // quem conferir a apresentação contra o cadastro não procurar o que foi tirado de propósito.
  const fora = bensCrus.length - bens.length;
  if (fora > 0) {
    anota(probs, ONDE.patrimonial, `${plural(fora, "bem está", "bens estão")} fora da estruturação e não ${fora === 1 ? "entrou" : "entraram"} na apresentação.`);
  }

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

    const mats = b.matricula ?? [];
    if (mats.length === 0) {
      semMatricula++;
      linhas.push({
        propriedade: titulBem || "—",
        referencia: refBem,
        matriculaLabel: MATRICULA_NAO_SE_APLICA,
        municipioUf: "—",
        valor: fmtBRL(b.vlr_contabil as number),
      });
      continue;
    }
    for (const m of mats) {
      const titulMat = nomesTitulares(m.titularidade) || titulBem;
      const numero = m.numero ?? null;
      const mun = [m.municipio_imovel, m.uf_imovel].filter(Boolean).join("/") || "—";
      linhas.push({
        propriedade: titulMat || "—",
        referencia: refBem,
        matriculaLabel: numero ? `Mat. ${numero}` : MATRICULA_NAO_SE_APLICA,
        municipioUf: mun,
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
