// Coleta de documentos do cliente em 4 grupos grandes, em vez de uma lista por
// pessoa/imóvel: o cliente joga os arquivos no grupo e a PSA classifica depois.
// A lista "quais documentos" de cada grupo vem do checklist solicitado, com os
// nomes distintos (o checklist repete o mesmo documento por instância).
import type { ChecklistSolicitadoItem, DocCategoria, DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

export type GrupoColetaKey = 'pf' | 'pj' | 'imoveis' | 'outros';

export interface GrupoColetaDef {
  key: GrupoColetaKey;
  titulo: string;
  subtitulo: string;
  /** Categoria gravada em documento_arquivo no upload deste grupo. */
  categoria: DocCategoria;
}

export const GRUPOS_COLETA: GrupoColetaDef[] = [
  { key: 'pf', titulo: 'Pessoas Físicas', subtitulo: 'Fundadores e sócios', categoria: 'pessoais' },
  { key: 'pj', titulo: 'Pessoas Jurídicas', subtitulo: 'Empresas do grupo', categoria: 'societarios' },
  { key: 'imoveis', titulo: 'Matrículas e Imóveis', subtitulo: 'Imóveis rurais e urbanos', categoria: 'agrarios' },
  { key: 'outros', titulo: 'Outros documentos', subtitulo: 'Documentos diversos', categoria: 'outros' },
];

/** De qual grupo é a entidade do checklist. O que não se encaixa cai em "outros". */
export function grupoDaEntidade(entidade: string): GrupoColetaKey {
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

export interface GrupoColeta extends GrupoColetaDef {
  /** Nomes distintos dos documentos pedidos neste grupo, em ordem alfabética. */
  documentos: string[];
  /** Arquivos que o cliente já enviou neste grupo, mais recentes primeiro. */
  arquivos: DocumentoArquivoRow[];
}

/**
 * Monta os 4 grupos com a lista de documentos pedidos e os arquivos já enviados.
 *
 * Os arquivos são os do próprio cliente (`fonte = 'cliente'`) sem vínculo com
 * item de checklist, agrupados pela categoria com que foram enviados. Documento
 * enviado antes desta tela existir tem categoria `outros` e aparece no grupo
 * "Outros documentos", que é o que ele é.
 */
export function montarGruposColeta(
  checklist: ChecklistSolicitadoItem[],
  docs: DocumentoArquivoRow[],
): GrupoColeta[] {
  const nomesPorGrupo = new Map<GrupoColetaKey, Set<string>>();
  for (const item of checklist) {
    const key = grupoDaEntidade(item.entidade || '');
    const set = nomesPorGrupo.get(key) ?? new Set<string>();
    set.add(item.documento);
    nomesPorGrupo.set(key, set);
  }

  const doCliente = docs.filter((d) => d.fonte === 'cliente' && d.checklist_item_id == null);
  const arquivosPorCategoria = new Map<string, DocumentoArquivoRow[]>();
  for (const doc of doCliente) {
    const lista = arquivosPorCategoria.get(doc.categoria) ?? [];
    lista.push(doc);
    arquivosPorCategoria.set(doc.categoria, lista);
  }

  return GRUPOS_COLETA.map((grupo) => ({
    ...grupo,
    documentos: Array.from(nomesPorGrupo.get(grupo.key) ?? []).sort((a, b) =>
      a.localeCompare(b, 'pt-BR'),
    ),
    arquivos: arquivosPorCategoria.get(grupo.categoria) ?? [],
  }));
}
