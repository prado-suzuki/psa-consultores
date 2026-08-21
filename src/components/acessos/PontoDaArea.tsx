import { cn } from '@/lib/utils';
import { type AreaComCor, classeDaCorDaArea, estiloDaCorDaArea } from '@/lib/corDaArea';

interface Props {
  area: AreaComCor | null | undefined;
  /** Contorno, para quando o ponto cai sobre superfície tingida. */
  comBorda?: boolean;
  className?: string;
}

/**
 * O ponto colorido da área — um componente, e não cinco trechos parecidos.
 *
 * TAMANHO ÚNICO, 12px. Os cinco lugares que pintavam este ponto usavam TRÊS
 * tamanhos — 8px em `UsersTab` (duas vezes) e `EquipesEstruturaField`, 10px em
 * `EquipeControleAcessos`, 12px em `EstruturaManager`. Três medidas para a mesma
 * coisa não é decisão, é acaso acumulado.
 *
 * E 12 e não 8 porque a discriminação de cor em campo pequeno é perceptualmente
 * pior: o mesmo tom entrega menos sinal a 8px do que a 12px. Aumentar o ponto
 * melhora exatamente a função que a cor tem aqui, que é varrer a lista.
 *
 * Não renderiza NADA quando a área não tem cor. Um cinza de reserva afirmaria
 * "esta área tem cor" sobre uma área que não tem — e é o que havia antes, com
 * `'#94a3b8'` como padrão em dois dos cinco sites.
 */
export function PontoDaArea({ area, comBorda = false, className }: Props) {
  const classe = classeDaCorDaArea(area);
  const estilo = estiloDaCorDaArea(area);
  if (!classe && !estilo) return null;

  return (
    <span
      aria-hidden
      className={cn('h-3 w-3 shrink-0 rounded-full', comBorda && 'border', classe, className)}
      style={estilo}
    />
  );
}
