import type { JSONContent } from '@tiptap/core';

import { markdownParaConteudo } from '@/lib/markdownTarefa';

export type DestinoEnriquecimento = 'simples' | 'rico';

export interface CapacidadesRichText {
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
  listas: boolean;
  codigoInline: boolean;
  blocoCodigo: boolean;
}

export const CAPACIDADES_RICAS_BASICAS: CapacidadesRichText = {
  negrito: true,
  italico: true,
  sublinhado: true,
  listas: true,
  codigoInline: false,
  blocoCodigo: false,
};

export const CAPACIDADES_RICAS_TAREFA: CapacidadesRichText = {
  ...CAPACIDADES_RICAS_BASICAS,
  codigoInline: true,
  blocoCodigo: true,
};

/**
 * Valor de um campo estruturado, espelho do contrato da Edge Function: a forma
 * depende do `tipo` declarado no perfil, e `null` só ocorre em campo anulável.
 */
export type ValorEnriquecidoApi =
  | { tipo: 'texto'; texto: string | null }
  | { tipo: 'numero'; numero: number | null };

export type RespostaEnriquecimentoApi =
  | { estruturado: false; texto: string; destino: DestinoEnriquecimento; error?: string }
  | {
      estruturado: true;
      campos: Record<string, { valor: ValorEnriquecidoApi; destino: DestinoEnriquecimento }>;
      error?: string;
    };

export type CampoEnriquecido =
  | { destino: 'simples'; texto: string; conteudo: string }
  | { destino: 'rico'; texto: string; conteudo: JSONContent };

export type SugestaoEnriquecimento =
  | {
      estruturado: false;
      origem: string;
      resultado: CampoEnriquecido;
    }
  | {
      estruturado: true;
      origem: string;
      campos: Record<string, CampoEnriquecido>;
    };

function marcasPermitidas(capacidades: CapacidadesRichText): Set<string> {
  return new Set([
    ...(capacidades.negrito ? ['bold'] : []),
    ...(capacidades.italico ? ['italic'] : []),
    ...(capacidades.sublinhado ? ['underline'] : []),
    ...(capacidades.codigoInline ? ['code'] : []),
  ]);
}

function textoDoNo(no: JSONContent): string {
  if (no.type === 'text') return no.text ?? '';
  return (no.content ?? []).map(textoDoNo).join('');
}

function paragrafoDoTexto(texto: string): JSONContent {
  return texto
    ? { type: 'paragraph', content: [{ type: 'text', text: texto }] }
    : { type: 'paragraph' };
}

function limparNo(
  no: JSONContent,
  capacidades: CapacidadesRichText,
  permitidas: Set<string>,
): JSONContent[] {
  if (no.type === 'text') {
    const marks = no.marks?.filter((marca) => permitidas.has(marca.type ?? '')) ?? [];
    return [
      {
        type: 'text',
        text: no.text ?? '',
        ...(marks.length ? { marks } : {}),
      },
    ];
  }

  if (no.type === 'codeBlock' && !capacidades.blocoCodigo) {
    return [paragrafoDoTexto(textoDoNo(no))];
  }

  if ((no.type === 'bulletList' || no.type === 'orderedList') && !capacidades.listas) {
    return (no.content ?? []).map((item) => paragrafoDoTexto(textoDoNo(item)));
  }

  const tiposPermitidos = new Set([
    'paragraph',
    'bulletList',
    'orderedList',
    'listItem',
    ...(capacidades.blocoCodigo ? ['codeBlock'] : []),
  ]);
  if (!no.type || !tiposPermitidos.has(no.type)) return [paragrafoDoTexto(textoDoNo(no))];

  const content = (no.content ?? []).flatMap((filho) => limparNo(filho, capacidades, permitidas));
  return [
    {
      type: no.type,
      ...(no.type === 'codeBlock' ? { attrs: { language: no.attrs?.language ?? null } } : {}),
      ...(content.length ? { content } : {}),
    },
  ];
}

/** Converte apenas o dialeto permitido em nós TipTap conhecidos pelo campo de destino. */
export function markdownEnriquecidoParaDoc(
  markdown: string,
  capacidades: CapacidadesRichText = CAPACIDADES_RICAS_BASICAS,
): JSONContent {
  const permitidas = marcasPermitidas(capacidades);
  const content = markdownParaConteudo(markdown).flatMap((no) =>
    limparNo(no, capacidades, permitidas),
  );
  return {
    type: 'doc',
    content: content.length ? content : [{ type: 'paragraph' }],
  };
}

function converterCampo(
  campo: { valor: ValorEnriquecidoApi; destino: DestinoEnriquecimento },
  capacidades: CapacidadesRichText,
): CampoEnriquecido {
  // O rich text só consome texto: número vira o seu literal e null vira vazio —
  // hoje nenhum perfil de editor declara campo numérico, e a coerção evita que
  // um apareça no futuro sem quebrar a sugestão inteira.
  const texto =
    campo.valor.tipo === 'numero'
      ? campo.valor.numero === null
        ? ''
        : String(campo.valor.numero)
      : (campo.valor.texto ?? '');

  if (campo.destino === 'simples') {
    return { destino: 'simples', texto, conteudo: texto };
  }
  return {
    destino: 'rico',
    texto,
    conteudo: markdownEnriquecidoParaDoc(texto, capacidades),
  };
}

export function converterRespostaEnriquecimento(
  origem: string,
  resposta: RespostaEnriquecimentoApi,
  capacidades: CapacidadesRichText = CAPACIDADES_RICAS_BASICAS,
): SugestaoEnriquecimento {
  if (resposta.estruturado === false) {
    return {
      estruturado: false,
      origem,
      resultado: converterCampo(
        { valor: { tipo: 'texto', texto: resposta.texto }, destino: resposta.destino },
        capacidades,
      ),
    };
  }
  return {
    estruturado: true,
    origem,
    campos: Object.fromEntries(
      Object.entries(resposta.campos).map(([nome, campo]) => [
        nome,
        converterCampo(campo, capacidades),
      ]),
    ),
  };
}

/** Impede uma sugestão antiga de sobrescrever texto editado durante a chamada. */
export function sugestaoAindaSeAplica(
  sugestao: SugestaoEnriquecimento,
  valorAtual: string,
): boolean {
  return sugestao.origem === valorAtual;
}
