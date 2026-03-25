import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ActivityHeatmap } from './ActivityHeatmap';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  members: any[];
  profiles: any[];
  periodTasks: any[];
  metas: any[];
  isLoading: boolean;
}

export const TeamContributionBlock = ({ members, profiles, periodTasks, metas, isLoading }: Props) => {
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-[400px] rounded-xl" />;

  // Build member data
  const memberData = profiles.map((p: any) => {
    const memberTasks = periodTasks.filter(t => t.assigned_to === p.id);
    const completed = memberTasks.filter(t => t.status === 'concluida').length;
    const onTime = memberTasks.filter(t => {
      if (t.status !== 'concluida') return false;
      if (!t.due_date || !t.updated_at) return true;
      return new Date(t.updated_at) <= new Date(t.due_date);
    }).length;

    const projectIds = new Set(memberTasks.map(t => t.project_id).filter(Boolean));

    const lastActivity = memberTasks.length > 0
      ? memberTasks.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.updated_at
      : null;

    const memberMetas = metas.filter(m => m.responsavel_id === p.id && m.nivel === 'individual');
    const metaProgress = memberMetas.length > 0
      ? Math.round(memberMetas.reduce((a: number, m: any) => a + (m.progresso_atual || 0), 0) / memberMetas.length)
      : null;

    const areaInfo = members.find((m: any) => m.user_id === p.id);

    return {
      id: p.id,
      name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sem nome',
      area: (areaInfo?.equipe as any)?.area?.name || '—',
      tasks_completed: completed,
      tasks_total: memberTasks.length,
      on_time_rate: memberTasks.length > 0 ? Math.round((onTime / Math.max(completed, 1)) * 100) : null,
      projects_active: projectIds.size,
      last_activity: lastActivity,
      meta_progress: metaProgress,
    };
  }).filter(m => m.tasks_total > 0 || m.meta_progress !== null).sort((a, b) => b.tasks_completed - a.tasks_completed);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Contribuição da Equipe <span className="font-normal text-xs">(visível apenas para gestão)</span>
      </h2>

      {memberData.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma atividade registrada no período.</CardContent></Card>
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead className="text-right">Tarefas concluídas</TableHead>
                  <TableHead className="text-right">Taxa pontualidade</TableHead>
                  <TableHead className="text-right">Projetos</TableHead>
                  <TableHead>Última atividade</TableHead>
                  <TableHead className="text-right">Metas PPR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberData.map(m => (
                  <TableRow
                    key={m.id}
                    className={`cursor-pointer transition-colors ${selectedMember === m.id ? 'bg-muted/60' : 'hover:bg-muted/30'}`}
                    onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.area}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{m.tasks_completed}</TableCell>
                    <TableCell className="text-right">
                      {m.on_time_rate !== null ? (
                        <span className={m.on_time_rate >= 80 ? 'text-emerald-600' : m.on_time_rate >= 60 ? 'text-amber-600' : 'text-red-600'}>
                          {m.on_time_rate}%
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">{m.projects_active}</TableCell>
                    <TableCell>
                      {m.last_activity ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(parseISO(m.last_activity), { addSuffix: true, locale: ptBR })}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.meta_progress !== null ? `${m.meta_progress}%` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                Atividade — últimos 90 dias
                {selectedMember && <span className="text-foreground ml-1">(filtrado por membro)</span>}
              </p>
              <ActivityHeatmap tasks={periodTasks} selectedMemberId={selectedMember} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
