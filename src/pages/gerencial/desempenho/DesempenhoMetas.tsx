import { useState } from 'react';
import { DesempenhoLayout } from '@/components/desempenho/DesempenhoLayout';
import { useCiclosAvaliacao, useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useMetas, useCreateMeta, useUpdateMeta, useUpdateMetaProgress, type Meta } from '@/hooks/useMetasDesempenho';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Building2, Users, User, Pencil, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const dimensaoColors: Record<string, { bg: string; text: string; label: string }> = {
  entrega: { bg: 'bg-blue-500/15', text: 'text-blue-600', label: 'Entrega' },
  impacto: { bg: 'bg-emerald-500/15', text: 'text-emerald-600', label: 'Impacto' },
  gestao: { bg: 'bg-violet-500/15', text: 'text-violet-600', label: 'Gestão' },
};

const nivelIcons: Record<string, any> = { empresa: Building2, equipe: Users, individual: User };
const nivelBg: Record<string, string> = { empresa: 'bg-slate-50', equipe: 'bg-white', individual: 'bg-slate-50' };

const DesempenhoMetas = () => {
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const [selectedCicloId, setSelectedCicloId] = useState<string | undefined>(undefined);
  const [nivelFilter, setNivelFilter] = useState<string>('');
  const [dimensaoFilter, setDimensaoFilter] = useState<string>('');

  const cicloId = selectedCicloId || cicloAtivo?.id;
  const { data: metas, isLoading } = useMetas({ ciclo_id: cicloId, nivel: nivelFilter || undefined, dimensao: dimensaoFilter || undefined });
  const createMeta = useCreateMeta();
  const updateMeta = useUpdateMeta();
  const updateProgress = useUpdateMetaProgress();

  const [showForm, setShowForm] = useState(false);
  const [showProgress, setShowProgress] = useState<Meta | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressComment, setProgressComment] = useState('');

  const [form, setForm] = useState({
    nivel: 'individual' as string,
    dimensao: 'entrega' as string,
    titulo: '',
    descricao: '',
    criterio_evidencia: '',
    prazo: '',
    peso: '1.0',
    meta_pai_id: '' as string,
    responsavel_id: '' as string,
  });

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  // Build tree
  const empresaMetas = metas?.filter((m) => m.nivel === 'empresa') ?? [];
  const equipeMetas = metas?.filter((m) => m.nivel === 'equipe') ?? [];
  const individualMetas = metas?.filter((m) => m.nivel === 'individual') ?? [];

  const parentOptions = metas?.filter((m) =>
    (form.nivel === 'equipe' && m.nivel === 'empresa') ||
    (form.nivel === 'individual' && m.nivel === 'equipe')
  ) ?? [];

  const handleCreate = () => {
    if (!cicloId) return;
    createMeta.mutate({
      ciclo_id: cicloId,
      nivel: form.nivel as any,
      dimensao: form.dimensao as any,
      titulo: form.titulo,
      descricao: form.descricao || null,
      criterio_evidencia: form.criterio_evidencia || null,
      prazo: form.prazo || null,
      peso: parseFloat(form.peso) || 1,
      meta_pai_id: form.meta_pai_id || null,
      responsavel_id: form.responsavel_id || null,
      area_id: null,
      status: 'ativa',
    }, { onSuccess: () => { setShowForm(false); setForm({ nivel: 'individual', dimensao: 'entrega', titulo: '', descricao: '', criterio_evidencia: '', prazo: '', peso: '1.0', meta_pai_id: '', responsavel_id: '' }); } });
  };

  const handleProgressUpdate = () => {
    if (!showProgress) return;
    updateProgress.mutate({
      meta_id: showProgress.id,
      progresso_anterior: showProgress.progresso_atual,
      progresso_novo: progressValue,
      comentario: progressComment,
    }, { onSuccess: () => { setShowProgress(null); setProgressComment(''); } });
  };

  const renderMeta = (m: Meta, indent: number) => {
    const dc = dimensaoColors[m.dimensao] ?? dimensaoColors.entrega;
    const Icon = nivelIcons[m.nivel] ?? User;
    const barColor = m.progresso_atual >= 85 ? 'text-emerald-600' : m.progresso_atual >= 70 ? 'text-amber-600' : 'text-red-600';
    const profile = m.responsavel_id ? profileMap.get(m.responsavel_id) : null;

    return (
      <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg ${nivelBg[m.nivel] ?? ''} hover:bg-slate-100/50 transition-colors`} style={{ marginLeft: indent }}>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Badge variant="outline" className={`${dc.bg} ${dc.text} border-0 text-[11px] font-semibold rounded-full px-2.5 flex-shrink-0`}>{dc.label}</Badge>
        <span className="flex-1 text-sm font-medium text-slate-800 truncate">{m.titulo}</span>
        {profile && <span className="text-xs text-muted-foreground flex-shrink-0">{profile.first_name} {profile.last_name}</span>}
        <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">{m.prazo ?? '—'}</span>
        <div className="w-28 flex items-center gap-1 flex-shrink-0">
          <Progress value={m.progresso_atual} className="h-2 flex-1" />
          <span className={`text-xs font-semibold w-8 text-right ${barColor}`}>{m.progresso_atual}%</span>
        </div>
        <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">×{m.peso}</span>
        <Badge variant="outline" className="text-xs flex-shrink-0">{m.status}</Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => { setShowProgress(m); setProgressValue(m.progresso_atual); }}><TrendingUp className="h-3.5 w-3.5" /></Button>
      </div>
    );
  };

  return (
    <DesempenhoLayout title="Metas" subtitle="Gestão hierárquica de metas" headerActions={
      <Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nova Meta</Button>
    }>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={cicloId ?? ''} onValueChange={setSelectedCicloId}>
          <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="Ciclo" /></SelectTrigger>
          <SelectContent>{ciclos?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={nivelFilter} onValueChange={setNivelFilter}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Nível" /></SelectTrigger>
          <SelectContent><SelectItem value="">Todos</SelectItem><SelectItem value="empresa">Empresa</SelectItem><SelectItem value="equipe">Equipe</SelectItem><SelectItem value="individual">Individual</SelectItem></SelectContent>
        </Select>
        <Select value={dimensaoFilter} onValueChange={setDimensaoFilter}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Dimensão" /></SelectTrigger>
          <SelectContent><SelectItem value="">Todas</SelectItem><SelectItem value="entrega">Entrega</SelectItem><SelectItem value="impacto">Impacto</SelectItem><SelectItem value="gestao">Gestão</SelectItem></SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-4 space-y-1">
            {empresaMetas.map((em) => (
              <div key={em.id}>
                {renderMeta(em, 0)}
                {equipeMetas.filter((eq) => eq.meta_pai_id === em.id).map((eq) => (
                  <div key={eq.id}>
                    {renderMeta(eq, 24)}
                    {individualMetas.filter((ind) => ind.meta_pai_id === eq.id).map((ind) => renderMeta(ind, 48))}
                  </div>
                ))}
              </div>
            ))}
            {/* Orphan equipe metas */}
            {equipeMetas.filter((eq) => !eq.meta_pai_id || !empresaMetas.find((em) => em.id === eq.meta_pai_id)).map((eq) => (
              <div key={eq.id}>
                {renderMeta(eq, 0)}
                {individualMetas.filter((ind) => ind.meta_pai_id === eq.id).map((ind) => renderMeta(ind, 24))}
              </div>
            ))}
            {/* Orphan individual metas */}
            {individualMetas.filter((ind) => !ind.meta_pai_id || !equipeMetas.find((eq) => eq.id === ind.meta_pai_id)).map((ind) => renderMeta(ind, 0))}
            {(!metas || metas.length === 0) && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma meta neste ciclo.</p>}
          </CardContent>
        </Card>
      )}

      {/* New Meta Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Meta</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nível</Label>
                <Select value={form.nivel} onValueChange={(v) => setForm({ ...form, nivel: v, meta_pai_id: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="empresa">Empresa</SelectItem><SelectItem value="equipe">Equipe</SelectItem><SelectItem value="individual">Individual</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Dimensão</Label>
                <Select value={form.dimensao} onValueChange={(v) => setForm({ ...form, dimensao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="entrega">Entrega</SelectItem><SelectItem value="impacto">Impacto</SelectItem><SelectItem value="gestao">Gestão</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.nivel !== 'empresa' && (
              <div><Label>Meta pai</Label>
                <Select value={form.meta_pai_id} onValueChange={(v) => setForm({ ...form, meta_pai_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar meta superior" /></SelectTrigger>
                  <SelectContent>{parentOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label>Critério de evidência</Label><Textarea placeholder="Como vamos saber que essa meta foi atingida?" value={form.criterio_evidencia} onChange={(e) => setForm({ ...form, criterio_evidencia: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prazo</Label><Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></div>
              <div><Label>Peso</Label><Input type="number" step="0.1" value={form.peso} onChange={(e) => setForm({ ...form, peso: e.target.value })} /></div>
            </div>
            {form.nivel === 'individual' && (
              <div><Label>Responsável</Label>
                <Select value={form.responsavel_id} onValueChange={(v) => setForm({ ...form, responsavel_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
                  <SelectContent>{profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.titulo || createMeta.isPending}>{createMeta.isPending ? 'Criando...' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={!!showProgress} onOpenChange={() => setShowProgress(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Atualizar Progresso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{showProgress?.titulo}</p>
            <div className="flex items-center gap-4">
              <Slider value={[progressValue]} onValueChange={([v]) => setProgressValue(v)} max={100} step={1} className="flex-1" />
              <Input type="number" className="w-20" value={progressValue} onChange={(e) => setProgressValue(Number(e.target.value))} min={0} max={100} />
            </div>
            <div><Label>Comentário *</Label><Textarea value={progressComment} onChange={(e) => setProgressComment(e.target.value)} placeholder="Descreva o avanço realizado" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgress(null)}>Cancelar</Button>
            <Button onClick={handleProgressUpdate} disabled={!progressComment || updateProgress.isPending}>{updateProgress.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DesempenhoLayout>
  );
};

export default DesempenhoMetas;
