import { Button } from '@/components/ui/button';

interface TaskModalFooterProps {
  isSaving: boolean;
  onCancel: () => void;
}

/**
 * Barra de ações do formulário de criação. Na edição as ações vivem no
 * cabeçalho (`TaskEditActions`), junto do título.
 */
export function TaskModalFooter({ isSaving, onCancel }: TaskModalFooterProps) {
  return (
    <div className="sticky -bottom-6 z-20 -mx-6 -mb-6 flex flex-wrap justify-end gap-3 border-t bg-background/95 px-6 py-4 backdrop-blur">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSaving}>
        Criar
      </Button>
    </div>
  );
}
