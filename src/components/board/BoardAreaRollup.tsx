import React, { useState } from 'react';
import { BoardChip } from './BoardChip';
import { BoardCard, BoardCardEmpty } from './ui/BoardCard';
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

/** Degrau escuro: pinta NÚMERO. O tom cheio fica na barra, que é área. */
const corPontualidade = (pct: number) =>
  pct >= 85 ? 'var(--bd-go-d)' : pct >= 70 ? 'var(--bd-warn-d)' : 'var(--bd-risk-d)';

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
  <BoardCard
    title="Áreas em um olhar"
    subtitle={`Todas as áreas ativas do cadastro · ${janelaLabel}`}
    note={nota}
    /* O filtro do bloco mora no cabeçalho do próprio bloco — é o padrão da
       referência, e evita que um filtro local pareça governar a página. */
    actions={areas.length > 1 ? (
      <select
        className="v3-fi"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        aria-label="Filtrar por área"
      >
        <option value={TODAS_AREAS}>Todas as áreas</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>{a.label}</option>
        ))}
      </select>
    ) : undefined}
  >
    {areasFiltradas.length === 0 && (
      <BoardCardEmpty>Nenhuma área ativa cadastrada.</BoardCardEmpty>
    )}

    {areasFiltradas.map((a) => {
      const foraDePrazo = a.emRisco + a.atrasados;
      const semAreaAtribuida = a.id === SEM_AREA_ID;
      return (
        <div
          key={a.id}
          className="v4-mrow"
          onClick={onAreaClick ? () => onAreaClick(a.id) : undefined}
          data-clickable={onAreaClick ? 'true' : undefined}
        >
          <div style={{ width: 96, flexShrink: 0 }}>
            <BoardChip variant={semAreaAtribuida ? 'warn' : 'gy'}>{a.label}</BoardChip>
          </div>

          <div style={{ flex: 1, minWidth: 0, color: 'var(--bd-ink)' }}>
            <strong style={{ fontWeight: 600 }}>{a.projetos}</strong>{' '}
            {a.projetos === 1 ? 'projeto' : 'projetos'}
            <span style={{ color: 'var(--bd-ink3)' }}>
              {' · '}<strong style={{ fontWeight: 600, color: 'var(--bd-ink)' }}>{a.concluidas}</strong> {a.unidade}
            </span>
          </div>

          {/* Pontualidade de ENTREGA. `null` = não há entrega com prazo na
              janela: mostramos "—", nunca 0% (que leria como pior nota). */}
          <div style={{ width: 80 }}>
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
              color: a.pontualidade !== null ? corPontualidade(a.pontualidade) : 'var(--bd-ink3)',
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

  </BoardCard>
  );
};
