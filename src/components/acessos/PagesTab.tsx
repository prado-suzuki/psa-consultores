import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search } from 'lucide-react';
import AbasDeGrupo, { type GrupoAba } from '@/components/shared/AbasDeGrupo';
import {
  usePagePermissions,
  useTogglePagePermission,
  type PagePermission,
} from '@/hooks/usePagePermissions';
import { useSyncProtectedPages } from '@/hooks/useSyncProtectedPages';
import {
  getDisplayPath,
  getGroupColor,
  getGroupKey,
  getGroupLabel,
} from './pageCategoryStyles';

const TODAS = '__todas__';

/** Minúsculas sem acento, para a busca tolerar o que o usuário digita. */
const normalizar = (valor: string) =>
  valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Aba"Páginas" do Controle de Acessos.
 *
 * Lista todas as páginas registradas em `page_permissions`, navegando por
 * categoria em abas — antes as categorias vinham empilhadas, e ver a última
 * exigia rolar por todas as anteriores. A busca varre todas as categorias de
 * propósito: senão a página de outra aba"não existiria".
 *
 * Autossuficiente: usa os hooks de dados diretamente, sem props.
 */
export const PagesTab = () => {
  const { data: pages, isLoading: loadingPages } = usePagePermissions();
  const togglePageMutation = useTogglePagePermission();
  const { syncPages, isSyncing } = useSyncProtectedPages();
  const [categoria, setCategoria] = useState<string>('');
  const [busca, setBusca] = useState('');

  const groupedPages = useMemo(() => {
    const grouped = (pages ?? []).reduce<Record<string, PagePermission[]>>((acc, page) => {
      const key = getGroupKey(page.category);
      (acc[key] ??= []).push(page);
      return acc;
    }, {});
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) =>
        getDisplayPath(a.category, a.page_path).localeCompare(
          getDisplayPath(b.category, b.page_path)
        )
      );
    }
    return grouped;
  }, [pages]);

  const chaves = useMemo(
    () => Object.keys(groupedPages).sort((a, b) => getGroupLabel(a).localeCompare(getGroupLabel(b), 'pt-BR')),
    [groupedPages],
  );

  const abas = useMemo<GrupoAba[]>(() => [
    ...chaves.map(key => ({ key, label: getGroupLabel(key), total: groupedPages[key].length })),
    { key: TODAS, label: 'Todas', total: pages?.length ?? 0 },
  ], [chaves, groupedPages, pages]);

  // Sem escolha do usuário (ou categoria que sumiu), abre na primeira.
  const categoriaAtiva = categoria === TODAS || chaves.includes(categoria)
    ? categoria
    : chaves[0] ?? TODAS;

  const buscando = busca.trim().length > 0;

  const visiveis = useMemo(() => {
    const termo = normalizar(busca);
    const base = buscando || categoriaAtiva === TODAS
      ? chaves.flatMap(key => groupedPages[key])
      : groupedPages[categoriaAtiva] ?? [];
    if (!termo) return base;
    return base.filter(page => normalizar(
      `${page.page_name} ${page.page_description || ''} ${getDisplayPath(page.category, page.page_path)}`,
    ).includes(termo));
  }, [busca, buscando, categoriaAtiva, chaves, groupedPages]);

  // Com busca ou em"Todas", a categoria de cada linha deixa de ser óbvia.
  const mostrarCategoriaNaLinha = buscando || categoriaAtiva === TODAS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-base font-medium text-slate-900">Páginas Cadastradas</h3>
          <p className="text-sm text-slate-500">Atualize para ver novas páginas implementadas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar em todas as categorias..."
              className="h-9 w-64 bg-white pl-8 text-sm"
              aria-label="Buscar página"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncPages()}
            disabled={loadingPages || isSyncing}
            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loadingPages || isSyncing ? 'animate-spin' : ''}`}
            />
            {isSyncing ? 'Sincronizando...' : 'Atualizar lista'}
          </Button>
        </div>
      </div>

      {loadingPages ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardHeader className="pb-3">
            <AbasDeGrupo
              grupos={abas}
              selecionado={categoriaAtiva}
              onSelecionar={setCategoria}
              inativo={buscando}
            />
            <p className="pt-2 text-xs text-slate-500">
              {buscando
                ? `${visiveis.length} página(s) encontradas em todas as categorias`
                : `${visiveis.length} página(s)`}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200 hover:bg-transparent">
                  <TableHead className="text-slate-600 bg-slate-50">Página</TableHead>
                  {mostrarCategoriaNaLinha && (
                    <TableHead className="text-slate-600 bg-slate-50">Categoria</TableHead>
                  )}
                  <TableHead className="text-slate-600 bg-slate-50">Caminho</TableHead>
                  <TableHead className="text-slate-600 bg-slate-50">Requisitos</TableHead>
                  <TableHead className="text-slate-600 bg-slate-50 text-right">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiveis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={mostrarCategoriaNaLinha ? 5 : 4} className="py-8 text-center text-slate-400">
                      Nenhuma página encontrada
                    </TableCell>
                  </TableRow>
                ) : visiveis.map((page) => (
                  <TableRow key={page.id} className="border-slate-200 hover:bg-slate-50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">{page.page_name}</p>
                        {page.page_description && (
                          <p className="text-xs text-slate-500">{page.page_description}</p>
                        )}
                      </div>
                    </TableCell>
                    {mostrarCategoriaNaLinha && (
                      <TableCell>
                        <Badge className={getGroupColor(getGroupKey(page.category))}>
                          {getGroupLabel(getGroupKey(page.category))}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-slate-600 font-mono text-xs">
                      {getDisplayPath(page.category, page.page_path)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {page.requires_admin && (
                          <Badge
                            variant="outline"
                            className="text-xs border-red-200 text-red-600 bg-red-50"
                          >
                            Admin
                          </Badge>
                        )}
                        {page.requires_team_member && (
                          <Badge
                            variant="outline"
                            className="text-xs border-primary/20 text-primary bg-primary/5"
                          >
                            Team
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={page.is_active}
                        onCheckedChange={(checked) =>
                          togglePageMutation.mutate({ id: page.id, isActive: checked })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
