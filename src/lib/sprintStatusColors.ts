import { projectStatusColors } from '@/lib/projetoStatusColors';

/**
 * Cor e rótulo do status de uma sprint.
 *
 * POR QUE ISTO EXISTE, e não é "mais um mapa". A pílula de status da sprint
 * estava escrita à mão em dois lugares — e as duas cópias JÁ TINHAM DIVERGIDO,
 * o que é pior que duplicação:
 *
 *     status       EquipeSprints (lista)      SprintHeaderFilters (detalhe)
 *     active       bg-green-100/green-700     bg-primary/10 text-primary
 *     completed    bg-blue-100/blue-700       bg-green-100/green-700
 *     planned      bg-muted/gray-700          bg-muted/gray-700
 *
 * Ou seja: a MESMA sprint aparecia verde na lista e no acento da área no
 * detalhe; e o verde queria dizer "ativa" numa tela e "concluída" na outra. Quem
 * aprendesse a cor num lugar reaprendia no outro.
 *
 * Nenhuma das duas seguia o tema, ainda por cima: verde e azul de fábrica do
 * Tailwind ficam iguais na Tax, na OSG e na casa, enquanto a pílula ao lado
 * muda com a área. É o achado das cinco rodadas de 03/09 — procurar o mapa do
 * domínio acha reuso que não aconteceu.
 *
 * AS CORES SÃO AS DO PROJETO, e isso é reuso de verdade e não coincidência:
 * sprint e projeto usam o MESMO vocabulário de ciclo de vida (`planned`,
 * `active`, `completed`), então `projectStatusColors` já tinha a resposta. O
 * comentário de lá diz o porquê melhor do que eu diria: "na mesma tela, a mesma
 * ideia não deve ter duas cores".
 *
 * O QUE NÃO SE REUSA SÃO OS RÓTULOS, e é de propósito. Sprint é palavra
 * feminina: "Ativa", "Concluída", "Planejada" — contra "Ativo", "Concluído",
 * "Planejado" do projeto. A regra da palavra única masculina vale para os
 * domínios masculinos; os femininos ficam de fora dela justamente para não
 * dizerem "Sprint Concluído".
 */
export interface SprintStatusConfig {
  label: string;
  /** `bg + text + border` da pílula. */
  badge: string;
}

export const sprintStatusColors: Record<string, SprintStatusConfig> = {
  planned: { label: 'Planejada', badge: projectStatusColors.planned.badge },
  active: { label: 'Ativa', badge: projectStatusColors.active.badge },
  completed: { label: 'Concluída', badge: projectStatusColors.completed.badge },
};

/** A configuração de um status; desconhecido volta como o próprio valor, sem cor. */
export function sprintStatus(status: string): SprintStatusConfig | null {
  return sprintStatusColors[status] ?? null;
}
