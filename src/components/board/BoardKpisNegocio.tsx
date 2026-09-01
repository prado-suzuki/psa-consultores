import React from 'react';
import { Coins, FolderKanban, Gauge, Scale, Sparkles } from 'lucide-react';
import { BoardStatStrip } from './BoardStatStrip';
import type { CapacidadeMelhorias, MixProjetosAtivos, ReceitaDiretoria } from '@/lib/boardDiretoria';

interface BoardKpisNegocioProps {
  /**
   * `null` = NÃO APURADO (a consulta de projetos falhou), nunca zero. Antes
   * era `number` e a tela desenhava "0 projetos ativos" com a consulta morta,
   * como se zero fosse a resposta.
   */
  mix: MixProjetosAtivos | null;
  receita: ReceitaDiretoria;
  capacidade: CapacidadeMelhorias;
  /** `null` só quando não há investimento cadastrado (ver `ratioRoi`). */
  roiPct: number | null;
  janelaExecucao: string;
  janelaValor: string;
  /** Abre/fecha o detalhamento do MIX logo abaixo da faixa. */
  onAbrirMix: () => void;
  onNavigate: (rota: string) => void;
}

const brlMil = (v: number) => Math.round(v / 1000);
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesAno = (ym: string) => `${MES_CURTO[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;

/**
 * A faixa de KPIs do Estratégico na leitura de DIRETORIA (28/08, Mariana +
 * Patricia). Não é restyling da faixa anterior: é outra pergunta.
 *
 * SAÍRAM, porque são operação e ninguém decide olhando para eles nesta tela:
 * "Total de horas" e "Pontualidade de entrega". Atraso só vira assunto de
 * diretoria quando vira dinheiro parado — e nesse caso ele já aparece na faixa
 * de decisão do agente ("R$ X em contrato a resolver"), não aqui.
 *
 * SAIU TAMBÉM o faturamento total ("R$ 435k"): com o cadastro de OS incompleto
 * (a API do João ainda não entregou), somar tudo produz um número que a
 * diretoria chama de errado — e ela tem razão. No lugar entram ticket médio,
 * quantidade que gera caixa e ATÉ QUANDO gera.
 *
 * O que cada cartão passou a responder:
 *  1. Projetos ativos — subiu ou desceu contra a janela anterior? E é cliente
 *     novo, aditivo, ou entrega já paga? (clique abre o mix)
 *  2. Ticket médio — quanto vale um projeto e até quando o contratado paga.
 *  3. Receita × folha — a operação cobre a folha? Hoje "—": não existe custo
 *     de folha no cadastro, e inventá-lo seria pior que a lacuna.
 *  4. Capacidade liberada — horas devolvidas pelas melhorias viram FTE (176h).
 *  5. Economia das melhorias — o valor anual, com o ROI quando há investimento.
 */
export const BoardKpisNegocio: React.FC<BoardKpisNegocioProps> = ({
  mix,
  receita,
  capacidade,
  roiPct,
  janelaExecucao,
  janelaValor,
  onAbrirMix,
  onNavigate,
}) => {
  const variacao = mix?.variacaoPct ?? null;
  const fte = capacidade.fteLiberado;

  return (
    <BoardStatStrip
      cols={5}
      items={[
        {
          value: mix ? mix.ativos : '—',
          label: 'Projetos ativos',
          color: mix ? 'var(--bd-accent)' : 'var(--bd-ink3)',
          icon: FolderKanban,
          // A variação compara INICIADOS na janela com a janela anterior de
          // mesmo tamanho — comparar "ativos hoje" com nada seria pill decorativa.
          pill: variacao === null ? undefined : {
            text: `${variacao >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(variacao))}% vs período anterior`,
            variant: variacao >= 0 ? 'up' : 'down',
          },
          subText: mix
            ? `${mix.iniciadosJanela} iniciados · ${janelaExecucao} · clique para ver o mix`
            : 'não apurado',
          onClick: mix ? onAbrirMix : undefined,
        },
        {
          value: receita.ticketMedio === null ? '—' : brlMil(receita.ticketMedio),
          prefix: receita.ticketMedio === null ? undefined : 'R$',
          suffix: receita.ticketMedio === null ? undefined : 'k',
          label: 'Ticket médio por OS',
          color: receita.ticketMedio === null ? 'var(--bd-ink3)' : 'var(--bd-accent)',
          icon: Coins,
          hero: true,
          pill: receita.projetosGerandoCaixa > 0
            ? { text: `${receita.projetosGerandoCaixa} gerando caixa`, variant: 'neutral' }
            : undefined,
          subText: receita.ticketMedio === null
            ? 'nenhuma OS com valor lançado no recorte'
            : receita.horizonteCaixa
              ? `${janelaValor} · contratado até ${mesAno(receita.horizonteCaixa)}`
              : `${janelaValor} · sem data de fim nas OS vigentes`,
          onClick: () => onNavigate('/equipe/board/dashboard-clientes-os'),
        },
        {
          // Não existe custo de folha no banco. O cartão fica, porque a
          // pergunta ("a operação cobre a folha?") é da diretoria — some o
          // número, não a pergunta.
          value: '—',
          label: 'Receita provisionada vs folha',
          color: 'var(--bd-ink3)',
          icon: Scale,
          subText: 'sem campo de folha no cadastro',
        },
        {
          value: fte === null ? '—' : Number(fte.toFixed(1)),
          suffix: fte === null ? undefined : ' FTE',
          animateCount: false,
          label: 'Capacidade liberada pelas ferramentas',
          color: fte === null ? 'var(--bd-ink3)' : 'var(--bd-accent)',
          icon: Gauge,
          pill: capacidade.horasReduzidasMes === null ? undefined : {
            text: `${Math.round(capacidade.horasReduzidasMes)}h/mês`,
            variant: 'neutral',
          },
          subText: capacidade.horasReduzidasMes === null
            ? 'nenhuma melhoria com horas medidas'
            : 'interna × cliente ainda não separada no cadastro',
          onClick: () => onNavigate('/equipe/board/impacto'),
        },
        {
          value: brlMil(capacidade.economiaAnual), prefix: 'R$', suffix: 'k',
          label: 'Economia anual das melhorias',
          color: 'var(--bd-accent)',
          icon: Sparkles,
          pill: roiPct !== null
            ? { text: `${Math.round(roiPct)}% ROI`, variant: roiPct >= 0 ? 'up' : 'down' }
            : { text: 'sem investimento lançado', variant: 'neutral' },
          subText: `${capacidade.melhorias} melhorias avaliadas`,
          onClick: () => onNavigate('/equipe/board/impacto'),
        },
      ]}
    />
  );
};
