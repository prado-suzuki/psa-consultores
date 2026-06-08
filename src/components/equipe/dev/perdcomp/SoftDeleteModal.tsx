import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface SoftDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'per' | 'dcomp';
  identifier: string; // nr_per ou nr_documento
}

/**
 * Confirmação de exclusão DEFINITIVA (hard delete) de PER ou DCOMP.
 * - PER: apaga em cascata `distribuicao_dcomp` -> `dcomp` -> `per_situacao` -> `per`.
 * - DCOMP: apaga `distribuicao_dcomp` -> `dcomp`.
 *
 * Nome do componente mantido (`SoftDeleteModal`) por compatibilidade com os
 * pontos de uso, mas a operação não é mais soft delete.
 */
export function SoftDeleteModal({ open, onOpenChange, type, identifier }: SoftDeleteModalProps) {
  const queryClient = useQueryClient();
  const { isAdmin, isLider, isSublider } = useAuth();
  const canWrite = isAdmin || isLider || isSublider;

  const mutation = useMutation({
    mutationFn: async () => {
      if (type === 'per') {
        // Buscar DCOMPs filhos para apagar as distribuições primeiro
        const { data: dcompsFilhos, error: dcompsErr } = await (supabase
          .from('dcomp') as any)
          .select('nr_documento')
          .eq('nr_per_orig', identifier);
        if (dcompsErr) throw dcompsErr;

        const nrDocs = (dcompsFilhos || []).map((d: { nr_documento: string }) => d.nr_documento);
        if (nrDocs.length > 0) {
          const { error: distErr } = await supabase
            .from('distribuicao_dcomp')
            .delete()
            .in('nr_documento', nrDocs);
          if (distErr) throw distErr;
        }

        const { error: dcompErr } = await supabase
          .from('dcomp')
          .delete()
          .eq('nr_per_orig', identifier);
        if (dcompErr) throw dcompErr;

        const { error: sitErr } = await supabase
          .from('per_situacao')
          .delete()
          .eq('nr_proc_per', identifier);
        if (sitErr) throw sitErr;

        const { error: perErr } = await supabase
          .from('per')
          .delete()
          .eq('nr_per', identifier);
        if (perErr) throw perErr;
      } else {
        const { error: distErr } = await supabase
          .from('distribuicao_dcomp')
          .delete()
          .eq('nr_documento', identifier);
        if (distErr) throw distErr;

        const { error } = await supabase
          .from('dcomp')
          .delete()
          .eq('nr_documento', identifier);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
      queryClient.invalidateQueries({ queryKey: ['per-detail'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });

      const label = type === 'per' ? 'PER' : 'DCOMP';
      toast.success(`${label} excluído definitivamente.`);
      onOpenChange(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(`Erro ao excluir: ${error?.message ?? 'erro desconhecido'}`);
    },
  });

  const label = type === 'per' ? 'PER' : 'DCOMP';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {label} definitivamente</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Esta ação apaga em definitivo o {label}{' '}
                <span className="font-mono font-medium">{identifier}</span>
                {type === 'per'
                  ? ', incluindo todos os DCOMPs, situações e distribuições vinculados.'
                  : ', incluindo suas distribuições.'}
              </p>
              <p className="text-destructive font-medium">Não é possível desfazer.</p>
              {!canWrite && (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[12px] font-medium text-destructive">
                  Você não tem permissão para excluir este {label}.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending || !canWrite}
            onClick={(e) => {
              e.preventDefault();
              if (!canWrite) {
                toast.error(`Você não tem permissão para excluir este ${label}`);
                return;
              }
              mutation.mutate();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
