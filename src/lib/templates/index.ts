import { comporBlocos } from './composition';
import { renderConteudo } from './render';
import type { Contexto, Template } from './types';

/**
 * Gera o documento: compõe os blocos segundo as flags ativas e preenche os placeholders.
 * No MVP a saída é uma string de texto; adapters de saída (.docx/PDF) plugam aqui depois,
 * sem mudar composição nem resolução de placeholders.
 */
export function gerarDocumento(template: Template, contexto: Contexto, flagsAtivas: Iterable<string> = []): string {
  return comporBlocos(template, flagsAtivas)
    .map((bloco) => renderConteudo(bloco.conteudo, contexto))
    .join('');
}

export type { Bloco, Template, Contexto } from './types';
export { comporBlocos } from './composition';
export { renderConteudo, extrairCampos } from './render';
export * as extenso from './extenso';
