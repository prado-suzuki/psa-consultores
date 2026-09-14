import { Monitor, ShoppingCart, Sparkles, type LucideIcon } from 'lucide-react';

/**
 * Os três tipos de economia adicional de um processo melhorado, num lugar só.
 *
 * POR QUE ISTO EXISTE. O mesmo trio estava descrito em dois arquivos, com os
 * MESMOS três ícones (`Monitor`, `ShoppingCart`, `Sparkles`) e três cores cruas
 * cada — azul, roxo e âmbar do estoque do Tailwind:
 *
 * · `process-improvement/SavingsSections.tsx`, na lista `sections`;
 * · `ImprovementHistoryModal.tsx`, nos `switch` `getSavingsTypeIcon` e
 *   `getSavingsTypeLabel`.
 *
 * Duas cópias não são duas decisões: são uma decisão e um lugar onde ela
 * envelhece separado. É a mesma alavanca que já achou o `chamadoStatusColors`, o
 * `ACTION_LABELS` e a receita de botão das Correções SPED — procurar o MAPA do
 * domínio antes de escrever classe.
 *
 * O QUE NÃO SE UNIFICA É O RÓTULO LONGO, e é de propósito. O formulário diz
 * "Economia com Sistemas" porque é um cabeçalho de seção que precisa se explicar;
 * o selo do histórico diz "Sistemas" porque vive dentro de uma pílula de 11px.
 * São duas vozes legítimas do mesmo dado. Só o rótulo CURTO mora aqui — o longo
 * continua na seção, ao lado do `hint` e do `placeholder`, que também são dela.
 *
 * A COR É CATEGÓRICA (`--tag-*`), e não papel de status: tipo de economia é *que
 * coisa é*, não *em que pé está*. Os três tons acompanham a matiz que já estava
 * lá — frio para sistema, uva para build-vs-buy, quente para "outras" —, então a
 * mudança é de origem da tinta, não de identidade: o que sai é a cor de fábrica,
 * igual na Tax, na OSG e na casa, e o que entra acompanha a área.
 */
export type TipoDeEconomia = 'system' | 'build_vs_buy' | 'other';

export interface TipoDeEconomiaConfig {
  key: TipoDeEconomia;
  /** Rótulo de selo e legenda. O cabeçalho de seção tem o seu, mais longo. */
  rotuloCurto: string;
  icon: LucideIcon;
  /** Classe de cor do ícone — tom categórico da área. */
  tom: string;
}

/*
 * As classes vêm ESCRITAS por extenso, sem template string: o Tailwind lê o
 * código-fonte procurando nomes literais, e `text-tag-${letra}` não é
 * encontrado — a classe não entra no CSS e o ícone sai sem cor, sem erro de
 * build, de lint ou de tipo. É a armadilha que o `categoriaClienteColors` já
 * documenta, e que o `getAreaBadge` dos projetos tinha na forma `hover:`.
 */
export const tiposDeEconomia: Record<TipoDeEconomia, TipoDeEconomiaConfig> = {
  system: { key: 'system', rotuloCurto: 'Sistemas', icon: Monitor, tom: 'text-tag-b' },
  build_vs_buy: {
    key: 'build_vs_buy',
    rotuloCurto: 'Build vs Buy',
    icon: ShoppingCart,
    tom: 'text-tag-c',
  },
  other: { key: 'other', rotuloCurto: 'Outras', icon: Sparkles, tom: 'text-tag-d' },
};

/** Ordem de exibição: a mesma das seções do formulário. */
export const TIPOS_DE_ECONOMIA: TipoDeEconomiaConfig[] = [
  tiposDeEconomia.system,
  tiposDeEconomia.build_vs_buy,
  tiposDeEconomia.other,
];

/**
 * A configuração de um tipo, ou `null` quando a chave é desconhecida.
 *
 * Devolve `null` em vez de um fallback pintado porque as duas telas já tratavam
 * assim: o `getSavingsTypeIcon` devolvia `null` (nenhum ícone) e o
 * `getSavingsTypeLabel` devolvia o próprio valor cru. Quem chama decide — e o
 * comportamento observável de hoje se preserva.
 */
export function tipoDeEconomia(tipo: string | null | undefined): TipoDeEconomiaConfig | null {
  if (!tipo) return null;
  return tiposDeEconomia[tipo as TipoDeEconomia] ?? null;
}
