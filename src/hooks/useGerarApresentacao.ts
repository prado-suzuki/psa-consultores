import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
 */
export function useGerarApresentacao(clienteId: string | null) {
  const [gerando, setGerando] = useState<DeckTipo | null>(null);

  const gerar = async (tipo: DeckTipo): Promise<ResultadoDosDecks> => {
    if (!clienteId) return { arquivos: [], erro: 'nenhum cliente selecionado' };
    if (gerando) return { arquivos: [], erro: 'já há uma geração em andamento' };
    setGerando(tipo);
    try {
      const { data, error } = await supabase.functions.invoke<{ arquivos: ArquivoGerado[] }>(EDGE_FN, {
        body: { clienteId, tipo },
      });
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
      };
    } catch (e) {
      return { arquivos: [], erro: e instanceof Error ? e.message : 'a geração falhou' };
    } finally {
      setGerando(null);
    }
  };

  return { gerar, gerando };
}
