import { Button } from '@/components/ui/button';
import { Loader2, Send, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface CorrecoesActionButtonsProps {
  registroTipo: string;
  contribuinteId: string;
  onEnviar: () => void;
  onExportar: () => void;
  isSending: boolean;
  isExporting: boolean;
  canExport: boolean;
  pendingCount: number;
}

const greenIdle =
  'bg-white text-black border border-input hover:bg-emerald-600 hover:text-white hover:border-emerald-600 active:bg-emerald-700 active:text-white transition-colors duration-200';

const redIdle =
  'bg-white text-black border border-input hover:bg-red-600 hover:text-white hover:border-red-600 active:bg-red-700 active:text-white transition-colors duration-200';

export default function CorrecoesActionButtons({
  registroTipo,
  contribuinteId,
  onEnviar,
  onExportar,
  isSending,
  isExporting,
  canExport,
  pendingCount,
}: CorrecoesActionButtonsProps) {
  const queryClient = useQueryClient();
  const noPending = pendingCount === 0;

  const handleLimpar = async () => {
    const { error } = await supabase.from('efd_correcoes').delete().gte('created_at', '1970-01-01');
    if (error) {
      toast.error(`Erro ao limpar: ${error.message}`);
    } else {
      toast.success('efd_correcoes limpa.');
      queryClient.invalidateQueries({ queryKey: ['pending-correcoes'] });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={onEnviar}
        disabled={isSending || noPending}
        title={noPending ? 'Nenhuma correção pendente' : undefined}
        className={`${greenIdle} disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-input shrink-0`}
      >
        {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
        {isSending ? 'Enviando...' : `Enviar Correções ${registroTipo}`}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onExportar}
        disabled={isExporting || !canExport}
        className={`${greenIdle} disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black disabled:hover:border-input shrink-0`}
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
        {isExporting ? 'Exportando...' : 'Exportar correções'}
      </Button>
      {/* TODO: remover — botão temporário de debug */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleLimpar}
        className={`${redIdle} shrink-0`}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Limpar efd_correcoes
      </Button>
    </>
  );
}
