import { Fragment, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  useClientesFiltrados,
  useContribuintesExpand,
  useOsExpand,
} from '@/hooks/useGestaoClientes';
import {
  SITUACAO_PROJETO_OPTIONS,
  formatCurrencyDisplay,
  isoToMasked,
} from '@/components/equipe/client-form/constants';
import { useDeleteCliente } from '@/hooks/useDeleteCliente';
import { useClusterIdByPageCategory } from '@/hooks/useTaxReferenceData';
import type { AreaKey } from '@/config/areaCategories';
import NewClientModal from '@/components/equipe/NewClientModal';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import ClientesFilterBar, {
  type ClientesFilterField,
} from '@/components/equipe/clientes/ClientesFilterBar';

/* ── Painel expandido: título de seção + estados ── */
const SubSectionTitle = ({ label, count }: { label: string; count?: number }) => (
  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    {label}
    {count != null && ` (${count})`}
  </p>
);

const SubSectionPlaceholder = ({
  loading,
  text,
  area,
}: {
  loading?: boolean;
  text: string;
  area?: AreaKey;
}) => (
  <p className="flex items-center gap-2 text-sm text-muted-foreground">
    {loading && <AreaLoader area={area} size={20} />}
    {text}
  </p>
);

const SITUACAO_PILL: Record<string, string> = {
  em_andamento: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  concluido: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  suspenso: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  cancelado: 'bg-destructive/10 text-destructive',
};

/* ── Seção expandida: OS + produtos contratados ── */
const OsExpandSection = ({ clienteId, area }: { clienteId: string; area?: AreaKey }) => {
  const { data, isLoading } = useOsExpand(clienteId);

  return (
    <section>
      <SubSectionTitle label="OS - Ordem de Serviço" count={data?.length} />
      {isLoading ? (
        <SubSectionPlaceholder loading text="Carregando OS…" area={area} />
      ) : !data?.length ? (
        <SubSectionPlaceholder text="Nenhuma OS cadastrada" />
      ) : (
        <ul className="space-y-2">
          {data.map((os) => {
            const situacao =
              SITUACAO_PROJETO_OPTIONS.find((o) => o.value === os.situacao)?.label || os.situacao;
            const inicio = isoToMasked(os.data_inicio || '');
            const fim = isoToMasked(os.data_fim || '');
            const meta = [
              inicio || fim ? `${inicio || '—'} a ${fim || '—'}` : null,
              os.setor_cliente,
            ]
              .filter(Boolean)
              .join('  ·  ');
            return (
              <li key={os.id} className="rounded-lg border border-border/70 bg-card px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                      OS {os.numero_os || '—'}
                    </span>
                    {situacao && (
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-sm font-medium',
                          SITUACAO_PILL[os.situacao ?? ''] || 'bg-muted text-muted-foreground',
                        )}
                      >
                        {situacao}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrencyDisplay(os.valor_projeto ?? 0)}
                  </span>
                </div>
                {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/50 pt-2.5">
                  {os.produtos.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Sem produtos contratados</span>
                  ) : (
                    os.produtos.map((p) => (
                      <span
                        key={p.id}
                        className="rounded-md bg-muted px-2 py-0.5 text-sm text-foreground"
                      >
                        {p.label}
                        {p.horas_contratadas != null && ` (${p.horas_contratadas}h)`}
                      </span>
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

/* ── Seção expandida: contribuintes ── */
const ContribuintesExpandSection = ({
  clienteId,
  area,
}: {
  clienteId: string;
  area?: AreaKey;
}) => {
  const { data, isLoading } = useContribuintesExpand(clienteId);

  return (
    <section>
      <SubSectionTitle label="Contribuintes" count={data?.length} />
      {isLoading ? (
        <SubSectionPlaceholder loading text="Carregando contribuintes…" area={area} />
      ) : !data?.length ? (
        <SubSectionPlaceholder text="Nenhum contribuinte cadastrado" />
      ) : (
        <ul className="space-y-2">
          {data.map((c) => {
            const meta = [
              c.inscricao_estadual ? `IE ${c.inscricao_estadual}` : null,
              c.simples_nacional == null ? null : `Simples: ${c.simples_nacional ? 'Sim' : 'Não'}`,
            ]
              .filter(Boolean)
              .join('  ·  ');
            return (
              <li key={c.id} className="rounded-lg border border-border/70 bg-card px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-sm font-medium text-foreground">{c.nome_razao_social}</span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {c.cpf_cnpj || '—'}
                  </span>
                </div>
                {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const ITEMS_PER_PAGE = 10;

const GestaoClientes = ({ area = 'tax' as AreaKey }: { area?: AreaKey } = {}) => {
  const { isAdmin, isLider, isSublider } = useAuth();
  const canEdit = isAdmin || isLider || isSublider;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de cadastro completo (usado para criar, editar e visualizar)
  const [novoClienteModalOpen, setNovoClienteModalOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [deletingCliente, setDeletingCliente] = useState<{ id: string; nome: string } | null>(null);
  const [expandedClienteId, setExpandedClienteId] = useState<string | null>(null);

  // Hooks centralizados
  const { data: clusterId } = useClusterIdByPageCategory(area);
  const { data: resultados = [], isLoading } = useClientesFiltrados(
    { clienteId: '', status, tipo, categoria, nomeRazaoSocial: '' },
    true,
    clusterId ?? undefined,
    area === 'tax',
  );
  const deleteMutation = useDeleteCliente();

  // Busca por nome (client-side, ao vivo) sobre os resultados já carregados
  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resultados;
    return resultados.filter((c) => (c.nome ?? '').toLowerCase().includes(q));
  }, [resultados, search]);

  // Reset página quando os resultados filtrados mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredResults]);

  // Paginação da tabela principal
  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    return filteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredResults, currentPage]);

  const setFilter = (field: ClientesFilterField, val: string) => {
    switch (field) {
      case 'search':
        setSearch(val);
        break;
      case 'status':
        setStatus(val);
        break;
      case 'tipo':
        setTipo(val);
        break;
      case 'categoria':
        setCategoria(val);
        break;
    }
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    setTipo('');
    setCategoria('');
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCliente) return;
    deleteMutation.mutate(deletingCliente, {
      onSettled: () => setDeletingCliente(null),
    });
  };

  const handleClienteClick = (cliente: { id: string }) => {
    setEditingClienteId(cliente.id);
    setViewMode(true);
    setNovoClienteModalOpen(true);
  };

  const formatStatus = (ativo: boolean | null) => {
    if (ativo === null || ativo === undefined) return '-';
    return ativo ? (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="h-2 w-2 rounded-full bg-success" />
        Ativo
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        Inativo
      </span>
    );
  };

  const formatTipo = (fixo: string | null) => {
    if (!fixo) return '-';
    return fixo === 'Sim'
      ? 'Fixo'
      : fixo === 'Não'
        ? 'Pontual'
        : fixo === 'Em Análise'
          ? 'Em Análise'
          : '-';
  };

  const content = (
    <div className="space-y-3">
      {/* Barra de Filtros (com ação "Novo cliente") */}
      <ClientesFilterBar
        value={{ search, status, tipo, categoria }}
        onChange={setFilter}
        onClear={handleClear}
        resultCount={filteredResults.length}
        canCreate={canEdit}
        onNewCliente={() => {
          setEditingClienteId(null);
          setViewMode(false);
          setNovoClienteModalOpen(true);
        }}
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-border/70 bg-card text-primary">
          <AreaLoader area={area} size={56} />
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card text-muted-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Users className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-foreground">Nenhum cliente encontrado</span>
          <span className="text-xs">Tente ajustar os filtros da busca.</span>
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="h-0.5 bg-primary" />
          <Table className="min-w-[1100px]" containerClassName="scrollbar-thin">
            <TableHeader className="bg-muted/35">
              <TableRow className="border-border/70 hover:bg-transparent">
                <TableHead className="h-11 w-10 px-2" />
                <TableHead className="h-11 min-w-[240px] px-4 text-xs uppercase tracking-[0.12em]">
                  Cliente
                </TableHead>
                <TableHead className="h-11 w-20 px-4 text-center text-xs uppercase tracking-[0.12em]">
                  OS
                </TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em]">
                  Status
                </TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em]">
                  Tipo
                </TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em]">
                  Telefone
                </TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em]">
                  Setor
                </TableHead>
                <TableHead className="h-11 px-4 text-xs uppercase tracking-[0.12em]">
                  Clusters
                </TableHead>
                {canEdit && (
                  <TableHead className="h-11 w-14 px-4 text-right text-xs uppercase tracking-[0.12em]">
                    Ações
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.map((row) => {
                const isExpanded = expandedClienteId === row.id;
                const totalCols = canEdit ? 9 : 8;
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className="group cursor-pointer border-border/50 transition-colors hover:bg-primary/[0.045]"
                      onClick={() => handleClienteClick({ id: row.id })}
                    >
                      <TableCell className="w-10 px-2 py-3">
                        <button
                          type="button"
                          aria-label={
                            isExpanded ? 'Recolher contribuintes' : 'Exibir contribuintes'
                          }
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedClienteId(isExpanded ? null : row.id);
                          }}
                        >
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition-transform duration-200',
                              isExpanded && 'rotate-90',
                            )}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold uppercase text-primary">
                            {(row.nome || '?').trim().slice(0, 2)}
                          </span>
                          <span className="truncate font-medium text-foreground">
                            {row.nome || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex h-6 min-w-6 items-center justify-center rounded-md px-2 text-xs font-semibold',
                            row._osCount > 0
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted/60 text-muted-foreground',
                          )}
                          title={`${row._osCount} OS cadastrada${row._osCount === 1 ? '' : 's'}`}
                        >
                          {row._osCount}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">{formatStatus(row.ativo)}</TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {formatTipo(row.fixo)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {row.telefone || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                        {row.setor_cliente || '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {row._clusters && row._clusters.length > 0 ? (
                          row._clusters.map((name: string) => (
                            <Badge
                              key={name}
                              variant="secondary"
                              className="mr-1 h-6 rounded-md px-2 text-xs font-medium"
                            >
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground opacity-60 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                            aria-label={`Excluir ${row.nome || 'cliente'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isAdmin) {
                                toast.warning(
                                  'Você não tem permissão para excluir clientes/contribuintes, fale com a equipe Digital para realizar essa operação',
                                );
                                return;
                              }
                              setDeletingCliente({ id: row.id, nome: row.nome || 'Sem nome' });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="border-border/50 bg-muted/10 hover:bg-muted/10">
                        <TableCell colSpan={totalCols} className="p-0">
                          <div className="space-y-4 bg-muted/25 px-4 py-3.5 md:pl-16 md:pr-6">
                            <OsExpandSection clienteId={row.id} area={area} />
                            <ContribuintesExpandSection clienteId={row.id} area={area} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-2.5">
              <span className="text-sm text-muted-foreground">
                Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredResults.length)} de{' '}
                {filteredResults.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de Cadastro Completo (Novo, Editar e Visualizar Cliente) */}
      <NewClientModal
        area={area}
        open={novoClienteModalOpen}
        onOpenChange={(v) => {
          setNovoClienteModalOpen(v);
          if (!v) {
            setEditingClienteId(null);
            setViewMode(false);
          }
        }}
        editingClienteId={editingClienteId}
        readOnly={viewMode}
        canEdit={canEdit}
      />

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog
        open={!!deletingCliente}
        onOpenChange={(open) => {
          if (!open) setDeletingCliente(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{deletingCliente?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <AreaLoader area={area} size={18} className="mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return content;
};

export { GestaoClientes as GestaoClientesContent };
export default GestaoClientes;
