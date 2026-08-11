import { classificarCaminho, marcacaoDoCaminho } from './campos';
import { comporBlocos } from './composition';
import { motivoDeDescarte, type MotivoDescarte } from './descarte';
import type { RegistroFamilias } from './familia';
import { prefixosNumeracao, refsNumeracao, unirBlocos } from './numeracao';
import { expandirRepetidores } from './repetidor';
import { renderBloco, type OpcoesRender, type RenderDeBloco, type SegmentoRender } from './render';
import type { Bloco, Contexto, Template, TipoBloco } from './types';

/** Bloco pronto: conteúdo renderizado (string) + os mesmos segmentos com proveniência (prévia interativa). */
export interface BlocoGerado extends Bloco {
  segmentos: SegmentoRender[];
}

/**
 * Publica a numeração como referência TEXTUAL (refsNumeracao) e renderiza cada
 * bloco:
 * - instância de repetidor: carimba `ref` no PRÓPRIO item da coleção — o bloco
 *   escreve {{ ref }}, e qualquer {{#colecao}} de outro bloco também enxerga
 *   ("arrolados no {{ ref }} desta cláusula" dentro do loop do caput). O carimbo
 *   muta o item do contexto de propósito: é a identidade do item que liga o
 *   parágrafo expandido às menções a ele, e cada geração recarimba do zero.
 * - bloco com `ancora`: publica em {{ refs.<ancora> }} para referência avulsa
 *   ("observado o disposto na {{ refs.haveres }}").
 *
 * Os DESCARTADOS entram por argumento e recebem referência VAZIA, não a da
 * passada anterior (emenda 9.5 do contrato). Sem isso, um item cujo parágrafo
 * saiu do documento manteria o carimbo antigo e o caput citaria uma cláusula
 * inexistente; e um bloco ancorado descartado sumiria de {{ refs.* }}, fazendo
 * o render lançar "Placeholder não resolvido" em quem o cita. Vazio é o destino
 * declarado dos dois: a citação some, o resto do documento sai, e o trecho órfão
 * cai nas mesmas regras de bloco sem dado e de pendência.
 *
 * Âncora de bloco excluído pelas FLAGS continua não existindo (o bloco nem
 * chegou à composição): esse erro segue falhando cedo, como sempre.
 */
function renderizarComReferencias(
  blocos: Bloco[],
  descartados: Bloco[],
  contexto: Contexto,
  opcoes: OpcoesRender,
): RenderDeBloco[] {
  const refs = refsNumeracao(blocos);
  const globais: Contexto = {};
  blocos.forEach((bloco, i) => {
    const ref = refs[i];
    if (!ref) return;
    if (bloco.escopo) bloco.escopo.ref = ref;
    else if (bloco.ancora) globais[bloco.ancora] = ref;
  });
  for (const bloco of descartados) {
    if (bloco.escopo) bloco.escopo.ref = '';
    else if (bloco.ancora) globais[bloco.ancora] = '';
  }
  const ctx: Contexto = { ...contexto, refs: globais };
  return blocos.map((bloco) => renderBloco(bloco.conteudo, ctx, bloco.escopo ? [bloco.escopo] : [], opcoes));
}

/** Bloco que a composição removeu do documento, com o porquê (ver descarte.ts). */
export interface BlocoDescartado {
  id: string;
  /** Id do bloco repetidor de origem, quando o descartado era uma instância. */
  instanciaDe?: string;
  tipo?: TipoBloco;
  motivo: MotivoDescarte;
}

/** A composição inteira: o que entrou no documento e o que ficou de fora. */
export interface Composicao {
  blocos: BlocoGerado[];
  /**
   * Blocos removidos por não trazerem dado. O descarte se ANUNCIA (emenda 9.2):
   * um bloco cujo laço não está fiado renderiza vazio e sumiria sem sinal, o que
   * esconde erro de fiação em vez de mostrá-lo. O fecho de assinaturas é
   * justamente um bloco cujo conteúdo inteiro é um laço.
   */
  descartados: BlocoDescartado[];
}

/**
 * Compõe os blocos segundo as flags ativas, expande os repetidores (uma
 * instância por item da coleção), preenche os placeholders, descarta o que não
 * trouxe dado e só então numera pelo tipo estrutural (capítulo/cláusula/
 * parágrafo). Os blocos saem prontos (numerados + renderizados) mas ainda
 * separados — é a entrada dos adapters de saída que formatam por tipo (.docx)
 * ou unem em texto. O conteúdo é a concatenação exata dos segmentos: um render
 * só para as duas saídas.
 *
 * A ORDEM é o ponto: renderizar para decidir, descartar, e só então numerar.
 * Numerar antes deixaria o buraco na sequência que o descarte abriu ("Cláusula
 * Quinta" seguida de "Cláusula Sétima"). Por isso o rótulo é colado no primeiro
 * segmento, e não na string de origem do bloco.
 */
export function gerarComposicao(
  template: Template,
  contexto: Contexto,
  flagsAtivas: Iterable<string> = [],
  familias: RegistroFamilias = {},
): Composicao {
  const expandidos = expandirRepetidores(comporBlocos(template, flagsAtivas), contexto);
  const opcoes: OpcoesRender = { familias, campo: marcacaoDoCaminho };

  let blocos = expandidos;
  let renders: RenderDeBloco[] = [];
  const descartados: BlocoDescartado[] = [];
  const blocosDescartados: Bloco[] = [];

  // Ponto fixo: remover um bloco esvazia as referências que apontavam para ele.
  // Se uma citação era o único dado de outro bloco, esse segundo bloco também
  // precisa sair. Uma segunda passada fixa não basta para cadeias A → B → C;
  // como cada volta remove ao menos um bloco, o laço termina em no máximo N.
  while (true) {
    renders = renderizarComReferencias(blocos, blocosDescartados, contexto, opcoes);
    const motivos = renders.map(motivoDeDescarte);
    if (motivos.every((motivo) => !motivo)) break;

    const sobreviventes: Bloco[] = [];
    blocos.forEach((bloco, i) => {
      const motivo = motivos[i];
      if (!motivo) {
        sobreviventes.push(bloco);
        return;
      }
      blocosDescartados.push(bloco);
      descartados.push({ id: bloco.id, instanciaDe: bloco.instanciaDe, tipo: bloco.tipo, motivo });
    });
    blocos = sobreviventes;
  }

  const prefixos = prefixosNumeracao(blocos);
  const gerados = blocos.map((bloco, i) => {
    // O rótulo cola no primeiro segmento de texto (em vez de virar um segmento
    // à parte) para o fatiamento sair idêntico ao de numerar antes de render:
    // quem consome os segmentos casa posições com o conteúdo (marcas, realce
    // de diff, proveniência da prévia).
    const segmentos = [...renders[i].segmentos];
    const prefixo = prefixos[i];
    if (prefixo) {
      const primeiro = segmentos[0];
      if (primeiro?.tipo === 'texto') segmentos[0] = { ...primeiro, texto: prefixo + primeiro.texto };
      else segmentos.unshift({ tipo: 'texto', texto: prefixo });
    }
    return { ...bloco, conteudo: segmentos.map((s) => s.texto).join(''), segmentos };
  });

  return { blocos: gerados, descartados };
}

/** Os blocos que entraram no documento. Quem precisa saber o que ficou de fora usa `gerarComposicao`. */
export function gerarBlocos(
  template: Template,
  contexto: Contexto,
  flagsAtivas: Iterable<string> = [],
  familias: RegistroFamilias = {},
): BlocoGerado[] {
  return gerarComposicao(template, contexto, flagsAtivas, familias).blocos;
}

/** Campo obrigatório que o documento usa e não resolveu (ver pendenciasDoDocumento). */
export interface PendenciaDocumento {
  caminho: string;
  label: string;
  /** Campo preenchido na tela Gerar (data de assinatura…), não vindo de cadastro. */
  manual: boolean;
}

/**
 * Os campos OBRIGATÓRIOS que o documento usa e que não resolveram, sem repetir,
 * na ordem em que aparecem. É o que permite NOMEAR o que falta antes de baixar,
 * em vez de "documento incompleto" seco — e é genérico por construção: a
 * obrigatoriedade vem do vocabulário do campo, não de uma lista fixa, então
 * matrícula digitada, doação e alteração contratual cada uma acusa a sua.
 *
 * Bloco descartado (ver descarte.ts) não chega aqui, e portanto não gera
 * pendência: um modelo que legitimamente não tem sócios sai sem alarme.
 */
export function pendenciasDoDocumento(blocos: BlocoGerado[]): PendenciaDocumento[] {
  const vistos = new Set<string>();
  const out: PendenciaDocumento[] = [];
  for (const bloco of blocos) {
    for (const segmento of bloco.segmentos) {
      if (segmento.tipo !== 'valor' || !segmento.pendente || vistos.has(segmento.caminho)) continue;
      vistos.add(segmento.caminho);
      const campo = classificarCaminho(segmento.caminho);
      out.push({
        caminho: segmento.caminho,
        label: campo?.label ?? segmento.caminho,
        manual: campo?.manual ?? false,
      });
    }
  }
  return out;
}

/** Gera o documento como texto plano (prévia, copiar/colar). */
export function gerarDocumento(
  template: Template,
  contexto: Contexto,
  flagsAtivas: Iterable<string> = [],
  familias: RegistroFamilias = {},
): string {
  return unirBlocos(gerarBlocos(template, contexto, flagsAtivas, familias));
}

export type { Bloco, Template, Contexto, TipoBloco } from './types';
export { TIPOS_BLOCO, LABEL_TIPO_BLOCO } from './types';
export { comporBlocos } from './composition';
export { expandirRepetidores } from './repetidor';
export { numerarBlocos, unirBlocos, rotulosNumeracao, refsNumeracao, prefixosNumeracao } from './numeracao';
export { renderConteudo, renderSegmentos, renderBloco, extrairCampos, expandirInclusoes, inclusoesDe } from './render';
export type { SegmentoRender, OpcoesRender, MarcacaoCampo, RenderDeBloco } from './render';
export { motivoDeDescarte } from './descarte';
export type { MotivoDescarte } from './descarte';
export { marcarSintetizados, ehSintetizado } from './sintetizado';
export { classificarCaminho, lacunaDoTipo, marcacaoDoCaminho } from './campos';
export type { CampoDoCaminho } from './campos';
export { VALOR_NOMINAL_QUOTA, capitalDeQuotas, quotasDeValor } from './capital';
export { mapearSignatarios } from './signatarios';
export type { EntradaSignatarios, SignatarioAvulso } from './signatarios';
export { PALAVRA_INCLUSAO, resolverVariante } from './familia';
export type { RegistroFamilias, VarianteFamilia } from './familia';
export { ORIGEM, comOrigem, origemDe, copiarOrigemProfunda } from './origem';
export type { OrigemValor } from './origem';
export { extrairRunsLinha, removerMarcas, runsPosicionados, MARCA } from './marcas';
export type { Marcas, RunMarcado, RunPosicionado } from './marcas';
export { marcarRealceDiff } from './diffPalavras';
export { apararSegmentos, segmentarComProveniencia } from './proveniencia';
export type { Pedaco, SegmentoProveniencia } from './proveniencia';
export { avaliarFlags } from './flags';
export type { FlagDeclarativa, FontesFlags } from './flags';
export * as extenso from './extenso';
