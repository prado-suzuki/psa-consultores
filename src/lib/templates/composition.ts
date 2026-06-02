import type { Bloco, Template } from './types';

/**
 * Seleciona os blocos de um template segundo as flags ativas, preservando a ordem.
 * Um bloco entra se for obrigatório, ou se TODAS as suas flags requeridas estiverem
 * ativas (AND simples — sem OR, sem negação, como definido na arquitetura OSG).
 */
export function comporBlocos(template: Template, flagsAtivas: Iterable<string> = []): Bloco[] {
  const ativas = new Set(flagsAtivas);
  return template.blocos.filter(
    (bloco) => bloco.obrigatorio || (bloco.flagsRequeridas ?? []).every((flag) => ativas.has(flag)),
  );
}
