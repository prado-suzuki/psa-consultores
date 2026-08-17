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
import AbasDeGrupo from '@/components/shared/AbasDeGrupo';
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
        {/* Abas de cluster — mesmo componente das demais listas agrupadas. */}
        <div className="flex items-end justify-between gap-2 px-3 pt-3">
          <AbasDeGrupo
            grupos={abas.map(aba => ({
              key: aba.key, label: aba.nome, total: aba.total, atenuado: aba.inativo,
            }))}
            selecionado={filtro.cluster}
            onSelecionar={cluster => onFiltroChange({ cluster })}
            inativo={buscando}
          />
          <Button size="sm" variant="ghost" className="mb-1 h-7 shrink-0 text-xs text-teal-700 hover:bg-teal-500/10" onClick={acoes.onNovo}>
            <Plus className="mr-1 h-3 w-3" />Novo
          </Button>
        </div>

        <div className="flex items-center gap-1.5 p-3">
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
              title={`${totalSemVinculo} produto(s) sem serviço vinculado — clique para filtrar`}
              className={cn(
                'inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-xs transition-colors',
                filtro.apenasSemVinculo
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-amber-600 hover:bg-amber-50',
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />{totalSemVinculo}
            </button>
          )}
          <button
            type="button"
            onClick={() => onFiltroChange({ incluirInativos: !filtro.incluirInativos })}
            aria-pressed={filtro.incluirInativos}
            title="Incluir produtos inativos"
            className={cn(
              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
              filtro.incluirInativos
                ? 'bg-slate-200 text-slate-700'
                : 'text-slate-400 hover:bg-slate-100',
            )}
          >
            <Power className="h-3.5 w-3.5" />
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
                {podeRecolher && (
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
                )}
                {!recolhido && (
                  <ul className="p-1">
                    {grupo.items.map(produto => {
                      const selecionado = produto.id === selecionadoId;
                      const semVinculo = produto.totalVinculos === 0;
                      return (
                        <li
                          key={produto.id}
                          className={cn(
                            'group flex items-start rounded-md',
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
                            <span
                              className={cn(
                                'mt-0.5 shrink-0 text-[11px] tabular-nums',
                                semVinculo ? 'text-amber-600' : selecionado ? 'text-teal-700' : 'text-slate-400',
                              )}
                              title={semVinculo
                                ? 'Sem serviço vinculado: nenhum projeto pode ser cadastrado para este produto'
                                : `${produto.totalVinculos} serviço(s) vinculado(s)`}
                            >
                              {produto.totalVinculos}
                            </span>
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="mt-1 h-7 w-7 shrink-0 text-slate-400 transition-opacity hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:data-[state=open]:opacity-100"
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
