import { ExternalLink, AlertTriangle, Loader2, BarChart3, RefreshCw, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Procedimento } from '@/hooks/useProcedimentos';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PROCESSO_COLORS: Record<string, string> = {
  'EFD': '#3B82F6',
  'XMLs': '#8B5CF6',
  'PERDCOMP': '#10B981',
  'Selic': '#06B6D4',
  'IBS/CBS': '#F59E0B',
  'Balancetes': '#EC4899',
  'PIS/COFINS': '#6366F1',
  'Cruzamento de Dados': '#D97706',
  'Correções SPED': '#EF4444',
};

const COMPLEXIDADE_CONFIG = {
  simples: { label: 'Simples', color: '#10B981' },
  intermediario: { label: 'Intermediário', color: '#F59E0B' },
  avancado: { label: 'Avançado', color: '#EF4444' },
};

interface ProcedimentoCardProps {
  procedimento: Procedimento;
  isLeaderOrAdmin: boolean;
  onRetry: (id: string) => void;
  onReview: (proc: Procedimento) => void;
}

export function ProcedimentoCard({ procedimento: p, isLeaderOrAdmin, onRetry, onReview }: ProcedimentoCardProps) {
  // Processing state
  if (p.status_geracao === 'processando') {
    return (
      <div className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center min-h-[280px] gap-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex items-center gap-2 mt-4 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analisando documento...
        </div>
      </div>
    );
  }

  // Error state
  if (p.status_geracao === 'erro') {
    return (
      <div className="bg-red-50 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-red-200 flex flex-col items-center justify-center min-h-[280px] gap-3">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-red-700 font-medium text-center">Não foi possível analisar o documento.</p>
        {p.erro_mensagem && (
          <p className="text-xs text-red-500 text-center line-clamp-2">{p.erro_mensagem}</p>
        )}
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => onRetry(p.id)}>
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReview(p)}>
            <Edit className="h-3 w-3 mr-1" /> Preencher manualmente
          </Button>
        </div>
      </div>
    );
  }

  const isAwaitingConfirmation = p.status_geracao === 'gerado' && !p.confirmado_por;
  const etapas = Array.isArray(p.ai_etapas) ? p.ai_etapas : [];
  const tags = Array.isArray(p.ai_tags) ? p.ai_tags : [];
  const complexConfig = p.ai_complexidade ? COMPLEXIDADE_CONFIG[p.ai_complexidade] : null;

  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow duration-200 flex flex-col min-h-[280px] ${
        isAwaitingConfirmation && isLeaderOrAdmin ? 'border-2 border-dashed border-amber-400' : ''
      }`}
      onClick={() => {
        if (isAwaitingConfirmation && isLeaderOrAdmin) onReview(p);
      }}
      style={{ cursor: isAwaitingConfirmation && isLeaderOrAdmin ? 'pointer' : 'default' }}
    >
      {/* Top: Process chips + awaiting badge */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {isAwaitingConfirmation && isLeaderOrAdmin && (
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Aguardando confirmação
          </span>
        )}
        {p.processos_associados?.map((proc) => {
          const color = PROCESSO_COLORS[proc] || '#6B7280';
          return (
            <span
              key={proc}
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${color}26`, color }}
            >
              {proc}
            </span>
          );
        })}
      </div>

      {/* Body */}
      <h3 className="text-base font-semibold text-slate-900 line-clamp-2 mb-1.5">
        {p.ai_titulo || 'Sem título'}
      </h3>
      <p className="text-[13px] text-slate-500 line-clamp-3 mb-3">
        {p.ai_resumo || 'Sem resumo disponível'}
      </p>

      {/* Etapas */}
      {etapas.length > 0 && (
        <ul className="space-y-1 mb-3">
          {etapas.slice(0, 3).map((e, i) => (
            <li key={i} className="text-xs text-slate-400 flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-300 flex-shrink-0" />
              <span className="line-clamp-1">{e}</span>
            </li>
          ))}
          {etapas.length > 3 && (
            <li className="text-xs text-slate-400 pl-2.5">+ {etapas.length - 3} mais</li>
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
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px] text-slate-400">+{tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Open document button */}
        {p.source_url && (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={(e) => {
              e.stopPropagation();
              window.open(p.source_url!, '_blank');
            }}
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Abrir documento
          </Button>
        )}
      </div>
    </div>
  );
}
