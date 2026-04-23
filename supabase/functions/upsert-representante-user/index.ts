import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";

interface UpsertRepresentanteUserRequest {
  email: string;
  first_name: string;
  last_name: string | null;
}

const FIXED_PASSWORD = 'trocarsenha';

Deno.serve(async (req) => {
  const _preflight = handleCorsPreflightRequest(req);
  if (_preflight) return _preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate caller
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerRoles, error: rolesError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    if (rolesError) {
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowed = (callerRoles ?? []).some(r =>
      r.role === 'admin' || r.role === 'lider' || r.role === 'sublider'
    );
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Sem permissão para criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body: UpsertRepresentanteUserRequest = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const first_name = (body.first_name || '').trim();
    const last_name = body.last_name && body.last_name.trim() !== '' ? body.last_name.trim() : null;

    if (!email || !first_name) {
      return new Response(
        JSON.stringify({ error: 'email e first_name são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if a profile already exists with this email
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string | null = existingProfile?.id ?? null;
    let created = false;

    if (!userId) {
      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: FIXED_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name,
          last_name: last_name ?? '',
          must_change_password: true,
        },
      });

      if (createError || !newUser?.user) {
        console.error('[upsert-representante-user] createUser error:', createError);
        // If already registered, attempt to find user by email via admin API
        if (createError?.message?.includes('already been registered')) {
          const { data: list } = await supabaseAdmin.auth.admin.listUsers();
          const match = list?.users?.find(u => (u.email || '').toLowerCase() === email);
          if (match) {
            userId = match.id;
          }
        }
        if (!userId) {
          return new Response(
            JSON.stringify({ error: createError?.message || 'Erro ao criar usuário' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        userId = newUser.user.id;
        created = true;
      }
    }

    // 2. Ensure 'client' role (idempotent)
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'client')
      .maybeSingle();

    if (!existingRole) {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({ user_id: userId, role: 'client' });
      if (roleError) {
        console.error('[upsert-representante-user] role insert error:', roleError);
      }
    }

    return new Response(
      JSON.stringify({ user_id: userId, created }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[upsert-representante-user] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
