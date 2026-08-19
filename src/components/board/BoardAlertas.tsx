import React from 'react';
import { AlertTriangle, ChevronRight, CircleAlert, CheckCircle2 } from 'lucide-react';
import type { AlertaEstrategico } from '@/lib/boardEstrategico';

interface BoardAlertasProps {
  alertas: AlertaEstrategico[];
  /** Carregando as fontes — evita "Nada exige decisão" sobre dado que não chegou. */
  loading?: boolean;
  /** Fonte inacessível ou com falha: o vazio aqui não é "está tudo bem". */
  aviso?: string;
  onAlertaClick?: (alerta: AlertaEstrategico) => void;
}

/**
 * A faixa "Exige decisão" — o primeiro bloco do Estratégico.
 *
 * Regra de conteúdo: cada linha é um FATO com número e uma EVIDÊNCIA que diz de
 * quem se trata. Nada aqui é gerado por IA (ver `alertasEstrategicos`): a faixa
 * precisa ser a mesma para os dois sócios que abrirem a tela no mesmo minuto,
 * senão não vira pauta de reunião.
 *
 * Vazio de verdade (sem alerta, sem loading, sem aviso) é informação boa e
 * aparece como tal — mas nunca em cima de dado que ainda não chegou.
 */
export const BoardAlertas: React.FC<BoardAlertasProps> = ({
  alertas,
  loading = false,
  aviso,
  onAlertaClick,
}) => {
  const riscos = alertas.filter((a) => a.severidade === 'risco').length;

  return (
    <div className="v4-card" data-reveal style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className="v4-card-title" style={{ marginBottom: 0 }}>Exige decisão</div>
        {!loading && alertas.length > 0 && (
          <span className={`board-v4-chip ${riscos > 0 ? 'chip-risk' : 'chip-warn'}`}>
            {riscos > 0
              ? `${riscos} ${riscos === 1 ? 'risco' : 'riscos'} · ${alertas.length} ${alertas.length === 1 ? 'item' : 'itens'}`
              : `${alertas.length} ${alertas.length === 1 ? 'ponto de atenção' : 'pontos de atenção'}`}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--board-v4-ink3)' }}>
          Apurando contratos, carteira e prazos…
        </div>
      )}

      {!loading && alertas.length === 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 0', fontSize: 12.5, color: 'var(--board-v4-ink2)' }}>
          <CheckCircle2 style={{ width: 17, height: 17, color: 'var(--board-v4-go)', flexShrink: 0 }} />
          Nenhum contrato vencido, renovação na janela ou concentração fora do limite.
        </div>
      )}

      {!loading && alertas.map((a) => {
        const clicavel = !!(onAlertaClick && a.rota);
        const Icone = a.severidade === 'risco' ? AlertTriangle : CircleAlert;
        const cor = a.severidade === 'risco' ? 'var(--board-v4-risk)' : 'var(--board-v4-warn)';
        return (
          <div
            key={a.id}
            className={`v4-alert ${a.severidade === 'risco' ? 'v4-alert-r' : 'v4-alert-a'}`}
            onClick={clicavel ? () => onAlertaClick(a) : undefined}
            style={{ cursor: clicavel ? 'pointer' : undefined }}
          >
            <Icone style={{ width: 15, height: 15, color: cor, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--board-v4-ink)' }}>{a.titulo}</div>
              <div style={{ fontSize: 11.5, color: 'var(--board-v4-ink2)', marginTop: 2, lineHeight: 1.45 }}>
                {a.detalhe}
              </div>
            </div>
            {clicavel && (
              <ChevronRight style={{ width: 14, height: 14, color: 'var(--board-v4-ink4)', flexShrink: 0, marginTop: 2 }} />
            )}
          </div>
        );
      })}

      {aviso && (
        <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 10, lineHeight: 1.5 }}>
          {aviso}
        </div>
      )}
    </div>
  );
};
