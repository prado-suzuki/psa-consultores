import type { LucideIcon } from 'lucide-react';
import { Building2, Files, Landmark, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';

// Kit visual da Solicitação Inicial (Onboarding). Mesmo papel do formKit /
// quadroKit / gerarKit: concentra a superfície de card aprovada da área OSG
// (borda marrom-areia atenuada + sombra tonal), os micro-rótulos e a entrada em
// cascata, para a tela não voltar a divergir a cada edição.
// Só estilos e dados aqui — o componente fica em OnboardingEmptyState.tsx,
// para o fast refresh continuar funcionando.

/** Entrada padrão da área OSG, respeitando quem pediu menos movimento. */
export const riseCls = 'animate-osg-rise motion-reduce:animate-none';

/** Cascata dos cards de grupo: 0, 60, 120, 180ms. */
export const riseDelay = (index: number) => ({ animationDelay: `${index * 60}ms` });

/** Container de moldura (rail, painel de trabalho). */
export const railContainerCls =
  'rounded-2xl border border-osg-200/70 bg-white/70 shadow-[0_8px_24px_-20px_hsl(var(--osg-700)/0.28)]';

export const panelContainerCls =
  'rounded-2xl border border-osg-200/70 bg-osg-50/40 shadow-[0_8px_24px_-20px_hsl(var(--osg-700)/0.28)]';

/** Card de grupo: superfície branca sobre a moldura, com a sombra tonal OSG. */
export const groupCardCls =
  'overflow-hidden rounded-xl border border-osg-300/60 bg-white/75 shadow-[0_8px_24px_-22px_hsl(var(--osg-700)/0.35)]';

/** Micro-rótulo OSG (mesma assinatura do formKit/quadroKit). */
export const microLabelCls = 'text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700';
export const microLabelMutedCls = 'text-[11px] font-bold uppercase tracking-[0.14em] text-osg-500/70';

/** Tile do ícone de grupo, igual ao da tela de checklist. */
export const iconTileCls =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-osg-50 text-osg-moss';

/** Linha de documento: o hover cobre título e ações, unindo a linha inteira. */
export const documentRowCls =
  'group flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-osg-50/60';

/**
 * Ações que só aparecem no hover (padrão da área — TitularidadesPanel,
 * BibliotecaModelos), com focus-within para quem navega por teclado.
 */
export const rowActionsCls =
  'flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100';

/**
 * Item do rail. `destacado` liga a elevação de card da área OSG; os itens
 * compactos da lista de produtos ficam sem o translate para a lista não pular
 * quando o cliente tem muitos produtos.
 */
export const railItemCls = (ativo: boolean, destacado = false) => cn(
  'w-full rounded-xl border p-2.5 text-left transition-all duration-200',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss/40',
  destacado && 'hover:-translate-y-1',
  ativo
    ? 'border-osg-moss/40 bg-osg-moss/[0.07]'
    : 'border-transparent hover:border-osg-moss/40 hover:bg-osg-50/70',
);

/** Contador em pílula usado no rail e nas seções. */
export const counterPillCls =
  'shrink-0 rounded-full bg-white px-1.5 text-[11px] font-medium text-osg-500 ring-1 ring-osg-200/70';

/**
 * Ícone de cada gaveta, chaveado pelo enum do banco (`osg_doc_grupo`).
 *
 * `Record<GrupoDocumentoKey, …>` é proposital: se um grupo entrar ou sair do
 * vocabulário, o typecheck quebra aqui até alguém escolher o ícone.
 */
export const GROUP_ICONS: Record<GrupoDocumentoKey, LucideIcon> = {
  pf: User,
  pj: Building2,
  bens_imoveis: Landmark,
  outros: Files,
};
