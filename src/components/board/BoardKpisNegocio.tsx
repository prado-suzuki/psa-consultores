import React from 'react';
import { BoardStatStrip } from './BoardStatStrip';

interface BoardKpisNegocioProps {
  projetosAtivos: number;
  janelaExecucao: string;
  /** `null` enquanto a consulta de horas ainda carrega. */
  totalHoras: number | null;
  pontualidade: number;
  /** Valor dos contratos/OS no período (COM data de início) -- em reais. */
  valorProjetos: number;
  /**
   * Valor das OS sem `data_inicio`, do MESMO período de recorte -- Bloco D/D3,
   * 21/08: ninguém decide sozinho excluir 37% do valor de uma tela de sócio.
   * Some ao card e aparece numa linha própria, visível, em vez de nota de
   * rodapé (opção C, decisão da usuária).
   */
  valorSemData: number;
  janelaValor: string;
  /** `null` só quando não há investimento cadastrado (ver `ratioRoi`). */
  roi: { economiaAnual: number; roiPct: number | null; melhorias: number };
  onNavigate: (rota: string) => void;
}

const brlMil = (v: number) => Math.round(v / 1000);

/**
 * A faixa de KPIs do Estratégico (reunião Mariana, 17/08) -- seis números para
 * a diretoria bater o olho e entender o negócio sem rolar a página.
 *
 * "Custo dos projetos" não tem card com número: não existe campo de custo em
 * `org_projects` nem tabela parecida (verificado, não é ausência de query).
 * Mostra "—" e o rótulo explica o motivo em vez de estimar.
 */
export const BoardKpisNegocio: React.FC<BoardKpisNegocioProps> = ({
  projetosAtivos,
  janelaExecucao,
  totalHoras,
  pontualidade,
  valorProjetos,
  valorSemData,
  janelaValor,
  roi,
  onNavigate,
}) => {
  const valorTotal = valorProjetos + valorSemData;
  return (
    <BoardStatStrip
      cols={6}
      items={[
        {
          value: projetosAtivos, label: 'Projetos ativos', color: 'var(--board-v4-accent)',
          subText: janelaExecucao,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
        {
          value: totalHoras !== null ? totalHoras : '—',
          suffix: totalHoras !== null ? 'h' : undefined,
          label: 'Total de horas', color: 'var(--board-v4-cyan)',
          // `estimated_hours` de toda tarefa da janela, qualquer status -- é
          // alocação de trabalho, não horas já entregues.
          subText: `alocadas · ${janelaExecucao}`,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
        {
          value: pontualidade, suffix: '%', label: 'Pontualidade de entrega',
          color: 'var(--board-v4-warn)',
          pill: {
            text: pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo da meta',
            variant: pontualidade >= 85 ? 'up' : 'down',
          },
          subText: janelaExecucao,
          barValue: pontualidade,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
        {
          value: brlMil(valorTotal), prefix: 'R$', suffix: 'k',
          label: 'Valor acumulado dos projetos', color: 'var(--board-v4-purple)',
          // Opção C do D3 (decisão da usuária, 21/08): o total NUNCA esconde
          // valor -- soma OS com e sem data de início. O que não tem data
          // fica visível na pill em vez de sumir em nota de rodapé.
          pill: valorSemData > 0
            ? { text: `R$${brlMil(valorSemData)}k sem data`, variant: 'neutral' }
            : undefined,
          subText: valorSemData > 0
            ? `${janelaValor} · R$${brlMil(valorProjetos)}k com data de início`
            : janelaValor,
          onClick: () => onNavigate('/equipe/board/dashboard-clientes-os'),
        },
        {
          value: '—', label: 'Custo dos projetos', color: 'var(--board-v4-ink3)',
          subText: 'sem campo de custo no backend',
        },
        {
          value: brlMil(roi.economiaAnual), prefix: 'R$', suffix: 'k',
          label: 'Expectativa de ROI', color: 'var(--board-v4-go)',
          pill: roi.roiPct !== null
            ? { text: `${Math.round(roi.roiPct)}% ROI`, variant: roi.roiPct >= 0 ? 'up' : 'down' }
            : { text: 'ROI em construção', variant: 'neutral' },
          subText: `acumulado · ${roi.melhorias} melhorias`,
        },
      ]}
    />
  );
};
