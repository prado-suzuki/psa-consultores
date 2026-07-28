// Loaders de dados por seção do deck. Cliente PostgREST admin ja garantiu
// o gate de auth+cluster ANTES de chamar isso. As tabelas de conteudo
// (bem, pessoa, quadro_societario, matricula, titularidade, exploracao_rural)
// NAO tem coluna `ambiente` — isolamento e por cluster.

// deno-lint-ignore-file no-explicit-any
type SB = any;

// ---------- helpers ----------

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

// ---------- Patrimonial ----------

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

function nomesTitulares(titularidades: any[] | null | undefined): string {
  if (!titularidades || titularidades.length === 0) return "";
  const nomes: string[] = [];
  for (const t of titularidades) {
    const n = t?.titular?.denominacao;
    if (n && !nomes.includes(n)) nomes.push(n);
  }
  return nomes.join(", ");
}

export async function carregarPatrimonial(admin: SB, clienteId: string): Promise<SociedadePatrimonial[]> {
  const sel = `
    id,denominacao,vlr_contabil,participa_estruturacao,
    empresa_destino_pessoa_id,
    empresa_destino:empresa_destino_pessoa_id(denominacao),
    titularidade(fracao,titular:titular_pessoa_id(denominacao)),
    matricula(id,numero,matricula_anterior_texto,municipio_imovel,uf_imovel,vlr_contabil,
      titularidade(fracao,titular:titular_pessoa_id(denominacao)))
  `.replace(/\s+/g, "");
  const { data, error } = await admin.from("bem").select(sel).eq("cliente_id", clienteId).order("denominacao");
  if (error) throw new Error(`carregarPatrimonial: ${error.message}`);
  const bens = (data ?? []).filter((b: any) => b.participa_estruturacao !== false);

  const buckets = new Map<string, LinhaPatrimonial[]>();
  const fallback = "Sociedade a definir";

  for (const b of bens) {
    const soc = b.empresa_destino?.denominacao || fallback;
    if (!buckets.has(soc)) buckets.set(soc, []);
    const linhas = buckets.get(soc)!;
    const refBem = b.denominacao ?? "";
    const titulBem = nomesTitulares(b.titularidade);

    const mats = (b.matricula ?? []) as any[];
    if (mats.length === 0) {
      linhas.push({
        propriedade: titulBem || "—",
        referencia: refBem,
        matriculaLabel: "Não se aplica",
        municipioUf: "—",
        valor: fmtBRL(b.vlr_contabil),
      });
    } else {
      for (const m of mats) {
        const titulMat = nomesTitulares(m.titularidade) || titulBem;
        const numero = m.numero ?? null;
        const matLabel = numero ? `Mat. ${numero}` : "Não se aplica";
        const mun = [m.municipio_imovel, m.uf_imovel].filter(Boolean).join("/") || "—";
        linhas.push({
          propriedade: titulMat || "—",
          referencia: refBem,
          matriculaLabel: matLabel,
          municipioUf: mun,
          valor: fmtBRL(m.vlr_contabil ?? b.vlr_contabil),
        });
      }
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .map(([nome, linhas]) => ({ nome, linhas }));
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

interface SocioIdent {
  pessoaId: string | null;
  denominacao: string;
  tipoPessoa: string | null;
  tipoEmpresa: string | null;
}

interface QuadroResult {
  linhas: QuadroLinha[];
  totalQuotas: number;
  totalValor: number;
  socios: SocioIdent[]; // reaproveitado pela faixa "Sócios" do organograma
}

async function listarEmpresasPJ(admin: SB, clienteId: string): Promise<EmpresaPJ[]> {
  const { data, error } = await admin
    .from("pessoa")
    .select("id,denominacao,tipo_pessoa,tipo_empresa")
    .eq("cliente_id", clienteId)
    .eq("tipo_pessoa", "PJ");
  if (error) throw new Error(`listarEmpresasPJ: ${error.message}`);
  return ((data ?? []) as any[])
    .filter((p) => p?.denominacao)
    .map((p) => ({ id: p.id, denominacao: p.denominacao, tipo_empresa: p.tipo_empresa ?? null }));
}

// Quadro MANUAL para holdings CN: mantém a lógica original (quotas/vlr_total
// vindos da tabela; percentual recalculado por Σquotas).
async function quadroCN(admin: SB, empresaId: string): Promise<QuadroResult> {
  const sel = `quotas,vlr_total,percentual,socio:socio_pessoa_id(id,denominacao,tipo_pessoa,tipo_empresa)`;
  const { data, error } = await admin
    .from("quadro_societario")
    .select(sel)
    .eq("empresa_pessoa_id", empresaId);
  if (error) throw new Error(`quadroCN(${empresaId}): ${error.message}`);

  const linhas: QuadroLinha[] = [];
  const socios: SocioIdent[] = [];
  const seen = new Set<string>();
  for (const r of (data ?? []) as any[]) {
    const s = r.socio;
    const denom = s?.denominacao ?? "—";
    linhas.push({
      socio: denom,
      quotas: Number(r.quotas ?? 0),
      valor: Number(r.vlr_total ?? 0),
      pct: 0,
    });
    if (s?.id && !seen.has(s.id)) {
      seen.add(s.id);
      socios.push({
        pessoaId: s.id,
        denominacao: denom,
        tipoPessoa: s.tipo_pessoa ?? null,
        tipoEmpresa: s.tipo_empresa ?? null,
      });
    }
  }
  const tq = linhas.reduce((s, x) => s + x.quotas, 0);
  const tv = linhas.reduce((s, x) => s + x.valor, 0);
  for (const row of linhas) row.pct = tq > 0 ? (row.quotas / tq) * 100 : NaN;
  linhas.sort((a, b) => b.quotas - a.quotas || a.socio.localeCompare(b.socio, "pt-BR"));
  return { linhas, totalQuotas: tq, totalValor: tv, socios };
}

// Quadro DERIVADO para empresas PR — espelha calcularParticipacoesPR do front
// (src/lib/templates/mapeadores.ts): rateio em centavos por fração de
// titularidade dos bens Aprovados para integralização; matrículas com
// impedimento ativo entram fora; último sócio absorve resíduo de arredondamento.
async function quadroPR(admin: SB, empresaId: string): Promise<QuadroResult> {
  const sel = `
    vlr_contabil,
    matricula(
      vlr_contabil,
      titularidade(integralizador,fracao,titular:titular_pessoa_id(id,denominacao,tipo_pessoa,tipo_empresa)),
      impedimento(id,cancelado)
    )
  `.replace(/\s+/g, "");
  const { data, error } = await admin
    .from("bem")
    .select(sel)
    .eq("empresa_destino_pessoa_id", empresaId)
    .eq("status_integralizacao", "Aprovado");
  if (error) throw new Error(`quadroPR(${empresaId}): ${error.message}`);

  interface Tit {
    pessoaId: string | null;
    denominacao: string;
    tipoPessoa: string | null;
    tipoEmpresa: string | null;
    integralizador: boolean;
    fracao: number | null;
  }
  interface Acc {
    pessoaId: string | null;
    denominacao: string;
    tipoPessoa: string | null;
    tipoEmpresa: string | null;
    cent: number;
  }
  const porChave = new Map<string, Acc>();

  for (const b of (data ?? []) as any[]) {
    const bemVlr = b.vlr_contabil;
    for (const m of (b.matricula ?? []) as any[]) {
      // impedimento ATIVO (algum sem cancelado=true) descarta a matrícula
      const imp = (m.impedimento ?? []) as any[];
      if (imp.some((i) => i && i.cancelado !== true)) continue;

      const vlrRaw = m.vlr_contabil ?? bemVlr;
      const vlr = vlrRaw == null ? null : Number(vlrRaw);
      if (vlr == null || !Number.isFinite(vlr)) continue;

      // Dedup titulares por pessoa (integralizador OR; primeira fração não-nula)
      const raw: Tit[] = ((m.titularidade ?? []) as any[]).map((t) => ({
        pessoaId: t?.titular?.id ?? null,
        denominacao: t?.titular?.denominacao ?? "—",
        tipoPessoa: t?.titular?.tipo_pessoa ?? null,
        tipoEmpresa: t?.titular?.tipo_empresa ?? null,
        integralizador: !!t?.integralizador,
        fracao: t?.fracao == null ? null : Number(t.fracao),
      }));
      const porPessoa = new Map<string, Tit>();
      const titulares: Tit[] = [];
      for (const t of raw) {
        if (!t.pessoaId) { titulares.push({ ...t }); continue; }
        const ex = porPessoa.get(t.pessoaId);
        if (ex) {
          ex.integralizador = ex.integralizador || t.integralizador;
          if (ex.fracao == null) ex.fracao = t.fracao;
        } else {
          const novo = { ...t };
          porPessoa.set(t.pessoaId, novo);
          titulares.push(novo);
        }
      }
      if (titulares.length === 0) continue;

      const totalCent = Math.round(vlr * 100);
      const comFracao = titulares.filter((t) => t.fracao != null);
      const semFracao = titulares.filter((t) => t.fracao == null);
      // "Fechada": todos com fração e Σ ≈ 100 → último absorve resíduo
      const fechada =
        semFracao.length === 0 &&
        Math.abs(comFracao.reduce((s, t) => s + (t.fracao as number), 0) - 100) < 0.001;

      const centDe = new Map<Tit, number>();
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

      for (const t of titulares) {
        const chave = t.pessoaId ?? `nome:${t.denominacao}`;
        const atual = porChave.get(chave);
        const cent = centDe.get(t) ?? 0;
        if (atual) atual.cent += cent;
        else porChave.set(chave, {
          pessoaId: t.pessoaId,
          denominacao: t.denominacao,
          tipoPessoa: t.tipoPessoa,
          tipoEmpresa: t.tipoEmpresa,
          cent,
        });
      }
    }
  }

  const capitalCent = [...porChave.values()].reduce((s, a) => s + a.cent, 0);
  if (capitalCent === 0) return { linhas: [], totalQuotas: 0, totalValor: 0, socios: [] };

  const ordenados = [...porChave.values()].sort((a, z) => z.cent - a.cent);
  const linhas: QuadroLinha[] = ordenados.map((a) => ({
    socio: a.denominacao,
    valor: a.cent / 100,
    quotas: Math.round(a.cent / 100),
    pct: (a.cent / capitalCent) * 100,
  }));
  const totalQuotas = Math.round(capitalCent / 100);
  const somaQuotas = linhas.reduce((s, p) => s + p.quotas, 0);
  if (linhas.length > 0) linhas[linhas.length - 1].quotas += totalQuotas - somaQuotas;

  const socios: SocioIdent[] = ordenados.map((a) => ({
    pessoaId: a.pessoaId,
    denominacao: a.denominacao,
    tipoPessoa: a.tipoPessoa,
    tipoEmpresa: a.tipoEmpresa,
  }));
  return { linhas, totalQuotas, totalValor: capitalCent / 100, socios };
}

// Roteia por tipo_empresa: CN=manual, PR=derivado, resto=ignora.
async function quadroDaEmpresa(admin: SB, e: EmpresaPJ): Promise<QuadroResult | null> {
  const te = String(e.tipo_empresa ?? "").toUpperCase();
  if (te === "CN") return await quadroCN(admin, e.id);
  if (te === "PR") return await quadroPR(admin, e.id);
  return null; // SC (sócio) ou sem tipo: não é empresa deste cliente
}

export async function carregarOrganograma(admin: SB, clienteId: string): Promise<OrganogramaBands> {
  const [empresas, explRes] = await Promise.all([
    listarEmpresasPJ(admin, clienteId),
    admin.from("exploracao_rural")
      .select("id,explorador_nome,explorador_pessoa_id,tipo_exploracao,referencia")
      .eq("cliente_id", clienteId),
  ]);
  if (explRes.error) throw new Error(`organograma.exploracao_rural: ${explRes.error.message}`);

  const controladoras: string[] = [];
  const controladas: string[] = [];
  for (const e of empresas) {
    const te = String(e.tipo_empresa ?? "").toUpperCase();
    if (te === "CN") controladoras.push(e.denominacao);
    else if (te === "PR") controladas.push(e.denominacao);
  }

  // Sócios: uniao dos socios de cada empresa (CN manual / PR derivado),
  // filtrando PF ou SC, dedup por pessoaId (fallback nome).
  const seen = new Set<string>();
  const socios: string[] = [];
  for (const e of empresas) {
    const r = await quadroDaEmpresa(admin, e);
    if (!r) continue;
    for (const s of r.socios) {
      const tp = String(s.tipoPessoa ?? "").toUpperCase();
      const te = String(s.tipoEmpresa ?? "").toUpperCase();
      if (!(tp === "PF" || te === "SC")) continue;
      const chave = s.pessoaId ?? `nome:${s.denominacao}`;
      if (seen.has(chave)) continue;
      seen.add(chave);
      if (s.denominacao) socios.push(s.denominacao);
    }
  }

  const rural: string[] = [];
  for (const e of (explRes.data ?? []) as any[]) {
    const label = e.referencia || e.explorador_nome;
    if (label) rural.push(label);
  }

  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  return { socios: uniq(socios), controladoras: uniq(controladoras), controladas: uniq(controladas), rural: uniq(rural) };
}

// ---------- Quadro societario ----------

export interface QuadroLinha { socio: string; quotas: number; valor: number; pct: number }
export interface QuadroEmpresa { empresa: string; linhas: QuadroLinha[]; totalQuotas: number; totalValor: number }

export async function carregarQuadro(admin: SB, clienteId: string): Promise<QuadroEmpresa[]> {
  const empresas = await listarEmpresasPJ(admin, clienteId);
  const out: QuadroEmpresa[] = [];
  for (const e of empresas) {
    const r = await quadroDaEmpresa(admin, e);
    if (!r || r.linhas.length === 0) continue;
    out.push({ empresa: e.denominacao, linhas: r.linhas, totalQuotas: r.totalQuotas, totalValor: r.totalValor });
  }
  out.sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
  return out;
}

// ---------- Titular ----------

export async function resolverTitular(admin: SB, clienteId: string): Promise<string> {
  // Titular = explorador principal da composse cadastrada.
  // Sem composse cadastrada → placeholder claro (nunca inventar via is_fundador).
  const { data: expl } = await admin
    .from("exploracao_rural")
    .select("explorador_nome,explorador:explorador_pessoa_id(denominacao)")
    .eq("cliente_id", clienteId)
    .eq("tipo_exploracao", "composse")
    .limit(1);
  if (expl && expl.length > 0) {
    const e = expl[0] as any;
    const n = e.explorador?.denominacao || e.explorador_nome;
    if (n) return String(n);
  }
  return "[titular da composse — a definir]";
}
