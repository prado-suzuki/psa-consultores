import { useState } from 'react';
import {
  Check,
  CheckCheck,
  ChevronRight,
  Circle,
  FilterX,
  FolderKanban,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ElementTooltip } from '@/components/ui/button-tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { AtividadeDoFeed } from '@/hooks/useAtividadeDoFeedController';
import {
  CLIENTE_SEM_CADASTRO,
  contarNovos,
  partirPorNovidade,
  rotuloDeAtualizacoes,
  rotuloDeNovas,
  type ClienteComAtividade,
  type ProjetoComAtividade,
} from '@/lib/feedAtividade';
import { FILTROS_VAZIOS, temFiltroAtivo, type FeedFiltros } from '@/lib/feedFiltros';
import { cn } from '@/lib/utils';

interface FeedBarraDeAtividadeProps {
  atividade: AtividadeDoFeed;
  filtros: FeedFiltros;
  onFiltrosChange: (filtros: FeedFiltros) => void;
}

/**
 * Clientes com fala nova em cima, o resto recolhido embaixo, e cada linha é
 * também o filtro para ir até lá. A lista é congelada enquanto se lê (ver
 * `useAtividadeDoFeedController`).
 */
export function FeedBarraDeAtividade({
  atividade,
  filtros,
  onFiltrosChange,
}: FeedBarraDeAtividadeProps) {
  const { clientes, carregando, desatualizada, atualizar, marcarTudo, marcandoTudo } = atividade;
  const { novidade, resto } = partirPorNovidade(clientes);
  const [restoAberto, setRestoAberto] = useState(false);
  const totalNovo = contarNovos(clientes);

  const irParaCliente = (cliente: ClienteComAtividade) => {
    // Filtrar pela sentinela devolveria feed vazio: no banco esses projetos têm
    // cliente NULO. A linha só expande; quem filtra são os projetos de dentro.
    if (cliente.clienteId === CLIENTE_SEM_CADASTRO) return;
    const jaEstava = filtros.clienteId === cliente.clienteId && !filtros.projetoId;
    onFiltrosChange({
      ...filtros,
      clienteId: jaEstava ? null : cliente.clienteId,
      projetoId: null,
    });
  };

  const irParaProjeto = (cliente: ClienteComAtividade, projeto: ProjetoComAtividade) => {
    const jaEstava = filtros.projetoId === projeto.projetoId;
    onFiltrosChange({
      ...filtros,
      clienteId: jaEstava || cliente.clienteId === CLIENTE_SEM_CADASTRO ? null : cliente.clienteId,
      projetoId: jaEstava ? null : projeto.projetoId,
    });
  };

  return (
    <aside className="hidden min-h-0 w-64 shrink-0 lg:block xl:w-72 2xl:w-80">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-superficie-cartao">
        <header className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-tool-icon-bg text-tool-icon">
            <FolderKanban aria-hidden className="h-3.5 w-3.5" />
          </span>
          <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold">
            Atividade dos projetos
          </h2>
          {totalNovo > 0 && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-primary-foreground">
              {totalNovo}
            </span>
          )}
          {temFiltroAtivo(filtros) && (
            <ElementTooltip text="Limpar todos os filtros do feed">
              <button
                type="button"
                aria-label="Limpar todos os filtros do feed"
                onClick={() => onFiltrosChange(FILTROS_VAZIOS)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <FilterX aria-hidden className="h-3.5 w-3.5" />
              </button>
            </ElementTooltip>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {carregando ? (
            <BarraCarregando />
          ) : clientes.length === 0 ? (
            <p className="px-1.5 py-6 text-center text-xs text-muted-foreground">
              Nenhum projeto se mexeu nos últimos 30 dias.
            </p>
          ) : (
            <>
              <Secao titulo="Desde a sua última visita" />
              {novidade.length === 0 ? (
                <p className="px-1.5 pb-2 text-xs leading-relaxed text-muted-foreground">
                  Nada novo. Você está em dia com os projetos que acompanha.
                </p>
              ) : (
                novidade.map((cliente) => (
                  <LinhaDeCliente
                    key={cliente.clienteId}
                    cliente={cliente}
                    filtros={filtros}
                    onCliente={() => irParaCliente(cliente)}
                    onProjeto={(projeto) => irParaProjeto(cliente, projeto)}
                  />
                ))
              )}

              {resto.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setRestoAberto((aberto) => !aberto)}
                    className="mt-1 flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/60"
                  >
                    <ChevronRight
                      aria-hidden
                      className={cn(
                        'h-3 w-3 shrink-0 transition-transform',
                        restoAberto && 'rotate-90',
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">Sem novidade · {resto.length}</span>
                  </button>
                  {restoAberto &&
                    resto.map((cliente) => (
                      <LinhaDeCliente
                        key={cliente.clienteId}
                        cliente={cliente}
                        filtros={filtros}
                        onCliente={() => irParaCliente(cliente)}
                        onProjeto={(projeto) => irParaProjeto(cliente, projeto)}
                      />
                    ))}
                </>
              )}
            </>
          )}
        </div>

        <footer className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
          {desatualizada && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 flex-1 justify-start px-1.5 text-[11px] text-primary"
              onClick={atualizar}
            >
              <RefreshCw aria-hidden className="mr-1.5 h-3 w-3" />
              Há movimento novo
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-1.5 text-[11px] text-muted-foreground',
              !desatualizada && 'flex-1 justify-start',
            )}
            disabled={marcandoTudo || totalNovo === 0}
            onClick={marcarTudo}
          >
            <CheckCheck aria-hidden className="mr-1.5 h-3 w-3" />
            {desatualizada ? 'Tudo visto' : 'Marcar tudo como visto'}
          </Button>
        </footer>
      </div>
    </aside>
  );
}

function Secao({ titulo }: { titulo: string }) {
  return (
    <p className="px-1.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {titulo}
    </p>
  );
}

interface LinhaDeClienteProps {
  cliente: ClienteComAtividade;
  filtros: FeedFiltros;
  onCliente: () => void;
  onProjeto: (projeto: ProjetoComAtividade) => void;
}

/** A seta e o nome são botões separados: expandir não deve arrastar o filtro. */
function LinhaDeCliente({ cliente, filtros, onCliente, onProjeto }: LinhaDeClienteProps) {
  const [aberto, setAberto] = useState(false);
  const selecionado = filtros.clienteId === cliente.clienteId && !filtros.projetoId;
  const semCadastro = cliente.clienteId === CLIENTE_SEM_CADASTRO;
  // `novos` diz onde a linha fica, `novosAgora` o que ela mostra: ver
  // `aplicarLeituraDaSessao`.
  const temNovidade = cliente.novosAgora > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center rounded-md transition-colors',
          selecionado ? 'bg-primary/15' : 'hover:bg-muted/60',
        )}
      >
        <button
          type="button"
          aria-label={aberto ? 'Recolher projetos' : 'Ver projetos'}
          aria-expanded={aberto}
          onClick={() => setAberto((estava) => !estava)}
          className="grid h-7 w-6 shrink-0 place-items-center rounded-l-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight
            aria-hidden
            className={cn('h-3.5 w-3.5 transition-transform', aberto && 'rotate-90')}
          />
        </button>

        <button
          type="button"
          onClick={onCliente}
          disabled={semCadastro}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left disabled:cursor-default"
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[12.5px] leading-tight',
              temNovidade ? 'font-semibold text-foreground' : 'text-foreground/75',
            )}
          >
            {cliente.nome}
          </span>
          {temNovidade ? (
            <ElementTooltip text={`${rotuloDeNovas(cliente.novosAgora)} desde a sua última visita`}>
              <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums text-primary">
                <Circle aria-hidden className="h-1.5 w-1.5 fill-current" />
                {cliente.novosAgora}
              </span>
            </ElementTooltip>
          ) : (
            <ElementTooltip
              text={
                cliente.novos > 0
                  ? 'Lido agora. A linha fica onde está até você voltar ao feed.'
                  : `${rotuloDeAtualizacoes(cliente.total)} nos últimos 30 dias`
              }
            >
              <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                {cliente.novos > 0 ? <Check aria-hidden className="h-3 w-3" /> : cliente.total}
              </span>
            </ElementTooltip>
          )}
        </button>
      </div>

      {aberto && (
        <ul className="ml-3 border-l border-border/70 pl-1">
          {cliente.projetos.map((projeto) => {
            const projetoSelecionado = filtros.projetoId === projeto.projetoId;
            return (
              <li key={projeto.projetoId}>
                <button
                  type="button"
                  onClick={() => onProjeto(projeto)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-md py-1 pl-2 pr-2 text-left transition-colors',
                    projetoSelecionado ? 'bg-primary/15' : 'hover:bg-muted/60',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
                    {projeto.nome}
                  </span>
                  <span
                    className={cn(
                      'flex shrink-0 items-center text-[10.5px] tabular-nums',
                      projeto.novosAgora > 0
                        ? 'font-semibold text-primary'
                        : 'text-muted-foreground',
                    )}
                  >
                    {projeto.novosAgora > 0 ? (
                      projeto.novosAgora
                    ) : projeto.novos > 0 ? (
                      <Check aria-hidden className="h-2.5 w-2.5" />
                    ) : (
                      projeto.total
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BarraCarregando() {
  return (
    <div className="space-y-2 py-1">
      {[0, 1, 2, 3].map((linha) => (
        <div key={linha} className="flex items-center gap-2 px-1.5">
          <Skeleton className="h-3 w-3 rounded-sm" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-4" />
        </div>
      ))}
    </div>
  );
}
