import React from 'react';
import { BoardStatStrip } from './BoardStatStrip';
import type { ReceitaAno, ReceitaEmRisco } from '@/lib/boardEstrategico';

interface BoardKpisNegocioProps {
  receita: ReceitaAno;
  /** Rótulo da janela de receita (ex.: "2026 até agosto"). */
  janelaReceita: string;
  /** `null` quando não há OS em andamento — indefinido, não zero. */
  ticketMedio: number | null;
  osAtivas: number;
  emRisco: ReceitaEmRisco;
  carteira: { ativos: number; fixos: number };
  execucao: { pontualidade: number; projetos: number; janela: string };
  onNavigate: (rota: string) => void;
}

const brlMil = (v: number) => Math.round(v / 1000);

/**
 * A faixa de KPIs do Estratégico — cinco números de sócio.
 *
 * Quatro medem o NEGÓCIO (receita, ticket, carteira, receita a resolver) e o
 * quinto ancora a ENTREGA. A versão anterior desta tela tinha o inverso: quatro
 * de cinco mediam execução interna e RH, e o sócio abria o painel principal da
 * empresa sem ver um real.
 *
 * Cada tile leva a janela dele no `subText` — as duas convivem na tela e um
 * número sem janela mente por omissão.
 */
export const BoardKpisNegocio: React.FC<BoardKpisNegocioProps> = ({
  receita,
  janelaReceita,
  ticketMedio,
  osAtivas,
  emRisco,
  carteira,
  execucao,
  onNavigate,
}) => {
  // O ano vem dos meses que a conta usou, não do rótulo — o rótulo é texto de
  // tela e pode mudar sem que o cálculo mude.
  const anoAnterior = receita.meses[0] ? Number(receita.meses[0].slice(0, 4)) - 1 : null;
  const receitaEmJogo = emRisco.vencido.valor + emRisco.renovacao.valor;

  return (
    <BoardStatStrip
      cols={5}
      items={[
        {
          value: brlMil(receita.atual), prefix: 'R$', suffix: 'k',
          label: 'Receita contratada', color: 'var(--board-v4-accent)',
          // Sem base no ano anterior não existe variação — dizemos isso em vez
          // de mostrar um percentual inventado.
          pill: receita.variacao !== null
            ? {
              text: `${receita.variacao > 0 ? '+' : ''}${(receita.variacao * 100).toFixed(1)}%${anoAnterior !== null ? ` vs ${anoAnterior}` : ''}`,
              variant: receita.variacao >= 0 ? 'up' : 'down',
            }
            : { text: 'sem base anterior', variant: 'neutral' },
          subText: janelaReceita,
          onClick: () => onNavigate('/equipe/board/dashboard-clientes-os'),
        },
        {
          value: ticketMedio !== null ? brlMil(ticketMedio) : '—',
          prefix: ticketMedio !== null ? 'R$' : undefined,
          suffix: ticketMedio !== null ? 'k' : undefined,
          label: 'Ticket médio', color: 'var(--board-v4-cyan)',
          subText: `por OS em andamento · ${osAtivas} ativas`,
          onClick: () => onNavigate('/equipe/board/dashboard-clientes-os'),
        },
        {
          value: carteira.ativos, label: 'Clientes ativos', color: 'var(--board-v4-purple)',
          dots: [
            { color: 'var(--board-v4-go)', text: `${carteira.fixos} fixos` },
            { color: 'var(--board-v4-ink4)', text: `${carteira.ativos - carteira.fixos} pontuais/outros` },
          ],
          onClick: () => onNavigate('/equipe/board/clientes'),
        },
        {
          value: brlMil(receitaEmJogo), prefix: 'R$', suffix: 'k',
          label: 'Receita a resolver',
          color: receitaEmJogo > 0 ? 'var(--board-v4-risk)' : 'var(--board-v4-go)',
          pill: emRisco.vencido.qtd > 0
            ? { text: `${emRisco.vencido.qtd} vencido${emRisco.vencido.qtd === 1 ? '' : 's'}`, variant: 'down' }
            : { text: 'nada vencido', variant: 'up' },
          subText: `${emRisco.renovacao.qtd} em renovação nos próximos 30 dias`,
          onClick: () => onNavigate('/equipe/board/dashboard-clientes-os'),
        },
        {
          value: execucao.pontualidade, suffix: '%', label: 'Pontualidade de entrega',
          color: 'var(--board-v4-warn)',
          pill: {
            text: execucao.pontualidade >= 85 ? 'Dentro da meta' : 'Abaixo da meta',
            variant: execucao.pontualidade >= 85 ? 'up' : 'down',
          },
          subText: `${execucao.projetos} projetos · ${execucao.janela}`,
          barValue: execucao.pontualidade,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
      ]}
    />
  );
};
