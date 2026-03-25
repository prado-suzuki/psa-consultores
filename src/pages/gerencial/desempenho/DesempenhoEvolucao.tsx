import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCiclosAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { useMetas, useUpdateMeta } from '@/hooks/useMetasDesempenho';
import { useFeedbacks } from '@/hooks/useFeedbacksDesempenho';
import { useReunioes, useAllOpenItensAcao } from '@/hooks/useReunioes1a1';
import { useAnalisesSemestrais } from '@/hooks/useAnalisesSemestrais';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from 'recharts';
import { toast } from '@/hooks/use-toast';

const classifConfig: Record<string, { label: string; bg: string; text: string }> = {
  supera: { label: 'Supera expectativas', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  atende: { label: 'Atende expectativas', bg: 'bg-green-50', text: 'text-green-700' },
  atende_parcialmente: { label: 'Atende parcialmente', bg: 'bg-amber-50', text: 'text-amber-700' },
  abaixo: { label: 'Abaixo das expectativas', bg: 'bg-red-50', text: 'text-red-700' },
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
  const updateMeta = useUpdateMeta();
  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });

  const { data: feedbacks } = useFeedbacks({ para_usuario_id: selectedMembro || undefined });
  const { data: reunioes } = useReunioes(selectedMembro || undefined);
  const { data: analises } = useAnalisesSemestrais();
  const { data: openItems } = useAllOpenItensAcao();

  const { data: memberMetasAll } = useQuery({
    queryKey: ['metas_member_all', selectedMembro],
    queryFn: async () => {
      if (!selectedMembro) return [];
      const { data, error } = await supabase.from('metas' as any).select('*').eq('responsavel_id', selectedMembro).eq('nivel', 'individual');
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; ciclo_id: string; progresso_atual: number; peso: number; dimensao: string; classificacao_final: string | null; ajuste_qualitativo: string | null }[];
    },
    enabled: !!selectedMembro,
  });

  // All action items for this member
  const { data: allItens } = useQuery({
    queryKey: ['itens_acao_member', selectedMembro],
    queryFn: async () => {
      if (!selectedMembro || !reunioes) return [];
      const reuniaoIds = reunioes.map(r => r.id);
      if (reuniaoIds.length === 0) return [];
      const { data } = await supabase.from('itens_acao_1a1' as any).select('*').in('reuniao_id', reuniaoIds);
      return (data ?? []) as unknown as { id: string; reuniao_id: string; descricao: string; status: string }[];
    },
    enabled: !!selectedMembro && !!reunioes,
  });

  const chartData = ciclos?.map(ciclo => {
    const ciclometas = memberMetasAll?.filter(m => m.ciclo_id === ciclo.id) ?? [];
    const totalPeso = ciclometas.reduce((a, m) => a + (m.peso ?? 1), 0);
    const media = totalPeso > 0 ? Math.round(ciclometas.reduce((a, m) => a + m.progresso_atual * (m.peso ?? 1), 0) / totalPeso) : 0;
    return { name: ciclo.nome.slice(0, 15), media, status: ciclo.status };
  }).reverse() ?? [];

  const feedbackChartData = ciclos?.map(ciclo => {
    const cf = feedbacks?.filter(f => f.ciclo_id === ciclo.id) ?? [];
    return {
      name: ciclo.nome.slice(0, 15),
      Reconhecimento: cf.filter(f => f.tipo === 'reconhecimento').length,
      Desenvolvimento: cf.filter(f => f.tipo === 'desenvolvimento').length,
      '360': cf.filter(f => f.tipo === '360').length,
    };
  }).reverse() ?? [];

  const currentCiclo = ciclos?.find(c => c.status === 'em_andamento');
  const currentMetas = memberMetasAll?.filter(m => m.ciclo_id === currentCiclo?.id) ?? [];
  const totalPeso = currentMetas.reduce((a, m) => a + (m.peso ?? 1), 0);
  const pprMedia = totalPeso > 0 ? Math.round(currentMetas.reduce((a, m) => a + m.progresso_atual * (m.peso ?? 1), 0) / totalPeso) : 0;
  const pprClassif = getClassificacao(pprMedia);
  const pprConfig = classifConfig[pprClassif];

  const dimensionProgress = ['entrega', 'impacto', 'gestao'].map(dim => {
    const dimMetas = currentMetas.filter(m => m.dimensao === dim);
    const tp = dimMetas.reduce((a, m) => a + (m.peso ?? 1), 0);
    const avg = tp > 0 ? Math.round(dimMetas.reduce((a, m) => a + m.progresso_atual * (m.peso ?? 1), 0) / tp) : 0;
    return { dimensao: dim, media: avg };
  });

  const reuniaoMonths = new Set(reunioes?.map(r => r.data_reuniao.slice(0, 7)) ?? []);

  // Action item completion rate
  const totalItens = allItens?.length ?? 0;
  const concluidos = allItens?.filter(i => i.status === 'concluido').length ?? 0;
  const taxaConclusao = totalItens > 0 ? Math.round((concluidos / totalItens) * 100) : 0;

  const memberAnalises = analises?.filter(a => a.responsavel_id === selectedMembro) ?? [];

  // Qualitative adjustment
  const [ajusteQualitativo, setAjusteQualitativo] = useState('');
  const [ajusteSaving, setAjusteSaving] = useState(false);

  const existingAjuste = currentMetas[0]?.ajuste_qualitativo ?? '';

  const handleSaveAjuste = async () => {
    setAjusteSaving(true);
    for (const m of currentMetas) {
      await updateMeta.mutateAsync({ id: m.id, ajuste_qualitativo: ajusteQualitativo || null });
    }
    setAjusteSaving(false);
    toast({ title: 'Ajuste qualitativo salvo' });
  };

  return (
    <BoardLayout title="Evolucao" subtitle="Analise de desempenho individual">
      <div className="mb-6">
        <Select value={selectedMembro} onValueChange={(v) => { setSelectedMembro(v); setAjusteQualitativo(''); }}>
          <SelectTrigger className="w-72 bg-white"><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
          <SelectContent>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {!selectedMembro ? (
        <div className="flex flex-col items-center py-12">
          <TrendingUpIcon className="h-8 w-8 mb-2" style={{ color: '#CBD5E1' }} />
          <p className="text-sm" style={{ color: '#64748B' }}>Selecione um membro para ver sua evolucao.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Block 1: Performance chart */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader><CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Performance por Ciclo</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis domain={[0, 100]} /><Tooltip /><Line type="monotone" dataKey="media" stroke="#6366F1" strokeWidth={2} dot={{ r: 4 }} /></LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm" style={{ color: '#64748B' }}>Sem dados suficientes.</p>}
            </CardContent>
          </Card>

          {/* Block 2: Feedback chart */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader><CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Historico de Feedbacks</CardTitle></CardHeader>
            <CardContent>
              {feedbackChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={feedbackChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Reconhecimento" stackId="a" fill="#10B981" /><Bar dataKey="Desenvolvimento" stackId="a" fill="#D97706" /><Bar dataKey="360" stackId="a" fill="#3B82F6" /></BarChart>
                </ResponsiveContainer>
              ) : <p className="text-sm" style={{ color: '#64748B' }}>Sem feedbacks registrados.</p>}
              <div className="mt-4 space-y-2">
                {feedbacks?.slice(0, 5).map(f => (
                  <div key={f.id} className="p-2 rounded-lg text-sm" style={{ backgroundColor: '#F8FAFC' }}>
                    <div className="flex justify-between"><Badge className="text-xs">{f.tipo}</Badge><span className="text-xs" style={{ color: '#94A3B8' }}>{f.created_at?.slice(0, 10)}</span></div>
                    <p className="mt-1 line-clamp-2" style={{ color: '#64748B' }}>{f.contexto}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Block 3: 1:1 cadence + action items completion */}
          <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader><CardTitle className="text-[15px] font-semibold" style={{ color: '#0F172A' }}>Cadencia de 1:1s</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 mb-4">
                {Array.from({ length: 12 }).map((_, i) => {
                  const d = new Date(); d.setMonth(d.getMonth() - 11 + i);
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const has = reuniaoMonths.has(key);
                  return (
                    <div key={key} className="w-8 h-8 rounded text-[10px] flex items-center justify-center" style={{ backgroundColor: has ? '#10B981' : '#F1F5F9', color: has ? '#FFFFFF' : '#94A3B8' }} title={key}>
                      {d.toLocaleString('pt-BR', { month: 'short' }).slice(0, 3)}
                    </div>
                  );
                })}
              </div>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>Total no ciclo ativo: <strong>{reunioes?.filter(r => r.ciclo_id === currentCiclo?.id).length ?? 0}</strong></p>
              {/* Action item completion rate */}
              <div className="pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium" style={{ color: '#334155' }}>Taxa de conclusao de itens de acao</p>
                  <span className="text-sm font-semibold" style={{ color: taxaConclusao >= 85 ? '#10B981' : taxaConclusao >= 70 ? '#D97706' : '#EF4444' }}>{taxaConclusao}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0' }}>
                  <div className="h-full rounded-full" style={{ width: `${taxaConclusao}%`, backgroundColor: taxaConclusao >= 85 ? '#10B981' : taxaConclusao >= 70 ? '#D97706' : '#EF4444' }} />
                </div>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{concluidos} de {totalItens} itens concluidos</p>
              </div>
            </CardContent>
          </Card>

          {/* Block 4: PPR Projection + qualitative adjustment */}
          <Card className={`rounded-xl shadow-sm ${pprConfig?.bg ?? 'bg-slate-50'}`} style={{ border: '1px solid #E2E8F0' }}>
            <CardHeader><CardTitle className={`text-[15px] font-semibold ${pprConfig?.text ?? ''}`}>{currentCiclo?.status === 'encerrado' ? 'Resultado Oficial' : 'Projecao de PPR'}</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${pprConfig?.text ?? ''}`}>{pprConfig?.label ?? '--'}</p>
              <p className="text-sm mt-1" style={{ color: '#64748B' }}>{pprMedia}% medio ponderado</p>
              <div className="mt-4 space-y-2">
                {dimensionProgress.map(dp => (
                  <div key={dp.dimensao} className="flex items-center gap-3">
                    <span className="text-sm w-20 capitalize" style={{ color: '#334155' }}>{dp.dimensao}</span>
                    <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0' }}>
                      <div className="h-full rounded-full" style={{ width: `${dp.media}%`, backgroundColor: dp.media >= 85 ? '#10B981' : dp.media >= 70 ? '#D97706' : '#EF4444' }} />
                    </div>
                    <span className="text-sm font-medium w-10 text-right">{dp.media}%</span>
                  </div>
                ))}
              </div>
              {/* Qualitative adjustment */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <Label className="text-sm font-medium" style={{ color: '#334155' }}>Ajuste qualitativo do lider</Label>
                <Textarea
                  className="mt-1 bg-white"
                  placeholder="Descreva ajustes qualitativos..."
                  value={ajusteQualitativo || existingAjuste}
                  onChange={e => setAjusteQualitativo(e.target.value)}
                />
                <Button variant="outline" size="sm" className="mt-2" onClick={handleSaveAjuste} disabled={ajusteSaving}>
                  {ajusteSaving ? 'Salvando...' : 'Salvar ajuste'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analises semestrais */}
          {memberAnalises.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: '#334155' }}>
                <ChevronDown className="h-4 w-4" /> Analises Semestrais ({memberAnalises.length})
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3">
                {memberAnalises.map(a => (
                  <Card key={a.id} className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <Badge variant="outline">{a.status}</Badge>
                      {a.entregas_realizadas && <div><strong>Entregas:</strong> {a.entregas_realizadas}</div>}
                      {a.riscos_identificados && <div><strong>Riscos:</strong> {a.riscos_identificados}</div>}
                      {a.ajustes_necessarios && <div><strong>Ajustes:</strong> {a.ajustes_necessarios}</div>}
                      {a.comentario_lider && <div><strong>Comentario lider:</strong> {a.comentario_lider}</div>}
                      {a.comentario_avaliado && <div><strong>Comentario avaliado:</strong> {a.comentario_avaliado}</div>}
                    </CardContent>
                  </Card>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </BoardLayout>
  );
};

export default DesempenhoEvolucao;
