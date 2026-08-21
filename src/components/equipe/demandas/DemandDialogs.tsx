import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Repeat, Trash2 } from 'lucide-react';
import type { EquipeDemanda, EquipeDemandaDraft } from '@/lib/equipeDemandas';

export interface DemandTeamMember {
  id: string;
  first_name: string;
  last_name: string;
}

interface CreateDemandDialogProps {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  draft: EquipeDemandaDraft;
  setDraft: Dispatch<SetStateAction<EquipeDemandaDraft>>;
  teamMembers: DemandTeamMember[];
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
}

export const CreateDemandDialog = ({
  open,
  onOpenChange,
  draft,
  setDraft,
  teamMembers,
  submitting,
  onSubmit,
}: CreateDemandDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogTrigger asChild>
      <Button className="bg-primary hover:bg-primary/90">
        <Plus className="h-4 w-4 mr-2" />
        Nova Demanda
      </Button>
    </DialogTrigger>
    <DialogContent className="border-gray-200 max-w-lg">
      <DialogHeader>
        <DialogTitle className="text-gray-900">Criar Nova Demanda</DialogTitle>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-gray-700">
            Título *
          </Label>
          <Input
            id="title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="text-gray-900"
            placeholder="Ex: Relatório Trimestral"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-gray-700">
            Descrição
          </Label>
          <Textarea
            id="description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="text-gray-900"
            placeholder="Descreva a demanda..."
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-gray-500" />
            <Label className="text-gray-700 font-normal">Demanda Recorrente</Label>
          </div>
          <Switch
            checked={draft.is_recurring}
            onCheckedChange={(checked) => setDraft({ ...draft, is_recurring: checked })}
          />
        </div>

        {draft.is_recurring ? (
          <div className="space-y-2">
            <Label className="text-gray-700">Frequência *</Label>
            <Select
              value={draft.frequency}
              onValueChange={(value) => setDraft({ ...draft, frequency: value })}
            >
              <SelectTrigger className="text-gray-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-200">
                <SelectItem value="daily">Diária</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Data Início</Label>
              <Input
                type="date"
                value={draft.start_date}
                onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                className="text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Data Fim *</Label>
              <Input
                type="date"
                value={draft.due_date}
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                className="text-gray-900"
                required={!draft.is_recurring}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-700">Responsável</Label>
            <Select
              value={draft.assigned_to}
              onValueChange={(value) => setDraft({ ...draft, assigned_to: value })}
            >
              <SelectTrigger className="text-gray-900">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="border-gray-200">
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_hours" className="text-gray-700">
              Horas Estimadas
            </Label>
            <Input
              id="estimated_hours"
              type="number"
              step="0.5"
              min="0"
              value={draft.estimated_hours}
              onChange={(e) => setDraft({ ...draft, estimated_hours: e.target.value })}
              className="text-gray-900"
              placeholder="Ex: 8"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90"
          disabled={submitting}
        >
          {submitting ? 'Criando...' : 'Criar Demanda'}
        </Button>
      </form>
    </DialogContent>
  </Dialog>
);

interface EditDemandDialogProps {
  selectedDemand: EquipeDemanda | null;
  editMode: boolean;
  draft: EquipeDemandaDraft;
  setDraft: Dispatch<SetStateAction<EquipeDemandaDraft>>;
  teamMembers: DemandTeamMember[];
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export const EditDemandDialog = ({
  selectedDemand,
  editMode,
  draft,
  setDraft,
  teamMembers,
  onClose,
  onUpdate,
  onDelete,
}: EditDemandDialogProps) => (
  <Dialog open={!!selectedDemand && editMode} onOpenChange={onClose}>
    <DialogContent className="border-gray-200 max-w-lg">
      {selectedDemand && (
        <>
          <DialogHeader>
            <DialogTitle className="text-gray-900">Editar Demanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Título *</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="text-gray-900"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-700">Descrição</Label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="text-gray-900"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-gray-500" />
                <Label className="text-gray-700 font-normal">Demanda Recorrente</Label>
              </div>
              <Switch
                checked={draft.is_recurring}
                onCheckedChange={(checked) => setDraft({ ...draft, is_recurring: checked })}
              />
            </div>

            {draft.is_recurring ? (
              <div className="space-y-2">
                <Label className="text-gray-700">Frequência</Label>
                <Select
                  value={draft.frequency}
                  onValueChange={(value) => setDraft({ ...draft, frequency: value })}
                >
                  <SelectTrigger className="text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-200">
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Data Início</Label>
                  <Input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Data Fim</Label>
                  <Input
                    type="date"
                    value={draft.due_date}
                    onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                    className="text-gray-900"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700">Responsável</Label>
                <Select
                  value={draft.assigned_to}
                  onValueChange={(value) => setDraft({ ...draft, assigned_to: value })}
                >
                  <SelectTrigger className="text-gray-900">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-200">
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Horas Estimadas</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={draft.estimated_hours}
                  onChange={(e) => setDraft({ ...draft, estimated_hours: e.target.value })}
                  className="text-gray-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={onUpdate} className="flex-1 bg-primary hover:bg-primary/90">
                Salvar Alterações
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir demanda?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Todas as subdemandas também serão excluídas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);
