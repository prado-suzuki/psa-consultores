// Botão que abre o aviso ao cliente sobre a situação dos documentos (aviso 2).
//
// DECISÃO DE 17/08/2026 (Bernardo e coordenação): os avisos de "documento pendente"
// e "documento recusado" foram FUNDIDOS num só, disparado à mão daqui. O motivo é o
// fluxo real de trabalho — o analista abre este checklist, confere o que chegou,
// vincula as entidades e recusa o que está errado, tudo na mesma sessão. Dois avisos
// automáticos sairiam do mesmo ato, um atrás do outro, e o texto do aviso 4 já pedia
// "um aviso por lote de conferência, não por documento" (10/08) sem definir o que
// fecha um lote. O clique fecha.
//
// Aqui só vive o botão e o estado de abertura. A conferência do que vai ser enviado,
// a escolha de canal e o histórico moram em `ModalAvisarCliente` — arquivo separado
// pelo teto de 600 linhas do AGENTS.md e para poder ser testado sem montar a tela.
import { useMemo, useState } from 'react';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { montarSituacaoDocumentos, temAlgoParaAvisar } from '@/lib/avisoSituacaoDocumentos';
import type { LinhaChecklist } from '@/lib/checklistDerivado';
import type { SolicitacaoStatus } from '@/lib/solicitacao';
import { ModalAvisarCliente } from './ModalAvisarCliente';

export interface BotaoAvisarClienteProps {
  clienteId: string;
  linhas: readonly LinhaChecklist[];
  solicitacao: { id: string; status: SolicitacaoStatus };
}

export function BotaoAvisarCliente({ clienteId, linhas, solicitacao }: BotaoAvisarClienteProps) {
  const [aberto, setAberto] = useState(false);

  const dados = useMemo(() => montarSituacaoDocumentos(linhas), [linhas]);
  const temAlgo = temAlgoParaAvisar(dados);
  const total = dados.pendentes.length + dados.recusados.length;

  // Rascunho não cobra: o cliente ainda não recebeu o pedido, então o que aparece
  // como pendente nunca foi pedido a ele.
  if (solicitacao.status === 'rascunho') return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setAberto(true)}
        disabled={!temAlgo}
        title={temAlgo
          ? undefined
          : 'Não há documento pendente nem a reenviar: nada a comunicar ao cliente.'}
      >
        <Send className="mr-2 h-4 w-4" />
        Avisar o cliente ({total})
      </Button>

      {/* Montado só quando abre: as duas consultas do modal (destinatários e
          histórico) não devem rodar em toda renderização do checklist. */}
      {aberto && (
        <ModalAvisarCliente
          aberto={aberto}
          onFechar={() => setAberto(false)}
          clienteId={clienteId}
          linhas={linhas}
          solicitacaoId={solicitacao.id}
        />
      )}
    </>
  );
}
