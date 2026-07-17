// Edge Function: gerar-apresentacao (F0 + F1)
//
// F0: infra completa — auth JWT + role team_member+ + isolamento por cluster
// (interseção entre resolve_user_cluster_ids(auth.uid()) e cliente_clusters),
// carga do template do bucket privado `osg-templates`, upload em
// `osg-apresentacoes` e persistência em `documento_gerado`/`documento_arquivo`
// com signed URL.
//
// F1: substituição de tokens {{CLIENTE}}, {{DATA}}, {{SOCIEDADE}} em TODOS os
// slides, com merge de runs fragmentados. Ainda NÃO clona linhas de tabela
// nem duplica slides — isso é F2+.
//
// Contrato:
//   POST { clienteId: string, tipo: 'ambas' | 'patrimonial' | 'societaria' }
//   → { arquivos: [{ tipo, nome, url }] }  (URL assinada 10min)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
import { unpackPptx, packPptx, readText, writeText, listPaths } from "../_shared/ooxml/zip.ts";
import { applyTokensToSlideXml } from "../_shared/ooxml/runs.ts";
import { stripTiming } from "../_shared/ooxml/timing.ts";
import { validatePptx } from "../_shared/ooxml/validate.ts";

type DeckTipo = "patrimonial" | "societaria";
type BodyTipo = DeckTipo | "ambas";

const TEMPLATE_PATHS: Record<DeckTipo, string> = {
  patrimonial: "TEMPLATE_PATRIMONIAL.pptx",
  societaria: "TEMPLATE_SOCIETARIA.pptx",
};
const TEMPLATE_IDS: Record<DeckTipo, string> = {
  patrimonial: "a11a11a1-0000-4000-8000-000000000001",
  societaria: "a11a11a1-0000-4000-8000-000000000002",
};

const BUCKET_TEMPLATES = "osg-templates";
const BUCKET_OUTPUT = "osg-apresentacoes";
const SIGNED_URL_TTL = 600;
const GENERATOR_VERSION = "0.1.0-f1";

function slugify(s: string): string {
  return (s || "cliente")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "cliente";
}

function tsStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function dataBR(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

async function gerarDeck(
  admin: ReturnType<typeof createClient>,
  tipo: DeckTipo,
  clienteNome: string,
): Promise<{ bytes: Uint8Array; contagens: Record<string, number> }> {
  // 1) Baixa o template do bucket privado
  const dl = await admin.storage.from(BUCKET_TEMPLATES).download(TEMPLATE_PATHS[tipo]);
  if (dl.error || !dl.data) throw new Error(`Template ausente: ${TEMPLATE_PATHS[tipo]}`);
  const buf = new Uint8Array(await dl.data.arrayBuffer());
  const parts = unpackPptx(buf);

  // 2) Aplica tokens em todos os slides (F1)
  const tokens: Record<string, string> = {
    CLIENTE: clienteNome,
    DATA: dataBR(),
    SOCIEDADE: clienteNome, // será refinado em F3/F4 quando gerar por sociedade
  };
  const slidePaths = listPaths(parts, "ppt/slides/slide", ".xml");
  for (const sp of slidePaths) {
    const xml = readText(parts, sp);
    let out = applyTokensToSlideXml(xml, tokens);
    out = stripTiming(out);
    writeText(parts, sp, out);
  }

  // 3) Validação leve
  const issues = validatePptx(parts);
  if (issues.length > 0) throw new Error(`PPTX inválido: ${JSON.stringify(issues).slice(0, 500)}`);

  const bytes = packPptx(parts);
  return { bytes, contagens: { slides: slidePaths.length } };
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const cors = buildCorsHeaders(req);
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Role: team_member+
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = new Set((roleRows ?? []).map((r: any) => r.role));
    const isInternal =
      roles.has("admin") || roles.has("lider") || roles.has("sublider") || roles.has("team_member");
    if (!isInternal) return json({ error: "Forbidden: requires team_member+" }, 403);

    // Body
    const body = await req.json().catch(() => ({}));
    const clienteId = String(body?.clienteId ?? "");
    const tipoIn = String(body?.tipo ?? "") as BodyTipo;
    if (!clienteId || !["ambas", "patrimonial", "societaria"].includes(tipoIn)) {
      return json({ error: "clienteId e tipo são obrigatórios (tipo ∈ ambas|patrimonial|societaria)" }, 400);
    }

    // Cluster isolation: interseção resolve_user_cluster_ids × cliente_clusters
    const isAdmin = roles.has("admin");
    if (!isAdmin) {
      const [{ data: userClusters }, { data: cliClusters }] = await Promise.all([
        admin.rpc("resolve_user_cluster_ids", { _uid: userId }),
        admin.from("cliente_clusters").select("cluster_id").eq("cliente_id", clienteId),
      ]);
      const userSet = new Set<string>(((userClusters ?? []) as any[]).map(String));
      const inter = ((cliClusters ?? []) as any[]).some((r) => userSet.has(String(r.cluster_id)));
      if (!inter) return json({ error: "Forbidden: cliente fora dos seus clusters" }, 403);
    }

    // Cliente
    const { data: cli, error: cliErr } = await admin
      .from("cliente").select("id, nome, excluido").eq("id", clienteId).maybeSingle();
    if (cliErr || !cli || cli.excluido) return json({ error: "Cliente não encontrado" }, 404);

    const decks: DeckTipo[] = tipoIn === "ambas" ? ["patrimonial", "societaria"] : [tipoIn];
    const arquivos: Array<{ tipo: DeckTipo; nome: string; url: string }> = [];
    const erros: Array<{ tipo: DeckTipo; message: string }> = [];

    // Sequencial (evita pico de memória — templates ~19MB cada)
    for (const tipo of decks) {
      try {
        const { bytes, contagens } = await gerarDeck(admin, tipo, cli.nome);

        const stamp = tsStamp();
        const clienteSlug = slugify(cli.nome);
        const tipoLabel = tipo === "patrimonial" ? "Patrimonial" : "Societaria";
        const nomeArquivo = `PSA_${tipoLabel}_${clienteSlug}_${stamp.slice(0, 8)}.pptx`;
        const caminho = `${clienteId}/${stamp}_${tipo}.pptx`;

        const up = await admin.storage.from(BUCKET_OUTPUT).upload(caminho, bytes, {
          contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          upsert: false,
        });
        if (up.error) throw new Error(`upload: ${up.error.message}`);

        // Versionamento leve
        const { data: anterior } = await admin
          .from("documento_gerado")
          .select("id, documento_raiz_id")
          .eq("cliente_id", clienteId)
          .eq("documento_template_id", TEMPLATE_IDS[tipo])
          .order("gerado_em", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: gerado, error: gErr } = await admin.from("documento_gerado").insert({
          cliente_id: clienteId,
          documento_template_id: TEMPLATE_IDS[tipo],
          caminho_arquivo: `${BUCKET_OUTPUT}/${caminho}`,
          snapshot_dados: { tipo, contagens, versao_gerador: GENERATOR_VERSION, template: TEMPLATE_PATHS[tipo] },
          snapshot_flags: {},
          snapshot_versoes_blocos: {},
          status: "gerado",
          gerado_por_id: userId,
          gerado_em: new Date().toISOString(),
          documento_anterior_id: anterior?.id ?? null,
          documento_raiz_id: anterior?.documento_raiz_id ?? anterior?.id ?? null,
        }).select("id").single();
        if (gErr) throw new Error(`documento_gerado: ${gErr.message}`);

        await admin.from("documento_arquivo").insert({
          documento_gerado_id: gerado.id,
          nome_arquivo: nomeArquivo,
          caminho_arquivo: `${BUCKET_OUTPUT}/${caminho}`,
          area: "osg",
        });

        const { data: signed, error: sErr } = await admin.storage
          .from(BUCKET_OUTPUT).createSignedUrl(caminho, SIGNED_URL_TTL);
        if (sErr || !signed?.signedUrl) throw new Error(`signedUrl: ${sErr?.message ?? "vazio"}`);

        arquivos.push({ tipo, nome: nomeArquivo, url: signed.signedUrl });
      } catch (e: any) {
        erros.push({ tipo, message: String(e?.message ?? e) });
      }
    }

    if (arquivos.length === 0) return json({ error: "Falha ao gerar", detalhes: erros }, 500);
    return json({ arquivos, erros: erros.length ? erros : undefined });
  } catch (e: any) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
