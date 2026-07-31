/**
 * Tom do avatar de quem falou no feed.
 *
 * Existe para dar leitura visual à conversa: com cinco tons estáveis, dá para
 * varrer o feed e perceber "esse bloco é de outra pessoa" antes de ler o nome. O
 * tom sai de um hash do id do autor, então é o mesmo em toda a sessão e em todas
 * as páginas do feed — não depende da posição na lista.
 *
 * A paleta é de tokens semânticos de propósito: a mesma função serve Tax e OSG,
 * porque `primary`, `tool-icon` e companhia trocam de valor com o tema da área.
 */
const TONS = [
  'bg-primary/10 text-primary',
  'bg-tool-icon-bg text-tool-icon',
  'bg-info/10 text-info',
  'bg-success/10 text-success',
  'bg-foreground/[0.07] text-foreground/70',
] as const;

/** Classe de fundo + cor do texto do avatar. Autor sem id cai no tom neutro. */
export function tomDoAutor(chave: string | null | undefined): string {
  if (!chave) return 'bg-muted text-muted-foreground';

  let hash = 0;
  for (let indice = 0; indice < chave.length; indice += 1) {
    hash = (hash * 31 + chave.charCodeAt(indice)) % 9973;
  }
  return TONS[hash % TONS.length];
}
