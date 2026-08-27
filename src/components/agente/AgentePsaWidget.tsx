/**
 * O balão do Agente PSA — canto inferior direito, logo da PSA, em toda tela
 * que publica contexto (`useRegistrarContextoAgente`).
 *
 * **É o ponto de entrada do agente FORA do Board** (21/08). Dentro do Board o
 * ponto de entrada é o ícone colado no título (`AgentePsaTrigger`, montado uma
 * vez no `BoardLayout`), porque foi isso que a diretoria pediu: "de forma
 * discreta em todos os menus e submenus, a partir de um ícone próximo ao
 * título". Aqui o balão se retira (ver o gate por rota abaixo).
 *
 * A objeção de "dois idiomas para a mesma função" é boa e está respeitada: não
 * são dois no mesmo lugar, e sim um por ambiente. O balão continua servindo Tax,
 * OSG e Acessos, que não têm cabeçalho padronizado onde o ícone encaixe.
 *
 * Uma diferença que decide o desenho: o ícone existe em TODA tela do Board
 * (o escopo dele vem da rota), enquanto o balão exige contexto publicado. Se o
 * balão fosse o único ponto de entrada do Board, os menus que ainda não publicam
 * snapshot ficariam sem agente nenhum — e sem o lugar onde a faixa "Exige
 * decisão" e o aviso de dado incompleto passaram a morar.
 *
 * Aqui mora só LAYOUT. A máquina de estado da conversa vive em
 * `useAgenteConversaController` — uma cópia só, para a correção do usuário ter
 * um caminho só para virar lição.
 *
 * Regras de existência:
 *  - sem contexto publicado, não renderiza nada (é assim que ele fica fora das
 *    telas onde ainda não entrou, e fora da home pública);
 *  - sem usuário logado, idem (a edge function exigiria JWT de todo jeito).
 */
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, RotateCcw } from 'lucide-react';
import logo from '@/assets/logo-psa.png';
import { useAuth } from '@/contexts/AuthContext';
import { useAgenteContexto } from '@/hooks/useAgenteContexto';
import { useAgenteConversaController } from '@/hooks/useAgenteConversaController';
import { type ModoAgente } from '@/hooks/useDomainAgentePsa';
import { PromptInputBox } from '@/components/ui/ai-prompt-box';
import { AgenteConversa } from '@/components/agente/AgenteConversa';
import { AgentePainelDecisao } from '@/components/agente/AgentePainelDecisao';
import { itensDeDecisao } from '@/lib/agenteDecisao';
import { escopoDaRota } from '@/lib/agenteEscopos';

export function AgentePsaWidget() {
  const { user } = useAuth();
  const { escopo, contexto, carregando } = useAgenteContexto();
  const location = useLocation();
  const [aberto, setAberto] = useState(false);

  const conversa = useAgenteConversaController({
    escopo, contexto, carregando, aberto: aberto && !!user,
  });

  // "Exige decisão" DENTRO do painel, lido do MESMO bloco do snapshot que o
  // agente recebeu — nunca de props paralelas. Se as duas coisas viessem de
  // caminhos diferentes, o usuário poderia ler um alerta aqui e ouvir do agente
  // que ele não conhece aquele alerta, sem nenhum dos dois estar errado.
  //
  // É SUBSTITUIÇÃO, não acréscimo: a faixa "Exige decisão" e o banner "Dados
  // incompletos" SAÍRAM da grade das telas em 21/08 (o `BoardAlertas` foi
  // deletado), e este painel passou a ser o lugar deles. É por isso que o ponto
  // de atenção no gatilho não é enfeite: com o cartão fora da grade, o ponto é
  // o único sinal de que uma consulta quebrou.
  const itensDecisao = useMemo(() => itensDeDecisao(contexto?.blocos), [contexto?.blocos]);

  // Dentro do Board o ponto de entrada é o ícone ao lado do título: o balão se
  // retira para não haver dois. `escopoDaRota` é a mesma fonte que o ícone usa,
  // então os dois nunca discordam sobre onde o Board começa.
  if (escopoDaRota(location.pathname)) return null;
  if (!escopo || !contexto || !user) return null;

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
                <div className="agente-painel-sub">{conversa.rotulo ?? contexto.rotulo}</div>
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

            {/* Teto proprio: com 5 alertas o bloco ocupava metade do painel e
                a conversa ficava com uma linha. Rola dentro de si mesmo. */}
            <div className="agente-decisao-wrap">
              <AgentePainelDecisao itens={itensDecisao} avisos={contexto.avisos} />
            </div>

            {/* `avisosDaTela` não vai aqui de propósito: o bloco acima já os
                desenha, fora do scroll. O mesmo aviso duas vezes no mesmo
                painel ensina o usuário a ignorá-lo. */}
            <AgenteConversa
              turnos={conversa.turnos}
              pensando={conversa.pensando}
              erro={conversa.indisponivel ?? conversa.erro}
              sugestoes={contexto.sugestoes}
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
              disabled={conversa.travado}
              modos={conversa.modos}
              modo={conversa.modo}
              onModoChange={(m) => conversa.setModo(m as ModoAgente)}
              placeholder={conversa.indisponivel
                ? 'Agente indisponível nesta tela.'
                : carregando
                  ? 'Aguarde: a tela ainda está carregando os números...'
                  : 'Pergunte sobre os dados desta tela...'}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!aberto && (
        <button
          type="button"
          className="agente-bolha"
          onClick={() => setAberto(true)}
          title={`Agente PSA · ${contexto.rotulo}`}
          aria-label="Abrir o Agente PSA"
        >
          <img src={logo} alt="" />
          {/* Ponto de atenção com o balão fechado: a tela está com falha de
              carregamento, e é isso que o agente vai dizer se for perguntado.
              Ele também tira o balão do repouso translúcido (ver `.agente-bolha`
              no index.css) — aviso que fica apagado não é aviso. */}
          {(contexto.avisos?.length ?? 0) > 0 && <span className="agente-bolha-ping" />}
        </button>
      )}
    </>
  );
}

export default AgentePsaWidget;
