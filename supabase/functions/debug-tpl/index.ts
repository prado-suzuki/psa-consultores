import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

serve(async (req) => {
  try {
    const u = new URL(req.url);
    const tpl = u.searchParams.get("tpl") || "TEMPLATE_PATRIMONIAL.pptx";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const dl = await admin.storage.from("osg-templates").download(tpl);
    if (dl.error || !dl.data) return new Response(JSON.stringify({ error: dl.error?.message }), { status: 500 });
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    const parts = unzipSync(bytes);
    const out: Record<string, unknown> = { size: bytes.byteLength, files: Object.keys(parts).length };
    const slides = Object.keys(parts).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort();
    out.slides = slides;
    const dump: Record<string, { len: number; text: string; tokens: string[]; hasTable: boolean; hasGroup: boolean } > = {};
    for (const s of slides) {
      const xml = strFromU8(parts[s]);
      const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(" | ");
      const tokens = [...xml.matchAll(/\{\{\s*([A-Z_0-9]+)\s*\}\}/g)].map((m) => m[1]);
      dump[s] = {
        len: xml.length,
        text: texts.slice(0, 4000),
        tokens: [...new Set(tokens)],
        hasTable: xml.includes("<a:tbl"),
        hasGroup: xml.includes("<p:grpSp"),
      };
    }
    out.dump = dump;
    return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), { status: 500 });
  }
});
