// Contexto + hook de consumo do tour guiado. Vive num módulo SEM componentes
// (evita o aviso do eslint react-refresh ao exportar contexto e componente do
// mesmo arquivo). Quem preenche é o `TourProvider`.

import { createContext, useContext } from 'react';

export interface TourApi<Id extends string = string> {
  /** Abre um tour específico. */
  startTour: (id: Id) => void;
  /**
   * Abre o tour só se ele nunca foi visto, e marca como visto.
   *
   * É o que modal e diálogo precisam: a âncora deles só existe com aquilo
   * aberto, então o auto-open por rota não alcança. Quem chama não precisa
   * saber onde a flag mora.
   */
  startTourOnce: (id: Id) => void;
  /** Abre o tour mapeado para a rota informada. */
  startForRoute: (pathname: string) => void;
  /**
   * Há provider acima. Componente compartilhado entre áreas usa isto para não
   * oferecer um "?" que não faria nada (ex.: o modal de cliente na OSG,
   * enquanto ela não tiver os seus tours).
   */
  disponivel: boolean;
  /**
   * Há tour rodando agora.
   *
   * Quem vive dentro de um `Dialog` do Radix precisa disto: o tooltip do tour é
   * renderizado num portal em `document.body`, ou seja FORA do conteúdo do
   * diálogo, então clicar em "Próximo" chega no `onInteractOutside` como se
   * fosse clique fora. Sem a guarda, o guia do cadastro dispararia a
   * confirmação de saída no primeiro passo.
   */
  emAndamento: boolean;
}

export const TourContext = createContext<TourApi | null>(null);

// Fallback no-op para quando o gatilho é renderizado fora do provider (ex.:
// componente testado em isolamento). No app real o provider vive no layout da
// área, então o "?" sempre funciona.
const API_INERTE: TourApi = {
  startTour: () => {},
  startTourOnce: () => {},
  startForRoute: () => {},
  disponivel: false,
  emAndamento: false,
};

/**
 * O parâmetro de tipo estreita os ids para o módulo que chama (`useTour<TourId>()`),
 * mantendo um único contexto: os ids válidos são os do registro que montou o
 * provider daquela árvore, e é ele quem define o tipo do lado de fora.
 */
export function useTour<Id extends string = string>(): TourApi<Id> {
  return (useContext(TourContext) ?? API_INERTE) as TourApi<Id>;
}
