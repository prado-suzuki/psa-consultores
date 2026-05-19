import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { formatCpfCnpj } from '@/components/equipe/client-form/constants';

export interface DuplicateContribuinte {
  id: string;
  cliente_id: string;
  cliente_nome: string | null;
}

/**
 * Verifica se já existe um contribuinte com o mesmo CPF/CNPJ no ambiente atual.
 * Como o campo cpf_cnpj na base está em formatos mistos (com e sem máscara),
 * a consulta usa `.in()` com as duas variações possíveis.
 */
export function useContribuinteDuplicateCheck() {
  return useCallback(async (
    rawValue: string,
    ignoreDbId?: string,
  ): Promise<DuplicateContribuinte | null> => {
    const digits = (rawValue || '').replace(/\D/g, '');
    if (digits.length !== 11 && digits.length !== 14) return null;

    const tipo = digits.length === 11 ? 'PF' : 'PJ';
    const formatted = formatCpfCnpj(digits, tipo);
    const variants = Array.from(new Set([digits, formatted]));

    let q = supabase
      .from('contribuinte')
      .select('id, cliente_id, cliente:cliente_id(nome)')
      .in('cpf_cnpj', variants)
      .eq('excluido', false)
      .eq('ambiente', currentAmbiente)
      .limit(1);

    if (ignoreDbId) q = q.neq('id', ignoreDbId);

    const { data, error } = await q;
    if (error) throw error;
    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      cliente_id: row.cliente_id,
      cliente_nome: (row.cliente as unknown as { nome: string } | null)?.nome ?? null,
    };
  }, []);
}
