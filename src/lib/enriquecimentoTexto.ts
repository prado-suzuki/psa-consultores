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

export type RespostaEnriquecimentoApi =
  | { estruturado: false; texto: string; destino: DestinoEnriquecimento; error?: string }
  | {
      estruturado: true;
      campos: Record<string, { texto: string; destino: DestinoEnriquecimento }>;
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
  campo: { texto: string; destino: DestinoEnriquecimento },
  capacidades: CapacidadesRichText,
): CampoEnriquecido {
  if (campo.destino === 'simples') {
    return { destino: 'simples', texto: campo.texto, conteudo: campo.texto };
  }
  return {
    destino: 'rico',
    texto: campo.texto,
    conteudo: markdownEnriquecidoParaDoc(campo.texto, capacidades),
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
      resultado: converterCampo(resposta, capacidades),
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
