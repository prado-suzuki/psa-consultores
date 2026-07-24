import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, ChevronLeft, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  useClientesFiltrados,
  useContribuintesExpand,
} from "@/hooks/useGestaoClientes";
import { useDeleteCliente } from "@/hooks/useDeleteCliente";
import { useClusterIdByPageCategory } from "@/hooks/useTaxReferenceData";
import type { AreaKey } from "@/config/areaCategories";
import NewClientModal from "@/components/equipe/NewClientModal";
import ClientesFilterBar, {
  type ClientesFilterField,
} from "@/components/equipe/clientes/ClientesFilterBar";

/* ── Sub-componente: contribuintes expandidos ── */
const ContribuinteSubTable = ({ clienteId }: { clienteId: string }) => {
  const { data, isLoading } = useContribuintesExpand(clienteId);

  if (isLoading) return <div className="flex items-center gap-2 py-3 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" />Carregando contribuintes…</div>;

  if (!data?.length) return <p className="text-sm text-muted-foreground py-2">Nenhum contribuinte cadastrado</p>;

  return (
    <div className="ml-8 bg-muted/50 rounded-lg p-3">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9">CPF/CNPJ</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9">Razão Social</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9">Inscrição Estadual</TableHead>
            <TableHead className="text-xs font-semibold uppercase tracking-wider h-9">Simples Nacional</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow key={c.id} className="hover:bg-transparent border-b border-border/50">
              <TableCell className="py-2 text-sm">{c.cpf_cnpj || "-"}</TableCell>
              <TableCell className="py-2 text-sm">{c.nome_razao_social}</TableCell>
              <TableCell className="py-2 text-sm">{c.inscricao_estadual || "-"}</TableCell>
              <TableCell className="py-2 text-sm">{c.simples_nacional ? "Sim" : "Não"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const ITEMS_PER_PAGE = 10;

const GestaoClientes = ({ area = 'tax' as AreaKey }: { area?: AreaKey } = {}) => {
  const { isAdmin, isLider, isSublider } = useAuth();
  const canEdit = isAdmin || isLider || isSublider;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");

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
  const {
    data: resultados = [],
    isLoading,
  } = useClientesFiltrados(
    { clienteId: "", status, tipo, categoria, nomeRazaoSocial: "" },
    true,
    clusterId ?? undefined,
    area === 'tax',
  );
  const deleteMutation = useDeleteCliente();

  // Busca por nome (client-side, ao vivo) sobre os resultados já carregados
  const filteredResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return resultados;
    return resultados.filter((c) => (c.nome ?? "").toLowerCase().includes(q));
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
      case "search":
        setSearch(val);
        break;
      case "status":
        setStatus(val);
        break;
      case "tipo":
        setTipo(val);
        break;
      case "categoria":
        setCategoria(val);
        break;
    }
    setCurrentPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setStatus("");
    setTipo("");
    setCategoria("");
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
    if (ativo === null || ativo === undefined) return "-";
    return ativo ? (
      <Badge className="bg-success/10 text-success hover:bg-success/10">Ativo</Badge>
    ) : (
      <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">Inativo</Badge>
    );
  };

  const formatTipo = (fixo: string | null) => {
    if (!fixo) return "-";
    return fixo === "Sim" ? "Fixo" : fixo === "Não" ? "Pontual" : fixo === "Em Análise" ? "Em Análise" : "-";
  };

  const formatCategoria = (cat: string | null) => {
    if (!cat) return "-";
    const colors: Record<string, string> = {
      Bronze: "bg-warning/10 text-warning hover:bg-warning/10",
      Prata: "bg-muted text-foreground hover:bg-muted",
      Ouro: "bg-warning/10 text-warning hover:bg-warning/10",
      Diamante: "bg-info/10 text-info hover:bg-info/10",
    };
    return <Badge className={colors[cat] || ""}>{cat}</Badge>;
  };

  const content = (
    <div className="space-y-6">
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
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card h-48 flex items-center justify-center gap-3 text-muted-foreground shadow-sm">
          <Users className="h-5 w-5" />
          <span className="text-sm">Nenhum resultado encontrado. Tente ajustar os filtros.</span>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="rounded-xl border border-border overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-[#603831] [&_th]:text-white/80">
               <TableRow className="hover:bg-[#603831] border-b-2 border-border">
                   <TableHead className="w-10 px-2" />
                   <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Nome Cliente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Categoria</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Tipo Cliente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Telefone</TableHead>
                   <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Setor</TableHead>
                   <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4">Clusters</TableHead>
                   {canEdit && <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-12 px-4 w-16">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border">
                {paginatedResults.map((row, index) => {
                  const isExpanded = expandedClienteId === row.id;
                  const totalCols = canEdit ? 9 : 8;
                  return (
                    <> 
                      <TableRow
                        key={row.id}
                        className={cn("cursor-pointer transition-colors hover:bg-primary/10", index % 2 === 1 && "bg-muted/50")}
                        onClick={() => handleClienteClick({ id: row.id })}
                      >
                        <TableCell className="px-2 py-3.5 w-10">
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedClienteId(isExpanded ? null : row.id);
                            }}
                          >
                            <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-90")} />
                          </button>
                        </TableCell>
                        <TableCell className="px-4 py-3.5 font-medium text-foreground">{row.nome || "-"}</TableCell>
                        <TableCell className="px-4 py-3.5">{formatCategoria(row.categoria)}</TableCell>
                        <TableCell className="px-4 py-3.5 text-muted-foreground">{formatStatus(row.ativo)}</TableCell>
                        <TableCell className="px-4 py-3.5 text-muted-foreground">{formatTipo(row.fixo)}</TableCell>
                        <TableCell className="px-4 py-3.5 text-muted-foreground">{row.telefone || "-"}</TableCell>
                        <TableCell className="px-4 py-3.5 text-muted-foreground">{row.setor_cliente || "-"}</TableCell>
                        <TableCell className="px-4 py-3.5">
                          {row._clusters && row._clusters.length > 0
                            ? row._clusters.map((name: string) => (
                                <Badge key={name} variant="secondary" className="text-xs mr-1 mb-0.5">{name}</Badge>
                              ))
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="px-4 py-3.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isAdmin) {
                                  toast.warning("Você não tem permissão para excluir clientes/contribuintes, fale com a equipe Digital para realizar essa operação");
                                  return;
                                }
                                setDeletingCliente({ id: row.id, nome: row.nome || "Sem nome" });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${row.id}-expand`} className="hover:bg-transparent">
                          <TableCell colSpan={totalCols} className="p-0 px-2 py-3">
                            <ContribuinteSubTable clienteId={row.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2 pb-2">
              <span className="text-xs text-muted-foreground">
                Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredResults.length)} de {filteredResults.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Página {currentPage} de {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
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
      <AlertDialog open={!!deletingCliente} onOpenChange={(open) => { if (!open) setDeletingCliente(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{deletingCliente?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
