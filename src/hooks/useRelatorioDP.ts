import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Dados do relatório de Diagnóstico Patrimonial, numa única leitura:
// bem → matrícula(s) → titularidade → titular (pessoa). Só tabelas existentes.

export interface DPTitular {
  denominacao: string;
  tipo: string | null;
  fracao: number | null;
  integralizador: boolean;
}

export interface DPMatricula {
  id: string;
  numero: string | null;
  matricula_anterior_texto: string | null;
  municipio_imovel: string | null;
  uf_imovel: string | null;
  area_documento: number | null;
  area_real: number | null;
  area_unidade: string | null;
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  titulares: DPTitular[];
}

export interface DPBem {
  id: string;
  referencia_dp: string | null;
  denominacao: string | null;
  tipo_bem: string | null;
  vlr_contabil: number | null;
  vlr_mercado: number | null;
  status_integralizacao: string | null;
  participa_estruturacao: boolean | null;
  empresa_destino_pessoa_id: string | null;
  motivo_nao_integralizacao: string | null;
  observacao: string | null;
  matriculas: DPMatricula[];
  titulares: DPTitular[]; // titularidade ancorada direto no bem (PS/AP/OU sem matrícula)
}

const SELECT = `
  id, referencia_dp, denominacao, tipo_bem, vlr_contabil, vlr_mercado,
  status_integralizacao, participa_estruturacao, empresa_destino_pessoa_id,
  motivo_nao_integralizacao, observacao,
  matricula (
    id, numero, matricula_anterior_texto, municipio_imovel, uf_imovel,
    area_documento, area_real, area_unidade, vlr_contabil, vlr_mercado,
    titularidade ( tipo, fracao, integralizador, titular:titular_pessoa_id ( denominacao, tipo_pessoa ) )
  ),
  titularidade ( tipo, fracao, integralizador, titular:titular_pessoa_id ( denominacao, tipo_pessoa ) )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapTit = (t: any): DPTitular => ({
  denominacao: t?.titular?.denominacao ?? '—',
  tipo: t?.titular?.tipo_pessoa ?? null,
  fracao: t?.fracao ?? null,
  integralizador: !!t?.integralizador,
});

export function useRelatorioDP(clienteId: string | null) {
  return useQuery<DPBem[]>({
    queryKey: ['relatorio-dp', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('bem')
        .select(SELECT)
        .eq('cliente_id', clienteId)
        .order('referencia_dp');
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((data ?? []) as any[]).map((b): DPBem => ({
        id: b.id,
        referencia_dp: b.referencia_dp,
        denominacao: b.denominacao,
        tipo_bem: b.tipo_bem,
        vlr_contabil: b.vlr_contabil,
        vlr_mercado: b.vlr_mercado,
        status_integralizacao: b.status_integralizacao,
        participa_estruturacao: b.participa_estruturacao,
        empresa_destino_pessoa_id: b.empresa_destino_pessoa_id,
        motivo_nao_integralizacao: b.motivo_nao_integralizacao,
        observacao: b.observacao,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        matriculas: (b.matricula ?? []).map((m: any): DPMatricula => ({
          id: m.id,
          numero: m.numero,
          matricula_anterior_texto: m.matricula_anterior_texto,
          municipio_imovel: m.municipio_imovel,
          uf_imovel: m.uf_imovel,
          area_documento: m.area_documento,
          area_real: m.area_real,
          area_unidade: m.area_unidade,
          vlr_contabil: m.vlr_contabil,
          vlr_mercado: m.vlr_mercado,
          titulares: (m.titularidade ?? []).map(mapTit),
        })),
        titulares: (b.titularidade ?? []).map(mapTit),
      }));
    },
    enabled: !!clienteId,
  });
}

// Validação manual da OSG direto no relatório: valor de mercado e observações
// (mesmos campos editados no módulo Diagnóstico Patrimonial). Só campos existentes.
export type CampoValidacaoDP = 'vlr_mercado' | 'observacao' | 'motivo_nao_integralizacao';

export function useUpdateBemCampo(clienteId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bemId, campo, valor }: { bemId: string; campo: CampoValidacaoDP; valor: string | number | null }) => {
      const { error } = await supabase.from('bem').update({ [campo]: valor }).eq('id', bemId);
      if (error) throw error;
      return { bemId, campo };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorio-dp', clienteId] });
      qc.invalidateQueries({ queryKey: ['bens-by-cliente', clienteId] });
    },
    onError: (e: Error) => toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' }),
  });
}
