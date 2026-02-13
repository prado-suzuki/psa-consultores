import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';

interface PerSync {
  numero_processo_per: string;
  id_contribuinte: string;
  exercicio: number;
  tri_exercicio: number;
  dt_solicitada: string;
  tp_credito: string;
  vlr_credito: number;
  vlr_ressarcido?: number | null;
  nr_proc_ret?: string | null;
  porcentagem_psa?: number | null;
}

interface PerSituacaoSync {
  id: string;
  nr_proc_per: string;
  situacao: string;
  dt_pagamento?: string | null;
  criado_em?: string | null;
  criado_por?: string | null;
}

interface DcompSync {
  nr_documento: string;
  nr_per_orig: string;
  mes_ano_exercicio: string;
  dt_envio: string;
  imposto: string;
  tp_credito: string;
  vlr_compensado: number;
  nr_dcomp_ret?: string | null;
  porcentagem_psa?: number | null;
}

interface SyncPerdcompPayload {
  per?: PerSync[];
  per_situacao?: PerSituacaoSync[];
  dcomp?: DcompSync[];
}

/**
 * Fire-and-forget sync of PERDCOMP data to DW.
 * Does not block the UI - errors are logged silently.
 */
export const syncPerdcompToDW = (payload: SyncPerdcompPayload) => {
  const environment = isProductionEnvironment ? 'production' : 'development';

  supabase.functions.invoke('sync-perdcomp', {
    body: { ...payload, environment },
  }).then(({ error }) => {
    if (error) {
      console.error('[sync-perdcomp] Erro ao invocar:', error.message);
    } else {
      console.log('[sync-perdcomp] Sync iniciado em background');
    }
  }).catch(err => {
    console.error('[sync-perdcomp] Erro:', err);
  });
};
