import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';

// Decks da apresentação PSA (segue a separação do pptx original).
export type DeckDaApresentacao = 'patrimonial' | 'societaria';
export type DeckTipo = 'ambas' | DeckDaApresentacao;

export type ArquivoGerado = { tipo: DeckDaApresentacao; nome: string; b64: string };

// Contrato com a Edge Function `gerar-apresentacao` (Deno; SEM Storage — a função
// gera e devolve os bytes inline em base64, não persiste mais nada):
//   body → { clienteId: string; tipo: DeckTipo }
//   resp → { arquivos: ArquivoGerado[] }   (cada deck em base64)
const EDGE_FN = 'gerar-apresentacao';

const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Os bytes voltam inline em base64 (a função não salva no Storage). Decodifica para
// um Blob e baixa via object URL same-origin: respeita o `nome` e garante que todos
// os arquivos venham (o navegador não dispara múltiplos downloads cross-origin de
// forma confiável).
//
// NÃO DÁ PARA USAR O `baixarArquivoPorUrl`, que a peça tributária usa: aquele
// recebe URL do Storage e busca os bytes, e aqui os bytes já estão na mão. Os dois
// caminhos convergem no dia em que esta geração passar a persistir.
function baixar(b64: string, nome: string) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const obj = URL.createObjectURL(new Blob([arr], { type: PPTX_MIME }));
  const a = document.createElement('a');
  a.href = obj;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(obj);
}

/**
 * O que saiu da geração — quem avisa o usuário é quem chamou.
 *
 * UM FORMATO SÓ, e não uma união discriminada: o projeto compila com
 * `strict: false`, e sem `strictNullChecks` o `if (r.ok)` não estreita a união
 * — o `else` continuaria vendo os dois lados. Com um objeto só, `erro` é a
 * pergunta e `null` é a resposta boa.
 */
export interface ResultadoDosDecks {
  /** Os arquivos que o navegador recebeu e disparou para download. */
  arquivos: Pick<ArquivoGerado, 'tipo' | 'nome'>[];
  /** Por que não veio. `null` quando veio. */
  erro: string | null;
  /**
   * Buracos de cadastro: o arquivo **saiu**, e saiu faltando coisa — empresa fora
   * do quadro, bem sem sociedade de destino, titular em placeholder.
   *
   * Nada disso impede a geração, e é por isso que ia calado até 09/2026: quem
   * apresentava descobria na reunião. Mesmo vocabulário do gerador tributário
   * (`origem` | `formatacao`), para a tela tratar os dois do mesmo jeito.
   */
  problemas?: ProblemaDoDeck[];
  /** A exceção de UM deck, quando o outro veio. O servidor já mandava; ninguém lia. */
  errosPorDeck?: ErroDeDeck[];
}

export interface ProblemaDoDeck {
  tipo: 'origem' | 'formatacao';
  detalhe: string;
}

export interface ErroDeDeck {
  tipo: DeckDaApresentacao;
  message: string;
}

/** O 404 do `invoke` é função não publicada no ambiente, e vale dizer isso. */
const statusDoErro = (erro: unknown): number | undefined =>
  (erro as { context?: { status?: number } } | null)?.context?.status;

/**
 * Dispara a geração dos decks .pptx no servidor e baixa o resultado.
 *
 * NÃO AVISA NADA SOZINHA, e isso mudou em 18/09/2026. A função dava o próprio
 * toast, e a tela dava o dela ao gerar o deck tributário logo em seguida — com
 * `TOAST_LIMIT = 1`, o segundo tomava o lugar do primeiro. Quem marcava as três
 * peças via UM aviso, o de sucesso, enquanto dois dos três arquivos não tinham
 * vindo. Quem chama agora junta os dois resultados e dá um aviso só.
 *
 * A mensagem antiga também mandava "por ora, use 'Copiar tabela'" — botão que
 * saiu da tela quando ela deixou de mostrar as tabelas.
 *
 * ## Por que é `useMutation`, no molde do `useGerarApresentacaoTributaria`
 *
 * Esta geração e a do papel de trabalho saem da MESMA TELA e faziam a mesma
 * coisa de dois jeitos: aquela em React Query com auditoria, esta em `useState`
 * cru e sem rastro nenhum. Dois jeitos de gerar slide na mesma base é o que a
 * migração existe para acabar, e `isPending` no lugar de um `gerando` caseiro é
 * o que deixa a tela tratar as duas peças pelo mesmo caminho.
 *
 * **O que NÃO se copiou do molde, e por quê:** a invalidação de cache. Lá ela
 * existe porque a geração grava uma linha em `wp_apresentacao` e a lista "já
 * geradas" precisa recarregar. Aqui nada é persistido — a função devolve os
 * bytes e esquece —, então não há consulta a invalidar. Copiar o
 * `invalidateQueries` daria a impressão de que existe histórico onde não existe.
 *
 * **A mutation não rejeita por erro de negócio.** Quem marca as duas peças
 * precisa saber qual das duas não veio, e um `throw` só diz que algo falhou.
 * Por isso o resultado sai sempre preenchido e o `erro` é o campo que responde;
 * é o `conferirDecksGerados` que confronta o pedido com o que voltou.
 */
export function useGerarApresentacao(clienteId: string | null) {
  const { logAction } = useAuditLog();

  const mutation = useMutation({
    mutationFn: async (tipo: DeckTipo): Promise<ResultadoDosDecks> => {
      if (!clienteId) return { arquivos: [], erro: 'nenhum cliente selecionado' };
      const { data, error } = await supabase.functions.invoke<{
        arquivos: ArquivoGerado[];
        erros?: ErroDeDeck[];
        problemas?: ProblemaDoDeck[];
      }>(EDGE_FN, { body: { clienteId, tipo } });
      if (error) {
        return {
          arquivos: [],
          erro:
            statusDoErro(error) === 404
              ? 'a geração ainda não está publicada no servidor'
              : error.message || 'a geração falhou no servidor',
        };
      }
      const arquivos = data?.arquivos ?? [];
      if (!arquivos.length) return { arquivos: [], erro: 'o servidor não devolveu nenhum arquivo' };

      // baixa um a um (blob a blob) — garante todos os arquivos e o nome correto
      for (const f of arquivos) baixar(f.b64, f.nome);
      return {
        arquivos: arquivos.map(({ tipo, nome }) => ({ tipo, nome })),
        erro: null,
        problemas: data?.problemas ?? [],
        errosPorDeck: data?.erros ?? [],
      };
    },

    /**
     * O rastro que faltava.
     *
     * O `entity_id` é o CLIENTE, e não o arquivo: nada é persistido, então não
     * existe id de apresentação para apontar, e a pergunta que se faz ao log é
     * "quem gerou deck de qual cliente". O nome dos arquivos vai no
     * `entity_name`, que é o que identifica o que saiu.
     */
    onSuccess: async (resultado) => {
      if (!clienteId || !resultado.arquivos.length) return;
      await logAction({
        area: 'osg',
        entity_type: 'apresentacao_osg',
        entity_id: clienteId,
        entity_name: resultado.arquivos.map((a) => a.nome).join(', '),
        action: 'created',
        details:
          resultado.arquivos.length === 1
            ? `Deck ${resultado.arquivos[0].tipo} gerado.`
            : `Decks gerados: ${resultado.arquivos.map((a) => a.tipo).join(' e ')}.`,
      });
    },
  });

  return mutation;
}
