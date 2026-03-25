import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Link, Loader2 } from 'lucide-react';
import { useCreateProcedimento, useUploadProcedimentoFile } from '@/hooks/useProcedimentos';

const PROCESSOS = [
  'EFD', 'XMLs', 'PERDCOMP', 'Selic', 'IBS/CBS',
  'Balancetes', 'PIS/COFINS', 'Cruzamento de Dados', 'Correções SPED',
];

interface AddProcedimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProcedimentoModal({ open, onOpenChange }: AddProcedimentoModalProps) {
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedProcessos, setSelectedProcessos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateProcedimento();
  const uploadMutation = useUploadProcedimentoFile();

  const isValid = mode === 'link'
    ? url.trim().length > 0 && /^https?:\/\/.+/.test(url.trim())
    : file !== null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'link') {
        await createMutation.mutateAsync({
          source_type: 'link',
          source_url: url.trim(),
          processos_associados: selectedProcessos,
        });
      } else if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        const sourceType = ext === 'pdf' ? 'pdf' : 'docx';
        const path = await uploadMutation.mutateAsync(file);
        await createMutation.mutateAsync({
          source_type: sourceType as 'pdf' | 'docx',
          arquivo_path: path,
          processos_associados: selectedProcessos,
        });
      }
      resetAndClose();
    } catch {
      // errors handled in hooks
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setUrl('');
    setFile(null);
    setSelectedProcessos([]);
    setMode('link');
    onOpenChange(false);
  };

  const toggleProcesso = (p: string) => {
    setSelectedProcessos((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar procedimento</DialogTitle>
        </DialogHeader>

        {/* Toggle */}
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'link' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
            }`}
            onClick={() => setMode('link')}
          >
            <Link className="h-4 w-4 inline mr-1.5" />
            Link externo
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === 'upload' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
            }`}
            onClick={() => setMode('upload')}
          >
            <Upload className="h-4 w-4 inline mr-1.5" />
            Upload de arquivo
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 mt-2">
          {mode === 'link' ? (
            <div>
              <Label>URL do documento</Label>
              <Input
                placeholder="Cole o link do Google Docs, Notion, Confluence..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <Label>Arquivo (PDF ou DOCX, máx. 10MB)</Label>
              <div
                className="mt-1 border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-teal-400 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <p className="text-sm text-slate-700 font-medium">{file.name}</p>
                ) : (
                  <p className="text-sm text-slate-400">Clique ou arraste um arquivo PDF/DOCX</p>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 10 * 1024 * 1024) setFile(f);
                }}
              />
            </div>
          )}

          {/* Processos */}
          <div>
            <Label className="text-slate-600">Processos sugeridos (opcional)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {PROCESSOS.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedProcessos.includes(p)}
                    onCheckedChange={() => toggleProcesso(p)}
                  />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!isValid || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Analisar com IA
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
