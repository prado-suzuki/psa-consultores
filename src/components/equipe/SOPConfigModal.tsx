import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link, FileUp, FileText, Loader2, X, Upload } from 'lucide-react';

interface SOPSectionData {
  link: string;
  file: File | null;
  existingDocPath: string | null;
  content: string;
}

interface SOPConfigModalProps {
  open: boolean;
  onClose: () => void;
  processId: string;
  processName: string;
  currentLink: string | null;
  currentDocumentPath: string | null;
  currentFormattedContent: string | null;
  currentBeforeLink?: string | null;
  currentBeforeDocumentPath?: string | null;
  currentBeforeContent?: string | null;
  onUpdated: () => void;
}

function SOPSectionFields({
  label,
  data,
  onChange,
  onClearDoc,
  fileInputRef,
}: {
  label: string;
  data: SOPSectionData;
  onChange: (patch: Partial<SOPSectionData>) => void;
  onClearDoc: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const getFileName = (path: string) => path.split('/').pop() || path;

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
      <h4 className="text-sm font-semibold text-foreground">{label}</h4>

      {/* Link */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <Link className="h-3.5 w-3.5" /> Link externo
        </Label>
        <Input
          type="url"
          value={data.link}
          onChange={(e) => onChange({ link: e.target.value })}
          placeholder="https://docs.google.com/..."
          className="text-sm"
        />
      </div>

      {/* Document upload */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <FileUp className="h-3.5 w-3.5" /> Documento
        </Label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange({ file });
          }}
        />
        {data.file || data.existingDocPath ? (
          <div className="flex items-center justify-between p-2 border rounded-md bg-background">
            <div className="flex items-center gap-2 min-w-0">
              <FileUp className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs truncate">
                {data.file?.name || (data.existingDocPath && getFileName(data.existingDocPath))}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClearDoc} className="shrink-0">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Selecionar arquivo</span>
          </Button>
        )}
      </div>

      {/* Text content */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs">
          <FileText className="h-3.5 w-3.5" /> Texto (Markdown)
        </Label>
        <Textarea
          value={data.content}
          onChange={(e) => onChange({ content: e.target.value })}
          placeholder="Descreva o procedimento..."
          rows={5}
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

export function SOPConfigModal({
  open,
  onClose,
  processId,
  processName,
  currentLink,
  currentDocumentPath,
  currentFormattedContent,
  currentBeforeLink,
  currentBeforeDocumentPath,
  currentBeforeContent,
  onUpdated,
}: SOPConfigModalProps) {
  const beforeFileRef = useRef<HTMLInputElement>(null);
  const afterFileRef = useRef<HTMLInputElement>(null);

  const [before, setBefore] = useState<SOPSectionData>({
    link: currentBeforeLink || '',
    file: null,
    existingDocPath: currentBeforeDocumentPath || null,
    content: currentBeforeContent || '',
  });

  const [after, setAfter] = useState<SOPSectionData>({
    link: currentLink || '',
    file: null,
    existingDocPath: currentDocumentPath || null,
    content: currentFormattedContent || '',
  });

  const [saving, setSaving] = useState(false);

  const uploadFile = async (file: File, prefix: string, oldPath: string | null) => {
    const filePath = `${processId}/${prefix}_${file.name}`;
    if (oldPath) {
      await supabase.storage.from('sop-documents').remove([oldPath]);
    }
    const { error } = await supabase.storage
      .from('sop-documents')
      .upload(filePath, file, { upsert: true });
    if (error) throw error;
    return filePath;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Resolve before document
      let beforeDocPath = before.existingDocPath;
      if (before.file) {
        beforeDocPath = await uploadFile(before.file, 'before', currentBeforeDocumentPath || null);
      }

      // Resolve after document
      let afterDocPath = after.existingDocPath;
      if (after.file) {
        afterDocPath = await uploadFile(after.file, 'after', currentDocumentPath || null);
      }

      const updates = {
        sop_before_link: before.link.trim() || null,
        sop_before_document_path: beforeDocPath,
        sop_before_content: before.content.trim() || null,
        sop_link: after.link.trim() || null,
        sop_document_path: afterDocPath,
        formatted_content: after.content.trim() || null,
      };

      const { error } = await supabase
        .from('processes')
        .update(updates)
        .eq('id', processId);

      if (error) throw error;

      toast({ title: 'SOP atualizado', description: 'Configuração salva com sucesso.' });
      onUpdated();
      onClose();
    } catch (error: any) {
      console.error('Error saving SOP config:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearDoc = (section: 'before' | 'after') => {
    if (section === 'before') {
      setBefore((prev) => ({ ...prev, file: null, existingDocPath: null }));
    } else {
      setAfter((prev) => ({ ...prev, file: null, existingDocPath: null }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Configurar SOP
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{processName}</p>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-2">
          <div className="space-y-6">
            <SOPSectionFields
              label="📋 Como era (Antes)"
              data={before}
              onChange={(patch) => setBefore((prev) => ({ ...prev, ...patch }))}
              onClearDoc={() => handleClearDoc('before')}
              fileInputRef={beforeFileRef as React.RefObject<HTMLInputElement>}
            />

            <SOPSectionFields
              label="✅ Como ficou (Depois)"
              data={after}
              onChange={(patch) => setAfter((prev) => ({ ...prev, ...patch }))}
              onClearDoc={() => handleClearDoc('after')}
              fileInputRef={afterFileRef as React.RefObject<HTMLInputElement>}
            />
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
