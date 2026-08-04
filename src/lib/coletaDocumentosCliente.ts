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

export interface GrupoColeta extends GrupoDocumento {
  /** Nomes distintos dos documentos pedidos neste grupo, em ordem alfabética. */
  documentos: string[];
  /** Arquivos que o cliente já enviou neste grupo, mais recentes primeiro. */
  arquivos: DocumentoArquivoRow[];
}

/**
 * Monta os 4 grupos com a lista de documentos pedidos e os arquivos já enviados.
 *
 * Os documentos pedidos vêm da solicitação enviada e vão para a gaveta que a
 * coluna `grupo` manda, sem tradução no meio.
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
  const nomesPorGrupo = new Map<GrupoDocumentoKey, Set<string>>();
  for (const item of itens) {
    const set = nomesPorGrupo.get(item.grupo) ?? new Set<string>();
    set.add(item.documento);
    nomesPorGrupo.set(item.grupo, set);
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
    documentos: Array.from(nomesPorGrupo.get(grupo.key) ?? []).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
    arquivos: arquivosPorGrupo.get(grupo.key) ?? [],
  }));
}
