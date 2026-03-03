import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus, Trash2, Pencil, Building2, Users, ChevronRight, Network, UserCheck, X
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────
interface Cluster {
  id: string;
  name: string;
  cost_center: string | null;
  is_active: boolean;
}

interface Area {
  id: string;
  cluster_id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  page_categories: string[];
}

interface AreaLider {
  id: string;
  area_id: string;
  user_id: string;
}

interface Equipe {
  id: string;
  area_id: string;
  name: string;
  sublider_id: string | null;
  is_active: boolean;
}

interface EquipeMembro {
  id: string;
  equipe_id: string;
  user_id: string;
}

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

const colorPresets = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

// ─── Data hooks ─────────────────────────────────────────────────────────
function useProfiles(role: 'admin' | 'client' | 'lider' | 'team_member') {
  return useQuery({
    queryKey: ['profiles-by-role', role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', role);
      if (error) throw error;
      if (!data?.length) return [] as Profile[];
      const ids = data.map(r => r.user_id);
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', ids);
      if (pErr) throw pErr;
      return (profiles || []) as Profile[];
    },
  });
}

function profileLabel(p: Profile) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
  return name || p.email || p.id.slice(0, 8);
}

// ─── Component ──────────────────────────────────────────────────────────
export default function EstruturaManager() {
  const qc = useQueryClient();

  // Data queries
  const { data: clusters = [], isLoading: loadingClusters } = useQuery({
    queryKey: ['estrutura-clusters'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_clusters').select('*').order('name');
      if (error) throw error;
      return data as Cluster[];
    },
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['estrutura-areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_areas').select('*').order('name');
      if (error) throw error;
      return data as Area[];
    },
  });

  const { data: lideres = [] } = useQuery({
    queryKey: ['estrutura-lideres'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_area_lideres').select('*');
      if (error) throw error;
      return data as AreaLider[];
    },
  });

  const { data: equipes = [] } = useQuery({
    queryKey: ['estrutura-equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_equipes').select('*').order('name');
      if (error) throw error;
      return data as Equipe[];
    },
  });

  const { data: membros = [] } = useQuery({
    queryKey: ['estrutura-membros'],
    queryFn: async () => {
      const { data, error } = await supabase.from('estrutura_equipe_membros').select('*');
      if (error) throw error;
      return data as EquipeMembro[];
    },
  });

  const { data: liderProfiles = [] } = useProfiles('lider');
  const { data: memberProfiles = [] } = useProfiles('team_member');
  const allProfiles = [...liderProfiles, ...memberProfiles].filter(
    (p, i, arr) => arr.findIndex(x => x.id === p.id) === i
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['estrutura-clusters'] });
    qc.invalidateQueries({ queryKey: ['estrutura-areas'] });
    qc.invalidateQueries({ queryKey: ['estrutura-lideres'] });
    qc.invalidateQueries({ queryKey: ['estrutura-equipes'] });
    qc.invalidateQueries({ queryKey: ['estrutura-membros'] });
  };

  // ─── Cluster CRUD ─────────────────────────────────────────────────
  const [clusterDialog, setClusterDialog] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [clusterForm, setClusterForm] = useState({ name: '', cost_center: '' });

  const openClusterCreate = () => { setEditingCluster(null); setClusterForm({ name: '', cost_center: '' }); setClusterDialog(true); };
  const openClusterEdit = (c: Cluster) => { setEditingCluster(c); setClusterForm({ name: c.name, cost_center: c.cost_center || '' }); setClusterDialog(true); };

  const saveCluster = async () => {
    if (!clusterForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editingCluster) {
      const { error } = await supabase.from('estrutura_clusters').update({ name: clusterForm.name, cost_center: clusterForm.cost_center || null }).eq('id', editingCluster.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Cluster atualizado');
    } else {
      const { error } = await supabase.from('estrutura_clusters').insert({ name: clusterForm.name, cost_center: clusterForm.cost_center || null });
      if (error) { toast.error(error.message); return; }
      toast.success('Cluster criado');
    }
    setClusterDialog(false);
    invalidateAll();
  };

  const deleteCluster = async (id: string) => {
    if (!confirm('Excluir cluster e todas as áreas/equipes vinculadas?')) return;
    const { error } = await supabase.from('estrutura_clusters').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Cluster excluído');
    invalidateAll();
  };

  // ─── Area CRUD ────────────────────────────────────────────────────
  const [areaDialog, setAreaDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', color: '#10b981', cluster_id: '', page_categories: [] as string[] });

  const openAreaCreate = (clusterId: string) => { setEditingArea(null); setAreaForm({ name: '', color: '#10b981', cluster_id: clusterId, page_categories: [] }); setAreaDialog(true); };
  const openAreaEdit = (a: Area) => { setEditingArea(a); setAreaForm({ name: a.name, color: a.color || '#10b981', cluster_id: a.cluster_id, page_categories: a.page_categories || [] }); setAreaDialog(true); };

  const saveArea = async () => {
    if (!areaForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (editingArea) {
      const { error } = await supabase.from('estrutura_areas').update({ name: areaForm.name, color: areaForm.color, page_categories: areaForm.page_categories }).eq('id', editingArea.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Área atualizada');
    } else {
      const { error } = await supabase.from('estrutura_areas').insert({ name: areaForm.name, color: areaForm.color, cluster_id: areaForm.cluster_id, page_categories: areaForm.page_categories });
      if (error) { toast.error(error.message); return; }
      toast.success('Área criada');
    }
    setAreaDialog(false);
    invalidateAll();
  };

  const deleteArea = async (id: string) => {
    if (!confirm('Excluir área e suas equipes?')) return;
    const { error } = await supabase.from('estrutura_areas').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Área excluída');
    invalidateAll();
  };

  // ─── Lider ────────────────────────────────────────────────────────
  const setAreaLider = async (areaId: string, userId: string | null) => {
    // Remove existing
    await supabase.from('estrutura_area_lideres').delete().eq('area_id', areaId);
    if (userId) {
      const { error } = await supabase.from('estrutura_area_lideres').insert({ area_id: areaId, user_id: userId });
      if (error) { toast.error(error.message); return; }
    }
    toast.success('Líder atualizado');
    invalidateAll();
  };

  // ─── Equipe CRUD ──────────────────────────────────────────────────
  const [equipeDialog, setEquipeDialog] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [equipeForm, setEquipeForm] = useState({ name: '', area_id: '', sublider_id: '' });

  const openEquipeCreate = (areaId: string) => { setEditingEquipe(null); setEquipeForm({ name: '', area_id: areaId, sublider_id: '' }); setEquipeDialog(true); };
  const openEquipeEdit = (e: Equipe) => { setEditingEquipe(e); setEquipeForm({ name: e.name, area_id: e.area_id, sublider_id: e.sublider_id || '' }); setEquipeDialog(true); };

  const saveEquipe = async () => {
    if (!equipeForm.name.trim()) { toast.error('Nome é obrigatório'); return; }
    const payload = { name: equipeForm.name, sublider_id: equipeForm.sublider_id || null, area_id: equipeForm.area_id };
    if (editingEquipe) {
      const { error } = await supabase.from('estrutura_equipes').update({ name: payload.name, sublider_id: payload.sublider_id }).eq('id', editingEquipe.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Equipe atualizada');
    } else {
      const { error } = await supabase.from('estrutura_equipes').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Equipe criada');
    }
    setEquipeDialog(false);
    invalidateAll();
  };

  const deleteEquipe = async (id: string) => {
    if (!confirm('Excluir equipe e seus membros?')) return;
    const { error } = await supabase.from('estrutura_equipes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Equipe excluída');
    invalidateAll();
  };

  // ─── Membros ──────────────────────────────────────────────────────
  const addMembro = async (equipeId: string, userId: string) => {
    const { error } = await supabase.from('estrutura_equipe_membros').insert({ equipe_id: equipeId, user_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success('Membro adicionado');
    invalidateAll();
  };

  const removeMembro = async (id: string) => {
    const { error } = await supabase.from('estrutura_equipe_membros').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Membro removido');
    invalidateAll();
  };

  // ─── Render ───────────────────────────────────────────────────────
  const totalEquipes = equipes.length;
  const totalMembros = membros.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-medium text-slate-900">Estrutura Organizacional</h3>
          <p className="text-sm text-slate-500">Gerencie clusters, áreas, líderes, equipes e membros.</p>
        </div>
        <Button onClick={openClusterCreate} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
          <Plus className="h-4 w-4" />
          Novo Cluster
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={<Network className="h-4 w-4 text-teal-600" />} label="Clusters" value={clusters.length} />
        <StatCard icon={<Building2 className="h-4 w-4 text-teal-600" />} label="Áreas" value={areas.length} />
        <StatCard icon={<Users className="h-4 w-4 text-teal-600" />} label="Equipes" value={totalEquipes} />
        <StatCard icon={<UserCheck className="h-4 w-4 text-teal-600" />} label="Membros Alocados" value={totalMembros} />
      </div>

      {/* Clusters accordion */}
      {loadingClusters ? (
        <div className="text-center py-8 text-slate-500">Carregando...</div>
      ) : clusters.length === 0 ? (
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardContent className="py-8 text-center text-slate-500">
            Nenhum cluster cadastrado. Clique em "Novo Cluster" para começar.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {clusters.map(cluster => {
            const clusterAreas = areas.filter(a => a.cluster_id === cluster.id);
            return (
              <AccordionItem key={cluster.id} value={cluster.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <Network className="h-5 w-5 text-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900">{cluster.name}</div>
                      {cluster.cost_center && (
                        <div className="text-xs text-slate-500">Centro de Custo: {cluster.cost_center}</div>
                      )}
                    </div>
                    <Badge variant="secondary" className="mr-2">{clusterAreas.length} áreas</Badge>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openClusterEdit(cluster)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteCluster(cluster.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-700">Áreas</span>
                      <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => openAreaCreate(cluster.id)}>
                        <Plus className="h-3 w-3" /> Nova Área
                      </Button>
                    </div>

                    {clusterAreas.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Nenhuma área neste cluster.</p>
                    ) : (
                      <Accordion type="multiple" className="space-y-2">
                        {clusterAreas.map(area => {
                          const areaLider = lideres.find(l => l.area_id === area.id);
                          const areaEquipes = equipes.filter(e => e.area_id === area.id);
                          const liderProfile = areaLider ? allProfiles.find(p => p.id === areaLider.user_id) : null;

                          return (
                            <AccordionItem key={area.id} value={area.id} className="rounded-md border border-slate-100 bg-slate-50/50">
                              <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-100/50 text-sm">
                                <div className="flex items-center gap-2 flex-1 text-left">
                                  <div className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: area.color || '#94a3b8' }} />
                                  <span className="font-medium text-slate-800">{area.name}</span>
                                  {liderProfile && (
                                    <span className="text-xs text-slate-500 ml-1">• Líder: {profileLabel(liderProfile)}</span>
                                  )}
                                  <Badge variant="outline" className="ml-auto mr-2 text-xs">{areaEquipes.length} equipes</Badge>
                                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openAreaEdit(area)}>
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteArea(area.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-3 pb-3">
                                <div className="space-y-3">
                                  {/* Lider select */}
                                  <div className="flex items-center gap-2">
                                    <Label className="text-xs text-slate-600 shrink-0">Líder Responsável:</Label>
                                    <Select
                                      value={areaLider?.user_id || ''}
                                      onValueChange={(val) => setAreaLider(area.id, val || null)}
                                    >
                                      <SelectTrigger className="h-8 text-xs max-w-[250px]">
                                        <SelectValue placeholder="Selecionar líder..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {liderProfiles.map(p => (
                                          <SelectItem key={p.id} value={p.id} className="text-xs">
                                            {profileLabel(p)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Equipes */}
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-medium text-slate-600">Equipes</span>
                                    <Button variant="outline" size="sm" className="gap-1 h-6 text-xs" onClick={() => openEquipeCreate(area.id)}>
                                      <Plus className="h-3 w-3" /> Nova Equipe
                                    </Button>
                                  </div>

                                  {areaEquipes.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Nenhuma equipe.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {areaEquipes.map(equipe => {
                                        const sublider = equipe.sublider_id ? allProfiles.find(p => p.id === equipe.sublider_id) : null;
                                        const equipeMembros = membros.filter(m => m.equipe_id === equipe.id);
                                        const membroIds = equipeMembros.map(m => m.user_id);
                                        const availableMembers = memberProfiles.filter(p => !membroIds.includes(p.id));

                                        return (
                                          <div key={equipe.id} className="rounded border border-slate-200 bg-white p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <Users className="h-3.5 w-3.5 text-slate-500" />
                                                <span className="text-sm font-medium text-slate-800">{equipe.name}</span>
                                                {sublider && (
                                                  <span className="text-xs text-slate-500">• Sublíder: {profileLabel(sublider)}</span>
                                                )}
                                              </div>
                                              <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEquipeEdit(equipe)}>
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteEquipe(equipe.id)}>
                                                  <Trash2 className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            </div>

                                            {/* Members */}
                                            <div className="flex flex-wrap gap-1.5">
                                              {equipeMembros.map(m => {
                                                const profile = allProfiles.find(p => p.id === m.user_id);
                                                return (
                                                  <Badge key={m.id} variant="secondary" className="text-xs gap-1 pr-1">
                                                    {profile ? profileLabel(profile) : m.user_id.slice(0, 8)}
                                                    <button onClick={() => removeMembro(m.id)} className="hover:text-destructive ml-0.5">
                                                      <X className="h-3 w-3" />
                                                    </button>
                                                  </Badge>
                                                );
                                              })}
                                            </div>

                                            {/* Add member */}
                                            {availableMembers.length > 0 && (
                                              <Select onValueChange={(val) => addMembro(equipe.id, val)}>
                                                <SelectTrigger className="h-7 text-xs max-w-[220px]">
                                                  <SelectValue placeholder="+ Adicionar membro..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {availableMembers.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs">
                                                      {profileLabel(p)}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* ─── Dialogs ─────────────────────────────────────────────────── */}
      {/* Cluster dialog */}
      <Dialog open={clusterDialog} onOpenChange={setClusterDialog}>
        <DialogContent className="bg-white border-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editingCluster ? 'Editar Cluster' : 'Novo Cluster'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Cluster *</Label>
              <Input value={clusterForm.name} onChange={e => setClusterForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Tributário, Contábil..." />
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Input value={clusterForm.cost_center} onChange={e => setClusterForm(f => ({ ...f, cost_center: e.target.value }))} placeholder="Ex: CC-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClusterDialog(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveCluster}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Area dialog */}
      <Dialog open={areaDialog} onOpenChange={setAreaDialog}>
        <DialogContent className="bg-white border-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editingArea ? 'Editar Área' : 'Nova Área'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Área *</Label>
              <Input value={areaForm.name} onChange={e => setAreaForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Fiscal, OSG, ADVS..." />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {colorPresets.map(c => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${areaForm.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setAreaForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaDialog(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveArea}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Equipe dialog */}
      <Dialog open={equipeDialog} onOpenChange={setEquipeDialog}>
        <DialogContent className="bg-white border-slate-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{editingEquipe ? 'Editar Equipe' : 'Nova Equipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Equipe *</Label>
              <Input value={equipeForm.name} onChange={e => setEquipeForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Equipe Fiscal SP..." />
            </div>
            <div className="space-y-2">
              <Label>Sublíder (opcional)</Label>
              <Select value={equipeForm.sublider_id} onValueChange={val => setEquipeForm(f => ({ ...f, sublider_id: val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar sublíder..." />
                </SelectTrigger>
                <SelectContent>
                  {allProfiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {profileLabel(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEquipeDialog(false)}>Cancelar</Button>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEquipe}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="bg-white border-slate-200/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{label}</CardTitle>
        <div className="p-2 rounded-full bg-teal-100">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-slate-900">{value}</div>
      </CardContent>
    </Card>
  );
}
