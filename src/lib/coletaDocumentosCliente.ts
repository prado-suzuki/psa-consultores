// Coleta de documentos do cliente em 4 grupos grandes, em vez de uma lista por
// pessoa/imóvel: o cliente joga os arquivos no grupo e a PSA classifica depois.
//
// A lista "quais documentos" de cada grupo vem da solicitação ENVIADA
// (get_solicitacao_ativa_cliente, EDU-24), agrupada pela coluna `grupo` de cada
// item. Antes da EDU-26 o grupo era adivinhado a partir do texto do campo
// entidade, e qualquer variação de grafia jogava o documento em "Outros" sem
// erro e sem aviso. Os nomes saem sem repetir, porque o mesmo documento pode
// ser pedido para mais de uma pessoa ou matrícula.
import type { DocumentoArquivoRow, SolicitacaoItemCliente } from '@/hooks/useDocumentoArquivo';
import {
  GRUPOS_DOCUMENTO,
  grupoDaCategoria,
  type GrupoDocumento,
  type GrupoDocumentoKey,
} from '@/lib/agrupadorDocumentos';

/**
 * Um documento pedido, do jeito que a gaveta mostra.
 *
 * A instrução é o que diferencia um pedido da PSA de uma lista genérica: de
 * quantos exercícios, de quem, atualizada ou não. Vem do campo `nota`, que a
 * RPC já resolve entre a linha do pedido e o catálogo.
 */
export interface DocumentoPedido {
  nome: string;
  instrucao: string | null;
}

export interface GrupoColeta extends GrupoDocumento {
  /** Documentos pedidos neste grupo, sem repetir nome, em ordem alfabética. */
  documentos: DocumentoPedido[];
  /** Arquivos que o cliente já enviou neste grupo, mais recentes primeiro. */
  arquivos: DocumentoArquivoRow[];
}

/**
 * Monta os 4 grupos com a lista de documentos pedidos e os arquivos já enviados.
 *
 * Os documentos pedidos vêm da solicitação enviada e vão para a gaveta que a
 * coluna `grupo` manda, sem tradução no meio. O mesmo documento pode ser pedido
 * mais de uma vez no grupo (uma por pessoa, uma por matrícula): aparece uma vez
 * só, e prevalece a primeira instrução preenchida.
 *
 * Os arquivos são os do próprio cliente (`fonte = 'cliente'`) sem vínculo com
 * item de checklist, agrupados pelo grupo da categoria com que foram enviados
 * (ver `grupoDaCategoria`, que é o caminho de arquivo legado). Documento
 * enviado antes desta tela existir tem categoria `outros` e aparece no grupo
 * "Outros documentos", que é o que ele é.
 */
export function montarGruposColeta(
  itens: SolicitacaoItemCliente[],
  docs: DocumentoArquivoRow[],
): GrupoColeta[] {
  const pedidosPorGrupo = new Map<GrupoDocumentoKey, Map<string, DocumentoPedido>>();
  for (const item of itens) {
    const porNome = pedidosPorGrupo.get(item.grupo) ?? new Map<string, DocumentoPedido>();
    const jaVisto = porNome.get(item.documento);
    if (!jaVisto || (!jaVisto.instrucao && item.nota)) {
      porNome.set(item.documento, { nome: item.documento, instrucao: item.nota });
    }
    pedidosPorGrupo.set(item.grupo, porNome);
  }

  const doCliente = docs.filter((d) => d.fonte === 'cliente' && d.checklist_item_id == null);
  const arquivosPorGrupo = new Map<GrupoDocumentoKey, DocumentoArquivoRow[]>();
  for (const doc of doCliente) {
    const key = grupoDaCategoria(doc.categoria);
    const lista = arquivosPorGrupo.get(key) ?? [];
    lista.push(doc);
    arquivosPorGrupo.set(key, lista);
  }

  return GRUPOS_DOCUMENTO.map((grupo) => ({
    ...grupo,
    documentos: Array.from(pedidosPorGrupo.get(grupo.key)?.values() ?? []).sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR'),
    ),
    arquivos: arquivosPorGrupo.get(grupo.key) ?? [],
  }));
}
