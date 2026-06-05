import type { Bloco, Template } from './types';

/**
 * Seleciona os blocos de um template segundo as flags ativas, preservando a ordem.
 * Bloco COM flags requeridas: entra só se TODAS estiverem ativas (AND simples —
 * sem OR, sem negação) — as flags têm precedência sobre `obrigatorio`, senão
 * marcar uma flag num bloco obrigatório não teria efeito. Bloco SEM flags: entra
 * se for obrigatório.
 */
export function comporBlocos(template: Template, flagsAtivas: Iterable<string> = []): Bloco[] {
  const ativas = new Set(flagsAtivas);
  return template.blocos.filter((bloco) => {
    const flags = bloco.flagsRequeridas ?? [];
    if (flags.length > 0) return flags.every((flag) => ativas.has(flag));
    return Boolean(bloco.obrigatorio);
  });
}
