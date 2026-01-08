import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function useApiAuth() {
  const { session, refreshSession } = useAuth();
  const navigate = useNavigate();

  const getAuthHeaders = async (): Promise<Record<string, string> | null> => {
    try {
      const token = await getValidToken();
      if (!token) return null;
      
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    } catch {
      return null;
    }
  };

  const getValidToken = async (): Promise<string | null> => {
    if (!session) {
      console.warn('[Auth] Sem sessão ativa');
      handleSessionExpired();
      return null;
    }

    // Verificar se sessão é válida fazendo chamada ao Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error('[Auth] Sessão inválida:', error?.message);
      handleSessionExpired();
      return null;
    }

    // Check if token is expired or about to expire (5 min buffer)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const bufferSeconds = 5 * 60; // 5 minutes
      
      if (expiresAt - now < bufferSeconds) {
        console.log('[Auth] Token expirando em breve, tentando refresh...');
        const newSession = await refreshSession();
        if (!newSession) {
          handleSessionExpired();
          return null;
        }
        return newSession.access_token;
      }
    }

    return session.access_token;
  };

  const handleSessionExpired = () => {
    toast({
      title: "Sessão expirada",
      description: "Faça login novamente para continuar.",
      variant: "destructive",
    });
    navigate('/equipe');
  };

  const fetchWithAuth = async (
    url: string, 
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      console.log(`[API] Iniciando requisição: ${url}`);
      
      const token = await getValidToken();
      if (!token) {
        throw new Error('Sessão expirada');
      }

      const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      let response = await fetch(url, { 
        ...options, 
        headers,
        signal: controller.signal 
      });

      console.log(`[API] Resposta: ${response.status} em ${Date.now() - startTime}ms`);

      // If 401, try refreshing token and retry once
      if (response.status === 401) {
        console.log('Recebido 401, tentando refresh do token...');
        const newSession = await refreshSession();
        
        if (!newSession) {
          handleSessionExpired();
          throw new Error('Sessão expirada');
        }

        // Retry with new token
        const retryHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${newSession.access_token}`,
          'Content-Type': 'application/json',
        };

        response = await fetch(url, { 
          ...options, 
          headers: retryHeaders,
          signal: controller.signal 
        });
        
        if (response.status === 401) {
          handleSessionExpired();
          throw new Error('Sessão expirada');
        }
      }

      return response;
    } catch (error) {
      const err = error as Error;
      console.error(`[API] Erro: ${err.name} - ${err.message}`);
      
      if (err.name === 'AbortError') {
        throw new Error('Tempo limite excedido. A requisição demorou mais de 30 segundos.');
      }
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        throw new Error('Erro de conexão. Verifique sua internet ou tente novamente.');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return { getAuthHeaders, getValidToken, fetchWithAuth };
}
