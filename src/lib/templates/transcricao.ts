import { fimDoCapitulo } from './numeracao';
import { apararSegmentos } from './proveniencia';
import type { SegmentoRender } from './render';
import type { Bloco } from './types';

// Transcrição de capítulo: {{transcricao capitulo="<ancora>"}} escreve, no lugar,
// o capítulo do consolidado como ele sai na mesma composição (numerado, com os
// repetidores expandidos). É assim que a alteração contratual reproduz o
// capítulo que muda sem duplicar o texto dos blocos dele.

export const PALAVRA_TRANSCRICAO = 'transcricao';

/** Abre cada linha transcrita: o .docx a recua como citação. */
export const RECUO_CITACAO = '\t';
/** Linha transcrita que o .docx centraliza (o título do capítulo). */
export const RECUO_CITACAO_CENTRALIZADA = '\t\t';

type BlocoComSegmentos = Bloco & { segmentos: SegmentoRender[] };

type MarcaDeTranscricao = Extract<SegmentoRender, { tipo: 'texto' }> & { transcricao: string };

function ehMarcaDeTranscricao(s: SegmentoRender): s is MarcaDeTranscricao {
  return s.tipo === 'texto' && s.transcricao !== undefined;
}

/** Prefixa cada linha dos segmentos com o recuo, sem fundir valor com texto. */
function comRecuo(segmentos: SegmentoRender[], recuo: string): SegmentoRender[] {
  const out: SegmentoRender[] = [{ tipo: 'texto', texto: recuo }];
  for (const segmento of segmentos) {
    segmento.texto.split('\n').forEach((parte, j) => {
      if (j > 0) out.push({ tipo: 'texto', texto: `\n${recuo}` });
      if (parte) out.push({ ...segmento, texto: parte });
    });
  }
  return out;
}

/** Mesmo respiro do .docx: linha em branco antes de capítulo e de cláusula, exceto a que abre o capítulo. */
function separador(tipo: Bloco['tipo'], anterior: Bloco['tipo']): string {
  const abre = tipo === 'capitulo' || tipo === 'livre' || tipo === undefined
    || (tipo === 'clausula' && anterior !== 'capitulo');
  return abre ? '\n\n' : '\n';
}

function transcreverCapitulo(
  blocos: BlocoComSegmentos[],
  ancora: string,
  descartadas: ReadonlySet<string>,
): SegmentoRender[] {
  const inicio = blocos.findIndex((b) => b.tipo === 'capitulo' && b.ancora === ancora && !b.escopo);
  if (inicio < 0) {
    if (descartadas.has(ancora)) return [];
    throw new Error(`Transcrição de capítulo inexistente: {{${PALAVRA_TRANSCRICAO} capitulo="${ancora}"}}`);
  }
  const out: SegmentoRender[] = [];
  const fim = fimDoCapitulo(blocos, inicio);
  for (let k = inicio; k < fim; k += 1) {
    const bloco = blocos[k];
    if (k > inicio) out.push({ tipo: 'texto', texto: separador(bloco.tipo, blocos[k - 1].tipo) });
    const recuo = bloco.tipo === 'capitulo' ? RECUO_CITACAO_CENTRALIZADA : RECUO_CITACAO;
    out.push(...comRecuo(apararSegmentos(bloco.segmentos.filter((s) => !ehMarcaDeTranscricao(s))), recuo));
  }
  return out;
}

/**
 * Troca cada marca de transcrição pelo capítulo correspondente. Roda sobre a
 * composição JÁ numerada: o texto transcrito não consome número de nenhuma
 * série, e as referências dentro dele continuam apontando para o consolidado.
 *
 * Âncora de capítulo descartado transcreve vazio; âncora que não existe na
 * composição lança, como o placeholder não resolvido.
 */
export function transcreverCapitulos<T extends BlocoComSegmentos>(
  blocos: T[],
  descartadas: ReadonlySet<string> = new Set(),
): T[] {
  if (!blocos.some((b) => b.segmentos.some(ehMarcaDeTranscricao))) return blocos;
  return blocos.map((bloco) => {
    if (!bloco.segmentos.some(ehMarcaDeTranscricao)) return bloco;
    const segmentos = bloco.segmentos.flatMap((s): SegmentoRender[] => {
      if (!ehMarcaDeTranscricao(s)) return [s];
      const transcrito = transcreverCapitulo(blocos, s.transcricao, descartadas);
      // O rótulo de numeração pode ter sido colado nesta marca (bloco que abre por ela).
      return s.texto ? [{ tipo: 'texto', texto: s.texto }, ...transcrito] : transcrito;
    });
    return { ...bloco, segmentos, conteudo: segmentos.map((s) => s.texto).join('') };
  });
}
