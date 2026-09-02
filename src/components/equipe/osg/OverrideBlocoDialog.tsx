import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Info, Loader2, Maximize2, Minimize2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditorConteudoModelo } from '@/components/equipe/osg/EditorConteudoModelo';
import { cn } from '@/lib/utils';
import type { BlocoComVersao } from '@/hooks/useBibliotecaModelos';
import type { OverrideAplicavel } from '@/hooks/useDocumentoGerado';
import { useReverterOverride, useSalvarOverride } from '@/hooks/useOverrideBloco';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoGeradoId: string;
  documentoRaizId: string;
  /** Bloco original (Biblioteca) sendo ajustado. */
  blocoAlvo: BlocoComVersao | null;
  /** Override ativo já existente para este bloco (re-edição), se houver. */
  override?: OverrideAplicavel | null;
  /** Para invalidação da prévia. */
  modeloId: string | null;
}

/**
 * Ajuste de um bloco SÓ neste documento (override). O default é o override: o
 * texto editado vale apenas para o documento atual; o bloco original da
 * Biblioteca não muda. Reusa o mesmo editor da Biblioteca (formato idêntico).
 */
export function OverrideBlocoDialog({
  open,
  onOpenChange,
  documentoGeradoId,
  documentoRaizId,
  blocoAlvo,
  override,
  modeloId,
}: Props) {
  const navigate = useNavigate();
  const salvar = useSalvarOverride();
  const reverter = useReverterOverride();

  const [conteudo, setConteudo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [expandido, setExpandido] = useState(false);
  const [confirmandoBiblioteca, setConfirmandoBiblioteca] = useState(false);
  const [confirmandoReverter, setConfirmandoReverter] = useState(false);

  // (Re)inicia ao abrir: texto do override existente ou o conteúdo atual do original.
  useEffect(() => {
    if (!open) return;
    setConteudo(override?.conteudoSubstituto ?? blocoAlvo?.versao_atual?.conteudo ?? '');
    setMotivo(override?.justificativa ?? '');
    setExpandido(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blocoAlvo?.id, override?.overrideId]);

  const ocupado = salvar.isPending || reverter.isPending;
  const podeSalvar = conteudo.trim().length > 0 && !ocupado;

  const handleSalvar = async () => {
    if (!blocoAlvo) return;
    await salvar.mutateAsync({
      documentoGeradoId,
      documentoRaizId,
      blocoAlvo,
      novoConteudo: conteudo,
      justificativa: motivo.trim() || null,
      overrideExistenteId: override?.overrideId ?? null,
      blocoSubstitutoExistenteId: override?.blocoSubstitutoId ?? null,
      modeloId,
    });
    onOpenChange(false);
  };

  const handleReverter = async () => {
    if (!override) return;
    await reverter.mutateAsync({ overrideId: override.overrideId, documentoGeradoId });
    setConfirmandoReverter(false);
    onOpenChange(false);
  };

  const irParaBiblioteca = () => {
    if (!blocoAlvo) return;
    setConfirmandoBiblioteca(false);
    onOpenChange(false);
    navigate(`/equipe/osg/work/biblioteca-modelos?bloco=${blocoAlvo.id}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'overflow-y-auto transition-all duration-300',
            expandido ? 'h-[90vh] max-h-[90vh] w-[95vw] max-w-[95vw]' : 'max-h-[90vh] max-w-2xl',
          )}
        >
          <DialogHeader>
            <DialogTitle>Ajustar bloco neste documento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Banner de escopo — o coração da clareza: deixa explícito que o
                ajuste não toca o bloco original nem os outros documentos. */}
            <div className="flex items-start gap-2.5 rounded-md bg-osg-moss/[0.06] px-3.5 py-3 text-sm text-stone-700 ring-1 ring-inset ring-osg-moss/30">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" />
              <p className="leading-relaxed">
                <span className="font-semibold text-osg-700">
                  Você está ajustando este bloco apenas para este documento.
                </span>{' '}
                O bloco original na Biblioteca de Modelos <span className="font-semibold">não será alterado</span> e
                os outros documentos continuam usando o texto padrão.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  {blocoAlvo?.nome ? `Texto do bloco "${blocoAlvo.nome}"` : 'Texto do bloco'} — use{' '}
                  {'{{ campo }}'} para as variáveis
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-osg-700"
                  onClick={() => setExpandido((v) => !v)}
                >
                  {expandido ? (
                    <>
                      <Minimize2 className="mr-1 h-3.5 w-3.5" /> Recolher
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-1 h-3.5 w-3.5" /> Expandir
                    </>
                  )}
                </Button>
              </div>
              <EditorConteudoModelo
                value={conteudo}
                onChange={setConteudo}
                minHeight={expandido ? '60vh' : '14rem'}
                maxHeight={expandido ? '70vh' : '28rem'}
                className="transition-all duration-300"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Motivo do ajuste (opcional)</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex.: cliente pediu redação específica para esta cláusula."
              />
            </div>

            {/* Rodapé: à esquerda os caminhos secundários (editar o original /
                reverter); à direita cancelar e a ação primária do override. */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!blocoAlvo || ocupado}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-osg-700"
                  onClick={() => setConfirmandoBiblioteca(true)}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Editar o bloco original na biblioteca
                </Button>
                {override && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={ocupado}
                    className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmandoReverter(true)}
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                    Voltar ao texto original
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={ocupado}>
                  Cancelar
                </Button>
                <Button onClick={handleSalvar} disabled={!podeSalvar} className="bg-osg-600 hover:bg-osg-700">
                  {salvar.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Salvar ajuste deste documento
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Editar o original afeta TODOS os documentos — confirma antes de sair. */}
      <AlertDialog open={confirmandoBiblioteca} onOpenChange={setConfirmandoBiblioteca}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar o bloco original afeta todos os documentos.</AlertDialogTitle>
            <AlertDialogDescription>
              Você será levado para a Biblioteca de Modelos. As mudanças feitas lá valem como texto padrão para{' '}
              <strong>todos</strong> os documentos que usam este bloco — não apenas este.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={irParaBiblioteca}>Ir para a biblioteca</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reverter o ajuste deste documento (soft-delete). */}
      <AlertDialog open={confirmandoReverter} onOpenChange={setConfirmandoReverter}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o ajuste deste documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O bloco volta a usar o texto padrão da biblioteca. Você pode ajustar de novo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverter.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReverter();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverter.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Voltar ao original
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
