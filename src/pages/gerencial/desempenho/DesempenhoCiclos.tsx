import { useState } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCiclosAvaliacao, useCreateCiclo, useUpdateCiclo, type CicloAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { useMetas } from '@/hooks/useMetasDesempenho';
import { useAnalisesSemestrais, useUpsertAnalise } from '@/hooks/useAnalisesSemestrais';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  planejado: 'bg-slate-100 text-slate-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  em_avaliacao: 'bg-amber-100 text-amber-700',
  encerrado: 'bg-emerald-100 text-emerald-700',
};
const statusLabels: Record<string, string> = {
  planejado: 'Planejado', em_andamento: 'Em andamento', em_avaliacao: 'Em avaliacao', encerrado: 'Encerrado',
};

const DesempenhoCiclos = () => {
  const { data: ciclos, isLoading } = useCiclosAvaliacao();
  const createCiclo = useCreateCiclo();
  const updateCiclo = useUpdateCiclo();
  const [showForm, setShowForm] = useState(false);
  const [selectedCiclo, setSelectedCiclo] = useState<CicloAvaliacao | null>(null);
  const [showAnalise, setShowAnalise] = useState(false);
  const [analiseMembroIdx, setAnaliseMembroIdx] = useState(0);
  const [form, setForm] = useState({ nome: '', data_inicio: '', data_fim: '', data_analise_semestral: '', descricao: '', status: 'planejado' });

  // Drill-down data
  const { data: metasCiclo } = useMetas(selectedCiclo ? { ciclo_id: selectedCiclo.id } : undefined);
  const { data: analises } = useAnalisesSemestrais(selectedCiclo?.id);
  const upsertAnalise = useUpsertAnalise();

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });
  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

  // Drill-down computations
  const empresaCount = metasCiclo?.filter(m => m.nivel === 'empresa').length ?? 0;
  const equipeCount = metasCiclo?.filter(m => m.nivel === 'equipe').length ?? 0;
  const individualCount = metasCiclo?.filter(m => m.nivel === 'individual').length ?? 0;
  const entregaCount = metasCiclo?.filter(m => m.dimensao === 'entrega').length ?? 0;
  const impactoCount = metasCiclo?.filter(m => m.dimensao === 'impacto').length ?? 0;
  const gestaoCount = metasCiclo?.filter(m => m.dimensao === 'gestao').length ?? 0;

  const totalPeso = metasCiclo?.reduce((a, m) => a + m.peso, 0) ?? 0;
  const avgProgress = totalPeso > 0 ? Math.round((metasCiclo?.reduce((a, m) => a + m.progresso_atual * m.peso, 0) ?? 0) / totalPeso) : 0;

  // Temporal progress
  const getTemporalProgress = (c: CicloAvaliacao) => {
    const start = new Date(c.data_inicio).getTime();
    const end = new Date(c.data_fim).getTime();
    const now = Date.now();
    if (now <= start) return 0;
    if (now >= end) return 100;
    return Math.round(((now - start) / (end - start)) * 100);
  };

  // Members with individual metas
  const membrosUnicos = [...new Set(metasCiclo?.filter(m => m.nivel === 'individual' && m.responsavel_id).map(m => m.responsavel_id!) ?? [])];

  // Analise semestral form state
  const [analiseForm, setAnaliseForm] = useState({ entregas_realizadas: '', riscos_identificados: '', ajustes_necessarios: '', comentario_lider: '', comentario_avaliado: '' });

  const handleCreate = () => {
    createCiclo.mutate({ nome: form.nome, data_inicio: form.data_inicio, data_fim: form.data_fim, data_analise_semestral: form.data_analise_semestral || null, descricao: form.descricao || null, status: form.status },
      { onSuccess: () => { setShowForm(false); setForm({ nome: '', data_inicio: '', data_fim: '', data_analise_semestral: '', descricao: '', status: 'planejado' }); } });
  };

  const handleStatusChange = (ciclo: CicloAvaliacao, newStatus: string) => {
    if (newStatus === 'encerrado') {
      const individuais = metasCiclo?.filter(m => m.nivel === 'individual') ?? [];
      const semClassif = individuais.filter(m => !m.classificacao_final);
      if (semClassif.length > 0) {
        toast({ title: 'Nao e possivel encerrar', description: `${semClassif.length} metas individuais sem classificacao final.`, variant: 'destructive' });
        return;
      }
    }
    updateCiclo.mutate({ id: ciclo.id, status: newStatus });
  };

  const openAnalise = () => {
    setAnaliseMembroIdx(0);
    const currentMembro = membrosUnicos[0];
    const existing = analises?.find(a => a.responsavel_id === currentMembro);
    setAnaliseForm({ entregas_realizadas: existing?.entregas_realizadas ?? '', riscos_identificados: existing?.riscos_identificados ?? '', ajustes_necessarios: existing?.ajustes_necessarios ?? '', comentario_lider: existing?.comentario_lider ?? '', comentario_avaliado: existing?.comentario_avaliado ?? '' });
    setShowAnalise(true);
  };

  const saveAnalise = (advance: boolean) => {
    const currentMembro = membrosUnicos[analiseMembroIdx];
    const existing = analises?.find(a => a.responsavel_id === currentMembro);
    upsertAnalise.mutate({
      id: existing?.id, ciclo_id: selectedCiclo?.id ?? null, responsavel_id: currentMembro, status: 'rascunho',
      ...analiseForm,
    }, {
      onSuccess: () => {
        if (advance && analiseMembroIdx < membrosUnicos.length - 1) {
          const nextIdx = analiseMembroIdx + 1;
          setAnaliseMembroIdx(nextIdx);
          const nextExisting = analises?.find(a => a.responsavel_id === membrosUnicos[nextIdx]);
          setAnaliseForm({ entregas_realizadas: nextExisting?.entregas_realizadas ?? '', riscos_identificados: nextExisting?.riscos_identificados ?? '', ajustes_necessarios: nextExisting?.ajustes_necessarios ?? '', comentario_lider: nextExisting?.comentario_lider ?? '', comentario_avaliado: nextExisting?.comentario_avaliado ?? '' });
        } else {
          setShowAnalise(false);
        }
      },
    });
  };

  const analisePendente = selectedCiclo?.data_analise_semestral ? Math.ceil((new Date(selectedCiclo.data_analise_semestral).getTime() - Date.now()) / 86400000) <= 15 : false;

  return (
    <BoardLayout title="Ciclos de Avaliacao" subtitle="Gerencie os ciclos de avaliacao de desempenho" headerActions={
      <Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Novo Ciclo</Button>
    }>
      {isLoading ? <Skeleton className="h-64" /> : (
        <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #E2E8F0' }}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Nome</TableHead><TableHead>Periodo</TableHead><TableHead>Analise Semestral</TableHead><TableHead>Status</TableHead><TableHead>Acoes</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {ciclos?.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedCiclo(c)}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm" style={{ color: '#64748B' }}>{c.data_inicio} -- {c.data_fim}</TableCell>
                    <TableCell className="text-sm" style={{ color: '#64748B' }}>{c.data_analise_semestral ?? '--'}</TableCell>
                    <TableCell><Badge className={`${statusColors[c.status] ?? ''} border-0 text-xs font-semibold`}>{statusLabels[c.status] ?? c.status}</Badge></TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {c.status === 'planejado' && <Button variant="outline" size="sm" onClick={() => handleStatusChange(c, 'em_andamento')}>Iniciar</Button>}
                        {c.status === 'em_andamento' && <Button variant="outline" size="sm" onClick={() => handleStatusChange(c, 'em_avaliacao')}>Avaliar</Button>}
                        {c.status === 'em_avaliacao' && <Button variant="outline" size="sm" onClick={() => handleStatusChange(c, 'encerrado')}>Encerrar</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!ciclos || ciclos.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8" style={{ color: '#64748B' }}>Nenhum ciclo cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Drill-down Sheet */}
      <Sheet open={!!selectedCiclo} onOpenChange={() => setSelectedCiclo(null)}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          {selectedCiclo && (
            <>
              <SheetHeader><SheetTitle>{selectedCiclo.nome}</SheetTitle></SheetHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <p className="text-sm" style={{ color: '#64748B' }}>{selectedCiclo.data_inicio} -- {selectedCiclo.data_fim}</p>
                  <Badge className={`${statusColors[selectedCiclo.status]} border-0 text-xs mt-1`}>{statusLabels[selectedCiclo.status]}</Badge>
                </div>

                {/* Temporal progress */}
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: '#64748B' }}>Progresso temporal</p>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: '#E2E8F0' }}>
                    <div className="h-full rounded-full" style={{ width: `${getTemporalProgress(selectedCiclo)}%`, backgroundColor: '#6366F1' }} />
                  </div>
                  <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{getTemporalProgress(selectedCiclo)}% do ciclo decorrido</p>
                </div>

                {/* Gauge */}
                <div className="flex items-center justify-center">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: avgProgress, fill: avgProgress >= 85 ? '#10B981' : avgProgress >= 70 ? '#D97706' : '#EF4444' }]} startAngle={180} endAngle={0}>
                        <RadialBar background dataKey="value" />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-2xl font-bold ml-2" style={{ color: '#0F172A' }}>{avgProgress}%</p>
                </div>

                {/* Counts by level */}
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: 'Empresa', count: empresaCount }, { label: 'Equipe', count: equipeCount }, { label: 'Individual', count: individualCount }].map(x => (
                    <Card key={x.label} className="bg-white rounded-xl" style={{ border: '1px solid #E2E8F0' }}>
                      <CardContent className="p-3 text-center">
                        <p className="text-xl font-bold" style={{ color: '#0F172A' }}>{x.count}</p>
                        <p className="text-[11px]" style={{ color: '#64748B' }}>{x.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Counts by dimension */}
                <div className="flex gap-2">
                  <Badge className="bg-blue-500/12 text-blue-600 border-0 text-xs rounded-full px-3">Entrega {entregaCount}</Badge>
                  <Badge className="bg-emerald-500/12 text-emerald-600 border-0 text-xs rounded-full px-3">Impacto {impactoCount}</Badge>
                  <Badge className="bg-violet-500/12 text-violet-600 border-0 text-xs rounded-full px-3">Gestao {gestaoCount}</Badge>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {selectedCiclo.status === 'em_avaliacao' && (
                    <Button className="w-full" onClick={() => handleStatusChange(selectedCiclo, 'encerrado')}>
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Encerrar ciclo
                    </Button>
                  )}
                  {analisePendente && membrosUnicos.length > 0 && (
                    <Button variant="outline" className="w-full" onClick={openAnalise}>Abrir analise semestral</Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Analise Semestral Modal */}
      <Dialog open={showAnalise} onOpenChange={setShowAnalise}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analise Semestral</DialogTitle>
            <p className="text-sm" style={{ color: '#64748B' }}>Membro {analiseMembroIdx + 1} de {membrosUnicos.length}</p>
          </DialogHeader>
          <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: '#E2E8F0' }}>
            <div className="h-full rounded-full" style={{ width: `${((analiseMembroIdx + 1) / membrosUnicos.length) * 100}%`, backgroundColor: '#6366F1' }} />
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
              {(() => { const p = profileMap.get(membrosUnicos[analiseMembroIdx]); return p ? `${p.first_name} ${p.last_name}` : '--'; })()}
            </p>
          </div>
          <div className="space-y-4">
            <div><Label>Entregas realizadas</Label><Textarea value={analiseForm.entregas_realizadas} onChange={e => setAnaliseForm({ ...analiseForm, entregas_realizadas: e.target.value })} /></div>
            <div><Label>Riscos identificados</Label><Textarea value={analiseForm.riscos_identificados} onChange={e => setAnaliseForm({ ...analiseForm, riscos_identificados: e.target.value })} /></div>
            <div><Label>Ajustes necessarios</Label><Textarea value={analiseForm.ajustes_necessarios} onChange={e => setAnaliseForm({ ...analiseForm, ajustes_necessarios: e.target.value })} /></div>
            <div><Label>Comentario do lider</Label><Textarea value={analiseForm.comentario_lider} onChange={e => setAnaliseForm({ ...analiseForm, comentario_lider: e.target.value })} /></div>
            <div><Label>Comentario do avaliado</Label><Textarea value={analiseForm.comentario_avaliado} onChange={e => setAnaliseForm({ ...analiseForm, comentario_avaliado: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAnalise(false)}>Cancelar</Button>
            {analiseMembroIdx < membrosUnicos.length - 1 && (
              <Button variant="outline" onClick={() => saveAnalise(true)} disabled={upsertAnalise.isPending}>Salvar e proximo</Button>
            )}
            <Button onClick={() => saveAnalise(false)} disabled={upsertAnalise.isPending}>{upsertAnalise.isPending ? 'Salvando...' : 'Concluir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Cycle Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Ciclo de Avaliacao</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input placeholder="Ex: Marco - Outubro 2026" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data inicio</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label>Data fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
            </div>
            <div><Label>Data analise semestral (opcional)</Label><Input type="date" value={form.data_analise_semestral} onChange={(e) => setForm({ ...form, data_analise_semestral: e.target.value })} /></div>
            <div><Label>Descricao (opcional)</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.nome || !form.data_inicio || !form.data_fim || createCiclo.isPending}>{createCiclo.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardLayout>
  );
};

export default DesempenhoCiclos;
