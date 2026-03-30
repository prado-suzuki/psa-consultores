import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { FileText, ExternalLink, Download, Link, FileUp, Loader2 } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdownRenderer';

interface SOPViewerModalProps {
  open: boolean;
  onClose: () => void;
  processName: string;
  formattedContent: string | null;
  sopLink?: string | null;
  sopDocumentPath?: string | null;
  beforeLink?: string | null;
  beforeDocumentPath?: string | null;
  beforeContent?: string | null;
}

function SOPContentBlock({
  sopLink,
  sopDocumentPath,
  formattedContent,
}: {
  sopLink?: string | null;
  sopDocumentPath?: string | null;
  formattedContent?: string | null;
}) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  useEffect(() => {
    if (sopDocumentPath) {
      setLoadingUrl(true);
      supabase.storage
        .from('sop-documents')
        .createSignedUrl(sopDocumentPath, 3600)
        .then(({ data, error }) => {
          if (!error && data) setDownloadUrl(data.signedUrl);
          setLoadingUrl(false);
        });
    } else {
      setDownloadUrl(null);
    }
  }, [sopDocumentPath]);

  const getFileName = (path: string) => path.split('/').pop() || path;
  const hasAnything = sopLink || sopDocumentPath || formattedContent;

  if (!hasAnything) {
    return (
      <p className="text-sm italic text-muted-foreground text-center py-6">
        Nenhuma documentação registrada.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sopLink && (
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <Link className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Link externo</p>
          </div>
          <p className="text-xs text-muted-foreground truncate mb-2">{sopLink}</p>
          <Button size="sm" variant="outline" onClick={() => window.open(sopLink, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Abrir
          </Button>
        </div>
      )}

      {sopDocumentPath && (
        <div className="bg-muted/30 rounded-lg p-4 border">
          <div className="flex items-center gap-2 mb-2">
            <FileUp className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Documento</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{getFileName(sopDocumentPath)}</p>
          {loadingUrl ? (
            <Button size="sm" disabled>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Carregando...
            </Button>
          ) : downloadUrl ? (
            <Button size="sm" variant="outline" onClick={() => window.open(downloadUrl, '_blank')}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Baixar
            </Button>
          ) : (
            <Button size="sm" disabled variant="outline">Não disponível</Button>
          )}
        </div>
      )}

      {formattedContent && (
        <div className="prose prose-sm max-w-none bg-muted/30 rounded-lg p-4 border">
          {renderMarkdown(formattedContent)}
        </div>
      )}
    </div>
  );
}

export function SOPViewerModal({
  open,
  onClose,
  processName,
  formattedContent,
  sopLink,
  sopDocumentPath,
  beforeLink,
  beforeDocumentPath,
  beforeContent,
}: SOPViewerModalProps) {
  const hasBefore = beforeLink || beforeDocumentPath || beforeContent;
  const hasAfter = sopLink || sopDocumentPath || formattedContent;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            SOP Mapeado
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{processName}</p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {!hasBefore && !hasAfter ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum SOP documentado</p>
              <p className="text-sm">Use o botão "Configurar SOP" para adicionar documentação.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-muted-foreground">📋 Como era (Antes)</h3>
                <SOPContentBlock
                  sopLink={beforeLink}
                  sopDocumentPath={beforeDocumentPath}
                  formattedContent={beforeContent}
                />
              </div>
              <div className="space-y-2 min-w-0 overflow-hidden">
                <h3 className="text-sm font-semibold text-muted-foreground">✅ Como ficou (Depois)</h3>
                <SOPContentBlock
                  sopLink={sopLink}
                  sopDocumentPath={sopDocumentPath}
                  formattedContent={formattedContent}
                />
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
