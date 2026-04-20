import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiAuth } from '@/hooks/useApiAuth';
import { isProductionEnvironment } from '@/config/api';
import { toast } from 'sonner';

const API_SIMPLES_URL = 'https://api-simples-nacional-1010211821554.southamerica-east1.run.app/buscar';

interface ConsultaSimplesParams {
  id_contribuinte: string;
  registro: 'F100' | 'D100';
  nat_bc_creds?: string[];
  cod_cta?: string;
  dt_ini?: string;
  dt_fin?: string;
}

interface ConsultaSimplesResponse {
  job_id: string;
  cnpjs_encontrados: number;
  tasks_criadas: number;
  execucao_id: string;
}

export function useConsultaSimplesNacional({ id_contribuinte, registro, nat_bc_creds, cod_cta, dt_ini, dt_fin }: ConsultaSimplesParams) {
  const { user } = useAuth();
  const { fetchWithAuth } = useApiAuth();
  const [isLoading, setIsLoading] = useState(false);

  const consultar = async () => {
    if (!user?.email || !id_contribuinte) return;

    const codes = nat_bc_creds ?? [];

    if (registro === 'F100' && codes.length === 0 && !cod_cta) {
      toast.error('Para F100, informe ao menos Nat. Base de Crédito ou Cód. Conta.');
      return;
    }

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

      const buildBody = (natBcCred?: string): Record<string, string> => {
        const body: Record<string, string> = { id_contribuinte, registro, email: user.email! };
        if (natBcCred) body.nat_bc_cred = natBcCred;
        if (cod_cta) body.cod_cta = cod_cta;
        if (dt_ini) body.dt_ini = dt_ini;
        if (dt_fin) body.dt_fin = dt_fin;
        return body;
      };

      const bodies = codes.length > 0 ? codes.map((c) => buildBody(c)) : [buildBody()];
      const responses = await Promise.all(
        bodies.map((b) =>
          fetchWithAuth(API_SIMPLES_URL, { method: 'POST', body: JSON.stringify(b) }),
        ),
      );
      for (const r of responses) {
        if (!r.ok) {
          const errorText = await r.text();
          throw new Error(errorText || `Erro ${r.status}`);
        }
      }
      const payloads = (await Promise.all(responses.map((r) => r.json()))) as ConsultaSimplesResponse[];
      const totalCnpjs = payloads.reduce((sum, p) => sum + (p.cnpjs_encontrados ?? 0), 0);
      const totalTasks = payloads.reduce((sum, p) => sum + (p.tasks_criadas ?? 0), 0);

      toast.success(`Simples Nacional: ${totalCnpjs} CNPJs encontrados, ${totalTasks} tasks criadas.`);
      return payloads[0];
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao consultar Simples Nacional.');
    } finally {
      setIsLoading(false);
    }
  };

  return { consultar, isLoading };
}
