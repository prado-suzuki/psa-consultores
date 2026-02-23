import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TABLE_NAMES } from "@/config/api";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Pencil,
  X,
  Loader2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PerFormModal } from "@/components/equipe/dev/perdcomp/PerFormModal";
import { DcompFormModal } from "@/components/equipe/dev/perdcomp/DcompFormModal";
import { PerDetailModal } from "@/components/equipe/dev/perdcomp/PerDetailModal";
import { useSelicDataPerPer } from "@/hooks/useSelicDataPerPer";
import { applySelicCorrection, isWithinGracePeriod } from "@/lib/selicCalculator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

interface PerSituacaoMap {
  [key: string]: {
    situacao: string;
    criado_em: string;
    dt_pagamento: string | null;
  };
}

export default function ControlePerdcomp() {
  const queryClient = useQueryClient();

  // Filter states
  const [clienteId, setClienteId] = useState<string>("");
  const [contribuinteId, setContribuinteId] = useState<string>("");
  const [exercicioFilter, setExercicioFilter] = useState<string>("");
  const [processoFilter, setProcessoFilter] = useState<string>("");
  const [situacaoFilter, setSituacaoFilter] = useState<string[]>([]);

  const [searched, setSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const ITEMS_PER_PAGE = 10;

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // PER Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPer, setSelectedPer] = useState<any>(null);

  // Fetch clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-ativos", TABLE_NAMES.cliente],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE_NAMES.cliente).select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return (data || []) as unknown as { id: string; nome: string }[];
    },
  });

  // Fetch contribuintes based on selected cliente
  const { data: contribuintes = [] } = useQuery({
    queryKey: ["contribuintes", clienteId, TABLE_NAMES.contribuinte],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from(TABLE_NAMES.contribuinte)
        .select("id, nome_razao_social")
        .eq("cliente_id", clienteId)
        .order("nome_razao_social");
      if (error) throw error;
      return (data || []) as unknown as { id: string; nome_razao_social: string }[];
    },
    enabled: !!clienteId,
  });

  // Auto-selecionar contribuinte quando há apenas um
  useEffect(() => {
    if (clienteId && contribuintes && contribuintes.length === 1 && !contribuinteId) {
      setContribuinteId(contribuintes[0].id);
    }
  }, [clienteId, contribuintes, contribuinteId]);

  // Query for PER data
  const { data: perData = [], isLoading: perLoading } = useQuery({
    queryKey: ["perdcomp-per", contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      const { data, error } = await supabase
        .from("per")
        .select(
          `
          *,
          contribuinte:id_contribuinte (nome_razao_social)
        `,
        )
        .eq("id_contribuinte", contribuinteId)
        .order("exercicio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: searched && !!contribuinteId,
  });

  // Query for situações (most recent for each PER)
  const { data: perSituacoesMap = {} } = useQuery<PerSituacaoMap>({
    queryKey: ["per-situacoes", contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return {};

      // Get all PERs for this contribuinte
      const { data: pers, error: perError } = await supabase
        .from("per")
        .select("numero_processo_per")
        .eq("id_contribuinte", contribuinteId);
      if (perError) throw perError;

      const perNumbers = pers?.map((p) => p.numero_processo_per) || [];
      if (perNumbers.length === 0) return {};

      // Get all situações for these PERs
      const { data: situacoes, error } = await supabase
        .from("per_situacao")
        .select("nr_proc_per, situacao, criado_em, dt_pagamento")
        .in("nr_proc_per", perNumbers)
        .order("criado_em", { ascending: false });
      if (error) throw error;

      // Build map with most recent situação for each PER
      const map: PerSituacaoMap = {};
      for (const sit of situacoes || []) {
        if (!map[sit.nr_proc_per]) {
          map[sit.nr_proc_per] = {
            situacao: sit.situacao,
            criado_em: sit.criado_em || "",
            dt_pagamento: sit.dt_pagamento || null,
          };
        }
      }
      return map;
    },
    enabled: searched && !!contribuinteId,
  });

  // Query for DCOMP data
  const { data: dcompData = [], isLoading: dcompLoading } = useQuery({
    queryKey: ["perdcomp-dcomp", contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      // First get PERs for this contribuinte
      const { data: pers, error: perError } = await supabase
        .from("per")
        .select("numero_processo_per")
        .eq("id_contribuinte", contribuinteId);
      if (perError) throw perError;

      const perNumbers = pers?.map((p) => p.numero_processo_per) || [];
      if (perNumbers.length === 0) return [];

      const { data, error } = await supabase
        .from("dcomp")
        .select("*")
        .in("nr_per_orig", perNumbers)
        .order("dt_envio", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: searched && !!contribuinteId,
  });

  // Delete mutation for DCOMP only
  const deleteDcompMutation = useMutation({
    mutationFn: async (numero: string) => {
      const { error } = await supabase.from("dcomp").delete().eq("nr_documento", numero);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perdcomp-dcomp"] });
      toast.success("DCOMP excluído com sucesso!");
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (!clienteId || !contribuinteId) {
      toast.error("Selecione o cliente e contribuinte");
      return;
    }
    setSearched(true);
  };

  const handleClear = () => {
    setClienteId("");
    setContribuinteId("");
    setExercicioFilter("");
    setProcessoFilter("");
    setSituacaoFilter([]);
    setSearched(false);
    setCurrentPage(1);
    setSortColumn(null);
  };

  // Create set of rectified processes (processes that appear in nr_proc_ret of another record)
  const retificadosSet = new Set(perData.filter((item) => item.nr_proc_ret).map((item) => item.nr_proc_ret));

  // Create map of total compensated value per PER
  const dcompTotalMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const dcomp of dcompData) {
      const perNum = dcomp.nr_per_orig;
      if (!map[perNum]) map[perNum] = 0;
      map[perNum] += dcomp.vlr_compensado || 0;
    }
    return map;
  }, [dcompData]);

  // Frontend filtering - hide rectified processes and apply user filters
  const filteredPerData = perData.filter((item) => {
    // Hide processes that have been rectified (appear in nr_proc_ret of another record)
    if (retificadosSet.has(item.numero_processo_per)) return false;
    if (exercicioFilter && item.exercicio !== parseInt(exercicioFilter)) return false;
    if (situacaoFilter.length > 0) {
      const sit = perSituacoesMap[item.numero_processo_per]?.situacao || "";
      if (!situacaoFilter.includes(sit)) return false;
    }
    if (processoFilter) {
      const matchPer = item.numero_processo_per.includes(processoFilter);
      const matchDcomp = dcompData.some(
        (d) => d.nr_per_orig === item.numero_processo_per && d.nr_documento.includes(processoFilter),
      );
      if (!matchPer && !matchDcomp) return false;
    }
    return true;
  });

  // Independent query for all distinct situações (loads before search)
  const { data: allSituacoes = [] } = useQuery({
    queryKey: ["per-situacoes-distintas"],
    queryFn: async () => {
      const { data } = await supabase.from("per_situacao").select("situacao").not("situacao", "is", null);
      const set = new Set(data?.map((d) => d.situacao));
      return Array.from(set).sort();
    },
  });

  // Fetch Selic rates individually per PER (each PER has its own data_fim)
  const { data: selicPerMap = {}, isLoading: selicLoading } = useSelicDataPerPer(
    filteredPerData
      .filter((p) => p.dt_solicitada)
      .map((p) => ({
        numero_processo_per: p.numero_processo_per,
        dt_solicitada: p.dt_solicitada,
      })),
  );

  // Pre-calculate corrected values for all filtered PERs
  const selicCorrectionMap = useMemo(() => {
    const map: Record<string, { valorCorrigido: number; fator: number }> = {};
    for (const per of filteredPerData) {
      if (!per.dt_solicitada) continue;

      if (isWithinGracePeriod(per.dt_solicitada)) {
        map[per.numero_processo_per] = { valorCorrigido: 0, fator: 0 };
        continue;
      }

      const taxa = selicPerMap[per.numero_processo_per];
      if (!taxa) continue;

      const { valorCorrigido, fator } = applySelicCorrection(per.vlr_credito, taxa.vlr_acumulado_dec);
      map[per.numero_processo_per] = { valorCorrigido, fator };
    }
    return map;
  }, [selicPerMap, filteredPerData]);

  // Calculate totals for footer
  const totals = useMemo(() => {
    let credito = 0;
    let corrigido = 0;
    let compensado = 0;
    let ressarcido = 0;
    let saldo = 0;

    for (const item of filteredPerData) {
      const totalComp = dcompTotalMap[item.numero_processo_per] || 0;
      const valRessarcido = (item as any).vlr_ressarcido || 0;
      const valSaldo = item.vlr_credito - totalComp - valRessarcido;
      const correction = selicCorrectionMap[item.numero_processo_per];

      credito += item.vlr_credito;
      corrigido += correction ? correction.valorCorrigido : 0;
      compensado += totalComp;
      ressarcido += valRessarcido;
      saldo += valSaldo;
    }

    return { credito, corrigido, compensado, ressarcido, saldo };
  }, [filteredPerData, dcompTotalMap, selicCorrectionMap]);

  // Sorting
  const getSortValue = (item: any, col: string) => {
    const key = item.numero_processo_per;
    switch (col) {
      case "processo":
        return key;
      case "situacao":
        return perSituacoesMap[key]?.situacao || "";
      case "dt_solicitada":
        return item.dt_solicitada || "";
      case "exercicio":
        return item.exercicio;
      case "trimestre":
        return item.tri_exercicio;
      case "vlr_credito":
        return item.vlr_credito;
      case "vlr_compensado":
        return dcompTotalMap[key] || 0;
      case "saldo":
        return item.vlr_credito - (dcompTotalMap[key] || 0) - ((item as any).vlr_ressarcido || 0);
      case "vlr_corrigido":
        return selicCorrectionMap[key]?.valorCorrigido || 0;
      default:
        return "";
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredPerData;
    return [...filteredPerData].sort((a, b) => {
      const aVal = getSortValue(a, sortColumn);
      const bVal = getSortValue(b, sortColumn);
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [filteredPerData, sortColumn, sortDirection, perSituacoesMap, dcompTotalMap, selicCorrectionMap]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Pagination
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleNew = () => {
    setEditData(null);
    setFormModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditData(item);
    setFormModalOpen(true);
  };

  const handlePerClick = (item: any) => {
    setSelectedPer(item);
    setDetailModalOpen(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    deleteDcompMutation.mutate(itemToDelete.nr_documento);
  };

  const isLoading = perLoading || dcompLoading;
  const isDeleting = deleteDcompMutation.isPending;

  const renderTable = () => {
    if (!searched) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione os filtros e clique em Buscar para visualizar os registros</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    return (
      <TooltipProvider>
        <div className="overflow-x-auto w-full">
          <Table className="text-xs min-w-[1400px] [&_th]:px-2 [&_th]:py-2 [&_td]:px-2 [&_td]:py-2">
            <TableHeader>
              <TableRow>
                <TableHead
                  className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("processo")}
                >
                  <span className="flex items-center">
                    Nº Processo
                    <SortIcon col="processo" />
                  </span>
                </TableHead>
                <TableHead
                  className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("situacao")}
                >
                  <span className="flex items-center">
                    Situação
                    <SortIcon col="situacao" />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">Últ. atualização</TableHead>
                <TableHead
                  className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("dt_solicitada")}
                >
                  <span className="flex items-center">
                    Dt. Solicitada
                    <SortIcon col="dt_solicitada" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("exercicio")}>
                  <span className="flex items-center">
                    Exerc.
                    <SortIcon col="exercicio" />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("trimestre")}>
                  <span className="flex items-center">
                    Tri.
                    <SortIcon col="trimestre" />
                  </span>
                </TableHead>
                <TableHead className="whitespace-nowrap">Tipo Crédito</TableHead>
                <TableHead className="text-right whitespace-nowrap">% PSA</TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("vlr_credito")}
                >
                  <span className="flex items-center justify-end">
                    Vlr. Crédito
                    <SortIcon col="vlr_credito" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("vlr_compensado")}
                >
                  <span className="flex items-center justify-end">
                    Vlr. Compensado
                    <SortIcon col="vlr_compensado" />
                  </span>
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">Ressarcido</TableHead>
                <TableHead className="whitespace-nowrap">Dt. Pagamento</TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("saldo")}
                >
                  <span className="flex items-center justify-end">
                    Saldo Disp.
                    <SortIcon col="saldo" />
                  </span>
                </TableHead>
                <TableHead
                  className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort("vlr_corrigido")}
                >
                  <span className="flex items-center justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help border-b border-dashed border-muted-foreground/50">
                          Vlr. Selic
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Valor do crédito corrigido pela taxa Selic até a data atual</p>
                      </TooltipContent>
                    </Tooltip>
                    <SortIcon col="vlr_corrigido" />
                  </span>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => {
                  const situacaoInfo = perSituacoesMap[item.numero_processo_per];
                  const totalCompensado = dcompTotalMap[item.numero_processo_per] || 0;
                  const valorRessarcido = (item as any).vlr_ressarcido || 0;
                  const saldo = item.vlr_credito - totalCompensado - valorRessarcido;
                  const correction = selicCorrectionMap[item.numero_processo_per];

                  return (
                    <TableRow
                      key={item.numero_processo_per}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handlePerClick(item)}
                    >
                      <TableCell className="font-medium">{item.numero_processo_per}</TableCell>
                      <TableCell>{situacaoInfo?.situacao || "-"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {situacaoInfo?.criado_em ? formatDate(situacaoInfo.criado_em) : "-"}
                      </TableCell>
                      <TableCell>{formatDate(item.dt_solicitada)}</TableCell>
                      <TableCell>{item.exercicio}</TableCell>
                      <TableCell>{item.tri_exercicio}º</TableCell>
                      <TableCell>{item.tp_credito}</TableCell>
                      <TableCell className="text-right">
                        {(item as any).porcentagem_psa != null ? `${(item as any).porcentagem_psa}%` : '-'}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.vlr_credito)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalCompensado)}</TableCell>
                      <TableCell className="text-right">
                        {valorRessarcido > 0 ? formatCurrency(valorRessarcido) : "-"}
                      </TableCell>
                      <TableCell>{situacaoInfo?.dt_pagamento ? formatDate(situacaoInfo.dt_pagamento) : "-"}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "font-medium",
                            saldo > 0
                              ? "text-green-600 dark:text-green-400"
                              : saldo < 0
                                ? "text-red-600 dark:text-red-400"
                                : "",
                          )}
                        >
                          {formatCurrency(saldo)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {correction ? (
                          correction.fator > 0 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help text-blue-600 dark:text-blue-400 font-medium">
                                  {formatCurrency(correction.valorCorrigido)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Fator Selic: {correction.fator.toFixed(6)}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">Em carência</span>
                          )
                        ) : selicLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin ml-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)} de {sortedData.length} registros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  };

  const renderFormModal = () => {
    return (
      <PerFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        editData={editData}
        clienteId={clienteId}
        contribuinteId={contribuinteId}
      />
    );
  };

  return (
    <DevLayout title="Controle PERDCOMP" subtitle="Gerenciamento de PER e DCOMP">
      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={clienteId}
                onValueChange={(v) => {
                  setClienteId(v);
                  setContribuinteId("");
                  setSearched(false);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contribuinte</Label>
              <Select
                value={contribuinteId}
                onValueChange={(v) => {
                  setContribuinteId(v);
                  setSearched(false);
                }}
                disabled={!clienteId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Situação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between h-10 font-normal">
                    <span className="truncate">
                      {situacaoFilter.length === 0
                        ? "Todas"
                        : situacaoFilter.length === 1
                          ? situacaoFilter[0]
                          : `${situacaoFilter.length} selecionadas`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <div className="space-y-1">
                    {allSituacoes.map((s) => (
                      <label
                        key={s}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={situacaoFilter.includes(s)}
                          onCheckedChange={(checked) => {
                            setSituacaoFilter((prev) => (checked ? [...prev, s] : prev.filter((x) => x !== s)));
                            setCurrentPage(1);
                          }}
                        />
                        {s}
                      </label>
                    ))}
                    {situacaoFilter.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => {
                          setSituacaoFilter([]);
                          setCurrentPage(1);
                        }}
                      >
                        Limpar seleção
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Exercício</Label>
              <Select
                value={exercicioFilter || "__none__"}
                onValueChange={(v) => setExercicioFilter(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos</SelectItem>
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nº do Processo</Label>
              <Input
                placeholder="Digite o número..."
                value={processoFilter}
                onChange={(e) => setProcessoFilter(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2 md:col-span-2">
              <Button onClick={handleClear} variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Resultados - PER</CardTitle>
          {searched && (
            <Button onClick={handleNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          )}
        </CardHeader>
        <CardContent>{renderTable()}</CardContent>
      </Card>

      {/* Form Modal */}
      {renderFormModal()}

      {/* Delete Confirmation Dialog - Only for DCOMP */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o DCOMP {itemToDelete?.nr_documento}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PER Detail Modal */}
      <PerDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        per={selectedPer}
        contribuinteId={contribuinteId}
      />
    </DevLayout>
  );
}
