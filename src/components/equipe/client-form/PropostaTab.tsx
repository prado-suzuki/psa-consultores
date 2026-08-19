// Aba de Proposta Comercial do modal de cliente (ALE-8).
//
// A proposta fica anexada ao cadastro, em vez de solta em pasta ou e-mail: quem
// abre a tela do cliente a encontra aqui.
//
// SÓ ANEXO NESTA SPRINT, por decisão de 09/08/2026 — sem status e sem valor. Se
// virar cadastro adiante, nada do que está aqui se perde: a linha já é um
// documento do cliente com metadado no banco.
//
// A aba só é renderizada para administrador ou líder e só com cliente já
// existente (ver NewClientModal): sem cliente não há a que vincular o arquivo.
//
// Ela não participa do rascunho nem do "alterações não salvas" do formulário, e
// isso é de propósito: anexar grava na hora, igual à aba de Documentos dos modais
// da OSG. Por isso também não olha `isReadOnly` — documento não é campo do
// cadastro, e inventar essa trava aqui divergiria da aba irmã.
import { useMemo, useRef, useState } from 'react';
import { Download, Eye, FileUp, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import {
  ACCEPT, MAX_BYTES, extensaoValida, fileIconOf, formatBytes, isPreviavel,
} from '@/components/equipe/osg/documentos/docMeta';
import {
  useBaixarDocumento, useExcluirDocumento, usePreviewUrl, useUploaderNames,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { useAnexarProposta, usePropostasDoCliente } from '@/hooks/useDocumentoProposta';

export interface PropostaTabProps {
  /** O cliente já salvo. A aba não é montada para cadastro novo. */
  clienteId: string;
}

export default function PropostaTab({ clienteId }: PropostaTabProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

  const { data: propostas = [], isLoading } = usePropostasDoCliente(clienteId);
  const anexar = useAnexarProposta(clienteId);
  const excluir = useExcluirDocumento(clienteId);
  const baixar = useBaixarDocumento();
  const preview = usePreviewUrl();

  const uploaderIds = useMemo(
    () => propostas.map((p) => p.created_by).filter((v): v is string => !!v),
    [propostas],
  );
  const { data: uploaderNames = {} } = useUploaderNames(uploaderIds);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Zera antes de qualquer saída: sem isto, escolher o MESMO arquivo de novo
    // depois de um erro não dispara o onChange.
    e.target.value = '';
    if (!file) return;
    if (!extensaoValida(file.name)) {
      toast({
        title: 'Formato não aceito',
        // `replace` e não `replaceAll`: o `lib` deste projeto não tem replaceAll.
        description: `Aceitos: ${ACCEPT.split(',').map((e) => e.replace('.', '')).join(', ')}.`,
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50 MB.', variant: 'destructive' });
      return;
    }
    anexar.mutate(file);
  };

  /** Abre a URL assinada em aba nova, sem baixar. Só para PDF e imagem. */
  const abrir = (doc: DocumentoArquivoRow) =>
    preview.mutate(doc, { onSuccess: (url) => window.open(url, '_blank', 'noopener') });

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/50 px-4 py-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Proposta Comercial
        </h3>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={anexar.isPending}
        >
          {anexar.isPending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <FileUp className="mr-2 h-4 w-4" />}
          Anexar proposta
        </Button>
      </div>

      <p className="px-4 pt-2 text-[11px] italic text-muted-foreground">
        Documento interno: fica no cadastro e não aparece na área do cliente.
      </p>

      <div className="px-4 py-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : propostas.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            Nenhuma proposta anexada. Use "Anexar proposta" para subir o arquivo.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {propostas.map((doc) => {
              const { Icon, className } = fileIconOf(doc.nome_original, doc.mime);
              const enviadaEm = new Date(doc.created_at);
              return (
                <li key={doc.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Icon className={`h-4 w-4 shrink-0 ${className}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{doc.nome_original}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(doc.tamanho)} · enviada por{' '}
                      {(doc.created_by && uploaderNames[doc.created_by]) || '—'} em{' '}
                      {enviadaEm.toLocaleDateString('pt-BR')}{' '}
                      {enviadaEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isPreviavel(doc.nome_original, doc.mime) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrir(doc)}
                      disabled={preview.isPending}
                      title="Abrir"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => baixar.mutate(doc)} title="Baixar">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAExcluir(doc)}
                    disabled={excluir.isPending}
                    // A trava da aba é de interface (admin ou líder), mas a
                    // segurança de linha só deixa ADMIN excluir. Sem este aviso o
                    // suporte recebe "excluir não funciona" de líder não-admin.
                    title="Excluir (somente administrador)"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" sai da lista e o arquivo é apagado do storage. A
              recuperação só é possível dentro de 7 dias, e apenas administrador consegue
              excluir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aExcluir) excluir.mutate(aExcluir);
                setAExcluir(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
