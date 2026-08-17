import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle, ChevronDown, ChevronRight, MoreVertical, Pencil, Plus, Power,
  RefreshCw, Search, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GrupoCluster } from '@/lib/produtoServicoVinculo';
import type { ProdutoSegmento } from '@/hooks/useCategorias';

export type ProdutoComVinculos = ProdutoSegmento & { totalVinculos: number };

export interface ChipCluster {
  key: string;
  nome: string;
  inativo: boolean;
  total: number;
}

export interface FiltroProdutos {
  busca: string;
  cluster: string;
  incluirInativos: boolean;
  apenasSemVinculo: boolean;
}

export interface AcoesProdutos {
  onSelecionar: (produtoId: string) => void;
  onNovo: () => void;
  onEditar: (produto: ProdutoComVinculos) => void;
  onAlternarAtivo: (produto: ProdutoComVinculos) => void;
  onExcluir: (produto: ProdutoComVinculos) => void;
}

interface ProdutosVinculoPanelProps {
  grupos: GrupoCluster<ProdutoComVinculos>[];
  /** Abas de cluster: "Todos" + um por cluster com produto. */
  abas: ChipCluster[];
  filtro: FiltroProdutos;
  onFiltroChange: (patch: Partial<FiltroProdutos>) => void;
  selecionadoId: string | null;
  totalSemVinculo: number;
  carregando: boolean;
  acoes: AcoesProdutos;
}

/**
 * Coluna esquerda: cadastro dos produtos, navegando por cluster em abas para
 * não virar lista corrida. Na aba "Todos" cada cluster pode ser recolhido.
 */
export default function ProdutosVinculoPanel({
  grupos,
  abas,
  filtro,
  onFiltroChange,
  selecionadoId,
  totalSemVinculo,
  carregando,
  acoes,
}: ProdutosVinculoPanelProps) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const totalVisivel = grupos.reduce((soma, g) => soma + g.items.length, 0);
  const buscando = filtro.busca.trim().length > 0;
  // Só faz sentido recolher quando há mais de um cluster na tela.
  const podeRecolher = grupos.length > 1;

  const alternarGrupo = (key: string) => setRecolhidos(atual => {
    const proximo = new Set(atual);
    if (proximo.has(key)) proximo.delete(key);
    else proximo.add(key);
    return proximo;
  });

  return (
    <Card className="border-slate-200/60 overflow-hidden">
      <div className="border-b border-slate-200/70 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2 px-3 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Produtos <span className="ml-1 font-normal normal-case text-slate-400">{totalVisivel}</span>
          </span>
          <Button size="sm" variant="outline" className="h-7 bg-white text-xs" onClick={acoes.onNovo}>
            <Plus className="mr-1 h-3 w-3" />Novo produto
          </Button>
        </div>

        {/* Abas de cluster */}
        <div className="mt-2 flex gap-1 overflow-x-auto px-3">
          {abas.map(aba => {
            const ativa = !buscando && filtro.cluster === aba.key;
            return (
              <button
                key={aba.key}
                type="button"
                onClick={() => onFiltroChange({ cluster: aba.key })}
                aria-pressed={ativa}
                className={cn(
                  'shrink-0 whitespace-nowrap border-b-2 px-2.5 pb-1.5 text-sm transition-colors',
                  ativa
                    ? 'border-teal-500 font-medium text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                  aba.inativo && !ativa && 'text-slate-400',
                )}
              >
                {aba.nome}
                <span className={cn('ml-1 text-xs', ativa ? 'text-teal-600/70' : 'text-slate-400')}>
                  {aba.total}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={filtro.busca}
              onChange={e => onFiltroChange({ busca: e.target.value })}
              placeholder="Buscar em todos os clusters..."
              className="h-8 bg-white pl-8 text-sm"
              aria-label="Buscar produto"
            />
          </div>
          {totalSemVinculo > 0 && (
            <button
              type="button"
              onClick={() => onFiltroChange({ apenasSemVinculo: !filtro.apenasSemVinculo })}
              aria-pressed={filtro.apenasSemVinculo}
              title="Mostrar só produtos sem serviço vinculado"
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors',
                filtro.apenasSemVinculo
                  ? 'border-amber-300 bg-amber-100 text-amber-800'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
              )}
            >
              <AlertTriangle className="h-3 w-3" />{totalSemVinculo}
            </button>
          )}
          <button
            type="button"
            onClick={() => onFiltroChange({ incluirInativos: !filtro.incluirInativos })}
            aria-pressed={filtro.incluirInativos}
            title="Incluir produtos inativos"
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors',
              filtro.incluirInativos
                ? 'border-slate-300 bg-slate-100 text-slate-600'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50',
            )}
          >
            <Power className="h-3 w-3" />inativos
          </button>
        </div>
      </div>

      <ScrollArea className="h-[460px]">
        {carregando ? (
          <div className="flex justify-center py-10">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : totalVisivel === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-400">
            {buscando
              ? 'Nenhum produto encontrado'
              : filtro.apenasSemVinculo
                ? 'Todos os produtos deste cluster têm serviço vinculado'
                : 'Nenhum produto neste cluster'}
          </p>
        ) : (
          grupos.map(grupo => {
            const recolhido = podeRecolher && recolhidos.has(grupo.key);
            return (
              <div key={grupo.key}>
                <div className="sticky top-0 z-10 border-y border-slate-100 bg-slate-50/95 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => podeRecolher && alternarGrupo(grupo.key)}
                    aria-expanded={!recolhido}
                    className={cn(
                      'flex w-full items-center gap-1.5 px-3 py-1.5 text-left',
                      podeRecolher && 'hover:bg-slate-100/70',
                    )}
                  >
                    {podeRecolher && (recolhido
                      ? <ChevronRight className="h-3 w-3 text-slate-400" />
                      : <ChevronDown className="h-3 w-3 text-slate-400" />)}
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{grupo.nome}</span>
                    {grupo.inativo && <span className="text-[11px] text-slate-400">(cluster inativo)</span>}
                    <span className="ml-auto text-[11px] text-slate-400">{grupo.items.length}</span>
                  </button>
                </div>
                {!recolhido && (
                  <ul className="p-1">
                    {grupo.items.map(produto => {
                      const selecionado = produto.id === selecionadoId;
                      const semVinculo = produto.totalVinculos === 0;
                      return (
                        <li
                          key={produto.id}
                          className={cn(
                            'flex items-start rounded-md',
                            selecionado ? 'bg-teal-500/10' : 'hover:bg-slate-50',
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => acoes.onSelecionar(produto.id)}
                            aria-current={selecionado}
                            className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2 text-left"
                          >
                            <span className={cn(
                              'mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[11px]',
                              selecionado
                                ? 'border-teal-200 bg-white text-teal-700'
                                : 'border-slate-200 bg-slate-50 text-slate-500',
                            )}>
                              {produto.codigo || '—'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className={cn(
                                'block text-sm leading-snug',
                                selecionado ? 'font-medium text-teal-800' : 'text-slate-700',
                                !produto.is_active && 'text-slate-400',
                              )}>
                                {produto.nome || '(sem nome)'}
                              </span>
                              {!produto.is_active && (
                                <span className="text-[11px] text-slate-400">inativo</span>
                              )}
                            </span>
                            {semVinculo ? (
                              <span
                                className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700"
                                title="Sem serviço vinculado: nenhum projeto pode ser cadastrado para este produto"
                              >
                                <AlertTriangle className="h-3 w-3" />0
                              </span>
                            ) : (
                              <span className={cn(
                                'mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                                selecionado ? 'bg-teal-500/15 text-teal-700' : 'bg-slate-100 text-slate-500',
                              )}>
                                {produto.totalVinculos}
                              </span>
                            )}
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="mt-1 h-7 w-7 shrink-0 text-slate-300 hover:text-slate-600"
                                aria-label={`Ações de ${produto.codigo || produto.nome}`}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem onClick={() => acoes.onEditar(produto)}>
                                <Pencil className="mr-2 h-3.5 w-3.5" />Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => acoes.onAlternarAtivo(produto)}>
                                <Power className="mr-2 h-3.5 w-3.5" />
                                {produto.is_active ? 'Desativar' : 'Ativar'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-700"
                                onClick={() => acoes.onExcluir(produto)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>
    </Card>
  );
}
