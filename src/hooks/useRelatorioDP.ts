import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Dados do relatório de Diagnóstico Patrimonial, numa única leitura:
// bem → matrícula(s) → titularidade → titular (pessoa). Só tabelas existentes.
//
// SÓ LEITURA. Havia aqui um `useUpdateBemCampo`, para as células editáveis que o
// relatório mantinha na tabela dos não integralizados. Aquela tabela saiu: a
// Biblioteca de Slides mostra só o que vira slide, e a validação voltou para o
// Cadastro Patrimonial, onde os campos já eram editados.

export interface DPTitular {
  denominacao: string;
  tipo: string | null;
  fracao: number | null;
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
  tipo_exploracao_posse: string | null;
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
    area_documento, area_real, area_unidade, tipo_exploracao_posse, vlr_contabil, vlr_mercado,
    titularidade ( tipo, fracao, titular:titular_pessoa_id ( denominacao, tipo_pessoa ) )
  ),
  titularidade ( tipo, fracao, titular:titular_pessoa_id ( denominacao, tipo_pessoa ) )
`;

/**
 * A titularidade como ela chega no embed do `SELECT` acima, em qualquer um dos
 * dois lugares onde aparece (pendurada na matrícula ou direto no bem).
 */
interface TitularidadeEmbed {
  tipo: string | null;
  fracao: number | null;
  titular: { denominacao: string | null; tipo_pessoa: string | null } | null;
}

const mapTit = (t: TitularidadeEmbed): DPTitular => ({
  denominacao: t?.titular?.denominacao ?? '—',
  tipo: t?.titular?.tipo_pessoa ?? null,
  fracao: t?.fracao ?? null,
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
      return (data ?? []).map((b): DPBem => ({
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
        matriculas: (b.matricula ?? []).map((m): DPMatricula => ({
          id: m.id,
          numero: m.numero,
          matricula_anterior_texto: m.matricula_anterior_texto,
          municipio_imovel: m.municipio_imovel,
          uf_imovel: m.uf_imovel,
          area_documento: m.area_documento,
          area_real: m.area_real,
          area_unidade: m.area_unidade,
          tipo_exploracao_posse: m.tipo_exploracao_posse,
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

