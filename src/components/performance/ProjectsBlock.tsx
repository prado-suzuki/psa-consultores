import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, LayoutGrid, List, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PerformanceProject } from '@/hooks/usePerformanceData';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const STATUS_CONFIG = {
  em_dia: { label: 'Em dia', color: '#10B981', bg: 'bg-emerald-50 text-emerald-700' },
  em_risco: { label: 'Em risco', color: '#D97706', bg: 'bg-amber-50 text-amber-700' },
  atrasado: { label: 'Atrasado', color: '#EF4444', bg: 'bg-red-50 text-red-700' },
};

interface Props {
  projects: PerformanceProject[];
  isLoading: boolean;
}

export const ProjectsBlock = ({ projects, isLoading }: Props) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) {
    return <Skeleton className="h-[400px] rounded-xl" />;
  }

  const filtered = projects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.client_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.computed_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const now = new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Projetos <span className="text-foreground ml-1">({filtered.length})</span>
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar projeto ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="em_dia">Em dia</SelectItem>
            <SelectItem value="em_risco">Em risco</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden">
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('table')}><List className="h-4 w-4" /></Button>
          <Button variant={view === 'cards' ? 'secondary' : 'ghost'} size="sm" onClick={() => setView('cards')}><LayoutGrid className="h-4 w-4" /></Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum projeto encontrado para os filtros aplicados.</CardContent></Card>
      ) : view === 'table' ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Tarefas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => {
                const progress = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
                const daysLeft = p.end_date ? differenceInDays(parseISO(p.end_date), now) : null;
                const cfg = STATUS_CONFIG[p.computed_status];
                const isExpanded = expanded === p.id;

                return (
                  <>
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setExpanded(isExpanded ? null : p.id)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.client_name || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress value={progress} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-8 text-right">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.end_date ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{format(parseISO(p.end_date), 'dd/MM/yy')}</span>
                            {daysLeft !== null && (
                              <Badge variant="outline" className={daysLeft < 0 ? 'border-red-200 bg-red-50 text-red-700' : daysLeft < 15 ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}>
                                {daysLeft < 0 ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`}
                              </Badge>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>{p.completed_tasks}/{p.total_tasks}</TableCell>
                      <TableCell><Badge className={cfg.bg}>{cfg.label}</Badge></TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${p.id}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Distribuição de Tarefas</p>
                              <div className="h-[120px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: 'Concluídas', value: p.completed_tasks, fill: '#10B981' },
                                        { name: 'Atrasadas', value: p.overdue_tasks, fill: '#EF4444' },
                                        { name: 'Em aberto', value: Math.max(0, p.total_tasks - p.completed_tasks - p.overdue_tasks), fill: '#3B82F6' },
                                      ].filter(d => d.value > 0)}
                                      cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value"
                                    >
                                      {[{ fill: '#10B981' }, { fill: '#EF4444' }, { fill: '#3B82F6' }].map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Responsável</p>
                              <p className="text-sm">{p.responsible_name || 'Não definido'}</p>
                              {p.area_name && <Badge variant="outline" className="mt-1">{p.area_name}</Badge>}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Tarefas Atrasadas</p>
                              {p.overdue_tasks > 0 ? (
                                <p className="text-sm text-red-600 font-medium">{p.overdue_tasks} tarefa(s) atrasada(s)</p>
                              ) : (
                                <p className="text-sm text-emerald-600">Nenhuma tarefa atrasada</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const progress = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
            const cfg = STATUS_CONFIG[p.computed_status];
            return (
              <Card key={p.id} className="hover:shadow-md transition-shadow duration-200 group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    {p.area_name && <Badge variant="outline" style={{ borderColor: p.area_color || undefined, color: p.area_color || undefined }}>{p.area_name}</Badge>}
                    <Badge className={cfg.bg}>{cfg.label}</Badge>
                  </div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-sm text-muted-foreground">{p.client_name || 'Sem cliente'}</p>
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress}%</span>
                      <span>{p.end_date ? format(parseISO(p.end_date), 'dd/MM/yy') : '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{p.responsible_name || '—'}</span>
                    <span>{p.completed_tasks}/{p.total_tasks} tarefas</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
