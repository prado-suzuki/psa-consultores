import { Building2, ListChecks, PieChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HatchedBar, HeroBanner } from '@/components/dashboard/momentum';
import type { DashboardSegment } from '@/lib/gestaoChamadosDashboardAnalytics';

interface DashboardDistributionsProps {
  total: number;
  statusSegments: DashboardSegment[];
  departmentSegments: DashboardSegment[];
  onOpenTickets: () => void;
}

function DistributionCard({
  title,
  icon,
  badge,
  segments,
}: {
  title: string;
  icon: React.ReactNode;
  badge: number;
  segments: DashboardSegment[];
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-1">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="ml-auto text-[11px]">
          {badge}
        </Badge>
      </div>
      {segments.length ? (
        <HatchedBar segments={segments} height={48} />
      ) : (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Sem chamados no recorte atual.
        </p>
      )}
    </div>
  );
}

export function DashboardDistributions({
  total,
  statusSegments,
  departmentSegments,
  onOpenTickets,
}: DashboardDistributionsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <HeroBanner
        className="lg:col-span-1"
        eyebrow="Visão Gerencial"
        title="Acompanhe a saúde dos chamados"
        description="Use os filtros acima para isolar período, departamento, área e cluster — todos os KPIs e rankings reagem em tempo real."
        ctaLabel="Abrir lista completa"
        onCta={onOpenTickets}
        icon={<PieChart className="h-6 w-6 text-white" />}
      />
      <DistributionCard
        title="Distribuição por Status"
        icon={<ListChecks className="h-4 w-4 text-primary" />}
        badge={total}
        segments={statusSegments}
      />
      <DistributionCard
        title="Distribuição por Departamento"
        icon={<Building2 className="h-4 w-4 text-primary" />}
        badge={departmentSegments.length}
        segments={departmentSegments}
      />
    </div>
  );
}
