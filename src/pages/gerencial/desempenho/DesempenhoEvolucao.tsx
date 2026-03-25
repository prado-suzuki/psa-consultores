import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DesempenhoLayout } from '@/components/desempenho/DesempenhoLayout';
import { useCiclosAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { useMetas } from '@/hooks/useMetasDesempenho';
import { useFeedbacks } from '@/hooks/useFeedbacksDesempenho';
import { useReunioes } from '@/hooks/useReunioes1a1';
import { useAnalisesSemestrais } from '@/hooks/useAnalisesSemestrais';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';

const classifConfig: Record<string, { label: string; bg: string; text: string }> = {
  supera: { label: 'Supera expectativas', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  atende: { label: 'Atende expectativas', bg: 'bg-green-100', text: 'text-green-800' },
  atende_parcialmente: { label: 'Atende parcialmente', bg: 'bg-amber-100', text: 'text-amber-800' },
  abaixo: { label: 'Abaixo das expectativas', bg: 'bg-red-100', text: 'text-red-800' },
};

const getClassificacao = (media: number) => {
  if (media >= 100) return 'supera';
  if (media >= 85) return 'atende';
  if (media >= 70) return 'atende_parcialmente';
  return 'abaixo';
};

const DesempenhoEvolucao = () => {
  const [searchParams] = useSearchParams();
  const [selectedMembro, setSelectedMembro] = useState(searchParams.get('membro') || '');
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });

  // Fetch data per cycle for selected member
  const { data: feedbacks } = useFeedbacks({ para_usuario_id: selectedMembro || undefined });
  const { data: reunioes } = useReunioes(selectedMembro || undefined);
  const { data: analises } = useAnalisesSemestrais();

  // Build performance chart data across cycles
  const performanceData = ciclos?.map((ciclo) => {
    // We need metas for this member in this cycle - fetch inline isn't ideal but works for small data
    return { ciclo: ciclo.nome, ciclo_id: ciclo.id };
  }) ?? [];

  // Per-cycle metas for the selected member (we fetch all at once)
  const allCicloIds = ciclos?.map((c) => c.id) ?? [];
  const { data: allMetas } = useMetas(selectedMembro ? { ciclo_id: allCicloIds[0], responsavel_id: selectedMembro } : undefined);

  // Actually we need metas across all cycles for this member
  const { data: memberMetasAll } = useQuery({
    queryKey: ['metas_member_all', selectedMembro],
    queryFn: async () => {
      if (!selectedMembro) return [];
      const { data, error } = await supabase.from('metas' as any).select('*').eq('responsavel_id', selectedMembro).eq('nivel', 'individual');
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; ciclo_id: string; progresso_atual: number; peso: number; dimensao: string; classificacao_final: string | null }[];
    },
    enabled: !!selectedMembro,
  });

  // Build chart data
  const chartData = ciclos?.map((ciclo) => {
    const ciclometas = memberMetasAll?.filter((m) => m.ciclo_id === ciclo.id) ?? [];
    const totalPeso = ciclometas.reduce((a, m) => a + (m.peso ?? 1), 0);
    const media = totalPeso > 0 ? Math.round(ciclometas.reduce((a, m) => a + m.progresso_atual * (m.peso ?? 1), 0) / totalPeso) : 0;
    return { name: ciclo.nome.slice(0, 15), media, status: ciclo.status };
  }).reverse() ?? [];

  // Feedback distribution by type per cycle
  const feedbackChartData = ciclos?.map((ciclo) => {
    const cf = feedbacks?.filter((f) => f.ciclo_id === ciclo.id) ?? [];
    return {
      name: ciclo.nome.slice(0, 15),
      Reconhecimento: cf.filter((f) => f.tipo === 'reconhecimento').length,
      Desenvolvimento: cf.filter((f) => f.tipo === 'desenvolvimento').length,
      '360°': cf.filter((f) => f.tipo === '360').length,
    };
  }).reverse() ?? [];

  // Current cycle PPR projection
  const currentCiclo = ciclos?.find((c) => c.status === 'em_andamento');
  const currentMetas = memberMetasAll?.filter((m) => m.ciclo_id === currentCiclo?.id) ?? [];
  const totalPeso = currentMetas.reduce((a, m) => a + (m.peso ?? 1), 0);
  const pprMedia = totalPeso > 0 ? Math.round(currentMetas.reduce((a, m) => a + m.progresso_atual * (m.peso ?? 1), 0) / totalPeso) : 0;
  const pprClassif = getClassificacao(pprMedia);
  const pprConfig = classifConfig[pprClassif];

  // Dimensions progress
  const dimensionProgress = ['entrega', 'impacto', 'gestao'].map((dim) => {
    const dimMetas = currentMetas.filter((m) => m.dimensao === dim);
    const tp = dimMetas.reduce((a, m) => a + (m.peso ?? 1), 0);
    const avg = tp > 0 ? Math.round(dimMetas.reduce((a, m) => a + m.progresso_atual * (m.peso ?? 1), 0) / tp) : 0;
    return { dimensao: dim, media: avg };
  });

  // 1:1 heatmap data (months with meetings)
  const reuniaoMonths = new Set(reunioes?.map((r) => r.data_reuniao.slice(0, 7)) ?? []);

  // Member analyses
  const memberAnalises = analises?.filter((a) => a.responsavel_id === selectedMembro) ?? [];

  const getName = (id: string) => { const p = profiles?.find((pr) => pr.id === id); return p ? `${p.first_name} ${p.last_name}` : id.slice(0, 8); };

  return (
    <DesempenhoLayout title="Evolução" subtitle="Análise de desempenho individual">
      <div className="mb-6">
        <Select value={selectedMembro} onValueChange={setSelectedMembro}>
          <SelectTrigger className="w-72 bg-white"><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
          <SelectContent>{profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!selectedMembro ? (
        <p className="text-muted-foreground text-sm">Selecione um membro para ver sua evolução.</p>
      ) : (
        <div className="space-y-6">
          {/* Block 1: Performance chart */}
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader><CardTitle className="text-lg">Performance por Ciclo</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="media" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>}
            </CardContent>
          </Card>

          {/* Block 2: Feedback chart */}
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader><CardTitle className="text-lg">Histórico de Feedbacks</CardTitle></CardHeader>
            <CardContent>
              {feedbackChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={feedbackChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Reconhecimento" stackId="a" fill="#10B981" />
                    <Bar dataKey="Desenvolvimento" stackId="a" fill="#D97706" />
                    <Bar dataKey="360°" stackId="a" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground">Sem feedbacks registrados.</p>}
              {/* Last 5 feedbacks */}
              <div className="mt-4 space-y-2">
                {feedbacks?.slice(0, 5).map((f) => (
                  <div key={f.id} className="p-2 rounded-lg bg-slate-50 text-sm">
                    <div className="flex justify-between"><Badge className="text-xs">{f.tipo}</Badge><span className="text-xs text-muted-foreground">{f.created_at?.slice(0, 10)}</span></div>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{f.contexto}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Block 3: 1:1 cadence */}
          <Card className="border-border shadow-sm rounded-xl">
            <CardHeader><CardTitle className="text-lg">Cadência de 1:1s</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 11 + i);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const has = reuniaoMonths.has(key);
                  return (
                    <div key={key} className={`w-8 h-8 rounded text-[10px] flex items-center justify-center ${has ? 'bg-emerald-400 text-white' : 'bg-slate-100 text-slate-400'}`} title={key}>
                      {d.toLocaleString('pt-BR', { month: 'short' }).slice(0, 3)}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm text-muted-foreground">Total no ciclo ativo: <strong>{reunioes?.filter((r) => r.ciclo_id === currentCiclo?.id).length ?? 0}</strong></p>
            </CardContent>
          </Card>

          {/* Block 4: PPR Projection */}
          <Card className={`border-border shadow-sm rounded-xl ${pprConfig?.bg ?? 'bg-slate-50'}`}>
            <CardHeader><CardTitle className={`text-lg ${pprConfig?.text ?? ''}`}>{currentCiclo?.status === 'encerrado' ? 'Resultado Oficial' : 'Projeção de PPR'}</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${pprConfig?.text ?? ''}`}>{pprConfig?.label ?? '—'}</p>
              <p className="text-sm mt-1 text-muted-foreground">{pprMedia}% médio ponderado</p>
              <div className="mt-4 space-y-2">
                {dimensionProgress.map((dp) => (
                  <div key={dp.dimensao} className="flex items-center gap-3">
                    <span className="text-sm w-20 capitalize">{dp.dimensao}</span>
                    <Progress value={dp.media} className="flex-1 h-2" />
                    <span className="text-sm font-medium w-10 text-right">{dp.media}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Análises semestrais */}
          {memberAnalises.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <ChevronDown className="h-4 w-4" /> Análises Semestrais ({memberAnalises.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3">
                {memberAnalises.map((a) => (
                  <Card key={a.id} className="border-border shadow-sm rounded-xl">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <Badge variant="outline">{a.status}</Badge>
                      {a.entregas_realizadas && <div><strong>Entregas:</strong> {a.entregas_realizadas}</div>}
                      {a.riscos_identificados && <div><strong>Riscos:</strong> {a.riscos_identificados}</div>}
                      {a.ajustes_necessarios && <div><strong>Ajustes:</strong> {a.ajustes_necessarios}</div>}
                      {a.comentario_lider && <div><strong>Comentário líder:</strong> {a.comentario_lider}</div>}
                      {a.comentario_avaliado && <div><strong>Comentário avaliado:</strong> {a.comentario_avaliado}</div>}
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </DesempenhoLayout>
  );
};

export default DesempenhoEvolucao;
