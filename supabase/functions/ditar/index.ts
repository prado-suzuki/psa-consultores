import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';
import {
  configuracaoDitado,
  ehNomeDitado,
  mimeAudioAceito,
  TAMANHO_MAXIMO_AUDIO,
} from '../_shared/ditado.ts';
import {
  interpretarEnriquecimento,
  prepararEnriquecimento,
} from '../_shared/enriquecimentoTexto.ts';
import { chamarChat, ErroIA, transcrever } from '../_shared/ia.ts';

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function extensaoDoAudio(mime: string): string {
  const base = mime.toLowerCase().split(';', 1)[0].trim();
  if (base === 'audio/mp4') return 'm4a';
  if (base === 'audio/wav') return 'wav';
  return 'webm';
}

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

    const formulario = await req.formData();
    const nomeDitado = formulario.get('ditado');
    const arquivo = formulario.get('file');
    if (typeof nomeDitado !== 'string' || !ehNomeDitado(nomeDitado)) {
      return json({ error: 'Ditado inválido.' }, 400, cors);
    }
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      return json({ error: 'Arquivo de áudio obrigatório.' }, 400, cors);
    }
    if (!mimeAudioAceito(arquivo.type)) {
      return json({ error: 'Formato de áudio não suportado.' }, 415, cors);
    }
    if (arquivo.size > TAMANHO_MAXIMO_AUDIO) {
      return json({ error: 'O áudio excede o limite de 14 MB.' }, 413, cors);
    }

    const configuracao = configuracaoDitado(nomeDitado);
    const transcricao = await transcrever({
      modelo: configuracao.modelo,
      arquivo,
      nomeArquivo: `ditado.${extensaoDoAudio(arquivo.type)}`,
      idioma: 'pt-BR',
      timeoutMs: 90_000,
    });

    const pedidoLimpeza = {
      perfil: 'transcricao-fiel' as const,
      texto: transcricao.texto,
      destino: 'simples' as const,
    };
    const limpeza = prepararEnriquecimento(pedidoLimpeza);
    const respostaLimpeza = await chamarChat({
      modelo: limpeza.modelo,
      temperatura: limpeza.temperatura,
      mensagens: limpeza.mensagens,
      maxTokens: 4096,
      timeoutMs: 45_000,
    });
    const resultado = interpretarEnriquecimento(pedidoLimpeza, respostaLimpeza);
    if (resultado.estruturado) {
      throw new Error('A limpeza da transcrição devolveu um formato inesperado.');
    }

    return json(
      {
        texto: resultado.texto,
        enriquecimento: configuracao.enriquecimento ?? null,
      },
      200,
      cors,
    );
  } catch (erro) {
    if (erro instanceof ErroIA) return json({ error: erro.message }, erro.status, cors);
    console.error('ditar error:', erro instanceof Error ? erro.message : 'erro desconhecido');
    return json({ error: 'Erro inesperado ao transcrever áudio.' }, 502, cors);
  }
});
