import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables:', {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey,
        hasAnonKey: !!supabaseAnonKey,
      });
      return new Response(
        JSON.stringify({ error: 'Erro de configuração do servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Check if requesting user is admin
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'ID do usuário é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deletion
    if (user_id === requestingUser.id) {
      return new Response(
        JSON.stringify({ error: 'Você não pode excluir sua própria conta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Clean up dependent records before deleting auth user
    // These tables reference profiles.id which references auth.users.id
    const cleanupTables = [
      { table: 'user_page_access', column: 'user_id' },
      { table: 'user_page_access', column: 'granted_by' },
      { table: 'user_roles', column: 'user_id' },
      { table: 'estrutura_area_lideres', column: 'user_id' },
      { table: 'estrutura_equipe_membros', column: 'user_id' },
      { table: 'daily_standups', column: 'user_id' },
      { table: 'client_visible_projects', column: 'user_id' },
      { table: 'deliverable_attachments', column: 'uploaded_by' },
    ];

    for (const { table, column } of cleanupTables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, user_id);
      
      if (error) {
        console.warn(`Warning: Failed to clean ${table}.${column}:`, error.message);
        // Continue cleanup, don't fail on non-critical tables
      }
    }

    // Nullify references that shouldn't cascade delete
    const nullifyTables = [
      { table: 'estrutura_equipes', column: 'sublider_id' },
      { table: 'fiscal_tasks', column: 'assigned_to' },
      { table: 'fiscal_tasks', column: 'created_by' },
      { table: 'fiscal_task_comments', column: 'user_id' },
      { table: 'documents', column: 'uploaded_by' },
    ];

    for (const { table, column } of nullifyTables) {
      const { error } = await supabaseAdmin
        .from(table)
        .update({ [column]: null })
        .eq(column, user_id);
      
      if (error) {
        console.warn(`Warning: Failed to nullify ${table}.${column}:`, error.message);
      }
    }

    // Delete profile (this should cascade from auth.users, but let's be explicit)
    await supabaseAdmin.from('profiles').delete().eq('id', user_id);

    // Now delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return new Response(
        JSON.stringify({ error: `Erro ao excluir usuário: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
