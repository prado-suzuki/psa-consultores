import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const isAuthorized = roles?.some(r => r.role === 'admin' || r.role === 'team_member');
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { conteudo, processName, processCode } = await req.json();

    if (!conteudo || typeof conteudo !== "string") {
      return new Response(
        JSON.stringify({ error: "Campo 'conteudo' é obrigatório e deve ser uma string." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um especialista em documentação de processos de negócios contábeis e fiscais.

TAREFA: Reorganize o documento do processo "${processName || 'Processo'}" ${processCode ? `(${processCode})` : ''} em formato profissional.

REGRAS DE FORMATAÇÃO:
1. Use hierarquia clara com Markdown (## para seções principais, ### para subseções)
2. Liste os passos do processo em ordem numerada
3. Destaque termos técnicos, sistemas e obrigações em **negrito**
4. Organize OBRIGATORIAMENTE nas seguintes seções (nesta ordem):
   - **Objetivo** - Descrição clara e concisa do propósito do processo
   - **Frequência** - Periodicidade de execução (diário, semanal, mensal, etc)
   - **Entradas** - Documentos, dados ou informações necessárias para iniciar
   - **Passos do Processo** - Etapas detalhadas e numeradas
   - **Saídas** - Produtos, entregas ou resultados do processo
   - **Sistemas Utilizados** - Softwares, portais ou ferramentas usadas
   - **Responsáveis** - Áreas ou funções responsáveis pela execução
   - **Observações** - Notas importantes, exceções ou pontos de atenção (se houver)
5. Use bullets (- ) para listas não ordenadas dentro das seções
6. Mantenha tom profissional, objetivo e técnico
7. Preserve TODAS as informações do documento original, sem omitir detalhes
8. Se alguma seção não tiver informação disponível no texto original, indique "A definir" ou "Não especificado"

FORMATO DE SAÍDA:
- Retorne APENAS o documento formatado em Markdown
- Não adicione comentários, explicações ou texto fora do formato
- Não use blocos de código (\`\`\`)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: conteudo }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para processamento de IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Erro do AI Gateway:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar com IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const formattedContent = data.choices?.[0]?.message?.content;

    if (!formattedContent) {
      console.error("Resposta vazia do AI Gateway:", data);
      return new Response(
        JSON.stringify({ error: "Resposta vazia da IA." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ conteudo_formatado: formattedContent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função restructure-process:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
