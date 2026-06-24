import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccessibleDashboards } from '@/hooks/useAccessibleDashboards';
import { useDashboardEmbedUrl } from '@/hooks/useDashboardEmbedUrl';
import { DashboardIframe } from '@/components/dashboards/DashboardIframe';

/**
 * Bloco reutilizável de "biblioteca de dashboards" dirigido pelo banco (DB-driven).
 *
 * - Lista os dashboards que o usuário pode ver na `targetPage` (RPC server-side).
 * - Seletor quando há mais de um.
 * - Resolve a URL do iframe via RPC (valor do filtro vem do servidor) — fail-closed:
 *   se não houver cluster/cliente, mostra aviso e NÃO renderiza o iframe.
 *
 * O consumidor cuida do layout em volta (cabeçalho, card, etc.).
 */
interface DashboardEmbedViewProps {
  targetPage: string;
  /** Mensagem quando não há nenhum dashboard liberado para o usuário nesta página. */
  emptyMessage?: string;
  /** Altura do iframe em px (default 1080). */
  height?: number;
  className?: string;
}

export function DashboardEmbedView({
  targetPage,
  emptyMessage = 'Nenhum dashboard disponível para o seu usuário.',
  height = 1080,
  className,
}: DashboardEmbedViewProps) {
  const { data: dashboards = [], isLoading, error } = useAccessibleDashboards(targetPage);
  const [selectedId, setSelectedId] = useState<string>('');

  // Auto-seleciona o primeiro; corrige se o selecionado sair da lista.
  useEffect(() => {
    if (dashboards.length === 0) {
      if (selectedId !== '') setSelectedId('');
      return;
    }
    if (!dashboards.some((d) => d.id === selectedId)) {
      setSelectedId(dashboards[0].id);
    }
  }, [dashboards, selectedId]);

  const selected = useMemo(
    () => dashboards.find((d) => d.id === selectedId) ?? null,
    [dashboards, selectedId],
  );

  const { data: embed, isLoading: isLoadingUrl } = useDashboardEmbedUrl(selected?.id ?? null);

  if (isLoading) {
    return <Skeleton className="h-[480px] w-full max-w-[1280px]" />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-700">Erro ao carregar dashboards</p>
        <p className="mt-1 text-xs text-red-600 break-all">{(error as Error).message}</p>
        <p className="mt-2 text-xs text-red-500">
          Se a mensagem cita uma função inexistente (ex.: get_accessible_dashboards),
          rode a migration <code>20260623130000_dashboards_rpcs.sql</code> no Lovable.
        </p>
      </div>
    );
  }

  if (dashboards.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {dashboards.length > 1 && (
        <div className="mb-4">
          <label className="text-xs font-medium mb-1 block text-slate-500">Selecionar Dashboard</label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-[340px] h-10 rounded-full border bg-white/90 px-3 text-left text-sm">
              <SelectValue placeholder="Selecione um dashboard" />
            </SelectTrigger>
            <SelectContent>
              {dashboards.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DashboardIframe
        embed={embed}
        isLoading={isLoadingUrl}
        title={selected?.name ?? 'Dashboard'}
        height={height}
      />
    </div>
  );
}
