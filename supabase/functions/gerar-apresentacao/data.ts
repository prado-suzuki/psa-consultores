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

export async function carregarOrganograma(admin: SB, clienteId: string): Promise<OrganogramaBands> {
  // Sócios vêm do QUADRO SOCIETÁRIO (não de todas as PFs do cliente).
  // Filtro: sócios distintos das empresas do cliente, mantendo apenas PF ou SC.
  const quadroSel = `
    socio:socio_pessoa_id!inner(id,denominacao,tipo_pessoa,tipo_empresa),
    empresa:empresa_pessoa_id!inner(id,cliente_id)
  `.replace(/\s+/g, "");
  const [{ data: pessoas, error: e1 }, { data: expl, error: e2 }, { data: quadro, error: e3 }] = await Promise.all([
    admin.from("pessoa").select("id,denominacao,tipo_pessoa,tipo_empresa").eq("cliente_id", clienteId),
    admin.from("exploracao_rural").select("id,explorador_nome,explorador_pessoa_id,tipo_exploracao,referencia").eq("cliente_id", clienteId),
    admin.from("quadro_societario").select(quadroSel).eq("empresa.cliente_id", clienteId),
  ]);
  if (e1) throw new Error(`organograma.pessoa: ${e1.message}`);
  if (e2) throw new Error(`organograma.exploracao_rural: ${e2.message}`);
  if (e3) throw new Error(`organograma.quadro_societario: ${e3.message}`);

  const controladoras: string[] = [];
  const controladas: string[] = [];

  for (const p of (pessoas ?? []) as any[]) {
    const nome = p.denominacao ?? "";
    if (!nome) continue;
    const te = String(p.tipo_empresa ?? "").toUpperCase();
    if (te === "CN") controladoras.push(nome);
    else if (te === "PR") controladas.push(nome);
  }

  // Sócios: distintos por id, apenas PF ou SC.
  const seen = new Set<string>();
  const socios: string[] = [];
  for (const r of (quadro ?? []) as any[]) {
    const s = r.socio;
    if (!s || !s.id) continue;
    if (seen.has(s.id)) continue;
    const nome = s.denominacao ?? "";
    if (!nome) continue;
    const tp = String(s.tipo_pessoa ?? "").toUpperCase();
    const te = String(s.tipo_empresa ?? "").toUpperCase();
    if (tp === "PF" || te === "SC") {
      seen.add(s.id);
      socios.push(nome);
    }
  }

  const rural: string[] = [];
  for (const e of (expl ?? []) as any[]) {
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
  const sel = `
    quotas,vlr_total,percentual,
    empresa:empresa_pessoa_id!inner(id,denominacao,cliente_id),
    socio:socio_pessoa_id(id,denominacao,tipo_pessoa)
  `.replace(/\s+/g, "");
  const { data, error } = await admin.from("quadro_societario").select(sel).eq("empresa.cliente_id", clienteId);
  if (error) throw new Error(`carregarQuadro: ${error.message}`);

  const map = new Map<string, { empresa: string; rows: QuadroLinha[] }>();
  for (const r of (data ?? []) as any[]) {
    const empId = r.empresa?.id;
    const empNome = r.empresa?.denominacao;
    if (!empId || !empNome) continue;
    if (!map.has(empId)) map.set(empId, { empresa: empNome, rows: [] });
    map.get(empId)!.rows.push({
      socio: r.socio?.denominacao ?? "—",
      quotas: Number(r.quotas ?? 0),
      valor: Number(r.vlr_total ?? 0),
      pct: 0, // recalculado
    });
  }

  const out: QuadroEmpresa[] = [];
  for (const [, v] of map) {
    const tq = v.rows.reduce((s, x) => s + x.quotas, 0);
    const tv = v.rows.reduce((s, x) => s + x.valor, 0);
    // Sentinel NaN quando total zero — fmtPct renderiza "—".
    for (const row of v.rows) row.pct = tq > 0 ? (row.quotas / tq) * 100 : NaN;
    v.rows.sort((a, b) => b.quotas - a.quotas || a.socio.localeCompare(b.socio, "pt-BR"));
    out.push({ empresa: v.empresa, linhas: v.rows, totalQuotas: tq, totalValor: tv });
  }
  out.sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
  return out;
}

// ---------- Titular ----------

export async function resolverTitular(admin: SB, clienteId: string): Promise<string> {
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
  const { data: fund } = await admin
    .from("pessoa")
    .select("denominacao")
    .eq("cliente_id", clienteId)
    .eq("is_fundador", true)
    .limit(1);
  if (fund && fund.length > 0) {
    const n = (fund[0] as any).denominacao;
    if (n) return String(n);
  }
  return "";
}
