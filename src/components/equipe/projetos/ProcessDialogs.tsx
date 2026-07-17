import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createEmptyProcessDraft, PROCESS_STAGES } from '@/components/equipe/projetos/constants';
import type {
  GroupedEquipe,
  Process,
  ProcessDraft,
  Project,
} from '@/components/equipe/projetos/types';

interface ProcessFormFieldsProps {
  process: ProcessDraft;
  onChange: (process: ProcessDraft) => void;
  groupedEquipes: GroupedEquipe[];
  creating?: boolean;
}

const ProcessFormFields = ({
  process,
  onChange,
  groupedEquipes,
  creating = false,
}: ProcessFormFieldsProps) => (
  <>
    <div className="space-y-2">
      <Label className="text-gray-700">Nome do Processo *</Label>
      <Input
        value={process.name}
        onChange={(event) => onChange({ ...process, name: event.target.value })}
        className="bg-white border-gray-300 text-gray-900"
        placeholder={creating ? 'Ex: Emissão de Notas Fiscais' : undefined}
        required={creating}
      />
    </div>
    <div className="space-y-2">
      <Label className="text-gray-700">Descrição</Label>
      <Textarea
        value={process.description}
        onChange={(event) => onChange({ ...process, description: event.target.value })}
        className="bg-white border-gray-300 text-gray-900"
        placeholder={creating ? 'Descreva o processo...' : undefined}
      />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-gray-700">Equipe responsável</Label>
        <Select
          value={process.equipe_id || ''}
          onValueChange={(value) => onChange({ ...process, equipe_id: value })}
        >
          <SelectTrigger className="bg-white border-gray-300 text-gray-900">
            <SelectValue placeholder="Selecione a equipe" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {groupedEquipes.map((group) => (
              <div key={group.area.id}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {group.area.name}
                </div>
                {group.equipes.map((equipe) => (
                  <SelectItem key={equipe.id} value={equipe.id}>
                    {equipe.name}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">Estágio</Label>
        <Select
          value={process.stage}
          onValueChange={(value) => onChange({ ...process, stage: value })}
        >
          <SelectTrigger className="bg-white border-gray-300 text-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            {PROCESS_STAGES.map((stage) => (
              <SelectItem key={stage.value} value={stage.value}>
                {stage.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-gray-700">Prioridade</Label>
        <Select
          value={process.priority}
          onValueChange={(value) => onChange({ ...process, priority: value })}
        >
          <SelectTrigger className="bg-white border-gray-300 text-gray-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-200">
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">Frequência</Label>
        <Input
          value={process.frequency}
          onChange={(event) => onChange({ ...process, frequency: event.target.value })}
          className="bg-white border-gray-300 text-gray-900"
          placeholder={creating ? 'Ex: Diária' : undefined}
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label className="text-gray-700">Volume/Mês</Label>
        <Input
          type="number"
          value={process.volume_month}
          onChange={(event) => onChange({ ...process, volume_month: event.target.value })}
          className="bg-white border-gray-300 text-gray-900"
          placeholder={creating ? 'Ex: 500' : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-gray-700">Impacto Financeiro</Label>
        <Input
          value={process.financial_impact}
          onChange={(event) => onChange({ ...process, financial_impact: event.target.value })}
          className="bg-white border-gray-300 text-gray-900"
          placeholder={creating ? 'Ex: Alto' : undefined}
        />
      </div>
    </div>
  </>
);

interface ProcessCreateDialogProps {
  open: boolean;
  project: Project | null;
  groupedEquipes: GroupedEquipe[];
  onOpenChange: (open: boolean) => void;
  onCreate: (process: ProcessDraft, onCreated: () => void) => Promise<void>;
}

export const ProcessCreateDialog = ({
  open,
  project,
  groupedEquipes,
  onOpenChange,
  onCreate,
}: ProcessCreateDialogProps) => {
  const [process, setProcess] = useState<ProcessDraft>(createEmptyProcessDraft);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onCreate(process, () => {
      onOpenChange(false);
      setProcess(createEmptyProcessDraft());
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-900">Novo Processo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {project && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
              Projeto: <strong className="text-gray-900">{project.name}</strong>
              {' · '}herda o cluster do projeto.
              {!project.cluster_id && (
                <span className="mt-1 block text-amber-600">
                  ⚠ Este projeto não tem cluster selecionado — o processo não aparecerá no MAPA até
                  o projeto receber um cluster.
                </span>
              )}
            </div>
          )}
          <ProcessFormFields
            process={process}
            onChange={setProcess}
            groupedEquipes={groupedEquipes}
            creating
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
            Criar Processo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ProcessEditDialogProps {
  process: Process | null;
  groupedEquipes: GroupedEquipe[];
  onClose: () => void;
  onUpdate: (process: ProcessDraft) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const ProcessEditDialog = ({
  process,
  groupedEquipes,
  onClose,
  onUpdate,
  onDelete,
}: ProcessEditDialogProps) => {
  const [editProcess, setEditProcess] = useState<ProcessDraft>(createEmptyProcessDraft);

  useEffect(() => {
    if (process) {
      setEditProcess({
        name: process.name,
        description: process.description || '',
        equipe_id: process.equipe_id || '',
        stage: process.stage,
        priority: process.priority || 'medium',
        frequency: process.frequency || '',
        volume_month: process.volume_month?.toString() || '',
        financial_impact: process.financial_impact || '',
      });
    }
  }, [process]);

  return (
    <Dialog open={!!process} onOpenChange={onClose}>
      <DialogContent className="bg-white border-gray-200">
        {process && (
          <>
            <DialogHeader>
              <DialogTitle className="text-gray-900">Editar Processo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ProcessFormFields
                process={editProcess}
                onChange={setEditProcess}
                groupedEquipes={groupedEquipes}
              />

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O processo "{process.name}" será
                        permanentemente removido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => onUpdate(editProcess)}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
