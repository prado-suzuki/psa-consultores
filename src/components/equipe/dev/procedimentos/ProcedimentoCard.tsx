import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, BarChart3, RefreshCw, Edit, Trash2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Procedimento } from '@/hooks/useProcedimentos';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { COMPLEXIDADE_CONFIG, PROCESSANDO_TIMEOUT_MIN, estiloChipProcesso } from './theme';

interface ProcedimentoCardProps {
  procedimento: Procedimento;
  /** Curador (admin/líder/sublíder): vê o pendente, confirma, exclui. */
  podeCurar: boolean;
  onRetry: (id: string) => void;
  onReview: (proc: Procedimento) => void;
  onDelete: (proc: Procedimento) => void;
  /** Abre a leitura do procedimento — o clique padrão do card. */
  onAbrir: (proc: Procedimento) => void;
}

export function ProcedimentoCard({
  procedimento: p,
  podeCurar,
  onRetry,
  onReview,
  onDelete,
  onAbrir,
}: ProcedimentoCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Antes isto rodava no CORPO do componente, com um setState de controle para
  // não repetir — efeito colateral dentro do render.
  useEffect(() => {
    if (!p.ai_cover_url) { setCoverUrl(null); return; }
    let ativo = true;
    supabase.storage.from('sop-documents').createSignedUrl(p.ai_cover_url, 3600)
      .then(({ data }) => { if (ativo && data) setCoverUrl(data.signedUrl); });
    return () => { ativo = false; };
  }, [p.ai_cover_url]);

  // Processing state — detecta "travado" no MESMO prazo que o backend usa para
  // marcar erro, para o card não anunciar travamento antes da hora.
  if (p.status_geracao === 'processando') {
    const ageMs = Date.now() - new Date(p.created_at).getTime();
    const isStuck = ageMs > PROCESSANDO_TIMEOUT_MIN * 60 * 1000;

    if (isStuck) {
      return (
        <div className="bg-amber-50 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-amber-200 flex flex-col items-center justify-center min-h-[280px] gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm text-amber-800 font-medium text-center">Leitura travada</p>
          <p className="text-xs text-amber-600 text-center">
            Começou {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: ptBR })} e não terminou.
          </p>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => onRetry(p.id)}>
              <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
            </Button>
            {podeCurar && (
              <Button size="sm" variant="outline" className="text-red-500" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-3 w-3 mr-1" /> Excluir
              </Button>
            )}
          </div>
          <DeleteConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} onConfirm={() => onDelete(p)} />
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center min-h-[280px] gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Lendo o documento...
        </div>
      </div>
    );
  }

  // Error state
  if (p.status_geracao === 'erro') {
    return (
      <div className="bg-red-50 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-red-200 flex flex-col items-center justify-center min-h-[280px] gap-3">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-700 font-medium text-center">Não foi possível ler o documento.</p>
        {p.erro_mensagem && (
          <p className="text-xs text-red-500 text-center line-clamp-3">{p.erro_mensagem}</p>
        )}
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => onRetry(p.id)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
          </Button>
          {podeCurar && (
            <Button size="sm" variant="outline" onClick={() => onReview(p)}>
              <Edit className="h-3 w-3 mr-1" /> Preencher à mão
            </Button>
          )}
        </div>
        {podeCurar && (
          <Button size="sm" variant="ghost" className="text-red-500 mt-1" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-3 w-3 mr-1" /> Excluir
          </Button>
        )}
        <DeleteConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} onConfirm={() => onDelete(p)} />
      </div>
    );
  }

  const aguardandoConfirmacao = !p.confirmado_por;
  const complexConfig = p.ai_complexidade ? COMPLEXIDADE_CONFIG[p.ai_complexidade] : null;

  return (
    <>
      <div
        className={`bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow duration-200 flex flex-col min-h-[280px] overflow-hidden cursor-pointer ${
          aguardandoConfirmacao ? 'border-2 border-dashed border-amber-400' : ''
        }`}
        onClick={() => onAbrir(p)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(p); } }}
      >
        {/* Cover image */}
        {coverUrl && (
          <div className="w-full h-36 overflow-hidden">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-5 flex flex-col flex-1">
          {/* Top: Process chips + selos de estado */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {aguardandoConfirmacao && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                Aguardando confirmação
              </span>
            )}
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

          {/* Body */}
          <h3 className="text-base font-semibold text-slate-900 line-clamp-2 mb-1.5">
            {p.ai_titulo || 'Sem título'}
          </h3>
          <p className="text-[13px] text-slate-500 line-clamp-3 mb-3">
            {p.ai_resumo || 'Sem resumo disponível'}
          </p>

          {/* Etapas */}
          {p.ai_etapas.length > 0 && (
            <ul className="space-y-1 mb-3">
              {p.ai_etapas.slice(0, 3).map((e, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />
                  <span className="line-clamp-1">{e}</span>
                </li>
              ))}
              {p.ai_etapas.length > 3 && (
                <li className="text-xs text-slate-400 pl-2.5">
                  + {p.ai_etapas.length - 3} etapas — abrir para ver
                </li>
              )}
            </ul>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              {complexConfig && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" style={{ color: complexConfig.color }} />
                  <span className="text-xs font-medium" style={{ color: complexConfig.color }}>
                    {complexConfig.label}
                  </span>
                </div>
              )}
              <span className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(p.updated_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>

            {/* Tags */}
            {p.ai_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.ai_tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                    {t}
                  </span>
                ))}
                {p.ai_tags.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{p.ai_tags.length - 3}</span>
                )}
              </div>
            )}

            {/* Ação do curador: revisar o que a IA extraiu.
                O documento de origem fica na leitura, não aqui — o card é a
                vitrine, não o balcão. */}
            {podeCurar && aguardandoConfirmacao && (
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={(e) => { e.stopPropagation(); onReview(p); }}
              >
                <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" /> Revisar e publicar
              </Button>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} onConfirm={() => onDelete(p)} />
    </>
  );
}

function DeleteConfirmDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir procedimento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este procedimento? Esta ação não pode ser desfeita.
            Se a intenção é só tirar da vitrine, arquive em vez de excluir.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
