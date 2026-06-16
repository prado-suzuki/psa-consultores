import { useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronRight, ChevronUp, History, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatChangedFields, type LookupMaps } from '../audit/auditFieldFormatter';

interface HistoricoFlutuanteProps {
  /** Ids de audit_logs.entity_id a buscar (entidade + sub-entidades que o modal edita). */
  entityIds: string[];
}

interface AuditLog {
  id: string;
  entity_type: string;
  entity_name: string;
  action: string;
  changed_fields: Record<string, { old: unknown; new: unknown }> | null;
  performed_by: string;
  performed_at: string;
  details: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Criação', color: 'bg-emerald-100 text-emerald-700' },
  updated: { label: 'Edição', color: 'bg-blue-100 text-blue-700' },
  deleted: { label: 'Exclusão', color: 'bg-red-100 text-red-700' },
};

const ENTITY_LABELS_OSG: Record<string, string> = {
  pessoa: 'Pessoa',
  parentesco: 'Parentesco',
  administracao: 'Administração',
  quadro_societario: 'Quadro societário',
  bem: 'Bem',
  matricula: 'Matrícula',
  titularidade: 'Titularidade',
  impedimento: 'Impedimento',
  cartorio: 'Cartório',
};

// Quantas alterações mostrar antes de pedir "Ver mais".
const COLAPSADO_LIMITE = 5;

/**
 * Painel de histórico que flutua à direita do modal de cadastro OSG. Renderiza
 * como filho (absoluto) do DialogContent — fica fora da caixa, mas dentro do DOM
 * do diálogo, para herdar o foco/dismiss do Radix.
 *
 * Recolhido por padrão (só o cabeçalho), para não disputar atenção com o
 * formulário; clicar no cabeçalho abre a lista, que mostra as últimas 5 e
 * expande verticalmente (com scroll) via "Ver mais".
 *
 * A captura do log é incondicional; quem decide exibir é o modal
 * (gate useClienteTemDocumentoGerado).
 */
export function HistoricoFlutuante({ entityIds }: HistoricoFlutuanteProps) {
  // Por padrão o painel fica recolhido (só o cabeçalho); clicar revela a lista.
  const [painelAberto, setPainelAberto] = useState(false);
  // Dentro do painel aberto, alterna entre as últimas 5 e a lista completa.
  const [verTudo, setVerTudo] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  // Deslocamento horizontal aplicado quando não há espaço à direita: o painel
  // escorrega para a esquerda (sobrepondo a borda do modal) em vez de sair da tela.
  const [shiftX, setShiftX] = useState(0);

  // Ordena os ids para que a queryKey seja estável independente da ordem de entrada.
  const ids = [...entityIds].filter(Boolean).sort();

  // Mantém o painel dentro da viewport: calcula a borda direita do modal a partir
  // do offsetWidth (independe do transform de entrada) e empurra para dentro.
  useLayoutEffect(() => {
    const compute = () => {
      const panel = panelRef.current;
      const modal = panel?.closest('[role="dialog"]') as HTMLElement | null;
      if (!panel || !modal) return;
      const modalRight = (window.innerWidth + modal.offsetWidth) / 2;
      const panelLeft = modalRight + 12; // ml-3
      const overflow = panelLeft + panel.offsetWidth - (window.innerWidth - 8);
      setShiftX(overflow > 0 ? -overflow : 0);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [ids.length]);

  const { data: profiles = {} } = useQuery({
    queryKey: ['audit-lookup-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles' as any).select('id, first_name, last_name');
      const map: Record<string, string> = {};
      (data as any[])?.forEach((p) => {
        map[p.id] = `${p.first_name} ${p.last_name}`.trim();
      });
      return map;
    },
  });

  const lookups: LookupMaps = {
    profiles,
    projects: {},
    areas: {},
    clients: {},
    contribuintes: {},
    servicos: {},
    tasks: {},
  };

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['historico-cadastro', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from('audit_logs' as any) as any)
        .select(
          'id, entity_type, entity_name, action, changed_fields, performed_by, performed_at, details',
        )
        .eq('area', 'osg')
        .in('entity_id', ids)
        .order('performed_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const toggle = (id: string) => {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const temMais = logs.length > COLAPSADO_LIMITE;
  const visiveis = verTudo ? logs : logs.slice(0, COLAPSADO_LIMITE);

  return (
    <aside
      ref={panelRef}
      style={{ transform: shiftX ? `translateX(${shiftX}px)` : undefined }}
      className="absolute left-full top-0 z-10 ml-3 flex w-72 flex-col overflow-hidden rounded-lg border border-osg-200/70 bg-background shadow-[0_10px_34px_-14px_rgba(18,88,55,0.3)] animate-in fade-in slide-in-from-left-2 duration-300 motion-reduce:animate-none"
    >
      {/* Cabeçalho = botão que recolhe/abre o painel. */}
      <button
        type="button"
        onClick={() => setPainelAberto((v) => !v)}
        className={`flex w-full shrink-0 items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-osg-50 ${
          painelAberto ? 'border-b border-osg-100' : ''
        }`}
      >
        <History className="h-4 w-4 shrink-0 text-osg-moss" />
        <span className="text-sm font-semibold text-osg-700">Histórico</span>
        {logs.length > 0 && (
          <span className="rounded bg-osg-100 px-1.5 text-[10px] font-medium tabular-nums text-osg-700">
            {logs.length}
          </span>
        )}
        <span className="ml-auto shrink-0 text-osg-500">
          {painelAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {painelAberto && (
        <div
          className="min-h-0 space-y-1.5 overflow-y-auto px-2.5 py-2.5"
          style={{ maxHeight: verTudo ? '60vh' : undefined }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-osg-moss" />
              Carregando...
            </div>
          ) : logs.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              Nenhuma alteração registrada.
            </p>
          ) : (
            visiveis.map((log) => {
              const hasChanges =
                log.action === 'updated' &&
                !!log.changed_fields &&
                Object.keys(log.changed_fields).length > 0;
              const hasDetails = !!log.details && log.details.trim().length > 0;
              const isExpandable = hasChanges || hasDetails;
              const isOpen = abertos.has(log.id);
              const action = ACTION_LABELS[log.action] ?? {
                label: log.action,
                color: 'bg-osg-100 text-osg-700',
              };
              const changes = hasChanges ? formatChangedFields(log.changed_fields!, lookups) : [];

              return (
                <Collapsible
                  key={log.id}
                  open={isOpen}
                  onOpenChange={() => isExpandable && toggle(log.id)}
                  className="rounded-md border border-osg-200/70 bg-osg-50/40"
                >
                  <CollapsibleTrigger
                    disabled={!isExpandable}
                    className={`w-full px-2.5 py-1.5 text-left ${isExpandable ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 shrink-0 text-osg-500">
                        {isExpandable &&
                          (isOpen ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          ))}
                      </span>
                      <Badge className={`${action.color} shrink-0 px-1.5 py-0 text-[10px]`}>
                        {action.label}
                      </Badge>
                      <span className="truncate rounded bg-osg-100 px-1.5 text-[10px] font-medium text-osg-700">
                        {ENTITY_LABELS_OSG[log.entity_type] ?? log.entity_type}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 pl-[1.125rem] text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        {format(new Date(log.performed_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{profiles[log.performed_by] ?? 'Desconhecido'}</span>
                    </div>
                  </CollapsibleTrigger>
                  {isExpandable && (
                    <CollapsibleContent>
                      <div className="space-y-1 border-t border-osg-200/70 px-2.5 py-2 text-[11px]">
                        {hasDetails && (
                          <p className="mb-1 italic text-muted-foreground">{log.details}</p>
                        )}
                        {changes.map((c, idx) => (
                          <div key={idx} className="space-y-0.5">
                            <span className="font-medium text-osg-700">{c.label}</span>
                            <div className="flex flex-wrap items-baseline gap-1.5">
                              <span className="text-red-600 line-through">{c.oldValue}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-emerald-700">{c.newValue}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            })
          )}
        </div>
      )}

      {painelAberto && temMais && (
        <button
          type="button"
          onClick={() => setVerTudo((v) => !v)}
          className="shrink-0 border-t border-osg-100 py-1.5 text-center text-[11px] font-medium text-osg-moss transition-colors hover:bg-osg-50"
        >
          {verTudo ? 'Ver menos' : `Ver mais (${logs.length - COLAPSADO_LIMITE})`}
        </button>
      )}
    </aside>
  );
}
