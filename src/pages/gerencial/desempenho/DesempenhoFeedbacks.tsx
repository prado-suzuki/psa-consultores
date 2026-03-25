import { useState } from 'react';
import { DesempenhoLayout } from '@/components/desempenho/DesempenhoLayout';
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

const tipoColors: Record<string, string> = {
  reconhecimento: 'bg-emerald-100 text-emerald-700',
  desenvolvimento: 'bg-amber-100 text-amber-700',
  '360': 'bg-blue-100 text-blue-700',
};
const tipoLabels: Record<string, string> = { reconhecimento: 'Reconhecimento', desenvolvimento: 'Desenvolvimento', '360': '360°' };

const DesempenhoFeedbacks = () => {
  const { data: ciclos } = useCiclosAvaliacao();
  const { data: cicloAtivo } = useCicloAtivo();
  const { data: feedbacks, isLoading } = useFeedbacks();
  const createFeedback = useCreateFeedback();
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMembro, setSelectedMembro] = useState('');
  const [form, setForm] = useState({ para_usuario_id: '', tipo: 'reconhecimento' as string, ciclo_id: '', contexto: '', comportamento: '', impacto: '', anonimo: false });

  const { data: profiles } = useQuery({
    queryKey: ['profiles_safe_all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      return (data ?? []) as unknown as { id: string; first_name: string; last_name: string }[];
    },
  });
  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const getName = (id: string | null) => { if (!id) return 'Anônimo'; const p = profileMap.get(id); return p ? `${p.first_name} ${p.last_name}` : id.slice(0, 8); };

  const handleCreate = () => {
    createFeedback.mutate({
      para_usuario_id: form.para_usuario_id || null,
      tipo: form.tipo as any,
      ciclo_id: form.ciclo_id || null,
      contexto: form.contexto,
      comportamento: form.comportamento,
      impacto: form.impacto,
      anonimo: form.anonimo,
      de_usuario_id: form.anonimo ? null : user?.id ?? null,
      visivel_para_avaliado: true,
    }, { onSuccess: () => { setShowForm(false); setForm({ para_usuario_id: '', tipo: 'reconhecimento', ciclo_id: '', contexto: '', comportamento: '', impacto: '', anonimo: false }); } });
  };

  const membroFeedbacks = selectedMembro ? {
    recebidos: feedbacks?.filter((f) => f.para_usuario_id === selectedMembro) ?? [],
    enviados: feedbacks?.filter((f) => f.de_usuario_id === selectedMembro) ?? [],
  } : null;

  return (
    <DesempenhoLayout title="Feedbacks" subtitle="Registro contínuo de feedbacks" headerActions={
      <Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Registrar Feedback</Button>
    }>
      <Tabs defaultValue="todos" className="space-y-4">
        <TabsList><TabsTrigger value="todos">Todos os feedbacks</TabsTrigger><TabsTrigger value="membro">Por membro</TabsTrigger></TabsList>

        <TabsContent value="todos">
          {isLoading ? <Skeleton className="h-64" /> : (
            <Card className="border-border shadow-sm rounded-xl">
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Tipo</TableHead><TableHead>Contexto</TableHead><TableHead>Data</TableHead><TableHead /></TableRow></TableHeader>
                  <TableBody>
                    {feedbacks?.map((f) => (
                      <>
                        <TableRow key={f.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}>
                          <TableCell className="text-sm">{f.anonimo ? 'Anônimo' : getName(f.de_usuario_id)}</TableCell>
                          <TableCell className="text-sm">{getName(f.para_usuario_id)}</TableCell>
                          <TableCell><Badge className={`${tipoColors[f.tipo] ?? ''} border-0 text-xs`}>{tipoLabels[f.tipo] ?? f.tipo}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{f.contexto}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{f.created_at?.slice(0, 10)}</TableCell>
                          <TableCell>{expandedId === f.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                        </TableRow>
                        {expandedId === f.id && (
                          <TableRow key={`${f.id}-exp`}>
                            <TableCell colSpan={6} className="bg-slate-50">
                              <div className="space-y-2 p-2 text-sm">
                                <div><strong>Contexto:</strong> {f.contexto}</div>
                                <div><strong>Comportamento:</strong> {f.comportamento}</div>
                                <div><strong>Impacto:</strong> {f.impacto}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                    {(!feedbacks || feedbacks.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum feedback registrado</TableCell></TableRow>}
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
              <SelectContent>{profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {membroFeedbacks && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border shadow-sm rounded-xl"><CardContent className="pt-4"><h3 className="font-semibold text-sm mb-3">Recebidos ({membroFeedbacks.recebidos.length})</h3>
                {membroFeedbacks.recebidos.map((f) => (
                  <div key={f.id} className="p-3 border-b last:border-0 text-sm space-y-1">
                    <div className="flex justify-between"><Badge className={`${tipoColors[f.tipo]} border-0 text-xs`}>{tipoLabels[f.tipo]}</Badge><span className="text-xs text-muted-foreground">{f.created_at?.slice(0, 10)}</span></div>
                    <p className="text-muted-foreground">{f.contexto}</p>
                  </div>
                ))}
                {membroFeedbacks.recebidos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum feedback recebido.</p>}
              </CardContent></Card>
              <Card className="border-border shadow-sm rounded-xl"><CardContent className="pt-4"><h3 className="font-semibold text-sm mb-3">Enviados ({membroFeedbacks.enviados.length})</h3>
                {membroFeedbacks.enviados.map((f) => (
                  <div key={f.id} className="p-3 border-b last:border-0 text-sm space-y-1">
                    <div className="flex justify-between"><Badge className={`${tipoColors[f.tipo]} border-0 text-xs`}>{tipoLabels[f.tipo]}</Badge><span className="text-xs text-muted-foreground">{f.created_at?.slice(0, 10)}</span></div>
                    <p className="text-muted-foreground">{f.contexto}</p>
                  </div>
                ))}
                {membroFeedbacks.enviados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum feedback enviado.</p>}
              </CardContent></Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Para</Label>
              <Select value={form.para_usuario_id} onValueChange={(v) => setForm({ ...form, para_usuario_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecionar membro" /></SelectTrigger>
                <SelectContent>{profiles?.map((p) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="reconhecimento">Reconhecimento</SelectItem><SelectItem value="desenvolvimento">Desenvolvimento</SelectItem><SelectItem value="360">360°</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Ciclo (opcional)</Label>
              <Select value={form.ciclo_id} onValueChange={(v) => setForm({ ...form, ciclo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>{ciclos?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Em qual situação ou projeto isso aconteceu?</Label><Textarea value={form.contexto} onChange={(e) => setForm({ ...form, contexto: e.target.value })} /></div>
            <div><Label>O que você observou especificamente?</Label><Textarea value={form.comportamento} onChange={(e) => setForm({ ...form, comportamento: e.target.value })} /></div>
            <div><Label>Qual foi o impacto disso?</Label><Textarea value={form.impacto} onChange={(e) => setForm({ ...form, impacto: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.anonimo} onCheckedChange={(v) => setForm({ ...form, anonimo: v })} /><Label>Anônimo</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.contexto || !form.comportamento || !form.impacto || createFeedback.isPending}>{createFeedback.isPending ? 'Salvando...' : 'Registrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DesempenhoLayout>
  );
};

export default DesempenhoFeedbacks;
