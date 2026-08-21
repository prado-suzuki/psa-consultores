// Contrato entre a tela e o agente. O front é a ÚNICA fonte dos números: ele
// publica aqui o que já está desenhado, com rótulo e nota, e a função não
// recalcula nada. Ver `src/lib/agenteContexto.ts` no lado do navegador.

export interface CampoContexto {
  rotulo: string;
  /** Já formatado pela tela (R$ 1,2 mi, 66,2%, "—"). `null` = não apurado. */
  valor: string | null;
  /** Por que o número é o que é: janela, rateio, escopo de RLS. */
  nota?: string;
}

export interface BlocoContexto {
  id: string;
  titulo: string;
  /** Janela do bloco. O Estratégico tem DUAS (negócio e execução). */
  janela?: string;
  nota?: string;
  campos: CampoContexto[];
  /** Linhas (top clientes, projetos críticos). Curtas, já recortadas. */
  itens?: Record<string, string | number | null>[];
}

export interface ContextoTela {
  rotulo: string;
  filtros: Record<string, string>;
  blocos: BlocoContexto[];
  /** Falhas de carregamento da tela. O agente PRECISA saber o que não sabe. */
  avisos?: string[];
}

export type ModoAgente = 'dados' | 'estrategia' | 'aprender';

export interface ConfigAgente {
  id: string;
  escopo: string;
  rotulo: string;
  ativo: boolean;
  modelo: string;
  temperatura: number;
  prompt_personalizado: string | null;
  nivel_acesso: string;
  max_insights_por_resposta: number;
}

export interface LicaoAprendida {
  licao: string;
  tipo: string;
  peso: number;
}

export interface TurnoAnterior {
  papel: 'user' | 'assistant';
  conteudo: string;
}

export interface InsightGerado {
  texto: string;
  categoria: string;
  severidade: string;
}

export interface RespostaAgente {
  resposta: string;
  insights: InsightGerado[];
  campos_usados: string[];
  confianca: string;
}
