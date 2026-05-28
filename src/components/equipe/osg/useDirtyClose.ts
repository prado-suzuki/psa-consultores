import { useState } from 'react';

// Guard de "descartar alterações?" para os modais OSG. O modal calcula `isDirty`
// comparando o draft atual com o snapshot inicial (capturado no useEffect de
// abertura). `requestClose` substitui `onClose` em todos os pontos de fechamento
// do usuário (Esc, clique fora, X, Cancelar). Salvar segue chamando `onClose`
// direto, pois nesse caso não há alterações pendentes.
// O componente de alerta vive em UnsavedChangesAlert.tsx.

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
