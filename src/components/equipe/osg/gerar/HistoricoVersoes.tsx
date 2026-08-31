import { ArrowLeft, Check, ChevronDown, Download, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { VersaoDocumento } from '@/hooks/useDocumentoGerado';

// UI da visualização de versões anteriores na tela Gerar Documento: a lista do
// rail (histórico da linhagem) e o aviso que coroa a folha em modo leitura.
// Segue o padrão de card OSG (borda areia + acento verde-musgo em detalhe).

const fmtDataHora = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Data de referência da versão: quando foi validada (selada) ou, na falta, criada. */
const dataVersao = (v: VersaoDocumento) => v.row.snapshot_validado_em ?? v.row.created_at;

interface HistoricoVersoesProps {
  versoes: VersaoDocumento[];
  autores: Record<string, string>;
  /** Versão sob visualização; null = vendo a versão atual (head, editável). */
  versaoVisualizadaId: string | null;
  onSelecionar: (id: string | null) => void;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
}

/**
 * Lista das versões da linhagem (mais recente no topo). A head é a "versão
 * atual" — escolhê-la volta à edição viva; cada versão selada abre em modo
 * somente-leitura na folha central.
 */
export const HistoricoVersoes = ({
  versoes,
  autores,
  versaoVisualizadaId,
  onSelecionar,
  aberto,
  onAbertoChange,
}: HistoricoVersoesProps) => {
  const maisRecentePrimeiro = [...versoes].reverse();
  const vendo = versaoVisualizadaId
    ? versoes.find((v) => v.row.id === versaoVisualizadaId)
    : null;
  const resumo = vendo ? `Vendo a versão ${vendo.numero}` : `${versoes.length} versões`;

  return (
    <Collapsible open={aberto} onOpenChange={onAbertoChange}>
      <div className="rounded-md border border-osg-300/60 bg-card shadow-sm shadow-osg-300/30">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
            <History className="h-4 w-4 shrink-0 text-osg-moss" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Histórico de versões
              </span>
              <span className="block truncate text-xs font-semibold text-slate-900">{resumo}</span>
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                aberto && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 border-t border-osg-100 p-1.5">
          {maisRecentePrimeiro.map((v) => {
            const selecionado = v.ehHead ? versaoVisualizadaId === null : versaoVisualizadaId === v.row.id;
            const autor = autores[v.row.gerado_por_id ?? ''] || null;
            return (
              <button
                key={v.row.id}
                type="button"
                aria-pressed={selecionado}
                onClick={() => onSelecionar(v.ehHead ? null : v.row.id)}
                className={cn(
                  'flex w-full items-start gap-2 rounded px-2.5 py-2 text-left transition-colors',
                  selecionado
                    ? 'bg-osg-moss/10 text-osg-700'
                    : 'text-slate-600 hover:bg-osg-50 hover:text-slate-900',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    Versão {v.numero}
                    {v.ehHead && (
                      <span className="rounded-full bg-osg-moss/15 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-osg-700">
                        atual
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                    {fmtDataHora(dataVersao(v))}
                    {autor ? ` · ${autor}` : ''}
                  </span>
                </span>
                {selecionado && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-osg-moss" />}
              </button>
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

interface BannerVersaoAnteriorProps {
  numero: number;
  data: string | null | undefined;
  autor?: string | null;
  baixando: boolean;
  onBaixar: () => void;
  onVoltar: () => void;
}

/**
 * Faixa sobre a folha em modo leitura: deixa claro que o que se vê é uma versão
 * anterior congelada (não os cadastros vivos) e oferece baixar aquela versão ou
 * voltar à atual.
 */
export const BannerVersaoAnterior = ({
  numero,
  data,
  autor,
  baixando,
  onBaixar,
  onVoltar,
}: BannerVersaoAnteriorProps) => (
  <div className="flex flex-wrap items-center gap-3 rounded-md border border-osg-moss/30 bg-osg-moss/[0.07] px-4 py-2.5">
    <History className="h-4 w-4 shrink-0 text-osg-moss" />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-osg-700">
        Visualizando a versão {numero} <span className="font-normal text-osg-600">· somente leitura</span>
      </p>
      <p className="truncate text-xs text-osg-600/80">
        Versão congelada{data ? ` em ${fmtDataHora(data)}` : ''}
        {autor ? ` por ${autor}` : ''} — alterações posteriores nos cadastros não a afetam.
      </p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="border-osg-moss/40 text-osg-700 hover:bg-osg-moss/10"
        onClick={onBaixar}
        disabled={baixando}
      >
        {baixando ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="mr-1.5 h-3.5 w-3.5" />
        )}
        Baixar .docx
      </Button>
      <Button
        size="sm"
        className="bg-osg-600 hover:bg-osg-700"
        onClick={onVoltar}
      >
        <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
        Voltar à versão atual
      </Button>
    </div>
  </div>
);
