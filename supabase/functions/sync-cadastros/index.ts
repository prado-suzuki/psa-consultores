import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URLs por ambiente
const API_URLS = {
  development: 'https://psa-backend-api-456879351254.southamerica-east1.run.app',
  production: 'https://psa-backend-api-1010211821554.southamerica-east1.run.app',
}

interface Cliente {
  id_cliente: string
  nome: string
  fixo: string | null
  telefone: string | null
  setor_cliente: string | null
  municipio: string | null
  uf: string | null
  ativo: boolean | null
  created_at: string
  updated_at: string
}

interface Contribuinte {
  id_contribuinte: string
  id_cliente: string
  tipo_pessoa: string
  cpf_cnpj: string | null
  nome_razao_social: string
  inscricao_estadual: string | null
  cod_cnae: string | null
  setor: string | null
  simples_nacional: boolean | null
  created_at: string
  updated_at: string
}

interface SyncPayload {
  clientes?: Cliente[]
  contribuintes?: Contribuinte[]
  environment: 'development' | 'production'
}

async function syncWithDW(payload: SyncPayload, userToken: string): Promise<void> {
  const apiUrl = API_URLS[payload.environment]
  const syncUrl = `${apiUrl}/api/v1/sync/cadastros`
  
  console.log(`[sync-cadastros] Iniciando sync para ${payload.environment}`)
  console.log(`[sync-cadastros] URL: ${syncUrl}`)
  console.log(`[sync-cadastros] Clientes: ${payload.clientes?.length || 0}`)
  console.log(`[sync-cadastros] Contribuintes: ${payload.contribuintes?.length || 0}`)
  
  try {
    const body: { clientes?: Cliente[]; contribuintes?: Contribuinte[] } = {}
    
    if (payload.clientes && payload.clientes.length > 0) {
      body.clientes = payload.clientes
    }
    if (payload.contribuintes && payload.contribuintes.length > 0) {
      body.contribuintes = payload.contribuintes
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
      console.error(`[sync-cadastros] Erro HTTP ${response.status}: ${errorText}`)
      return
    }
    
    const result = await response.json()
    console.log(`[sync-cadastros] Sync concluído:`, result)
  } catch (error) {
    console.error(`[sync-cadastros] Erro no sync:`, error)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
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
    
    // Verificar se o usuário está autenticado usando getClaims
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(userToken)
    if (claimsError || !claimsData?.claims) {
      console.error('[sync-cadastros] Token inválido:', claimsError?.message)
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = claimsData.claims.sub as string

    // Verificar role (team_member ou admin)
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
    
    if (rolesError) {
      console.error('[sync-cadastros] Erro ao verificar roles:', rolesError.message)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userRoles = roles?.map(r => r.role) || []
    const hasPermission = userRoles.some(r => ['admin', 'lider', 'sublider', 'team_member'].includes(r))
    
    if (!hasPermission) {
      console.error('[sync-cadastros] Usuário sem permissão:', userId)
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parsear body
    const body = await req.json() as SyncPayload
    
    if (!body.clientes && !body.contribuintes) {
      return new Response(
        JSON.stringify({ error: 'Payload vazio - envie clientes ou contribuintes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.environment || !['development', 'production'].includes(body.environment)) {
      return new Response(
        JSON.stringify({ error: 'Ambiente inválido - use development ou production' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Executar sync em background usando o token do usuário
    // @ts-ignore - EdgeRuntime é disponível em runtime
    (globalThis as any).EdgeRuntime?.waitUntil?.(syncWithDW(body, userToken)) || syncWithDW(body, userToken);
    
    console.log(`[sync-cadastros] Sync iniciado em background para ${body.environment} (user: ${userId})`);

    // Retornar imediatamente
    return new Response(
      JSON.stringify({ 
        status: 'syncing',
        message: 'Sincronização iniciada em background',
        clientes: body.clientes?.length || 0,
        contribuintes: body.contribuintes?.length || 0,
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[sync-cadastros] Erro:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
