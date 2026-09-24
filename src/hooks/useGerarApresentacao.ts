import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import { baixarArquivoPorUrl } from '@/lib/osg/baixarArquivoPorUrl';

/** Os decks que a `gerar-apresentacao` monta: capítulos 01, 02 e 04. O 03, tributário, sai por outra função. */
export type DeckDaApresentacao = 'patrimonial' | 'societaria' | 'sucessoria';

/**
 * Um deck que o servidor gerou, gravou e devolveu por URL assinada.
 *
 * **Deixou de vir em base64 em 21/09/2026.** A geração passou a persistir: cada
 * deck é um arquivo em `osg-apresentacoes` e uma linha em `osg_apresentacao`, com
 * versão e checksum. Antes os bytes voltavam inline — 1,5 MB por deck no corpo da
 * resposta — e nada ficava, então não havia como dizer o que foi entregue nem
 * quando.
 */
export interface ArquivoGerado {
  tipo: DeckDaApresentacao;
  nome: string;
  /** Assinada e de vida curta. `null` se o registro ficou e a assinatura falhou. */
  url: string | null;
  apresentacaoId: string;
  versao: number;
}

// Contrato com a `gerar-apresentacao`: body { clienteId, tipos, simulacaoIds? } → { arquivos, erros?,
// problemas? }; 500 { error, detalhes: ErroDeDeck[] } quando nenhum deck saiu.
const EDGE_FN = 'gerar-apresentacao';

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
  arquivos: Pick<ArquivoGerado, 'tipo' | 'nome' | 'apresentacaoId' | 'versao'>[];
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
  /** `sistema` é falha nossa: o analista só avisa o suporte da PSA Digital. */
  tipo: 'origem' | 'formatacao' | 'sistema';
  /** A parte do arquivo ("Organograma", "Quadro Societário"), pela qual a tela agrupa. */
  onde: string;
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
 * O motivo de cada deck quando todos falharam: a função manda `detalhes` no 500, e o `supabase-js` descarta
 * o corpo e fica com "Edge Function returned a non-2xx status code".
 */
async function errosDoCorpo(erro: unknown): Promise<ErroDeDeck[]> {
  const contexto = (erro as { context?: unknown } | null)?.context;
  if (!(contexto instanceof Response)) return [];
  try {
    const corpo = await contexto.clone().json();
    return Array.isArray(corpo?.detalhes)
      ? corpo.detalhes.filter((d: unknown): d is ErroDeDeck =>
        typeof (d as ErroDeDeck)?.tipo === 'string' && typeof (d as ErroDeDeck)?.message === 'string')
      : [];
  } catch {
    return [];
  }
}

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
 * **Sobre a invalidação de cache, que ainda não está aqui.** No molde ela existe
 * porque a geração grava uma linha e a lista "já geradas" precisa recarregar.
 * Desde 21/09/2026 esta geração TAMBÉM grava — mas a lista da OSG ainda não
 * existe, então não há consulta a invalidar. Ela entra junto com a lista, e não
 * antes: `invalidateQueries` de uma chave que ninguém consulta é código que nunca
 * roda e que faz parecer que o histórico já está na tela.
 *
 * **A mutation não rejeita por erro de negócio.** Quem marca as duas peças
 * precisa saber qual das duas não veio, e um `throw` só diz que algo falhou.
 * Por isso o resultado sai sempre preenchido e o `erro` é o campo que responde;
 * é o `conferirDecksGerados` que confronta o pedido com o que voltou.
 */
/** `simulacaoIds` é do capítulo 04 (o último ato de cada cenário) e só vai quando o `sucessoria` foi pedido. */
export function useGerarApresentacao(clienteId: string | null, simulacaoIds: readonly string[] = []) {
  const { logAction } = useAuditLog();

  const mutation = useMutation({
    /* A lista do que foi marcado: com três decks, um `tipo` só mandaria um. */
    mutationFn: async (tipos: readonly DeckDaApresentacao[]): Promise<ResultadoDosDecks> => {
      if (!clienteId) return { arquivos: [], erro: 'nenhum cliente selecionado' };
      const { data, error } = await supabase.functions.invoke<{
        arquivos: ArquivoGerado[];
        erros?: ErroDeDeck[];
        problemas?: ProblemaDoDeck[];
      }>(EDGE_FN, {
        body: tipos.includes('sucessoria') ? { clienteId, tipos, simulacaoIds } : { clienteId, tipos },
      });
      if (error) {
        return {
          arquivos: [],
          erro:
            statusDoErro(error) === 404
              ? 'a geração ainda não está publicada no servidor'
              : error.message || 'a geração falhou no servidor',
          errosPorDeck: await errosDoCorpo(error),
        };
      }
      const arquivos = data?.arquivos ?? [];
      if (!arquivos.length) return { arquivos: [], erro: 'o servidor não devolveu nenhum arquivo' };

      /*
       * UM A UM, e em série. O navegador não dispara vários downloads seguidos de
       * forma confiável se eles competirem, e o `baixarArquivoPorUrl` busca os
       * bytes antes de clicar no link local — é a MESMA peça que a geração
       * tributária usa, o que o comentário antigo prometia para o dia em que esta
       * passasse a persistir.
       *
       * Falha de download NÃO invalida a geração: o arquivo está gravado e
       * versionado, e a tela pode oferecê-lo de novo. Por isso o erro entra em
       * `errosPorDeck`, ao lado dos do servidor, em vez de derrubar o resultado.
       */
      const falhasAoBaixar: ErroDeDeck[] = [];
      for (const f of arquivos) {
        if (!f.url) {
          falhasAoBaixar.push({ tipo: f.tipo, message: 'a apresentação ficou guardada, mas o link para baixar não veio' });
          continue;
        }
        try {
          await baixarArquivoPorUrl(f.url, f.nome);
        } catch (e) {
          falhasAoBaixar.push({ tipo: f.tipo, message: (e as Error)?.message ?? 'o download falhou' });
        }
      }

      return {
        arquivos: arquivos.map(({ tipo, nome, apresentacaoId, versao }) => ({
          tipo, nome, apresentacaoId, versao,
        })),
        erro: null,
        problemas: data?.problemas ?? [],
        errosPorDeck: [...(data?.erros ?? []), ...falhasAoBaixar],
      };
    },

    /**
     * O rastro, agora APONTANDO PARA A APRESENTAÇÃO — uma linha por deck.
     *
     * Era uma linha só, com `entity_id` = cliente, porque nada era persistido e
     * não havia id de apresentação para apontar; o log respondia "quem gerou deck
     * de qual cliente" e nada mais. Com a `osg_apresentacao`, cada deck tem id e
     * versão, então a pergunta que passa a ter resposta é "quem gerou a v3 do
     * quadro societário deste cliente, e quando" — que é a que aparece quando
     * alguém pergunta de onde veio o arquivo que está na mão do cliente.
     *
     * Duas chamadas quando saem os dois decks, de propósito: são dois artefatos
     * distintos, com versões próprias, e juntá-los num registro só perderia
     * exatamente o id que dá para rastrear.
     */
    onSuccess: async (resultado) => {
      if (!clienteId) return;
      for (const a of resultado.arquivos) {
        await logAction({
          area: 'osg',
          entity_type: 'apresentacao_osg',
          entity_id: a.apresentacaoId,
          entity_name: a.nome,
          action: 'created',
          details: `Deck ${a.tipo} v${a.versao} gerado para o cliente ${clienteId}.`,
        });
      }
    },
  });

  return mutation;
}
