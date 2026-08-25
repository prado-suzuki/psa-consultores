import React from 'react';
import { BoardChip } from './BoardChip';
import { BoardCard, BoardCardEmpty } from './ui/BoardCard';
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

/** Os três números de topo do bloco, na mesma anatomia (valor grande + rótulo). */
const Destaque: React.FC<{ valor: React.ReactNode; rotulo: string; cor?: string }> = ({
  valor, rotulo, cor,
}) => (
  <div style={{ minWidth: 92 }}>
    <div style={{
      fontFamily: "'Instrument Sans', sans-serif", fontSize: 22, fontWeight: 700,
      letterSpacing: '-.035em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums',
      color: cor ?? 'var(--bd-ink)',
    }}>
      {valor}
    </div>
    <div style={{ fontSize: 10.5, color: 'var(--bd-ink3)', marginTop: 3 }}>{rotulo}</div>
  </div>
);

/**
 * De quem a receita depende — a pergunta que o rollup de projetos não responde.
 *
 * A barra de cada linha é a fatia do cliente no total; o número à direita é a
 * fatia ACUMULADA até ali. Ler a coluna de cima para baixo responde "quanto da
 * empresa está nas mãos dos N maiores" sem somar nada de cabeça.
 *
 * Continua em BARRA, e não em anel: aqui a pergunta é comparativa (quem é
 * maior que quem), e barras alinhadas na mesma base se comparam — cinco anéis
 * não. Ver o cabeçalho de `BoardRing` para a regra.
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
    ? 'var(--bd-risk-d)'
    : 'var(--bd-ink)';
  // `-d` e não o tom cheio: aqui a cor de estado pinta NÚMERO. O âmbar cheio dá
  // 3,00:1 sobre o branco do cartão; o degrau escuro dá 5,13:1 e continua lendo
  // como âmbar. Quem pinta área grande (barra, faixa) segue no tom cheio.
  const corTop5 = shareTop5 !== null && shareTop5 > LIMITE_SHARE_TOP5
    ? 'var(--bd-warn-d)'
    : 'var(--bd-ink)';

  return (
    <BoardCard
      title="Concentração da carteira"
      subtitle={`Receita contratada por cliente · ${janelaLabel}`}
      note={nota}
      actions={total > 0 ? <BoardChip variant="gy">total {brl(total)}</BoardChip> : undefined}
    >
      {total <= 0 ? (
        <BoardCardEmpty>Nenhuma receita contratada na janela.</BoardCardEmpty>
      ) : (
        <>
          <div style={{
            display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16,
            paddingBottom: 14, borderBottom: '1px solid var(--bd-line2)',
          }}>
            <Destaque
              valor={shareTop1 !== null ? `${(shareTop1 * 100).toFixed(1)}%` : '—'}
              rotulo="maior cliente"
              cor={corTop1}
            />
            <Destaque
              valor={shareTop5 !== null ? `${(shareTop5 * 100).toFixed(1)}%` : '—'}
              rotulo="top 5"
              cor={corTop5}
            />
            <Destaque
              valor={clientesParaMetade ?? '—'}
              rotulo={clientesParaMetade === 1 ? 'cliente = metade' : 'clientes = metade'}
            />
          </div>

          {top.map((c, i) => (
            <div
              key={c.cliente_id}
              className="v4-mrow"
              onClick={onClienteClick ? () => onClienteClick(c.cliente_id) : undefined}
              data-clickable={onClienteClick ? 'true' : undefined}
            >
              <span className="v4-srk">{i + 1}</span>
              <div
                style={{
                  flex: 1, minWidth: 0, fontWeight: 500, color: 'var(--bd-ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
                title={c.nome}
              >
                {c.nome}
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--bd-ink3)', minWidth: 68, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {brl(c.receita)}
              </span>
              <div style={{ width: 80 }}>
                <div className="v4-pb v4-pb6">
                  <div className="v4-pbf v4-pi" style={{ width: `${Math.min(100, c.share * 100)}%` }} />
                </div>
              </div>
              <span
                style={{ fontSize: 11.5, fontWeight: 700, minWidth: 40, textAlign: 'right', color: 'var(--bd-ink2)', fontVariantNumeric: 'tabular-nums' }}
                title={`${(c.share * 100).toFixed(1)}% sozinho · ${(c.acumulado * 100).toFixed(1)}% acumulado até aqui`}
              >
                {(c.acumulado * 100).toFixed(0)}%
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <BoardChip variant="gy">acumulado</BoardChip>
            <span style={{ fontSize: 10.5, color: 'var(--bd-ink3)' }}>
              O % à direita soma as linhas acima
            </span>
          </div>
        </>
      )}
    </BoardCard>
  );
};
