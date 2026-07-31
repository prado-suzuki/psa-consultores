import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { checklistClienteKey } from '@/hooks/useOsgChecklist';
import {
  buildOnboardingChecklistRows,
  checklistDocumentIdentity,
  type ConsolidatedOnboardingDocument,
  type OnboardingProduct,
} from '@/lib/onboarding';

export const OSG_PRODUCT_CODES = [
  'CFI',
  'DSS',
  'ES',
  'GOV',
  'MC',
  'PS',
  'RSA',
  'RSC',
  'RSF',
  'RSI',
  'RST',
] as const;

export interface OnboardingCatalogData {
  products: OnboardingProduct[];
  catalogDocuments: OnboardingProduct['documents'];
  hasContractedProducts: boolean;
}

export function useOnboarding(clienteId: string | null) {
  return useQuery<OnboardingCatalogData>({
    queryKey: ['osg-onboarding', clienteId],
    queryFn: async () => {
      if (!clienteId) {
        return { products: [], catalogDocuments: [], hasContractedProducts: false };
      }

      const { data: productRows, error: productError } = await supabase
        .from('produto_segmento')
        .select('id, codigo, nome')
        .in('codigo', [...OSG_PRODUCT_CODES])
        .eq('is_active', true)
        .order('codigo');
      if (productError) throw productError;

      const productIds = (productRows ?? []).map((product) => product.id);
      const { data: orderRows, error: orderError } = await supabase
        .from('ordem_servico')
        .select('id, id_produto_segmento')
        .eq('id_cliente', clienteId)
        .eq('excluido', false);
      if (orderError) throw orderError;

      const orderIds = (orderRows ?? []).map((order) => order.id);
      const { data: contractedRows, error: contractedError } = orderIds.length
        ? await supabase
          .from('os_produtos_contratados')
          .select('produto_segmento_id')
          .in('ordem_servico_id', orderIds)
        : { data: [], error: null };
      if (contractedError) throw contractedError;

      const contractedIds = new Set([
        ...(orderRows ?? []).flatMap((order) =>
          order.id_produto_segmento ? [order.id_produto_segmento] : []),
        ...(contractedRows ?? []).map((row) => row.produto_segmento_id),
      ]);

      const { data: linkRows, error: linkError } = productIds.length
        ? await supabase
          .from('produto_checklist_item')
          .select('produto_segmento_id, item_padrao_id, obrigatorio')
          .in('produto_segmento_id', productIds)
        : { data: [], error: null };
      if (linkError) throw linkError;

      // Catálogo inteiro: os vinculados viram a lista do produto e o restante
      // alimenta a lista de opcionais de cada grupo.
      const { data: itemRows, error: itemError } = await supabase
        .from('checklist_item_padrao')
        .select(
          'id, codigo, documento, entidade, modulo, nota, categoria, categoria_docbox, confidencial, ordem',
        )
        .eq('ativo', true)
        .order('ordem');
      if (itemError) throw itemError;

      const itemsById = new Map((itemRows ?? []).map((item) => [item.id, item]));
      const products: OnboardingProduct[] = (productRows ?? []).map((product) => ({
        id: product.id,
        code: product.codigo,
        name: product.nome,
        contracted: contractedIds.has(product.id),
        documents: (linkRows ?? [])
          .filter((link) => link.produto_segmento_id === product.id)
          .flatMap((link) => {
            const item = itemsById.get(link.item_padrao_id);
            if (!item) return [];
            return [{
              id: item.id,
              catalogId: item.id,
              code: item.codigo,
              title: item.documento,
              entity: item.entidade,
              module: item.modulo,
              note: item.nota ?? '',
              required: link.obrigatorio,
              category: item.categoria,
              docboxCategory: item.categoria_docbox,
              confidential: item.confidencial,
              productId: product.id,
              order: item.ordem,
            }];
          })
          .sort((left, right) => left.order - right.order)
          .map(({ order: _order, ...document }) => document),
      }));

      const catalogDocuments: OnboardingProduct['documents'] = (itemRows ?? []).map((item) => ({
        id: item.id,
        catalogId: item.id,
        code: item.codigo,
        title: item.documento,
        entity: item.entidade,
        module: item.modulo,
        note: item.nota ?? '',
        required: false,
        category: item.categoria,
        docboxCategory: item.categoria_docbox,
        confidential: item.confidencial,
        productId: '',
      }));

      return {
        products,
        catalogDocuments: catalogDocuments.sort((left, right) =>
          left.title.localeCompare(right.title, 'pt-BR')),
        hasContractedProducts: products.some((product) => product.contracted),
      };
    },
    enabled: Boolean(clienteId),
    staleTime: 5 * 60 * 1000,
  });
}

export interface SendOnboardingResult {
  created: number;
  updated: number;
  total: number;
}

export function useSendOnboarding(clienteId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      documents: ConsolidatedOnboardingDocument[],
    ): Promise<SendOnboardingResult> => {
      if (!clienteId) {
        throw new Error('Selecione um cliente antes de enviar a solicitação.');
      }
      if (documents.length === 0) {
        throw new Error('Inclua ao menos um documento na solicitação.');
      }

      const { data: existingRows, error: existingError } = await supabase
        .from('checklist_cliente_item')
        .select('id, item_padrao_id, documento, entidade, status')
        .eq('cliente_id', clienteId)
        .is('pessoa_id', null)
        .is('bem_id', null)
        .is('matricula_id', null);
      if (existingError) throw existingError;

      const existingByIdentity = new Map(
        (existingRows ?? []).map((row) => [
          checklistDocumentIdentity(row.item_padrao_id, row.documento, row.entidade),
          row,
        ]),
      );
      let created = 0;
      let updated = 0;
      const rows = buildOnboardingChecklistRows(clienteId, documents).map((row) => {
        const existing = existingByIdentity.get(
          checklistDocumentIdentity(row.item_padrao_id, row.documento, row.entidade),
        );

        if (!existing) {
          created += 1;
          return { ...row, id: crypto.randomUUID() };
        }

        updated += 1;
        return {
          ...row,
          id: existing.id,
          status: existing.status === 'recebido' ? 'recebido' as const : row.status,
        };
      });

      const { data: savedRows, error: saveError } = await supabase
        .from('checklist_cliente_item')
        .upsert(rows, { onConflict: 'id' })
        .select('id');
      if (saveError) throw saveError;
      if ((savedRows ?? []).length !== rows.length) {
        throw new Error('O banco não confirmou todos os itens da solicitação.');
      }

      return { created, updated, total: rows.length };
    },
    onSuccess: () => {
      if (!clienteId) return;
      queryClient.invalidateQueries({ queryKey: checklistClienteKey(clienteId) });
      queryClient.invalidateQueries({ queryKey: ['checklist-solicitado', clienteId] });
    },
  });
}
