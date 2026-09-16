import { AlertTriangle } from 'lucide-react';
import {
  INICIO_CANAL_CHAMADOS,
  periodoLabels,
} from '@/lib/gestaoChamadosDashboardAnalytics';

interface DashboardRecorteAvisoProps {
  /** Quantos chamados o recorte de período deixou de fora. */
  foraDoPeriodo: number;
  /** O período ativo, para nomear o recorte na frase. */
  periodo: string;
}

/**
 * Aviso de que o painel e a lista contam coisas diferentes.
 *
 * O PAINEL abre em "Desde o início do canal" e a LISTA abre em "Todas as datas".
 * Medido em produção em 15/09/2026: 87 chamados dentro do canal contra 277
 * anteriores — o painel mostra 24% do que a lista mostra. Sem este aviso, abrir
 * as duas telas e comparar o total parece defeito.
 *
 * O RECORTE ESTÁ CERTO, e é por isso que o aviso explica em vez de sumir com ele:
 * os chamados anteriores a 01/04/2026 vieram importados do sistema legado com
 * assunto, cliente e data, mas SEM as mensagens — e portanto sem data de primeira
 * resposta. Medir prazo sobre eles não produz "atrasado", produz "sem resposta"
 * para tudo, e afunda qualquer indicador de SLA. Ver `INICIO_CANAL_CHAMADOS`.
 *
 * No molde do `AuditLimiteAviso`, que é o padrão que a revisão de conteúdo da
 * coordenação aponta como bom: só aparece quando o corte de fato aconteceu, diz
 * o que os números cobrem, e termina no que fazer a respeito.
 */
export const DashboardRecorteAviso = ({
  foraDoPeriodo,
  periodo,
}: DashboardRecorteAvisoProps) => {
  if (foraDoPeriodo <= 0) return null;

  const desdeOCanal = periodo === 'canal';
  const dataDoCanal = INICIO_CANAL_CHAMADOS.toLocaleDateString('pt-BR');

  return (
    <p className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong className="font-medium">A lista de chamados mostra mais que este painel.</strong>{' '}
        {desdeOCanal ? (
          <>
            Os indicadores cobrem apenas os chamados abertos a partir de {dataDoCanal}, quando o
            canal passou a ser atendido. Os {foraDoPeriodo.toLocaleString('pt-BR')} anteriores vieram
            importados do sistema legado, sem as mensagens — medir prazo sobre eles daria &ldquo;sem
            resposta&rdquo; para todos. A lista abre sem recorte de data e inclui esses também.
          </>
        ) : (
          <>
            Os indicadores cobrem apenas o período{' '}
            <strong className="font-medium">{periodoLabels[periodo] ?? periodo}</strong>, e{' '}
            {foraDoPeriodo.toLocaleString('pt-BR')} chamado(s) ficam de fora. A lista abre sem
            recorte de data.
          </>
        )}
      </span>
    </p>
  );
};
