/**
 * O ícone do Agente PSA ao lado do título — o ponto de entrada do agente no
 * ambiente Board.
 *
 * Por que aqui e não num balão flutuante: o agente deixou de ser um cartão no
 * meio do conteúdo (e o balão, um objeto que cobre a tela) e virou uma
 * affordance discreta do CABEÇALHO, presente em todos os menus e submenus do
 * Board. Quem monta é o `BoardLayout`, uma vez, logo depois do último segmento
 * do breadcrumb — então nenhuma tela precisa se lembrar de incluí-lo.
 *
 * O ESCOPO vem da ROTA (`agenteEscopos`), não do que a tela publicou: o ícone
 * tem que existir em toda tela do Board, inclusive nas que ainda não publicam
 * snapshot. Nessas, o painel abre, mostra o que houver de alerta e aviso, e diz
 * com letras que ainda não recebeu números para conversar — em vez de sumir e
 * deixar o usuário achando que o agente não existe naquela tela.
 *
 * O PONTO colorido é o que impede "a um clique" de virar "ninguém viu": ele
 * acende quando existe risco na faixa de decisão, falha de carregamento, ou
 * notificação não vista daquele escopo.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, RotateCcw, Sparkles } from 'lucide-react';
import logo from '@/assets/logo-psa.png';
import { useAuth } from '@/contexts/AuthContext';
import { useAgenteContexto } from '@/hooks/useAgenteContexto';
import { useAgenteConversaController } from '@/hooks/useAgenteConversaController';
import { useAgenteNotificacoes } from '@/hooks/useDomainAgenteNotificacoes';
import { contarRiscos, itensDeDecisao } from '@/lib/agenteDecisao';
import { escopoDaRota } from '@/lib/agenteEscopos';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { AgenteConversa } from '@/components/agente/AgenteConversa';
import { AgentePainelDecisao } from '@/components/agente/AgentePainelDecisao';
import type { ModoAgente } from '@/hooks/useDomainAgentePsa';

/**
 * O texto do input é a única coisa que explica por que ele está travado. Sem
 * isso, "não consigo digitar" fica sem causa — e a causa é diferente em cada
 * caso: sem acesso, tela carregando, ou tela que ainda não publica números.
 */
function placeholder(
  indisponivel: string | null,
  carregando: boolean,
  temContexto: boolean,
): string {
  if (indisponivel) return 'Agente indisponível nesta tela.';
  if (!temContexto) return 'Esta tela ainda não publica seus números para o agente.';
  if (carregando) return 'Aguarde: a tela ainda está carregando os números...';
  return 'Pergunte sobre os dados desta tela...';
}

export function AgentePsaTrigger() {
  const { user } = useAuth();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);

  const daRota = escopoDaRota(location.pathname);
  const escopo = daRota?.escopo ?? null;
  const { escopo: publicado, contexto: publicadoCtx, carregando } = useAgenteContexto();
  // Só aproveita o snapshot se ele for DESTA tela: durante a navegação o
  // contexto da tela anterior ainda está publicado por um render, e responder
  // sobre ele seria o agente falando da tela que o usuário acabou de deixar.
  const contexto = publicado === escopo ? publicadoCtx : null;

  const conversa = useAgenteConversaController({
    escopo, contexto, carregando, aberto: aberto && !!user,
  });

  const itens = useMemo(() => itensDeDecisao(contexto?.blocos), [contexto]);
  const { data: notificacoes } = useAgenteNotificacoes(!!user && !!escopo);
  const naoVistasAqui = useMemo(
    () => (notificacoes?.notificacoes ?? []).filter((n) => n.escopo === escopo).length,
    [notificacoes, escopo],
  );

  if (!escopo || !daRota || !user) return null;

  const riscos = contarRiscos(itens);
  const temAviso = (contexto?.avisos?.length ?? 0) > 0;
  // Vermelho para risco de negócio e para dado incompleto; verde para
  // notificação nova sem gravidade. Sem ponto quando não há nada — ponto que
  // fica sempre aceso não avisa nada.
  const cor = riscos > 0 || temAviso
    ? 'var(--agente-risk)'
    : naoVistasAqui > 0
      ? 'var(--agente-go)'
      : null;

  const titulo = `Agente PSA · ${daRota.rotulo}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title={titulo}
        aria-label={titulo}
        aria-expanded={aberto}
        style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', width: 22, height: 22, borderRadius: 6,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          // `currentColor` de propósito: o ícone se cala junto com o título e
          // continua discreto em qualquer tema do cabeçalho.
          color: 'currentColor', opacity: aberto ? 1 : .62, flexShrink: 0,
        }}
      >
        <Sparkles style={{ width: 14, height: 14 }} />
        {cor && (
          <span
            aria-hidden
            style={{
              position: 'absolute', top: 1, right: 1, width: 6, height: 6,
              borderRadius: 999, background: cor,
            }}
          />
        )}
      </button>

      <AnimatePresence>
        {aberto && (
          <motion.div
            className="agente-painel"
            initial={{ opacity: 0, y: 16, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: .97 }}
            transition={{ duration: .18, ease: [.22, 1, .36, 1] }}
            role="dialog"
            aria-label="Agente PSA"
          >
            <div className="agente-painel-head">
              <img src={logo} alt="" style={{ width: 24 }} />
              <div style={{ minWidth: 0 }}>
                <div className="agente-painel-titulo">Agente PSA</div>
                <div className="agente-painel-sub">{conversa.rotulo ?? daRota.rotulo}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                <button
                  type="button"
                  className="agente-icone-btn"
                  title="Começar outra conversa"
                  onClick={conversa.recomecar}
                >
                  <RotateCcw style={{ width: 14, height: 14 }} />
                </button>
                <button
                  type="button"
                  className="agente-icone-btn"
                  title="Fechar"
                  onClick={() => setAberto(false)}
                >
                  <Minus style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            {/* O que saiu dos cartões da tela. Fica ACIMA da conversa: é o que
                a pessoa veio ver, e o chat é o que ela faz depois. */}
            <AgentePainelDecisao itens={itens} avisos={contexto?.avisos} />

            <AgenteConversa
              turnos={conversa.turnos}
              pensando={conversa.pensando}
              erro={conversa.indisponivel ?? conversa.erro}
              sugestoes={contexto?.sugestoes}
              onSugestao={(s) => conversa.enviar(s, conversa.modo)}
              onCorrigir={conversa.corrigir}
              onAvaliarInsight={conversa.avaliar}
              avaliados={conversa.avaliados}
            />

            {conversa.alvoCorrecao && (
              <div className="agente-aviso" style={{ margin: '0 12px 8px' }}>
                Escreva a regra certa. Ela passa a valer para todas as respostas
                desta tela e fica registrada em Digital &gt; Acessos &gt; Agente.
              </div>
            )}

            <PromptInputBox
              onSend={conversa.enviar}
              isLoading={conversa.pensando}
              disabled={conversa.travado || !contexto}
              modos={conversa.modos}
              modo={conversa.modo}
              onModoChange={(m) => conversa.setModo(m as ModoAgente)}
              placeholder={placeholder(conversa.indisponivel, carregando, !!contexto)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AgentePsaTrigger;
