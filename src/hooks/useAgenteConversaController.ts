/**
 * A máquina de estado da conversa com o Agente PSA — turnos, modo, correção e
 * avaliação de insight, sem uma linha de layout.
 *
 * Existe porque o agente tem DOIS pontos de entrada com a mesma conversa por
 * trás: o ícone discreto ao lado do título (no Board, `AgentePsaTrigger`) e o
 * balão flutuante (`AgentePsaWidget`, nas telas fora do Board). Duplicar o
 * fluxo nos dois faria a correção do usuário virar lição num e não no outro —
 * exatamente o tipo de divergência que ninguém percebe até o agente responder
 * diferente para a mesma pergunta em dois lugares.
 *
 * Comportamento preservado do widget original, incluindo as duas decisões que
 * não são óbvias:
 *  - a lição entra ANTES da chamada de chat, para a própria confirmação já sair
 *    sob a regra nova (e uma falha da IA depois não descarta o que foi ensinado);
 *  - a indisponibilidade chega junto do HISTÓRICO, ao abrir, e não no envio:
 *    escrever a pergunta para então ouvir "você não tem acesso" é trabalho
 *    jogado fora.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContextoTela } from '@/hooks/useAgenteContexto';
import {
  useAgenteAvaliarInsight, useAgenteChat, useAgenteFeedback, useAgenteHistorico,
  type ModoAgente,
} from '@/hooks/useDomainAgentePsa';
import type { TurnoUI } from '@/components/agente/AgenteConversa';
import { MODOS_AGENTE, MODO_PADRAO } from '@/components/agente/agenteModos';

interface Entrada {
  escopo: string | null;
  contexto: ContextoTela | null;
  /** A tela ainda está carregando os números: não deixa perguntar. */
  carregando: boolean;
  /** O painel está aberto — só então vale buscar histórico. */
  aberto: boolean;
}

export function useAgenteConversaController({ escopo, contexto, carregando, aberto }: Entrada) {
  const [modo, setModo] = useState<ModoAgente>(MODO_PADRAO);
  const [turnos, setTurnos] = useState<TurnoUI[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [alvoCorrecao, setAlvoCorrecao] = useState<string | null>(null);
  const [avaliados, setAvaliados] = useState<Record<string, boolean>>({});

  const historico = useAgenteHistorico(escopo, aberto);
  const chat = useAgenteChat();
  const feedback = useAgenteFeedback();
  const avaliarInsight = useAgenteAvaliarInsight();

  // Troca de tela zera a conversa da UI: o snapshot é outro, e continuar a
  // thread anterior faria o agente responder sobre a tela que o usuário saiu.
  useEffect(() => {
    setTurnos([]);
    setConversaId(null);
    setErro(null);
    setAlvoCorrecao(null);
  }, [escopo]);

  // Hidrata com a última conversa daquele escopo — a interação continua de
  // onde parou, inclusive depois de um F5.
  useEffect(() => {
    const dados = historico.data;
    if (!dados?.conversa || turnos.length > 0) return;
    const porMensagem = new Map<string, typeof dados.insights>();
    for (const i of dados.insights) {
      if (!i.mensagem_id) continue;
      const lista = porMensagem.get(i.mensagem_id) ?? [];
      lista.push(i);
      porMensagem.set(i.mensagem_id, lista);
    }
    setConversaId(dados.conversa.id);
    setTurnos(dados.mensagens.map((m) => ({
      id: m.id,
      papel: m.papel,
      texto: m.conteudo,
      camposUsados: m.campos_usados ?? undefined,
      insights: porMensagem.get(m.id),
      confianca: (m.metricas?.confianca as TurnoUI['confianca']) ?? undefined,
    })));
    setAvaliados(Object.fromEntries(
      dados.insights.filter((i) => typeof i.util === 'boolean').map((i) => [i.id, i.util as boolean]),
    ));
  }, [historico.data, turnos.length]);

  const ultimaResposta = useMemo(
    () => [...turnos].reverse().find((t) => t.papel === 'assistant')?.id ?? null,
    [turnos],
  );

  // "Corrigir" só existe depois de existir resposta para corrigir.
  const modos = useMemo(
    () => MODOS_AGENTE.filter((m) => m.value !== 'aprender' || !!ultimaResposta),
    [ultimaResposta],
  );

  const enviar = useCallback(async (texto: string, modoEscolhido: string) => {
    if (!escopo || !contexto) return;
    setErro(null);

    const pendente: TurnoUI = { id: `local-${Date.now()}`, papel: 'user', texto };
    setTurnos((atual) => [...atual, pendente]);

    const modoFinal = modoEscolhido as ModoAgente;
    const alvo = modoFinal === 'aprender' ? (alvoCorrecao ?? ultimaResposta) : null;

    try {
      if (alvo) {
        await feedback.mutateAsync({ mensagemId: alvo, correcao: texto });
        setAlvoCorrecao(null);
      }

      const resposta = await chat.mutateAsync({
        escopo, pergunta: texto, modo: modoFinal, contexto, conversaId,
      });

      setConversaId(resposta.conversaId);
      setTurnos((atual) => [...atual, {
        id: resposta.mensagemId,
        papel: 'assistant',
        texto: resposta.resposta,
        camposUsados: resposta.camposUsados,
        insights: resposta.insights,
        confianca: resposta.confianca,
      }]);
      if (modoFinal === 'aprender') setModo(MODO_PADRAO);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui responder agora.');
    }
  }, [escopo, contexto, conversaId, alvoCorrecao, ultimaResposta, chat, feedback]);

  const recomecar = useCallback(() => {
    setTurnos([]);
    setConversaId(null);
    setErro(null);
    setAlvoCorrecao(null);
  }, []);

  const corrigir = useCallback((mensagemId: string) => {
    setAlvoCorrecao(mensagemId);
    setModo('aprender');
  }, []);

  const avaliar = useCallback((insightId: string, util: boolean) => {
    setAvaliados((atual) => ({ ...atual, [insightId]: util }));
    avaliarInsight.mutate({ insightId, util });
  }, [avaliarInsight]);

  const indisponivel = historico.data && !historico.data.disponivel
    ? historico.data.motivo ?? 'O agente não está disponível nesta tela.'
    : null;

  return {
    turnos,
    modo,
    setModo,
    modos,
    erro,
    /** Escopo desligado ou papel insuficiente — o painel abre, mas não pergunta. */
    indisponivel,
    pensando: chat.isPending || feedback.isPending,
    /** `true` quando o input tem que ficar travado (tela carregando ou sem acesso). */
    travado: carregando || !!indisponivel,
    alvoCorrecao,
    avaliados,
    rotulo: historico.data?.rotulo ?? contexto?.rotulo ?? null,
    enviar,
    recomecar,
    corrigir,
    avaliar,
  };
}
