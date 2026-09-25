import { ListChecks, Send } from 'lucide-react';
import {
  dataComHora,
  dataCurta,
  type EstadoSolicitacao,
} from '@/lib/solicitacao';
import {
  estadoSolicitacaoColors,
  ROTULO_DO_ESTADO,
} from '@/lib/solicitacaoStatusColors';

/**
 * A faixa de estado da Solicitação de documentos.
 *
 * §1.4 do plano: os textos NÃO mudaram — são redação da Patrícia de 10/09/2026
 * e continuam em vigor palavra por palavra; o que mudou é onde moram. Saiam de
 * `Onboarding.tsx`, que estava inchando, e a faixa é a peça que o EX-22 pedia:
 * enviada e em checklist diziam, cada uma, em que ponto do ciclo a solicitação
 * está. Rascunho não tem faixa — o selo do cabeçalho é quem o nomeia (§1.7).
 *
 * `encerrada` não passa por aqui: ela é um componente próprio, o
 * `SolicitacaoEncerrada`, que carrega faixa, resumo e lista de consulta (§1.5).
 */
export function FaixaDeEstado({
  estado,
  enviadaEm,
}: {
  estado: EstadoSolicitacao | null;
  enviadaEm: string | null;
}) {
  if (estado === 'enviada') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-osg-200/70 bg-osg-50/60 p-4 text-sm text-osg-700">
        <Send className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss/70" />
        <p className="leading-relaxed">
          Solicitação <strong className="font-semibold">aberta desde{' '}
          {dataCurta(enviadaEm)}</strong>. O cliente já pode visualizar a
          lista e enviar os documentos. Novos documentos adicionados à solicitação
          também ficarão disponíveis no portal. A solicitação permanecerá aberta até
          ser finalizada.
        </p>
      </div>
    );
  }

  if (estado === 'em_checklist') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-osg-200/70 bg-osg-50/60 p-4 text-sm text-osg-700">
        <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss/70" />
        <p className="leading-relaxed">
          {/* "A solicitação permanecerá aberta até ser finalizada", e não
              "o pedido só fecha quando você encerrar". A Patrícia mandou
              trocar essa frase em 10/09/2026; ela existia em DUAS faixas e
              a primeira passagem só corrigiu a de "aberta desde". */}
          Esta solicitação está <strong className="font-semibold">em fase de
          checklist</strong>: a tela do cliente mostra o que falta, de quem é cada
          documento, e o envio dele já chega classificado. Novos documentos
          adicionados aqui também ficarão disponíveis no portal. A solicitação
          permanecerá aberta até ser finalizada.
        </p>
      </div>
    );
  }

  return null;
}

/**
 * O selo de estado ao lado do título do cabeçalho (§1.7).
 *
 * Sempre visível, para não depender de achar a faixa antes de rolar a página.
 * Cor e palavra saem do mapa (`solicitacaoStatusColors`), nunca de literal em
 * JSX; a data é acréscimo daqui, porque o mapa guarda só a palavra.
 *
 * O tooltip só existe nos dois estados que encerram, e diz QUANDO —
 * "Finalizada em DD/MM/AAAA às HHhMM". O plano pede "Finalizada por «nome»
 * também: a tabela `solicitacao` não tem FK para profiles, então o nome de
 * quem encerrou não vem junto da linha (nem `created_by` nem `updated_by` a
 * garantem sem consulta extra). Pendência registrada, não esquecida.
 */
export function SeloEstadoSolicitacao({
  estado,
  enviadaEm,
  encerradaEm,
}: {
  estado: EstadoSolicitacao | null;
  enviadaEm: string | null;
  encerradaEm: string | null;
}) {
  if (!estado) return null;

  // A data de cada rótulo é própria do estado — "Rascunho" e "Em checklist"
  // nunca levam, e não é a data que sobrar na props que decide.
  const dataDoEstado = estado === 'enviada'
    ? enviadaEm
    : estado === 'finalizada' || estado === 'cancelada'
      ? encerradaEm
      : null;
  const rotulo = dataDoEstado
    ? `${ROTULO_DO_ESTADO[estado]} em ${dataCurta(dataDoEstado)}`
    : ROTULO_DO_ESTADO[estado];
  const encerra = estado === 'finalizada' || estado === 'cancelada';

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoSolicitacaoColors[estado].pilula}`}
      title={encerra
        ? `${ROTULO_DO_ESTADO[estado]} em ${dataComHora(encerradaEm)}`
        : undefined}
    >
      {rotulo}
    </span>
  );
}
