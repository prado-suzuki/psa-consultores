/**
 * Camada de dados do Agente PSA.
 *
 * TODA leitura e escrita passa pela edge function `agente-psa` — nenhum
 * `supabase.from('agente_*')` aqui, nem nos componentes. Duas razões:
 *
 * 1. As tabelas `agente_*` não têm policy de INSERT de propósito. Quem escreve
 *    mensagem, insight e lição é o service role dentro da função; se o
 *    navegador escrevesse, o histórico de aprendizado seria adulterável e o
 *    "volume de insights gerados" do cockpit não mediria nada.
 * 2. O `types.ts` é gerado a partir do banco de cada branch. Enquanto a
 *    migration do agente não estiver aplicada nos dois bancos, tipagem gerada
 *    para `agente_*` não existe — e a regra da casa proíbe cast de contorno.
 *    Falando só com a função, o front compila hoje e continua compilando
 *    depois, sem uma linha de gambiarra.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invocarAgente } from '@/lib/agenteApi';
import type { ContextoTela } from '@/hooks/useAgenteContexto';

export type ModoAgente = 'dados' | 'estrategia' | 'aprender';

export interface InsightAgente {
  id: string;
  texto: string;
  categoria: 'oportunidade' | 'risco' | 'execucao' | 'dado' | 'observacao';
  severidade: 'alta' | 'media' | 'baixa';
  util?: boolean | null;
  mensagem_id?: string;
}

export interface RespostaChat {
  conversaId: string;
  mensagemId: string;
  resposta: string;
  camposUsados: string[];
  confianca: 'alta' | 'media' | 'baixa';
  insights: InsightAgente[];
  metricas: { latenciaMs: number; modelo: string; licoesAplicadas: number };
}

export interface MensagemHistorico {
  id: string;
  papel: 'user' | 'assistant';
  conteudo: string;
  campos_usados: string[] | null;
  metricas: Record<string, unknown> | null;
  modo: ModoAgente | null;
  criado_em: string;
}

export interface HistoricoAgente {
  /** `false` quando o escopo está desligado ou o papel do usuário não alcança. */
  disponivel: boolean;
  /** O motivo, em texto para o usuário, quando `disponivel` é `false`. */
  motivo: string | null;
  rotulo: string | null;
  conversa: { id: string; titulo: string | null; criado_em: string; atualizado_em: string } | null;
  mensagens: MensagemHistorico[];
  insights: InsightAgente[];
}

export interface ConfigAgente {
  id: string;
  escopo: string;
  rotulo: string;
  ativo: boolean;
  modelo: string;
  temperatura: number;
  prompt_personalizado: string | null;
  nivel_acesso: 'admin' | 'lider' | 'sublider' | 'team_member';
  max_insights_por_resposta: number;
  updated_at: string;
}

export interface AprendizadoAgente {
  id: string;
  escopo: string;
  tipo: 'correcao' | 'preferencia' | 'glossario' | 'regra';
  pergunta: string | null;
  resposta_original: string | null;
  correcao: string;
  licao: string;
  peso: number;
  ativo: boolean;
  criado_em: string;
}

export interface CockpitAgente {
  dias: number;
  truncado: boolean;
  configs: ConfigAgente[];
  metricas: {
    escopo: string;
    perguntas: number;
    respostas: number;
    insights: number;
    conversas: number;
    usuarios: number;
    latenciaMediaMs: number | null;
    confiancaBaixa: number;
  }[];
  camposMaisUsados: { campo: string; vezes: number }[];
  porModo: { modo: string; vezes: number }[];
  insightsPorCategoria: { categoria: string; vezes: number }[];
  insightsUteis: number;
  insightsDescartados: number;
  aprendizados: AprendizadoAgente[];
}

export const agenteQueryKeys = {
  historico: (escopo: string) => ['agente-psa', 'historico', escopo] as const,
  cockpit: (dias: number) => ['agente-psa', 'cockpit', dias] as const,
};

/** Reabre a última conversa do usuário naquele escopo (a interação continua). */
export function useAgenteHistorico(escopo: string | null, habilitado: boolean) {
  return useQuery({
    queryKey: agenteQueryKeys.historico(escopo ?? ''),
    queryFn: () => invocarAgente<HistoricoAgente>({ acao: 'historico', escopo }),
    enabled: !!escopo && habilitado,
    staleTime: 60_000,
  });
}

export function useAgenteChat() {
  return useMutation({
    mutationKey: ['agente-psa', 'chat'],
    mutationFn: (vars: {
      escopo: string;
      pergunta: string;
      modo: ModoAgente;
      contexto: ContextoTela;
      conversaId?: string | null;
    }) => invocarAgente<RespostaChat>({ acao: 'chat', ...vars }),
  });
}

/** A correção do usuário virando lição — é aqui que ele aprende. */
export function useAgenteFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['agente-psa', 'feedback'],
    mutationFn: (vars: {
      mensagemId: string;
      correcao: string;
      tipo?: AprendizadoAgente['tipo'];
    }) => invocarAgente<{ aprendizado: AprendizadoAgente }>({ acao: 'feedback', ...vars }),
    onSuccess: () => {
      // O cockpit mostra a lição nova na aba Agente.
      queryClient.invalidateQueries({ queryKey: ['agente-psa', 'cockpit'] });
    },
  });
}

export function useAgenteAvaliarInsight() {
  return useMutation({
    mutationKey: ['agente-psa', 'avaliar-insight'],
    mutationFn: (vars: { insightId: string; util: boolean }) =>
      invocarAgente<{ ok: true }>({ acao: 'avaliar_insight', ...vars }),
  });
}

export function useAgenteCockpit(dias: number, habilitado = true) {
  return useQuery({
    queryKey: agenteQueryKeys.cockpit(dias),
    queryFn: () => invocarAgente<CockpitAgente>({ acao: 'cockpit', dias }),
    enabled: habilitado,
    staleTime: 60_000,
  });
}

export function useAgenteSalvarConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['agente-psa', 'salvar-config'],
    mutationFn: (vars: {
      escopo: string;
      patch: Partial<Pick<ConfigAgente,
        'ativo' | 'rotulo' | 'modelo' | 'prompt_personalizado' | 'nivel_acesso' | 'temperatura' | 'max_insights_por_resposta'>>;
      aprendizados?: { id: string; ativo?: boolean; licao?: string; peso?: number }[];
    }) => invocarAgente<{ config: ConfigAgente }>({ acao: 'salvar_config', ...vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agente-psa', 'cockpit'] });
    },
  });
}
