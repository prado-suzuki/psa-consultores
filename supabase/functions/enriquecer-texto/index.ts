import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  ehNomeDePerfil,
  interpretarEnriquecimento,
  prepararEnriquecimento,
  TAMANHO_MAXIMO_ENTRADA,
  type DestinoEnriquecimento,
  type PedidoEnriquecimento,
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
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

    if (!ehNomeDePerfil(perfil))
      return json({ error: 'Perfil de enriquecimento inválido.' }, 400, cors);
    if (!texto) return json({ error: 'Texto vazio.' }, 400, cors);
    if (texto.length > TAMANHO_MAXIMO_ENTRADA) {
      return json(
        { error: `O texto deve ter no máximo ${TAMANHO_MAXIMO_ENTRADA} caracteres.` },
        413,
        cors,
      );
    }
    if (destino !== undefined && destino !== 'simples' && destino !== 'rico') {
      return json({ error: 'Destino de enriquecimento inválido.' }, 400, cors);
    }

    const pedido: PedidoEnriquecimento = {
      perfil,
      texto,
      ...(destino ? { destino: destino as DestinoEnriquecimento } : {}),
    };
    const chamada = prepararEnriquecimento(pedido);
    const resposta = await chamarChat({
      modelo: chamada.modelo,
      temperatura: chamada.temperatura,
      mensagens: chamada.mensagens,
      ferramentas: chamada.ferramentas,
      escolhaDeFerramenta: chamada.escolhaDeFerramenta,
      maxTokens: 4096,
    });
    return json(interpretarEnriquecimento(pedido, resposta), 200, cors);
  } catch (erro) {
    if (erro instanceof ErroIA) return json({ error: erro.message }, erro.status, cors);
    console.error('enriquecer-texto error:', erro);
    return json(
      { error: erro instanceof Error ? erro.message : 'Erro inesperado ao enriquecer texto.' },
      502,
      cors,
    );
  }
});
