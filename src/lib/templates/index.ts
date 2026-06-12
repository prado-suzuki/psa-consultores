import { comporBlocos } from './composition';
import { numerarBlocos, unirBlocos } from './numeracao';
import { renderSegmentos, type SegmentoRender } from './render';
import type { Bloco, Contexto, Template } from './types';

/** Bloco pronto: conteúdo renderizado (string) + os mesmos segmentos com proveniência (prévia interativa). */
export interface BlocoGerado extends Bloco {
  segmentos: SegmentoRender[];
}

/**
 * Compõe os blocos segundo as flags ativas, numera-os pelo tipo estrutural
 * (capítulo/cláusula/parágrafo) e preenche os placeholders. Os blocos saem
 * prontos (numerados + renderizados) mas ainda separados — é a entrada dos
 * adapters de saída que formatam por tipo (.docx) ou unem em texto. O conteúdo
 * é a concatenação exata dos segmentos: um render só para as duas saídas.
 */
export function gerarBlocos(template: Template, contexto: Contexto, flagsAtivas: Iterable<string> = []): BlocoGerado[] {
  return numerarBlocos(comporBlocos(template, flagsAtivas)).map((bloco) => {
    const segmentos = renderSegmentos(bloco.conteudo, contexto);
    return { ...bloco, conteudo: segmentos.map((s) => s.texto).join(''), segmentos };
  });
}

/** Gera o documento como texto plano (prévia, copiar/colar). */
export function gerarDocumento(template: Template, contexto: Contexto, flagsAtivas: Iterable<string> = []): string {
  return unirBlocos(gerarBlocos(template, contexto, flagsAtivas));
}

export type { Bloco, Template, Contexto, TipoBloco } from './types';
export { TIPOS_BLOCO, LABEL_TIPO_BLOCO } from './types';
export { comporBlocos } from './composition';
export { numerarBlocos, unirBlocos, rotulosNumeracao } from './numeracao';
export { renderConteudo, renderSegmentos, extrairCampos } from './render';
export type { SegmentoRender } from './render';
export { ORIGEM, comOrigem, origemDe } from './origem';
export type { OrigemValor } from './origem';
export { extrairRunsLinha, removerMarcas, runsPosicionados, MARCA } from './marcas';
export type { Marcas, RunMarcado, RunPosicionado } from './marcas';
export { apararSegmentos, segmentarComProveniencia } from './proveniencia';
export type { Pedaco, SegmentoProveniencia } from './proveniencia';
export { avaliarFlags } from './flags';
export type { FlagDeclarativa, FontesFlags } from './flags';
export * as extenso from './extenso';
