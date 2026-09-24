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


async function listarEmpresasPJ(admin: SB, clienteId: string, probs?: Probs): Promise<EmpresaPJ[]> {
  const { data, error } = await admin
    .from("pessoa")
    .select("id,denominacao,tipo_pessoa,tipo_empresa")
    .eq("cliente_id", clienteId)
    .eq("tipo_pessoa", "PJ");
  if (error) throw new Error(`listarEmpresasPJ: ${error.message}`);

    anota(probs, ONDE.quadro, `${plural(semNome, "empresa foi ignorada", "empresas foram ignoradas")}: sem denominação no cadastro.`);
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

    anota(probs, ONDE.quadro, `${plural(semPessoa, "linha do quadro de", "linhas do quadro de")} "${denominacao}" não aponta para uma pessoa e ficou de fora.`);

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

export async function carregarOrganograma(admin: SB, clienteId: string, probs?: Probs): Promise<OrganogramaBands> {
  /* Sem `probs` no `listarEmpresasPJ`: quem relata empresa sem denominacao e o
     `carregarQuadro`, que chama a mesma funcao. Passar nos dois duplicaria. */
  const [empresas, explRes] = await Promise.all([
    listarEmpresasPJ(admin, clienteId),
    admin.from("exploracao_rural")
      .select("id,tipo_exploracao,referencia,partes:exploracao_rural_parte(papel,pessoa:pessoa_id(denominacao))")
      .eq("cliente_id", clienteId),
  ]);
  if (explRes.error) throw new Error(`organograma.exploracao_rural: ${explRes.error.message}`);

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

  const rural: string[] = [];
  for (const e of (explRes.data ?? []) as any[]) {
    const label = e.referencia;
    if (label) rural.push(label);
    const partes = (e.partes ?? []) as any[];
    for (const p of partes) {
      if (p.papel === "explorador" && p.pessoa?.denominacao) rural.push(p.pessoa.denominacao);
    }
  }

  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { socios: uniq(socios), controladoras: uniq(controladoras), controladas: uniq(controladas), rural: uniq(rural) };
}

// ---------- Quadro societario ----------

export type { QuadroLinha } from "../_shared/apresentacao-osg/conteudo.ts";
export interface QuadroEmpresa { empresa: string; linhas: QuadroLinha[]; totalQuotas: number; totalValor: number }

export async function carregarQuadro(admin: SB, clienteId: string, probs?: Probs): Promise<QuadroEmpresa[]> {
  const empresas = await listarEmpresasPJ(admin, clienteId, probs);
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
  // Titular = explorador principal da composse cadastrada.
  // Sem composse cadastrada → placeholder claro (nunca inventar via is_fundador).
  const { data: expl, error } = await admin
    .from("exploracao_rural")
    .select("id,partes:exploracao_rural_parte(papel,pessoa:pessoa_id(denominacao))")
    .eq("cliente_id", clienteId)
    .eq("tipo_exploracao", "composse")
    .limit(1);
  if (error) throw new Error(`resolverTitular: ${error.message}`);
  if (expl && expl.length > 0) {
    const partes = (expl[0] as any)?.partes ?? [];
    const explorador = partes.find((p: any) => p.papel === "explorador");
    const n = explorador?.pessoa?.denominacao;
    if (n) return String(n);
  }
  // O placeholder vai IMPRESSO no slide, entao o aviso nao e opcional: e a unica
  // chance de alguem trocar antes de a apresentacao chegar ao cliente.
  anota(probs, ONDE.organograma, "O titular sai como \"[titular da composse — a definir]\" — não há composse com explorador cadastrado.");
  return "[titular da composse — a definir]";
}
