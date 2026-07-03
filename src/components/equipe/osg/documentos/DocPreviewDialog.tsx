import { useEffect, useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { toast } from '@/hooks/use-toast';
import { labelCls } from '@/components/equipe/osg/formKit';
import { isImagem } from './docMeta';
import { VinculoSelect } from './VinculoSelect';
import type { EntidadeOpcao } from './DocUploadDialog';
import {
  useAtualizarDocumento,
  type AtualizarDocumentoPatch,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';

// Vínculo codificado no value ("sem" | "pessoa:<id>" | …), igual aos outros pontos.
const docToValue = (d: DocumentoArquivoRow | null): string => {
  if (d?.pessoa_id) return `pessoa:${d.pessoa_id}`;
  if (d?.matricula_id) return `matricula:${d.matricula_id}`;
  if (d?.bem_id) return `bem:${d.bem_id}`;
  return 'sem';
};
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
  /** Signed URL já resolvida; null enquanto carrega. */
  url: string | null;
  clienteId: string;
  pessoas: EntidadeOpcao[];
  bens: EntidadeOpcao[];
  matriculas: EntidadeOpcao[];
}

export function DocPreviewDialog({
  open, onOpenChange, doc, url, clienteId, pessoas, bens, matriculas,
}: Props) {
  const img = doc ? isImagem(doc.nome_original, doc.mime) : false;
  const [alvo, setAlvo] = useState<string>('sem');
  const atualizar = useAtualizarDocumento(clienteId);
  const pessoasPF = pessoas.filter((p) => p.tipo !== 'PJ');
  const pessoasPJ = pessoas.filter((p) => p.tipo === 'PJ');

  // Começa do vínculo atual do documento sempre que abrir/trocar de doc.
  useEffect(() => {
    if (open) setAlvo(docToValue(doc));
  }, [open, doc]);

  const semAlteracao = alvo === docToValue(doc);

  const salvar = () => {
    if (!doc) return;
    // Mesma regra dos demais pontos: georreferenciamento exige matrícula.
    if (doc.categoria === 'georreferenciamento' && !alvo.startsWith('matricula:')) {
      toast({
        title: 'Vincule a uma matrícula',
        description: 'Documentos de georreferenciamento precisam estar vinculados a uma matrícula.',
        variant: 'destructive',
      });
      return;
    }
    atualizar.mutate({ id: doc.id, patch: valueToPatch(alvo) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{doc?.nome_original}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 md:flex-row">
          {/* Pré-visualização */}
          <div className="flex min-h-[60vh] flex-1 items-center justify-center overflow-auto rounded-md border border-osg-100 bg-osg-50/30">
            {!url ? (
              <Loader2 className="h-6 w-6 animate-spin text-osg-moss" />
            ) : img ? (
              <img
                src={url}
                alt={doc?.nome_original ?? 'Documento'}
                className="max-h-[70vh] max-w-full object-contain"
              />
            ) : (
              <iframe src={url} title={doc?.nome_original ?? 'Documento'} className="h-[70vh] w-full rounded-md" />
            )}
          </div>

          {/* Barra lateral: vincular sem sair da visualização */}
          <aside className="w-full shrink-0 space-y-3 md:w-64 md:border-l md:border-osg-100 md:pl-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Vincular a</label>
              <VinculoSelect
                value={alvo}
                onChange={setAlvo}
                pessoasPF={pessoasPF}
                pessoasPJ={pessoasPJ}
                bens={bens}
                matriculas={matriculas}
              />
            </div>
            <Button onClick={salvar} disabled={atualizar.isPending || semAlteracao} className="w-full">
              {atualizar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              Salvar vínculo
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Classifique o vínculo deste documento sem fechar a pré-visualização.
            </p>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
