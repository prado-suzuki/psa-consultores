import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { handleCorsPreflightRequest, buildCorsHeaders } from "../_shared/cors.ts";
// corsHeaders agora vem de ../_shared/cors.ts via buildCorsHeaders(req).
serve(async (req) => {
  // Handle CORS preflight requests
  const _preflight = handleCorsPreflightRequest(req);
  if (_preflight) return _preflight;

  const corsHeaders = buildCorsHeaders(req);

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Role check - only team members and admins can use this function
    const { data: roles } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAuthorized = roles?.some(r => ['admin', 'lider', 'sublider', 'team_member'].includes(r.role));
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { texto } = await req.json();
    
    if (!texto || typeof texto !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Texto é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em comunicação corporativa. Sua tarefa é reestruturar textos de notícias empresariais para torná-los mais profissionais e organizados.

REGRAS DE FORMATAÇÃO:
1. Use parágrafos curtos e objetivos (máximo 3-4 linhas cada)
2. Limite a 3 parágrafos principais no máximo
3. Use bullets (•) para listas de itens quando apropriado
4. Destaque palavras-chave importantes usando **negrito** (sintaxe markdown)
5. Mantenha um tom profissional e corporativo
6. Preserve todas as informações importantes do texto original
7. Não adicione informações que não estejam no texto original
8. Se houver datas, números ou dados específicos, mantenha-os exatos

FORMATO DE SAÍDA:
- Retorne APENAS o texto reestruturado
- Use markdown para formatação (negrito com **, bullets com •)
- Não adicione introduções, conclusões ou comentários extras`;

    console.log('Sending request to Lovable AI Gateway...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Reestruture o seguinte texto:\n\n${texto}` }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Entre em contato com o administrador.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Erro ao processar o texto com IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const textoReestruturado = data.choices?.[0]?.message?.content;

    if (!textoReestruturado) {
      console.error('No content in AI response:', data);
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully restructured text');
    
    return new Response(
      JSON.stringify({ texto_reestruturado: textoReestruturado }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in restructure-novidade function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
