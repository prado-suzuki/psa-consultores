/**
 * Estados visuais de uma linha de lista densa — repouso, seleção múltipla e
 * vínculo/atividade — em classes semânticas combináveis.
 *
 * Extraído de `osg/documentos/classificar/BaldePanel.tsx`, que era o único
 * lugar do repositório onde "marcado" e "aberto" não colidiam visualmente. Lá
 * os dois estados já eram distintos; aqui eles ganham nome, viram vocabulário e
 * passam a valer para qualquer tela.
 *
 * A regra que faz o padrão funcionar:
 *
 *   SELEÇÃO MÚLTIPLA É NEUTRA. O acento (`primary`) fica reservado ao vínculo.
 *   Marcar cinco linhas não pode acender a lista inteira com a cor da área —
 *   quando tudo é acento, o item que de fato está ativo some. Foi o que o
 *   levantamento do design system encontrou espalhado: `bg-primary/5`,
 *   `bg-teal-50` e `bg-teal-100/60` usados indistintamente para "selecionado" e
 *   para "ativo", em telas diferentes.
 *
 * E a regra que o torna acessível: nenhum dos dois estados se apoia SÓ na cor.
 * Seleção traz caixa marcada, fundo e barra à esquerda; vínculo traz borda,
 * ícone invertido, rótulo textual e `aria-current`. Quem não distingue o acento
 * do cinza continua lendo a lista — foi por isso que o BaldePanel foi escolhido
 * como origem, e é o que estas funções preservam.
 *
 * As funções cuidam só do ESTADO: fundo, borda, peso e inversão. Tamanho de
 * fonte, truncamento e espaçamento continuam no ponto de uso, porque variam por
 * tela e não têm nada a ver com estar selecionado.
 */
import { cn } from '@/lib/utils';

export interface ListRowState {
  /** Marcado na seleção múltipla (a caixa de seleção). Tratamento NEUTRO. */
  selecionado?: boolean;
  /** Vinculado / ativo / aberto no detalhe. É o único que usa o acento. */
  vinculado?: boolean;
  /** Linha inerte (salvando, sem permissão). Perde o hover. */
  desabilitado?: boolean;
}

/**
 * Classes do contêiner da linha.
 *
 * `border-l-2` vem sempre, inclusive em repouso, e em repouso na mesma cor do
 * resto da borda: alternar a espessura junto com o estado deslocaria o conteúdo
 * em 1px a cada clique, e a lista inteira tremeria durante uma seleção múltipla.
 * O que muda com o estado é a COR da borda, não a caixa.
 */
export function listRowClasses(estado: ListRowState = {}): string {
  const { selecionado, vinculado, desabilitado } = estado;
  return cn(
    'flex items-start gap-2 rounded-xl border border-l-2 px-2 py-2',
    // Propriedade arbitraria, e nao a utilitaria `duration` com valor entre
    // colchetes: o Tailwind 3 nao consegue desambiguar aquela forma entre
    // `transition-duration` e `animation-duration`, avisa no log e DESCARTA a
    // classe — ela nao chega ao bundle. O efeito era silencioso: sem erro de
    // build nem de lint, as linhas ficavam nos 150ms que o proprio
    // `transition-colors` ja traz.
    // (O texto acima evita escrever a forma ambigua: o Tailwind varre ate
    // comentario e o aviso voltaria por causa dele.)
    'transition-colors [transition-duration:120ms]',
    vinculado ? 'border-primary' : 'border-border',
    selecionado ? 'border-l-border bg-muted' : 'bg-card',
    // Hover só no repouso: linha já marcada ou já aberta não tem para onde ir,
    // e um realce a mais em cima delas só embaralharia a leitura da lista.
    !selecionado && !vinculado && !desabilitado && 'hover:bg-muted/60',
    desabilitado && 'cursor-not-allowed opacity-60',
  );
}

/**
 * Quadrado do ícone. Invertido no vínculo (fundo de acento, glifo branco) — é o
 * reforço não-cromático que sustenta o estado para quem não lê a cor.
 *
 * Fora do vínculo o quadrado troca de tom conforme a linha, para não sumir: em
 * repouso a linha é `card` e o quadrado é `muted`; marcada, a linha vira `muted`
 * e o quadrado sobe para `background`. Sem essa inversão o quadrado teria
 * exatamente o fundo da linha marcada e o ícone flutuaria sem caixa.
 */
export function listRowIconBoxClasses(estado: ListRowState = {}): string {
  const { selecionado, vinculado } = estado;
  return cn(
    'grid shrink-0 place-items-center rounded-md',
    vinculado ? 'bg-primary' : selecionado ? 'bg-background' : 'bg-muted',
  );
}

/**
 * Glifo dentro do quadrado. Em repouso mantém a cor que o chamador já usava
 * (tipo de arquivo, categoria); no vínculo passa a branco sobre o acento.
 */
export function listRowIconGlyphClasses(
  estado: ListRowState = {},
  glifoEmRepouso?: string,
): string {
  return cn(estado.vinculado ? 'text-primary-foreground' : glifoEmRepouso);
}

/** Título da linha: ganha peso quando marcada. */
export function listRowTitleClasses(estado: ListRowState = {}): string {
  return cn('text-foreground', estado.selecionado ? 'font-medium' : 'font-normal');
}

/**
 * Rótulo textual do vínculo, à direita da linha ("aberto", "vinculado").
 * O texto é do chamador — a palavra muda com o assunto da tela.
 */
export function listRowLinkedLabelClasses(): string {
  return 'shrink-0 text-[10px] font-semibold uppercase text-primary';
}

/**
 * Anel de foco da linha.
 *
 * `ring-primary`, e não `ring-ring`: `--ring` está em lime no `:root` e a
 * `.tax-theme` não o sobrescreve, então `ring-ring` sairia verde-limão em toda
 * a área Tax enquanto o botão ao lado é teal. Enquanto isso não for corrigido no
 * tema, o acento é a fonte certa aqui.
 */
export function listRowFocusClasses(): string {
  return 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1';
}

/**
 * Atributos ARIA do estado. `aria-current` marca o item ATIVO (o que está
 * aberto no detalhe) — a seleção múltipla não entra aqui porque já é anunciada
 * pela caixa de seleção, que tem `checked` próprio.
 */
export function listRowAria(estado: ListRowState = {}): { 'aria-current'?: 'true' } {
  return estado.vinculado ? { 'aria-current': 'true' } : {};
}
