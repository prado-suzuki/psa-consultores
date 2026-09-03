import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MARGEM_REFRESH_SEGUNDOS = 30;

function caminhoSeguro(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname;
  } catch {
    return 'endpoint externo';
  }
}

function criarSinalComTimeout(signalExterno: AbortSignal | null, timeoutMs: number) {
  const controller = new AbortController();
  let expirou = false;
  const abortarExternamente = () => controller.abort(signalExterno?.reason);

  if (signalExterno?.aborted) abortarExternamente();
  else signalExterno?.addEventListener('abort', abortarExternamente, { once: true });

  const timeoutId = window.setTimeout(() => {
    expirou = true;
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    expirou: () => expirou,
    limpar: () => {
      window.clearTimeout(timeoutId);
      signalExterno?.removeEventListener('abort', abortarExternamente);
    },
  };
}

function aguardarBackoff(delayMs: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Requisição cancelada', 'AbortError'));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', cancelar);
      resolve();
    }, delayMs);
    const cancelar = () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Requisição cancelada', 'AbortError'));
    };
    signal?.addEventListener('abort', cancelar, { once: true });
  });
}

export function useApiAuth() {
  const { refreshSession, sessaoExpirada } = useAuth();

  const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
    try {
      const token = await getValidToken();
      if (!token) return null;

      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch {
      return null;
    }
  };

  const getValidToken = async (): Promise<string | null> => {
    // Com o diálogo de reautenticação aberto, insistir só gera tráfego de
    // rotação de token (e mais chance da corrida que derrubou a sessão). Quem
    // resolve é a pessoa digitando a senha; até lá, a chamada falha rápido.
    if (sessaoExpirada) return null;

    // A função pode permanecer viva durante uploads e consultas em lote. Ler o
    // storage evita que uma closure antiga continue enviando o token anterior
    // depois de um TOKEN_REFRESHED recebido no meio da operação.
    const currentSession = (await supabase.auth.getSession()).data.session;

    if (!currentSession) {
      console.warn('[Auth] Sem sessão ativa');
      return null;
    }

    // A renovação preventiva a cinco minutos do fim morava aqui e disparava a
    // CADA chamada de API, incluindo todo refetch de fundo do React Query. Era
    // um dos renovadores concorrendo pelo mesmo refresh token (junto do ticker
    // do auth-js e do retry de 401), e a rotação é o que devolve 400 "already
    // used". Quem cuida da renovação por antecipação agora é o vigia do
    // AuthContext, uma vez a cada trinta segundos e não uma por requisição.
    // Aqui basta o caminho reativo: manda o token, e se voltar 401 renova e
    // repete (ver `fetchWithAuth`).
    return currentSession.access_token;
  };

  const fetchWithAuth = async (
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000,
    maxRetries: number = 3,
  ): Promise<Response> => {
    const startTime = Date.now();
    let lastError: Error | null = null;
    const signalExterno = options.signal;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const sinal = criarSinalComTimeout(signalExterno ?? null, timeoutMs);

      try {
        console.log(`[API] Tentativa ${attempt}/${maxRetries}: ${caminhoSeguro(url)}`);

        const token = await getValidToken();
        if (!token) {
          if (sessaoExpirada) throw new Error('Sessão expirada');
          const newSession = await refreshSession();
          if (!newSession) {
            throw new Error('Não foi possível renovar a sessão');
          }
          const isFormData = options.body instanceof FormData;
          const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            Authorization: `Bearer ${newSession.access_token}`,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          };
          const response = await fetch(url, { ...options, headers, signal: sinal.signal });
          sinal.limpar();
          return response;
        }

        const isFormData = options.body instanceof FormData;
        const headers: Record<string, string> = {
          ...(options.headers as Record<string, string>),
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        };

        let response = await fetch(url, {
          ...options,
          headers,
          signal: sinal.signal,
        });

        console.log(`[API] Resposta: ${response.status} em ${Date.now() - startTime}ms`);

        // Um 401 pode ser do endpoint, não da sessão. Primeiro aproveita uma
        // rotação que já tenha acontecido; só força refresh se o token realmente
        // estiver no fim. Isso evita uma rotação por matrícula/arquivo em lote.
        if (response.status === 401) {
          const currentSession = (await supabase.auth.getSession()).data.session;
          let retryToken: string | null = null;

          if (currentSession?.access_token !== token) {
            retryToken = currentSession?.access_token ?? null;
          } else {
            const expiresAt = currentSession?.expires_at;
            const aindaValido = expiresAt == null
              || expiresAt > Math.floor(Date.now() / 1000) + MARGEM_REFRESH_SEGUNDOS;
            if (aindaValido) {
              sinal.limpar();
              return response;
            }

            console.log('[API] Token expirado após 401, tentando refresh...');
            retryToken = (await refreshSession())?.access_token ?? null;
            if (!retryToken) throw new Error('Não foi possível renovar a sessão');
          }

          if (!retryToken) {
            sinal.limpar();
            return response;
          }

          // Repete com o token encontrado/renovado.
          const isFormDataRetry = options.body instanceof FormData;
          const retryHeaders: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            Authorization: `Bearer ${retryToken}`,
            ...(isFormDataRetry ? {} : { 'Content-Type': 'application/json' }),
          };

          response = await fetch(url, {
            ...options,
            headers: retryHeaders,
            signal: sinal.signal,
          });

          if (response.status === 401) {
            // O Supabase acabou de aceitar o refresh token e emitir uma sessão
            // nova. Um 401 que persiste aqui pertence ao endpoint (configuração,
            // autorização ou validação do JWT), não prova que a sessão morreu.
            // Devolver a resposta evita abrir o diálogo global por falso positivo.
            console.error(`[API] Endpoint recusou uma sessão recém-renovada: ${caminhoSeguro(url)}`);
          }
        }

        sinal.limpar();
        return response;
      } catch (error) {
        sinal.limpar();
        const err = error as Error;
        lastError = err;

        console.error(`[API] Erro na tentativa ${attempt}: ${err.name} - ${err.message}`);

        // Não fazer retry para erros de sessão
        if (err.message === 'Sessão expirada') {
          throw err;
        }

        // Cancelamento do consumidor não é timeout nem falha: o TanStack Query
        // usa este AbortError para descartar a consulta obsoleta silenciosamente.
        if (err.name === 'AbortError') {
          if (signalExterno?.aborted && !sinal.expirou()) throw err;
          const timeoutError = new Error(
            `Tempo limite excedido. A requisição demorou mais de ${Math.round(timeoutMs / 1000)} segundos.`,
          );
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }

        // Para erros de rede, tentar novamente com backoff exponencial
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          if (attempt < maxRetries) {
            const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 1s, 2s, 4s (max 5s)
            console.log(`[API] Aguardando ${delayMs}ms antes da próxima tentativa...`);
            await aguardarBackoff(delayMs, signalExterno);
            continue;
          }
          throw new Error('Erro de conexão. Verifique sua internet ou tente novamente.');
        }

        // Para outros erros, não fazer retry
        throw err;
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error('Erro desconhecido após múltiplas tentativas');
  };

  return { getAuthHeaders, getValidToken, fetchWithAuth };
}
