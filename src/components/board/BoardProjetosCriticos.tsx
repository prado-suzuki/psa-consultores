import React from 'react';
import { BoardChip } from './BoardChip';
import { BoardCard, BoardCardEmpty } from './ui/BoardCard';

export interface ProjetoCriticoItem {
  id: string;
  name: string;
  area_name: string | null;
  computed_status: string;
  total_tasks: number;
  completed_tasks: number;
}

interface BoardProjetosCriticosProps {
  projetos: ProjetoCriticoItem[];
  onProjetoClick?: (id: string) => void;
}

const areaChip = (a: string | null): 'tax' | 'osg' | 'dev' | 'gy' => {
  const x = (a || '').toLowerCase();
  if (x.includes('tax') || x.includes('fiscal') || x.includes('tribut')) return 'tax';
  if (x.includes('osg') || x.includes('societ')) return 'osg';
  if (x.includes('dev') || x.includes('digital')) return 'dev';
  return 'gy';
};

const classeBarra = (pct: number) => (pct >= 85 ? 'v4-pg' : pct >= 70 ? 'v4-pa' : 'v4-pr');
/** Degrau escuro em todos: aqui a cor de estado pinta NÚMERO, não área. */
const corTexto = (pct: number) =>
  pct >= 85 ? 'var(--bd-go-d)' : pct >= 70 ? 'var(--bd-warn-d)' : 'var(--bd-risk-d)';

/**
 * A watchlist de execução: projetos em risco ou atrasados, com o quanto já
 * andou. Fica embaixo da leitura de negócio de propósito — é acompanhamento,
 * não decisão de sócio (o que virou decisão já subiu para a faixa de alertas).
 */
export const BoardProjetosCriticos: React.FC<BoardProjetosCriticosProps> = ({
  projetos,
  onProjetoClick,
}) => (
  <BoardCard
    title="Projetos críticos"
    subtitle="Em risco ou atrasados, com o avanço de tarefas"
    style={{ marginBottom: 18 }}
    actions={projetos.length > 0
      ? <BoardChip variant="warn">{projetos.length} em acompanhamento</BoardChip>
      : undefined}
  >
    {projetos.length === 0 && (
      <BoardCardEmpty>Nenhum projeto em risco ou atrasado no escopo.</BoardCardEmpty>
    )}

    {projetos.map((p) => {
      const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
      return (
        <div
          key={p.id}
          className="v4-mrow"
          onClick={onProjetoClick ? () => onProjetoClick(p.id) : undefined}
          data-clickable={onProjetoClick ? 'true' : undefined}
        >
          <BoardChip variant={areaChip(p.area_name)}>{p.area_name || 'Sem área'}</BoardChip>
          <div
            style={{
              flex: 1, minWidth: 0, fontWeight: 500, color: 'var(--bd-ink)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={p.name}
          >
            {p.name}
          </div>
          <div style={{ width: 80 }}>
            <div className="v4-pb v4-pb6">
              <div className={`v4-pbf ${classeBarra(pct)}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span style={{
            fontSize: 11.5, fontWeight: 700, minWidth: 30, textAlign: 'right',
            color: corTexto(pct), fontVariantNumeric: 'tabular-nums',
          }}>
            {pct}%
          </span>
          <BoardChip variant={p.computed_status === 'atrasado' ? 'risk' : 'warn'}>
            {p.computed_status === 'atrasado' ? 'Atrasado' : 'Em risco'}
          </BoardChip>
        </div>
      );
    })}
  </BoardCard>
);
