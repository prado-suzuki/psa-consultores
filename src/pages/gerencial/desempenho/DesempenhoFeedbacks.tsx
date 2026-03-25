import { useState } from 'react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { useFeedbacks, useCreateFeedback, type Feedback } from '@/hooks/useFeedbacksDesempenho';
import { useCiclosAvaliacao, useCicloAtivo } from '@/hooks/useCiclosAvaliacao';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

const tipoColors: Record<string, string> = {
  reconhecimento: 'bg-emerald-100 text-emerald-700',
  desenvolvimento: 'bg-amber-100 text-amber-700',
  '360': 'bg-blue-100 text-blue-700',
};
const tipoLabels: Record<string, string> = { reconhecimento: 'Reconhecimento', desenvolvimento: 'Desenvolvimento', '360': '360' };

const DesempenhoFeedbacks = () => {
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: feedbacks, isLoading } = useFeedbacks();
  const createFeedback = useCreateFeedback();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMembro, setSelectedMembro] = useState('');
  const [expandedMembroFeedback, setExpandedMembroFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({ para_usuario_id: '', tipo: 'reconhecimento' as string, ciclo_id: '', contexto: '', comportamento: '', impacto: '', anonimo: false });

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });
  const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
  const getName = (id: string | null) => { if (!id) return 'Anonimo'; const p = profileMap.get(id); return p ? `${p.first_name} ${p.last_name}` : id.slice(0, 8); };

  const handleCreate = () => {
    createFeedback.mutate({
      para_usuario_id: form.para_usuario_id || null, tipo: form.tipo as any, ciclo_id: form.ciclo_id || null,
      contexto: form.contexto, comportamento: form.comportamento, impacto: form.impacto, anonimo: form.anonimo,
      de_usuario_id: form.anonimo ? null : user?.id ?? null, visivel_para_avaliado: true,
    }, { onSuccess: () => { setShowForm(false); setForm({ para_usuario_id: '', tipo: 'reconhecimento', ciclo_id: '', contexto: '', comportamento: '', impacto: '', anonimo: false }); } });
  };

  const membroFeedbacks = selectedMembro ? {
    recebidos: feedbacks?.filter(f => f.para_usuario_id === selectedMembro) ?? [],
    enviados: feedbacks?.filter(f => f.de_usuario_id === selectedMembro) ?? [],
  } : null;

  const renderFeedbackCard = (f: Feedback) => {
    const isExpanded = expandedMembroFeedback === f.id;
    return (
      <div key={f.id} className="p-3 border-b last:border-0 text-sm cursor-pointer" onClick={() => setExpandedMembroFeedback(isExpanded ? null : f.id)}>
        <div className="flex justify-between items-center">
          <Badge className={`${tipoColors[f.tipo]} border-0 text-xs`}>{tipoLabels[f.tipo]}</Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--board-t4)' }}>{f.created_at?.slice(0, 10)}</span>
            {isExpanded ? <ChevronUp className="h-3 w-3" style={{ color: 'var(--board-t4)' }} /> : <ChevronDown className="h-3 w-3" style={{ color: 'var(--board-t4)' }} />}
          </div>
        </div>
        <p className={`mt-1 ${isExpanded ? '' : 'line-clamp-2'}`} style={{ color: 'var(--board-t3)' }}>{f.contexto}</p>
        {isExpanded && (
          <div className="mt-2 space-y-1.5 pt-2" style={{ borderTop: '1px solid var(--board-border)' }}>
            <div><span className="font-medium" style={{ color: 'var(--board-t2)' }}>Comportamento:</span> <span style={{ color: 'var(--board-t3)' }}>{f.comportamento}</span></div>
            <div><span className="font-medium" style={{ color: 'var(--board-t2)' }}>Impacto:</span> <span style={{ color: 'var(--board-t3)' }}>{f.impacto}</span></div>
          </div>
        )}
      </div>
    );
  };

  return (
    <BoardLayout title="Feedbacks" subtitle="Registro continuo de feedbacks" headerActions={
      <Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Registrar Feedback</Button>
    }>
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList><TabsTrigger value="todos">Todos os feedbacks</TabsTrigger><TabsTrigger value="membro">Por membro</TabsTrigger></TabsList>

        <TabsContent value="todos">
          {isLoading ? <Skeleton className="h-64" /> : (
            <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Tipo</TableHead><TableHead>Contexto</TableHead><TableHead>Data</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {feedbacks?.map(f => (
                      <React.Fragment key={f.id}>
                        <TableRow className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>
                          <TableCell className="text-sm">{f.anonimo ? 'Anonimo' : getName(f.de_usuario_id)}</TableCell>
                          <TableCell className="text-sm">{getName(f.para_usuario_id)}</TableCell>
                          <TableCell><Badge className={`${tipoColors[f.tipo] ?? ''} border-0 text-xs`}>{tipoLabels[f.tipo] ?? f.tipo}</Badge></TableCell>
                          <TableCell className="text-sm max-w-xs truncate" style={{ color: 'var(--board-t3)' }}>{f.contexto}</TableCell>
                          <TableCell className="text-xs" style={{ color: 'var(--board-t4)' }}>{f.created_at?.slice(0, 10)}</TableCell>
                          <TableCell>{expandedId === f.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                        </TableRow>
                        {expandedId === f.id && (
                          <TableRow>
                            <TableCell colSpan={6} style={{ backgroundColor: 'var(--board-bg)' }}>
                              <div className="space-y-2 p-2 text-sm">
                                <div><strong>Contexto:</strong> {f.contexto}</div>
                                <div><strong>Comportamento:</strong> {f.comportamento}</div>
                                <div><strong>Impacto:</strong> {f.impacto}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                    {(!feedbacks || feedbacks.length === 0) && <TableRow><TableCell colSpan={6} className="text-center py-8" style={{ color: 'var(--board-t3)' }}>Nenhum feedback registrado</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="membro">
          <div className="mb-4">
            <Select value={selectedMembro} onValueChange={setSelectedMembro}>
              <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
              <SelectContent>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {membroFeedbacks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--board-t1)' }}>Recebidos ({membroFeedbacks.recebidos.length})</h3>
                  {membroFeedbacks.recebidos.map(f => renderFeedbackCard(f))}
                  {membroFeedbacks.recebidos.length === 0 && <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhum feedback recebido.</p>}
                </CardContent>
              </Card>
              <Card className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid var(--board-border)' }}>
                <CardContent className="pt-4">
                  <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--board-t1)' }}>Enviados ({membroFeedbacks.enviados.length})</h3>
                  {membroFeedbacks.enviados.map(f => renderFeedbackCard(f))}
                  {membroFeedbacks.enviados.length === 0 && <p className="text-sm" style={{ color: 'var(--board-t3)' }}>Nenhum feedback enviado.</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Para</Label><Select value={form.para_usuario_id} onValueChange={v => setForm({ ...form, para_usuario_id: v })}><SelectTrigger><SelectValue placeholder="Selecionar membro" /></SelectTrigger><SelectContent>{profiles?.map(p => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Tipo</Label><Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="reconhecimento">Reconhecimento</SelectItem><SelectItem value="desenvolvimento">Desenvolvimento</SelectItem><SelectItem value="360">360</SelectItem></SelectContent></Select></div>
            <div><Label>Ciclo (opcional)</Label><Select value={form.ciclo_id} onValueChange={v => setForm({ ...form, ciclo_id: v })}><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger><SelectContent>{ciclos?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Em qual situacao ou projeto isso aconteceu?</Label><Textarea value={form.contexto} onChange={e => setForm({ ...form, contexto: e.target.value })} /></div>
            <div><Label>O que voce observou especificamente?</Label><Textarea value={form.comportamento} onChange={e => setForm({ ...form, comportamento: e.target.value })} /></div>
            <div><Label>Qual foi o impacto disso?</Label><Textarea value={form.impacto} onChange={e => setForm({ ...form, impacto: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.anonimo} onCheckedChange={v => setForm({ ...form, anonimo: v })} /><Label>Anonimo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.contexto || !form.comportamento || !form.impacto || createFeedback.isPending}>{createFeedback.isPending ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BoardLayout>
  );
};

export default DesempenhoFeedbacks;
