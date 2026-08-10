import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SprintDetalhesDeliverable } from '@/hooks/useDomainEquipeSprintDetalhes';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

interface RetrospectiveReportDialogProps {
  deliverable: SprintDetalhesDeliverable;
  controller: EquipeSprintDetalhesController;
  iconClassName?: string;
  showLabel?: boolean;
}

export function RetrospectiveReportDialog({
  deliverable,
  controller: c,
  iconClassName = 'h-4 w-4',
  showLabel = false,
}: RetrospectiveReportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // Coluna gerada no banco: o markdown em si não é lido pela tela (e o diálogo
  // nem o exibe), então aqui só interessa se existe.
  const hasReport = Boolean(deliverable.tem_retrospectiva);

  const close = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setDraft('');
  };

  const readMarkdownFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setDraft(await file.text());
  };

  const save = async (report: string | null) => {
    setSaving(true);
    try {
      await c.saveRetrospectiveReport(deliverable, report);
      close(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title={hasReport ? 'Retrospectiva anexada' : 'Anexar retrospectiva markdown'}
        >
          <FileText className={`${iconClassName} ${hasReport ? 'text-primary' : ''}`} />
          {showLabel && <span>{hasReport ? 'Retrospectiva anexada' : 'Anexar retrospectiva'}</span>}
          {hasReport && <span className="sr-only">Retrospectiva anexada</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Retrospectiva da tarefa</DialogTitle>
          <DialogDescription>
            Cole o markdown ou selecione um arquivo .md. O conteúdo fica salvo como texto e não é
            exibido na tarefa depois de anexado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deliverable.title}</span>
            {hasReport && <Badge variant="outline">Retrospectiva anexada</Badge>}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            className="hidden"
            onChange={readMarkdownFile}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Selecionar markdown
          </Button>

          <div className="space-y-2">
            <Label htmlFor={`retrospective-${deliverable.id}`}>Texto markdown</Label>
            <Textarea
              id={`retrospective-${deliverable.id}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={10}
              placeholder={
                hasReport
                  ? 'Cole um novo texto para substituir a retrospectiva anexada.'
                  : 'Cole aqui a retrospectiva da tarefa em markdown.'
              }
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {hasReport && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => save(null)}
              >
                Remover retrospectiva
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !draft.trim()}
              onClick={() => save(draft)}
            >
              {saving ? 'Salvando...' : hasReport ? 'Substituir' : 'Anexar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
