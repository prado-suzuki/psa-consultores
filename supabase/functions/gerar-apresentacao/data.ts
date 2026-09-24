// Loaders de dados por seção do deck. Cliente PostgREST admin ja garantiu
// o gate de auth+cluster ANTES de chamar isso. As tabelas de conteudo
// (bem, pessoa, v_quadro_societario, matricula, titularidade, exploracao_rural)
// NAO tem coluna `ambiente` — isolamento e por cluster.

// deno-lint-ignore-file no-explicit-any
import {
  anota, faixaDaEmpresa, lerTipoDeEmpresa, motivoDoQuadroAusente,
  motivoForaDoOrganograma, ONDE, percentuaisSaemVazios, plural, relatoDePercentualVazio,
  socioEntraNaFaixa,
  type Probs,
} from "../_shared/apresentacao-osg/regras.ts";
import {
  exploracaoDoOrganograma, montaForaDaEstrutura, montaOutrosBens, montaPatrimonial, montaQuadroDerivado,
  totaisPorSociedade,
  type BemCru, type BemForaDaEstrutura, type BemParaQuadro, type ExploracaoRuralCrua, type OutrosBens,
  type QuadroLinha, type QuadroResult, type SociedadePatrimonial, type SocioIdent, type TotalDaSociedade,
} from "../_shared/apresentacao-osg/conteudo.ts";

import type {
  AtoDoCapitulo, BaseDoAto, EntradaDoCapitulo, ParentescoDoCapitulo, PessoaDoCapitulo, PorBaseDoAto,
  PorRegua,
} from "../_shared/apresentacao-osg/sucessoria.ts";
import { MAXIMO_DE_CENARIOS } from "../_shared/apresentacao-osg/paginacao.ts";

type SB = any;

/*
 * A MODELAGEM DO CONTEUDO vive em `_shared/apresentacao-osg/conteudo.ts`: pura,
 * sem banco e com gabarito — mesmo arranjo que o
 * `_shared/planejamento-tributario/slides.ts` ja usa para o deck tributario.
 * Daqui para baixo e so leitura do banco e delegacao.
 *
 * Os formatadores e os tipos sao reexportados porque o `index.ts` os importa
 * daqui desde antes da separacao, e mover o import dele seria mexer na montagem
 * do XML sem necessidade.
 */
export { fmtBRL, fmtInt, fmtPct } from "../_shared/apresentacao-osg/conteudo.ts";
export type {
  BemForaDaEstrutura, LinhaPatrimonial, OutrosBens, SociedadePatrimonial,
} from "../_shared/apresentacao-osg/conteudo.ts";

/* Um select para as duas tabelas do patrimonial (integralizados e fora da estruturacao), para que
   as duas saiam do mesmo cadastro. */
const SELECT_PATRIMONIAL = `
  id,tipo_bem,descricao_outros,denominacao,vlr_contabil,participa_estruturacao,status_integralizacao,
  motivo_nao_integralizacao,empresa_destino_pessoa_id,
  empresa_destino:empresa_destino_pessoa_id(denominacao),
  titularidade(tipo,fracao,titular:titular_pessoa_id(denominacao)),
  matricula(id,numero,matricula_anterior_texto,municipio_imovel,uf_imovel,vlr_contabil,
    area_documento,area_unidade,georref_prejudica_transferencia,
    impedimento(cancelado,impede_transferencia),
    titularidade(tipo,fracao,titular:titular_pessoa_id(denominacao)))
`.replace(/\s+/g, "");

async function lerBens(admin: SB, clienteId: string): Promise<BemCru[]> {
  const { data, error } = await admin.from("bem").select(SELECT_PATRIMONIAL)
    .eq("cliente_id", clienteId).order("denominacao");
  if (error) throw new Error(`carregarPatrimonial: ${error.message}`);
  return (data ?? []) as BemCru[];
}

export async function carregarPatrimonial(admin: SB, clienteId: string, probs?: Probs): Promise<SociedadePatrimonial[]> {
  return montaPatrimonial(await lerBens(admin, clienteId), probs);
}

/** O TOTAL de cada sociedade pela mesma regra das linhas; a chave e o nome, como o `montaPatrimonial` agrupa. */
export async function carregarTotaisPorSociedade(admin: SB, clienteId: string): Promise<Map<string, TotalDaSociedade>> {
  return totaisPorSociedade(await lerBens(admin, clienteId));
}

/** Os bens fora da estruturacao, com o motivo — a segunda tabela do deck. */
export async function carregarForaDaEstrutura(
  admin: SB, clienteId: string, probs?: Probs,
): Promise<BemForaDaEstrutura[]> {
  /* Sem `probs`: quem ja relatou quantos ficaram de fora foi o `montaPatrimonial`,
     que le a mesma lista. O que passa aqui e so o aviso de motivo em branco. */
  return montaForaDaEstrutura(await lerBens(admin, clienteId), probs);
}

/** Os bens da estruturacao que nao sao imovel (moeda, quotas, arrendamento, "Outros"). */
export async function carregarOutrosBens(admin: SB, clienteId: string, probs?: Probs): Promise<OutrosBens> {
  return montaOutrosBens(await lerBens(admin, clienteId), probs);
}

// ---------- Organograma ----------

export interface OrganogramaBands {
  socios: string[];
  controladoras: string[];
  controladas: string[];
  rural: string[];
}

// ---------- Empresas do cliente + quadro por tipo (CN manual | PR derivado) ----------

interface EmpresaPJ { id: string; denominacao: string; tipo_empresa: string | null }


async function listarEmpresasPJ(admin: SB, clienteId: string): Promise<EmpresaPJ[]> {
  const { data, error } = await admin
    .from("pessoa")
    .select("id,denominacao,tipo_pessoa,tipo_empresa")
    .eq("cliente_id", clienteId)
    .eq("tipo_pessoa", "PJ");
  if (error) throw new Error(`listarEmpresasPJ: ${error.message}`);

  /* `pessoa.denominacao` e NOT NULL: toda empresa tem nome. */
  return ((data ?? []) as any[]).map((p) => ({ id: p.id, denominacao: p.denominacao, tipo_empresa: p.tipo_empresa ?? null }));
}

// Quadro GRAVADO, igual para CN e PR: o acumulado dos movimentos de quota, lido
// de `v_quadro_societario`. Espelha useQuadroDaEmpresa/useListasDaEmpresa no
// front, porque a apresentação e o contrato precisam contar a mesma história.
//
// Antes daqui esta função lia a tabela `quadro_societario` para a CN e derivava
// dos bens para a PR, a mesma bifurcação que o front tinha. Devolve `null`
// quando não há quadro gravado, e é isso que faz a PR cair no derivado.
//
// São DUAS leituras e não um embed: o PostgREST só infere relacionamento de view
// quando a coluna vem direto da tabela base, e `pessoa_id` aqui nasce de um
// `union all` com `group by`.
async function quadroGravado(
  admin: SB, empresaId: string, denominacao = "", probs?: Probs,
): Promise<QuadroGravado> {
  /*
    A SEGUNDA LEITURA E UMA PERGUNTA DE SIM OU NAO, e nao o razao inteiro.

    O quadro e ESTADO FINAL: a view ja agrega `sum(quotas)` por pessoa, e e isso
    que a tela `QuadroSocietario` mostra. Ex-socio que zerou nao aparece la nem
    aqui, e esta certo — nao ha o que relatar.

    O unico motivo de olhar `movimentacao_quotas` e distinguir duas empresas que a
    view entrega IDENTICAS (nenhuma linha): a que nunca teve quadro lancado, e a
    que tem lancamentos cujos saldos se anulam. Por isso `limit(1)`: precisa-se
    saber SE existe movimento, nunca quais — o razao acumula para sempre e ler
    linha a linha seria a unica consulta do gerador sem teto natural.
  */
  const [viewRes, movRes] = await Promise.all([
    admin.from("v_quadro_societario").select("pessoa_id,quotas,vlr_total").eq("empresa_pessoa_id", empresaId),
    admin.from("movimentacao_quotas").select("id").eq("empresa_pessoa_id", empresaId).limit(1),
  ]);
  if (viewRes.error) throw new Error(`quadroGravado(${empresaId}): ${viewRes.error.message}`);
  if (movRes.error) throw new Error(`quadroGravado.movimentos(${empresaId}): ${movRes.error.message}`);

  /* A view so devolve linha com pessoa. */
  const rows = (viewRes.data ?? []) as any[];

  const houveMovimento = ((movRes.data ?? []) as any[]).length > 0;
  if (rows.length === 0) return { resultado: null, houveMovimento };

  const ids = [...new Set(rows.map((r) => String(r.pessoa_id)))];
  const { data: pessoas, error: errP } = await admin
    .from("pessoa")
    .select("id,denominacao,tipo_pessoa,tipo_empresa")
    .in("id", ids);
  if (errP) throw new Error(`quadroGravado.pessoa(${empresaId}): ${errP.message}`);
  const porId = new Map(((pessoas ?? []) as any[]).map((p) => [String(p.id), p]));

  const linhas: QuadroLinha[] = [];
  const socios: SocioIdent[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const p = porId.get(String(r.pessoa_id));
    const denom = p?.denominacao ?? "—";
    linhas.push({
      socio: denom,
      quotas: Number(r.quotas ?? 0),
      valor: Number(r.vlr_total ?? 0),
      pct: 0,
    });
    if (p?.id && !seen.has(String(p.id))) {
      seen.add(String(p.id));
      socios.push({
        pessoaId: String(p.id),
        denominacao: denom,
        tipoPessoa: p.tipo_pessoa ?? null,
        tipoEmpresa: p.tipo_empresa ?? null,
      });
    }
  }
  const tq = linhas.reduce((s, x) => s + x.quotas, 0);
  const tv = linhas.reduce((s, x) => s + x.valor, 0);
  // Total zero faz TODO percentual virar NaN, e o `fmtPct` imprime "—" em cada
  // linha: o quadro parece cheio de buracos quando falta um numero so.
  if (percentuaisSaemVazios(tq)) anota(probs, ONDE.quadro, relatoDePercentualVazio(denominacao));
  for (const row of linhas) row.pct = tq > 0 ? (row.quotas / tq) * 100 : NaN;
  linhas.sort((a, b) => b.quotas - a.quotas || a.socio.localeCompare(b.socio, "pt-BR"));
  return { resultado: { linhas, totalQuotas: tq, totalValor: tv, socios }, houveMovimento };
}

// Quadro DERIVADO: o FALLBACK da PR ainda sem movimentacao de quota. A CONTA em
// si — rateio em centavos por fracao, impedimento fora, ultimo socio absorvendo o
// residuo — vive em `_shared/apresentacao-osg/conteudo.ts`, com gabarito proprio.
// Aqui ficou so a leitura. Espelha `calcularParticipacoesPR` do front
// (src/lib/templates/mapeadores.ts).
async function quadroPR(
  admin: SB, empresaId: string, denominacao = "", probs?: Probs,
): Promise<QuadroResult> {
  const sel = `
    vlr_contabil,status_integralizacao,
    matricula(
      vlr_contabil,
      titularidade(integralizador,fracao,titular:titular_pessoa_id(id,denominacao,tipo_pessoa,tipo_empresa)),
      impedimento(id,cancelado)
    )
  `.replace(/\s+/g, "");
  /*
    O FILTRO DE STATUS NAO ESTA NA QUERY, e e de proposito: com
    `.eq("status_integralizacao","Aprovado")` nao havia como contar quantos bens o
    filtro tirou, e um cliente com tudo "Em analise" gerava quadro vazio sem aviso
    nenhum. Quem separa e o `montaQuadroDerivado`, que enxerga os dois lados.
  */
  const { data, error } = await admin
    .from("bem")
    .select(sel)
    .eq("empresa_destino_pessoa_id", empresaId);
  if (error) throw new Error(`quadroPR(${empresaId}): ${error.message}`);

  return montaQuadroDerivado((data ?? []) as BemParaQuadro[], denominacao, probs);
}

// Uma fonte só: o quadro gravado. A PR ainda SEM movimentação cai no derivado,
// o mesmo fallback (e o mesmo critério, "a view voltou vazia") de
// useListasDaEmpresa no front. Sem ele a apresentação das PR que ainda não
// gravaram o quadro de constituição sairia sem quadro nenhum.
interface QuadroGravado {
  resultado: QuadroResult | null;
  /**
   * Houve lancamento em `movimentacao_quotas`, mesmo que a view tenha zerado tudo.
   *
   * Separa duas situacoes que a view entrega IDENTICAS (nenhuma linha) e que pedem
   * acoes opostas: empresa que nunca teve quadro lancado, e empresa cujos
   * lancamentos se anulam. Dizer "nenhuma movimentacao" na segunda seria mentira.
   */
  houveMovimento: boolean;
}

interface QuadroDaEmpresa {
  resultado: QuadroResult | null;
  /** A view tinha linhas? E o que separa "CN sem movimentacao" de "derivado vazio". */
  temQuadroGravado: boolean;
  houveMovimento: boolean;
}

/**
 * QUEM PASSA `probs` AQUI E SO O `carregarQuadro`.
 *
 * O `carregarOrganograma` chama esta mesma funcao para descobrir os socios, entao
 * passar o acumulador nos dois faria cada aviso de quadro sair DUAS vezes no
 * mesmo deck. O organograma relata o que e dele (a faixa que faltou) e delega o
 * resto.
 */
async function quadroDaEmpresa(admin: SB, e: EmpresaPJ, probs?: Probs): Promise<QuadroDaEmpresa> {
  const tipo = lerTipoDeEmpresa(e.tipo_empresa);
  if (tipo !== "CN" && tipo !== "PR") {
    return { resultado: null, temQuadroGravado: false, houveMovimento: false };
  }

  const { resultado: gravado, houveMovimento } = await quadroGravado(admin, e.id, e.denominacao, probs);
  if (gravado) return { resultado: gravado, temQuadroGravado: true, houveMovimento };
  if (tipo === "PR") {
    return {
      resultado: await quadroPR(admin, e.id, e.denominacao, probs),
      temQuadroGravado: false,
      houveMovimento,
    };
  }
  return {
    resultado: { linhas: [], totalQuotas: 0, totalValor: 0, socios: [] },
    temQuadroGravado: false,
    houveMovimento,
  };
}

/** O cadastro de Exploracao Rural do cliente, com as partes; a regra fica em `exploracaoDoOrganograma`. */
async function lerExploracoesRurais(admin: SB, clienteId: string): Promise<ExploracaoRuralCrua[]> {
  const { data, error } = await admin.from("exploracao_rural")
    .select("tipo_exploracao,partes:exploracao_rural_parte(papel,fracao,pessoa:pessoa_id(denominacao))")
    .eq("cliente_id", clienteId);
  if (error) throw new Error(`organograma.exploracao_rural: ${error.message}`);
  return (data ?? []) as ExploracaoRuralCrua[];
}

export async function carregarOrganograma(admin: SB, clienteId: string, probs?: Probs): Promise<OrganogramaBands> {
  const [empresas, exploracoes] = await Promise.all([
    listarEmpresasPJ(admin, clienteId),
    lerExploracoesRurais(admin, clienteId),
  ]);

  const controladoras: string[] = [];
  const controladas: string[] = [];
  for (const e of empresas) {
    const tipo = lerTipoDeEmpresa(e.tipo_empresa);
    const faixa = faixaDaEmpresa(tipo);
    if (faixa === "controladoras") controladoras.push(e.denominacao);
    else if (faixa === "controladas") controladas.push(e.denominacao);
    else {
      // Sem faixa, a empresa some do organograma inteiro. A socia (SC) e excecao
      // legitima — o lugar dela e a faixa de socios — e por isso nao vira aviso.
      const motivo = motivoForaDoOrganograma(e.denominacao, tipo);
      if (motivo) anota(probs, ONDE.organograma, motivo);
    }
  }
  /* A faixa de controladoras vazia sai desenhada sem ninguem, com aviso, como a rural. */
  if (controladoras.length === 0) {
    anota(
      probs,
      ONDE.organograma,
      "A faixa de controladoras do organograma saiu vazia: nenhuma empresa marcada como Controladora (CN) no cadastro.",
    );
  }

  // Sócios: uniao dos socios de cada empresa (CN manual / PR derivado),
  // filtrando PF ou SC, dedup por pessoaId (fallback nome).
  const seen = new Set<string>();
  const socios: string[] = [];
  for (const e of empresas) {
    /* Sem `probs`: o `carregarQuadro` ja percorre as mesmas empresas e relata o
       que falta no quadro delas. Aqui so se aproveita a lista de socios. */
    const { resultado } = await quadroDaEmpresa(admin, e);
    if (!resultado) continue;
    for (const s of resultado.socios) {
      // PJ que nao e socia ja aparece como controladora/controlada: entrar aqui
      // tambem a duplicaria no desenho. Nao e perda, entao nao vira aviso.
      if (!socioEntraNaFaixa(s.tipoPessoa, s.tipoEmpresa)) continue;
      const chave = s.pessoaId ?? `nome:${s.denominacao}`;
      if (seen.has(chave)) continue;
      seen.add(chave);
      if (s.denominacao) socios.push(s.denominacao);
    }
  }

  /* A faixa rural vem da Exploracao Rural, que e a estrutura almejada; sem cadastro sai vazia, com aviso. */
  const { rural } = exploracaoDoOrganograma(exploracoes);
  if (rural.length === 0) {
    anota(
      probs,
      ONDE.organograma,
      "A faixa rural do organograma saiu vazia: nenhum explorador ou compossuidor no cadastro de Exploração Rural.",
    );
  }

  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { socios: uniq(socios), controladoras: uniq(controladoras), controladas: uniq(controladas), rural: uniq(rural) };
}

// ---------- Quadro societario ----------

export type { QuadroLinha } from "../_shared/apresentacao-osg/conteudo.ts";
export interface QuadroEmpresa { empresa: string; linhas: QuadroLinha[]; totalQuotas: number; totalValor: number }

export async function carregarQuadro(admin: SB, clienteId: string, probs?: Probs): Promise<QuadroEmpresa[]> {
  const empresas = await listarEmpresasPJ(admin, clienteId);
  const out: QuadroEmpresa[] = [];
  for (const e of empresas) {
    const { resultado, temQuadroGravado, houveMovimento } = await quadroDaEmpresa(admin, e, probs);
    const linhas = resultado?.linhas ?? [];

    /*
      A empresa EXISTE no cadastro e nao aparece no slide, e a causa muda o
      conserto: campo "tipo de empresa" vazio, CN sem movimentacao de quotas, ou
      derivacao que nao achou bem aprovado. A primeira versao disto juntava as
      tres numa frase so e mandava procurar socio — informacao errada, que e pior
      que o silencio que ela veio substituir.
    */
    const motivo = motivoDoQuadroAusente({
      denominacao: e.denominacao,
      tipo: lerTipoDeEmpresa(e.tipo_empresa),
      temQuadroGravado,
      linhasApuradas: linhas.length,
      houveMovimento,
    });
    if (motivo) anota(probs, ONDE.quadro, motivo);
    if (!resultado || linhas.length === 0) continue;

    out.push({ empresa: e.denominacao, linhas, totalQuotas: resultado.totalQuotas, totalValor: resultado.totalValor });
  }
  out.sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
  return out;
}

// ---------- Titular ----------

export async function resolverTitular(admin: SB, clienteId: string, probs?: Probs): Promise<string> {
  /* O titular e o compossuidor que titula a composse; a regra de escolha esta em `exploracaoDoOrganograma`. */
  const { titular } = exploracaoDoOrganograma(await lerExploracoesRurais(admin, clienteId));
  if (titular) return titular;
  // O placeholder vai IMPRESSO no slide, entao o aviso nao e opcional: e a unica
  // chance de alguem trocar antes de a apresentacao chegar ao cliente.
  anota(probs, ONDE.organograma, "O titular sai como \"[titular a definir]\" — não há composse com compossuidor no cadastro de Exploração Rural.");
  return "[titular a definir]";
}


// ============================================================================
// CAPITULO 04 — Organizacao sucessoria: as simulacoes aprovadas da Calculadora
// ============================================================================
// Le com o token de quem pediu: a RLS das tabelas `itcd_*` diz o que a pessoa ve. Do navegador vem
// so os ids.

/** A mesma leitura da calculadora (`useSimulacoesItcmd`), com o conjuge e as bases comparadas. */
/** A mesma guia na base de 70%, ao lado da integral. */
const COLUNAS_DA_ALTERNATIVA = `pct_base_alternativa,
    vlr_base_alternativa_contabil, vlr_base_alternativa_itr, vlr_base_alternativa_mercado,
    vlr_imposto_alternativo_contabil, vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado`;

const SELECT_SIMULACAO = `
  id, versao, nome, status, empresa_pessoa_id, competencia, vlr_upf, quotas_total,
  vlr_acervo_contabil, vlr_acervo_itr, vlr_acervo_mercado,
  vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado,
  com_reserva, pct_base_reserva, pct_base_instituicao, origem_simulacao_id,
  itcd_simulacao_doador ( doador_pessoa_id, quotas, quotas_transmitidas, quotas_final,
    emissao_conjunta, conjuge_pessoa_id, vlr_aporte_moeda ),
  itcd_simulacao_donatario ( donatario_pessoa_id, quotas_atuais, quotas_legitima,
    quotas_disponivel, quotas_final, vlr_aporte_moeda ),
  itcd_simulacao_gia ( doador_pessoa_id, donatario_pessoa_id,
    vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado, ${COLUNAS_DA_ALTERNATIVA} ),
  itcd_simulacao_usufruto ( pessoa_id, papel, quotas, quotas_plena, quotas_nua_reserva,
    quotas_nua_instituicao, quotas_usufruto ),
  itcd_simulacao_concessao ( de_pessoa_id, para_pessoa_id, origem, quotas,
    vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado, ${COLUNAS_DA_ALTERNATIVA} )
`;

/** `numeric` chega como numero ou texto do PostgREST; texto e a forma do motor. */
const txt = (v: unknown): string => (v == null ? "0" : String(v));
const porRegua = (l: any, prefixo: "vlr_base" | "vlr_imposto" | "vlr_acervo"): PorRegua<string> => ({
  contabil: txt(l[`${prefixo}_contabil`]),
  itr: txt(l[`${prefixo}_itr`]),
  mercado: txt(l[`${prefixo}_mercado`]),
});

/** "100.00" → '100', "70.00" → '70'. Outro percentual e erro: poria o numero na coluna errada. */
const baseDe = (pct: unknown): BaseDoAto => {
  const t = String(pct ?? "").replace(/\.0+$/, "");
  if (t === "100" || t === "70") return t;
  throw new Error(`Base de cálculo gravada fora de 100% e 70%: ${String(pct)}.`);
};

/** As duas bases de uma linha de guia; `principal` diz em que base estao as colunas de sempre. */
const porBaseDe = (x: any, principal: BaseDoAto): PorBaseDoAto => ({
  [principal]: { base: porRegua(x, "vlr_base"), imposto: porRegua(x, "vlr_imposto") },
  ...(x.pct_base_alternativa != null
    ? {
      [baseDe(x.pct_base_alternativa)]: {
        base: {
          contabil: txt(x.vlr_base_alternativa_contabil),
          itr: txt(x.vlr_base_alternativa_itr),
          mercado: txt(x.vlr_base_alternativa_mercado),
        },
        imposto: {
          contabil: txt(x.vlr_imposto_alternativo_contabil),
          itr: txt(x.vlr_imposto_alternativo_itr),
          mercado: txt(x.vlr_imposto_alternativo_mercado),
        },
      },
    }
    : {}),
});

export function atoDaLinha(l: any): AtoDoCapitulo {
  const comReserva = l.com_reserva === true;
  // Sem reserva a guia da doação só existe na base integral.
  const baseDaDoacao: BaseDoAto = comReserva ? baseDe(l.pct_base_reserva) : "100";
  return {
    id: l.id,
    versao: l.versao,
    nome: l.nome ?? null,
    status: l.status,
    competencia: l.competencia,
    upf: txt(l.vlr_upf),
    totalDeQuotas: txt(l.quotas_total),
    acervo: porRegua(l, "vlr_acervo"),
    comReserva,
    origemId: l.origem_simulacao_id ?? null,
    doadores: (l.itcd_simulacao_doador ?? []).map((d: any) => ({
      pessoaId: d.doador_pessoa_id,
      quotas: txt(d.quotas),
      quotasTransmitidas: txt(d.quotas_transmitidas),
      quotasFinal: txt(d.quotas_final),
      emissaoConjunta: d.emissao_conjunta === true,
      conjugeId: d.conjuge_pessoa_id ?? null,
      aporte: txt(d.vlr_aporte_moeda),
    })),
    donatarios: (l.itcd_simulacao_donatario ?? []).map((d: any) => ({
      pessoaId: d.donatario_pessoa_id,
      quotasAtuais: txt(d.quotas_atuais),
      legitima: txt(d.quotas_legitima),
      disponivel: txt(d.quotas_disponivel),
      quotasFinal: txt(d.quotas_final),
      aporte: txt(d.vlr_aporte_moeda),
    })),
    gias: (l.itcd_simulacao_gia ?? []).map((g: any) => ({
      doadorId: g.doador_pessoa_id,
      donatarioId: g.donatario_pessoa_id,
      porBase: porBaseDe(g, baseDaDoacao),
    })),
    usufruto: (l.itcd_simulacao_usufruto ?? []).map((u: any) => ({
      pessoaId: u.pessoa_id,
      papel: u.papel,
      quotas: txt(u.quotas),
      plena: txt(u.quotas_plena),
      nuaReserva: txt(u.quotas_nua_reserva),
      nuaInstituicao: txt(u.quotas_nua_instituicao),
      usufruto: txt(u.quotas_usufruto),
    })),
    concessoes: (l.itcd_simulacao_concessao ?? []).map((c: any) => ({
      deId: c.de_pessoa_id,
      paraId: c.para_pessoa_id,
      origem: c.origem,
      quotas: txt(c.quotas),
      porBase: c.origem === "instituicao" ? porBaseDe(c, baseDe(l.pct_base_instituicao)) : {},
    })),
  };
}

/** A cadeia de um ato: ele e os anteriores, do mais antigo ao mais novo. Para em ciclo. */
function cadeiaDoAto(id: string, porId: Map<string, AtoDoCapitulo>): AtoDoCapitulo[] {
  const cadeia: AtoDoCapitulo[] = [];
  const vistos = new Set<string>();
  let atual = porId.get(id);
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    cadeia.unshift(atual);
    atual = atual.origemId ? porId.get(atual.origemId) : undefined;
  }
  return cadeia;
}

/**
 * As cadeias dos cenarios escolhidos (`simulacaoIds` e o ultimo ato de cada um) e as pessoas do cliente.
 * Repete as travas da tela; a falha vira o erro deste deck, e os outros saem.
 */
export async function carregarSucessoria(
  db: SB, clienteId: string, simulacaoIds: string[],
): Promise<{ entrada: EntradaDoCapitulo; empresaPessoaId: string }> {
  if (simulacaoIds.length === 0) throw new Error("Escolha ao menos uma simulação aprovada.");
  if (simulacaoIds.length > MAXIMO_DE_CENARIOS) {
    throw new Error(`O capítulo compara até ${MAXIMO_DE_CENARIOS} cenários.`);
  }

  const { data: linhas, error } = await db.from("itcd_simulacao").select(SELECT_SIMULACAO).eq("cliente_id", clienteId);
  if (error) throw error;
  const brutas = new Map<string, any>((linhas ?? []).map((l: any) => [l.id, l]));
  const porId = new Map<string, AtoDoCapitulo>([...brutas].map(([id, l]) => [id, atoDaLinha(l)]));

  const empresas = new Set<string>();
  const cenarios = simulacaoIds.map((id) => {
    if (!porId.has(id)) throw new Error("Uma das simulações não existe, ou você não tem acesso a ela.");
    const cadeia = cadeiaDoAto(id, porId);
    for (const a of cadeia) {
      if (a.status !== "aprovada") {
        const rotulo = a.nome?.trim() || `Versão ${a.versao}`;
        throw new Error(`"${rotulo}" não está aprovada. Só simulação aprovada entra na apresentação.`);
      }
      empresas.add(brutas.get(a.id).empresa_pessoa_id);
    }
    return cadeia;
  });
  if (empresas.size > 1) {
    throw new Error("As simulações escolhidas são de sociedades diferentes: o capítulo é de uma sociedade só.");
  }

  const { data: pessoasBrutas, error: erroPessoas } = await db
    .from("pessoa")
    .select("id, denominacao, genero, is_fundador, filiacao_pai_pessoa_id, filiacao_mae_pessoa_id")
    .eq("cliente_id", clienteId);
  if (erroPessoas) throw erroPessoas;
  const pessoas: PessoaDoCapitulo[] = (pessoasBrutas ?? []).map((p: any) => ({
    id: p.id,
    nome: p.denominacao ?? p.id,
    genero: p.genero === "M" || p.genero === "F" ? p.genero : null,
    fundador: p.is_fundador === true,
    filiacaoPaiId: p.filiacao_pai_pessoa_id ?? null,
    filiacaoMaeId: p.filiacao_mae_pessoa_id ?? null,
  }));

  let parentescos: ParentescoDoCapitulo[] = [];
  if (pessoas.length > 0) {
    const { data: rel, error: erroRel } = await db
      .from("parentesco")
      .select("pessoa_id, parente_pessoa_id, tipo")
      .in("pessoa_id", pessoas.map((p) => p.id));
    if (erroRel) throw erroRel;
    parentescos = (rel ?? []).map((r: any) => ({ pessoaId: r.pessoa_id, parenteId: r.parente_pessoa_id, tipo: r.tipo ?? "" }));
  }

  return { entrada: { cenarios, pessoas, parentescos }, empresaPessoaId: [...empresas][0] };
}
