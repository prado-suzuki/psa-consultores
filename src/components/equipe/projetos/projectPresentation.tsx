import { Badge } from '@/components/ui/badge';
import { PROCESS_STAGES } from '@/components/equipe/projetos/constants';
import { projectStatusColors } from '@/lib/projetoStatusColors';

export const extractPriority = (description: string | null): string => {
  if (!description) return '-';
  const match = description.match(/Prioridade:\s*([^|]+)/);
  return match ? match[1].trim() : '-';
};

export const extractPhase = (description: string | null): string => {
  if (!description) return '-';
  const match = description.match(/Fase:\s*([^|]+)/);
  return match ? match[1].trim() : '-';
};

/**
 * A pílula de status do projeto, vestindo os papéis de `projectStatusColors`.
 *
 * ISTO ERA A ÚLTIMA CÓPIA VIVA de uma divergência que já estava denunciada por
 * escrito. O docstring do `sprintStatusColors` conta desde 10/09/2026 que
 * "completed" aparecia no azul de fábrica (tom 100 no fundo, 700 na letra) numa
 * tela e em verde na outra —
 * e esta função era a tela azul. Quem aprendesse a cor num lugar reaprendia no
 * outro, sobre a MESMA coluna `status`.
 *
 * "Arquivado" já tinha saído para `status-neutro` na rodada do cinza, e é por
 * isso que a escada estava meio crua: três degraus de fábrica ao lado de um
 * degrau em token, que o contrato diz ser pior que a escada crua inteira.
 *
 * ⚠️ O VOCABULÁRIO DAQUI DIVERGE DO MAPA, e a divergência fica escrita em vez de
 * ser escolhida por mim. `projectStatusColors` tem `on_hold` e `cancelled`;
 * estas quatro telas emitem `blocked` e `archived`. Os papéis abaixo são os que
 * o contrato dá a esses significados — `ajuste` para "deu problema", `neutro`
 * para "sem carga" —, mas unificar as CHAVES é migração de dado, não conversão
 * de cor. É a mesma decisão registrada no contrato para o par
 * `planned`/`planning`: o mapa carrega a cor e deixa o conflito escrito.
 */
export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className={projectStatusColors.active.badge}>Ativo</Badge>;
    case 'completed':
      return <Badge variant="outline" className={projectStatusColors.completed.badge}>Concluído</Badge>;
    case 'blocked':
      return <Badge variant="outline" className={projectStatusColors.cancelled.badge}>Bloqueado</Badge>;
    case 'archived':
      return <Badge variant="outline" className={projectStatusColors.planned.badge}>Arquivado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export const getPriorityBadge = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'crítica':
    case 'urgent':
    case 'high':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Alta</Badge>;
    case 'alta':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Alta</Badge>;
    case 'média':
    case 'medium':
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Média</Badge>;
    case 'baixa':
    case 'low':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Baixa</Badge>;
    default:
      return <Badge variant="outline">{priority}</Badge>;
  }
};

/**
 * A área do projeto, nos tons CATEGÓRICOS — não em papel de status.
 *
 * Área é *que coisa* o projeto é, não em que pé ele está: por isso `--tag-*`, e
 * não `--status-*`. Os quatro tons são os mesmos da paleta categórica de gráfico,
 * então a área lida aqui e a área lida numa barra passam a ter a mesma cor.
 *
 * O `Fixos` já tinha saído para o acento numa rodada anterior, e era o único dos
 * quatro em token — a escada meio crua que o contrato manda evitar. Ele entra na
 * fila junto com os outros três: acento é ÂNCORA, e âncora pinta o que é grande,
 * não etiqueta de categoria.
 *
 * DOIS DEFEITOS SAÍRAM JUNTO, e nenhum dos dois dava erro:
 *
 * · o `hover:${colorClass}` era **classe dinâmica**. O Tailwind lê o código-fonte
 *   procurando nomes literais, e um `hover:` montado por interpolação nunca entra
 *   no CSS — o hover simplesmente não existia, sem erro de build, de lint ou de
 *   tipo. É a mesma armadilha documentada no `categoriaClienteColors`;
 * · com `variant="outline"` some também o `hover:bg-primary/80` que a variante
 *   `default` do Badge traz de fábrica, e que o `className` NÃO neutraliza: `bg`
 *   e `hover:bg` são chaves diferentes para o tailwind-merge, então a pílula
 *   virava a âncora da área sob o cursor.
 */
export const getAreaBadge = (area: string) => {
  const colors: Record<string, string> = {
    Consultoria: 'bg-tag-c/15 text-tag-c border-tag-c/20',
    Fiscal: 'bg-tag-b/15 text-tag-b border-tag-b/20',
    Fixos: 'bg-tag-a/15 text-tag-a border-tag-a/20',
    'Fixos/Previdenciário': 'bg-tag-d/15 text-tag-d border-tag-d/20',
  };
  const colorClass =
    colors[area] || 'bg-status-neutro-soft text-status-neutro border-status-neutro/15';
  return <Badge variant="outline" className={colorClass}>{area}</Badge>;
};

export const getStageBadge = (stage: string) => {
  const stageConfig = PROCESS_STAGES.find((item) => item.value === stage);
  if (!stageConfig) return <Badge variant="outline">{stage}</Badge>;
  return <Badge className={stageConfig.color}>{stageConfig.label}</Badge>;
};
