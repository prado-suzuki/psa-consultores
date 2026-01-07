import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

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
      handleSessionExpired();
      return null;
    }

    // Check if token is expired or about to expire (5 min buffer)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const bufferSeconds = 5 * 60; // 5 minutes
      
      if (expiresAt - now < bufferSeconds) {
        console.log('Token expirando em breve, tentando refresh...');
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
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = await getValidToken();
    if (!token) {
      throw new Error('Sessão expirada');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(url, { ...options, headers });

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

      response = await fetch(url, { ...options, headers: retryHeaders });
      
      if (response.status === 401) {
        handleSessionExpired();
        throw new Error('Sessão expirada');
      }
    }

    return response;
  };

  return { getAuthHeaders, getValidToken, fetchWithAuth };
}
