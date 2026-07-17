import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Tabela nova (exploracao_rural) ainda não está no types.ts — usamos `as any`
// (mesmo padrão do useOsgChecklist.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type OsgTipoExploracao =
  | 'arrendamento'
  | 'parceria'
  | 'composse'
  | 'comodato'
  | 'condominio'
  | 'propria';

export interface ExploracaoRuralRow {
  id: string;
  cliente_id: string;
  referencia: string | null;
  tipo_exploracao: OsgTipoExploracao;
  bem_id: string | null;
  imovel_descricao: string | null;
  matricula_texto: string | null;
  municipio: string | null;
  uf: string | null;
  area_total: number | null;
  area_explorada: number | null;
  area_unidade: string;
  explorador_pessoa_id: string | null;
  explorador_nome: string | null;
  outorgante_pessoa_id: string | null;
  outorgante_nome: string | null;
  declarado_irpf: boolean;
  data_assinatura: string | null;
  data_encerramento: string | null;
  vigencia: string | null;
  sacas_por_hectare: number | null;
  created_at: string;
  explorador: { denominacao: string | null } | null;
  outorgante: { denominacao: string | null } | null;
  bem: { denominacao: string | null } | null;
}

export function useExploracaoRural(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ['exploracao_rural', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<ExploracaoRuralRow[]> => {
      const { data, error } = await sb
        .from('exploracao_rural')
        .select(
          '*, explorador:pessoa!explorador_pessoa_id(denominacao), outorgante:pessoa!outorgante_pessoa_id(denominacao), bem:bem!bem_id(denominacao)',
        )
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExploracaoRuralRow[];
    },
  });
}
