import { useEffect, useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { useAtualizarDocumento, type DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentoArquivoRow | null;
  clienteId: string;
}

export function DocRenomearDialog({ open, onOpenChange, doc, clienteId }: Props) {
  const [nome, setNome] = useState('');
  const atualizar = useAtualizarDocumento(clienteId);

  useEffect(() => {
    if (open) setNome(doc?.nome_original ?? '');
  }, [open, doc]);

  const salvar = () => {
    if (!doc) return;
    const nomeLimpo = nome.trim();
    // Sem mudança real: só fecha.
    if (!nomeLimpo || nomeLimpo === doc.nome_original) {
      onOpenChange(false);
      return;
    }
    atualizar.mutate(
      { id: doc.id, patch: { nome_original: nomeLimpo } },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const inputCls = `${fieldCls} w-full px-3`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renomear documento</DialogTitle>
          <DialogDescription>
            Altera apenas o <span className="font-medium">nome exibido</span> na ferramenta — o
            arquivo no armazenamento não é alterado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <label className={labelCls}>Nome exibido</label>
          <input
            className={inputCls}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salvar();
            }}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={atualizar.isPending}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={atualizar.isPending || !nome.trim()}>
            {atualizar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="mr-2 h-4 w-4" />
            )}
            Salvar nome
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
