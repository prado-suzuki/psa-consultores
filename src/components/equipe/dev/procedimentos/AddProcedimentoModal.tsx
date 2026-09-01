import { useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Link, Loader2, Info, Library, Search, FileText, ExternalLink, Check } from 'lucide-react';
import {
  useCreateProcedimento,
  useUploadProcedimentoFile,
  useFontesExistentes,
  type FonteExistente,
} from '@/hooks/useProcedimentos';
import { toast } from 'sonner';
import { PROCEDIMENTO_PROCESSOS } from './theme';

interface AddProcedimentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Modo = 'existente' | 'link' | 'upload';

/**
 * `existente` é o primeiro modo de propósito.
 *
 * O modal antes abria em "Link externo" e oferecia só dois caminhos técnicos
 * (colar URL / subir arquivo), nenhum dos dois dizendo DE ONDE o procedimento
 * sai. Boa parte já está cadastrada como SOP de um processo mapeado — pedir
 * upload de novo cria uma segunda cópia do mesmo arquivo.
 */
export function AddProcedimentoModal({ open, onOpenChange }: AddProcedimentoModalProps) {
  const [mode, setMode] = useState<Modo>('existente');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [buscaFonte, setBuscaFonte] = useState('');
  const [fonteEscolhida, setFonteEscolhida] = useState<FonteExistente | null>(null);
  const [selectedProcessos, setSelectedProcessos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createMutation = useCreateProcedimento();
  const uploadMutation = useUploadProcedimentoFile();
  const { data: fontes = [], isLoading: carregandoFontes } = useFontesExistentes(open);

  const fontesFiltradas = useMemo(() => {
    const termo = buscaFonte.trim().toLowerCase();
    if (!termo) return fontes;
    return fontes.filter(
      (f) => f.titulo.toLowerCase().includes(termo) || f.subtitulo?.toLowerCase().includes(termo)
    );
  }, [fontes, buscaFonte]);

  const isValid =
    mode === 'existente' ? fonteEscolhida !== null && !fonteEscolhida.jaNaBiblioteca
    : mode === 'link' ? /^https?:\/\/.+/.test(url.trim())
    : file !== null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'existente' && fonteEscolhida) {
        await createMutation.mutateAsync({
          source_type: fonteEscolhida.tipo === 'link' ? 'link' : fonteEscolhida.extensao!,
          source_url: fonteEscolhida.source_url ?? undefined,
          arquivo_path: fonteEscolhida.arquivo_path ?? undefined,
          processos_associados: selectedProcessos,
        });
      } else if (mode === 'link') {
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
    setBuscaFonte('');
    setFonteEscolhida(null);
    setSelectedProcessos([]);
    setMode('existente');
    onOpenChange(false);
  };

  const toggleProcesso = (p: string) => {
    setSelectedProcessos((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const botaoModo = (valor: Modo, icone: React.ReactNode, rotulo: string) => (
    <button
      className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
        mode === valor ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
      }`}
      onClick={() => setMode(valor)}
    >
      {icone}
      {rotulo}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar procedimento</DialogTitle>
          <DialogDescription>
            A IA lê o documento e monta a ficha — título, resumo, etapas e tags. Um curador
            confere antes de publicar para o time.
          </DialogDescription>
        </DialogHeader>

        {/* Toggle */}
        <div className="flex bg-muted rounded-lg p-1 gap-1">
          {botaoModo('existente', <Library className="h-4 w-4 inline mr-1.5" />, 'Já cadastrado')}
          {botaoModo('link', <Link className="h-4 w-4 inline mr-1.5" />, 'Link externo')}
          {botaoModo('upload', <Upload className="h-4 w-4 inline mr-1.5" />, 'Enviar arquivo')}
        </div>

        {/* Content */}
        <div className="space-y-4 mt-2">
          {mode === 'existente' && (
            <div>
              <Label>Documentação já cadastrada no sistema</Label>
              <p className="text-xs text-slate-400 mt-0.5 mb-2">
                SOPs dos processos mapeados. Escolher daqui não cria uma segunda cópia do arquivo.
              </p>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar processo..."
                  value={buscaFonte}
                  onChange={(e) => setBuscaFonte(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {carregandoFontes ? (
                  <p className="text-sm text-slate-400 p-4 text-center">Carregando...</p>
                ) : fontesFiltradas.length === 0 ? (
                  <p className="text-sm text-slate-400 p-4 text-center">
                    {fontes.length === 0
                      ? 'Nenhum processo mapeado tem SOP em PDF, DOCX ou link.'
                      : 'Nenhum processo com esse nome.'}
                  </p>
                ) : (
                  fontesFiltradas.map((f) => {
                    const escolhido = fonteEscolhida?.chave === f.chave;
                    return (
                      <button
                        key={f.chave}
                        disabled={f.jaNaBiblioteca}
                        onClick={() => setFonteEscolhida(f)}
                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors ${
                          f.jaNaBiblioteca
                            ? 'opacity-50 cursor-not-allowed'
                            : escolhido
                              ? 'bg-primary/5'
                              : 'hover:bg-muted'
                        }`}
                      >
                        {f.tipo === 'link' ? (
                          <ExternalLink className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-slate-700 truncate">{f.titulo}</span>
                          <span className="block text-xs text-slate-400">
                            {f.jaNaBiblioteca ? 'Já está na biblioteca' : f.subtitulo}
                          </span>
                        </span>
                        {escolhido && <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mode === 'link' && (
            <div>
              <Label>URL do documento</Label>
              <Input
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {/* O leitor busca a página sem estar logado em nada. Documento
                  privado do Drive/Notion devolve a tela de login, e era ela que
                  a IA acabava resumindo. */}
              <p className="text-xs text-slate-400 mt-1.5 flex gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                O link precisa abrir sem login. Documento restrito do Drive, Notion ou
                Confluence não pode ser lido — nesse caso, anexe o arquivo.
              </p>
            </div>
          )}

          {mode === 'upload' && (
            <div>
              <Label>Arquivo (PDF ou DOCX, máx. 10MB)</Label>
              <div
                className="mt-1 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
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
                  if (!f) return;
                  if (f.size > 10 * 1024 * 1024) {
                    toast.error('Arquivo acima de 10MB. Reduza ou envie por link.');
                    return;
                  }
                  setFile(f);
                }}
              />
              <p className="text-xs text-slate-400 mt-1.5 flex gap-1.5">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-px" />
                PDF escaneado não tem texto, só imagem — a leitura vai falhar e avisar.
              </p>
            </div>
          )}

          {/* Processos */}
          <div>
            <Label className="text-slate-600">Processos sugeridos (opcional)</Label>
            <p className="text-xs text-slate-400 mt-0.5 mb-2">
              A IA sugere os dela; o que você marcar aqui entra junto.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PROCEDIMENTO_PROCESSOS.map((p) => (
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
            Enviar para leitura
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
