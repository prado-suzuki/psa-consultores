import React from 'react';
import { Clock, FolderKanban, Sparkles, Target, Wallet } from 'lucide-react';
import { BoardStatStrip } from './BoardStatStrip';

interface BoardKpisNegocioProps {
  /**
   * `null` = NAO APURADO (a consulta de projetos falhou), nunca zero. Antes
   * era `number` e a tela desenhava "0 projetos ativos" com a consulta morta,
   * como se zero fosse a resposta -- o defeito que o Bloco D existiu para
   * matar e que voltou quando o card de aviso saiu da grade (21/08).
   */
  projetosAtivos: number | null;
  janelaExecucao: string;
  /**
   * `null` = NAO APURADO. Era documentado como "enquanto a consulta carrega",
   * e isso deixou de ser verdade: a faixa inteira fica atrás de um Skeleton
   * enquanto `kpisLoading` for verdadeiro, então, na hora em que este cartão
   * PINTA, `null` só pode significar que a consulta de horas não trouxe dado.
   * O rótulo diz isso -- antes mostrava "—" com o subtexto normal ("alocadas ·
   * últimos 30 dias"), que lia como "a janela não teve horas".
   */
  totalHoras: number | null;
  /** `null` = nao apurado. Sem base, o anel e a pill de meta nao aparecem. */
  pontualidade: number | null;
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

/** Meta de pontualidade — o mesmo limite que colore o anel e escreve a pill. */
const META_PONTUALIDADE = 85;

/**
 * A faixa de KPIs do Estratégico (reunião Mariana, 17/08) -- seis números para
 * a diretoria bater o olho e entender o negócio sem rolar a página.
 *
 * "Custo dos projetos" não tem card com número: não existe campo de custo em
 * `org_projects` nem tabela parecida (verificado, não é ausência de query).
 * Mostra "—" e o rótulo explica o motivo em vez de estimar.
 *
 * ── Por que a cor mudou ───────────────────────────────────────────────
 * Cada um dos seis cartões tinha uma matiz própria (índigo, ciano, âmbar,
 * roxo, cinza, verde) numa faixa de 3px no topo. Seis cores sem significado
 * nenhum — nada ligava "roxo" a "valor acumulado" — e era o que dava à tela a
 * cara de template. Agora:
 *
 * · o acento (teal da marca) pinta o que é MEDIDA (projetos, horas, valor, ROI);
 * · a cor de ESTADO só aparece onde há estado: a pontualidade é âmbar abaixo
 *   da meta e carmim quando cai abaixo de 70%;
 * · o cinza fica para o que não pode ser medido (custo).
 *
 * O cartão de VALOR é o `hero` (fundo tingido): numa tela de sócio, receita
 * contratada é o número que se olha primeiro, e a referência resolve isso com
 * tinta de fundo em vez de tamanho de fonte diferente.
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
  // Cinza é o token do que NAO PODE ser medido nesta faixa (é o do card de
  // custo). Pontualidade sem base entra nele, não na cor de estado: vermelho
  // diria "está ruim", e a verdade é "não sei".
  const corPontualidade = pontualidade === null
    ? 'var(--bd-ink3)'
    : pontualidade >= META_PONTUALIDADE
      ? 'var(--bd-go)'
      : pontualidade >= 70 ? 'var(--bd-warn)' : 'var(--bd-risk)';

  return (
    <BoardStatStrip
      cols={6}
      items={[
        {
          value: projetosAtivos ?? '—',
          label: 'Projetos ativos',
          color: projetosAtivos === null ? 'var(--bd-ink3)' : 'var(--bd-accent)',
          icon: FolderKanban,
          subText: projetosAtivos === null ? 'não apurado' : janelaExecucao,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
        {
          value: totalHoras ?? '—',
          suffix: totalHoras === null ? undefined : 'h',
          label: 'Total de horas',
          color: totalHoras === null ? 'var(--bd-ink3)' : 'var(--bd-accent)',
          icon: Clock,
          // `estimated_hours` de toda tarefa da janela, qualquer status -- é
          // alocação de trabalho, não horas já entregues.
          subText: totalHoras === null ? 'não apurado' : `alocadas · ${janelaExecucao}`,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
        {
          value: pontualidade ?? '—',
          suffix: pontualidade === null ? undefined : '%',
          label: 'Pontualidade de entrega',
          color: corPontualidade,
          // Proporção de um todo: é o caso de anel (ver `BoardRing`). O anel
          // substitui a barra de 3px que ficava no pé do cartão. Sem base, NEM
          // anel NEM pill: anel em 0% desenha um círculo vazio que se lê como
          // "nenhuma entrega saiu no prazo", e a pill diria "abaixo da meta"
          // sobre medida que não existe.
          // Medidor, sem número por dentro: o número grande do cartão já é este
          // valor. O "no prazo" desceu para o subtexto, que tem largura.
          ring: pontualidade === null ? undefined : {
            pct: pontualidade,
            title: `${pontualidade}% das entregas com prazo saíram no prazo · meta ${META_PONTUALIDADE}%`,
          },
          pill: pontualidade === null ? undefined : {
            text: pontualidade >= META_PONTUALIDADE ? 'Dentro da meta' : 'Abaixo da meta',
            variant: pontualidade >= META_PONTUALIDADE ? 'up' : 'down',
          },
          subText: pontualidade === null ? 'não apurado' : `no prazo · ${janelaExecucao}`,
          onClick: () => onNavigate('/equipe/board/performance'),
        },
        {
          value: brlMil(valorTotal), prefix: 'R$', suffix: 'k',
          label: 'Valor acumulado dos projetos', color: 'var(--bd-accent)',
          icon: Wallet,
          hero: true,
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
          value: '—', label: 'Custo dos projetos', color: 'var(--bd-ink3)',
          icon: Target,
          subText: 'sem campo de custo no backend',
        },
        {
          value: brlMil(roi.economiaAnual), prefix: 'R$', suffix: 'k',
          label: 'Expectativa de ROI', color: 'var(--bd-accent)',
          icon: Sparkles,
          pill: roi.roiPct !== null
            ? { text: `${Math.round(roi.roiPct)}% ROI`, variant: roi.roiPct >= 0 ? 'up' : 'down' }
            : { text: 'ROI em construção', variant: 'neutral' },
          subText: `acumulado · ${roi.melhorias} melhorias`,
        },
      ]}
    />
  );
};
