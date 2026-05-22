import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GrupoTributo {
  id: string;
  sigla: string;
  denominacao: string;
}

export interface CodigoReceita {
  id: string;
  grupo_tributo_id: string;
  codigo: string;
  denominacao_receita: string;
}

/** Catálogo de Grupos de Tributo da RFB (23 registros). Estável → cache longo. */
export function useGruposTributo() {
  return useQuery<GrupoTributo[]>({
    queryKey: ['catalogo', 'grupo-tributo'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('grupo_tributo' as never) as any)
        .select('id, sigla, denominacao')
        .order('sigla');
      if (error) throw error;
      return (data || []) as GrupoTributo[];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/** Catálogo de Códigos de Receita da RFB (~976 registros). Estável → cache longo. */
export function useCodigosReceita() {
  return useQuery<CodigoReceita[]>({
    queryKey: ['catalogo', 'codigo-receita'],
    queryFn: async () => {
      const { data, error } = await (supabase.from('codigo_receita' as never) as any)
        .select('id, grupo_tributo_id, codigo, denominacao_receita')
        .order('codigo');
      if (error) throw error;
      return (data || []) as CodigoReceita[];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/**
 * Mapeia siglas legadas (do campo `tributo` antigo) para a sigla do grupo correspondente
 * no novo catálogo. Permite que DCOMPs antigos continuem editáveis após a migração.
 */
const LEGACY_SIGLA_PARA_GRUPO: Record<string, string> = {
  PIS: 'PIS/PASEP',
  INSS: 'CP SEGURADOS',
};

export function findGrupoIdPorSiglaLegado(
  legacySigla: string | null | undefined,
  grupos: GrupoTributo[],
): string | null {
  if (!legacySigla) return null;
  const alvo = LEGACY_SIGLA_PARA_GRUPO[legacySigla] || legacySigla;
  return grupos.find((g) => g.sigla === alvo)?.id ?? null;
}
