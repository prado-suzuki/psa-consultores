// Bloco de anexos de um entregável, reaproveitável por qualquer modal de tarefa.
// Traz a lista, o botão de anexar, o Ctrl+V de print e a miniatura das imagens.
// Autossuficiente: cuida das próprias consultas, quem usa só passa o id.
import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useEquipeKanbanAttachments } from '@/hooks/useDomainEquipeKanbanAttachments';
import { isImagemAnexo, nomeDoPrintColado, primeiraImagemColada } from '@/lib/anexosEntregavel';
import {
  EQUIPE_KANBAN_FILE_ACCEPT,
  formatEquipeKanbanFileSize,
  getEquipeKanbanErrorMessage,
  validateEquipeKanbanFile,
  type EquipeKanbanAttachment,
} from '@/lib/equipeKanban';

interface AnexosEntregavelProps {
  /** Sem id (tarefa ainda não salva) o bloco não aparece: o anexo precisa do vínculo. */
  deliverableId: string | undefined;
  /** Falso enquanto o modal está fechado, para o Ctrl+V não capturar fora dele. */
  ativo?: boolean;
}

export function AnexosEntregavel({ deliverableId, ativo = true }: AnexosEntregavelProps) {
  const mutations = useEquipeKanbanAttachments();
  const [anexos, setAnexos] = useState<EquipeKanbanAttachment[]>([]);
  const [miniaturas, setMiniaturas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  // Assina as URLs das imagens: o bucket é privado e sem isso a <img> não carrega.
  // Falha ao assinar não derruba a lista, só deixa o item sem miniatura.
  const aplicar = useCallback(
    async (lista: EquipeKanbanAttachment[]) => {
      setAnexos(lista);
      const imagens = lista
        .filter((item) => isImagemAnexo(item.file_type, item.file_name))
        .map((item) => item.file_path);
      if (imagens.length === 0) {
        setMiniaturas({});
        return;
      }
      try {
        setMiniaturas(await mutations.previews.mutateAsync(imagens));
      } catch (error) {
        console.error('Error signing previews:', error);
        setMiniaturas({});
      }
    },
    [mutations.previews],
  );

  useEffect(() => {
    if (!deliverableId) {
      setAnexos([]);
      setMiniaturas({});
      return;
    }
    let cancelado = false;
    void (async () => {
      try {
        const lista = await mutations.load.mutateAsync(deliverableId);
        if (!cancelado) await aplicar(lista);
      } catch (error) {
        console.error('Error loading attachments:', error);
      }
    })();
    return () => {
      cancelado = true;
    };
    // `mutations` é recriado a cada render; depender dele reentraria em laço.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliverableId]);

  const enviar = useCallback(
    async (file: File, mensagem: string) => {
      if (!deliverableId) return;
      const erro = validateEquipeKanbanFile(file);
      if (erro) {
        toast.error(erro);
        return;
      }
      setEnviando(true);
      try {
        await aplicar(await mutations.upload.mutateAsync({ deliverableId, file }));
        toast.success(mensagem);
      } catch (error) {
        console.error('Error uploading attachment:', error);
        toast.error('Erro ao enviar arquivo');
      } finally {
        setEnviando(false);
      }
    },
    [aplicar, deliverableId, mutations.upload],
  );

  // Ctrl+V em qualquer ponto do modal aberto. Colar texto segue normal: sem
  // imagem no clipboard a função sai sem fazer nada.
  useEffect(() => {
    if (!ativo || !deliverableId) return;
    const aoColar = (event: ClipboardEvent) => {
      if (enviando) return;
      const imagem = primeiraImagemColada(Array.from(event.clipboardData?.files ?? []));
      if (!imagem) return;
      event.preventDefault();
      const comNome = new File([imagem], nomeDoPrintColado(imagem, new Date()), {
        type: imagem.type,
      });
      void enviar(comNome, 'Print anexado');
    };
    document.addEventListener('paste', aoColar);
    return () => document.removeEventListener('paste', aoColar);
  }, [ativo, deliverableId, enviando, enviar]);

  const baixar = async (anexo: EquipeKanbanAttachment) => {
    try {
      const blob = await mutations.download.mutateAsync(anexo.file_path);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = anexo.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading attachment:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const remover = async (anexo: EquipeKanbanAttachment) => {
    try {
      await mutations.remove.mutateAsync(anexo);
      await aplicar(anexos.filter((item) => item.id !== anexo.id));
      toast.success('Arquivo removido');
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error(getEquipeKanbanErrorMessage(error, 'Erro ao remover arquivo'));
    }
  };

  if (!deliverableId) return null;

  return (
    <div className="shrink-0 space-y-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Paperclip className="h-4 w-4" />
          Anexos
        </Label>
        <label>
          <Button type="button" variant="outline" size="sm" disabled={enviando} asChild>
            <span>
              <Upload className="mr-2 h-4 w-4" />
              {enviando ? 'Enviando...' : 'Anexar arquivo'}
            </span>
          </Button>
          <input
            type="file"
            className="hidden"
            accept={EQUIPE_KANBAN_FILE_ACCEPT}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) await enviar(file, 'Arquivo anexado');
            }}
          />
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Tire um print e cole aqui com Ctrl+V, ou use o botão para escolher um arquivo.
      </p>

      {anexos.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">Nenhum anexo</p>
      ) : (
        <div className="space-y-2">
          {anexos.map((anexo) => {
            const miniatura = isImagemAnexo(anexo.file_type, anexo.file_name)
              ? miniaturas[anexo.file_path]
              : undefined;
            return (
              <div
                key={anexo.id}
                className="flex items-center justify-between rounded-lg border bg-muted/40 p-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {miniatura ? (
                    <button
                      type="button"
                      onClick={() => baixar(anexo)}
                      title="Baixar imagem"
                      className="shrink-0"
                    >
                      <img
                        src={miniatura}
                        alt={anexo.file_name}
                        className="h-12 w-12 rounded border object-cover"
                      />
                    </button>
                  ) : (
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm">{anexo.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEquipeKanbanFileSize(anexo.file_size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => baixar(anexo)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:text-destructive"
                    onClick={() => remover(anexo)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
