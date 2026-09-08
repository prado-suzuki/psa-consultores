// O modelo em branco de um documento do catálogo.
//
// Alguns documentos que a OSG pede não são documento que o cliente já tem (CPF,
// matrícula): são planilha que a PSA manda EM BRANCO para ele preencher. O endereço
// dessa planilha mora em `documento_tipo`, no CATÁLOGO — nunca na linha do cliente —,
// porque o arquivo é o mesmo para todos e trocá-lo no balde vale para todo mundo no
// mesmo instante.

export interface ModeloDocumento {
  bucket: string;
  path: string;
  nome: string;
}

/** As três colunas de `documento_tipo`, como o PostgREST e as RPCs as devolvem. */
export interface ColunasModelo {
  modelo_bucket: string | null;
  modelo_path: string | null;
  modelo_nome: string | null;
}

/**
 * Normaliza as três colunas do catálogo no objeto que a tela consome.
 *
 * `modelo_path` é o campo que LIGA a feature: sem ele não há botão, e é por isso que
 * a ausência devolve `null` em vez de um objeto meio preenchido. O nome cai no
 * basename do caminho quando `modelo_nome` está vazio — o mesmo recorte que as duas
 * RPCs do portal fazem por `regexp_replace`, para os dois lados escreverem o mesmo
 * nome na tela.
 */
export function resolverModelo(
  fonte: ColunasModelo | null | undefined,
): ModeloDocumento | null {
  const path = fonte?.modelo_path?.trim();
  const bucket = fonte?.modelo_bucket?.trim();
  if (!path || !bucket) return null;
  const nome = fonte?.modelo_nome?.trim() || path.slice(path.lastIndexOf('/') + 1);
  return { bucket, path, nome };
}
