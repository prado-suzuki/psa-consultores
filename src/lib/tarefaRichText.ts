import type { JSONContent } from '@tiptap/core';

import { TICKET_RICH_TEXT_MARKER } from '@/components/chamados/ticketRichTextFormat';

// Formato de rich text da descrição de tarefa/entregável (`sprint_deliverables.description`
// e `org_tasks.description`).
// A coluna continua `text`: quando o conteúdo vem do editor, a string é o
// TAREFA_RICH_TEXT_MARKER + JSON do documento TipTap. Descrições antigas (texto
// plano, importação de Excel, geração de demandas) não têm marcador e são
// convertidas em parágrafos na abertura do editor — nada se perde.

export const TAREFA_RICH_TEXT_MARKER = '[[tarefa-rich-text:v1]]';

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

// Marcadores de documento TipTap que a descrição de tarefa sabe abrir. O de
// chamado entra porque `delegar_chamado_gera_tarefa()` (migration
// 20260817184423) copia `tickets.description` para `org_tasks.description` tal
// e qual: a tarefa nasce com o marcador do chamado. Os nós do editor de chamado
// (parágrafo, listas, negrito/itálico/sublinhado) são um subconjunto dos daqui,
// então o documento abre inteiro; na primeira edição ele volta gravado com o
// marcador de tarefa.
const MARCADORES = [TAREFA_RICH_TEXT_MARKER, TICKET_RICH_TEXT_MARKER];

function marcadorDe(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return MARCADORES.find((marcador) => value.startsWith(marcador)) ?? null;
}

export function hasTarefaRichTextMarker(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(TAREFA_RICH_TEXT_MARKER);
}

/** Valor que carrega um documento TipTap: o de tarefa ou o copiado do chamado. */
export function hasTarefaRichTextDoc(value: string | null | undefined): boolean {
  return marcadorDe(value) !== null;
}

/** Texto plano vira um parágrafo por linha, preservando linhas em branco. */
function plainToDoc(value: string): JSONContent {
  const lines = value.split('\n');
  return {
    type: 'doc',
    content: lines.map((line) =>
      line.length > 0
        ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
        : { type: 'paragraph' },
    ),
  };
}

/** Documento TipTap do valor — aceita tanto conteúdo marcado quanto texto antigo. */
export function parseTarefaRichText(value: string | null | undefined): JSONContent {
  if (!value) return EMPTY_DOC;
  const marcador = marcadorDe(value);
  if (!marcador) return plainToDoc(value);
  try {
    const parsed: unknown = JSON.parse(value.slice(marcador.length));
    if (parsed && typeof parsed === 'object' && (parsed as { type?: string }).type === 'doc') {
      return parsed as JSONContent;
    }
  } catch {
    // Marcador presente mas JSON corrompido: melhor mostrar o texto cru do que sumir com ele.
    return plainToDoc(value.slice(marcador.length));
  }
  return EMPTY_DOC;
}

/**
 * Converte o documento TipTap em string persistível. Documento sem texto algum
 * vira string vazia, para o controller gravar `null` em vez de um marcador vazio.
 */
export function serializeTarefaRichText(doc: JSONContent): string {
  if (docToPlain(doc).trim().length === 0) return '';
  return `${TAREFA_RICH_TEXT_MARKER}${JSON.stringify(doc)}`;
}

function collectText(node: JSONContent): string {
  if (node.type === 'text') return node.text || '';
  if (node.type === 'dailyTaskReference') return `[${String(node.attrs?.code ?? '')}]`;
  // Sem separador: os blocos já terminam com quebra, e marcas inline (negrito,
  // código na linha) quebram o texto em vários nós que precisam colar de volta.
  const children = node.content?.map(collectText).join('') || '';
  // Blocos de nível parágrafo terminam com quebra, para o texto plano ficar legível.
  // listItem não entra: o parágrafo dentro dele já emite a quebra, e contar as duas
  // deixaria uma linha em branco entre cada item da lista.
  if (node.type === 'paragraph' || node.type === 'codeBlock') {
    return `${children}\n`;
  }
  return children;
}

function docToPlain(doc: JSONContent): string {
  return collectText(doc).replace(/\n+$/g, '');
}

/** Texto plano do valor — serve para busca, exportação e prévias em lista. */
export function tarefaRichTextToPlain(value: string | null | undefined): string {
  if (!value) return '';
  if (!hasTarefaRichTextDoc(value)) return value;
  return docToPlain(parseTarefaRichText(value)).trim();
}

export function isTarefaRichTextEmpty(value: string | null | undefined): boolean {
  return tarefaRichTextToPlain(value).trim().length === 0;
}
