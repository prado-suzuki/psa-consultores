import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { currentAmbiente } from '@/config/api';
import { formatCpfCnpj } from '@/components/equipe/client-form/constants';

export interface ContribuinteAutofill {
  nome_razao_social: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
}

/**
 * Autofill de conveniência para PF: dado um CPF que JÁ existe na base, retorna os
 * VALORES da cópia mais recente para pré-preencher o formulário.
 *
 * NÃO retorna id/cliente_id e NÃO cria vínculo: a arquitetura mantém, de propósito,
 * N linhas independentes por CPF (o mesmo contribuinte aparece com ids diferentes
 * em clientes diferentes). No save, uma linha nova continua sendo inserida com id
 * próprio. É um snapshot do momento — não sincroniza nada; as cópias podem divergir.
 *
 * O campo cpf_cnpj está em formatos mistos na base (com e sem máscara), por isso a
 * consulta usa `.in()` com as duas variações.
 */
export function useContribuinteAutofill() {
  return useCallback(async (rawValue: string): Promise<ContribuinteAutofill | null> => {
    const digits = (rawValue || '').replace(/\D/g, '');
    if (digits.length !== 11) return null; // só CPF (PF)

    const formatted = formatCpfCnpj(digits, 'PF');
    const variants = Array.from(new Set([digits, formatted]));

    const { data, error } = await supabase
      .from('contribuinte')
      .select('nome_razao_social, telefone, cep, logradouro, numero, complemento, bairro, municipio, uf')
      .in('cpf_cnpj', variants)
      .eq('excluido', false)
      .eq('ambiente', currentAmbiente)
      .eq('tipo_pessoa', 'PF')
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    const row = data?.[0] as Record<string, string | null> | undefined;
    if (!row) return null;
    return {
      nome_razao_social: row.nome_razao_social ?? '',
      telefone: row.telefone ?? '',
      cep: row.cep ?? '',
      logradouro: row.logradouro ?? '',
      numero: row.numero ?? '',
      complemento: row.complemento ?? '',
      bairro: row.bairro ?? '',
      municipio: row.municipio ?? '',
      uf: row.uf ?? '',
    };
  }, []);
}
