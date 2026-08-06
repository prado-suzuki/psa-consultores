import { useState } from 'react';
import { FileStack, Loader2, Lock, Plus, Send } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import type { SolicitacaoStatus } from '@/lib/solicitacao';

/**
 * As ações do topo da Solicitação Inicial, que dependem do status.
 *
 * rascunho  → Atualizar da OS · Enviar (só com item ativo) · Encerrar
 * enviada   → Atualizar da OS (com confirmação) · Encerrar
 * encerrada → Abrir nova solicitação
 *
 * Enviar e encerrar não convivem com "voltar atrás": existe uma solicitação não
 * encerrada por cliente, ela não retorna para rascunho, e encerrar é definitivo.
 * Por isso o encerramento pede confirmação, e a atualização também pede quando a
 * lista já está com o cliente — ali o documento novo aparece para ele na hora.
 */
interface SolicitacaoAcoesProps {
  status: SolicitacaoStatus | null;
  /** Há OS da OSG para gerar/atualizar a partir dela. */
  temOrigemNaOs: boolean;
  listaVazia: boolean;
  itensAtivos: number;
  ocupado: boolean;
  onGerar: () => void;
  onEnviar: () => void;
  onEncerrar: () => void;
  onAbrirNova: () => void;
}

export function SolicitacaoAcoes({
  status,
  temOrigemNaOs,
  listaVazia,
  itensAtivos,
  ocupado,
  onGerar,
  onEnviar,
  onEncerrar,
  onAbrirNova,
}: SolicitacaoAcoesProps) {
  const [confirmarAtualizacao, setConfirmarAtualizacao] = useState(false);
  const [confirmarEncerramento, setConfirmarEncerramento] = useState(false);

  if (status === 'encerrada') {
    return (
      <Button size="sm" onClick={onAbrirNova} disabled={ocupado}>
        {ocupado ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        Abrir nova solicitação
      </Button>
    );
  }

  const enviada = status === 'enviada';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {temOrigemNaOs && (
        <Button
          size="sm"
          variant={listaVazia ? 'default' : 'outline'}
          onClick={() => (enviada ? setConfirmarAtualizacao(true) : onGerar())}
          disabled={ocupado}
        >
          {ocupado
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <FileStack className="mr-2 h-4 w-4" />}
          {listaVazia ? 'Gerar lista a partir da OS' : 'Atualizar a partir da OS'}
        </Button>
      )}

      {status === 'rascunho' && (
        <Button size="sm" onClick={onEnviar} disabled={ocupado || itensAtivos === 0}>
          <Send className="mr-2 h-4 w-4" />
          Enviar solicitação
        </Button>
      )}

      {status && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmarEncerramento(true)}
          disabled={ocupado}
        >
          <Lock className="mr-2 h-4 w-4" />
          Encerrar solicitação
        </Button>
      )}

      <AlertDialog open={confirmarAtualizacao} onOpenChange={setConfirmarAtualizacao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar uma solicitação já enviada?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente já está vendo esta lista. Os documentos que a OS trouxer de novo
              aparecem para ele imediatamente, e ele não é avisado por e-mail. Nada do que
              já está pedido é alterado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onGerar()}>Atualizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarEncerramento} onOpenChange={setConfirmarEncerramento}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar esta solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              O encerramento é definitivo — não há como reabrir. A lista fica só para
              consulta, e a gaveta do cliente passa a modo leitura: os arquivos continuam
              visíveis, mas ele não envia mais nada.
              {itensAtivos > 0 && ` São ${itensAtivos} documento(s) ainda ativos.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onEncerrar}>Encerrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
