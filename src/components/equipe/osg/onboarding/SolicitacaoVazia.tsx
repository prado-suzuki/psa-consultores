import { FileStack, Loader2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingEmptyState } from './OnboardingEmptyState';

/**
 * O corpo da tela quando a solicitação está vazia e o cliente TEM OS da OSG.
 *
 * POR QUE EXISTE
 *
 * Com a lista vazia, o corpo mostrava o espaço de trabalho: "Adicionar
 * documento" e as quatro gavetas com a lista de opcionais, isto é, o catálogo
 * inteiro clicável. Todas as saídas grandes eram manuais, e a geração pela OS
 * ficava só no botão do cabeçalho. Em 04/08/2026 uma solicitação de 2 documentos
 * foi enviada a um cliente cujo produto contratado pede 46 — montada item a item
 * pelos opcionais, sem que a geração tivesse rodado uma vez.
 *
 * A SAÍDA É ÚNICA
 *
 * Montar o pedido à mão deixou de existir: a solicitação sempre nasce dos
 * produtos da OS. Ajustar a lista depois continua livre — incluir, dispensar e
 * editar item a item —, mas o cabeçalho não nasce mais sem OS, e é por isso que
 * `solicitacao.ordem_servico_id` volta a ter significado.
 *
 * Este componente não conta completude no envio: enviar uma lista curta segue
 * permitido e sem aviso. Ele age antes, quando a lista ainda está em zero — o
 * momento em que a escolha é feita.
 */
interface SolicitacaoVaziaProps {
  /**
   * Quantos documentos a geração traria agora. Só é conhecido com UMA OS — com
   * mais de uma o total depende de qual o consultor escolher, e aí vem zero.
   */
  documentosDaOs: number;
  /** Quantas OS da OSG o cliente tem. Mais de uma faz a tela não prometer número. */
  ordensServico: number;
  ocupado: boolean;
  onGerar: () => void;
}

export function SolicitacaoVazia({
  documentosDaOs,
  ordensServico,
  ocupado,
  onGerar,
}: SolicitacaoVaziaProps) {
  /**
   * Produto contratado sem vínculo de documento: a OS existe, mas não tem o que
   * dar. Convidar a gerar aqui seria convite falso — a geração devolveria zero —,
   * e como não há mais caminho à mão, o que a tela pode fazer é dizer onde se
   * resolve: no vínculo do produto, no cadastro.
   *
   * A guarda por `ordensServico === 1` é o que separa "não tem o que dar" de
   * "ainda não sei de qual OS": com várias, zero significa apenas que a escolha
   * não foi feita, e dizer que a OS está vazia seria mentira.
   */
  if (ordensServico === 1 && documentosDaOs === 0) {
    return (
      <OnboardingEmptyState icon={Unlink} title="A OS não tem documento vinculado">
        O cliente tem produto OSG contratado, mas nenhum documento está vinculado a
        esse produto no catálogo — gerar a partir da OS não traria nada. Vincule os
        documentos ao produto no cadastro e volte aqui para gerar a lista.
      </OnboardingEmptyState>
    );
  }

  return (
    <OnboardingEmptyState
      icon={FileStack}
      title="Esta solicitação está vazia"
      action={(
        /* Arrow e não `onClick={onGerar}`: passar o handler direto entrega o
           evento de clique como primeiro argumento, e quem recebe espera o id da
           OS. O evento ia para a RPC e estourava em "circular structure to JSON".
           O TypeScript não pega, porque uma função de argumento opcional é
           atribuível a `() => void`. */
        <Button size="sm" onClick={() => onGerar()} disabled={ocupado}>
          {ocupado
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <FileStack className="mr-2 h-4 w-4" />}
          {documentosDaOs === 0
            ? 'Gerar a lista a partir da OS'
            : documentosDaOs === 1
              ? 'Gerar o documento da OS'
              : `Gerar os ${documentosDaOs} documentos da OS`}
        </Button>
      )}
    >
      A lista sai da OS: o produto contratado é que define o que este cliente precisa
      entregar. Gere primeiro e ajuste depois — incluir, dispensar e editar continuam
      disponíveis a cada item.
    </OnboardingEmptyState>
  );
}
