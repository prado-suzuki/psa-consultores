import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, X, Pencil, Trash2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SITUACAO_PROJETO_OPTIONS, formatCurrencyDisplay, isoToMasked, generateNextOsNumber } from "./constants";
import type { DraftOrdemServico, DraftProdutoContratado } from "@/types/clientForm";
import { createDefaultDraftContract } from "./constants";
import DateFieldWithInput from "./DateFieldWithInput";
import CurrencyField from "./CurrencyField";
import FieldPair from "./FieldPair";

type DraftContractState = ReturnType<typeof createDefaultDraftContract>;

export interface ContratosTabProps {
  contracts: DraftOrdemServico[];
  setContracts: React.Dispatch<React.SetStateAction<DraftOrdemServico[]>>;
  draftContract: DraftContractState;
  setDraftContract: React.Dispatch<React.SetStateAction<DraftContractState>>;
  isReadOnly: boolean;
  produtoSegmentoFullOptions: Array<{ id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: { name: string } | null }>;
  allClusters: Array<{ id: string; name: string }>;
  CENTRO_CUSTO_OPTIONS: Array<{ id: string; codigo: string; nome: string; label: string }>;
}

// ── Helpers ────────────────────────────────────────────────────────────

function getProductLabel(id: string, options: ContratosTabProps['produtoSegmentoFullOptions']) {
  const p = options.find(o => o.id === id);
  return p ? `${p.codigo} — ${p.nome}` : id;
}

function getProductCodigos(produtos: DraftProdutoContratado[], options: ContratosTabProps['produtoSegmentoFullOptions']) {
  return produtos
    .map(pc => options.find(o => o.id === pc.produto_segmento_id))
    .filter(Boolean)
    .map(p => `${p!.codigo} — ${p!.nome}`)
    .join(', ');
}

function getOsHeaderLabel(cont: DraftOrdemServico, options: ContratosTabProps['produtoSegmentoFullOptions']) {
  const codigos = getProductCodigos(cont.produtos_contratados || [], options);
  return codigos ? `OS ${cont.ordem_servico} — ${codigos}` : `OS ${cont.ordem_servico}`;
}

// ── Repeatable product block ──────────────────────────────────────────

function ProdutoContratadoBlock({
  produtos,
  onChange,
  produtoOptions,
  allClusters,
  readOnly,
  clusterFilter,
  onClusterFilterChange,
}: {
  produtos: DraftProdutoContratado[];
  onChange: (produtos: DraftProdutoContratado[]) => void;
  produtoOptions: ContratosTabProps['produtoSegmentoFullOptions'];
  allClusters: ContratosTabProps['allClusters'];
  readOnly?: boolean;
  clusterFilter: string;
  onClusterFilterChange: (v: string) => void;
}) {
  const filteredProducts = useMemo(() => {
    if (clusterFilter === "__all__") return produtoOptions;
    return produtoOptions.filter(p => p.cluster_id === clusterFilter);
  }, [produtoOptions, clusterFilter]);

  const [addingProductId, setAddingProductId] = useState<string>("__none__");

  const handleAdd = () => {
    if (addingProductId === "__none__") return;
    if (produtos.some(p => p.produto_segmento_id === addingProductId)) {
      toast.error("Este produto já foi adicionado a esta OS");
      return;
    }
    onChange([...produtos, { _id: Date.now() + Math.random(), produto_segmento_id: addingProductId }]);
    setAddingProductId("__none__");
  };

  const handleRemove = (idx: number) => {
    onChange(produtos.filter((_, i) => i !== idx));
  };

  const renderGroupedSelect = () => {
    const withCluster = filteredProducts.filter(p => p.estrutura_clusters?.name);
    const withoutCluster = filteredProducts.filter(p => !p.estrutura_clusters?.name);
    const groups = withCluster.reduce((acc: Record<string, typeof filteredProducts>, p) => {
      const cName = p.estrutura_clusters!.name;
      if (!acc[cName]) acc[cName] = [];
      acc[cName].push(p);
      return acc;
    }, {});
    return (
      <>
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([name, prods]) => (
          <SelectGroup key={name}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">{name}</SelectLabel>
            {prods.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
          </SelectGroup>
        ))}
        {withoutCluster.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">Sem cluster</SelectLabel>
            {withoutCluster.map(p => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
          </SelectGroup>
        )}
      </>
    );
  };

  if (readOnly) {
    return (
      <div>
        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Produtos Contratados</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {produtos.length === 0 && <span className="text-sm text-muted-foreground">—</span>}
          {produtos.map((pc, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {getProductLabel(pc.produto_segmento_id, produtoOptions)}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Empresa filter */}
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa</Label>
        <Select value={clusterFilter} onValueChange={onClusterFilterChange}>
          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as empresas</SelectItem>
            {allClusters.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Existing products badges */}
      {produtos.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Produtos Adicionados</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {produtos.map((pc, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs gap-1.5 pr-1">
                {getProductLabel(pc.produto_segmento_id, produtoOptions)}
                <button type="button" className="ml-1 rounded-full hover:bg-destructive/20 p-0.5" onClick={() => handleRemove(idx)}>
                  <X size={12} className="text-destructive" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Add product */}
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Adicionar Produto *</Label>
        <div className="flex gap-2 mt-1">
          <Select value={addingProductId} onValueChange={setAddingProductId}>
            <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione...</SelectItem>
              {renderGroupedSelect()}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" className="gap-1 h-8 shrink-0" onClick={handleAdd} disabled={addingProductId === "__none__"}>
            <Plus size={14} /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function ContratosTab({
  contracts, setContracts,
  draftContract, setDraftContract,
  isReadOnly,
  produtoSegmentoFullOptions, allClusters, CENTRO_CUSTO_OPTIONS,
}: ContratosTabProps) {
  const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [editingContractData, setEditingContractData] = useState<Partial<DraftOrdemServico> | null>(null);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [osClusterFilter, setOsClusterFilter] = useState<string>("__all__");
  const [osEditClusterFilter, setOsEditClusterFilter] = useState<string>("__all__");

  const startEditContract = (c: DraftOrdemServico) => { setEditingContractId(c._id); setEditingContractData({ ...c }); };
  const cancelEditContract = () => { setEditingContractId(null); setEditingContractData(null); };
  const saveEditContract = () => {
    if (!editingContractData || editingContractId == null) return;
    setContracts(contracts.map((c) => (c._id === editingContractId ? ({ ...c, ...editingContractData } as DraftOrdemServico) : c)));
    setEditingContractId(null); setEditingContractData(null);
    toast.success("OS atualizada");
  };

  const addContract = async () => {
    if (!draftContract.produtos_contratados || draftContract.produtos_contratados.length === 0) {
      toast.error("Adicione ao menos um Produto Contratado");
      return;
    }
    setIsAddingContract(true);
    try {
      const osNumber = await generateNextOsNumber(contracts as any);
      const newContract = { ...draftContract, ordem_servico: osNumber, _id: Date.now() + Math.random() } as unknown as DraftOrdemServico;
      setContracts([...contracts, newContract]);
      setDraftContract(createDefaultDraftContract());
    } finally { setIsAddingContract(false); }
  };

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
        <h3 className="text-sm font-bold text-foreground">OS - Ordem de Serviço ({contracts.length})</h3>
      </div>
      <div className="px-4 py-3">
        {contracts.length > 0 && (
          <div className="space-y-3 mb-6">
            {contracts.map((cont) => {
              const isExpanded = expandedContractId === cont._id;
              const isEditingThis = editingContractId === cont._id;
              const ec = isEditingThis ? editingContractData : null;
              return (
                <div key={cont._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                  <button type="button" className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => { if (!isEditingThis) setExpandedContractId(isExpanded ? null : cont._id); }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-foreground">
                          {getOsHeaderLabel(cont, produtoSegmentoFullOptions)}
                        </span>
                      </div>
                      <div className="font-bold text-foreground mt-0.5">{formatCurrencyDisplay(cont.valor_projeto)}</div>
                    </div>
                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform ml-2", isExpanded && "rotate-180")} />
                  </button>

                  {/* Read-only expanded */}
                  {isExpanded && !isEditingThis && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <div className="flex justify-end gap-2 mb-3">
                        {!isReadOnly && (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => startEditContract(cont)}><Pencil size={12} /> Editar</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive"><Trash2 size={12} /> Remover</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Remover OS</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover a OS "{cont.ordem_servico}"? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setContracts(contracts.filter((c) => c._id !== cont._id)); setExpandedContractId(null); }}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                        <FieldPair label="Data Início" value={cont.data_inicio_projeto ? isoToMasked(cont.data_inicio_projeto) : "—"} />
                        <FieldPair label="Data Fim" value={cont.data_fim_projeto ? isoToMasked(cont.data_fim_projeto) : "—"} />
                        <FieldPair label="Data Emissão" value={cont.data_emissao ? isoToMasked(cont.data_emissao) : "—"} />
                        <FieldPair label="Valor do Projeto" value={formatCurrencyDisplay(cont.valor_projeto)} />
                        <FieldPair label="Situação do Projeto" value={SITUACAO_PROJETO_OPTIONS.find((o) => o.value === cont.situacao_projeto)?.label || "—"} />
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                          <FieldPair label="Reembolso por KM" value={formatCurrencyDisplay(cont.valor_reembolso_km)} />
                          <FieldPair label="Reembolso Refeição" value={formatCurrencyDisplay(cont.valor_reembolso_refeicao)} />
                        </div>
                        {/* Produtos contratados */}
                        <div className="col-span-2 md:col-span-3">
                          <ProdutoContratadoBlock
                            produtos={cont.produtos_contratados || []}
                            onChange={() => {}}
                            produtoOptions={produtoSegmentoFullOptions}
                            allClusters={allClusters}
                            readOnly
                            clusterFilter="__all__"
                            onClusterFilterChange={() => {}}
                          />
                        </div>
                        {cont.distribuicao_receita?.length > 0 && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Distribuição de Receita</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {cont.distribuicao_receita.map((cc, idx) => {
                                const ccOpt = CENTRO_CUSTO_OPTIONS.find((o) => o.id === cc.id_centro_custo);
                                return <Badge key={idx} variant="outline" className="text-xs">{ccOpt?.label || cc.id_centro_custo}: {cc.percentual_rateio}%</Badge>;
                              })}
                            </div>
                          </div>
                        )}
                        {cont.observacoes_projeto && (
                          <div className="col-span-2 md:col-span-3"><FieldPair label="Observações" value={cont.observacoes_projeto} /></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Inline edit */}
                  {isExpanded && isEditingThis && ec && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <h5 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2 mb-4">Dados da OS — {ec.ordem_servico}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data Início</Label><div className="mt-1"><DateFieldWithInput value={ec.data_inicio_projeto || ""} onChange={(v) => setEditingContractData({ ...ec, data_inicio_projeto: v })} /></div></div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data Fim</Label><div className="mt-1"><DateFieldWithInput value={ec.data_fim_projeto || ""} onChange={(v) => setEditingContractData({ ...ec, data_fim_projeto: v })} /></div></div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data de Emissão</Label><div className="mt-1"><DateFieldWithInput value={ec.data_emissao || ""} onChange={(v) => setEditingContractData({ ...ec, data_emissao: v })} /></div></div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Valor do Projeto (R$)</Label><div className="mt-1"><CurrencyField value={ec.valor_projeto || 0} onChange={(v) => setEditingContractData({ ...ec, valor_projeto: v })} /></div></div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">Situação do Projeto</Label>
                          <div className="mt-1">
                            <Select value={ec.situacao_projeto || "em_andamento"} onValueChange={(v) => setEditingContractData({ ...ec, situacao_projeto: v })}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{SITUACAO_PROJETO_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Reembolso por KM (R$)</Label><div className="mt-1"><CurrencyField value={ec.valor_reembolso_km || 0} onChange={(v) => setEditingContractData({ ...ec, valor_reembolso_km: v })} /></div></div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Reembolso Refeição (R$)</Label><div className="mt-1"><CurrencyField value={ec.valor_reembolso_refeicao || 0} onChange={(v) => setEditingContractData({ ...ec, valor_reembolso_refeicao: v })} /></div></div>
                      </div>

                      {/* Produtos contratados (editable) */}
                      <div className="mt-4">
                        <ProdutoContratadoBlock
                          produtos={(ec.produtos_contratados || []) as DraftProdutoContratado[]}
                          onChange={(prods) => setEditingContractData({ ...ec, produtos_contratados: prods })}
                          produtoOptions={produtoSegmentoFullOptions}
                          allClusters={allClusters}
                          clusterFilter={osEditClusterFilter}
                          onClusterFilterChange={setOsEditClusterFilter}
                        />
                      </div>

                      {/* Distribuição de Receita */}
                      <div className="border border-dashed rounded-lg p-3 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-bold text-muted-foreground uppercase">Distribuição de Receita (Centros de Custo)</h5>
                          <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setEditingContractData(prev => prev ? ({ ...prev, distribuicao_receita: [...((prev as any).distribuicao_receita || []), { id_centro_custo: "", percentual_rateio: 0 }] } as any) : prev)}><Plus size={12} /> Adicionar</Button>
                        </div>
                        {((ec as any).distribuicao_receita || []).map((cc: { id_centro_custo: string; percentual_rateio: number }, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 mt-1">
                            <Select value={cc.id_centro_custo || "__none__"} onValueChange={(v) => { setEditingContractData(prev => { if (!prev) return prev; const updated = [...((prev as any).distribuicao_receita || [])]; updated[idx] = { ...updated[idx], id_centro_custo: v === "__none__" ? "" : v }; return { ...prev, distribuicao_receita: updated } as any; }); }}>
                              <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                {CENTRO_CUSTO_OPTIONS.map((cc_opt) => <SelectItem key={cc_opt.id} value={cc_opt.id}>{cc_opt.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-1 shrink-0">
                              <Input type="number" min={0} max={100} value={cc.percentual_rateio || ""} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setEditingContractData(prev => { if (!prev) return prev; const updated = [...((prev as any).distribuicao_receita || [])]; updated[idx] = { ...updated[idx], percentual_rateio: val }; return { ...prev, distribuicao_receita: updated } as any; }); }} className="h-8 w-20 text-right" placeholder="%" />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => { setEditingContractData(prev => { if (!prev) return prev; const updated = ((prev as any).distribuicao_receita || []).filter((_: any, i: number) => i !== idx); return { ...prev, distribuicao_receita: updated } as any; }); }}><X size={14} /></Button>
                          </div>
                        ))}
                        {((ec as any).distribuicao_receita || []).length > 0 && (() => {
                          const total = ((ec as any).distribuicao_receita || []).reduce((acc: number, cc: any) => acc + (cc.percentual_rateio || 0), 0);
                          return <p className={cn("text-xs mt-2 font-medium", total === 100 ? "text-green-600" : total > 100 ? "text-destructive" : "text-amber-600")}>Total: {total.toFixed(0)}%{total < 100 && ` — Faltam ${(100 - total).toFixed(0)}%`}{total > 100 && ` — Excedeu ${(total - 100).toFixed(0)}%`}{total === 100 && " ✓"}</p>;
                        })()}
                      </div>
                      <div className="mt-4">
                        <h5 className="text-xs font-bold text-muted-foreground uppercase mb-2">Observações</h5>
                        <Textarea value={ec.observacoes_projeto || ""} onChange={(e) => setEditingContractData({ ...ec, observacoes_projeto: e.target.value })} placeholder="Insira observações relevantes sobre o projeto..." className="min-h-[60px]" />
                      </div>
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={cancelEditContract}>Cancelar</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50"><Check size={14} /> Aplicar</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Aplicar alterações</AlertDialogTitle><AlertDialogDescription>Deseja aplicar as alterações feitas nesta OS?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEditContract}>Aplicar</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* New OS form */}
        {!isReadOnly && (
          <div className="bg-muted/50 rounded-lg border p-4">
            <h4 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2 mb-4">Nova OS</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label className="text-xs font-semibold uppercase text-muted-foreground"> Data Início</Label><div className="mt-1"><DateFieldWithInput value={draftContract.data_inicio_projeto} onChange={(v) => setDraftContract(prev => ({ ...prev, data_inicio_projeto: v }))} /></div></div>
              <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data Fim</Label><div className="mt-1"><DateFieldWithInput value={draftContract.data_fim_projeto} onChange={(v) => setDraftContract(prev => ({ ...prev, data_fim_projeto: v }))} /></div></div>
              <div><Label className="text-xs font-semibold uppercase text-muted-foreground"> Data de Emissão</Label><div className="mt-1"><DateFieldWithInput value={draftContract.data_emissao} onChange={(v) => setDraftContract(prev => ({ ...prev, data_emissao: v }))} /></div></div>
              <div><Label className="text-xs font-semibold uppercase text-muted-foreground"> Valor do Projeto (R$)</Label><div className="mt-1"><CurrencyField value={draftContract.valor_projeto} onChange={(v) => setDraftContract(prev => ({ ...prev, valor_projeto: v }))} /></div></div>
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground"> Situação do Projeto</Label>
                <div className="mt-1">
                  <Select value={draftContract.situacao_projeto} onValueChange={(v) => setDraftContract(prev => ({ ...prev, situacao_projeto: v }))}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{SITUACAO_PROJETO_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs font-semibold uppercase text-muted-foreground"> Reembolso por KM (R$)</Label><div className="mt-1"><CurrencyField value={draftContract.valor_reembolso_km} onChange={(v) => setDraftContract(prev => ({ ...prev, valor_reembolso_km: v }))} /></div></div>
              <div><Label className="text-xs font-semibold uppercase text-muted-foreground"> Reembolso Refeição (R$)</Label><div className="mt-1"><CurrencyField value={draftContract.valor_reembolso_refeicao} onChange={(v) => setDraftContract(prev => ({ ...prev, valor_reembolso_refeicao: v }))} /></div></div>
            </div>

            {/* Produtos contratados (editable) */}
            <div className="mt-4">
              <ProdutoContratadoBlock
                produtos={draftContract.produtos_contratados}
                onChange={(prods) => setDraftContract(prev => ({ ...prev, produtos_contratados: prods }))}
                produtoOptions={produtoSegmentoFullOptions}
                allClusters={allClusters}
                clusterFilter={osClusterFilter}
                onClusterFilterChange={setOsClusterFilter}
              />
            </div>

            {/* Distribuição de Receita */}
            <div className="mt-4 border border-dashed rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase">Distribuição de Receita (Centros de Custo)</h5>
                <Button type="button" size="sm" variant="outline" className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50" onClick={() => setDraftContract(prev => ({ ...prev, distribuicao_receita: [...prev.distribuicao_receita, { id_centro_custo: "", percentual_rateio: 0 }] }))}><Plus size={14} /> Adicionar Centro de Custo</Button>
              </div>
              {draftContract.distribuicao_receita.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum centro de custo adicionado.</p>}
              {draftContract.distribuicao_receita.map((cc, idx) => (
                <div key={idx} className="flex items-center gap-2 mt-2">
                  <Select value={cc.id_centro_custo || "__none__"} onValueChange={(v) => { setDraftContract(prev => { const updated = [...prev.distribuicao_receita]; updated[idx] = { ...updated[idx], id_centro_custo: v === "__none__" ? "" : v }; return { ...prev, distribuicao_receita: updated }; }); }}>
                    <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione...</SelectItem>
                      {CENTRO_CUSTO_OPTIONS.map((cc_opt) => <SelectItem key={cc_opt.id} value={cc_opt.id}>{cc_opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1 shrink-0">
                    <Input type="number" min={0} max={100} value={cc.percentual_rateio || ""} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setDraftContract(prev => { const updated = [...prev.distribuicao_receita]; updated[idx] = { ...updated[idx], percentual_rateio: val }; return { ...prev, distribuicao_receita: updated }; }); }} className="h-8 w-20 text-right" placeholder="%" />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => { setDraftContract(prev => ({ ...prev, distribuicao_receita: prev.distribuicao_receita.filter((_, i) => i !== idx) })); }}><X size={14} /></Button>
                </div>
              ))}
              {draftContract.distribuicao_receita.length > 0 && (() => {
                const total = draftContract.distribuicao_receita.reduce((acc, cc) => acc + cc.percentual_rateio, 0);
                const faltam = 100 - total;
                return <p className={cn("text-xs mt-2 font-medium", total === 100 ? "text-green-600" : total > 100 ? "text-destructive" : "text-amber-600")}>Total Distribuído: {total.toFixed(0)}%{total < 100 && ` — Faltam ${faltam.toFixed(0)}% para completar 100%`}{total > 100 && ` — Excedeu em ${(total - 100).toFixed(0)}%`}{total === 100 && " ✓"}</p>;
              })()}
            </div>

            {/* Observações */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-muted-foreground uppercase mb-2">Observações</h5>
              <Textarea value={draftContract.observacoes_projeto} onChange={(e) => setDraftContract(prev => ({ ...prev, observacoes_projeto: e.target.value }))} placeholder="Insira observações relevantes sobre o projeto..." className="min-h-[80px]" />
            </div>

            <div className="flex justify-end mt-4 pt-2 border-t">
              <Button size="sm" variant="outline" onClick={addContract} disabled={isAddingContract} className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50"><Plus size={14} /> {isAddingContract ? "Adicionando..." : "Adicionar OS à Lista"}</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
