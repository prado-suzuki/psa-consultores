import { Button } from '@/components/ui/button';
import { Loader2, Send, Download, Trash2 } from 'lucide-react';
import { useLimparCorrecoesSped } from '@/hooks/useCorrecoesSped';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { BOTAO_CONFIRMA_COM_DISABLED, BOTAO_DESTRUTIVO } from './classesDeBotao';

export interface CorrecoesActionsProps {
  contribuinteId: string;
  onEnviar: () => void;
  onExportar: () => void;
  isSending: boolean;
  isExporting: boolean;
  pendingCount: number;
  idArquivos: string[];
}

interface CorrecoesActionButtonsProps extends Omit<CorrecoesActionsProps, 'idArquivos'> {
  registroTipo: string;
  canExport: boolean;
}

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
  const { mutateAsync: limparCorrecoesSped } = useLimparCorrecoesSped();
  const noPending = pendingCount === 0;

  const handleLimpar = async () => {
    try {
      await limparCorrecoesSped();
      toast.success('efd_correcoes limpa.');
      queryClient.invalidateQueries({ queryKey: ['pending-correcoes'] });
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : String(error);
      toast.error(`Erro ao limpar: ${message}`);
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
        className={BOTAO_CONFIRMA_COM_DISABLED}
      >
        {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
        {isSending ? 'Enviando...' : `Enviar Correções ${registroTipo}`}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onExportar}
        disabled={isExporting || !canExport}
        className={BOTAO_CONFIRMA_COM_DISABLED}
      >
        {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
        {isExporting ? 'Exportando...' : 'Exportar correções'}
      </Button>
      {/* TODO: remover — botão temporário de debug */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleLimpar}
        className={`${BOTAO_DESTRUTIVO} shrink-0`}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Limpar efd_correcoes
      </Button>
    </>
  );
}
