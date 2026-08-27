import { useState } from 'react';
import { FileStack, ListChecks, Loader2, Lock, Plus, Send } from 'lucide-react';
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
 * rascunho     → Atualizar da OS · Enviar (só com item ativo) · Finalizar
 * enviada      → Atualizar da OS (com confirmação) · Passar para o checklist · Finalizar
 * em_checklist → Atualizar da OS (com confirmação) · Finalizar
 * encerrada    → Abrir nova solicitação
 *
 * A tela diz "Finalizar", decisão da Patricia em 27/08/2026, para casar com o
 * aviso interno. O STATUS no banco continua `encerrada`: e nome interno, ninguem
 * ve, e renomear enum custaria migracao sem mudar nada na tela.
 *
 * Nenhuma transição convive com "voltar atrás": existe uma solicitação não
 * encerrada por cliente, ela não retorna para rascunho, e encerrar é definitivo.
 * Por isso as três pedem confirmação, e a atualização também pede quando a lista
 * já está com o cliente, porque ali o documento novo aparece para ele na hora.
 */
interface SolicitacaoAcoesProps {
  status: SolicitacaoStatus | null;
  /** Há OS da OSG para gerar/atualizar a partir dela. */
  temOrigemNaOs: boolean;
  listaVazia: boolean;
  itensAtivos: number;
  /**
   * Arquivos do cliente ainda sem tipo de documento.
   *
   * Entra só no aviso da confirmação: enquanto eles não forem classificados, a
   * subtração não os vê, e o cliente cairia num checklist quase todo pendente com
   * documentos que já entregou.
   */
  arquivosSemTipo: number;
  ocupado: boolean;
  onGerar: () => void;
  onEnviar: () => void;
  onPassarParaChecklist: () => void;
  onEncerrar: () => void;
  onAbrirNova: () => void;
}

export function SolicitacaoAcoes({
  status,
  temOrigemNaOs,
  listaVazia,
  itensAtivos,
  arquivosSemTipo,
  ocupado,
  onGerar,
  onEnviar,
  onPassarParaChecklist,
  onEncerrar,
  onAbrirNova,
}: SolicitacaoAcoesProps) {
  const [confirmarAtualizacao, setConfirmarAtualizacao] = useState(false);
  const [confirmarChecklist, setConfirmarChecklist] = useState(false);
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
  // A lista já está com o cliente: atualizar a partir da OS aparece para ele na
  // hora, nos dois estados em que ele a vê.
  const comOCliente = enviada || status === 'em_checklist';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {temOrigemNaOs && (
        <Button
          size="sm"
          variant={listaVazia ? 'default' : 'outline'}
          onClick={() => (comOCliente ? setConfirmarAtualizacao(true) : onGerar())}
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

      {enviada && (
        <Button size="sm" onClick={() => setConfirmarChecklist(true)} disabled={ocupado}>
          <ListChecks className="mr-2 h-4 w-4" />
          Passar para o checklist
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
          Finalizar solicitação
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

      <AlertDialog open={confirmarChecklist} onOpenChange={setConfirmarChecklist}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Passar esta solicitação para o checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              A tela do cliente deixa de ser a gaveta de envio e passa a ser o checklist:
              ele vê o que falta, de quem é cada documento, e envia na própria linha, já
              classificado. Não há como voltar para a fase de gaveta.
              {arquivosSemTipo > 0 && (
                <>
                  {' '}
                  <strong className="font-semibold">
                    Atenção: {arquivosSemTipo} arquivo(s) dele ainda estão sem tipo de
                    documento.
                  </strong>{' '}
                  Enquanto não forem classificados no Cadastro por Documento, o checklist
                  vai cobrar coisa que já foi entregue.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onPassarParaChecklist}>
              Passar para o checklist
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmarEncerramento} onOpenChange={setConfirmarEncerramento}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar esta solicitação?</AlertDialogTitle>
            <AlertDialogDescription>
              A finalização é definitiva, não há como reabrir. A lista fica só para
              consulta, e a tela do cliente passa a modo leitura: os arquivos continuam
              visíveis, mas ele não envia mais nada, nem pela gaveta nem pelo checklist.
              {itensAtivos > 0 && ` São ${itensAtivos} documento(s) ainda ativos.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onEncerrar}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
