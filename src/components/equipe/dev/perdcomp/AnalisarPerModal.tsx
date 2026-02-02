import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';

const SITUACOES = [
  'PER Deferido',
  'Em análise',
  'Analisado',
];

interface AnalisarPerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perNumero: string;
  situacaoAtual: string | null;
  onSuccess: () => void;
}

export function AnalisarPerModal({
  open,
  onOpenChange,
  perNumero,
  situacaoAtual,
  onSuccess,
}: AnalisarPerModalProps) {
  const queryClient = useQueryClient();
  const [situacao, setSituacao] = useState<string>('');

  useEffect(() => {
    if (open && situacaoAtual) {
      setSituacao(situacaoAtual);
    } else if (open && !situacaoAtual) {
      setSituacao('');
    }
  }, [open, situacaoAtual]);

  const insertMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('per_situacao').insert({
        nr_proc_per: perNumero,
        situacao: situacao,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('Situação registrada com sucesso!');
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar situação: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!situacao) {
      toast.error('Selecione uma situação');
      return;
    }
    insertMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Analisar PER</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            PER: <span className="font-medium text-foreground">{perNumero}</span>
          </p>
          
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select value={situacao} onValueChange={setSituacao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent>
                {SITUACOES.map((sit) => (
                  <SelectItem key={sit} value={sit}>
                    {sit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={insertMutation.isPending || !situacao}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
          >
            {insertMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Marcar como verificado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
