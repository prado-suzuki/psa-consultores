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

export interface DialogoRemoverDocumentoProps {
  /** Nome do documento a remover; `null` mantém o diálogo fechado. */
  documento: string | null;
  /** Item do catálogo volta pelos opcionais; item criado à mão, por um novo com o mesmo nome. */
  doCatalogo: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}

export function DialogoRemoverDocumento({
  documento, doCatalogo, onCancelar, onConfirmar,
}: DialogoRemoverDocumentoProps) {
  return (
    <AlertDialog open={documento !== null} onOpenChange={(aberto) => { if (!aberto) onCancelar(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover “{documento}” desta solicitação?</AlertDialogTitle>
          <AlertDialogDescription>
            O cliente deixa de ver este documento na lista do portal.{' '}
            {doCatalogo
              ? 'Para pedi-lo de novo, use Incluir nos opcionais do grupo.'
              : 'Para pedi-lo de novo, adicione um documento com o mesmo nome.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>Remover desta solicitação</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
