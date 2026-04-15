import { Button } from '@/components/ui/button';
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
import { RefreshCw } from 'lucide-react';
import { useDeleteTeamMember } from '@/hooks/useTeamMemberMutations';
import type { UserWithRoles } from '@/hooks/useUsersWithRoles';

export interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRoles | null;
  /** Callback executado após exclusão bem-sucedida (ex: limpar seleção). */
  onDeleted?: () => void;
}

export const DeleteUserDialog = ({
  open,
  onOpenChange,
  user,
  onDeleted,
}: DeleteUserDialogProps) => {
  const deleteUser = useDeleteTeamMember();

  const handleDelete = async () => {
    if (!user) return;
    try {
      await deleteUser.mutateAsync(user.id);
      onOpenChange(false);
      onDeleted?.();
    } catch {
      /* toast já emitido pelo hook */
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white border-slate-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-slate-900">Excluir Usuário</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-500">
            Tem certeza que deseja excluir o usuário{' '}
            <strong className="text-slate-700">
              {user?.first_name} {user?.last_name}
            </strong>
            ? Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-200 text-slate-600">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteUser.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Usuário'
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
