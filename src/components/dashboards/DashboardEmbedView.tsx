import { useMemo, useState, type ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { useAccessibleDashboards } from '@/hooks/useAccessibleDashboards';
import { useDashboardEmbedUrl } from '@/hooks/useDashboardEmbedUrl';
import { DashboardIframe } from '@/components/dashboards/DashboardIframe';
import { ID_NATIVO, idParaEmbed, montarOpcoes, selecaoEfetiva } from '@/lib/dashboardsSeletor';

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
  /** Mostra o overlay animado de "Carregando relatório…" sobre o iframe. */
  loadingOverlay?: boolean;
  className?: string;
  /**
   * Painel nativo da tela, que entra como primeira opção do seletor em vez de
   * viver fora dele. Não é um embed: renderiza o próprio conteúdo. Usado pelas
   * Gerenciais da Tax e da OSG, onde o dashboard de Clientes e OS é um
   * componente React. Sem esta prop, a tela se comporta como sempre.
   */
  nativo?: { nome: string; conteudo: ReactNode };
}

export function DashboardEmbedView({
  targetPage,
  emptyMessage = 'Nenhum dashboard disponível para o seu usuário.',
  loadingOverlay = false,
  className,
  nativo,
}: DashboardEmbedViewProps) {
  const { data: dashboards = [], isLoading, error } = useAccessibleDashboards(targetPage);
  const [escolhido, setEscolhido] = useState<string>('');

  const opcoes = useMemo(() => montarOpcoes(dashboards, nativo?.nome), [dashboards, nativo?.nome]);
  // Derivado, não estado: a seleção efetiva cai na primeira opção enquanto o
  // usuário não escolher, e se corrige sozinha quando a lista muda.
  const selecionado = selecaoEfetiva(opcoes, escolhido);
  const ehNativo = selecionado === ID_NATIVO;

  const selected = useMemo(
    () => dashboards.find((d) => d.id === selecionado) ?? null,
    [dashboards, selecionado],
  );

  const { data: embed, isLoading: isLoadingUrl } = useDashboardEmbedUrl(idParaEmbed(opcoes, escolhido));

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

  // Vazio é não ter opção nenhuma. Com painel nativo, a tela nunca fica vazia,
  // mesmo que o usuário não tenha relatório do Looker liberado.
  if (opcoes.length === 0) {
    return (
      <div className="rounded-xl border border-border p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <label className="text-[11px] font-medium uppercase tracking-wide mb-1 block text-slate-500">Relatório</label>
          <Select value={selecionado} onValueChange={setEscolhido}>
            <SelectTrigger className="w-[320px] h-10 rounded-lg px-3 text-left text-sm font-medium text-slate-800 shadow-sm">
              <SelectValue placeholder="Selecione um relatório" />
            </SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selected?.sop_url && (
          <Button
            variant="outline"
            className="h-10 rounded-lg border-border bg-white text-slate-700 shadow-sm"
            onClick={() => window.open(selected.sop_url!, '_blank', 'noopener,noreferrer')}
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            Manual
          </Button>
        )}
      </div>

      {ehNativo ? (
        nativo!.conteudo
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <DashboardIframe
            embed={embed}
            isLoading={isLoadingUrl}
            title={selected?.name ?? 'Dashboard'}
            showLoading={loadingOverlay}
          />
        </div>
      )}
    </div>
  );
}
