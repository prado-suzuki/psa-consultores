import { useState } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useReunioes, useCreateReuniao, useAllOpenItensAcao, useUpdateItemAcao, useItensAcao, type Reuniao1a1 } from '@/hooks/useReunioes1a1';
import { useCiclosAvaliacao, useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const sentimentLabels = ['Muito ruim', 'Ruim', 'Neutro', 'Bom', 'Muito bom'];
const sentimentColors = ['#EF4444', '#F97316', 'var(--board-t4)', '#10B981', '#059669'];

const statusColors: Record<string, string> = {
  aberto: 'bg-amber-100 text-amber-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluido: 'bg-emerald-100 text-emerald-700',
  cancelado: 'bg-slate-100 text-slate-600',
};

const DesempenhoReunioes1a1 = () => {
  const { data: allReunioes, isLoading } = useReunioes();
  const { data: openItems } = useAllOpenItensAcao();
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const createReuniao = useCreateReuniao();
  const updateItem = useUpdateItemAcao();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [selectedMembro, setSelectedMembro] = useState<string | null>(null);
  const [form, setForm] = useState({ membro_id: '', data_reuniao: new Date().toISOString().slice(0, 10), temas_discutidos: '', sentimento: 3, observacoes_lider: '', ciclo_id: '' });
  const [itensForm, setItensForm] = useState<{ descricao: string; responsavel_id: string; prazo: string }[]>([]);

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });
  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
  const getName = (id: string | null) => { const p = id ? profileMap.get(id) : null; return p ? `${p.first_name} ${p.last_name}` : '--'; };

  // Fetch all action items for display in history
  const { data: allItens } = useQuery({
    queryKey: ['itens_acao_1a1_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('itens_acao_1a1' as any).select('*').order('created_at');
      if (error) throw error;
      return (data ?? []) as unknown as { id: string; reuniao_id: string; descricao: string; responsavel_id: string | null; prazo: string | null; status: string }[];
    },
  });

  const membroMap = new Map<string, Reuniao1a1[]>();
  allReunioes?.forEach(r => { if (r.membro_id) { const arr = membroMap.get(r.membro_id) || []; arr.push(r); membroMap.set(r.membro_id, arr); } });

  // Group open items by member
  const reuniaoMembroMap = new Map<string, string>();
  allReunioes?.forEach(r => { if (r.membro_id) reuniaoMembroMap.set(r.id, r.membro_id); });

  const openItemsByMembro = new Map<string, typeof openItems>();
  openItems?.forEach(item => {
    const membroId = reuniaoMembroMap.get(item.reuniao_id);
    if (membroId) {
      const arr = openItemsByMembro.get(membroId) || [];
      arr.push(item);
      openItemsByMembro.set(membroId, arr);
    }
  });

  // Count open items per member
  const openCountByMembro = new Map<string, number>();
  openItemsByMembro.forEach((items, membroId) => openCountByMembro.set(membroId, items.length));

  const handleCreate = () => {
    createReuniao.mutate({
      reuniao: { lider_id: user?.id ?? null, membro_id: form.membro_id || null, ciclo_id: form.ciclo_id || null, data_reuniao: form.data_reuniao, temas_discutidos: form.temas_discutidos || null, sentimento: form.sentimento, observacoes_lider: form.observacoes_lider || null },
      itens: itensForm.filter(i => i.descricao).map(i => ({ descricao: i.descricao, responsavel_id: i.responsavel_id || null, prazo: i.prazo || null, status: 'aberto' })),
    }, { onSuccess: () => { setShowForm(false); setForm({ membro_id: '', data_reuniao: new Date().toISOString().slice(0, 10), temas_discutidos: '', sentimento: 3, observacoes_lider: '', ciclo_id: '' }); setItensForm([]); } });
  };

  const filteredReunioes = selectedMembro ? membroMap.get(selectedMembro) ?? [] : [];

  return (
    <BoardLayout title="Reunioes 1:1" subtitle="Registros e acompanhamento" headerActions={
      <Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Registrar 1:1</Button>
    }>
      {/* Open action items panel - grouped by member */}
      {openItems && openItems.length > 0 && (
        <Card className="mb-6 rounded-xl shadow-sm" style={{ border: '1px solid #FDE68A', backgroundColor: '#FFFBEB' }}>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" style={{ color: '#D97706' }} />Itens de acao em aberto ({openItems.length})</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Array.from(openItemsByMembro.entries()).map(([membroId, items]) => (
              <div key={membroId}>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--board-t2)' }}>{getName(membroId)}</p>
                <div className="space-y-1.5">
                  {items?.slice(0, 5).map(item => {
                    const vencido = item.prazo && item.prazo < new Date().toISOString().slice(0, 10);
                    const diasAtraso = item.prazo ? Math.ceil((Date.now() - new Date(item.prazo).getTime()) / 86400000) : 0;
                    return (
                      <div key={item.id} className="flex items-center gap-3 text-sm">
                        <span className="flex-1">{item.descricao}</span>
                        <span className={`text-xs ${vencido ? 'font-semibold' : ''}`} style={{ color: vencido ? '#EF4444' : 'var(--board-t4)' }}>
                          {item.prazo ?? '--'} {vencido && diasAtraso > 0 ? `(${diasAtraso}d atraso)` : ''}
                        </span>
                        <Badge className={`${statusColors[item.status] ?? ''} border-0 text-xs`}>{item.status}</Badge>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => updateItem.mutate({ id: item.id, status: 'concluido' })}>Concluir</Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Member grid */}
      {isLoading ? <Skeleton className="h-64" /> : (
        <>
          {!selectedMembro ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from(membroMap.entries()).map(([membroId, reunioes]) => {
                const profile = profileMap.get(membroId);
                const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '??';
                const lastDate = reunioes[0]?.data_reuniao ?? '--';
                const openCount = openCountByMembro.get(membroId) || 0;
                return (
                  <Card key={membroId} className="bg-white rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow" style={{ border: '1px solid var(--board-border)' }} onClick={() => setSelectedMembro(membroId)}>
                    <CardContent className="pt-5 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>{initials}</div>
                      <div className="flex-1">
                        <p className="font-medium text-sm" style={{ color: 'var(--board-t1)' }}>{getName(membroId)}</p>
                        <p className="text-xs" style={{ color: 'var(--board-t4)' }}>Ultimo 1:1: {lastDate}</p>
                        <p className="text-xs" style={{ color: 'var(--board-t4)' }}>{reunioes.length} reunioes registradas</p>
                      </div>
                      {openCount > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">{openCount} abertos</Badge>
                      )}
                      {openCount === 0 && (
                        <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">0</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {membroMap.size === 0 && (
                <div className="col-span-full flex flex-col items-center py-12">
                  <Users className="h-8 w-8 mb-2" style={{ color: 'var(--board-t4)' }} />
                  <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhuma 1:1 registrada ainda.</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Button variant="ghost" className="mb-4" onClick={() => setSelectedMembro(null)}>Voltar para todos</Button>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--board-t1)' }}>Historico de 1:1s -- {getName(selectedMembro)}</h2>
              <div className="space-y-4">
                {filteredReunioes.map(r => {
                  const reuniaoItens = allItens?.filter(i => i.reuniao_id === r.id) ?? [];
                  return (
                    <Card key={r.id} className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium" style={{ color: 'var(--board-t1)' }}>{r.data_reuniao}</span>
                          {r.sentimento && (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: `${sentimentColors[r.sentimento - 1]}20`, color: sentimentColors[r.sentimento - 1] }}>
                              {sentimentLabels[r.sentimento - 1]}
                            </span>
                          )}
                        </div>
                        {r.temas_discutidos && <p className="text-sm mb-3" style={{ color: 'var(--board-t3)' }}>{r.temas_discutidos}</p>}
                        {reuniaoItens.length > 0 && (
                          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--board-border)' }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--board-sb-grp)' }}>Itens de acao</p>
                            <div className="space-y-1.5">
                              {reuniaoItens.map(item => {
                                const vencido = item.prazo && item.status === 'aberto' && item.prazo < new Date().toISOString().slice(0, 10);
                                return (
                                  <div key={item.id} className="flex items-center gap-3 text-sm">
                                    <span className="flex-1">{item.descricao}</span>
                                    {item.responsavel_id && <span className="text-xs" style={{ color: 'var(--board-t4)' }}>{getName(item.responsavel_id)}</span>}
                                    <span className="text-xs" style={{ color: vencido ? '#EF4444' : 'var(--board-t4)' }}>{item.prazo ?? '--'}</span>
                                    <Badge className={`${statusColors[item.status] ?? 'bg-slate-100 text-slate-600'} border-0 text-xs`}>{item.status}</Badge>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Register 1:1 Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar 1:1</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Membro</Label><Select value={form.membro_id} onValueChange={v => setForm({ ...form, membro_id: v })}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Data da reuniao</Label><Input type="date" value={form.data_reuniao} onChange={e => setForm({ ...form, data_reuniao: e.target.value })} /></div>
            <div><Label>Temas discutidos</Label><Textarea value={form.temas_discutidos} onChange={e => setForm({ ...form, temas_discutidos: e.target.value })} /></div>
            <div><Label>Sentimento geral</Label>
              <div className="flex gap-2 mt-1">{sentimentLabels.map((label, i) => (
                <button key={i} type="button" className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${form.sentimento === i + 1 ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ backgroundColor: `${sentimentColors[i]}15`, color: sentimentColors[i], ...(form.sentimento === i + 1 ? { ringColor: sentimentColors[i] } : {}) }}
                  onClick={() => setForm({ ...form, sentimento: i + 1 })}>{label}</button>
              ))}</div>
            </div>
            <div><Label>Observacoes do lider (interno)</Label><Textarea value={form.observacoes_lider} onChange={e => setForm({ ...form, observacoes_lider: e.target.value })} /></div>
            <div><Label>Ciclo (opcional)</Label><Select value={form.ciclo_id} onValueChange={v => setForm({ ...form, ciclo_id: v })}><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger><SelectContent>{ciclos?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Itens de acao</Label>
              {itensForm.map((item, idx) => (
                <div key={idx} className="flex gap-2 mt-2">
                  <Input placeholder="Descricao" value={item.descricao} onChange={e => { const arr = [...itensForm]; arr[idx].descricao = e.target.value; setItensForm(arr); }} className="flex-1" />
                  <Input type="date" value={item.prazo} onChange={e => { const arr = [...itensForm]; arr[idx].prazo = e.target.value; setItensForm(arr); }} className="w-36" />
                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setItensForm(itensForm.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setItensForm([...itensForm, { descricao: '', responsavel_id: form.membro_id, prazo: '' }])}>+ Adicionar item</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.membro_id || createReuniao.isPending}>{createReuniao.isPending ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardLayout>
  );
};

// Need Users icon at top level for empty state
import { Users } from 'lucide-react';

export default DesempenhoReunioes1a1;
