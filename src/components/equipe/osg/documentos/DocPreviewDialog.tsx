import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { isImagem } from './docMeta';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentoArquivoRow | null;
  /** Signed URL já resolvida; null enquanto carrega. */
  url: string | null;
}

export function DocPreviewDialog({ open, onOpenChange, doc, url }: Props) {
  const img = doc ? isImagem(doc.nome_original, doc.mime) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{doc?.nome_original}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-[60vh] items-center justify-center overflow-auto rounded-md border border-osg-100 bg-osg-50/30">
          {!url ? (
            <Loader2 className="h-6 w-6 animate-spin text-osg-moss" />
          ) : img ? (
            <img
              src={url}
              alt={doc?.nome_original ?? 'Documento'}
              className="max-h-[70vh] max-w-full object-contain"
            />
          ) : (
            <iframe
              src={url}
              title={doc?.nome_original ?? 'Documento'}
              className="h-[70vh] w-full rounded-md"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
