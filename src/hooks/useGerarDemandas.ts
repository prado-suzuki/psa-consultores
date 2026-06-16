import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DemandaGerada {
  title: string;
  description: string;
  estimated_hours: number;
  priority: 'low' | 'medium' | 'high';
  justificativa: string;
  suggested_assignee_name?: string | null;
}

export interface GerarDemandasInput {
  objetivo: string;
  project_id?: string | null;
  process_id?: string | null;
  capacidade_horas?: number | null;
  contexto_extra?: string | null;
}

interface GerarDemandasResumo {
  total_demandas: number;
  total_horas: number;
  capacidade_horas: number | null;
}

/**
 * Invoca a edge function `gerar-demandas-sprint`, que usa IA para decompor o
 * objetivo de uma sprint em uma lista de demandas. NÃO persiste nada: o
 * resultado é um rascunho para revisão/aprovação no front antes de gravar.
 */
export const useGerarDemandas = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [demandas, setDemandas] = useState<DemandaGerada[]>([]);
  const [resumo, setResumo] = useState<GerarDemandasResumo | null>(null);

  const gerar = useCallback(async (input: GerarDemandasInput): Promise<DemandaGerada[]> => {
    if (!input.objetivo?.trim()) {
      toast({ title: 'Descreva o objetivo da sprint', variant: 'destructive' });
      return [];
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('gerar-demandas-sprint', {
        body: {
          objetivo: input.objetivo.trim(),
          project_id: input.project_id || null,
          process_id: input.process_id || null,
          capacidade_horas: input.capacidade_horas ?? null,
          contexto_extra: input.contexto_extra || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const geradas: DemandaGerada[] = Array.isArray(data?.demandas) ? data.demandas : [];
      setDemandas(geradas);
      setResumo(data?.resumo ?? null);

      if (geradas.length === 0) {
        toast({ title: 'Nenhuma demanda gerada', description: 'Tente detalhar mais o objetivo.' });
      } else {
        toast({ title: `${geradas.length} demandas geradas`, description: 'Revise antes de adicionar ao backlog.' });
      }
      return geradas;
    } catch (e: any) {
      console.error('Erro ao gerar demandas:', e);
      toast({ title: 'Erro ao gerar demandas', description: e.message, variant: 'destructive' });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const reset = useCallback(() => {
    setDemandas([]);
    setResumo(null);
  }, []);

  return { gerar, demandas, resumo, isLoading, reset };
};
