/**
 * O pop-up de análise estratégica / insight crítico do Agente PSA.
 *
 * Cartão flutuante no canto inferior direito, sobre o conteúdo e SEM overlay:
 * a tela continua usável. Modal central foi descartado de propósito — um sócio
 * lendo receita não pode ser bloqueado por um aviso, e aviso que bloqueia é
 * aviso que a pessoa aprende a fechar sem ler.
 *
 * O que aparece aqui NÃO é gerado por esta tela: é insight que o agente
 * produziu em alguma conversa daquele escopo, com severidade alta (ou análise
 * estratégica com risco/oportunidade). Quem recebe é quem tem o papel exigido
 * pelo escopo, e nunca quem gerou — ver `notificacoes.ts` na edge function.
 *
 * ESTILO INLINE, deliberado: o CSS do Board está em refatoração e o do painel
 * do agente é novo. Os tokens `--agente-*` são usados COM FALLBACK literal, de
 * modo que o cartão continua legível se um dos dois blocos de CSS se mover.
 */
import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Compass, X, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { escopoDaRota, rotaDoEscopo, rotuloDoEscopo } from '@/lib/agenteEscopos';
import {
  useAgenteNotificacoes, useMarcarNotificacao, type NotificacaoAgente,
} from '@/hooks/useDomainAgenteNotificacoes';

/**
 * Quantos cartões ao mesmo tempo. Dois: o terceiro empilhado cobriria meia
 * tela e viraria modal por acidente. O resto continua não visto e sobe quando
 * um destes sair.
 */
const MAX_VISIVEIS = 2;

const SURFACE = 'var(--agente-surface)';
const SURFACE2 = 'var(--agente-surface2)';
const LINHA = 'var(--agente-line, rgba(255,255,255,.10))';
const INK = 'var(--agente-ink)';
const INK2 = 'var(--agente-ink2)';
const INK3 = 'var(--agente-ink3)';

const APARENCIA = {
  insight_critico: {
    Icone: Zap,
    cor: 'var(--agente-risk)',
  },
  analise_estrategica: {
    Icone: Compass,
    cor: 'var(--agente-accent)',
  },
} as const;

/**
 * Só dentro do Board, e só para quem está logado.
 *
 * O gate pela rota fica no COMPONENTE, não em quem o monta: assim um mount
 * novo em outro layout não vaza a notificação para fora do ambiente, que é
 * onde ela faz sentido (o "Ver" leva a uma tela do Board).
 */
export function AgenteNotificacaoPopup() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const noBoard = escopoDaRota(location.pathname) !== null;

  const { data } = useAgenteNotificacoes(!!user && noBoard);
  const marcar = useMarcarNotificacao();

  const visiveis = useMemo(
    () => (data?.notificacoes ?? []).slice(0, MAX_VISIVEIS),
    [data],
  );

  if (!user || !noBoard || visiveis.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed', right: 22, bottom: 22, zIndex: 40,
        display: 'flex', flexDirection: 'column', gap: 10,
        maxWidth: 'min(348px, calc(100vw - 44px))',
      }}
      // `polite`: chega enquanto a pessoa trabalha, não interrompe leitor de
      // tela no meio de uma frase.
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {visiveis.map((n) => (
          <Cartao
            key={n.id}
            notificacao={n}
            aqui={rotaDoEscopo(n.escopo) === location.pathname}
            onVer={() => {
              const rota = rotaDoEscopo(n.escopo);
              marcar.mutate({ notificacaoId: n.id });
              if (rota && rota !== location.pathname) navigate(rota);
            }}
            onDispensar={() => marcar.mutate({ notificacaoId: n.id, dispensada: true })}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function Cartao({
  notificacao, aqui, onVer, onDispensar,
}: {
  notificacao: NotificacaoAgente;
  /** A notificação é da tela em que a pessoa já está. */
  aqui: boolean;
  onVer: () => void;
  onDispensar: () => void;
}) {
  const { Icone, cor } = APARENCIA[notificacao.tipo] ?? APARENCIA.analise_estrategica;
  const destino = rotuloDoEscopo(notificacao.escopo) ?? notificacao.escopoRotulo;
  const quando = formatDistanceToNow(new Date(notificacao.criadoEm), {
    addSuffix: true, locale: ptBR,
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28, transition: { duration: .14 } }}
      transition={{ duration: .2, ease: [.22, 1, .36, 1] }}
      role="status"
      style={{
        background: SURFACE,
        border: `1px solid ${LINHA}`,
        borderLeft: `3px solid ${cor}`,
        borderRadius: 12,
        padding: '12px 13px 11px',
        boxShadow: '0 12px 32px rgba(8,15,30,.34)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Icone style={{ width: 14, height: 14, color: cor, flexShrink: 0, marginTop: 1 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, letterSpacing: '-.01em' }}>
            {notificacao.titulo}
          </div>
          <div style={{ fontSize: 10.5, color: INK3, marginTop: 1 }}>
            {notificacao.escopoRotulo} · {quando}
          </div>
        </div>
        <button
          type="button"
          onClick={onDispensar}
          title="Dispensar"
          aria-label="Dispensar notificação"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', color: INK3,
            padding: 2, display: 'flex', flexShrink: 0, borderRadius: 6,
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      <p style={{ fontSize: 12, color: INK2, lineHeight: 1.5, margin: '8px 0 0' }}>
        {notificacao.texto}
      </p>

      <button
        type="button"
        onClick={onVer}
        style={{
          marginTop: 10, width: '100%', background: SURFACE2,
          border: `1px solid ${LINHA}`, borderRadius: 8, cursor: 'pointer',
          padding: '6px 10px', fontSize: 11.5, fontWeight: 600, color: INK,
        }}
      >
        {aqui ? 'Marcar como lida' : `Ver em ${destino}`}
      </button>
    </motion.div>
  );
}

export default AgenteNotificacaoPopup;
