import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

import { AttachmentButton } from '@/components/comentarios/OrgCommentAttachments';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUrlDaImagemDoAnexo, type OrgCommentAttachment } from '@/hooks/useDomainOrgComments';
import { ehImagem, tamanhoDaMiniatura } from '@/lib/miniaturaDoAnexo';
import { cn } from '@/lib/utils';

interface AnexosDoComentarioProps {
  attachments: OrgCommentAttachment[];
  onBaixar: (attachment: OrgCommentAttachment) => void;
  className?: string;
}

/**
 * Os anexos de UM comentário: imagem aparece, o resto é cartão de arquivo.
 *
 * As imagens vêm primeiro e em miniatura, como no Slack, porque print é o anexo
 * mais comum da conversa e o cartão com nome e tamanho obrigava a baixar para
 * saber do que se falava. O clique abre o visualizador, que anda entre as
 * imagens deste comentário (não da conversa inteira: é o conjunto que a pessoa
 * mandou junto).
 */
export function AnexosDoComentario({ attachments, onBaixar, className }: AnexosDoComentarioProps) {
  const [aberta, setAberta] = useState<number | null>(null);
  /** Imagem que o navegador não soube desenhar (HEIC, arquivo corrompido) volta a ser cartão. */
  const [semDesenho, setSemDesenho] = useState<Set<string>>(new Set());

  const imagens = attachments.filter((anexo) => ehImagem(anexo.file_type) && !semDesenho.has(anexo.id));
  const arquivos = attachments.filter((anexo) => !imagens.includes(anexo));

  if (attachments.length === 0) return null;

  return (
    <div className={cn('mt-2 space-y-2', className)}>
      {imagens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagens.map((imagem, indice) => (
            <Miniatura
              key={imagem.id}
              anexo={imagem}
              onAbrir={() => setAberta(indice)}
              onFalhou={() => setSemDesenho((atual) => new Set(atual).add(imagem.id))}
            />
          ))}
        </div>
      )}

      {arquivos.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {arquivos.map((anexo) => (
            <AttachmentButton key={anexo.id} attachment={anexo} onOpen={onBaixar} />
          ))}
        </div>
      )}

      <Visualizador
        imagens={imagens}
        indice={aberta}
        onIndice={setAberta}
        onBaixar={onBaixar}
      />
    </div>
  );
}

function Miniatura({
  anexo,
  onAbrir,
  onFalhou,
}: {
  anexo: OrgCommentAttachment;
  onAbrir: () => void;
  onFalhou: () => void;
}) {
  const { data: url, isError } = useUrlDaImagemDoAnexo(anexo.file_path);
  const [carregou, setCarregou] = useState(false);
  const { largura, altura } = tamanhoDaMiniatura(anexo.width, anexo.height);

  useEffect(() => {
    if (isError) onFalhou();
  }, [isError, onFalhou]);

  return (
    <button
      type="button"
      onClick={onAbrir}
      title={anexo.file_name}
      aria-label={`Ver a imagem ${anexo.file_name}`}
      className="relative block max-w-full overflow-hidden rounded-md border bg-muted/40 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ width: largura, aspectRatio: `${largura} / ${altura}` }}
    >
      {!carregou && <Skeleton className="absolute inset-0 rounded-none" />}
      {url && (
        <img
          src={url}
          alt={anexo.file_name}
          loading="lazy"
          onLoad={() => setCarregou(true)}
          onError={onFalhou}
          className="h-full w-full object-cover"
        />
      )}
    </button>
  );
}

function Visualizador({
  imagens,
  indice,
  onIndice,
  onBaixar,
}: {
  imagens: OrgCommentAttachment[];
  indice: number | null;
  onIndice: (indice: number | null) => void;
  onBaixar: (attachment: OrgCommentAttachment) => void;
}) {
  const atual = indice === null ? undefined : imagens[indice];
  const total = imagens.length;
  const { data: url } = useUrlDaImagemDoAnexo(atual?.file_path ?? '');

  const andar = (passo: number) => {
    if (indice === null || total < 2) return;
    onIndice((indice + passo + total) % total);
  };

  return (
    <Dialog open={atual !== undefined} onOpenChange={(aberto) => !aberto && onIndice(null)}>
      <DialogContent
        className="max-h-[94vh] w-auto max-w-[94vw] gap-3 overflow-hidden p-3 sm:p-4"
        onKeyDown={(evento) => {
          if (evento.key === 'ArrowRight') andar(1);
          if (evento.key === 'ArrowLeft') andar(-1);
        }}
      >
        {atual && (
          <>
            <div className="flex min-w-0 items-center gap-3 pr-8">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-sm font-medium">{atual.file_name}</DialogTitle>
                <DialogDescription className="text-xs">
                  {total > 1 ? `${(indice ?? 0) + 1} de ${total} · ` : ''}
                  {(atual.file_size / 1024).toFixed(1)} KB
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => onBaixar(atual)}>
                <Download aria-hidden className="h-3.5 w-3.5" />
                Baixar
              </Button>
            </div>

            <div className="relative flex items-center justify-center">
              {url ? (
                <img
                  src={url}
                  alt={atual.file_name}
                  className="max-h-[80vh] max-w-[calc(94vw-2rem)] rounded object-contain"
                />
              ) : (
                <Skeleton className="h-[50vh] w-[60vw] max-w-full" />
              )}
              {total > 1 && (
                <>
                  <BotaoDeAndar lado="esquerda" onClick={() => andar(-1)} />
                  <BotaoDeAndar lado="direita" onClick={() => andar(1)} />
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BotaoDeAndar({ lado, onClick }: { lado: 'esquerda' | 'direita'; onClick: () => void }) {
  const Icone = lado === 'esquerda' ? ChevronLeft : ChevronRight;
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      aria-label={lado === 'esquerda' ? 'Imagem anterior' : 'Próxima imagem'}
      onClick={onClick}
      className={cn(
        'absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full opacity-80 shadow hover:opacity-100',
        lado === 'esquerda' ? 'left-2' : 'right-2',
      )}
    >
      <Icone aria-hidden className="h-5 w-5" />
    </Button>
  );
}
