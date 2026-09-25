import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  ErroPedidoEnriquecimento,
  interpretarPerfilEnriquecimento,
  interpretarEnriquecimento,
  prepararEnriquecimento,
  TAMANHO_MAXIMO_ENTRADA,
  validarPedidoEnriquecimento,
} from '../_shared/enriquecimentoTexto.ts';
import { chamarChat, ErroIA } from '../_shared/ia.ts';

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const cors = buildCorsHeaders(req);

  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, cors);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado.' }, 401, cors);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.slice('Bearer '.length),
    );
    if (claimsError || !claims?.claims?.sub) {
      return json({ error: 'Não autenticado.' }, 401, cors);
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const perfil = typeof body?.perfil === 'string' ? body.perfil : '';
    const texto = typeof body?.texto === 'string' ? body.texto.trim() : '';
    const destino = body?.destino;
    const destinos = body?.destinos;

    if (!perfil) return json({ error: 'Perfil de enriquecimento inválido.' }, 400, cors);
    if (!texto) return json({ error: 'Texto vazio.' }, 400, cors);
    if (texto.length > TAMANHO_MAXIMO_ENTRADA) {
      return json(
        { error: `O texto deve ter no máximo ${TAMANHO_MAXIMO_ENTRADA} caracteres.` },
        413,
        cors,
      );
    }
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: perfilData, error: perfilError } = await admin
      .from('enriquecimento_perfil')
      .select('nome, rotulo, instrucoes, modelo, temperatura, contrato_saida, ativo')
      .eq('nome', perfil)
      .eq('ativo', true)
      .maybeSingle();
    if (perfilError) {
      console.error('enriquecer-texto profile error:', perfilError.message);
      throw new Error('Não foi possível carregar o perfil de enriquecimento.');
    }
    if (!perfilData) return json({ error: 'Perfil de enriquecimento inválido.' }, 400, cors);

    const perfilCarregado = interpretarPerfilEnriquecimento(perfilData);
    const pedido = validarPedidoEnriquecimento(perfilCarregado, texto, destino, destinos);
    const chamada = prepararEnriquecimento(perfilCarregado, pedido);
    const resposta = await chamarChat({
      modelo: chamada.modelo,
      temperatura: chamada.temperatura,
      mensagens: chamada.mensagens,
      ferramentas: chamada.ferramentas,
      escolhaDeFerramenta: chamada.escolhaDeFerramenta,
      maxTokens: 4096,
    });
    return json(interpretarEnriquecimento(perfilCarregado, pedido, resposta), 200, cors);
  } catch (erro) {
    if (erro instanceof ErroPedidoEnriquecimento) return json({ error: erro.message }, 400, cors);
    if (erro instanceof ErroIA) return json({ error: erro.message }, erro.status, cors);
    console.error('enriquecer-texto error:', erro);
    return json(
      { error: erro instanceof Error ? erro.message : 'Erro inesperado ao enriquecer texto.' },
      502,
      cors,
    );
  }
});
