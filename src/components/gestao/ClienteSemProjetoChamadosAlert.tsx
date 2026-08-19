import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProjetoCanalChamados } from '@/hooks/useProjetoCanalChamados';

export interface ClienteSemProjetoChamadosAlertProps {
  /** Cliente do último chamado delegado. Nulo = nada a conferir, nada a dizer. */
  clienteId: string | null | undefined;
  /** Nome do cliente, para o aviso apontar quem é sem obrigar a abrir o chamado. */
  clienteNome?: string | null;
}

/**
 * Torna visível a borda silenciosa da delegação: o chamado foi delegado, o
 * trigger `delegar_chamado_gera_tarefa` (EDU-11) não achou projeto de canal de
 * chamados para o cliente e, de propósito, NÃO bloqueou a delegação — apenas
 * gravou um `RAISE WARNING` no log do servidor. Sem este aviso a operação parece
 * ter dado certo e ninguém descobre que a tarefa não nasceu.
 *
 * Vive em arquivo próprio, e não embutido na página, porque
 * `GestaoChamados.tsx` já passa do teto de 600 linhas do `AGENTS.md`.
 */
export function ClienteSemProjetoChamadosAlert({
  clienteId,
  clienteNome,
}: ClienteSemProjetoChamadosAlertProps) {
  const { data: projetoId, isLoading, error } = useProjetoCanalChamados(clienteId);

  if (!clienteId || isLoading) return null;

  const nome = clienteNome?.trim() || 'O cliente deste chamado';

  // Falha de consulta não pode virar "cliente sem projeto": são coisas
  // diferentes e a segunda é uma afirmação que não temos como fazer.
  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível conferir o projeto de chamados</AlertTitle>
        <AlertDescription>
          A delegação foi salva, mas a consulta do projeto de canal de chamados de{' '}
          <strong>{nome}</strong> falhou — então não há como afirmar se a tarefa foi criada.
          Recarregue a página; se continuar, avise a Gestão. ({error.message})
        </AlertDescription>
      </Alert>
    );
  }

  if (projetoId) return null;

  return (
    <Alert className="mb-6 border-warning/50 [&>svg]:text-warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        <strong>{nome}</strong> não tem projeto de canal de chamados
      </AlertTitle>
      <AlertDescription>
        O chamado foi delegado, mas nenhuma tarefa foi criada: a tarefa nasce no projeto de
        canal de chamados do cliente, e este cliente não tem um. Cadastre o projeto — e
        confirme que o produto dele está marcado como canal de chamados — e depois reatribua o
        chamado (troque o responsável, ou remova e atribua de novo) para a tarefa nascer.
      </AlertDescription>
    </Alert>
  );
}
