import React from 'react';
import { BoardChip } from './BoardChip';
import { LIMITE_SHARE_TOP1, LIMITE_SHARE_TOP5, type Concentracao } from '@/lib/boardEstrategico';

interface BoardConcentracaoProps {
  concentracao: Concentracao;
  /** Rótulo da janela de receita (ex.: "2026 até agosto"). */
  janelaLabel: string;
  nota?: string;
  onClienteClick?: (clienteId: string) => void;
}

const brl = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
    : `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;

/**
 * De quem a receita depende — a pergunta que o rollup de projetos não responde.
 *
 * A barra de cada linha é a fatia do cliente no total; o número à direita é a
 * fatia ACUMULADA até ali. Ler a coluna de cima para baixo responde "quanto da
 * empresa está nas mãos dos N maiores" sem somar nada de cabeça.
 */
export const BoardConcentracao: React.FC<BoardConcentracaoProps> = ({
  concentracao,
  janelaLabel,
  nota,
  onClienteClick,
}) => {
  const { top, total, shareTop1, shareTop5, clientesParaMetade } = concentracao;
  // A cor segue o mesmo limite que dispara o alerta — a tela não pode chamar de
  // saudável o que a faixa de decisão chamou de risco.
  const corTop1 = shareTop1 !== null && shareTop1 > LIMITE_SHARE_TOP1
    ? 'var(--board-v4-risk)'
    : 'var(--board-v4-ink)';
  // `-d` e não `--board-v4-warn`: aqui a cor de estado pinta NÚMERO, e o âmbar
  // normal dá 3,00:1 sobre o branco do cartão. O degrau escuro dá 5,13:1 e
  // continua lendo como âmbar. Quem pinta área grande segue no tom normal.
  const corTop5 = shareTop5 !== null && shareTop5 > LIMITE_SHARE_TOP5
    ? 'var(--board-v4-warn-d)'
    : 'var(--board-v4-ink)';

  return (
    <div className="v4-card" data-reveal>
      <div className="v4-card-title" style={{ marginBottom: 4 }}>Concentração da carteira</div>
      <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 12 }}>
        Receita contratada por cliente · {janelaLabel}
      </div>

      {total <= 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
          Nenhuma receita contratada na janela.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 18, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: corTop1, letterSpacing: '-.02em' }}>
                {shareTop1 !== null ? `${(shareTop1 * 100).toFixed(1)}%` : '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)' }}>maior cliente</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: corTop5, letterSpacing: '-.02em' }}>
                {shareTop5 !== null ? `${(shareTop5 * 100).toFixed(1)}%` : '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)' }}>top 5</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--board-v4-ink)', letterSpacing: '-.02em' }}>
                {clientesParaMetade ?? '—'}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)' }}>
                {clientesParaMetade === 1 ? 'cliente = metade' : 'clientes = metade'}
              </div>
            </div>
          </div>

          {top.map((c, i) => (
            <div
              key={c.cliente_id}
              className="v4-mrow"
              onClick={onClienteClick ? () => onClienteClick(c.cliente_id) : undefined}
              style={{ cursor: onClienteClick ? 'pointer' : undefined }}
            >
              <span style={{ fontSize: 10, color: 'var(--board-v4-ink4)', minWidth: 16, textAlign: 'right' }}>
                #{i + 1}
              </span>
              <div
                style={{
                  flex: 1, minWidth: 0, fontWeight: 500, color: 'var(--board-v4-ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title={c.nome}
              >
                {c.nome}
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--board-v4-ink3)', minWidth: 62, textAlign: 'right' }}>
                {brl(c.receita)}
              </span>
              <div style={{ width: 64 }}>
                <div className="v4-pb v4-pb6">
                  <div className="v4-pbf v4-pi" style={{ width: `${Math.min(100, c.share * 100)}%` }} />
                </div>
              </div>
              <span
                style={{ fontSize: 11.5, fontWeight: 700, minWidth: 40, textAlign: 'right', color: 'var(--board-v4-ink2)' }}
                title={`${(c.share * 100).toFixed(1)}% sozinho · ${(c.acumulado * 100).toFixed(1)}% acumulado até aqui`}
              >
                {(c.acumulado * 100).toFixed(0)}%
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <BoardChip variant="gy">acumulado</BoardChip>
            <span style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)' }}>
              O % à direita soma as linhas acima · total da janela {brl(total)}
            </span>
          </div>
        </>
      )}

      {nota && (
        <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 8, lineHeight: 1.5 }}>
          {nota}
        </div>
      )}
    </div>
  );
};
