import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import { useBensByCliente, useCartorios } from '@/hooks/useDiagnosticoPatrimonial';
import type { TipoEntidade } from '@/lib/templates/vocabulario';
import type { MatriculaParaMapear } from '@/lib/templates/mapeadores';

// Glue entre o cadastro OSG (pessoa/bem/matrícula/cartório) e o binding por entidade
// do gerador. Para cada tipo de entidade, devolve os registros do cliente como
// { id, label, row } — guardando a linha crua para o mapeador puro (mapeadores.ts).

export interface Registro<T = unknown> {
  id: string;
  label: string;
  /** Linha crua do cadastro, consumida pelo mapeador do tipo. */
  row: T;
}

// JOIN da matrícula com bem + cartório + titulares, no formato que `mapearMatricula`
// achata sob o binding do imóvel (e o cliente_id usado para filtrar por cliente).
const MATRICULA_GERACAO_SELECT = `
  id, numero, livro, folha, municipio_imovel, uf_imovel,
  area_documento, area_unidade, vlr_contabil, confrontacoes_texto, descricao_psa_completa,
  bem:bem_id ( denominacao, vlr_contabil, ccir_codigo, cliente_id ),
  cartorio:cartorio_id ( nome_completo, comarca, uf ),
  titularidade ( titular:titular_pessoa_id ( denominacao, cliente_id ) )
`;

interface RawMatriculaGeracao {
  id: string;
  numero: string | null; livro: string | null; folha: string | null;
  municipio_imovel: string | null; uf_imovel: string | null;
  area_documento: number | null; area_unidade: string | null; vlr_contabil: number | null;
  confrontacoes_texto: string | null; descricao_psa_completa: string | null;
  bem: { denominacao: string | null; vlr_contabil: number | null; ccir_codigo: string | null; cliente_id: string | null } | null;
  cartorio: { nome_completo: string | null; comarca: string | null; uf: string | null } | null;
  titularidade: Array<{ titular: { denominacao: string | null; cliente_id: string | null } | null }> | null;
}

function useMatriculasGeracao(clienteId: string | null) {
  return useQuery<RawMatriculaGeracao[]>({
    queryKey: ['matriculas-geracao', clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matricula')
        .select(MATRICULA_GERACAO_SELECT)
        .order('numero');
      if (error) throw error;
      return (data ?? []) as unknown as RawMatriculaGeracao[];
    },
  });
}

/**
 * Registros do cliente por tipo de entidade, prontos para os seletores da tela
 * Gerar (um por binding). Pessoas e bens vêm filtrados pelo cliente; matrículas
 * são filtradas por bem.cliente_id ou pelo cliente de algum titular; cartórios
 * são globais (não pertencem a um cliente).
 */
export function useRegistrosPorTipo(clienteId: string | null) {
  const pessoasQ = usePessoasByCliente(clienteId);
  const bensQ = useBensByCliente(clienteId);
  const matriculasQ = useMatriculasGeracao(clienteId);
  const cartoriosQ = useCartorios();

  const registros = useMemo<Record<TipoEntidade, Registro[]>>(() => {
    const pessoa: Registro[] = (pessoasQ.data ?? []).map((p) => ({
      id: p.id,
      label: p.denominacao,
      row: p,
    }));

    const bem: Registro[] = (bensQ.data ?? []).map((b) => ({
      id: b.id,
      label: [b.referencia_dp, b.denominacao].filter(Boolean).join(' — ') || 's/ ref',
      row: b,
    }));

    const matricula: Registro<MatriculaParaMapear>[] = (matriculasQ.data ?? [])
      .filter(
        (m) =>
          m.bem?.cliente_id === clienteId ||
          (m.titularidade ?? []).some((t) => t.titular?.cliente_id === clienteId),
      )
      .map((m) => ({
        id: m.id,
        label: `${m.numero ?? 's/ nº'}${m.bem?.denominacao ? ` — ${m.bem.denominacao}` : ''}`,
        row: {
          numero: m.numero,
          livro: m.livro,
          folha: m.folha,
          municipio_imovel: m.municipio_imovel,
          uf_imovel: m.uf_imovel,
          area_documento: m.area_documento,
          area_unidade: m.area_unidade,
          vlr_contabil: m.vlr_contabil,
          confrontacoes_texto: m.confrontacoes_texto,
          descricao_psa_completa: m.descricao_psa_completa,
          bem: m.bem
            ? { denominacao: m.bem.denominacao, vlr_contabil: m.bem.vlr_contabil, ccir_codigo: m.bem.ccir_codigo }
            : null,
          cartorio: m.cartorio,
          titulares: (m.titularidade ?? []).map((t) => ({ denominacao: t.titular?.denominacao ?? null })),
        },
      }));

    const cartorio: Registro[] = (cartoriosQ.data ?? []).map((c) => ({
      id: c.id,
      label: [c.nome_completo, [c.comarca, c.uf].filter(Boolean).join('/')].filter(Boolean).join(' — '),
      row: c,
    }));

    return { pessoa, bem, matricula, cartorio };
  }, [pessoasQ.data, bensQ.data, matriculasQ.data, cartoriosQ.data, clienteId]);

  return {
    registros,
    isFetching:
      pessoasQ.isFetching || bensQ.isFetching || matriculasQ.isFetching || cartoriosQ.isFetching,
  };
}
