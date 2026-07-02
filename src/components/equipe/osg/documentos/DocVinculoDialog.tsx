import { useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { toast } from '@/hooks/use-toast';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import {
  useAtualizarDocumento,
  type AtualizarDocumentoPatch,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import type { EntidadeOpcao } from './DocUploadDialog';

// Vínculo codificado no value do <select> ("sem" | "pessoa:<id>" | …), igual ao upload.
const docToValue = (d: DocumentoArquivoRow | null): string => {
  if (d?.pessoa_id) return `pessoa:${d.pessoa_id}`;
  if (d?.matricula_id) return `matricula:${d.matricula_id}`;
  if (d?.bem_id) return `bem:${d.bem_id}`;
  return 'sem';
};
// Monta o patch zerando os outros vínculos (polimórfico e mutuamente exclusivo).
const valueToPatch = (val: string): AtualizarDocumentoPatch => {
  const [kind, id] = val.split(':');
  return {
    pessoa_id: kind === 'pessoa' ? id : null,
    matricula_id: kind === 'matricula' ? id : null,
    bem_id: kind === 'bem' ? id : null,
  };
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: DocumentoArquivoRow | null;
  clienteId: string;
  pessoas: EntidadeOpcao[];
  bens: EntidadeOpcao[];
  matriculas: EntidadeOpcao[];
}

export function DocVinculoDialog({ open, onOpenChange, doc, clienteId, pessoas, bens, matriculas }: Props) {
  const [alvo, setAlvo] = useState<string>('sem');
  const atualizar = useAtualizarDocumento(clienteId);

  // Ao abrir, começa do vínculo atual do documento.
  useEffect(() => {
    if (open) setAlvo(docToValue(doc));
  }, [open, doc]);

  const salvar = () => {
    if (!doc) return;
    // Mesma regra do upload: georreferenciamento exige matrícula.
    if (doc.categoria === 'georreferenciamento' && !alvo.startsWith('matricula:')) {
      toast({
        title: 'Vincule a uma matrícula',
        description: 'Documentos de georreferenciamento precisam estar vinculados a uma matrícula.',
        variant: 'destructive',
      });
      return;
    }
    atualizar.mutate(
      { id: doc.id, patch: valueToPatch(alvo) },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const selectCls = `${fieldCls} w-full px-3`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular documento</DialogTitle>
          <DialogDescription>
            Escolha a entidade à qual <span className="font-medium">{doc?.nome_original}</span> pertence.
            Deixe "Sem vínculo" se ainda não souber.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <label className={labelCls}>Vincular a</label>
          <select className={selectCls} value={alvo} onChange={(e) => setAlvo(e.target.value)}>
            <option value="sem">Sem vínculo — apenas o cliente</option>
            {pessoas.length > 0 && (
              <optgroup label="Pessoas">
                {pessoas.map((p) => <option key={p.id} value={`pessoa:${p.id}`}>{p.label}</option>)}
              </optgroup>
            )}
            {bens.length > 0 && (
              <optgroup label="Bens">
                {bens.map((b) => <option key={b.id} value={`bem:${b.id}`}>{b.label}</option>)}
              </optgroup>
            )}
            {matriculas.length > 0 && (
              <optgroup label="Matrículas">
                {matriculas.map((m) => <option key={m.id} value={`matricula:${m.id}`}>{m.label}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={atualizar.isPending}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={atualizar.isPending}>
            {atualizar.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            Salvar vínculo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
