import { Building2, Globe, Lock } from 'lucide-react';
import type { DashboardFilterType } from '@/hooks/useDashboards';

/**
 * A identidade visual do `dashboards.filter_type` — rótulo, ícone e classes.
 *
 * ## Por que existe: era o mesmo mapa em dois arquivos, e já divergia
 *
 * `acessos/DashboardsTab` e `dashboards/DashboardOverviewDialog` pintavam o
 * MESMO `filter_type` com dois mapas próprios, e três coisas já tinham se
 * separado quando isto foi medido, em 11/09/2026:
 *
 * - a superfície do `cliente`: `bg-indigo-500/10` num, `bg-indigo-50` no outro;
 * - a letra do `cliente`: `text-indigo-600` num, `text-indigo-700` no outro;
 * - o `nenhum` do selo de tipo: `bg-foreground/[0.05]` num, `bg-muted` no outro.
 *
 * O terceiro tinha resposta pronta: **`bg-muted`**, porque preto com alfa
 * dessatura e o token é quem acompanha a área — é a mesma decisão que tirou os
 * `bg-black/[x]` do produto.
 *
 * ## A cor do `cliente` deixou de ser indigo cru
 *
 * Indigo não está no `tailwind.config.ts` e não acompanha tema nenhum: eram 11
 * ocorrências cruas nos dois arquivos, todas dizendo a mesma coisa. Foram para
 * **`--tag-c`**, que é o frio roxo da casa, e o par `tag-c` sobre `tag-c/10` dá
 * **5,69:1** — acima dos 4,5:1 que o AA pede para texto normal.
 *
 * `--tag-*` e não papel de status porque **`filter_type` não é estado**: é
 * categoria de acesso, e não tem transição nem pede ação. E purple está livre —
 * nenhum dos oito papéis de status do contrato usa essa faixa de matiz.
 *
 * ## O que cada variante diz
 *
 * `nenhum` é INTERNO: dashboard sem RLS, restrito à equipe — cadeado, neutro.
 * `cluster` e `cliente` são EXTERNOS, e é essa a distinção com consequência:
 * alguém de fora vê o relatório. O `cluster` fica na âncora da área (globo) e o
 * `cliente` no frio da casa (prédio), porque é o recorte mais estreito e o que
 * mais aparece nas telas de acesso.
 *
 * ⚠️ **Opacidade do Tailwind só aceita passo de 5.** `/12` não gera classe
 * nenhuma e a declaração some da build **sem erro** — foi o que quase deixou a
 * pílula de "fora da PSA" sem fundo no `ui/PapelBadge`.
 */
export interface DashboardFilterConfig {
  key: DashboardFilterType;
  /** Rótulo do filtro em si: "Por cluster", "Por cliente", "Sem filtro". */
  label: string;
  /** Ícone da variante: cadeado (interno), globo (cluster), prédio (cliente). */
  icon: typeof Globe;
  /** `bg` do disco atrás do ícone. */
  disc: string;
  /** `text` do ícone dentro do disco. */
  iconColor: string;
  /** `border + bg + text` da pílula do filtro e dos selos de cliente/cluster. */
  badge: string;
}

export const dashboardFilterColors: Record<DashboardFilterType, DashboardFilterConfig> = {
  nenhum: {
    key: 'nenhum',
    label: 'Sem filtro',
    icon: Lock,
    disc: 'bg-muted',
    iconColor: 'text-muted-foreground',
    badge: 'border-border bg-muted text-muted-foreground',
  },
  cluster: {
    key: 'cluster',
    label: 'Por cluster',
    icon: Globe,
    disc: 'bg-primary/10',
    iconColor: 'text-primary',
    badge: 'border-primary/15 bg-accent/5 text-primary',
  },
  cliente: {
    key: 'cliente',
    label: 'Por cliente',
    icon: Building2,
    disc: 'bg-tag-c/10',
    iconColor: 'text-tag-c',
    badge: 'border-tag-c/30 bg-tag-c/10 text-tag-c',
  },
};

/**
 * A config de um valor que veio do banco, com fallback — `filter_type` é `text`
 * livre na tabela, então valor fora da lista não pode quebrar o render.
 */
export const dashboardFilterConfig = (
  valor: string | null | undefined,
): DashboardFilterConfig =>
  dashboardFilterColors[valor as DashboardFilterType] ?? dashboardFilterColors.nenhum;

/**
 * "Tipo" é DERIVADO do filtro, e não uma coluna: `nenhum` é interno (sem RLS),
 * `cluster` e `cliente` são externos. Estava escrito nos dois arquivos.
 */
export const tipoDoFiltro = (ft: DashboardFilterType) =>
  ft === 'nenhum' ? 'Interno' : 'Externo';

/** Selo do tipo derivado. O externo usa a âncora; o interno, o neutro da área. */
export const tipoDoFiltroBadge = (ft: DashboardFilterType) =>
  ft === 'nenhum'
    ? 'border-border bg-muted text-muted-foreground'
    : 'border-primary/30 bg-primary/10 text-primary';
