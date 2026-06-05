import { comporBlocos } from './composition';
import { numerarBlocos, unirBlocos } from './numeracao';
import { renderConteudo } from './render';
import type { Contexto, Template } from './types';

/**
 * Compõe os blocos segundo as flags ativas, numera-os pelo tipo estrutural
 * (capítulo/cláusula/parágrafo) e preenche os placeholders. Os blocos saem
 * prontos (numerados + renderizados) mas ainda separados — é a entrada dos
 * adapters de saída que formatam por tipo (.docx) ou unem em texto.
 */
export function gerarBlocos(template: Template, contexto: Contexto, flagsAtivas: Iterable<string> = []) {
  return numerarBlocos(comporBlocos(template, flagsAtivas)).map((bloco) => ({
    ...bloco,
    conteudo: renderConteudo(bloco.conteudo, contexto),
  }));
}

/** Gera o documento como texto plano (prévia, copiar/colar). */
export function gerarDocumento(template: Template, contexto: Contexto, flagsAtivas: Iterable<string> = []): string {
  return unirBlocos(gerarBlocos(template, contexto, flagsAtivas));
}

export type { Bloco, Template, Contexto, TipoBloco } from './types';
export { TIPOS_BLOCO, LABEL_TIPO_BLOCO } from './types';
export { comporBlocos } from './composition';
export { numerarBlocos, unirBlocos } from './numeracao';
export { renderConteudo, extrairCampos } from './render';
export { avaliarFlags } from './flags';
export type { FlagDeclarativa, FontesFlags } from './flags';
export * as extenso from './extenso';
