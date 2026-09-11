// A segunda porta para a passagem ao checklist, na própria tela do checklist.
//
// POR QUE EXISTE. Enquanto a solicitação está em `enviada`, esta tela avisa que
// os documentos ainda não são classificados sozinhos e mandava o analista para
// outra tela executar o ato. Ler a instrução onde o problema aparece e ter de
// navegar para resolvê-lo é o atrito que este botão remove — mesmo ato, mesma
// confirmação, na tela em que a informação foi lida.
//
// O NOME MUDA E O ATO NÃO. Lá é "Passar para o checklist", daqui é "Trazer para
// o checklist": na tela da solicitação você empurra o pedido adiante, aqui você
// o traz para onde já está olhando. A confirmação acompanha o verbo de quem a
// abriu, para não haver duas palavras dentro da mesma interação.
//
// Em arquivo próprio, e não dentro de `ChecklistPendentes`: aquele arquivo está
// em 602 linhas, já acima do teto de 600 do AGENTS.md, e a regra é decompor
// antes de acrescentar lógica. É o mesmo desenho de `BotaoAvisarCliente` e
// `BotaoComprovante`, vizinhos nesta pasta.
import { useState } from 'react';
import { ListChecks, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useDomainSolicitacao } from '@/hooks/useDomainSolicitacao';
import type { SolicitacaoStatus } from '@/lib/solicitacao';
import { DialogoPassarParaChecklist } from '../onboarding/DialogoPassarParaChecklist';

export interface BotaoTrazerParaChecklistProps {
  clienteId: string;
  status: SolicitacaoStatus;
  /** Arquivos do cliente sem tipo de documento, para o aviso da confirmação. */
  arquivosSemTipo: number;
}

export function BotaoTrazerParaChecklist({
  clienteId, status, arquivosSemTipo,
}: BotaoTrazerParaChecklistProps) {
  const [confirmando, setConfirmando] = useState(false);
  const { passarParaChecklist } = useDomainSolicitacao(clienteId);

  // Só em `enviada`: é o único estado de onde a transição sai. Em rascunho o
  // cliente ainda não viu nada, e em `em_checklist` já aconteceu.
  //
  // Segunda linha de defesa, não a primeira: quem chama já condiciona a
  // montagem, porque o `useDomainSolicitacao` acima roda ANTES deste return e
  // consultaria a solicitação para desenhar um botão invisível.
  if (status !== 'enviada') return null;

  const trazer = async () => {
    await passarParaChecklist.mutateAsync();
    setConfirmando(false);
    toast.success('Agora o cliente vê o checklist, com upload por documento');
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setConfirmando(true)}
        disabled={passarParaChecklist.isPending}
        /* Terceira pessoa, e a segunda metade é a que evita chamado: quem clica
           esperando que os pendentes de agora se resolvam sozinhos não vai ver
           isso acontecer — a transição vale para o que vier DEPOIS dela. */
        title={'Passa a classificar automaticamente o que o cliente enviar: cada '
          + 'documento aparece ligado à pessoa ou ao imóvel a que pertence. Não '
          + 'reclassifica o que já foi recebido, e não há como voltar.'}
      >
        {passarParaChecklist.isPending
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <ListChecks className="mr-2 h-4 w-4" />}
        Trazer para o checklist
      </Button>

      <DialogoPassarParaChecklist
        aberto={confirmando}
        onOpenChange={setConfirmando}
        arquivosSemTipo={arquivosSemTipo}
        verbo="Trazer"
        onConfirmar={() => void trazer()}
      />
    </>
  );
}

export default BotaoTrazerParaChecklist;
