import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

const ALLOWED_TABLES = ['per', 'per_situacao', 'dcomp', 'per_with_contribuinte'] as const
type AllowedTable = typeof ALLOWED_TABLES[number]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key')
    const secret = Deno.env.get('DW_SYNC_TOKEN')

    if (!apiKey || apiKey !== secret) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const url = new URL(req.url)
    const table = url.searchParams.get('table') as AllowedTable | null

    if (!table || !ALLOWED_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Tabela inválida. Use: ${ALLOWED_TABLES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Optional pagination
    const limit = Math.min(Number(url.searchParams.get('limit') || 10000), 10000)
    const offset = Number(url.searchParams.get('offset') || 0)

    // Optional select columns
    const select = url.searchParams.get('select') || '*'

    const { data, error, count } = await supabase
      .from(table)
      .select(select, { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error(`[dw-query] Erro ao consultar ${table}:`, error.message)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ table, count, limit, offset, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[dw-query] Erro:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
