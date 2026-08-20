// Botão que emite o comprovante de recebimento da solicitação (EDU-7).
//
// Vive em arquivo próprio por duas razões. A primeira é o teto de 600 linhas do
// AGENTS.md: `ChecklistPendentes.tsx` já passava dele antes desta tarefa, e a
// regra é decompor antes de acrescentar lógica. A segunda é que assim o botão
// pode ser testado sem montar a tela inteira do checklist.
//
// POR QUE AQUI, e não no cabeçalho da página de Documentos do Cliente como o
// enunciado da tarefa dizia: o comprovante é POR SOLICITAÇÃO (decisão de
// 17/08/2026), e aquela página só conhece o cliente. A tela do checklist é a
// única da equipe que tem a solicitação em contexto.
import { useMemo, useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useDocumentosByCliente, useUploaderNames } from '@/hooks/useDocumentoArquivo';
import type { SolicitacaoStatus } from '@/lib/solicitacao';

export interface BotaoComprovanteProps {
  clienteId: string;
  clienteNome: string;
  solicitacao: {
    id: string;
    status: SolicitacaoStatus;
    enviadaEm: string | null;
    encerradaEm: string | null;
  };
}

export function BotaoComprovante({ clienteId, clienteNome, solicitacao }: BotaoComprovanteProps) {
  // Mesma chave de consulta que a árvore de documentos usa, então o cache serve
  // e não há segunda requisição.
  const { data: documentosDoCliente = [] } = useDocumentosByCliente(clienteId);

  const documentos = useMemo(
    () => documentosDoCliente.filter((doc) => doc.solicitacao_id === solicitacao.id),
    [documentosDoCliente, solicitacao.id],
  );

  const { data: nomesPorUsuario = {} } = useUploaderNames(
    documentos.map((doc) => doc.created_by).filter((id): id is string => !!id),
  );

  const [emitindo, setEmitindo] = useState(false);

  // Rascunho não emite: o cliente ainda não recebeu o pedido, então não há
  // recebimento para comprovar.
  if (solicitacao.status === 'rascunho') return null;

  const emitir = async () => {
    setEmitindo(true);
    try {
      // Importação DINÂMICA, e não é micro-otimização: o módulo de geradores puxa
      // o React-PDF e mais seis módulos, e hoje só entra pela rota do mapeamento.
      // Estático, ele viria para o pacote da OSG inteiro.
      const { generateComprovanteRecebimento } = await import('@/utils/pdf/generators');
      await generateComprovanteRecebimento({
        clienteNome,
        documentos,
        nomesPorUsuario,
        // A data nasce aqui, no clique, e nunca dentro do modelo puro.
        emitidoEm: new Date(),
        solicitacao: { enviadaEm: solicitacao.enviadaEm, encerradaEm: solicitacao.encerradaEm },
      });
    } catch (erro) {
      console.error('Falha ao emitir o comprovante de recebimento', erro);
      toast.error('Não foi possível gerar o comprovante. Tente de novo.');
    } finally {
      setEmitindo(false);
    }
  };

  return (
    <div className="flex justify-end">
      <Button variant="outline" onClick={emitir} disabled={emitindo}>
        {emitindo
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <FileDown className="mr-2 h-4 w-4" />}
        Comprovante de recebimento
        {documentos.length > 0 && ` (${documentos.length})`}
      </Button>
    </div>
  );
}

export default BotaoComprovante;
