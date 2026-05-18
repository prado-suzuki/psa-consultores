import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, Pencil, Building2, Users, Network, UserCheck, X, ChevronDown
} from 'lucide-react';
import {
  useEstruturaClusters, useEstruturaAreas,
  useEstruturaEquipes, useEstruturaMembros,
  useEstruturaCentrosCusto, useEstruturaMutations,
  type Cluster, type Area, type Equipe,
} from '@/hooks/useEstruturaManager';

// ─── Types ──────────────────────────────────────────────────────────────
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
// Lista todos os perfis com papel >= minimumRole (hierarquia oficial: team_member < sublider < lider < admin)
function useProfilesMinRole(minimumRole: 'team_member' | 'sublider' | 'lider' | 'admin') {
  return useQuery({
    queryKey: ['profiles-min-role', minimumRole],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_profiles_with_min_role', { _minimum_role: minimumRole });
      if (error) throw error;
      return (data || []) as Profile[];
    },
  });
}

function profileLabel(p: Profile) {
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ');
  return name || p.email || p.id.slice(0, 8);
}

// ─── Delete confirmation state ─────────────────────────────────────────
interface DeleteConfirmState {
  type: 'cluster' | 'area' | 'equipe';
  id: string;
  label: string;
}

// ─── Component ──────────────────────────────────────────────────────────
export default function EstruturaManager() {
  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);

  // Data queries from hooks
  const { data: clusters = [], isLoading: loadingClusters } = useEstruturaClusters();
  const { data: areas = [] } = useEstruturaAreas();
  const { data: equipes = [] } = useEstruturaEquipes();
  const { data: membros = [] } = useEstruturaMembros();
  const { data: centrosCusto = [] } = useEstruturaCentrosCusto();

  // Mutations from hook
  const mutations = useEstruturaMutations();

  // Candidatos a Gestor: lider ou superior (lider/admin)
  const { data: gestorCandidates = [] } = useProfilesMinRole('lider');
  // Candidatos a Membro: team_member ou superior (todos os internos)
  const { data: memberCandidates = [] } = useProfilesMinRole('team_member');
  // allProfiles = qualquer interno (memberCandidates já cobre todos os papéis internos pela hierarquia)
  const allProfiles = memberCandidates;

  // Helper para label do CC a partir do id
  const getCcLabel = (ccId: string | null | undefined) => {
    if (!ccId) return null;
    const cc = centrosCusto.find(c => c.id === ccId);
    return cc ? `${cc.codigo} - ${cc.nome}` : null;
  };

  // ─── Cluster CRUD ─────────────────────────────────────────────────
  const [clusterDialog, setClusterDialog] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null);
  const [clusterForm, setClusterForm] = useState({ name: '', nome_empresa: '', cnpj: '', cost_center_id: '', is_active: true });

  const openClusterCreate = () => {
    setEditingCluster(null);
    setClusterForm({ name: '', nome_empresa: '', cnpj: '', cost_center_id: '', is_active: true });
    setClusterDialog(true);
  };
  const openClusterEdit = (c: Cluster) => {
    setEditingCluster(c);
    setClusterForm({
      name: c.name,
      nome_empresa: c.nome_empresa || '',
      cnpj: c.cnpj || '',
      cost_center_id: c.cost_center_id || '',
      is_active: c.is_active,
    });
    setClusterDialog(true);
  };

  const saveCluster = async () => {
    await mutations.saveCluster({
      name: clusterForm.name,
      nome_empresa: clusterForm.nome_empresa.trim() || null,
      cnpj: clusterForm.cnpj.trim() || null,
      cost_center_id: clusterForm.cost_center_id || null,
      is_active: clusterForm.is_active,
    }, editingCluster);
    setClusterDialog(false);
  };

  const confirmDeleteCluster = (cluster: Cluster) => {
    setDeleteConfirm({ type: 'cluster', id: cluster.id, label: cluster.name });
  };

  // ─── Area CRUD ────────────────────────────────────────────────────
  const [areaDialog, setAreaDialog] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaForm, setAreaForm] = useState({ name: '', color: '#10b981', cluster_id: '', page_categories: [] as string[], cost_center_id: '' });

  const openAreaCreate = (clusterId: string) => { setEditingArea(null); setAreaForm({ name: '', color: '#10b981', cluster_id: clusterId, page_categories: [], cost_center_id: '' }); setAreaDialog(true); };
  const openAreaEdit = (a: Area) => { setEditingArea(a); setAreaForm({ name: a.name, color: a.color || '#10b981', cluster_id: a.cluster_id, page_categories: a.page_categories || [], cost_center_id: a.cost_center_id || '' }); setAreaDialog(true); };

  const saveArea = async () => {
    await mutations.saveArea({ name: areaForm.name, color: areaForm.color, cluster_id: areaForm.cluster_id, page_categories: areaForm.page_categories, cost_center_id: areaForm.cost_center_id || null }, editingArea);
    setAreaDialog(false);
  };

  const confirmDeleteArea = (area: Area) => {
    setDeleteConfirm({ type: 'area', id: area.id, label: area.name });
  };

  // ─── Gestor da equipe ─────────────────────────────────────────────
  const handleSetEquipeGestor = async (equipeId: string, userId: string | null) => {
    const equipe = equipes.find(e => e.id === equipeId);
    await mutations.setEquipeGestor(equipeId, userId, equipe?.name || equipeId, equipe?.gestor_id || null);
  };

  // ─── Equipe CRUD ──────────────────────────────────────────────────
  const [equipeDialog, setEquipeDialog] = useState(false);
  const [editingEquipe, setEditingEquipe] = useState<Equipe | null>(null);
  const [equipeForm, setEquipeForm] = useState<{ name: string; area_id: string; gestor_id: string | null }>({ name: '', area_id: '', gestor_id: null });

  const openEquipeCreate = (areaId: string) => { setEditingEquipe(null); setEquipeForm({ name: '', area_id: areaId, gestor_id: null }); setEquipeDialog(true); };
  const openEquipeEdit = (e: Equipe) => { setEditingEquipe(e); setEquipeForm({ name: e.name, area_id: e.area_id, gestor_id: e.gestor_id }); setEquipeDialog(true); };

  const saveEquipe = async () => {
    await mutations.saveEquipe({ name: equipeForm.name, area_id: equipeForm.area_id, gestor_id: equipeForm.gestor_id }, editingEquipe);
    setEquipeDialog(false);
  };

  const confirmDeleteEquipe = (equipe: Equipe) => {
    setDeleteConfirm({ type: 'equipe', id: equipe.id, label: equipe.name });
  };

  // ─── Membros ──────────────────────────────────────────────────────
  const handleAddMembro = async (equipeId: string, userId: string) => {
    const equipe = equipes.find(e => e.id === equipeId);
    const profile = allProfiles.find(p => p.id === userId);
    await mutations.addMembro(equipeId, userId, equipe?.name || equipeId, profile ? profileLabel(profile) : userId);
  };

  const handleRemoveMembro = async (id: string) => {
    const membro = membros.find(m => m.id === id);
    const profile = membro ? allProfiles.find(p => p.id === membro.user_id) : null;
    await mutations.removeMembro(id, profile ? profileLabel(profile) : id);
  };

  // ─── Handle delete confirmation ───────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    setDeleteConfirm(null);
    if (type === 'cluster') {
      const cluster = clusters.find(c => c.id === id);
      if (cluster) await mutations.deleteCluster(cluster);
    } else if (type === 'area') {
      const area = areas.find(a => a.id === id);
      if (area) await mutations.deleteArea(area);
    } else if (type === 'equipe') {
      const equipe = equipes.find(e => e.id === id);
      if (equipe) await mutations.deleteEquipe(equipe);
    }
  };

  const getDeleteMessage = () => {
    if (!deleteConfirm) return '';
    switch (deleteConfirm.type) {
      case 'cluster': return 'Excluir cluster e todas as áreas/equipes vinculadas?';
      case 'area': return 'Excluir área e suas equipes?';
      case 'equipe': return 'Excluir equipe e seus membros?';
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  const totalEquipes = equipes.length;
  const totalMembros = membros.length;

  const activeClusters = clusters.filter(c => c.is_active);
  const inactiveClusters = clusters.filter(c => !c.is_active);

  const renderClusterItem = (cluster: Cluster) => {
    const clusterAreas = areas.filter(a => a.cluster_id === cluster.id);
    return (
      <AccordionItem key={cluster.id} value={cluster.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-slate-50">
          <div className="flex items-center gap-3 flex-1 text-left">
            <Network className="h-5 w-5 text-teal-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900">{cluster.name}</div>
              {(cluster.nome_empresa || cluster.cnpj || cluster.cost_center_id) && (
                <div className="text-xs text-slate-500">
                  {cluster.nome_empresa && <>Empresa: {cluster.nome_empresa}</>}
                  {cluster.cnpj && <> • CNPJ: {cluster.cnpj}</>}
                  {getCcLabel(cluster.cost_center_id) && <> • CC: {getCcLabel(cluster.cost_center_id)}</>}
                </div>
              )}
            </div>
            <Badge variant="secondary" className="mr-2">{clusterAreas.length} áreas</Badge>
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openClusterEdit(cluster)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => confirmDeleteCluster(cluster)}>
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
              <Accordion
                type="multiple"
                className="space-y-2"
                defaultValue={clusterAreas.length === 1 ? [clusterAreas[0].id] : []}
              >
                {clusterAreas.map(area => {
                  const areaEquipes = equipes.filter(e => e.area_id === area.id);
                  // Gestores das equipes da área (substitui o antigo "líder da área")
                  const gestorIds = [...new Set(areaEquipes.map(e => e.gestor_id).filter(Boolean) as string[])];
                  const gestorProfiles = gestorIds
                    .map(id => allProfiles.find(p => p.id === id))
                    .filter((p): p is Profile => !!p);

                  return (
                    <AccordionItem key={area.id} value={area.id} className="rounded-md border border-slate-100 bg-slate-50/50">
                      <AccordionTrigger className="px-3 py-2 hover:no-underline hover:bg-slate-100/50 text-sm">
                        <div className="flex items-center gap-2 flex-1 text-left">
                          <div className="w-3 h-3 rounded-full shrink-0 border" style={{ backgroundColor: area.color || '#94a3b8' }} />
                          <span className="font-medium text-slate-800">{area.name}</span>
                          {gestorProfiles.length > 0 && (
                            <span className="text-xs text-slate-500 ml-1">
                              • Gestor{gestorProfiles.length > 1 ? 'es' : ''}: {gestorProfiles.map(profileLabel).join(', ')}
                            </span>
                          )}
                          {(() => {
                            let ccLabel: string | null = null;
                            if (area.cost_center_id) {
                              const cc = centrosCusto.find(c => c.id === area.cost_center_id);
                              ccLabel = cc ? `${cc.codigo} - ${cc.nome}` : null;
                            } else {
                              ccLabel = getCcLabel(cluster.cost_center_id);
                            }
                            return ccLabel ? (
                              <Badge variant="secondary" className="text-xs ml-1">{area.cost_center_id ? 'CC:' : 'CC (herdado):'} {ccLabel}</Badge>
                            ) : null;
                          })()}
                          <Badge variant="outline" className="ml-auto mr-2 text-xs">{areaEquipes.length} equipes</Badge>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openAreaEdit(area)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => confirmDeleteArea(area)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-3">
                        <div className="space-y-3">
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
                                const equipeMembros = membros.filter(m => m.equipe_id === equipe.id);
                                const equipeMembroIds = new Set(equipeMembros.map(m => m.user_id));
                                const availableMembers = memberCandidates.filter(p => !equipeMembroIds.has(p.id));

                                return (
                                  <div key={equipe.id} className="rounded border border-slate-200 bg-white p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5 text-slate-500" />
                                        <span className="text-sm font-medium text-slate-800">{equipe.name}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEquipeEdit(equipe)}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => confirmDeleteEquipe(equipe)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Gestor (1 por equipe) */}
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs text-slate-600 shrink-0">Gestor:</Label>
                                      <Select
                                        value={equipe.gestor_id || '_none'}
                                        onValueChange={(val) => handleSetEquipeGestor(equipe.id, val === '_none' ? null : val)}
                                      >
                                        <SelectTrigger className="h-7 text-xs max-w-[220px]">
                                          <SelectValue placeholder="Selecionar gestor..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="_none" className="text-xs">Nenhum</SelectItem>
                                          {gestorCandidates.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-xs">
                                              {profileLabel(p)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Members */}
                                    <div className="flex flex-wrap gap-1.5">
                                      {equipeMembros.map(m => {
                                        const profile = allProfiles.find(p => p.id === m.user_id);
                                        return (
                                          <Badge key={m.id} variant="secondary" className="text-xs gap-1 pr-1">
                                            {profile ? profileLabel(profile) : m.user_id.slice(0, 8)}
                                            <button onClick={() => handleRemoveMembro(m.id)} className="hover:text-destructive ml-0.5">
                                              <X className="h-3 w-3" />
                                            </button>
                                          </Badge>
                                        );
                                      })}
                                    </div>

                                    {/* Add member */}
                                    <Select
                                      onValueChange={(val) => handleAddMembro(equipe.id, val)}
                                      disabled={availableMembers.length === 0}
                                    >
                                      <SelectTrigger className="h-7 text-xs max-w-[220px]">
                                        <SelectValue placeholder={availableMembers.length === 0 ? 'Todos os elegíveis já são membros' : '+ Adicionar membro...'} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableMembers.map(p => (
                                          <SelectItem key={p.id} value={p.id} className="text-xs">
                                            {profileLabel(p)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
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
  };

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
        <div className="space-y-4">
          {activeClusters.length === 0 ? (
            <Card className="bg-white border-slate-200/60 shadow-sm">
              <CardContent className="py-6 text-center text-slate-500 text-sm">
                Nenhum cluster ativo.
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {activeClusters.map(renderClusterItem)}
            </Accordion>
          )}

          {inactiveClusters.length > 0 && (
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <div className="flex items-center gap-2">
                  <span>Clusters inativos</span>
                  <Badge variant="secondary" className="text-xs">{inactiveClusters.length}</Badge>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Accordion type="multiple" className="space-y-3 opacity-75">
                  {inactiveClusters.map(renderClusterItem)}
                </Accordion>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* ─── Delete Confirmation AlertDialog ─────────────────────────── */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteMessage()}
              <br />
              <strong>{deleteConfirm?.label}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Label>Nome da Empresa</Label>
              <Input
                value={clusterForm.nome_empresa}
                onChange={e => setClusterForm(f => ({ ...f, nome_empresa: e.target.value }))}
                placeholder="Ex: PSA Consultores Ltda"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={clusterForm.cnpj}
                onChange={e => setClusterForm(f => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Select
                value={clusterForm.cost_center_id || '_none'}
                onValueChange={(val) => setClusterForm(f => ({ ...f, cost_center_id: val === '_none' ? '' : val }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar centro de custo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {centrosCusto.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editingCluster && (
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="cluster-active" className="cursor-pointer">
                    {clusterForm.is_active ? 'Cluster ativo' : 'Cluster inativo'}
                  </Label>
                  <p className="text-xs text-slate-500">
                    {clusterForm.is_active
                      ? 'Visível na lista principal.'
                      : 'Será exibido na seção de inativos.'}
                  </p>
                </div>
                <Switch
                  id="cluster-active"
                  checked={clusterForm.is_active}
                  onCheckedChange={(checked) => setClusterForm(f => ({ ...f, is_active: checked }))}
                />
              </div>
            )}
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
            <div className="space-y-2">
              <Label>Categorias de Páginas</Label>
              <p className="text-xs text-slate-500">Membros desta área terão acesso às páginas dessas categorias.</p>
              <div className="flex flex-wrap gap-2">
                {['dev', 'rotina', 'tax', 'projetos', 'fiscal', 'osg', 'board', 'gestao', 'geral'].map(cat => {
                  const selected = areaForm.page_categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAreaForm(f => ({
                        ...f,
                        page_categories: selected
                          ? f.page_categories.filter(c => c !== cat)
                          : [...f.page_categories, cat]
                      }))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo (opcional)</Label>
              <p className="text-xs text-slate-500">Pode ser diferente do centro de custo do cluster/empresa.</p>
              <Select value={areaForm.cost_center_id} onValueChange={(val) => setAreaForm(f => ({ ...f, cost_center_id: val === '_none' ? '' : val }))}>
                <SelectTrigger><SelectValue placeholder="Herdar do cluster" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Herdar do cluster</SelectItem>
                  {centrosCusto.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
