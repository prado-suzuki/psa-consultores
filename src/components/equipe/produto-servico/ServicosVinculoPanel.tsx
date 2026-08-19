import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Check, Pencil, Plus, RefreshCw, Search, Sparkles, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FiltroVinculo, GrupoCluster } from '@/lib/produtoServicoVinculo';
import type { ProdutoSegmento, ServicoPrestado } from '@/hooks/useCategorias';

export type ServicoComVinculo = ServicoPrestado & { vinculado: boolean; salvando: boolean };

export interface FiltroServicos {
  busca: string;
  modo: FiltroVinculo;
}

export interface ResumoServicos {
  /** Serviços vinculados ao produto (independente do filtro). */
  vinculados: number;
  /** Total de serviços cadastrados. */
  total: number;
  /** Visíveis que ainda não estão vinculados. */
  faltamVincular: number;
  /** Visíveis que já estão vinculados (candidatos ao desvincular em lote). */
  podeDesvincular: number;
}

export interface AcoesServicos {
  onAlternarVinculo: (servico: ServicoPrestado) => void;
  onLote: (acao: 'vincular' | 'desvincular') => void;
  onNovo: () => void;
  onEditar: (servico: ServicoPrestado) => void;
  onExcluir: (servico: ServicoPrestado) => void;
}

interface ServicosVinculoPanelProps {
  produto: ProdutoSegmento | null;
  grupos: GrupoCluster<ServicoComVinculo>[];
  resumo: ResumoServicos;
  filtro: FiltroServicos;
  onFiltroChange: (patch: Partial<FiltroServicos>) => void;
  loteEmAndamento: boolean;
  acoes: AcoesServicos;
}

const MODOS: { valor: FiltroVinculo; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'vinculados', rotulo: 'Vinculados' },
  { valor: 'disponiveis', rotulo: 'Disponíveis' },
];

/** Coluna direita: cadastro dos serviços e marcação de quais valem para o produto selecionado. */
export default function ServicosVinculoPanel({
  produto,
  grupos,
  resumo,
  filtro,
  onFiltroChange,
  loteEmAndamento,
  acoes,
}: ServicosVinculoPanelProps) {
  const [confirmarDesvincular, setConfirmarDesvincular] = useState(false);
  const totalVisivel = grupos.reduce((soma, g) => soma + g.items.length, 0);

  if (!produto) {
    return (
      <Card className="flex h-[540px] flex-col items-center justify-center gap-3 border-slate-200/60">
        <p className="text-sm text-slate-400">Selecione um produto para editar os serviços</p>
        <Button size="sm" variant="outline" onClick={acoes.onNovo}>
          <Plus className="mr-1 h-3.5 w-3.5" />Novo serviço
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/60 overflow-hidden">
      <div className="border-b border-slate-200/70 bg-slate-50/60 p-3 space-y-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-slate-500">{produto.codigo || '—'}</span>
          <span className="text-sm font-semibold text-slate-900">{produto.nome || '(sem nome)'}</span>
          {produto.estrutura_clusters?.name && (
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              {produto.estrutura_clusters.name}
            </span>
          )}
          {!produto.is_active && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">inativo</span>
          )}
          <span className="ml-auto text-xs text-slate-500">
            <strong className="font-semibold text-teal-700">{resumo.vinculados}</strong> de {resumo.total} serviços vinculados
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={filtro.busca}
              onChange={e => onFiltroChange({ busca: e.target.value })}
              placeholder="Buscar serviço..."
              className="h-8 bg-white pl-8 text-sm"
              aria-label="Buscar serviço"
            />
          </div>

          <div className="inline-flex rounded-md bg-slate-100 p-0.5">
            {MODOS.map(modo => (
              <button
                key={modo.valor}
                type="button"
                onClick={() => onFiltroChange({ modo: modo.valor })}
                aria-pressed={filtro.modo === modo.valor}
                className={cn(
                  'rounded px-2.5 py-1 text-xs transition-colors',
                  filtro.modo === modo.valor
                    ? 'bg-teal-500/10 font-medium text-teal-700'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {modo.rotulo}
              </button>
            ))}
          </div>

          <Button size="sm" variant="ghost" className="h-8 shrink-0 text-xs text-teal-700 hover:bg-teal-500/10" onClick={acoes.onNovo}>
            <Plus className="mr-1 h-3 w-3" />Novo serviço
          </Button>
        </div>

        {(resumo.faltamVincular > 0 || resumo.podeDesvincular > 0) && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {resumo.faltamVincular > 0 && (
              <button
                type="button"
                disabled={loteEmAndamento}
                onClick={() => acoes.onLote('vincular')}
                className="inline-flex items-center gap-1 text-teal-700 hover:underline disabled:opacity-50"
              >
                {loteEmAndamento
                  ? <RefreshCw className="h-3 w-3 animate-spin" />
                  : <Check className="h-3 w-3" />}
                Vincular os {resumo.faltamVincular} visíveis
              </button>
            )}
            {resumo.podeDesvincular > 0 && (
              <button
                type="button"
                disabled={loteEmAndamento}
                onClick={() => setConfirmarDesvincular(true)}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-red-600 hover:underline disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                Desvincular os {resumo.podeDesvincular} visíveis
              </button>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="h-[460px]">
        {totalVisivel === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            {filtro.modo === 'vinculados'
              ? 'Este produto ainda não tem serviços vinculados'
              : filtro.busca
                ? 'Nenhum serviço encontrado'
                : 'Nenhum serviço cadastrado'}
          </p>
        ) : (
          grupos.map(grupo => (
            <div key={grupo.key}>
              {grupos.length > 1 && (
              <div className="sticky top-0 z-10 flex items-center gap-2 border-y border-slate-100 bg-slate-50/95 px-3 py-1.5 backdrop-blur">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{grupo.nome}</span>
                {grupo.sugerido && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-teal-700">
                    <Sparkles className="h-2.5 w-2.5" />mesmo cluster
                  </span>
                )}
                {grupo.inativo && <span className="text-[11px] text-slate-400">(cluster inativo)</span>}
                <span className="ml-auto text-[11px] text-slate-400">
                  {grupo.items.filter(s => s.vinculado).length}/{grupo.items.length}
                </span>
              </div>
              )}
              <ul className="p-1">
                {grupo.items.map(servico => (
                  <li
                    key={servico.id}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-colors',
                      servico.vinculado ? 'bg-teal-500/5 hover:bg-teal-500/10' : 'hover:bg-slate-50',
                      servico.salvando && 'opacity-60',
                    )}
                  >
                    <Checkbox
                      id={`servico-${servico.id}`}
                      checked={servico.vinculado}
                      disabled={servico.salvando || loteEmAndamento}
                      onCheckedChange={() => acoes.onAlternarVinculo(servico)}
                    />
                    <label
                      htmlFor={`servico-${servico.id}`}
                      className={cn(
                        'flex-1 cursor-pointer text-sm leading-snug',
                        servico.vinculado ? 'font-medium text-slate-800' : 'text-slate-600',
                      )}
                    >
                      {servico.nome}
                    </label>
                    {servico.salvando && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-slate-400 transition-opacity hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      aria-label={`Editar ${servico.nome}`}
                      onClick={() => acoes.onEditar(servico)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-slate-400 transition-opacity hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      aria-label={`Excluir ${servico.nome}`}
                      onClick={() => acoes.onExcluir(servico)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </ScrollArea>

      <AlertDialog open={confirmarDesvincular} onOpenChange={setConfirmarDesvincular}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desvincular {resumo.podeDesvincular} serviço(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Os serviços visíveis deixam de estar disponíveis para projetos de
              "{produto.codigo} — {produto.nome}". Você pode vinculá-los de novo depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => acoes.onLote('desvincular')}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desvincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
