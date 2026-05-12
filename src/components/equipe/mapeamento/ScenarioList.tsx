import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GitCompare, ArrowRight, Lock, Trash2, CheckCircle2, Archive, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import type { MappingProcess } from '@/hooks/useProcessMapping';
import { useProcessScenarios, type ProcessScenario, type ScenarioKind, type ScenarioStatus } from '@/hooks/useProcessScenarios';
import { ScenarioComparator } from './ScenarioComparator';

interface ScenarioListProps {
  processes: MappingProcess[];
  onCreateClick: (processId?: string) => void;
}

const KIND_LABEL: Record<ScenarioKind, string> = {
  scale: 'Escala',
  efficiency: 'Eficiência',
  investment: 'Investimento',
};

const KIND_COLOR: Record<ScenarioKind, string> = {
  scale: 'bg-blue-100 text-blue-700 border-blue-200',
  efficiency: 'bg-amber-100 text-amber-700 border-amber-200',
  investment: 'bg-teal-100 text-teal-700 border-teal-200',
};

const STATUS_LABEL: Record<ScenarioStatus, string> = {
  draft: 'Rascunho',
  analyzing: 'Em análise',
  approved: 'Aprovado',
  promoted: 'Promovido a projeto',
  archived: 'Arquivado',
};

const STATUS_COLOR: Record<ScenarioStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  analyzing: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  promoted: 'bg-violet-100 text-violet-700',
  archived: 'bg-slate-100 text-slate-500',
};

export function ScenarioList({ processes, onCreateClick }: ScenarioListProps) {
  const navigate = useNavigate();
  const [selectedProcessId, setSelectedProcessId] = useState<string>(processes[0]?.id ?? '');
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [comparatorOpen, setComparatorOpen] = useState(false);
  const [promoteFor, setPromoteFor] = useState<ProcessScenario | null>(null);
  const [projectName, setProjectName] = useState('');
  const [promoting, setPromoting] = useState(false);

  const { scenarios, loading, updateStatus, remove, promoteToProject, refresh } = useProcessScenarios(selectedProcessId);

  const selectedProcess = useMemo(
    () => processes.find(p => p.id === selectedProcessId) ?? null,
    [processes, selectedProcessId]
  );

  const compareList = useMemo(
    () => scenarios.filter(s => selectedForCompare.has(s.id)),
    [scenarios, selectedForCompare]
  );

  const toggleCompare = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) {
          toast({ title: 'Máximo 3 cenários', description: 'Remova um para adicionar outro.', variant: 'destructive' });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handlePromote = async () => {
    if (!promoteFor || !projectName.trim()) return;
    setPromoting(true);
    try {
      await promoteToProject(promoteFor, projectName.trim());
      toast({ title: 'Promovido!', description: `Projeto "${projectName}" criado e linkado ao processo.` });
      setPromoteFor(null);
      setProjectName('');
    } catch (e: any) {
      toast({ title: 'Erro ao promover', description: e.message, variant: 'destructive' });
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com filtro de processo */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[280px]">
            <Label className="text-xs">Processo</Label>
            <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um processo..." />
              </SelectTrigger>
              <SelectContent>
                {processes.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.code} · ` : ''}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 self-end">
            <Button
              variant="outline"
              size="sm"
              disabled={compareList.length < 2}
              onClick={() => setComparatorOpen(true)}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Comparar ({compareList.length})
            </Button>
            <Button size="sm" onClick={() => onCreateClick(selectedProcessId || undefined)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo cenário
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {!selectedProcessId ? (
        <Card className="p-8 text-center text-muted-foreground">
          Selecione um processo para ver seus cenários.
        </Card>
      ) : loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>
      ) : scenarios.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-3">
            Nenhum cenário criado ainda para {selectedProcess?.name}.
          </p>
          <Button size="sm" onClick={() => onCreateClick(selectedProcessId)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar primeiro cenário
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {scenarios.map(s => {
            const isSelected = selectedForCompare.has(s.id);
            const roi = s.computed_metrics?.roi_percentage ?? null;
            const savings = s.computed_metrics?.cost_saved_monthly ?? null;
            return (
              <Card
                key={s.id}
                className={`transition-all cursor-pointer ${isSelected ? 'ring-2 ring-teal-500' : 'hover:border-slate-300'}`}
                onClick={() => toggleCompare(s.id)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 truncate">{s.name}</h4>
                        {s.is_locked && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger><Lock className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent>Parâmetros travados</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      {s.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={KIND_COLOR[s.scenario_kind]}>
                      {KIND_LABEL[s.scenario_kind]}
                    </Badge>
                    <Badge variant="outline" className={STATUS_COLOR[s.status]}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {s.unit_basis === 'per_unit' ? 'por unidade' : s.unit_basis === 'per_year' ? 'anual' : 'mensal'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">ROI</p>
                      <p className="font-semibold text-teal-700">
                        {roi !== null ? `${roi.toFixed(0)}%` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Economia/mês</p>
                      <p className="font-semibold text-slate-900">
                        {savings !== null ? `R$ ${savings.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    {s.project_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-violet-700 hover:text-violet-800 hover:bg-violet-50"
                        onClick={() => navigate(`/equipe/projetos?id=${s.project_id}`)}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Ver projeto
                      </Button>
                    )}
                    {s.status !== 'promoted' && s.status !== 'archived' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => { setPromoteFor(s); setProjectName(s.name); }}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Promover
                      </Button>
                    )}
                    {s.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => updateStatus(s.id, 'approved')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                    )}
                    {s.status !== 'archived' && s.status !== 'promoted' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => updateStatus(s.id, 'archived')}
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        Arquivar
                      </Button>
                    )}
                    <div className="flex-1" />
                    {s.status !== 'promoted' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir cenário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O cenário "{s.name}" será permanentemente removido.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(s.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comparador */}
      <ScenarioComparator
        open={comparatorOpen}
        onClose={() => setComparatorOpen(false)}
        scenarios={compareList}
      />

      {/* Modal Promover a Projeto */}
      <Dialog open={!!promoteFor} onOpenChange={(v) => { if (!v) { setPromoteFor(null); setProjectName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover cenário a projeto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Será criado um projeto novo vinculado ao processo <strong>{selectedProcess?.name}</strong>.
              O cenário ficará marcado como "promovido" e seus parâmetros congelados.
            </p>
            <div className="space-y-1">
              <Label>Nome do projeto</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Nome do projeto"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPromoteFor(null); setProjectName(''); }}>Cancelar</Button>
            <Button onClick={handlePromote} disabled={promoting || !projectName.trim()}>
              {promoting ? 'Criando...' : 'Criar projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
