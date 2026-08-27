/**
 * Camada de dados das NOTIFICAÇÕES do Agente PSA.
 *
 * Mesma disciplina de `useDomainAgentePsa`: tudo pela edge function, nada de
 * `supabase.from('agente_notificacoes')`. Aqui o motivo é mais forte que a
 * tipagem — a notificação é endereçada ao ESCOPO, não a uma pessoa, e quem
 * decide se você recebe é a hierarquia de papéis do `agente_config`. Essa
 * hierarquia vive no Deno (`acesso.ts`); replicá-la numa policy SQL criaria uma
 * segunda definição da mesma regra de acesso, que sairia de sincronia no
 * primeiro papel novo. Por isso as duas tabelas têm RLS habilitada e NENHUMA
 * policy para `authenticated`: o navegador não as alcança, por construção.
 *
 * O que chega aqui é só o que esta pessoa ainda não viu, nos escopos que ela
 * pode ver, e nunca o que ela mesma gerou (ela acabou de ler a resposta).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invocarAgente } from '@/lib/agenteApi';

export type TipoNotificacao = 'insight_critico' | 'analise_estrategica';

export interface NotificacaoAgente {
  id: string;
  escopo: string;
  /** Rótulo do escopo, como o cockpit o nomeia. Vem do servidor, não do front. */
  escopoRotulo: string;
  tipo: TipoNotificacao;
  titulo: string;
  texto: string;
  severidade: 'alta' | 'media' | 'baixa';
  criadoEm: string;
}

/**
 * Intervalo do polling. 90s é lento o suficiente para não pesar (uma chamada
 * de função por usuário logado) e rápido o suficiente para um insight crítico
 * chegar dentro da mesma reunião em que foi gerado.
 *
 * Não é realtime de propósito: realtime exigiria leitura direta da tabela, e
 * portanto a policy SQL que o cabeçalho acima explica por que não existe.
 */
const INTERVALO_MS = 90_000;

export const notificacoesQueryKey = ['agente-psa', 'notificacoes'] as const;

export function useAgenteNotificacoes(habilitado: boolean) {
  return useQuery({
    queryKey: notificacoesQueryKey,
    queryFn: () => invocarAgente<{ notificacoes: NotificacaoAgente[] }>({ acao: 'notificacoes' }),
    enabled: habilitado,
    refetchInterval: habilitado ? INTERVALO_MS : false,
    // Voltar para a aba é o momento mais provável de existir coisa nova.
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    // Falha aqui é silenciosa por escolha: notificação que não chegou não pode
    // virar toast de erro em cima de quem está trabalhando na tela.
    retry: 1,
  });
}

/**
 * Marca como vista. `dispensada` distingue "abri e li" de "fechei sem abrir" —
 * fechar sem abrir é sinal de ruído, e o cockpit vai querer medir isso.
 *
 * Atualização otimista: o cartão sai da tela no clique, sem esperar a rede.
 * Se a chamada falhar, o `invalidateQueries` do final traz a notificação de
 * volta no próximo ciclo, o que é o comportamento certo — ela continua não vista.
 */
export function useMarcarNotificacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['agente-psa', 'marcar-notificacao'],
    mutationFn: (vars: { notificacaoId: string; dispensada?: boolean }) =>
      invocarAgente<{ ok: true }>({ acao: 'marcar_notificacao', ...vars }),
    onMutate: ({ notificacaoId }) => {
      const anterior = queryClient.getQueryData<{ notificacoes: NotificacaoAgente[] }>(
        notificacoesQueryKey,
      );
      if (anterior) {
        queryClient.setQueryData(notificacoesQueryKey, {
          notificacoes: anterior.notificacoes.filter((n) => n.id !== notificacaoId),
        });
      }
      return { anterior };
    },
    onError: (_erro, _vars, contexto) => {
      if (contexto?.anterior) {
        queryClient.setQueryData(notificacoesQueryKey, contexto.anterior);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificacoesQueryKey });
    },
  });
}
