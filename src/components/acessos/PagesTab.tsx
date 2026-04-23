import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
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

const INITIAL_VISIBLE_PAGES = 5;

/**
 * Aba "Páginas" do Controle de Acessos.
 *
 * Lista todas as páginas registradas em `page_permissions`, agrupadas por
 * categoria, permitindo ativar/desativar cada página e sincronizar com o
 * registro estático em `src/config/protectedPages.ts`.
 *
 * Autossuficiente: usa os hooks de dados diretamente, sem props.
 */
export const PagesTab = () => {
  const { data: pages, isLoading: loadingPages } = usePagePermissions();
  const togglePageMutation = useTogglePagePermission();
  const { syncPages, isSyncing } = useSyncProtectedPages();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState(false);

  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const toggleAllCategories = () => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    const categories = Object.keys(groupedPages);
    const updated: Record<string, boolean> = {};
    categories.forEach((cat) => { updated[cat] = newState; });
    setExpandedCategories(updated);
  };

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

  return (
    <div className="space-y-4">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-medium text-slate-900">Páginas Cadastradas</h3>
          <p className="text-sm text-slate-500">Atualize para ver novas páginas implementadas</p>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(groupedPages).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllCategories}
              className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600"
            >
              <ChevronsUpDown className="h-4 w-4 mr-2" />
              {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncPages()}
            disabled={loadingPages || isSyncing}
            className="bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-teal-600"
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
          <RefreshCw className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      ) : (
        Object.entries(groupedPages).map(([group, groupPages]) => {
          const isExpanded = expandedCategories[group] ?? false;
          const visiblePages = isExpanded
            ? groupPages
            : groupPages.slice(0, INITIAL_VISIBLE_PAGES);
          const hasMore = groupPages.length > INITIAL_VISIBLE_PAGES;
          const remainingCount = groupPages.length - INITIAL_VISIBLE_PAGES;

          return (
            <Card key={group} className="bg-white border-slate-200/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={getGroupColor(group)}>
                    {getGroupLabel(group)}
                  </Badge>
                  <span className="text-xs text-slate-500">{groupPages.length} páginas</span>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className="text-slate-600 bg-slate-50">Página</TableHead>
                      <TableHead className="text-slate-600 bg-slate-50">Caminho</TableHead>
                      <TableHead className="text-slate-600 bg-slate-50">Requisitos</TableHead>
                      <TableHead className="text-slate-600 bg-slate-50 text-right">Ativo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visiblePages.map((page) => (
                      <TableRow key={page.id} className="border-slate-200 hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{page.page_name}</p>
                            {page.page_description && (
                              <p className="text-xs text-slate-500">{page.page_description}</p>
                            )}
                          </div>
                        </TableCell>
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
                                className="text-xs border-teal-200 text-teal-600 bg-teal-50"
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

                {hasMore && (
                  <div className="pt-3 border-t border-slate-200 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-slate-600 hover:text-teal-600 hover:bg-slate-50"
                      onClick={() => toggleCategoryExpansion(group)}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-2" />
                          Ocultar registros
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-2" />
                          Mostrar mais {remainingCount} registros
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
