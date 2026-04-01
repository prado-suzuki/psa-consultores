import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// URLs por ambiente
const API_URLS = {
  development: 'https://psa-backend-api-456879351254.southamerica-east1.run.app',
  production: 'https://psa-backend-api-1010211821554.southamerica-east1.run.app',
}

interface PerRecord {
  nr_per: string
  id_contribuinte: string
  exercicio: number
  tri_exercicio: number
  dt_solicitada: string
  tp_credito: string
  vlr_credito: number
  nr_proc_ret?: string | null
  porcentagem_psa?: number | null
  excluido?: string | null
  nr_cancelamento?: string | null
}

interface PerSituacaoRecord {
  id: string
  nr_proc_per: string
  situacao: string
  dt_pagamento?: string | null
  criado_em?: string | null
  criado_por?: string | null
}

interface DcompRecord {
  nr_documento: string
  nr_per_orig: string
  mes_ano_exercicio: string
  dt_envio: string
  imposto: string
  tp_credito: string
  vlr_compensado: number
  nr_dcomp_ret?: string | null
  porcentagem_psa?: number | null
  excluido?: string | null
  nr_cancelamento?: string | null
}

interface SyncPayload {
  per?: PerRecord[]
  per_situacao?: PerSituacaoRecord[]
  dcomp?: DcompRecord[]
  environment: 'development' | 'production'
}

async function syncWithDW(payload: SyncPayload, userToken: string): Promise<void> {
  const apiUrl = API_URLS[payload.environment]
  const syncUrl = `${apiUrl}/api/v1/sync/perdcomp`

  console.log(`[sync-perdcomp] Iniciando sync para ${payload.environment}`)
  console.log(`[sync-perdcomp] URL: ${syncUrl}`)
  console.log(`[sync-perdcomp] PER: ${payload.per?.length || 0}`)
  console.log(`[sync-perdcomp] PER Situação: ${payload.per_situacao?.length || 0}`)
  console.log(`[sync-perdcomp] DCOMP: ${payload.dcomp?.length || 0}`)

  try {
    const body: { per?: PerRecord[]; per_situacao?: PerSituacaoRecord[]; dcomp?: DcompRecord[] } = {}

    if (payload.per && payload.per.length > 0) {
      body.per = payload.per
    }
    if (payload.per_situacao && payload.per_situacao.length > 0) {
      body.per_situacao = payload.per_situacao
    }
    if (payload.dcomp && payload.dcomp.length > 0) {
      body.dcomp = payload.dcomp
    }

    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[sync-perdcomp] Erro HTTP ${response.status}: ${errorText}`)
      return
    }

    const result = await response.json()
    console.log(`[sync-perdcomp] Sync concluído:`, result)
  } catch (error) {
    console.error(`[sync-perdcomp] Erro no sync:`, error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userToken = authHeader.replace('Bearer ', '')

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(userToken)
    if (claimsError || !claimsData?.claims) {
      console.error('[sync-perdcomp] Token inválido:', claimsError?.message)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string

    // Verificar role
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (rolesError) {
      console.error('[sync-perdcomp] Erro ao verificar roles:', rolesError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userRoles = roles?.map(r => r.role) || []
    const hasPermission = userRoles.includes('team_member') || userRoles.includes('admin')

    if (!hasPermission) {
      console.error('[sync-perdcomp] Usuário sem permissão:', userId)
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json() as SyncPayload

    if (!body.per && !body.per_situacao && !body.dcomp) {
      return new Response(
        JSON.stringify({ error: 'Payload vazio - envie per, per_situacao ou dcomp' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.environment || !['development', 'production'].includes(body.environment)) {
      return new Response(
        JSON.stringify({ error: 'Ambiente inválido - use development ou production' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fire-and-forget
    // @ts-ignore
    (globalThis as any).EdgeRuntime?.waitUntil?.(syncWithDW(body, userToken)) || syncWithDW(body, userToken);

    console.log(`[sync-perdcomp] Sync iniciado em background para ${body.environment} (user: ${userId})`);

    return new Response(
      JSON.stringify({
        status: 'syncing',
        message: 'Sincronização iniciada em background',
        per: body.per?.length || 0,
        per_situacao: body.per_situacao?.length || 0,
        dcomp: body.dcomp?.length || 0,
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[sync-perdcomp] Erro:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
