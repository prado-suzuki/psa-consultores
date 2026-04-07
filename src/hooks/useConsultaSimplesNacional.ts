import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiAuth } from '@/hooks/useApiAuth';
import { isProductionEnvironment } from '@/config/api';
import { toast } from 'sonner';

const API_SIMPLES_URL = 'https://api-simples-nacional-1010211821554.southamerica-east1.run.app/buscar';

interface ConsultaSimplesParams {
  id_contribuinte: string;
  registro: 'f100' | 'd100';
}

interface ConsultaSimplesResponse {
  job_id: string;
  cnpjs_encontrados: number;
  tasks_criadas: number;
  execucao_id: string;
}

export function useConsultaSimplesNacional({ id_contribuinte, registro }: ConsultaSimplesParams) {
  const { user } = useAuth();
  const { fetchWithAuth } = useApiAuth();
  const [isLoading, setIsLoading] = useState(false);

  const consultar = async () => {
    if (!user?.email || !id_contribuinte) return;
    setIsLoading(true);

    try {
      if (!isProductionEnvironment) {
        await new Promise((r) => setTimeout(r, 1500));
        const mock: ConsultaSimplesResponse = {
          job_id: `mock-${Date.now()}`,
          cnpjs_encontrados: 3,
          tasks_criadas: 3,
          execucao_id: `mock-exec-${Date.now()}`,
        };
        toast.success(`Simples Nacional consultado (dev): ${mock.cnpjs_encontrados} CNPJs encontrados, ${mock.tasks_criadas} tasks criadas.`);
        return mock;
      }

      const response = await fetchWithAuth(API_SIMPLES_URL, {
        method: 'POST',
        body: JSON.stringify({
          id_contribuinte,
          registro,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Erro ${response.status}`);
      }

      const data: ConsultaSimplesResponse = await response.json();
      toast.success(`Simples Nacional: ${data.cnpjs_encontrados} CNPJs encontrados, ${data.tasks_criadas} tasks criadas.`);
      return data;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao consultar Simples Nacional.');
    } finally {
      setIsLoading(false);
    }
  };

  return { consultar, isLoading };
}
