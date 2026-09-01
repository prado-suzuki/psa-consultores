/**
 * O balão do Agente PSA — canto inferior direito, logo da PSA. **Ponto de
 * entrada único do agente**, dentro e fora do Board (01/09).
 *
 * Voltou a ser cartão flutuante: o ícone colado no breadcrumb (`AgentePsaTrigger`)
 * saiu. Um idioma só, em qualquer tela — e a máquina de estado continua sendo
 * uma cópia só (`useAgenteConversaController`), para a correção do usuário ter
 * um caminho só para virar lição.
 *
 * Como o ESCOPO é resolvido (a diferença que decide a existência do balão):
 *  - DENTRO do Board, pela ROTA (`escopoDaRota`): o balão existe nas 18 telas,
 *    inclusive nas que ainda não publicam snapshot. Nessas, o painel abre,
 *    mostra o que houver de alerta e diz com letras que ainda não recebeu
 *    números — em vez de sumir e deixar o usuário achando que não há agente.
 *  - FORA do Board (Tax, OSG, Acessos), pelo snapshot publicado
 *    (`useRegistrarContextoAgente`): sem contexto, não há balão. É assim que
 *    ele fica fora da home pública e do portal do cliente.
 *
 * O snapshot só é aproveitado quando é DESTA tela: durante a navegação o
 * contexto anterior fica publicado por um render, e responder sobre ele seria
 * o agente falando da tela que o usuário acabou de deixar.
 *
 * O PONTO na bolha é o que impede "a um clique" de virar "ninguém viu": acende
 * com risco na faixa de decisão, falha de carregamento, ou notificação não
 * vista daquele escopo. A faixa "Exige decisão" e o aviso de dado incompleto
 * saíram da grade das telas em 21/08 e moram dentro deste painel — sem o ponto,
 * uma consulta quebrada não teria sinal nenhum.
 *
 * Aqui mora só LAYOUT. Nenhuma query de KPI, nenhum recálculo.
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Minimize2, Minus, PinOff, RotateCcw } from 'lucide-react';
import logo from '@/assets/logo-psa.png';
import { useAuth } from '@/contexts/AuthContext';
import { useAgenteContexto } from '@/hooks/useAgenteContexto';
import { useAgenteConversaController } from '@/hooks/useAgenteConversaController';
import { useAgenteNotificacoes } from '@/hooks/useDomainAgenteNotificacoes';
import { type ModoAgente } from '@/hooks/useDomainAgentePsa';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { AgenteConversa } from '@/components/agente/AgenteConversa';
import { AgentePainelDecisao } from '@/components/agente/AgentePainelDecisao';
import { usePainelArrastavel } from '@/components/agente/usePainelArrastavel';
import { contarRiscos, itensDeDecisao } from '@/lib/agenteDecisao';
import { escopoDaRota } from '@/lib/agenteEscopos';

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

export function AgentePsaWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  /**
   * Expandido é ESTADO DE JANELA, não preferência de conta: quem abre em 420px
   * para dar uma olhada e expande para ler a faixa inteira não quer que a
   * próxima tela nasça gigante. Por isso não vai para o localStorage — ao
   * contrário da POSIÇÃO, que a pessoa arrastou uma vez para não cobrir o
   * gráfico e espera encontrar no lugar.
   */
  const [expandido, setExpandido] = useState(false);
  const arraste = usePainelArrastavel('agente-painel-pos', aberto);

  const daRota = escopoDaRota(location.pathname);
  const { escopo: publicado, contexto: publicadoCtx, carregando } = useAgenteContexto();

  // No Board a rota manda; fora dele, só existe agente onde a tela publicou.
  const escopo = daRota?.escopo ?? publicado;
  const contexto = publicado && publicado === escopo ? publicadoCtx : null;

  const conversa = useAgenteConversaController({
    escopo, contexto, carregando, aberto: aberto && !!user,
  });

  // "Exige decisão" lido do MESMO bloco do snapshot que o agente recebeu —
  // nunca de props paralelas. Se as duas coisas viessem de caminhos diferentes,
  // o usuário poderia ler um alerta aqui e ouvir do agente que ele não conhece
  // aquele alerta, sem nenhum dos dois estar errado.
  const itens = useMemo(() => itensDeDecisao(contexto?.blocos), [contexto]);
  const { data: notificacoes } = useAgenteNotificacoes(!!user && !!escopo);
  const naoVistasAqui = useMemo(
    () => (notificacoes?.notificacoes ?? []).filter((n) => n.escopo === escopo).length,
    [notificacoes, escopo],
  );

  if (!escopo || !user) return null;
  // Fora do Board o balão exige snapshot publicado (home pública, portal).
  if (!daRota && !contexto) return null;

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

  const rotulo = conversa.rotulo ?? daRota?.rotulo ?? contexto?.rotulo ?? 'Agente PSA';

  return (
    <>
      <AnimatePresence>
        {aberto && (
          <motion.div
            ref={arraste.ref}
            className={`agente-painel${expandido ? ' agente-painel--grande' : ''}`}
            style={arraste.estilo}
            initial={{ opacity: 0, y: 16, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: .97 }}
            transition={{ duration: .18, ease: [.22, 1, .36, 1] }}
            role="dialog"
            aria-label="Agente PSA"
          >
            <div
              className="agente-painel-head"
              data-arrastando={arraste.arrastando ? 'sim' : undefined}
              {...arraste.handlers}
            >
              <img src={logo} alt="" style={{ width: 24 }} />
              <div style={{ minWidth: 0 }}>
                <div className="agente-painel-titulo">Agente PSA</div>
                <div className="agente-painel-sub">{rotulo}</div>
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
                {arraste.deslocado && (
                  <button
                    type="button"
                    className="agente-icone-btn"
                    title="Voltar para o canto"
                    aria-label="Voltar o painel para o canto"
                    onClick={arraste.reancorar}
                  >
                    <PinOff style={{ width: 14, height: 14 }} />
                  </button>
                )}
                <button
                  type="button"
                  className="agente-icone-btn"
                  title={expandido ? 'Recolher' : 'Expandir'}
                  aria-label={expandido ? 'Recolher o painel' : 'Expandir o painel'}
                  aria-pressed={expandido}
                  onClick={() => setExpandido((v) => !v)}
                >
                  {expandido
                    ? <Minimize2 style={{ width: 14, height: 14 }} />
                    : <Maximize2 style={{ width: 14, height: 14 }} />}
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

            {/* O que saiu dos cartões da tela. Fica ACIMA da conversa: é o que
                a pessoa veio ver, e o chat é o que ela faz depois. Teto
                próprio: com 5 alertas o bloco ocupava metade do painel. */}
            <div className="agente-decisao-wrap">
              <AgentePainelDecisao itens={itens} avisos={contexto?.avisos} />
            </div>

            {/* `avisosDaTela` não vai aqui de propósito: o bloco acima já os
                desenha, fora do scroll. O mesmo aviso duas vezes no mesmo
                painel ensina o usuário a ignorá-lo. */}
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

      {!aberto && (
        <button
          type="button"
          className="agente-bolha"
          onClick={() => setAberto(true)}
          title={`Agente PSA · ${rotulo}`}
          aria-label="Abrir o Agente PSA"
        >
          <img src={logo} alt="" />
          {/* Ponto de atenção com o balão fechado. Ele também tira a bolha do
              repouso translúcido (ver `.agente-bolha` no index.css) — aviso que
              fica apagado não é aviso. */}
          {cor && <span className="agente-bolha-ping" style={{ background: cor }} />}
        </button>
      )}
    </>
  );
}

export default AgentePsaWidget;
