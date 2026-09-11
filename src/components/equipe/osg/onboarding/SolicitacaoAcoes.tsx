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
 *
 * DUAS das confirmações são `AlertDialog` daqui; as outras duas ações — enviar e
 * finalizar — abrem modal próprio na página, porque além de confirmar elas
 * escolhem quem recebe a notificação. Este componente só avisa que o botão foi
 * clicado (`onEnviar`, `onEncerrar`).
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
          /* A primeira frase é a da Patrícia (10/09/2026). A segunda diz o que a
             ação NÃO faz, e é a parte que evita chamado: quem dispensou um
             documento e clica aqui esperando recuperá-lo não recupera — a RPC é
             idempotente e nunca desfaz dispensa. */
          title={listaVazia
            ? 'Cria a lista de documentos a partir dos produtos contratados na OS.'
            : 'Verifica se novos produtos foram incluídos na OS e adiciona os documentos '
              + 'necessários à solicitação. Não remove nada, e documento dispensado não volta.'}
        >
          {ocupado
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <FileStack className="mr-2 h-4 w-4" />}
          {listaVazia ? 'Gerar lista a partir da OS' : 'Atualizar documentos da OS'}
        </Button>
      )}

      {status === 'rascunho' && (
        <Button
          size="sm"
          onClick={onEnviar}
          disabled={ocupado || itensAtivos === 0}
          /* Abre o modal, não envia. E diz que é uma vez só: o botão some
             depois, porque só existe em rascunho, e quem não sabe disso fica
             procurando um segundo "Enviar" para cobrar o que faltou. */
          title={'Abre a escolha de destinatários e canais. O envio acontece uma vez: '
            + 'depois dele, cobrar o que faltar é pelo checklist.'}
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar solicitação
        </Button>
      )}

      {enviada && (
        <Button
          size="sm"
          onClick={() => setConfirmarChecklist(true)}
          disabled={ocupado}
          title={'Passa a classificar automaticamente o que o cliente enviar: cada '
            + 'documento aparece ligado à pessoa ou ao imóvel a que pertence. Não há '
            + 'como voltar.'}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Passar para o checklist
        </Button>
      )}

      {status && (
        <Button
          size="sm"
          variant="outline"
          onClick={onEncerrar}
          disabled={ocupado}
          /* Abre o modal, não finaliza. Desde 11/09/2026 a confirmação deixou de
             ser um `AlertDialog` daqui e virou `ModalFinalizarSolicitacao`, que
             além de confirmar escolhe quem recebe o aviso de conferência. */
          title={'Abre a confirmação de encerramento e a escolha de quem é avisado. '
            + 'Finalizar é definitivo: não há como reabrir.'}
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
              {/* Sem "gaveta": a coordenação tirou o termo da tela do checklist
                  em 11/09/2026 e ele vivia em mais três textos, estes. É nome
                  interno da fase — quem lê fora do time não sabe o que é. */}
              A partir daqui, cada documento que o cliente enviar já chega classificado:
              a tela dele passa a mostrar o que falta, de quem é cada documento, e o
              envio acontece na própria linha. Não há como voltar atrás.
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

    </div>
  );
}
