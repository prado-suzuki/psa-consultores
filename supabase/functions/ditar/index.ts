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
  interpretarPerfilEnriquecimento,
  interpretarEnriquecimento,
  prepararEnriquecimento,
  validarPedidoEnriquecimento,
} from '../_shared/enriquecimentoTexto.ts';
import { classificarComFallback } from '../_shared/classificacao/classificar.ts';
import { obterClassificador } from '../_shared/classificacao/classificadores/index.ts';
import { classificacaoPedeTarefa } from '../_shared/classificacao/classificadores/intencaoDitado.ts';
import { chamarChat, ErroIA, ErroTranscricaoVazia, transcrever } from '../_shared/ia.ts';

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
    const mimeNormalizado = arquivo.type
      .toLowerCase()
      .split(';', 1)[0]
      .trim()
      .replace('video/', 'audio/');
    const audioNormalizado = new Blob([arquivo], { type: mimeNormalizado });
    const executarTranscricao = (modelo: string) =>
      transcrever({
        modelo,
        arquivo: audioNormalizado,
        nomeArquivo: `ditado.${extensaoDoAudio(arquivo.type)}`,
        idioma: 'pt-BR',
        timeoutMs: 45_000,
      });
    let transcricao;
    try {
      transcricao = await executarTranscricao(configuracao.modelo);
    } catch (erro) {
      const modeloAlternativo = configuracao.modeloAlternativo;
      const tentarAlternativo =
        modeloAlternativo &&
        erro instanceof ErroIA &&
        (erro.status === 400 || erro instanceof ErroTranscricaoVazia);
      if (!tentarAlternativo) throw erro;
      console.warn(
        'primary transcription failed, retrying alternate model:',
        configuracao.modelo,
        erro.status,
      );
      transcricao = await executarTranscricao(modeloAlternativo);
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const carregarPerfil = async (nome: string) => {
      const { data, error } = await admin
        .from('enriquecimento_perfil')
        .select('nome, rotulo, instrucoes, modelo, temperatura, contrato_saida, ativo')
        .eq('nome', nome)
        .eq('ativo', true)
        .maybeSingle();
      if (error || !data) {
        console.error('ditar enrichment profile error:', nome, error?.message ?? 'perfil ausente');
        throw new Error(`Não foi possível carregar o perfil ${nome}.`);
      }
      return interpretarPerfilEnriquecimento(data);
    };

    const perfilLimpeza = await carregarPerfil('transcricao-fiel');
    const pedidoLimpeza = validarPedidoEnriquecimento(
      perfilLimpeza,
      transcricao.texto,
      'simples',
      undefined,
    );
    const limpeza = prepararEnriquecimento(perfilLimpeza, pedidoLimpeza);
    const respostaLimpeza = await chamarChat({
      modelo: limpeza.modelo,
      temperatura: limpeza.temperatura,
      mensagens: limpeza.mensagens,
      maxTokens: 4096,
      timeoutMs: 40_000,
    });
    const resultado = interpretarEnriquecimento(perfilLimpeza, pedidoLimpeza, respostaLimpeza);
    if (resultado.estruturado) {
      throw new Error('A limpeza da transcrição devolveu um formato inesperado.');
    }

    const classificacao = await classificarComFallback(obterClassificador('intencao-ditado'), {
      texto: resultado.texto,
    });
    const perfilForcado = configuracao.enriquecimento?.perfil === 'comentario-para-tarefa';

    if (perfilForcado || classificacaoPedeTarefa(classificacao)) {
      try {
        const perfilTarefa = await carregarPerfil('comentario-para-tarefa');
        const pedidoTarefa = validarPedidoEnriquecimento(perfilTarefa, resultado.texto, undefined, {
          titulo: 'simples',
          descricao: 'rico',
        });
        const chamadaTarefa = prepararEnriquecimento(perfilTarefa, pedidoTarefa);
        const respostaTarefa = await chamarChat({
          modelo: chamadaTarefa.modelo,
          temperatura: chamadaTarefa.temperatura,
          mensagens: chamadaTarefa.mensagens,
          ferramentas: chamadaTarefa.ferramentas,
          escolhaDeFerramenta: chamadaTarefa.escolhaDeFerramenta,
          maxTokens: 4096,
          timeoutMs: 40_000,
        });
        const tarefa = interpretarEnriquecimento(perfilTarefa, pedidoTarefa, respostaTarefa);
        if (!tarefa.estruturado) throw new Error('O perfil de tarefa devolveu texto simples.');

        return json(
          {
            texto: resultado.texto,
            acao: {
              tipo: 'abrir_tarefa',
              titulo: tarefa.campos.titulo.texto,
              descricao: tarefa.campos.descricao.texto,
              classificacao: {
                nome: classificacao.classificador,
                versao: classificacao.versao,
                classe: classificacao.classe,
                certeza: classificacao.certeza,
              },
            },
          },
          200,
          cors,
        );
      } catch (erro) {
        console.warn(
          'ditar task enrichment failed, returning transcription:',
          erro instanceof Error ? erro.message : 'erro desconhecido',
        );
      }
    }

    return json({ texto: resultado.texto, acao: { tipo: 'inserir_texto' } }, 200, cors);
  } catch (erro) {
    if (erro instanceof ErroIA) return json({ error: erro.message }, erro.status, cors);
    console.error('ditar error:', erro instanceof Error ? erro.message : 'erro desconhecido');
    return json({ error: 'Erro inesperado ao transcrever áudio.' }, 502, cors);
  }
});
