import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ROLE_SHORT_LABELS } from '@/components/acessos/roleOptions';

/**
 * A pílula de papel do usuário — UM componente, e é por isso que ele existe.
 *
 * ## O que ele substituiu
 *
 * O mesmo `app_role` era pintado por dois mapas, em dois arquivos da mesma
 * pasta, com duas paletas: a lista de usuários usava a família `-600` sobre
 * `-50`, e a legenda logo abaixo, na MESMA página, usava `-700` sobre `-100`.
 * Nenhum dos dois era token, e os dois divergiam no rótulo — "Membro" era teal
 * da marca num e azul no outro.
 *
 * Medido em 11/09/2026: na cópia da lista, quatro dos sete papéis reprovavam o
 * AA para texto normal (4,5:1), o pior a 3,07:1, e era justamente a cópia que
 * mais gente lê. A da legenda passava nos sete — dois deles por um centésimo.
 *
 * Mapa vira cópia; componente não. É a diferença que impede a terceira.
 *
 * ## A decisão da cor (dela, em 11/09/2026 — opção C)
 *
 * **Sete papéis não são sete categorias.** São uma ESCADA DE PODER de cinco
 * degraus (`admin` > `lider` > `sublider` > `team_member`, com `marketing` de
 * lado) mais um EIXO DE FORA de dois (`client`, `timecliente`).
 *
 * A cor marca só o eixo que tem consequência — **alguém de fora da PSA está
 * olhando** —, que é a pergunta com risco atrás: é ela que decide se um
 * chamado, um dashboard ou um cluster fica visível para quem não é da casa.
 * Sete cores em fileira empatavam essa pergunta com "é líder ou sublíder", que
 * é diferença de grau e sempre teve o rótulo escrito do lado.
 *
 * A escada marca por PESO, não por matiz: pontos antes do rótulo, três, dois,
 * um, nenhum. O degrau usa `--status-neutro` (12,0:1, o mais alto do contrato)
 * e o eixo de fora usa `--tag-d` (5,32:1) — nenhum papel de status é gasto em
 * coisa que não é status, e nenhum token novo nasce. Se o `tag-d` quente vier a
 * ler como erro, `tag-c` faz o mesmo trabalho em roxo e é uma troca de linha.
 *
 * **O custo, que ela aceitou de olhos abertos:** quem varria a lista procurando
 * o âmbar do líder perde essa pista, e passa a ler o rótulo.
 */

/** Degraus da escada de poder. Quem não está aqui não tem degrau a marcar. */
const PONTOS_DO_DEGRAU: Record<string, number> = {
  admin: 3,
  lider: 2,
  sublider: 1,
};

/** Os papéis de quem NÃO é da PSA. É o único eixo que ganha cor. */
const DE_FORA_DA_PSA = new Set(['client', 'timecliente']);

export interface PapelBadgeProps {
  /** Valor do enum `app_role`. Papel desconhecido cai no neutro, com o valor cru. */
  papel: string;
  className?: string;
}

export function PapelBadge({ papel, className }: PapelBadgeProps) {
  const pontos = PONTOS_DO_DEGRAU[papel] ?? 0;
  const deFora = DE_FORA_DA_PSA.has(papel);

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 text-xs font-medium',
        // `/15` e `/35` são passos da escala de opacidade do Tailwind. Fora dela
        // — `/12`, por exemplo — a classe é descartada na build, sem erro, e a
        // pílula sai sem fundo. A página de comparação desenhou em `.12`; aqui
        // o valor tem que existir.
        deFora
          ? 'border-tag-d/35 bg-tag-d/15 text-tag-d'
          : pontos > 0
            ? 'border-transparent bg-status-neutro-soft text-status-neutro'
            : 'border-transparent bg-muted text-muted-foreground',
        className,
      )}
    >
      {deFora && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />}
      {pontos > 0 && (
        <span aria-hidden className="inline-flex items-center gap-[3px]">
          {Array.from({ length: pontos }, (_, i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-current" />
          ))}
        </span>
      )}
      {ROLE_SHORT_LABELS[papel] ?? papel}
    </Badge>
  );
}
