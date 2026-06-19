import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useGerarDemandas, type DemandaGerada } from '@/hooks/useGerarDemandas';
import { useCriarDemandasBacklog } from '@/hooks/useCriarDemandasBacklog';

const NONE = '__none__';

interface Project { id: string; name: string; }
interface Process { id: string; name: string; project_id?: string | null; }

interface GerarDemandasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  processes: Process[];
  projectProcesses?: { process_id: string; project_id: string }[];
  onSaved: () => void;
}

interface DemandaEditavel extends DemandaGerada {
  _selected: boolean;
}

export function GerarDemandasDialog({
  open,
  onOpenChange,
  projects,
  processes,
  projectProcesses = [],
  onSaved,
}: GerarDemandasDialogProps) {
  const { gerar, isLoading } = useGerarDemandas();
  const { salvar, isSaving } = useCriarDemandasBacklog();

  const [objetivo, setObjetivo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [processId, setProcessId] = useState('');
  const [capacidade, setCapacidade] = useState('');
  const [contextoExtra, setContextoExtra] = useState('');
  const [itens, setItens] = useState<DemandaEditavel[] | null>(null);

  const processosFiltrados = useMemo(() => {
    if (!projectId) return processes;
    return processes.filter((p) =>
      projectProcesses.some((pp) => pp.process_id === p.id && pp.project_id === projectId)
    );
  }, [processes, projectProcesses, projectId]);

  const resetTudo = () => {
    setObjetivo('');
    setProjectId('');
    setProcessId('');
    setCapacidade('');
    setContextoExtra('');
    setItens(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) resetTudo();
    onOpenChange(next);
  };

  const handleGerar = async () => {
    const geradas = await gerar({
      objetivo,
      project_id: projectId || null,
      process_id: processId || null,
      capacidade_horas: capacidade ? parseFloat(capacidade) : null,
      contexto_extra: contextoExtra || null,
    });
    if (geradas.length > 0) {
      setItens(geradas.map((d) => ({ ...d, _selected: true })));
    }
  };

  const updateItem = (index: number, patch: Partial<DemandaEditavel>) => {
    setItens((prev) => prev?.map((it, i) => (i === index ? { ...it, ...patch } : it)) ?? null);
  };

  const selecionados = itens?.filter((it) => it._selected) ?? [];
  const totalHoras = selecionados.reduce((s, it) => s + (Number(it.estimated_hours) || 0), 0);
  const capacidadeNum = capacidade ? parseFloat(capacidade) : null;
  const excedeCapacidade = capacidadeNum != null && totalHoras > capacidadeNum;

  const handleSalvar = async () => {
    const ok = await salvar(
      selecionados.map((it) => ({
        title: it.title,
        description: it.description,
        estimated_hours: Number(it.estimated_hours) || 0,
        priority: it.priority,
        justificativa: it.justificativa,
        project_id: projectId || null,
      }))
    );
    if (ok) {
      resetTudo();
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Demandas com IA
          </DialogTitle>
          <DialogDescription>
            {itens
              ? 'Revise, edite e selecione as demandas antes de adicionar ao backlog.'
              : 'Descreva o objetivo da sprint e a IA decompõe em demandas estimadas.'}
          </DialogDescription>
        </DialogHeader>

        {!itens ? (
          // ---- FASE 1: BRIEFING ----
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo da sprint *</Label>
              <Textarea
                id="objetivo"
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                placeholder="Ex: Automatizar a apuração de ICMS do cliente X, reduzindo o tempo manual e os erros de digitação. Entregar relatório validado pela equipe fiscal."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Projeto (opcional)</Label>
                <Select
                  value={projectId || NONE}
                  onValueChange={(v) => {
                    setProjectId(v === NONE ? '' : v);
                    setProcessId('');
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar projeto" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Processo (opcional)</Label>
                <Select value={processId || NONE} onValueChange={(v) => setProcessId(v === NONE ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar processo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhum</SelectItem>
                    {processosFiltrados.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacidade">Capacidade do período (h, opcional)</Label>
                <Input
                  id="capacidade"
                  type="number"
                  min="0"
                  step="1"
                  value={capacidade}
                  onChange={(e) => setCapacidade(e.target.value)}
                  placeholder="Ex: 80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contexto">Contexto adicional (opcional)</Label>
              <Textarea
                id="contexto"
                value={contextoExtra}
                onChange={(e) => setContextoExtra(e.target.value)}
                placeholder="Restrições, dependências, prazos críticos, pessoas-chave..."
                rows={2}
              />
            </div>
          </div>
        ) : (
          // ---- FASE 2: PREVIEW EDITÁVEL ----
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selecionados.length} de {itens.length} selecionadas
              </span>
              <span className={excedeCapacidade ? 'text-red-600 font-medium flex items-center gap-1' : 'text-muted-foreground'}>
                {excedeCapacidade && <AlertTriangle className="h-4 w-4" />}
                Total: {totalHoras.toFixed(1)}h
                {capacidadeNum != null && ` / ${capacidadeNum}h de capacidade`}
              </span>
            </div>

            <ScrollArea className="h-[420px] pr-3">
              <div className="space-y-2">
                {itens.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 ${item._selected ? 'border-primary/30 bg-primary/5' : 'border-gray-200 opacity-60'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={item._selected}
                        onCheckedChange={(c) => updateItem(index, { _selected: !!c })}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(index, { title: e.target.value })}
                          className="font-medium"
                        />
                        {item.description && (
                          <p className="text-sm text-gray-500">{item.description}</p>
                        )}
                        {item.justificativa && (
                          <p className="text-xs text-gray-400 italic">💡 {item.justificativa}</p>
                        )}
                        {item.suggested_assignee_name && (
                          <Badge variant="outline" className="text-xs">
                            Sugerido: {item.suggested_assignee_name}
                          </Badge>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-center gap-1.5">
                            <Label className="text-xs text-gray-400">Horas</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.estimated_hours}
                              onChange={(e) => updateItem(index, { estimated_hours: parseFloat(e.target.value) || 0 })}
                              className="h-8 w-20"
                            />
                          </div>
                          <Select
                            value={item.priority}
                            onValueChange={(v) => updateItem(index, { priority: v as DemandaGerada['priority'] })}
                          >
                            <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Baixa</SelectItem>
                              <SelectItem value="medium">Média</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          {!itens ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
              <Button onClick={handleGerar} disabled={isLoading || !objetivo.trim()}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Gerar Demandas</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setItens(null)} disabled={isSaving}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Button onClick={handleSalvar} disabled={isSaving || selecionados.length === 0}>
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  `Adicionar ${selecionados.length} ao backlog`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
