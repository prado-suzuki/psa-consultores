import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';

/**
 * QueryClient global da aplicação.
 *
 * Defaults conservadores: 1 minuto de staleTime, sem refetch ao focar a
 * janela. Hooks individuais sobrescrevem quando precisam de comportamento
 * diferente (ex: useSelicData usa 24h por ser dado histórico imutável).
 *
 * Para futuras categorias de cache, exportamos `STALE_TIMES` como tabela
 * de referência — usar nos hooks (`staleTime: STALE_TIMES.SHORT`) torna
 * a intenção explícita e padroniza a manutenção.
 */

export const STALE_TIMES = {
  /** Dados que mudam constantemente (chamados em andamento, notificações). */
  REALTIME: 0,
  /** Dados de operação cotidiana (tarefas, sprints, dashboards). */
  SHORT: 60 * 1000, // 1 min
  /** Dados de referência que mudam pouco (cadastros, áreas, equipes). */
  MEDIUM: 5 * 60 * 1000, // 5 min
  /** Dados raramente atualizados (papéis, permissões de página). */
  LONG: 30 * 60 * 1000, // 30 min
  /** Dados praticamente imutáveis (histórico Selic, NCM, etc.). */
  IMMUTABLE: 24 * 60 * 60 * 1000, // 24 h
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.SHORT,
      gcTime: 10 * 60 * 1000, // 10 min em memória após sair de tela
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Não retentar em erros de permissão/auth (4xx geralmente).
        const message = error instanceof Error ? error.message : String(error);
        if (/40[1-4]|forbidden|unauthorized/i.test(message)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        logger.error('Mutation falhou', error, { scope: 'QueryClient' });
      },
    },
  },
});
