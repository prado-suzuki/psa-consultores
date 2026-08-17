import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Leitura do catálogo de tipos de documento (`documento_tipo`, ex-`checklist_item_padrao`,
 * renomeada na EDU-20).
 *
 * O que este arquivo NÃO faz mais: escrever em `checklist_cliente_item`. O
 * checklist do consultor deixou de ser tabela materializada e passou a ser
 * derivado da solicitação menos os arquivos classificados
 * (`src/lib/checklistDerivado.ts`, docs/planos/checklist-por-subtracao.md). Com
 * isso saíram o gerador por instância, o status manual por item, o vínculo
 * arquivo × item e a remoção de item: nenhum deles tem mais consumidor, e a
 * tabela não tem mais leitor no front.
 *
 * O `as any` no client é herança de quando estas tabelas ainda não estavam no
 * types.ts; hoje já estão, e tipar de verdade é dívida separada.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type Granularidade =
  | 'pessoa_pf' | 'pessoa_pj' | 'matricula_rural' | 'matricula_urbana' | 'bem' | 'cliente';

export interface ChecklistPadraoRow {
  id: string;
  codigo: string;
  modulo: string;
  entidade: string;
  documento: string;
  nota: string | null;
  categoria: string | null;
  categoria_docbox: string | null;
  confidencial: boolean;
  obrigatorio_default: boolean;
  granularidade: Granularidade;
  ordem: number;
  ativo: boolean;
}

const PADRAO_KEY = 'checklist-padrao';

/**
 * Catálogo PADRÃO editável (os 63 tipos). Fonte da tela e do seletor de tipos.
 *
 * `cliente_id is null` recorta o padrão: desde a migration 20260807150000 a
 * mesma tabela também guarda os documentos AVULSOS, criados quando alguém pede
 * um documento à mão numa solicitação. Sem este filtro, a lista de escolha
 * passaria a misturar os 67 padrões com a cauda de pedidos avulsos de todos os
 * clientes. Avulso não se acha no catálogo: chega pelo item pedido.
 */
export function useChecklistPadrao() {
  return useQuery({
    queryKey: [PADRAO_KEY],
    queryFn: async (): Promise<ChecklistPadraoRow[]> => {
      const { data, error } = await sb
        .from('documento_tipo')
        .select('*')
        .is('cliente_id', null)
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistPadraoRow[];
    },
  });
}

const AVULSOS_KEY = 'documento-tipo-avulsos';

/**
 * Os tipos AVULSOS de um cliente, indexados pelo item manual que os originou.
 *
 * Existem desde a migration 20260807150000: documento pedido à mão ganha linha
 * própria em `documento_tipo`, fora do catálogo, para o arquivo que responde a
 * ele ter em que se apoiar. Como estão fora do catálogo, nenhum leitor de lista
 * os enxerga, e este hook é o caminho.
 *
 * Devolve um mapa id do item → id do tipo, que é o formato que `tiposPedidos` e
 * o checklist derivado consomem: o resto do item (nome, grão) já vem da solicitação.
 */
export function useTiposAvulsosDoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: [AVULSOS_KEY, clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await sb
        .from('documento_tipo')
        .select('id, solicitacao_item_id')
        .eq('cliente_id', clienteId)
        .eq('ativo', true);
      if (error) throw error;
      const porItem: Record<string, string> = {};
      for (const linha of (data ?? []) as { id: string; solicitacao_item_id: string | null }[]) {
        if (linha.solicitacao_item_id) porItem[linha.solicitacao_item_id] = linha.id;
      }
      return porItem;
    },
  });
}
