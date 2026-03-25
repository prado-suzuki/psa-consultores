import { useState } from 'react';
import { DesempenhoLayout } from '@/components/desempenho/DesempenhoLayout';
import { useCiclosAvaliacao, useCreateCiclo, useUpdateCiclo, type CicloAvaliacao } from '@/hooks/useCiclosAvaliacao';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  planejado: 'bg-slate-100 text-slate-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  em_avaliacao: 'bg-amber-100 text-amber-700',
  encerrado: 'bg-emerald-100 text-emerald-700',
};

const statusLabels: Record<string, string> = {
  planejado: 'Planejado',
  em_andamento: 'Em andamento',
  em_avaliacao: 'Em avaliação',
  encerrado: 'Encerrado',
};

const DesempenhoCiclos = () => {
  const { data: ciclos, isLoading } = useCiclosAvaliacao();
  const createCiclo = useCreateCiclo();
  const updateCiclo = useUpdateCiclo();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nome: '', data_inicio: '', data_fim: '', data_analise_semestral: '', descricao: '', status: 'planejado' });

  const handleCreate = () => {
    createCiclo.mutate({
      nome: form.nome,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      data_analise_semestral: form.data_analise_semestral || null,
      descricao: form.descricao || null,
      status: form.status,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setForm({ nome: '', data_inicio: '', data_fim: '', data_analise_semestral: '', descricao: '', status: 'planejado' });
      },
    });
  };

  const handleStatusChange = (ciclo: CicloAvaliacao, newStatus: string) => {
    updateCiclo.mutate({ id: ciclo.id, status: newStatus });
  };

  return (
    <DesempenhoLayout title="Ciclos de Avaliação" subtitle="Gerencie os ciclos de avaliação de desempenho" headerActions={
      <Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Novo Ciclo</Button>
    }>
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Análise Semestral</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ciclos?.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.data_inicio} — {c.data_fim}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.data_analise_semestral ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[c.status] ?? ''} border-0 text-xs font-semibold`}>{statusLabels[c.status] ?? c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {c.status === 'planejado' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(c, 'em_andamento')}>Iniciar</Button>
                        )}
                        {c.status === 'em_andamento' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(c, 'em_avaliacao')}>Avaliar</Button>
                        )}
                        {c.status === 'em_avaliacao' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(c, 'encerrado')}>Encerrar</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!ciclos || ciclos.length === 0) && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum ciclo cadastrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* New Cycle Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Ciclo de Avaliação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input placeholder="Ex: Março – Outubro 2026" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data início</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label>Data fim</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
            </div>
            <div><Label>Data análise semestral (opcional)</Label><Input type="date" value={form.data_analise_semestral} onChange={(e) => setForm({ ...form, data_analise_semestral: e.target.value })} /><p className="text-xs text-muted-foreground mt-1">Data prevista para a análise intermediária</p></div>
            <div><Label>Descrição (opcional)</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!form.nome || !form.data_inicio || !form.data_fim || createCiclo.isPending}>
              {createCiclo.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DesempenhoLayout>
  );
};

export default DesempenhoCiclos;
