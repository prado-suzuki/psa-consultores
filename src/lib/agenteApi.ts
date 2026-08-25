/**
 * Ponte com a edge function `agente-psa`.
 *
 * Existe por um motivo só, e é importante: `supabase.functions.invoke` devolve
 * `FunctionsHttpError` com a mensagem genérica "Edge Function returned a
 * non-2xx status code" e JOGA FORA o corpo da resposta. Só que o corpo é
 * justamente o que o usuário precisa ler — "esta tela exige papel líder",
 * "créditos de IA esgotados", "a tela ainda não publicou os dados". Sem
 * desembrulhar, todo erro do agente viraria a mesma frase inútil.
 */
import { supabase } from '@/integrations/supabase/client';

const FUNCAO = 'agente-psa';

/** Erro do agente já com a mensagem que o servidor escreveu para o usuário. */
export class ErroAgente extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ErroAgente';
  }
}

interface ComContexto {
  context?: unknown;
}

/** Lê `{ error }` do corpo do 4xx/5xx que o supabase-js descartou. */
/**
 * Falha de REDE, não de HTTP: a função não existe neste projeto (o preflight
 * volta 404 sem cabeçalho de CORS), ou o navegador não alcançou o host. O
 * supabase-js chama isso de `FunctionsFetchError` e a mensagem em inglês
 * ("Failed to send a request to the Edge Function") não diz a ninguém o que
 * fazer. Esta é a cara do agente antes de a função ser publicada, então vale
 * uma frase que aponte o próximo passo em vez de um chute sobre o banco.
 */
function ehFalhaDeRede(erro: unknown): boolean {
  const e = erro as { name?: unknown; message?: unknown } | null;
  return e?.name === 'FunctionsFetchError'
    || (typeof e?.message === 'string' && e.message.includes('Failed to send a request'));
}

export async function mensagemDoErroEdge(erro: unknown): Promise<{ mensagem: string; status?: number }> {
  if (ehFalhaDeRede(erro)) {
    return {
      mensagem: 'A função "agente-psa" não respondeu neste banco — provavelmente ainda '
        + 'não foi publicada aqui. Publique com "supabase functions deploy agente-psa" '
        + 'no projeto que este ambiente usa (ver docs/planos/agente-psa-assistente.md).',
    };
  }
  const contexto = (erro as ComContexto | null)?.context;
  if (contexto instanceof Response) {
    try {
      const corpo = await contexto.clone().json();
      if (corpo && typeof corpo.error === 'string') {
        return { mensagem: corpo.error, status: contexto.status };
      }
    } catch {
      // Corpo não-JSON (timeout de gateway, HTML de proxy): cai no genérico.
    }
    return { mensagem: `Falha ao falar com o agente (HTTP ${contexto.status}).`, status: contexto.status };
  }
  return {
    mensagem: erro instanceof Error ? erro.message : 'Falha ao falar com o agente.',
  };
}

export async function invocarAgente<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(FUNCAO, { body });
  if (error) {
    const { mensagem, status } = await mensagemDoErroEdge(error);
    throw new ErroAgente(mensagem, status);
  }
  // 200 com `{ error }` no corpo: a função não faz isso hoje, mas a checagem é
  // o padrão do repo e custa uma linha.
  const comErro = data as { error?: string } | null;
  if (comErro?.error) throw new ErroAgente(comErro.error);
  if (data == null) throw new ErroAgente('O agente respondeu vazio.');
  return data;
}
