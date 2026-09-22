import { useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { type LinhaDeAtividade } from '@/lib/feedAtividade';
import { STALE_TIMES } from '@/lib/queryClient';

/**
 * Camada de dados da barra de atividade do feed.
 *
 * A contagem sai do banco, não da página carregada: a tela traz 20 comentários
 * por vez, e contar no front faria o número mudar a cada "ver mais".
 *
 * ⚠️ DÍVIDA TÉCNICA (cast de shim): `types.ts` ainda não conhece estas funções,
 * mesmo caso de `feed_org_comments`. Ver `docs/geral/divida-tipos-org-comments.md`.
 */
const RPC_ATIVIDADE = 'feed_atividade_por_cliente';
const RPC_CARIMBAR = 'marcar_feed_visto';
const RPC_CARIMBAR_TUDO = 'marcar_feed_visto_tudo';

/** Janela da barra, em dias. O não lido entra mesmo quando é mais velho. */
const JANELA_DIAS = 30;

/**
 * O `queryClient` da casa desliga o `refetchOnWindowFocus`, então sem isto nada
 * revalidaria com a lista congelada e o "há movimento novo" seria botão morto.
 */
const RECONFERIR_A_CADA = 60 * 1000;

/** Rolar dá vários blocos por lidos em segundos; represar junta num POST por cliente. */
const ESPERA_DO_CARIMBO = 1500;

export const feedAtividadeQueryKey = () => ['feed-atividade'] as const;

/** Lista estável enquanto não há dados — o consumidor congela por identidade. */
const SEM_LINHAS: LinhaDeAtividade[] = [];

interface SupabaseResult<T> {
  data: T | null;
  error: { message: string } | null;
}

type RpcShim = (
  fn: string,
  params?: Record<string, unknown>,
) => PromiseLike<SupabaseResult<unknown>>;

/**
 * `const chamar = supabase.rpc` perde o `this` e estoura por dentro (sintoma: a
 * barra presa no esqueleto). Por isso a chamada sai sempre do próprio cliente.
 */
const chamar: RpcShim = (fn, params) => (supabase.rpc as unknown as RpcShim)(fn, params);

/**
 * A tela não se redesenha com o que chega: a barra congela a leva que recebeu ao
 * abrir (ver `useAtividadeDoFeedController`). Isto alimenta o "Atualizar".
 */
export function useDomainFeedAtividade() {
  const query = useQuery({
    queryKey: feedAtividadeQueryKey(),
    queryFn: async (): Promise<LinhaDeAtividade[]> => {
      const { data, error } = await chamar(RPC_ATIVIDADE, { _janela_dias: JANELA_DIAS });
      if (error) throw error;
      return (data ?? []) as LinhaDeAtividade[];
    },
    staleTime: STALE_TIMES.SHORT,
    refetchInterval: RECONFERIR_A_CADA,
  });

  return {
    linhas: query.data ?? SEM_LINHAS,
    isLoading: query.isLoading,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

/**
 * Carimbar a leitura, represado: um carimbo por cliente, com o instante mais
 * alto da janela. A fila é despejada ao desmontar, senão quem lê e sai rápido
 * perderia o carimbo.
 */
export function useCarimbarLeitura() {
  const fila = useRef(new Map<string, string>());
  const relogio = useRef<number | null>(null);

  const despejar = useCallback(() => {
    const pendentes = [...fila.current.entries()];
    fila.current.clear();
    relogio.current = null;
    for (const [clienteId, ate] of pendentes) {
      // O `.then()` é obrigatório: o retorno do `rpc` é preguiçoso e só dispara
      // a requisição quando alguém o aguarda. Falha é silenciosa de propósito:
      // a próxima rolagem tenta de novo.
      void chamar(RPC_CARIMBAR, { _client_id: clienteId, _visto_ate: ate }).then(
        () => undefined,
        () => undefined,
      );
    }
  }, []);

  useEffect(() => () => despejar(), [despejar]);

  return useCallback(
    (porCliente: ReadonlyMap<string, string>) => {
      if (porCliente.size === 0) return;
      for (const [clienteId, ate] of porCliente) {
        const atual = fila.current.get(clienteId);
        if (!atual || ate > atual) fila.current.set(clienteId, ate);
      }
      if (relogio.current !== null) return;
      relogio.current = window.setTimeout(despejar, ESPERA_DO_CARIMBO);
    },
    [despejar],
  );
}

/** Gesto explícito, então invalida a barra: a pessoa pediu para ela mudar. */
export function useMarcarTudoVisto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await chamar(RPC_CARIMBAR_TUDO, { _visto_ate: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feedAtividadeQueryKey() }),
  });
}
