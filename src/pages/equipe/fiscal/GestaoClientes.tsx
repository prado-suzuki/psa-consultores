import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { currentAmbiente } from "@/config/api";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Filter, Search, Users, ChevronLeft, ChevronRight, Plus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import NewClientModal from "@/components/equipe/NewClientModal";

const ITEMS_PER_PAGE = 10;

const GestaoClientes = () => {
  const { isAdmin, isLider, isSublider } = useAuth();
  const canEdit = isAdmin || isLider || isSublider;
  const [clienteId, setClienteId] = useState("");
  const [status, setStatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [searched, setSearched] = useState(true);

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Estados do contribuinte (apenas para filtrar)
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState("");

  // Modal de cadastro completo (usado para criar, editar e visualizar)
  const [novoClienteModalOpen, setNovoClienteModalOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false);
  const [deletingCliente, setDeletingCliente] = useState<{ id: string; nome: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const queryClient = useQueryClient();

  // Verifica se há filtros ativos
  const hasActiveFilters = clienteId || status || tipo || categoria || nomeRazaoSocial;

  // Verifica se há filtros de contribuinte ativos
  const hasContribuinteFilters = !!nomeRazaoSocial;

  // Query para lista de clientes (id + nome)
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select("id, nome")
        .not("nome", "is", null)
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome");

      if (error) throw error;
      return data || [];
    },
  });

  // Query para contribuintes - filtrado por cliente_id quando selecionado
  const { data: contribuintes = [] } = useQuery({
    queryKey: ["contribuintes-por-cliente", clienteId],
    queryFn: async () => {
      let query = supabase
        .from('contribuinte')
        .select("id, nome_razao_social, cliente_id")
        .not("nome_razao_social", "is", null)
        .eq("excluido", false)
        .eq("ambiente", currentAmbiente)
        .order("nome_razao_social");

      if (clienteId && clienteId !== "__todos__") {
        query = query.eq("cliente_id", clienteId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const uniqueContribuintes = [...new Map(data?.map((d) => [d.nome_razao_social, d]) || []).values()];
      return uniqueContribuintes;
    },
  });

  // Limpar contribuinte quando cliente mudar
  useEffect(() => {
    setNomeRazaoSocial("");
  }, [clienteId]);

  // Auto-selecionar contribuinte quando há apenas um
  useEffect(() => {
    if (clienteId && clienteId !== "__todos__" && contribuintes && contribuintes.length === 1 && !nomeRazaoSocial) {
      setNomeRazaoSocial(contribuintes[0].nome_razao_social);
    }
  }, [clienteId, contribuintes, nomeRazaoSocial]);

  // Query principal - busca clientes
  const {
    data: resultados = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["clientes-filtrados", clienteId, status, tipo, categoria, nomeRazaoSocial],
    queryFn: async () => {
      let filteredClienteIds: string[] | null = null;

      if (hasContribuinteFilters) {
        let contribuinteQuery = supabase.from('contribuinte').select("cliente_id").eq("excluido", false);

        if (nomeRazaoSocial) contribuinteQuery = contribuinteQuery.eq("nome_razao_social", nomeRazaoSocial);

        const { data: contribData, error: contribError } = await contribuinteQuery;
        if (contribError) throw contribError;

        filteredClienteIds = [...new Set(contribData?.map((c) => c.cliente_id))] as string[];

        if (filteredClienteIds.length === 0) return [];
      }

      let clienteQuery = supabase.from('cliente').select("*").eq("excluido", false).eq("ambiente", currentAmbiente);

      if (clienteId && clienteId !== "__todos__") {
        clienteQuery = clienteQuery.eq("id", clienteId);
      }

      if (status) clienteQuery = clienteQuery.eq("ativo", status === "true");
      if (tipo) clienteQuery = clienteQuery.eq("fixo", tipo);
      if (categoria) clienteQuery = clienteQuery.eq("categoria", categoria);

      if (filteredClienteIds !== null) {
        clienteQuery = clienteQuery.in("id", filteredClienteIds);
      }

      const { data, error } = await clienteQuery.order("nome");
      if (error) throw error;

      return data || [];
    },
    enabled: searched,
  });

  // Reset página quando buscar novamente
  useEffect(() => {
    setCurrentPage(1);
  }, [resultados]);

  // Paginação da tabela principal
  const totalPages = Math.ceil(resultados.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    return resultados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [resultados, currentPage]);

  const handleSearch = () => {
    setSearched(true);
    setCurrentPage(1);
    refetch();
  };

  const handleClear = () => {
    setClienteId("");
    setStatus("");
    setTipo("");
    setCategoria("");
    setNomeRazaoSocial("");
    setSearched(false);
    setCurrentPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCliente) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('cliente').update({ excluido: true } as any).eq("id", deletingCliente.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-lista"] });
      queryClient.invalidateQueries({ queryKey: ["clientes-filtrados"] });
      toast({ title: "Cliente excluído", description: `O cliente "${deletingCliente.nome}" foi removido.` });
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeletingCliente(null);
    }
  };

  const handleClienteClick = (cliente: { id: string }) => {
    setEditingClienteId(cliente.id);
    setViewMode(true);
    setNovoClienteModalOpen(true);
  };

  const formatStatus = (ativo: boolean | null) => {
    if (ativo === null || ativo === undefined) return "-";
    return ativo ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inativo</Badge>
    );
  };

  const formatTipo = (fixo: string | null) => {
    if (!fixo) return "-";
    return fixo === "Sim" ? "Fixo" : fixo === "Não" ? "Pontual" : "-";
  };

  const formatCategoria = (cat: string | null) => {
    if (!cat) return "-";
    const colors: Record<string, string> = {
      Bronze: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      Prata: "bg-slate-200 text-slate-700 hover:bg-slate-200",
      Ouro: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      Diamante: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    };
    return <Badge className={colors[cat] || ""}>{cat}</Badge>;
  };

  const content = (
    <div className="space-y-6">
      {/* Topo: Botão à esquerda + texto auxiliar à direita */}
      <div className="flex justify-between items-center">
        <Button
          onClick={() => {
            setEditingClienteId(null);
            setViewMode(false);
            setNovoClienteModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo cliente
        </Button>
        <div className="hidden md:flex items-center text-slate-500 gap-2">
          <Search className="h-4 w-4" />
          <span className="text-sm">Gerencie sua base de dados de clientes</span>
        </div>
      </div>

      {/* Card de Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <Filter className="h-5 w-5 text-teal-600" />
          <h3 className="text-lg font-bold uppercase tracking-wide text-slate-800">Filtros de Busca</h3>
        </div>
        {/* Corpo */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">Cliente</label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger className="h-12 bg-white border-slate-300 text-slate-700 rounded-lg shadow-sm">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="__todos__">Todos os Clientes</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">Contribuinte</label>
              <Select value={nomeRazaoSocial} onValueChange={setNomeRazaoSocial}>
                <SelectTrigger className="h-12 bg-white border-slate-300 text-slate-700 rounded-lg shadow-sm">
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  {contribuintes.map((c) => (
                    <SelectItem key={c.id} value={c.nome_razao_social}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12 bg-white border-slate-300 text-slate-700 rounded-lg shadow-sm">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">Tipo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="h-12 bg-white border-slate-300 text-slate-700 rounded-lg shadow-sm">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="Sim">Fixos</SelectItem>
                  <SelectItem value="Não">Pontuais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-slate-900 mb-2">Categoria</label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="h-12 bg-white border-slate-300 text-slate-700 rounded-lg shadow-sm">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white z-50">
                  <SelectItem value="Bronze">Bronze</SelectItem>
                  <SelectItem value="Prata">Prata</SelectItem>
                  <SelectItem value="Ouro">Ouro</SelectItem>
                  <SelectItem value="Diamante">Diamante</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={handleClear}
          >
            Limpar filtros
          </Button>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
            {isLoading ? "Buscando..." : "Buscar"}
          </Button>
        </div>
      </div>

      {/* Resultados */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Resultados recentes</h3>
        <span className="text-sm text-slate-500">
          Mostrando {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
        </span>
      </div>

      {!searched || isLoading ? (
        isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white h-48 flex items-center justify-center gap-3 text-slate-500 shadow-sm">
            <Search className="h-5 w-5" />
            <span className="text-sm">Utilize os filtros acima para encontrar clientes.</span>
          </div>
        )
      ) : resultados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white h-48 flex items-center justify-center gap-3 text-slate-500 shadow-sm">
          <Users className="h-5 w-5" />
          <span className="text-sm">Nenhum resultado encontrado. Tente ajustar os filtros.</span>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-slate-50 border-b-2 border-slate-200">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Nome Cliente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Categoria</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Tipo Cliente</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Telefone</TableHead>
                   <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Setor</TableHead>
                   <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4 w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {paginatedResults.map((row, index) => (
                  <TableRow
                    key={row.id}
                    className={cn("cursor-pointer transition-colors hover:bg-teal-50/60", index % 2 === 1 && "bg-slate-50/50")}
                    onClick={() => handleClienteClick({ id: row.id })}
                  >
                    <TableCell className="px-4 py-3.5 font-medium text-slate-900">{row.nome || "-"}</TableCell>
                    <TableCell className="px-4 py-3.5">{formatCategoria((row as any).categoria)}</TableCell>
                    <TableCell className="px-4 py-3.5 text-slate-600">{formatStatus(row.ativo)}</TableCell>
                    <TableCell className="px-4 py-3.5 text-slate-600">{formatTipo(row.fixo)}</TableCell>
                    <TableCell className="px-4 py-3.5 text-slate-600">{row.telefone || "-"}</TableCell>
                    <TableCell className="px-4 py-3.5 text-slate-600">{row.setor_cliente || "-"}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCliente({ id: row.id, nome: row.nome || "Sem nome" });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2 pb-2">
              <span className="text-xs text-slate-500">
                Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, resultados.length)} de {resultados.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">Página {currentPage} de {totalPages}</span>
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
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
