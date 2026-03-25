import { useState } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useCiclosAvaliacao, useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { useMetas, useCreateMeta, useUpdateMeta, useUpdateMetaProgress, type Meta } from '@/hooks/useMetasDesempenho';
import { useCreateKpi, useDeleteKpi } from '@/hooks/useKpisMeta';
import { usePprRegras } from '@/hooks/usePprRegras';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Building2, Users, User, TrendingUp, MoreHorizontal, Pencil, Archive, Award, ChevronDown, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const dimensaoColors: Record<string, { bg: string; text: string; label: string }> = {
  entrega: { bg: 'bg-blue-500/12', text: 'text-blue-600', label: 'Entrega' },
  impacto: { bg: 'bg-emerald-500/12', text: 'text-emerald-600', label: 'Impacto' },
  gestao: { bg: 'bg-violet-500/12', text: 'text-violet-600', label: 'Gestao' },
};
const nivelIcons: Record<string, any> = { empresa: Building2, equipe: Users, individual: User };

const getAutoClassif = (progresso: number) => {
  if (progresso >= 100) return 'supera';
  if (progresso >= 85) return 'atende';
  if (progresso >= 70) return 'atende_parcialmente';
  return 'abaixo';
};
const classifLabels: Record<string, string> = { supera: 'Supera', atende: 'Atende', atende_parcialmente: 'Atende Parcialmente', abaixo: 'Abaixo' };
const classifColors: Record<string, string> = { supera: 'bg-emerald-50 text-emerald-700', atende: 'bg-green-50 text-green-700', atende_parcialmente: 'bg-amber-50 text-amber-700', abaixo: 'bg-red-50 text-red-700' };

const DesempenhoMetas = () => {
  const { isAdmin, isLider } = useAuth();
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const [selectedCicloId, setSelectedCicloId] = useState<string | undefined>(undefined);
  const [nivelFilter, setNivelFilter] = useState<string>('');
  const [dimensaoFilter, setDimensaoFilter] = useState<string>('');
  const [responsavelFilter, setResponsavelFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const cicloId = selectedCicloId || cicloAtivo?.id;
  const { data: pprRegras } = usePprRegras(cicloId);
  const { data: metas, isLoading } = useMetas({ ciclo_id: cicloId, nivel: nivelFilter || undefined, dimensao: dimensaoFilter || undefined, responsavel_id: responsavelFilter || undefined, status: statusFilter || undefined });
  const createMeta = useCreateMeta();
  const updateMeta = useUpdateMeta();
  const updateProgress = useUpdateMetaProgress();
  const createKpi = useCreateKpi();
  const deleteKpi = useDeleteKpi();

  const [showForm, setShowForm] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null);
  const [showProgress, setShowProgress] = useState<Meta | null>(null);
  const [showClassif, setShowClassif] = useState<Meta | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<Meta | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressComment, setProgressComment] = useState('');
  const [classifValue, setClassifValue] = useState('');
  const [classifJustificativa, setClassifJustificativa] = useState('');

  const [form, setForm] = useState({ nivel: 'individual', dimensao: 'entrega', titulo: '', descricao: '', criterio_evidencia: '', prazo: '', peso: '1.0', meta_pai_id: '', responsavel_id: '' });
  const [kpis, setKpis] = useState<{ nome: string; valor_alvo: string; unidade: string; valor_atual: string }[]>([]);

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });
  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);

  const empresaMetas = metas?.filter(m => m.nivel === 'empresa') ?? [];
  const equipeMetas = metas?.filter(m => m.nivel === 'equipe') ?? [];
  const individualMetas = metas?.filter(m => m.nivel === 'individual') ?? [];

  const parentOptions = metas?.filter(m => (form.nivel === 'equipe' && m.nivel === 'empresa') || (form.nivel === 'individual' && m.nivel === 'equipe')) ?? [];

  const selectedCiclo = ciclos?.find(c => c.id === cicloId);
  const isEmAvaliacao = selectedCiclo?.status === 'em_avaliacao';

  const resetForm = () => { setForm({ nivel: 'individual', dimensao: 'entrega', titulo: '', descricao: '', criterio_evidencia: '', prazo: '', peso: '1.0', meta_pai_id: '', responsavel_id: '' }); setKpis([]); setEditingMeta(null); };

  const openEditModal = (m: Meta) => {
    setEditingMeta(m);
    setForm({ nivel: m.nivel, dimensao: m.dimensao, titulo: m.titulo, descricao: m.descricao ?? '', criterio_evidencia: m.criterio_evidencia ?? '', prazo: m.prazo ?? '', peso: String(m.peso), meta_pai_id: m.meta_pai_id ?? '', responsavel_id: m.responsavel_id ?? '' });
    setKpis([]);
    setShowForm(true);
  };

  const handleCreateOrUpdate = () => {
    if (!cicloId) return;
    const payload = {
      ciclo_id: cicloId, nivel: form.nivel as any, dimensao: form.dimensao as any, titulo: form.titulo,
      descricao: form.descricao || null, criterio_evidencia: form.criterio_evidencia || null, prazo: form.prazo || null,
      peso: parseFloat(form.peso) || 1, meta_pai_id: form.meta_pai_id || null, responsavel_id: form.responsavel_id || null, area_id: null, status: 'ativa',
    };
    if (editingMeta) {
      updateMeta.mutate({ id: editingMeta.id, ...payload }, { onSuccess: () => { setShowForm(false); resetForm(); } });
    } else {
      createMeta.mutate(payload, {
        onSuccess: (data) => {
          kpis.filter(k => k.nome).forEach(k => {
            createKpi.mutate({ meta_id: data.id, nome: k.nome, valor_alvo: parseFloat(k.valor_alvo) || 0, unidade: k.unidade || null, valor_atual: parseFloat(k.valor_atual) || 0, descricao: null });
          });
          setShowForm(false); resetForm();
        },
      });
    }
  };

  const handleProgressUpdate = () => {
    if (!showProgress) return;
    updateProgress.mutate({ meta_id: showProgress.id, progresso_anterior: showProgress.progresso_atual, progresso_novo: progressValue, comentario: progressComment },
      { onSuccess: () => { setShowProgress(null); setProgressComment(''); } });
  };

  const handleClassificar = () => {
    if (!showClassif || !classifValue) return;
    const auto = getAutoClassif(showClassif.progresso_atual);
    if (classifValue !== auto && !classifJustificativa) return;
    updateMeta.mutate({ id: showClassif.id, classificacao_final: classifValue, ajuste_qualitativo: classifJustificativa || null },
      { onSuccess: () => { setShowClassif(null); setClassifValue(''); setClassifJustificativa(''); } });
  };

  const handleArchive = () => {
    if (!showArchiveConfirm) return;
    updateMeta.mutate({ id: showArchiveConfirm.id, status: 'cancelada' }, { onSuccess: () => setShowArchiveConfirm(null) });
  };

  const renderMeta = (m: Meta, indent: number) => {
    const dc = dimensaoColors[m.dimensao] ?? dimensaoColors.entrega;
    const Icon = nivelIcons[m.nivel] ?? User;
    const profile = m.responsavel_id ? profileMap.get(m.responsavel_id) : null;
    const barColor = m.progresso_atual >= 85 ? '#10B981' : m.progresso_atual >= 70 ? '#D97706' : '#EF4444';

    return (
      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:shadow-sm transition-shadow" style={{ marginLeft: indent, backgroundColor: indent === 0 ? 'var(--board-border-s)' : 'transparent' }}>
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--board-t4)' }} />
        <Badge variant="outline" className={`${dc.bg} ${dc.text} border-0 text-[11px] font-semibold rounded-full px-2.5 flex-shrink-0`}>{dc.label}</Badge>
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--board-t1)' }}>{m.titulo}</span>
        {profile && <span className="text-xs flex-shrink-0" style={{ color: 'var(--board-t4)' }}>{profile.first_name} {profile.last_name}</span>}
        <span className="text-xs w-20 text-right flex-shrink-0" style={{ color: 'var(--board-t4)' }}>{m.prazo ?? '--'}</span>
        <div className="w-28 flex items-center gap-1 flex-shrink-0">
          <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--board-border)' }}>
            <div className="h-full rounded-full" style={{ width: `${m.progresso_atual}%`, backgroundColor: barColor }} />
          </div>
          <span className="text-xs font-semibold w-8 text-right" style={{ color: barColor }}>{m.progresso_atual}%</span>
        </div>
        <Badge variant="outline" className="text-xs flex-shrink-0">{m.status}</Badge>
        {isEmAvaliacao && m.nivel === 'individual' && (
          <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0" onClick={(e) => { e.stopPropagation(); setShowClassif(m); setClassifValue(m.classificacao_final || getAutoClassif(m.progresso_atual)); setClassifJustificativa(m.ajuste_qualitativo ?? ''); }}>
            <Award className="h-3.5 w-3.5 mr-1" /> Classificar
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={(e) => { e.stopPropagation(); setShowProgress(m); setProgressValue(m.progresso_atual); }}>
          <TrendingUp className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEditModal(m)}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowArchiveConfirm(m)} className="text-red-600"><Archive className="h-3.5 w-3.5 mr-2" /> Arquivar</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <BoardLayout title="Metas" subtitle="Gestao hierarquica de metas" headerActions={
      <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm"><Plus className="h-4 w-4 mr-1" />Nova Meta</Button>
    }>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={cicloId ?? ''} onValueChange={setSelectedCicloId}>
          <SelectTrigger className="w-56 bg-white"><SelectValue placeholder="Ciclo" /></SelectTrigger>
          <SelectContent>{ciclos?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={nivelFilter || '__all__'} onValueChange={v => setNivelFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Nivel" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todos</SelectItem><SelectItem value="empresa">Empresa</SelectItem><SelectItem value="equipe">Equipe</SelectItem><SelectItem value="individual">Individual</SelectItem></SelectContent>
        </Select>
        <Select value={dimensaoFilter || '__all__'} onValueChange={v => setDimensaoFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Dimensao" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todas</SelectItem><SelectItem value="entrega">Entrega</SelectItem><SelectItem value="impacto">Impacto</SelectItem><SelectItem value="gestao">Gestao</SelectItem></SelectContent>
        </Select>
        <Select value={responsavelFilter || '__all__'} onValueChange={v => setResponsavelFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-48 bg-white"><SelectValue placeholder="Responsavel" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todos</SelectItem>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter || '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-40 bg-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="__all__">Todos</SelectItem><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="pausada">Pausada</SelectItem><SelectItem value="concluida">Concluida</SelectItem><SelectItem value="cancelada">Cancelada</SelectItem></SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
          <CardContent className="p-4 space-y-1">
            {empresaMetas.map(em => (
              <div key={em.id}>
                {renderMeta(em, 0)}
                {equipeMetas.filter(eq => eq.meta_pai_id === em.id).map(eq => (
                  <div key={eq.id}>
                    {renderMeta(eq, 24)}
                    {individualMetas.filter(ind => ind.meta_pai_id === eq.id).map(ind => renderMeta(ind, 48))}
                  </div>
                ))}
              </div>
            ))}
            {equipeMetas.filter(eq => !eq.meta_pai_id || !empresaMetas.find(em => em.id === eq.meta_pai_id)).map(eq => (
              <div key={eq.id}>
                {renderMeta(eq, 0)}
                {individualMetas.filter(ind => ind.meta_pai_id === eq.id).map(ind => renderMeta(ind, 24))}
              </div>
            ))}
            {individualMetas.filter(ind => !ind.meta_pai_id || !equipeMetas.find(eq => eq.id === ind.meta_pai_id)).map(ind => renderMeta(ind, 0))}
            {(!metas || metas.length === 0) && <p className="text-sm text-center py-8" style={{ color: 'var(--board-t3)' }}>Nenhuma meta neste ciclo.</p>}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) resetForm(); setShowForm(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingMeta ? 'Editar Meta' : 'Nova Meta'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nivel</Label><Select value={form.nivel} onValueChange={v => setForm({ ...form, nivel: v, meta_pai_id: '' })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="empresa">Empresa</SelectItem><SelectItem value="equipe">Equipe</SelectItem><SelectItem value="individual">Individual</SelectItem></SelectContent></Select></div>
              <div><Label>Dimensao</Label><Select value={form.dimensao} onValueChange={v => setForm({ ...form, dimensao: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="entrega">Entrega</SelectItem><SelectItem value="impacto">Impacto</SelectItem><SelectItem value="gestao">Gestao</SelectItem></SelectContent></Select></div>
            </div>
            {form.nivel !== 'empresa' && <div><Label>Meta pai</Label><Select value={form.meta_pai_id} onValueChange={v => setForm({ ...form, meta_pai_id: v })}><SelectTrigger><SelectValue placeholder="Selecionar meta superior" /></SelectTrigger><SelectContent>{parentOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.titulo}</SelectItem>)}</SelectContent></Select></div>}
            <div><Label>Titulo</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descricao</Label><Textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
            <div><Label>Criterio de evidencia</Label><Textarea placeholder="Como vamos saber que essa meta foi atingida?" value={form.criterio_evidencia} onChange={e => setForm({ ...form, criterio_evidencia: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prazo</Label><Input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} /></div>
              <div><Label>Peso</Label><Input type="number" step="0.1" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} /></div>
            </div>
            {form.nivel === 'individual' && <div><Label>Responsavel</Label><Select value={form.responsavel_id} onValueChange={v => setForm({ ...form, responsavel_id: v })}><SelectTrigger><SelectValue placeholder="Selecionar membro" /></SelectTrigger><SelectContent>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent></Select></div>}
            {/* KPIs section - only on create */}
            {!editingMeta && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--board-indigo)' }}>
                  <ChevronDown className="h-4 w-4" /> KPIs vinculados ({kpis.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {kpis.map((k, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <Input placeholder="Nome" value={k.nome} onChange={e => { const arr = [...kpis]; arr[i].nome = e.target.value; setKpis(arr); }} className="flex-1" />
                      <Input placeholder="Alvo" type="number" value={k.valor_alvo} onChange={e => { const arr = [...kpis]; arr[i].valor_alvo = e.target.value; setKpis(arr); }} className="w-20" />
                      <Input placeholder="Unidade" value={k.unidade} onChange={e => { const arr = [...kpis]; arr[i].unidade = e.target.value; setKpis(arr); }} className="w-20" />
                      <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setKpis(kpis.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setKpis([...kpis, { nome: '', valor_alvo: '', unidade: '', valor_atual: '0' }])}>+ Adicionar KPI</Button>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleCreateOrUpdate} disabled={!form.titulo || createMeta.isPending || updateMeta.isPending}>{editingMeta ? 'Salvar' : 'Criar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={!!showProgress} onOpenChange={() => setShowProgress(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Atualizar Progresso</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--board-t3)' }}>{showProgress?.titulo}</p>
            <div className="flex items-center gap-4"><Slider value={[progressValue]} onValueChange={([v]) => setProgressValue(v)} max={100} step={1} className="flex-1" /><Input type="number" className="w-20" value={progressValue} onChange={e => setProgressValue(Number(e.target.value))} min={0} max={100} /></div>
            <div><Label>Comentario *</Label><Textarea value={progressComment} onChange={e => setProgressComment(e.target.value)} placeholder="Descreva o avanco realizado" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProgress(null)}>Cancelar</Button>
            <Button onClick={handleProgressUpdate} disabled={!progressComment || updateProgress.isPending}>{updateProgress.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Classification Modal */}
      <Dialog open={!!showClassif} onOpenChange={() => setShowClassif(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Classificacao Final</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--board-t1)' }}>{showClassif?.titulo}</p>
              {showClassif?.responsavel_id && <p className="text-xs" style={{ color: 'var(--board-t3)' }}>{(() => { const p = profileMap.get(showClassif.responsavel_id); return p ? `${p.first_name} ${p.last_name}` : ''; })()}</p>}
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--board-t3)' }}>Classificacao calculada automaticamente:</p>
              <Badge className={`${classifColors[getAutoClassif(showClassif?.progresso_atual ?? 0)]} border-0 text-sm font-semibold`}>{classifLabels[getAutoClassif(showClassif?.progresso_atual ?? 0)]}</Badge>
            </div>
            <RadioGroup value={classifValue} onValueChange={setClassifValue} className="space-y-2">
              {['supera', 'atende', 'atende_parcialmente', 'abaixo'].map(v => (
                <div key={v} className="flex items-center gap-2"><RadioGroupItem value={v} id={v} /><Label htmlFor={v} className="cursor-pointer">{classifLabels[v]}</Label></div>
              ))}
            </RadioGroup>
            {classifValue && classifValue !== getAutoClassif(showClassif?.progresso_atual ?? 0) && (
              <div><Label>Justificativa do ajuste *</Label><Textarea value={classifJustificativa} onChange={e => setClassifJustificativa(e.target.value)} placeholder="Justifique o ajuste da classificacao" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassif(null)}>Cancelar</Button>
            <Button onClick={handleClassificar} disabled={!classifValue || updateMeta.isPending}>Confirmar classificacao</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={!!showArchiveConfirm} onOpenChange={() => setShowArchiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar esta meta?</AlertDialogTitle>
            <AlertDialogDescription>A meta "{showArchiveConfirm?.titulo}" sera arquivada e nao contabilizada.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BoardLayout>
  );
};

export default DesempenhoMetas;
