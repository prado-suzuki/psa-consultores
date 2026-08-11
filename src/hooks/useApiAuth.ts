import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

let validarUsuarioPromise: ReturnType<typeof supabase.auth.getUser> | null = null;

function validarUsuarioSingleFlight() {
  if (validarUsuarioPromise) return validarUsuarioPromise;
  validarUsuarioPromise = supabase.auth.getUser().finally(() => {
    validarUsuarioPromise = null;
  });
  return validarUsuarioPromise;
}

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
  const { session, refreshSession, sessaoExpirada, sinalizarSessaoExpirada } = useAuth();
  const navigate = useNavigate();

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

    const currentSession = session ?? (await supabase.auth.getSession()).data.session;

    if (!currentSession) {
      console.warn('[Auth] Sem sessão ativa');
      return null;
    }

    // Verificar se sessão é válida fazendo chamada ao Supabase
    const {
      data: { user },
      error,
    } = await validarUsuarioSingleFlight();
    if (error || !user) {
      console.error('[Auth] Sessão inválida:', error?.message);
      const newSession = await refreshSession();
      if (newSession) return newSession.access_token;
      handleSessionExpired();
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

  /**
   * Sessão perdida no meio de uma chamada.
   *
   * Navegar daqui era destrutivo e silencioso: qualquer refetch de fundo (o
   * OSG usa `useDocumentoArquivo` e `useGeorefByMatricula`, o fiscal usa uns
   * trinta hooks) arrastava a pessoa para /equipe e levava junto o formulário
   * aberto. Pior: com o diálogo de reautenticação prometendo que nada se
   * perdeu, e com `user` em estado, /equipe nem mostra login, mostra o seletor
   * de áreas, como se estivesse tudo bem.
   *
   * Enquanto houver sessão viva na tela, quem resolve é o diálogo: aqui a
   * chamada só falha e devolve o erro a quem pediu. Sem sessão viva (boot frio,
   * já deslogado) o comportamento antigo continua valendo, porque aí não há
   * formulário aberto para preservar nem conta para reautenticar.
   */
  const handleSessionExpired = () => {
    if (sinalizarSessaoExpirada()) return;
    toast({
      title: 'Sessão expirada',
      description: 'Faça login novamente para continuar.',
      variant: 'destructive',
    });
    navigate('/equipe');
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
          const newSession = await refreshSession();
          if (!newSession) {
            throw new Error('Sessão expirada');
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

        // If 401, try refreshing token and retry once
        if (response.status === 401) {
          console.log('[API] Recebido 401, tentando refresh do token...');
          const newSession = await refreshSession();

          if (!newSession) {
            handleSessionExpired();
            throw new Error('Sessão expirada');
          }

          // Retry with new token
          const isFormDataRetry = options.body instanceof FormData;
          const retryHeaders: Record<string, string> = {
            ...(options.headers as Record<string, string>),
            Authorization: `Bearer ${newSession.access_token}`,
            ...(isFormDataRetry ? {} : { 'Content-Type': 'application/json' }),
          };

          response = await fetch(url, {
            ...options,
            headers: retryHeaders,
            signal: sinal.signal,
          });

          if (response.status === 401) {
            handleSessionExpired();
            throw new Error('Sessão expirada');
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
