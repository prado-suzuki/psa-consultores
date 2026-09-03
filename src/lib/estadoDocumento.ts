import type { DocFonte, DocRevisao } from '@/hooks/useDocumentoArquivo';

/**
 * Os quatro estados em que um documento pedido pode estar, do ponto de vista de
 * quem olha a ficha de uma entidade.
 *
 * POR QUE ISTO EXISTE FORA DAS DUAS TELAS
 *
 * Consultor e cliente derivam "o que falta" de fontes diferentes (linha do
 * checklist derivado × pendência da RPC) e chamam as mesmas coisas por nomes
 * diferentes ("Pendente" lá, "Falta enviar" cá). O que NÃO pode divergir é a
 * conta: se um lado classificar como "em análise" o que o outro conta como
 * "aprovado", os dois passam a discordar sobre o mesmo arquivo. Então a regra
 * mora aqui, e cada tela só escolhe o RÓTULO. A cor deixou de ser escolha da tela
 * em 03/09/2026 e virou `estadoDocumentoColors`, no arquivo ao lado: o portal
 * pintava âmbar e rosa do estoque do Tailwind, o consultor pintava a âncora da
 * OSG, e nenhum dos dois acompanhava tema.
 *
 * OS ESTADOS SÃO EXCLUSIVOS, e a precedência sai do estado da PENDÊNCIA, não da
 * pilha de arquivos:
 *
 *   recebido  → sobra decidir entre `aprovado` e `em_analise`
 *   faltando  → sobra decidir entre `recusado` e `pendente`
 *
 * É isso que resolve o caso ambíguo: uma pendência com um arquivo recusado e um
 * aprovado está RECEBIDA (o bom vale), então ela é `aprovado` e não aparece em
 * "recusado" — senão o consultor perseguiria uma linha que já está resolvida.
 *
 * `nao_aplicavel` e `dispensado` não entram: não são estado de documento, são
 * ausência de pedido. Quem os tem devolve `null` antes de chamar.
 */
export type EstadoDocumento = 'pendente' | 'em_analise' | 'recusado' | 'aprovado';

/** A ordem em que os quatro aparecem, do que pede ação ao que já está resolvido. */
export const ESTADOS_DOCUMENTO: readonly EstadoDocumento[] = [
  'pendente', 'em_analise', 'recusado', 'aprovado',
];

/** O que a conta precisa saber de um arquivo. */
export interface ArquivoParaEstado {
  revisao: DocRevisao;
  /**
   * Opcional porque a leitura do cliente só devolve os arquivos dele. Ausente
   * conta como `cliente`, que é o caso que pede revisão.
   */
  fonte?: DocFonte;
}

/**
 * O estado de uma pendência, dado se ela está recebida e o que chegou nela.
 *
 * `recebido` vem pronto de quem chama (a RPC no cliente, a derivação no
 * consultor) e já embute a regra de que arquivo recusado não fecha pendência.
 * Aqui só se decide QUAL das quatro caixas, nunca se a pendência fechou.
 */
export function estadoDoDocumento(
  recebido: boolean,
  arquivos: readonly ArquivoParaEstado[],
): EstadoDocumento {
  if (recebido) {
    // Arquivo da PSA não passa por aprovação, então não segura a ficha em
    // "em análise": o que a casa subiu já vale. Só o que veio do cliente e
    // ninguém olhou ainda mantém a pendência sob revisão.
    const aRevisar = arquivos.some((arquivo) => arquivo.revisao === 'pendente'
      && (arquivo.fonte ?? 'cliente') === 'cliente');
    return aRevisar ? 'em_analise' : 'aprovado';
  }
  return arquivos.some((arquivo) => arquivo.revisao === 'recusado') ? 'recusado' : 'pendente';
}

/**
 * Quantas pendências em cada estado, para os botões de filtro do card.
 *
 * Devolve o mapa com os quatro sempre presentes (zero inclusive): quem monta a
 * tela decide se esconde o vazio, e não precisa tratar `undefined`.
 */
export function contarEstados(
  estados: readonly (EstadoDocumento | null)[],
): Record<EstadoDocumento, number> {
  const contagem: Record<EstadoDocumento, number> = {
    pendente: 0, em_analise: 0, recusado: 0, aprovado: 0,
  };
  for (const estado of estados) {
    if (estado) contagem[estado] += 1;
  }
  return contagem;
}
