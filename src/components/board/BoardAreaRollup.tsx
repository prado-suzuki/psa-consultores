import React from 'react';
import { BoardChip } from './BoardChip';
import type { BoardAreaKey, ResumoArea } from '@/lib/boardExecutivo';

interface BoardAreaRollupProps {
  areas: ResumoArea[];
  /** Rótulo da janela analisada (ex.: "últimos 30 dias") — entra no subtítulo. */
  janelaLabel: string;
  /** Nota de rodapé: fontes e ressalvas (ex.: acesso negado, dado truncado). */
  nota?: string;
  onAreaClick?: (area: BoardAreaKey) => void;
}

const CHIP_VARIANT: Record<BoardAreaKey, 'tax' | 'osg' | 'dev' | 'gy'> = {
  tax: 'tax',
  osg: 'osg',
  dev: 'dev',
  outros: 'gy',
};

const corPontualidade = (pct: number) =>
  pct >= 85 ? 'var(--board-v4-go)' : pct >= 70 ? 'var(--board-v4-warn)' : 'var(--board-v4-risk)';

const classePontualidade = (pct: number) =>
  pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr';

/**
 * Resumo de uma linha por área — a leitura de sócio: quantos projetos, quantos
 * fora de prazo, pontualidade e entregas no período, sem entrar no detalhe de
 * projeto ou pessoa. O detalhe fica a um clique, no painel Operacional.
 */
export const BoardAreaRollup: React.FC<BoardAreaRollupProps> = ({
  areas,
  janelaLabel,
  nota,
  onAreaClick,
}) => (
  <div className="v4-card" data-reveal>
    <div className="v4-card-title" style={{ marginBottom: 4 }}>
      Áreas em um olhar
    </div>
    <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 10 }}>
      Projetos, entregas e % no prazo por área · {janelaLabel}
    </div>

    {areas.length === 0 && (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
        Nenhuma área com projeto ou entrega no período.
      </div>
    )}

    {areas.map((a) => {
      const foraDePrazo = a.emRisco + a.atrasados;
      return (
        <div
          key={a.area}
          className="v4-mrow"
          onClick={onAreaClick ? () => onAreaClick(a.area) : undefined}
          style={{ cursor: onAreaClick ? 'pointer' : undefined }}
        >
          <div style={{ width: 52 }}>
            <BoardChip variant={CHIP_VARIANT[a.area]}>{a.label}</BoardChip>
          </div>

          <div style={{ flex: 1, minWidth: 0, color: 'var(--board-v4-ink)' }}>
            <strong style={{ fontWeight: 600 }}>{a.projetos}</strong>{' '}
            {a.projetos === 1 ? 'projeto' : 'projetos'}
            <span style={{ color: 'var(--board-v4-ink3)' }}>
              {' · '}{a.concluidas} {a.concluidas === 1 ? 'entrega' : 'entregas'}
            </span>
          </div>

          {/* Pontualidade de ENTREGA. `null` = não há entrega com prazo na
              janela: mostramos "—", nunca 0% (que leria como pior nota). */}
          <div style={{ width: 72 }}>
            <div className="v4-pb v4-pb6">
              {a.pontualidade !== null && (
                <div
                  className={`v4-pbf ${classePontualidade(a.pontualidade)}`}
                  style={{ width: `${a.pontualidade}%` }}
                />
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: 11.5, fontWeight: 700, minWidth: 30, textAlign: 'right',
              color: a.pontualidade !== null ? corPontualidade(a.pontualidade) : 'var(--board-v4-ink3)',
            }}
            title={a.pontualidade !== null
              ? `${a.pontualidade}% das ${a.comPrazo ?? a.concluidas} entregas com prazo saíram no prazo`
              : 'Sem entrega com prazo definido no período'}
          >
            {a.pontualidade !== null ? `${a.pontualidade}%` : '—'}
          </span>

          <div style={{ width: 86, display: 'flex', justifyContent: 'flex-end' }}>
            {a.projetos === 0 ? (
              // Área com entrega mas sem projeto ativo: "Tudo no prazo" seria
              // elogio sobre escopo vazio.
              <BoardChip variant="gy">sem projeto</BoardChip>
            ) : foraDePrazo > 0 ? (
              <BoardChip variant={a.atrasados > 0 ? 'risk' : 'warn'}>
                {foraDePrazo} fora de prazo
              </BoardChip>
            ) : (
              <BoardChip variant="go">Tudo no prazo</BoardChip>
            )}
          </div>
        </div>
      );
    })}

    {nota && (
      <div style={{ fontSize: 10.5, color: 'var(--board-v4-ink3)', marginTop: 10, lineHeight: 1.5 }}>
        {nota}
      </div>
    )}
  </div>
);
