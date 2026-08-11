import type { BlocoGerado } from '@/lib/templates';

const AVISO_RASCUNHO = '*RASCUNHO — DOCUMENTO INCOMPLETO*';

export interface DownloadDocumento {
  nome: string;
  blocos: BlocoGerado[];
}

/**
 * Marca de forma inequívoca o arquivo que a pessoa decidiu baixar apesar das
 * pendências. Documento completo atravessa sem alteração.
 */
export function prepararDownloadDocumento(
  nomeModelo: string,
  blocos: BlocoGerado[],
  rascunho: boolean,
): DownloadDocumento {
  if (!rascunho) return { nome: nomeModelo, blocos };

  const aviso: BlocoGerado = {
    id: '__rascunho__',
    tipo: 'livre',
    obrigatorio: true,
    conteudo: AVISO_RASCUNHO,
    segmentos: [{ tipo: 'texto', texto: AVISO_RASCUNHO }],
  };
  return { nome: `${nomeModelo} (rascunho)`, blocos: [aviso, ...blocos] };
}
