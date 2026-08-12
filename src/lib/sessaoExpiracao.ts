// Leitura de estado da sessão: quando avisar, quando pedir para reautenticar.
//
// B21: depois de ~40 minutos o `POST /auth/v1/token?grant_type=refresh_token`
// voltou 400 e o app navegou para /equipe no meio de um "Salvar alterações". O
// que se perdeu não foi o dado já gravado — foi o formulário aberto, que sumiu
// junto com a árvore desmontada.
//
// Duas decisões moram aqui, fora do React, para poderem ser testadas sem relógio
// nem navegador:
//
// 1. `estadoDaSessao` — a expiração deixa de ser um evento surpresa. Existe uma
//    janela de aviso antes do fim, em que dá para renovar sem interromper nada.
//
// 2. `refreshFalhouDefinitivamente` — nem toda falha de refresh é sessão morta.
//    Wi-Fi que caiu, 502 do proxy e requisição abortada são transitórios: tratar
//    isso como "expirou" foi metade do estrago, porque tirava a pessoa da tela
//    por causa de um soluço de rede. Só um veredito do servidor sobre o próprio
//    refresh token (400/401, `refresh_token_not_found`, `already used`) encerra a
//    sessão.

/** Quanto antes do fim a sessão passa a avisar (e a tentar renovar sozinha). */
export const JANELA_AVISO_SEGUNDOS = 5 * 60;

export type EstadoSessao = 'valida' | 'expirando' | 'expirada';

/**
 * @param expiresAt `session.expires_at` do Supabase — segundos desde a época.
 * @param agoraMs `Date.now()`.
 */
export function estadoDaSessao(
  expiresAt: number | null | undefined,
  agoraMs: number,
  janelaSegundos: number = JANELA_AVISO_SEGUNDOS,
): EstadoSessao {
  // Sessão sem prazo declarado não é motivo para alarmar ninguém: quem decide
  // que ela morreu é o servidor, na primeira chamada que ele recusar.
  if (!expiresAt) return 'valida';
  const restante = expiresAt - Math.floor(agoraMs / 1000);
  if (restante <= 0) return 'expirada';
  if (restante <= janelaSegundos) return 'expirando';
  return 'valida';
}

interface ErroDeAuth {
  status?: number;
  code?: string;
  name?: string;
  message?: string;
}

/**
 * A falha de refresh encerra a sessão (true) ou é transitória (false)?
 *
 * Conservador de propósito: na dúvida devolve `false`, porque o custo de errar
 * para o lado do "expirou" é interromper alguém que estava trabalhando.
 */
export function refreshFalhouDefinitivamente(erro: unknown): boolean {
  if (!erro) return false;
  const e = erro as ErroDeAuth;

  // O supabase-js marca como `AuthRetryableFetchError` o que ele mesmo
  // considera repetível (rede fora, 5xx, timeout).
  if (e.name === 'AuthRetryableFetchError' || e.name === 'AbortError' || e.name === 'TypeError') return false;
  if (typeof e.status === 'number' && (e.status === 0 || e.status >= 500)) return false;

  const texto = `${e.code ?? ''} ${e.message ?? ''}`.toLowerCase();
  if (texto.includes('refresh token') || texto.includes('refresh_token')) return true;
  if (texto.includes('failed to fetch') || texto.includes('network')) return false;

  return e.status === 400 || e.status === 401 || e.status === 403;
}
