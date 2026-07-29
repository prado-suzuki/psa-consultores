// Coleta de documentos do cliente em 4 grupos grandes, em vez de uma lista por
// pessoa/imóvel: o cliente joga os arquivos no grupo e a PSA classifica depois.
// A lista "quais documentos" de cada grupo vem do checklist solicitado, com os
// nomes distintos (o checklist repete o mesmo documento por instância).
import type { ChecklistSolicitadoItem, DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import {
  GRUPOS_DOCUMENTO,
  grupoDaCategoria,
  type GrupoDocumento,
  type GrupoDocumentoKey,
} from '@/lib/agrupadorDocumentos';

/** De qual grupo é a entidade do checklist. O que não se encaixa cai em "outros". */
export function grupoDaEntidade(entidade: string): GrupoDocumentoKey {
  switch (entidade) {
    case 'Pessoa Física':
      return 'pf';
    case 'Pessoa Jurídica':
    case 'Pessoa Jurídica (Cooperativa)':
      return 'pj';
    case 'Matrícula (Imóvel Rural)':
    case 'Matrícula (Imóvel Urbano)':
      return 'imoveis';
    default:
      return 'outros';
  }
}

export interface GrupoColeta extends GrupoDocumento {
  /** Nomes distintos dos documentos pedidos neste grupo, em ordem alfabética. */
  documentos: string[];
  /** Arquivos que o cliente já enviou neste grupo, mais recentes primeiro. */
  arquivos: DocumentoArquivoRow[];
}

/**
 * Monta os 4 grupos com a lista de documentos pedidos e os arquivos já enviados.
 *
 * Os arquivos são os do próprio cliente (`fonte = 'cliente'`) sem vínculo com
 * item de checklist, agrupados pelo grupo da categoria com que foram enviados
 * (ver `grupoDaCategoria`). Documento enviado antes desta tela existir tem
 * categoria `outros` e aparece no grupo "Outros documentos", que é o que ele é.
 */
export function montarGruposColeta(
  checklist: ChecklistSolicitadoItem[],
  docs: DocumentoArquivoRow[],
): GrupoColeta[] {
  const nomesPorGrupo = new Map<GrupoDocumentoKey, Set<string>>();
  for (const item of checklist) {
    const key = grupoDaEntidade(item.entidade || '');
    const set = nomesPorGrupo.get(key) ?? new Set<string>();
    set.add(item.documento);
    nomesPorGrupo.set(key, set);
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
