import type { ReactNode } from 'react';
import { ArrowRight, Building2, ListChecks, PieChart, Timer, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fmtHorasOuDias, type RankingRow } from '@/lib/gestaoChamadosDashboardAnalytics';

interface RankingCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  rows: RankingRow[];
  emptyHint: string;
  metricLabel: string;
  showResponseTime?: boolean;
  highlightField?: 'total' | 'respondidos';
  className?: string;
}

function RankingCard({
  title,
  description,
  icon,
  rows,
  emptyHint,
  metricLabel,
  showResponseTime = false,
  highlightField = 'total',
  className,
}: RankingCardProps) {
  const topRows = rows.slice(0, 8);
  const max = Math.max(1, ...topRows.map((row) => row[highlightField]));
  return (
    <div className={`rounded-2xl border border-border/70 bg-card p-5 shadow-sm ${className ?? ''}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-[11px] text-muted-foreground">{description}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {rows.length}
        </Badge>
      </div>
      {topRows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="space-y-2.5">
          {topRows.map((row, index) => {
            const value = row[highlightField];
            return (
              <li key={row.key}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {row.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {showResponseTime && (
                      <span
                        className="text-muted-foreground tabular-nums"
                        title="Tempo médio até 1ª resposta"
                      >
                        <Timer className="mr-0.5 inline h-3 w-3 align-[-2px]" />
                        {row.tempoMedioRespostaHoras === null
                          ? '—'
                          : fmtHorasOuDias(row.tempoMedioRespostaHoras)}
                      </span>
                    )}
                    <span className="font-semibold tabular-nums text-foreground">
                      {value}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        {metricLabel}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary transition-all"
                    style={{ width: `${Math.round((value / max) * 100)}%` }}
                  />
                </div>
                {highlightField === 'total' && row.respondidos !== row.total && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {row.respondidos} respondido(s)
                    {row.resolvidos > 0 && ` · ${row.resolvidos} resolvido(s)`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > topRows.length && (
        <div className="mt-3 flex justify-end">
          <span className="text-[11px] text-muted-foreground">
            +{rows.length - topRows.length} fora do top {topRows.length}
            <ArrowRight className="ml-1 inline h-3 w-3" />
          </span>
        </div>
      )}
    </div>
  );
}

interface DashboardRankingsProps {
  responsaveis: RankingRow[];
  clientes: RankingRow[];
  representantes: RankingRow[];
  departamentos: RankingRow[];
  areas: RankingRow[];
}

export function DashboardRankings({
  responsaveis,
  clientes,
  representantes,
  departamentos,
  areas,
}: DashboardRankingsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <RankingCard
        title="Responsáveis pela 1ª Resposta"
        icon={<Trophy className="h-4 w-4 text-primary" />}
        description="Quem mais respondeu chamados no recorte"
        rows={responsaveis}
        emptyHint="Nenhum chamado respondido ainda."
        metricLabel="respondidos"
        showResponseTime
        highlightField="respondidos"
      />
      <RankingCard
        title="Clientes com Mais Chamados"
        icon={<Building2 className="h-4 w-4 text-primary" />}
        description="Empresas que mais geraram demandas"
        rows={clientes}
        emptyHint="Nenhum cliente identificado."
        metricLabel="chamados"
      />
      <RankingCard
        title="Representantes (quem abriu)"
        icon={<Users className="h-4 w-4 text-primary" />}
        description="Usuários do portal que mais abriram chamados"
        rows={representantes}
        emptyHint="Sem dados de representantes."
        metricLabel="chamados"
      />
      <RankingCard
        title="Departamentos"
        icon={<ListChecks className="h-4 w-4 text-primary" />}
        description="Carga e tempo de resposta por departamento"
        rows={departamentos}
        emptyHint="Sem dados de departamento."
        metricLabel="chamados"
        showResponseTime
      />
      {areas.length > 0 && (
        <RankingCard
          title="Áreas Internas"
          icon={<PieChart className="h-4 w-4 text-primary" />}
          description="Distribuição por área da estrutura"
          rows={areas}
          emptyHint="Sem áreas atribuídas."
          metricLabel="chamados"
          showResponseTime
          className="lg:col-span-2"
        />
      )}
    </div>
  );
}
