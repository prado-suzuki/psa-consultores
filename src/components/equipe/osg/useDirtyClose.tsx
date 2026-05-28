import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Guard de "descartar alterações?" para os modais OSG. O modal calcula `isDirty`
// comparando o draft atual com o snapshot inicial (capturado no useEffect de
// abertura). `requestClose` substitui `onClose` em todos os pontos de fechamento
// do usuário (Esc, clique fora, X, Cancelar). Salvar segue chamando `onClose`
// direto, pois nesse caso não há alterações pendentes.

interface UseDirtyCloseArgs {
  isDirty: boolean;
  onClose: () => void;
}

export function useDirtyClose({ isDirty, onClose }: UseDirtyCloseArgs) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const requestClose = () => {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setConfirmOpen(false);
    onClose();
  };

  return {
    requestClose,
    alertProps: {
      open: confirmOpen,
      onOpenChange: setConfirmOpen,
      onConfirm: confirmClose,
    },
  };
}

interface UnsavedChangesAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function UnsavedChangesAlert({ open, onOpenChange, onConfirm }: UnsavedChangesAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            Você fez alterações que ainda não foram salvas. Se fechar agora, elas serão perdidas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Descartar e fechar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
