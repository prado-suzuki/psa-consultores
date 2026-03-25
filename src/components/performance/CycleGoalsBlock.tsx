import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, format } from 'date-fns';
import { Button } from '@/components/ui/button';

const PPR_COLORS = {
  supera: { bg: '#D1FAE5', text: '#065F46' },
  atende: { bg: '#A7F3D0', text: '#065F46' },
  atende_parcialmente: { bg: '#FEF3C7', text: '#92400E' },
  abaixo: { bg: '#FEE2E2', text: '#991B1B' },
};

function getClassificacao(progress: number) {
  if (progress >= 100) return { label: 'Supera', key: 'supera' as const };
  if (progress >= 85) return { label: 'Atende', key: 'atende' as const };
  if (progress >= 70) return { label: 'Atende Parcialmente', key: 'atende_parcialmente' as const };
  return { label: 'Abaixo', key: 'abaixo' as const };
}

const DIMENSION_COLORS: Record<string, string> = {
  entrega: '#3B82F6',
  impacto: '#10B981',
  gestao: '#8B5CF6',
};

interface Props {
  ciclo: any;
  metas: any[];
  profiles: any[];
  isLoading: boolean;
}

export const CycleGoalsBlock = ({ ciclo, metas, profiles, isLoading }: Props) => {
  const navigate = useNavigate();

  if (isLoading) return <Skeleton className="h-[400px] rounded-xl" />;

  if (!ciclo) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Desempenho — Ciclo Atual</h2>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
            <p className="mb-3">Nenhum ciclo ativo encontrado.</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/gerencial/desempenho/ciclos')}>
              Cadastrar primeiro ciclo <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const cicloStart = parseISO(ciclo.data_inicio);
  const cicloEnd = parseISO(ciclo.data_fim);
  const totalDays = differenceInDays(cicloEnd, cicloStart);
  const elapsed = differenceInDays(now, cicloStart);
  const timeProgress = totalDays > 0 ? Math.min(Math.round((elapsed / totalDays) * 100), 100) : 0;

  // Distribution cards
  const noPrazo = metas.filter(m => {
    if (m.status === 'concluida') return false;
    if (!m.prazo) return true;
    return m.progresso_atual >= 70 || new Date(m.prazo) > now;
  }).length;
  const concluidas = metas.filter(m => m.status === 'concluida').length;
  const atrasadas = metas.filter(m => m.prazo && new Date(m.prazo) < now && m.status !== 'concluida').length;
  const emRisco = metas.filter(m => {
    if (m.status === 'concluida') return false;
    if (!m.prazo) return false;
    const daysLeft = differenceInDays(parseISO(m.prazo), now);
    return daysLeft <= 15 && daysLeft > 0 && (m.progresso_atual || 0) < 70;
  }).length;

  // Donut by dimension
  const dimensionData = ['entrega', 'impacto', 'gestao'].map(dim => {
    const dimMetas = metas.filter(m => m.dimensao === dim);
    const avg = dimMetas.length > 0 ? Math.round(dimMetas.reduce((a: number, m: any) => a + (m.progresso_atual || 0), 0) / dimMetas.length) : 0;
    return { name: dim.charAt(0).toUpperCase() + dim.slice(1), value: avg, fill: DIMENSION_COLORS[dim] || '#6B7280' };
  });

  // PPR projections
  const individualMetas = metas.filter(m => m.nivel === 'individual' && m.responsavel_id);
  const memberIds = [...new Set(individualMetas.map(m => m.responsavel_id))];

  const pprProjections = memberIds.map(userId => {
    const userMetas = individualMetas.filter(m => m.responsavel_id === userId);
    const totalWeight = userMetas.reduce((a: number, m: any) => a + (m.peso || 1), 0);
    const weightedProgress = totalWeight > 0
      ? userMetas.reduce((a: number, m: any) => a + (m.progresso_atual || 0) * (m.peso || 1), 0) / totalWeight
      : 0;
    const cls = getClassificacao(weightedProgress);
    const profile = profiles.find((p: any) => p.id === userId);
    return {
      userId,
      name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Sem nome',
      progress: Math.round(weightedProgress),
      classificacao: cls,
    };
  }).sort((a, b) => b.progress - a.progress);

  // Critical deadlines
  const criticalMetas = metas
    .filter(m => m.prazo && m.status !== 'concluida' && (m.progresso_atual || 0) < 85)
    .sort((a: any, b: any) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Desempenho — Ciclo Atual</h2>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-semibold">{ciclo.nome}</p>
              <p className="text-xs text-muted-foreground">
                {format(cicloStart, 'dd/MM/yy')} — {format(cicloEnd, 'dd/MM/yy')}
              </p>
            </div>
            <span className="text-sm font-medium">{timeProgress}% do tempo</span>
          </div>
          <Progress value={timeProgress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'No prazo', value: noPrazo, color: '#10B981' },
          { label: 'Em risco', value: emRisco, color: '#D97706' },
          { label: 'Atrasadas', value: atrasadas, color: '#EF4444' },
          { label: 'Concluídas', value: concluidas, color: '#3B82F6' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Por Dimensão</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dimensionData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {dimensionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {pprProjections.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Projeções PPR</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {pprProjections.map(p => {
                  const colors = PPR_COLORS[p.classificacao.key];
                  return (
                    <div
                      key={p.userId}
                      className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: colors.bg }}
                      onClick={() => navigate(`/gerencial/desempenho/evolucao?membro=${p.userId}`)}
                    >
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{p.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: colors.text }}>{p.progress}%</span>
                        <Badge style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.text}30` }}>
                          {p.classificacao.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {criticalMetas.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Próximos Prazos Críticos</p>
            <div className="space-y-2">
              {criticalMetas.map((m: any) => {
                const daysLeft = differenceInDays(parseISO(m.prazo), now);
                const responsible = profiles.find((p: any) => p.id === m.responsavel_id);
                return (
                  <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{m.titulo}</p>
                      <p className="text-xs text-muted-foreground">{responsible ? `${responsible.first_name} ${responsible.last_name}`.trim() : '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={m.progresso_atual || 0} className="h-2 w-16" />
                      <Badge variant="outline" className={daysLeft < 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d atraso` : `${daysLeft}d`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
