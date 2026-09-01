/**
 * O canal entre a TELA e o agente.
 *
 * O agente não recalcula nada: cada tela PUBLICA aqui o que ela já desenhou —
 * rótulo, valor formatado, janela, nota e aviso de falha — e o balão flutuante
 * manda isso para a edge function junto com a pergunta. Duas origens para o
 * mesmo número (uma na tela, outra no Deno) seria a pior falha possível numa
 * ferramenta de decisão: a tela mostraria R$ 4,1 mi e o agente responderia
 * R$ 3,8 mi, e nenhum dos dois estaria auditável.
 *
 * Consequência prática: o balão só existe onde alguma tela publicou contexto.
 * Aba sem `useRegistrarContextoAgente` não ganha agente — e isso é a feature,
 * não a limitação.
 *
 * O contexto React vive aqui (e o Provider em `@/contexts/AgenteProvider`) por
 * causa do Fast Refresh — mesmo arranjo do `useBoardCluster`.
 */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

export interface CampoContexto {
  rotulo: string;
  /** JÁ FORMATADO pela tela ("R$ 4,1 mi", "66,2%"). `null` = não apurado. */
  valor: string | null;
  /** Por que o número é o que é: rateio, escopo de RLS, OS sem data. */
  nota?: string;
}

export interface BlocoContexto {
  id: string;
  titulo: string;
  /** Janela do bloco. O Estratégico tem DUAS (negócio e execução). */
  janela?: string;
  nota?: string;
  campos: CampoContexto[];
  /** Linhas curtas e já recortadas (top clientes, projetos críticos). */
  itens?: Record<string, string | number | null>[];
}

export interface ContextoTela {
  /** Nome da tela como o usuário a chama. Vai no prompt. */
  rotulo: string;
  filtros: Record<string, string>;
  /** Em ordem de importância: o corte por tamanho descarta os do fim. */
  blocos: BlocoContexto[];
  /** Falhas de carregamento. O agente PRECISA saber o que ele não sabe. */
  avisos?: string[];
  /** Perguntas de partida oferecidas no painel vazio. */
  sugestoes?: string[];
}

export interface AgenteContextoValor {
  escopo: string | null;
  contexto: ContextoTela | null;
  /** `true` enquanto a tela ainda está carregando os números. */
  carregando: boolean;
  publicar: (escopo: string, contexto: ContextoTela, carregando: boolean, dono?: symbol) => void;
  despublicar: (escopo: string, dono?: symbol) => void;
}

/**
 * Valor padrão SEM provider: publicar não faz nada e não há escopo.
 *
 * Não lança, e isso é decisão, não descuido — mesmo arranjo do
 * `useBoardCluster`. Telas compartilhadas (`AreaDashboardContent`,
 * `ChamadosGestaoContent`, `DashboardClientesOsContent`) são montadas em testes
 * de página isolada, sem a árvore inteira do `App`. Lançar ali quebraria 8
 * testes de caracterização do Tax por causa de uma feature que aquela tela nem
 * usa — e o preço de não lançar é nenhum: sem provider não existe balão, então
 * publicar no vazio é exatamente o comportamento correto.
 */
const SEM_PROVIDER: AgenteContextoValor = {
  escopo: null,
  contexto: null,
  carregando: false,
  publicar: () => {},
  despublicar: () => {},
};

export const AgenteContexto = createContext<AgenteContextoValor>(SEM_PROVIDER);

export function useAgenteContexto(): AgenteContextoValor {
  return useContext(AgenteContexto);
}

/**
 * Publica o snapshot da tela enquanto ela estiver montada e o retira ao sair.
 *
 * O efeito depende da SERIALIZAÇÃO do contexto, não da identidade do objeto:
 * a tela que monta o snapshot inline (sem `useMemo`) publicaria a cada render
 * e o painel piscaria para sempre. O snapshot tem poucos KB — serializar é
 * mais barato que o bug.
 *
 * `carregando` viaja junto porque "0" e "ainda não sei" são respostas
 * diferentes: com a tela carregando, o painel não deixa perguntar.
 */
export function useRegistrarContextoAgente(
  escopo: string,
  contexto: ContextoTela | null,
  carregando = false,
): void {
  const { publicar, despublicar } = useAgenteContexto();
  const dono = useRef(Symbol('agente-contexto'));
  const chave = useMemo(() => (contexto ? JSON.stringify(contexto) : ''), [contexto]);

  useEffect(() => {
    if (!chave) return;
    const este = dono.current;
    publicar(escopo, JSON.parse(chave) as ContextoTela, carregando, este);
    return () => despublicar(escopo, este);
  }, [escopo, chave, carregando, publicar, despublicar]);
}
