import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { assertCanPerform } from '@/hooks/useRlsPrecheck';
import { useAuditLog } from '@/hooks/useAuditLog';

interface DeleteClienteParams {
  id: string;
  nome: string;
}

type SoftDeleteClienteRpc = (
  fn: 'soft_delete_cliente',
  params: { _ids: string[] },
) => Promise<{ data: number | null; error: unknown }>;

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  const { logActionOrThrow } = useAuditLog();

  return useMutation({
    mutationFn: async ({ id, nome }: DeleteClienteParams) => {
      await assertCanPerform('cliente', 'update', id);

      // O log vem ANTES do update, de propósito.
      //
      // Excluir cliente tira o registro da vista de todo mundo que não é admin
      // (`cliente_select_scoped` exige `excluido = false`), e até aqui esse ato
      // não deixava rastro nenhum — a base inteira não tem um único registro de
      // exclusão de cliente. Logar depois do update reproduziria o problema: se
      // o log falhasse, o cliente já teria sumido sem assinatura.
      //
      // Invertendo, a falha possível deixa de ser "cliente excluído sem log" e
      // passa a ser "log sem exclusão" — que é raro (o assertCanPerform acima já
      // barrou o que barraria o update) e, ao contrário do outro, é detectável:
      // basta procurar log de exclusão cujo cliente ainda está vivo.
      //
      // Do navegador não há transação entre as duas tabelas; garantir 1:1 exige
      // RPC ou trigger, decisão adiada de propósito.
      await logActionOrThrow({
        area: 'cadastros',
        entity_type: 'cliente',
        entity_id: id,
        entity_name: nome,
        action: 'deleted',
        changed_fields: { excluido: { old: false, new: true } },
      });

      // A RPC veio por migration e ainda não consta no types.ts desta branch.
      // O cast fica isolado aqui até a geração oficial dos tipos do banco.
      const softDeleteCliente = supabase.rpc as unknown as SoftDeleteClienteRpc;
      const { data, error } = await softDeleteCliente('soft_delete_cliente', { _ids: [id] });
      if (error) throw error;
      if (data !== 1) throw new Error('O cliente não foi excluído. Atualize a página e tente novamente.');
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-lista'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-filtrados'] });
      toast({ title: 'Cliente excluído', description: `O cliente "${variables.nome}" foi removido.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    },
  });
}
