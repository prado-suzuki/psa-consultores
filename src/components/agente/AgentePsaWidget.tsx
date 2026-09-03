/**
 * O balão do Agente PSA — canto inferior direito, logo da PSA.
 *
 * No Board de diretoria o snapshot é o Board inteiro (não a aba). Sem
 * resumo de decisão no open: perguntas sugeridas e o campo. Sem seletor
 * Dados/Estratégia — a pergunta escolhe o recorte; correção continua no lápis.
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, RotateCcw } from 'lucide-react';
import logo from '@/assets/logo-psa.png';
import { useAuth } from '@/contexts/AuthContext';
import { useAgenteContexto } from '@/hooks/useAgenteContexto';
import { useAgenteConversaController } from '@/hooks/useAgenteConversaController';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { AgenteConversa } from '@/components/agente/AgenteConversa';
import { escopoDaRota } from '@/lib/agenteEscopos';

export function AgentePsaWidget() {
  const { user } = useAuth();
  const { escopo, contexto, carregando } = useAgenteContexto();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);

  const daRota = escopoDaRota(location.pathname);
  const escopoEfetivo = escopo ?? daRota?.escopo ?? null;
  const contextoEfetivo = contexto ?? (daRota
    ? {
        rotulo: daRota.rotulo,
        filtros: {},
        blocos: [],
        avisos: ['O Board ainda não publicou números para o agente.'],
        sugestoes: ['O que o Board deveria me deixar decidir?'],
      }
    : null);

  const conversa = useAgenteConversaController({
    escopo: escopoEfetivo, contexto: contextoEfetivo, carregando, aberto: aberto && !!user,
  });

  if (!escopoEfetivo || !contextoEfetivo || !user) return null;

  return (
    <>
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
                <div className="agente-painel-sub">{contextoEfetivo.rotulo}</div>
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
                  title="Minimizar"
                  onClick={() => setAberto(false)}
                >
                  <Minus style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>

            <AgenteConversa
              turnos={conversa.turnos}
              pensando={conversa.pensando}
              erro={conversa.indisponivel ?? conversa.erro}
              avisosDaTela={contextoEfetivo.avisos}
              sugestoes={contextoEfetivo.sugestoes}
              onSugestao={(s) => conversa.enviar(s, conversa.modo)}
              onCorrigir={conversa.corrigir}
              onAvaliarInsight={conversa.avaliar}
              avaliados={conversa.avaliados}
            />

            {conversa.alvoCorrecao && (
              <div className="agente-aviso" style={{ margin: '0 12px 8px' }}>
                Escreva a regra certa. Ela passa a valer para as próximas
                respostas e fica em Digital &gt; Acessos &gt; Agente.
              </div>
            )}

            <PromptInputBox
              onSend={conversa.enviar}
              isLoading={conversa.pensando}
              disabled={conversa.travado}
              modos={[]}
              modo={conversa.modo}
              placeholder={conversa.indisponivel
                ? 'Agente indisponível.'
                : carregando
                  ? 'Aguarde: o Board ainda está carregando os números...'
                  : 'Pergunte sobre o Board...'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!aberto && (
        <button
          type="button"
          className="agente-bolha"
          onClick={() => setAberto(true)}
          title={`Agente PSA · ${contextoEfetivo.rotulo}`}
          aria-label="Abrir o Agente PSA"
        >
          <img src={logo} alt="" />
          {(contextoEfetivo.avisos?.length ?? 0) > 0 && <span className="agente-bolha-ping" />}
        </button>
      )}
    </>
  );
}

export default AgentePsaWidget;
