import { AlertCircle, Clock, FolderKanban, ListChecks, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HatchedBar, WorkloadHeatmap } from '@/components/dashboard/momentum';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import type { AreaKey } from '@/config/areaCategories';
import type { AreaDashboardController } from '@/hooks/useAreaDashboardController';

export function AreaDashboardInsights({ dashboard }: { dashboard: AreaDashboardController }) {
  return <>
    <Distributions dashboard={dashboard} />
    <WorkloadAndClients dashboard={dashboard} />
    <DashboardTables dashboard={dashboard} />
  </>;
}

function Distributions({ dashboard }: { dashboard: AreaDashboardController }) {
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <DataCard title="Distribuição por Status" icon={<ListChecks className="h-4 w-4 text-primary" />} area={dashboard.paleta} loading={dashboard.isLoading}
      empty={dashboard.statusSegments.length === 0} emptyMessage="Nenhuma tarefa no recorte atual">
      <HatchedBar segments={dashboard.statusSegments} />
    </DataCard>
    <DataCard title="Distribuição por Área Fiscal" icon={<FolderKanban className="h-4 w-4 text-primary" />} area={dashboard.paleta} loading={dashboard.isLoading}
      empty={dashboard.areaSegments.length === 0} emptyMessage="Sem dados de área">
      <HatchedBar segments={dashboard.areaSegments} />
    </DataCard>
  </div>;
}

function WorkloadAndClients({ dashboard }: { dashboard: AreaDashboardController }) {
  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <DataCard title="Workload por Membro · próximos 14 dias" icon={<Users className="h-4 w-4 text-primary" />}
      className="lg:col-span-2" area={dashboard.paleta} loading={dashboard.isLoading} empty={dashboard.heatmap.rows.length === 0}
      emptyMessage="Sem atribuições no recorte atual">
      <WorkloadHeatmap rows={dashboard.heatmap.rows} columnLabels={dashboard.heatmap.columnLabels} />
    </DataCard>
    <DataCard title="Top Clientes · Horas" icon={<Clock className="h-4 w-4 text-primary" />} area={dashboard.paleta} loading={dashboard.isLoading}
      empty={dashboard.topClients.length === 0} emptyMessage="Sem horas estimadas" contentClassName="pt-3">
      <ul className="space-y-3">{dashboard.topClients.map((client, index) => {
        const percentage = (client.hours / (dashboard.topClients[0].hours || 1)) * 100;
        return <li key={index}>
          <div className="flex justify-between mb-1"><span className="text-xs font-medium text-foreground truncate max-w-[160px]">{client.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{client.hours.toFixed(0)}h</span></div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-primary rounded-full transition-all" style={{ width: `${percentage}%` }} /></div>
        </li>;
      })}</ul>
    </DataCard>
  </div>;
}

function DashboardTables({ dashboard }: { dashboard: AreaDashboardController }) {
  const navigate = useNavigate();
  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card className="border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><AlertCircle className="h-4 w-4 text-destructive" />Tarefas Atrasadas</CardTitle>
        {dashboard.overdueRows.length > 0 && <Badge className="bg-destructive/5 text-destructive border-0 text-[10px]">{dashboard.overdueRows.length}</Badge>}
      </CardHeader>
      <CardContent>{dashboard.isLoading ? <LoadingSpinner area={dashboard.paleta} /> : dashboard.overdueRows.length === 0
        ? <EmptyMessage message="Nenhuma tarefa atrasada no recorte atual" />
        : <div className="max-h-72 overflow-auto"><Table><TableHeader><TableRow>
          <SmallHead>Tarefa</SmallHead><SmallHead>Cliente</SmallHead><SmallHead>Resp.</SmallHead><SmallHead className="text-right">Atraso</SmallHead>
        </TableRow></TableHeader><TableBody>{dashboard.overdueRows.slice(0, 15).map(row =>
          // `row.areaBase` só vem preenchido no consolidado do Board, onde a linha
          // pode ser de outra área que não a base da tela.
          <TableRow key={row.id} onClick={() => navigate(`${row.areaBase ?? dashboard.areaBase}/projetos/tarefas?taskId=${row.id}`)} className="cursor-pointer hover:bg-muted transition-colors" title="Abrir tarefa em Tarefas">
            <TableCell className="text-sm font-medium max-w-[180px] truncate">{row.title}</TableCell><TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{row.client}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{row.responsible}</TableCell><TableCell className="text-sm font-bold text-destructive text-right tabular-nums">{row.daysOverdue}d</TableCell>
          </TableRow>)}</TableBody></Table></div>}</CardContent>
    </Card>
    <Card className="border-border/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Carga por Membro</CardTitle></CardHeader>
      <CardContent>{dashboard.isLoading ? <LoadingSpinner area={dashboard.paleta} /> : dashboard.memberRows.length === 0
        ? <EmptyMessage message="Sem dados de atribuição" />
        : <div className="max-h-72 overflow-auto"><Table><TableHeader><TableRow>
          <SmallHead>Membro</SmallHead><SmallHead className="text-right">Ativas</SmallHead><SmallHead className="text-right">Horas</SmallHead><SmallHead className="text-right">Atrasadas</SmallHead>
        </TableRow></TableHeader><TableBody>{dashboard.memberRows.map((row, index) => <TableRow key={index}>
          <TableCell className="text-sm font-medium">{row.name}</TableCell><TableCell className="text-sm text-muted-foreground text-right tabular-nums">{row.active}</TableCell>
          <TableCell className="text-sm text-muted-foreground text-right tabular-nums">{row.hours > 0 ? `${row.hours}h` : '-'}</TableCell>
          <TableCell className={`text-sm font-bold text-right tabular-nums ${row.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{row.overdue}</TableCell>
        </TableRow>)}</TableBody></Table></div>}</CardContent>
    </Card>
  </div>;
}

function DataCard({ title, icon, area, loading, empty, emptyMessage, children, className = '', contentClassName = 'pt-4' }: {
  title: string; icon: React.ReactNode; area?: AreaKey; loading: boolean; empty: boolean; emptyMessage: string;
  children: React.ReactNode; className?: string; contentClassName?: string;
}) {
  return <Card className={`border-border/60 shadow-sm rounded-2xl ${className}`}><CardHeader className="pb-2">
    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">{icon}{title}</CardTitle>
  </CardHeader><CardContent className={contentClassName}>{loading ? <LoadingSpinner area={area} /> : empty ? <EmptyMessage message={emptyMessage} /> : children}</CardContent></Card>;
}

function SmallHead({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <TableHead className={`text-[11px] uppercase tracking-wide text-muted-foreground ${className}`}>{children}</TableHead>;
}

function LoadingSpinner({ area }: { area?: AreaKey }) {
  return <div className="h-32 flex items-center justify-center text-muted-foreground"><AreaLoader area={area} size={44} /></div>;
}

function EmptyMessage({ message }: { message: string }) {
  return <div className="h-32 flex items-center justify-center"><p className="text-sm text-muted-foreground">{message}</p></div>;
}
