import React, { useState } from 'react';
import { BoardChip } from './BoardChip';
import type { ResumoAreaCadastro } from '@/lib/boardExecutivo';

/** Sentinela do "sem recorte" no filtro interno de área. */
const TODAS_AREAS = '__todas__';
/** Mesmo id sentinela de `useBoardRollupAreas` para o residual sem área. */
const SEM_AREA_ID = 'SEM_AREA';

interface BoardAreaRollupProps {
  areas: ResumoAreaCadastro[];
  /** Rótulo da janela analisada (ex.: "últimos 30 dias") — entra no subtítulo. */
  janelaLabel: string;
  /** Nota de rodapé: fontes e ressalvas (ex.: acesso negado, dado truncado). */
  nota?: string;
  onAreaClick?: (areaId: string) => void;
}

const corPontualidade = (pct: number) =>
  pct >= 85 ? 'var(--board-v4-go)' : pct >= 70 ? 'var(--board-v4-warn)' : 'var(--board-v4-risk)';

const classePontualidade = (pct: number) =>
  pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr';

/**
 * Resumo de uma linha por área do CADASTRO (Bloco E, 21/08) — a leitura de
 * sócio: quantos projetos, quantos fora de prazo, pontualidade e entregas no
 * período, sem entrar no detalhe de projeto ou pessoa. O detalhe fica a um
 * clique, no painel Operacional.
 *
 * Não nomeia cor por área — a identidade da linha é o `label` (nome real do
 * cadastro), não um chip colorido de 4 categorias fixas. "Sem área
 * atribuída" (Bloco E3) ganha o chip de alerta, porque é resíduo a resolver,
 * não uma área do negócio.
 */
export const BoardAreaRollup: React.FC<BoardAreaRollupProps> = ({
  areas,
  janelaLabel,
  nota,
  onAreaClick,
}) => {
  // Filtro só desta lista -- não afeta o resto da página, por isso é estado
  // local do bloco, e não mais um filtro de `useBoardFilters`.
  const [filtro, setFiltro] = useState<string>(TODAS_AREAS);
  const areasFiltradas = filtro === TODAS_AREAS ? areas : areas.filter((a) => a.id === filtro);

  return (
  <div className="v4-card" data-reveal>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
      <div className="v4-card-title" style={{ marginBottom: 0 }}>
        Áreas em um olhar
      </div>
      {areas.length > 1 && (
        <select
          className="v3-fi"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          aria-label="Filtrar por área"
          style={{ padding: '3px 8px', fontSize: 11.5 }}
        >
          <option value={TODAS_AREAS}>Todas as áreas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      )}
    </div>
    <div style={{ fontSize: 11, color: 'var(--board-v4-ink3)', marginBottom: 10 }}>
      Todas as áreas ativas do cadastro · {janelaLabel}
    </div>

    {areasFiltradas.length === 0 && (
      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--board-v4-ink3)', fontSize: 12 }}>
        Nenhuma área ativa cadastrada.
      </div>
    )}

    {areasFiltradas.map((a) => {
      const foraDePrazo = a.emRisco + a.atrasados;
      const semAreaAtribuida = a.id === SEM_AREA_ID;
      return (
        <div
          key={a.id}
          className="v4-mrow"
          onClick={onAreaClick ? () => onAreaClick(a.id) : undefined}
          style={{ cursor: onAreaClick ? 'pointer' : undefined }}
        >
          <div style={{ width: 96, flexShrink: 0 }}>
            <BoardChip variant={semAreaAtribuida ? 'warn' : 'gy'}>{a.label}</BoardChip>
          </div>

          <div style={{ flex: 1, minWidth: 0, color: 'var(--board-v4-ink)' }}>
            <strong style={{ fontWeight: 600 }}>{a.projetos}</strong>{' '}
            {a.projetos === 1 ? 'projeto' : 'projetos'}
            <span style={{ color: 'var(--board-v4-ink3)' }}>
              {' · '}<strong style={{ fontWeight: 600, color: 'var(--board-v4-ink)' }}>{a.concluidas}</strong> {a.unidade}
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

          <div style={{ width: 110, display: 'flex', justifyContent: 'flex-end' }}>
            {a.projetos === 0 && a.concluidas === 0 ? (
              <BoardChip variant="gy">sem movimento no período</BoardChip>
            ) : a.projetos === 0 ? (
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
};
