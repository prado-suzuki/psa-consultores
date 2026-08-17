import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmarExclusaoDialogProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  onCancelar: () => void;
  onConfirmar: () => void;
}

/** Confirmação de exclusão de produto/serviço na bancada Produtos & Serviços. */
export default function ConfirmarExclusaoDialog({
  aberto, titulo, descricao, onCancelar, onConfirmar,
}: ConfirmarExclusaoDialogProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={valor => { if (!valor) onCancelar(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          <AlertDialogDescription>{descricao}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirmar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
