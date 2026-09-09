/**
 * Chamar edge function sem perder o aviso por token vencido.
 *
 * POR QUE ISTO EXISTE (medido em 09/09/2026, no go-live da solicitação)
 *
 * Uma solicitação foi enviada às 14:40 e o cliente nunca foi avisado. O log da
 * borda `notificar` tem uma linha só sobre o caso:
 *
 *     [notificar] Auth failed: Invalid token
 *
 * O `UPDATE` do PostgREST passou e o `functions.invoke` foi recusado, na mesma
 * sessão e no mesmo clique. São dois caminhos de autenticação diferentes: o
 * primeiro passa pelo cliente supabase-js, que renova o token sob demanda; o
 * segundo manda o que estiver na memória e desiste no primeiro erro.
 *
 * O gatilho daquele dia foi um segundo login (analista e cliente ao mesmo
 * tempo), mas ele não é o único. Uma aba deixada aberta basta: o access token
 * dura uma hora, o vigia do AuthContext renova a cada trinta segundos, e o
 * navegador estrangula timer de aba em segundo plano — notebook suspenso para
 * tudo. A consultora volta do almoço, clica em "Enviar solicitação", e cai
 * exatamente aqui.
 *
 * POR QUE DÓI MAIS NA NOTIFICAÇÃO que em outra chamada: `solicitacao_enviada` é
 * o único aviso do fluxo sem botão de reenvio. A transição já gravou, o cliente
 * vê a lista no portal, e ninguém o avisou de que ela existe.
 *
 * O QUE ESTA FUNÇÃO FAZ, e o que ela deliberadamente NÃO faz:
 *
 *   - `getSession()` antes de chamar. Não é enfeite: o supabase-js renova o
 *     token guardado quando ele já venceu, e é isso que faz o `invoke` sair com
 *     credencial boa depois de uma aba parada.
 *   - Uma repetição, só no 401. Renovar de forma preventiva a cada chamada é o
 *     que o `useApiAuth` deixou de fazer de propósito: eram três renovadores
 *     concorrendo pelo mesmo refresh token, e a rotação devolve
 *     "already used" quando dois pedem junto. Aqui a renovação forçada acontece
 *     no caminho de erro, que é raro.
 *   - NÃO repete em 4xx que não seja 401 nem em 5xx. Um 400 volta igual na
 *     segunda tentativa, e um 500 pode ter efeito colateral já aplicado.
 */
import { supabase } from '@/integrations/supabase/client';

/** O 401 vem embrulhado num `FunctionsHttpError`, com a resposta em `context`. */
function ehNaoAutorizado(erro: unknown): boolean {
  const contexto = (erro as { context?: unknown } | null)?.context;
  return contexto instanceof Response && contexto.status === 401;
}

export interface RespostaDaBorda<T> {
  data: T | null;
  error: unknown;
}

export async function invocarBorda<T>(
  nome: string,
  body: Record<string, unknown>,
): Promise<RespostaDaBorda<T>> {
  // Renova por vencimento, se for o caso, antes de gastar a chamada.
  const { data: sessao } = await supabase.auth.getSession();
  if (!sessao.session) {
    return { data: null, error: new Error('Sessão expirada — entre de novo para o aviso sair.') };
  }

  const primeira = await supabase.functions.invoke<T>(nome, { body });
  if (!primeira.error || !ehNaoAutorizado(primeira.error)) return primeira;

  /**
   * 401 com sessão em mãos significa que o token que saiu já não era aceito —
   * rotação no meio do caminho. Uma renovação forçada e uma segunda tentativa;
   * se falhar de novo, o erro sobe e quem chamou avisa na tela.
   */
  const { data: renovada, error: erroRenovacao } = await supabase.auth.refreshSession();
  if (erroRenovacao || !renovada.session) return primeira;

  return await supabase.functions.invoke<T>(nome, { body });
}
