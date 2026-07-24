import { useNavigate } from 'react-router-dom';
import { FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjetosLoteController } from '@/hooks/useProjetosLoteController';
import { ProjetoLoteRow } from './ProjetoLoteRow';

export function ProjetosLoteContent() {
  const navigate = useNavigate();
  const {
    state, rows, updateRow, includedCount,
    equipesOptions, teamMembers, userRoles, createBatch, handleCreate,
  } = useProjetosLoteController();

  if (!state) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <p className="text-muted-foreground">Nenhuma OS selecionada. Abra o cadastro do cliente, expanda uma OS salva e use “Criar projetos”.</p>
        <Button variant="outline" onClick={() => navigate('/equipe/tax/projetos/cadastro')}>Voltar para Projetos</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Uma linha por produto */}
      <div className="space-y-4">
        {rows.length === 0
          ? <p className="text-sm text-muted-foreground text-center py-8">Esta OS não possui produtos contratados.</p>
          : rows.map((row, index) => (
            <ProjetoLoteRow
              key={row.produtoSegmentoId}
              index={index}
              row={row}
              updateRow={updateRow}
              equipesOptions={equipesOptions}
              teamMembers={teamMembers}
              userRoles={userRoles}
            />
          ))}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="outline" onClick={() => navigate('/equipe/tax/projetos/cadastro')}>Cancelar</Button>
        <Button onClick={handleCreate} disabled={createBatch.isPending || includedCount === 0} className="gap-2">
          {createBatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
          Criar {includedCount} projeto{includedCount !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}
