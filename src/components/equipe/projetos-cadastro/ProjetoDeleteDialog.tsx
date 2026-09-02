import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

export function ProjetoDeleteDialog() {
  const { deleteProjectId, deleteProjectTaskTotal, closeDeleteDialog, handleDelete } = useProjetosCadastro();
  // O controller só abre este diálogo quando TODAS as tarefas do projeto estão
  // em Backlog/A Fazer (elas morrem na cascata da FK). O aviso abaixo é o que
  // separa o usuário de apagar tarefas sem saber.
  const description = deleteProjectTaskTotal > 0
    ? `Este projeto tem ${deleteProjectTaskTotal} tarefa(s) em Backlog/A Fazer, que serão excluídas junto com ele. Esta ação não pode ser desfeita.`
    : 'Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.';
  return <AlertDialog open={Boolean(deleteProjectId)} onOpenChange={closeDeleteDialog}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
