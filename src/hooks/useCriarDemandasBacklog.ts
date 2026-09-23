import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useToast } from '@/hooks/use-toast';
import { domainBacklogQueryKeys } from '@/hooks/useDomainBacklog';
import type { DemandaGerada } from '@/hooks/useGerarDemandas';

export interface DemandaParaSalvar extends Omit<DemandaGerada, 'estimated_hours'> {
  estimated_hours: number | null;
  project_id?: string | null;
}

interface OpcoesDeSalvar {
  /** Abre o `details` da auditoria; a justificativa de cada demanda vem depois dos dois-pontos. */
  origem?: string;
}

/**
 * Grava em lote demandas (geradas por IA ou importadas de arquivo, revisadas antes) na
 * tabela `sprint_backlog_items`. Itens entram no backlog global (sprint_id
 * nulo) e são distribuídos depois via "Mover para Sprint".
 *
 * Segue as regras do projeto: nenhuma chamada Supabase em componente (isolada
 * aqui) e log de auditoria CUD por item criado (useAuditLog).
 */
export const useCriarDemandasBacklog = () => {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const salvar = useCallback(async (
    demandas: DemandaParaSalvar[],
    { origem = 'Demanda gerada por IA' }: OpcoesDeSalvar = {},
  ): Promise<boolean> => {
    if (!demandas.length) {
      toast({ title: 'Nenhuma demanda selecionada', variant: 'destructive' });
      return false;
    }

    setIsSaving(true);
    try {
      const payload = demandas.map((d) => ({
        title: d.title,
        description: d.description || null,
        priority: d.priority,
        estimated_hours: d.estimated_hours != null && Number.isFinite(d.estimated_hours) ? d.estimated_hours : null,
        sprint_id: null, // backlog global
        project_id: d.project_id || null,
        suggested_by: user?.id ?? null,
        status: 'pending',
      }));

      // project_id é coluna recente: os types autogerados podem ainda não conhecê-la.
      const insertPayload = payload as Array<(typeof payload)[number] & Record<string, unknown>>;

      const { data, error } = await supabase
        .from('sprint_backlog_items')
        .insert(insertPayload)
        .select();

      if (error) throw error;

      const created = (data ?? []) as Array<{ id: string; title: string; priority: string; estimated_hours: number | null; project_id: string | null }>;

      // Auditoria CUD: um log por item criado, com os campos gravados.
      await Promise.all(
        created.map((item, idx) =>
          logAction({
            area: 'dev',
            entity_type: 'backlog_item',
            entity_id: item.id,
            entity_name: item.title,
            action: 'created',
            changed_fields: {
              title: { old: null, new: item.title },
              priority: { old: null, new: item.priority },
              estimated_hours: { old: null, new: item.estimated_hours },
              project_id: { old: null, new: item.project_id },
            },
            details: `${origem}${demandas[idx]?.justificativa ? `: ${demandas[idx].justificativa}` : ''}`,
          })
        )
      );

      void queryClient.invalidateQueries({ queryKey: domainBacklogQueryKeys.data });

      toast({
        title: `${created.length} ${created.length === 1 ? 'demanda adicionada' : 'demandas adicionadas'} ao backlog`,
        description: 'Distribua nas sprints com "Mover para Sprint".',
      });
      return true;
    } catch (e: any) {
      console.error('Erro ao salvar demandas no backlog:', e);
      toast({ title: 'Erro ao salvar no backlog', description: e.message, variant: 'destructive' });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, logAction, toast, queryClient]);

  return { salvar, isSaving };
};
