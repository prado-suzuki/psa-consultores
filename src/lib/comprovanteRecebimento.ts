// Modelo PURO do comprovante de recebimento de documentos — fonte ÚNICA de texto
// e números, compartilhada pelo PDF (ComprovanteDocument) e pelo teste. Sem JSX,
// sem import de asset: roda no browser e em node.
//
// Princípio, o mesmo de `src/utils/pdf/sopModel.ts`: toda derivação, filtro,
// ordenação e formatação acontece AQUI uma vez só, para que o PDF e o teste leiam
// exatamente os mesmos valores.
//
// A FUNÇÃO NÃO DECIDE DE ONDE VEM A LISTA (decisão de 17/08/2026). Ela recebe os
// documentos já buscados. Hoje quem chama passa os de uma solicitação; passar os
// de um cliente inteiro é trocar o argumento, não reescrever o modelo.
//
// A DATA DE EMISSÃO ENTRA POR PARÂMETRO, e isto não é preciosismo: se o relógio
// fosse lido aqui dentro, o teste viraria frágil ou exigiria simulação de tempo.
// Mesmo motivo pelo qual o modelo do SOP resolve a data fora do componente.
//
// AGRUPAMENTO. Agrupa pela categoria do documento, via `grupoDaCategoria`, e usa
// `GRUPOS_DOCUMENTO` como fonte dos rótulos e da ordem dos grupos.
//   O comentário de `agrupadorDocumentos.ts` avisa para não usar `grupoDaCategoria`
//   como eixo do que foi PEDIDO, porque pedido agrupa pela coluna `grupo` da
//   solicitação. Aqui não se aplica: o comprovante lista o que CHEGOU, e
//   documento_arquivo tem `solicitacao_id` mas NÃO tem `solicitacao_item_id` nem
//   coluna `grupo` (conferido no banco em 17/08/2026). Documento recebido não
//   herda grupo de item nenhum, então a categoria é o único eixo disponível.
//
// ORDEM CRESCENTE por data de chegada, ao contrário da tela, que é decrescente:
// comprovante é cronologia.
import { GRUPOS_DOCUMENTO, grupoDaCategoria, type GrupoDocumentoKey } from './agrupadorDocumentos';
import type { DocCategoria } from '@/hooks/useDocumentoArquivo';

/**
 * O mínimo que o modelo precisa de cada documento. Deliberadamente menor que
 * `DocumentoArquivoRow`: assim o teste monta o caso com quatro campos em vez de
 * fabricar a linha inteira do banco.
 */
export interface DocumentoDoComprovante {
  id: string;
  /** Nome do arquivo como o cliente enviou. A coluna é `nome_original`. */
  nome_original: string | null;
  categoria: DocCategoria;
  fonte: string;
  excluido: boolean;
  /** Data de chegada. É `created_at`, nunca a de triagem nem a de atualização. */
  created_at: string | null;
  created_by: string | null;
}

export interface ComprovanteInput {
  clienteNome: string;
  documentos: DocumentoDoComprovante[];
  /** Mapa de id de usuário para nome exibível, como `useUploaderNames` devolve. */
  nomesPorUsuario: Record<string, string>;
  /** Injetada por quem chama; nunca lida do relógio aqui dentro. */
  emitidoEm: Date;
  /** Identifica a solicitação no comprovante. Ausente = comprovante do cliente. */
  solicitacao?: {
    enviadaEm: string | null;
    encerradaEm: string | null;
  };
}

export interface ItemDoComprovante {
  /** 1-based, contínuo dentro do grupo. */
  ordem: number;
  arquivo: string;
  /** dd/mm/aaaa às hh:mm, ou travessão. */
  recebidoEm: string;
  /** Nome de quem enviou, ou travessão quando o autor é nulo ou desconhecido. */
  enviadoPor: string;
}

export interface GrupoDoComprovante {
  key: GrupoDocumentoKey;
  titulo: string;
  subtitulo: string;
  itens: ItemDoComprovante[];
}

export interface ComprovanteModel {
  clienteNome: string;
  /** dd/mm/aaaa às hh:mm da emissão. */
  emitidoEm: string;
  /** Vazio quando não há solicitação, para o documento simplesmente não exibir. */
  solicitacaoEnviadaEm: string;
  solicitacaoEncerradaEm: string;
  total: number;
  /** Só os grupos com pelo menos um item, na ordem canônica de GRUPOS_DOCUMENTO. */
  grupos: GrupoDoComprovante[];
}

const TRAVESSAO = '—';

/** dd/mm/aaaa às hh:mm. Data ausente ou inválida vira travessão. */
function formatarDataHora(valor: string | Date | null | undefined): string {
  if (!valor) return TRAVESSAO;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return TRAVESSAO;
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()} às ${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

/**
 * Monta o modelo do comprovante.
 *
 * Recorte: só `fonte = 'cliente'` e `excluido = false`. É o mesmo recorte da
 * policy do portal no banco e da tela do cliente. Documento que a casa produziu
 * e documento arquivado ficam fora por decisão da tarefa: o comprovante atesta
 * o que o CLIENTE entregou.
 */
export function montarComprovante(entrada: ComprovanteInput): ComprovanteModel {
  const { clienteNome, documentos, nomesPorUsuario, emitidoEm, solicitacao } = entrada;

  const recebidos = documentos.filter((d) => d.fonte === 'cliente' && d.excluido === false);

  const porGrupo = new Map<GrupoDocumentoKey, DocumentoDoComprovante[]>();
  for (const doc of recebidos) {
    const key = grupoDaCategoria(doc.categoria);
    const lista = porGrupo.get(key);
    if (lista) lista.push(doc);
    else porGrupo.set(key, [doc]);
  }

  const grupos: GrupoDoComprovante[] = [];
  for (const def of GRUPOS_DOCUMENTO) {
    const docs = porGrupo.get(def.key);
    if (!docs || docs.length === 0) continue;

    // Crescente por chegada. Empate resolvido pelo id, para a ordem não depender
    // da ordem em que o banco devolveu as linhas.
    docs.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : Number.POSITIVE_INFINITY;
      const tb = b.created_at ? Date.parse(b.created_at) : Number.POSITIVE_INFINITY;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });

    grupos.push({
      key: def.key,
      titulo: def.titulo,
      subtitulo: def.subtitulo,
      itens: docs.map((doc, i) => ({
        ordem: i + 1,
        arquivo: doc.nome_original?.trim() || TRAVESSAO,
        recebidoEm: formatarDataHora(doc.created_at),
        // Travessão quando o autor é nulo OU quando o mapa não resolve o nome.
        // O segundo caso é real: `baixado_por`/`created_by` não têm chave
        // estrangeira, então usuário removido não volta da RPC de nomes.
        enviadoPor: (doc.created_by && nomesPorUsuario[doc.created_by]) || TRAVESSAO,
      })),
    });
  }

  return {
    clienteNome,
    emitidoEm: formatarDataHora(emitidoEm),
    solicitacaoEnviadaEm: solicitacao ? formatarDataHora(solicitacao.enviadaEm) : '',
    solicitacaoEncerradaEm: solicitacao ? formatarDataHora(solicitacao.encerradaEm) : '',
    total: recebidos.length,
    grupos,
  };
}
