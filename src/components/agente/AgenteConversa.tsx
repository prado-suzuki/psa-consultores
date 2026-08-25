/**
 * O corpo do painel: turnos, insights e rastro do que foi processado.
 *
 * Puramente apresentacional — nenhuma query, nenhum estado de rede. Quem
 * conversa com a edge function é o `AgentePsaWidget`.
 *
 * O texto da IA passa por `renderSimpleBoldMarkdown` (sem
 * `dangerouslySetInnerHTML`): resposta de modelo é conteúdo não confiável.
 */
import { useEffect, useRef } from 'react';
import { Lightbulb, Sparkles, ThumbsDown, ThumbsUp, Pencil } from 'lucide-react';
import { renderSimpleBoldMarkdown } from '@/lib/safeBoldMarkdown';
import type { InsightAgente } from '@/hooks/useDomainAgentePsa';

export interface TurnoUI {
  id: string;
  papel: 'user' | 'assistant';
  texto: string;
  camposUsados?: string[];
  insights?: InsightAgente[];
  confianca?: 'alta' | 'media' | 'baixa';
}

interface AgenteConversaProps {
  turnos: TurnoUI[];
  pensando: boolean;
  erro: string | null;
  /** Falhas de carregamento da própria tela — o agente não as inventa. */
  avisosDaTela?: string[];
  sugestoes?: string[];
  onSugestao: (texto: string) => void;
  onCorrigir: (mensagemId: string) => void;
  onAvaliarInsight: (insightId: string, util: boolean) => void;
  avaliados: Record<string, boolean>;
}

const ROTULO_CATEGORIA: Record<InsightAgente['categoria'], string> = {
  oportunidade: 'Oportunidade',
  risco: 'Risco',
  execucao: 'Execução',
  dado: 'Qualidade do dado',
  observacao: 'Observação',
};

export function AgenteConversa({
  turnos, pensando, erro, avisosDaTela, sugestoes,
  onSugestao, onCorrigir, onAvaliarInsight, avaliados,
}: AgenteConversaProps) {
  const fim = useRef<HTMLDivElement>(null);

  // Rola para o turno novo — e também quando "pensando" liga, para o pulso
  // aparecer sem o usuário procurar.
  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turnos.length, pensando]);

  return (
    <div className="agente-corpo">
      {turnos.length === 0 && !pensando && (
        <div className="agente-vazio">
          Pergunte sobre o que está nesta tela. Eu respondo com os números que ela
          mostra — e digo quando o dado não está aqui.
          {(sugestoes ?? []).map((s) => (
            <button key={s} type="button" className="agente-sugestao" onClick={() => onSugestao(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {avisosDaTela && avisosDaTela.length > 0 && (
        <div className="agente-aviso">
          Esta tela está com dado incompleto: {avisosDaTela.join('; ')}. Vou tratar
          esses números como desconhecidos, não como zero.
        </div>
      )}

      {turnos.map((t) => (
        t.papel === 'user' ? (
          <div key={t.id} className="agente-msg agente-msg-user">{t.texto}</div>
        ) : (
          <div key={t.id} className="agente-msg agente-msg-bot">
            <div>{renderSimpleBoldMarkdown(t.texto)}</div>

            {(t.insights ?? []).map((i) => (
              <div key={i.id} className="agente-insight" data-sev={i.severidade} style={{ marginTop: 9 }}>
                <div className="agente-insight-lbl">
                  <Lightbulb style={{ width: 10, height: 10 }} />
                  {ROTULO_CATEGORIA[i.categoria] ?? 'Insight'}
                </div>
                <div>{renderSimpleBoldMarkdown(i.texto)}</div>
                <div className="agente-insight-acoes">
                  <button
                    type="button"
                    className="agente-icone-btn"
                    title="Serviu"
                    aria-pressed={avaliados[i.id] === true}
                    style={avaliados[i.id] === true ? { color: 'var(--agente-go)' } : undefined}
                    onClick={() => onAvaliarInsight(i.id, true)}
                  >
                    <ThumbsUp style={{ width: 13, height: 13 }} />
                  </button>
                  <button
                    type="button"
                    className="agente-icone-btn"
                    title="Não serviu"
                    aria-pressed={avaliados[i.id] === false}
                    style={avaliados[i.id] === false ? { color: 'var(--agente-risk)' } : undefined}
                    onClick={() => onAvaliarInsight(i.id, false)}
                  >
                    <ThumbsDown style={{ width: 13, height: 13 }} />
                  </button>
                </div>
              </div>
            ))}

            <div className="agente-msg-meta">
              {t.confianca === 'baixa' && (
                <span style={{ color: 'var(--agente-warn)' }}>confiança baixa — o dado pedido não estava na tela</span>
              )}
              {(t.camposUsados ?? []).slice(0, 6).map((c) => (
                <span key={c} className="agente-campo">{c}</span>
              ))}
              <button
                type="button"
                className="agente-icone-btn"
                title="Corrigir esta resposta (ele guarda a lição)"
                onClick={() => onCorrigir(t.id)}
                style={{ width: 22, height: 22 }}
              >
                <Pencil style={{ width: 12, height: 12 }} />
              </button>
            </div>
          </div>
        )
      ))}

      {pensando && (
        <div className="agente-msg agente-msg-bot" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles style={{ width: 12, height: 12, color: 'var(--agente-accent)' }} />
          <span className="agente-pulso"><i /><i /><i /></span>
        </div>
      )}

      {erro && <div className="agente-aviso" role="alert">{erro}</div>}

      <div ref={fim} />
    </div>
  );
}
