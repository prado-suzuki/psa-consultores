import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, ExternalLink, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Procedimento, useGetSignedUrl } from '@/hooks/useProcedimentos';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import { COMPLEXIDADE_CONFIG, estiloChipProcesso } from './theme';
import { supabase } from '@/integrations/supabase/client';
import { abrirAnexoEmNovaAba } from '@/lib/baixarArquivo';
import { toast } from 'sonner';

interface ProcedimentoSheetProps {
  procedimento: Procedimento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Curador (admin/líder/sublíder) ganha editar, arquivar e excluir no rodapé. */
  podeCurar: boolean;
  onEditar: (proc: Procedimento) => void;
  onArquivar: (proc: Procedimento, arquivar: boolean) => void;
  onExcluir: (proc: Procedimento) => void;
}

/**
 * A leitura do procedimento.
 *
 * Antes disto a biblioteca catalogava e não entregava o catálogo: o card
 * mostrava 3 das até 5 etapas, o resumo cortado em 3 linhas e 3 das N tags, e
 * o único caminho para o conteúdo era baixar o documento de origem — ou seja,
 * voltar ao documento de 20 páginas que a página existia para dispensar.
 *
 * Fica num Sheet e não numa rota nova de propósito: quem consulta está
 * varrendo a grade, e voltar para a grade não pode custar uma navegação.
 */
export function ProcedimentoSheet({
  procedimento: p,
  open,
  onOpenChange,
  podeCurar,
  onEditar,
  onArquivar,
  onExcluir,
}: ProcedimentoSheetProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const getSignedUrl = useGetSignedUrl();
  const { data: nomePorId } = useProfilesNomeMap();

  useEffect(() => {
    setCoverUrl(null);
    if (!p?.ai_cover_url) return;
    let ativo = true;
    supabase.storage.from('sop-documents').createSignedUrl(p.ai_cover_url, 3600)
      .then(({ data }) => { if (ativo && data) setCoverUrl(data.signedUrl); });
    return () => { ativo = false; };
  }, [p?.ai_cover_url]);

  if (!p) return null;

  const autorConfirmacao = p.confirmado_por ? nomePorId?.[p.confirmado_por] : null;

  const complex = p.ai_complexidade ? COMPLEXIDADE_CONFIG[p.ai_complexidade] : null;

  const baixarArquivo = async () => {
    if (!p.arquivo_path) return;
    const nome = p.arquivo_path.split('/').pop() || 'documento';
    try {
      abrirAnexoEmNovaAba(await getSignedUrl(p.arquivo_path, nome), nome);
    } catch (err) {
      // Falhava em silêncio no console: o clique não fazia nada e não dizia por quê.
      toast.error('Não consegui abrir o documento: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex flex-wrap gap-1.5">
            {p.status_publicacao === 'arquivado' && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                Arquivado
              </span>
            )}
            {p.processos_associados.map((proc) => (
              <span
                key={proc}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                style={estiloChipProcesso(proc)}
              >
                {proc}
              </span>
            ))}
          </div>
          <SheetTitle className="text-lg leading-snug pr-6">
            {p.ai_titulo || 'Sem título'}
          </SheetTitle>
        </SheetHeader>

        {coverUrl && (
          <div className="w-full h-40 rounded-lg overflow-hidden mt-4">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="mt-5 space-y-6">
          {p.ai_resumo && (
            <section>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Resumo
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">{p.ai_resumo}</p>
            </section>
          )}

          <section>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Etapas
            </h4>
            {p.ai_etapas.length > 0 ? (
              <ol className="space-y-2">
                {p.ai_etapas.map((etapa, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{etapa}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-400">
                Nenhuma etapa registrada. O documento de origem é a única referência.
              </p>
            )}
          </section>

          {(complex || p.ai_tags.length > 0) && (
            <section className="space-y-3">
              {complex && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Complexidade
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" style={{ color: complex.color }} />
                    <span className="text-sm font-medium" style={{ color: complex.color }}>
                      {complex.label}
                    </span>
                    <span className="text-xs text-slate-400">— {complex.ajuda}</span>
                  </div>
                </div>
              )}
              {p.ai_tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                    Tags
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {p.ai_tags.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="border-t border-slate-100 pt-4 space-y-1.5 text-xs text-slate-400">
            <p>
              Documento de origem:{' '}
              {p.source_type === 'link' ? 'link externo' : p.source_type.toUpperCase()}
            </p>
            {p.confirmado_em && (
              <p>
                Confirmado por {autorConfirmacao || 'um curador'} em{' '}
                {format(new Date(p.confirmado_em), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.
              </p>
            )}
            <p>
              Última alteração em{' '}
              {format(new Date(p.updated_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}.
            </p>
          </section>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100">
          {p.source_url ? (
            <Button size="sm" variant="outline" onClick={() => window.open(p.source_url!, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir documento
            </Button>
          ) : p.arquivo_path ? (
            <Button size="sm" variant="outline" onClick={baixarArquivo}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Baixar documento
            </Button>
          ) : null}

          {podeCurar && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEditar(p)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-500"
                onClick={() => onArquivar(p, p.status_publicacao !== 'arquivado')}
              >
                {p.status_publicacao === 'arquivado' ? (
                  <><ArchiveRestore className="h-3.5 w-3.5 mr-1.5" /> Reativar</>
                ) : (
                  <><Archive className="h-3.5 w-3.5 mr-1.5" /> Arquivar</>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-700 ml-auto"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
              </Button>
            </>
          )}
        </div>

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir procedimento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{p.ai_titulo || 'este procedimento'}"? Esta ação
                não pode ser desfeita. Se a intenção é só tirar da vitrine, arquive em vez de excluir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { onExcluir(p); onOpenChange(false); }}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
