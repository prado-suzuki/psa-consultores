import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

serve(async (req) => {
  const u = new URL(req.url);
  const tpl = u.searchParams.get("tpl")!;
  const slide = u.searchParams.get("slide")!;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const dl = await admin.storage.from("osg-templates").download(tpl);
  const bytes = new Uint8Array(await dl.data!.arrayBuffer());
  const parts = unzipSync(bytes);
  const xml = strFromU8(parts[`ppt/slides/${slide}.xml`]);
  return new Response(xml, { headers: { "Content-Type": "text/xml" } });
});
