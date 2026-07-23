import type { ReactNode } from 'react';
import { Edit2, Trash2, Workflow } from 'lucide-react';
import type { EquipeProcesso } from '@/lib/equipeProcessos';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProcessDetailsDialogProps {
  process: EquipeProcesso | null;
  isEditing: boolean;
  stageCount: number;
  projectCount: number;
  infoTab: ReactNode;
  stagesTab: ReactNode;
  projectsTab: ReactNode;
  onOpenChange: (open: boolean) => void;
  onStartEditing: () => void;
  onDelete: () => void;
}

export function ProcessDetailsDialog(props: ProcessDetailsDialogProps) {
  return (
    <Dialog open={!!props.process} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            {props.isEditing ? 'Editar Processo' : props.process?.name}
          </DialogTitle>
          {!props.isEditing && (
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={props.onStartEditing}>
                <Edit2 className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Processo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o processo "{props.process?.name}"? Esta ação
                      também excluirá todas as etapas e vínculos com projetos relacionados. Esta
                      ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={props.onDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </DialogHeader>
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="stages">Etapas ({props.stageCount})</TabsTrigger>
            <TabsTrigger value="projects" disabled={props.isEditing}>
              Projetos ({props.projectCount})
            </TabsTrigger>
          </TabsList>
          <ScrollArea className="h-[60vh] mt-4">
            {props.infoTab}
            {props.stagesTab}
            {props.projectsTab}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
