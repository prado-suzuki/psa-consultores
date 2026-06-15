import { comporBlocos } from './composition';
import { numerarBlocos, refsNumeracao, unirBlocos } from './numeracao';
import { expandirRepetidores } from './repetidor';
import { renderSegmentos, type SegmentoRender } from './render';
import type { Bloco, Contexto, Template } from './types';

/** Bloco pronto: conteúdo renderizado (string) + os mesmos segmentos com proveniência (prévia interativa). */
export interface BlocoGerado extends Bloco {
  segmentos: SegmentoRender[];
}

/**
 * Compõe os blocos segundo as flags ativas, expande os repetidores (uma
 * instância por item da coleção), numera tudo pelo tipo estrutural
 * (capítulo/cláusula/parágrafo) e preenche os placeholders. Os blocos saem
 * prontos (numerados + renderizados) mas ainda separados — é a entrada dos
 * adapters de saída que formatam por tipo (.docx) ou unem em texto. O conteúdo
 * é a concatenação exata dos segmentos: um render só para as duas saídas.
 *
 * Entre a numeração e o render, a numeração é publicada como referência textual
 * (refsNumeracao):
 * - instância de repetidor: carimba `ref` no PRÓPRIO item da coleção — o bloco
 *   escreve {{ ref }}, e qualquer {{#colecao}} de outro bloco também enxerga
 *   ("arrolados no {{ ref }} desta cláusula" dentro do loop do caput). O carimbo
 *   muta o item do contexto de propósito: é a identidade do item que liga o
 *   parágrafo expandido às menções a ele, e cada geração recarimba do zero.
 * - bloco com `ancora`: publica em {{ refs.<ancora> }} para referência avulsa
 *   ("observado o disposto na {{ refs.haveres }}").
 */
export function gerarBlocos(template: Template, contexto: Contexto, flagsAtivas: Iterable<string> = []): BlocoGerado[] {
  const expandidos = expandirRepetidores(comporBlocos(template, flagsAtivas), contexto);

  const refs = refsNumeracao(expandidos);
  const globais: Contexto = {};
  expandidos.forEach((bloco, i) => {
    const ref = refs[i];
    if (!ref) return;
    if (bloco.escopo) bloco.escopo.ref = ref;
    else if (bloco.ancora) globais[bloco.ancora] = ref;
  });
  const ctx: Contexto = { ...contexto, refs: globais };

  return numerarBlocos(expandidos).map((bloco) => {
    const segmentos = renderSegmentos(bloco.conteudo, ctx, bloco.escopo ? [bloco.escopo] : []);
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
export { expandirRepetidores } from './repetidor';
export { numerarBlocos, unirBlocos, rotulosNumeracao, refsNumeracao } from './numeracao';
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
