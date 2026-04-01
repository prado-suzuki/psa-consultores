import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

interface SoftDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'per' | 'dcomp';
  identifier: string; // nr_per or nr_documento
}

export function SoftDeleteModal({ open, onOpenChange, type, identifier }: SoftDeleteModalProps) {
  const queryClient = useQueryClient();
  const [action, setAction] = useState<'E' | 'C'>('E');
  const [nrCancelamento, setNrCancelamento] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const updatePayload: { excluido: string; nr_cancelamento?: string | null } = {
        excluido: action,
        nr_cancelamento: action === 'C' ? (nrCancelamento || null) : null,
      };

      if (type === 'per') {
        // Update the PER
        const { error: perError } = await (supabase
          .from('per')
          .update(updatePayload as any)
          .eq('nr_per' as any, identifier) as any);
        if (perError) throw perError;

        // Cascade: update all child DCOMPs
        const { error: dcompError } = await (supabase
          .from('dcomp')
          .update(updatePayload as any)
          .eq('nr_per_orig', identifier)
          .or('excluido.is.null,excluido.eq.') as any);
        if (dcompError) {
          console.error('[SoftDelete] Erro ao atualizar DCOMPs em cascata:', dcompError);
        }
      } else {
        // Update just the DCOMP
        const { error } = await (supabase
          .from('dcomp')
          .update(updatePayload as any)
          .eq('nr_documento', identifier) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      queryClient.invalidateQueries({ queryKey: ['per-dcomps'] });
      queryClient.invalidateQueries({ queryKey: ['per-detail'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dcomps-existentes'] });

      const label = type === 'per' ? 'PER' : 'DCOMP';
      const actionLabel = action === 'E' ? 'excluído' : 'cancelado';
      toast.success(`${label} ${actionLabel} com sucesso!`);
      handleClose();
    },
    onError: (error: any) => {
      toast.error(`Erro ao processar: ${error.message}`);
    },
  });

  const handleClose = () => {
    setAction('E');
    setNrCancelamento('');
    onOpenChange(false);
  };

  const handleConfirm = () => {
    mutation.mutate();
  };

  const label = type === 'per' ? 'PER' : 'DCOMP';

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir / Cancelar {label}</DialogTitle>
          <DialogDescription>
            Selecione a ação para o {label} <span className="font-mono font-medium">{identifier}</span>
            {type === 'per' && '. Os DCOMPs vinculados serão atualizados em cascata.'}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={action} onValueChange={(v) => setAction(v as 'E' | 'C')} className="space-y-3">
          <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer" onClick={() => setAction('E')}>
            <RadioGroupItem value="E" id="excluir" className="mt-0.5" />
            <div>
              <Label htmlFor="excluir" className="font-medium cursor-pointer">Excluir</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Para processos cadastrados equivocamente na ferramenta.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer" onClick={() => setAction('C')}>
            <RadioGroupItem value="C" id="cancelar" className="mt-0.5" />
            <div>
              <Label htmlFor="cancelar" className="font-medium cursor-pointer">Cancelar</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Selecione para processos cancelados no PERDCOMP WEB.
              </p>
            </div>
          </div>
        </RadioGroup>

        {action === 'C' && (
          <div className="space-y-2">
            <Label>Nº Cancelamento (opcional)</Label>
            <Input
              placeholder="Informe o número de cancelamento..."
              value={nrCancelamento}
              onChange={(e) => setNrCancelamento(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
