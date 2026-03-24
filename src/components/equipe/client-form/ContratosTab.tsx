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
import { Plus, X, Pencil, Trash2, ChevronDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SITUACAO_PROJETO_OPTIONS, formatCurrencyDisplay, isoToMasked, generateNextOsNumber } from "./constants";
import type { DraftOrdemServico, DraftContract } from "@/types/clientForm";
import DateFieldWithInput from "./DateFieldWithInput";
import CurrencyField from "./CurrencyField";
import FieldPair from "./FieldPair";

export interface ContratosTabProps {
  contracts: DraftContract[];
  setContracts: React.Dispatch<React.SetStateAction<DraftContract[]>>;
  draftContract: DraftOrdemServico;
  setDraftContract: React.Dispatch<React.SetStateAction<DraftOrdemServico>>;
  isReadOnly: boolean;
  produtoSegmentoFullOptions: Array<{ id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: { name: string } | null }>;
  allClusters: Array<{ id: string; name: string }>;
  CENTRO_CUSTO_OPTIONS: Array<{ id: string; codigo: string; nome: string; label: string }>;
}

export default function ContratosTab({
  contracts, setContracts,
  draftContract, setDraftContract,
  isReadOnly,
  produtoSegmentoFullOptions, allClusters, CENTRO_CUSTO_OPTIONS,
}: ContratosTabProps) {
  const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [editingContractData, setEditingContractData] = useState<Partial<DraftContract> | null>(null);
  const [isAddingContract, setIsAddingContract] = useState(false);
  const [osClusterFilter, setOsClusterFilter] = useState<string>("__all__");
  const [osEditClusterFilter, setOsEditClusterFilter] = useState<string>("__all__");

  const filteredCatalogProducts = useMemo(() => {
    if (osClusterFilter === "__all__") return produtoSegmentoFullOptions;
    return produtoSegmentoFullOptions.filter((p) => p.cluster_id === osClusterFilter);
  }, [produtoSegmentoFullOptions, osClusterFilter]);

  const filteredEditCatalogProducts = useMemo(() => {
    if (osEditClusterFilter === "__all__") return produtoSegmentoFullOptions;
    return produtoSegmentoFullOptions.filter((p) => p.cluster_id === osEditClusterFilter);
  }, [produtoSegmentoFullOptions, osEditClusterFilter]);

  const startEditContract = (c: DraftContract) => { setEditingContractId(c._id); setEditingContractData({ ...c }); };
  const cancelEditContract = () => { setEditingContractId(null); setEditingContractData(null); };
  const saveEditContract = () => {
    if (!editingContractData || editingContractId == null) return;
    setContracts(contracts.map((c) => (c._id === editingContractId ? ({ ...c, ...editingContractData } as DraftContract) : c)));
    setEditingContractId(null); setEditingContractData(null);
    toast.success("OS atualizada");
  };

  const addContract = async () => {
    if (!draftContract.id_produto_segmento) { toast.error("Selecione um Produto/Serviço Contratado"); return; }
    setIsAddingContract(true);
    try {
      const osNumber = await generateNextOsNumber(contracts);
      const newContract = { ...draftContract, ordem_servico: osNumber, _id: Date.now() + Math.random() } as DraftContract;
      setContracts([...contracts, newContract]);
      setDraftContract({ ordem_servico: "", data_emissao: "", data_inicio_projeto: "", data_fim_projeto: "", valor_projeto: 0, valor_reembolso_km: 0, valor_reembolso_refeicao: 0, situacao_projeto: "em_andamento", observacoes_projeto: "", id_servico: "", id_produto_segmento: "", distribuicao_receita: [] });
    } finally { setIsAddingContract(false); }
  };

  const renderProductSelect = (source: typeof produtoSegmentoFullOptions) => {
    const withCluster = source.filter((p) => p.estrutura_clusters?.name);
    const withoutCluster = source.filter((p) => !p.estrutura_clusters?.name);
    const clusterGroups = withCluster.reduce((acc: Record<string, typeof source>, p) => {
      const cName = p.estrutura_clusters!.name;
      if (!acc[cName]) acc[cName] = [];
      acc[cName].push(p);
      return acc;
    }, {} as Record<string, typeof source>);
    return (
      <>
        {Object.entries(clusterGroups).sort(([a], [b]) => a.localeCompare(b)).map(([clusterName, prods]) => (
          <SelectGroup key={clusterName}>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">{clusterName}</SelectLabel>
            {prods.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
          </SelectGroup>
        ))}
        {withoutCluster.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs font-semibold text-muted-foreground">Sem cluster</SelectLabel>
            {withoutCluster.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}
          </SelectGroup>
        )}
      </>
    );
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
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-foreground">OS {cont.ordem_servico}</span>
                      </div>
                      <div className="font-bold text-foreground mt-0.5">{formatCurrencyDisplay(cont.valor_projeto)}</div>
                    </div>
                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform ml-2", isExpanded && "rotate-180")} />
                  </button>

                  {/* Read-only expanded */}
                  {isExpanded && !isEditingThis && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <div className="flex justify-end gap-2 mb-3">
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
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                        <FieldPair label="Data Início" value={cont.data_inicio_projeto ? isoToMasked(cont.data_inicio_projeto) : "—"} />
                        <FieldPair label="Data Fim" value={cont.data_fim_projeto ? isoToMasked(cont.data_fim_projeto) : "—"} />
                        <FieldPair label="Data Emissão" value={cont.data_emissao ? isoToMasked(cont.data_emissao) : "—"} />
                        {cont.id_produto_segmento && (
                          <FieldPair label="Tipo de Produto/Segmento" value={(() => { const p = produtoSegmentoFullOptions.find((p) => p.id === cont.id_produto_segmento); return p ? `${p.codigo} - ${p.nome}` : "—"; })()} />
                        )}
                        <FieldPair label="Valor do Projeto" value={formatCurrencyDisplay(cont.valor_projeto)} />
                        <FieldPair label="Situação do Projeto" value={SITUACAO_PROJETO_OPTIONS.find((o) => o.value === (cont as any).situacao_projeto)?.label || "—"} />
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                          <FieldPair label="Reembolso por KM" value={formatCurrencyDisplay(cont.valor_reembolso_km)} />
                          <FieldPair label="Reembolso Refeição" value={formatCurrencyDisplay(cont.valor_reembolso_refeicao)} />
                        </div>
                        {cont.id_produto_segmento && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Empresa</p>
                            <span className="text-sm">{produtoSegmentoFullOptions.find((p) => p.id === cont.id_produto_segmento)?.estrutura_clusters?.name || "—"}</span>
                          </div>
                        )}
                        {cont.id_produto_segmento && (
                          <div className="col-span-2 md:col-span-3">
                            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Produto/Serviço Contratado</p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {(() => { const p = produtoSegmentoFullOptions.find((p) => p.id === cont.id_produto_segmento); return p ? `${p.codigo} — ${p.nome}` : cont.id_produto_segmento; })()}
                            </Badge>
                          </div>
                        )}
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
                        {(cont as any).observacoes_projeto && (
                          <div className="col-span-2 md:col-span-3"><FieldPair label="Observações" value={(cont as any).observacoes_projeto} /></div>
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
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Produto/Segmento</Label>
                          <div className="mt-1">
                            <Select value={(ec as any).id_produto_segmento || "__none__"} onValueChange={(v) => setEditingContractData({ ...ec, id_produto_segmento: v === "__none__" ? "" : v } as any)}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                {produtoSegmentoFullOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Valor do Projeto (R$)</Label><div className="mt-1"><CurrencyField value={ec.valor_projeto || 0} onChange={(v) => setEditingContractData({ ...ec, valor_projeto: v })} /></div></div>
                        <div>
                          <Label className="text-xs font-semibold uppercase text-muted-foreground">Situação do Projeto</Label>
                          <div className="mt-1">
                            <Select value={(ec as any).situacao_projeto || "em_andamento"} onValueChange={(v) => setEditingContractData({ ...ec, situacao_projeto: v } as any)}>
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>{SITUACAO_PROJETO_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Reembolso por KM (R$)</Label><div className="mt-1"><CurrencyField value={ec.valor_reembolso_km || 0} onChange={(v) => setEditingContractData({ ...ec, valor_reembolso_km: v })} /></div></div>
                        <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Reembolso Refeição (R$)</Label><div className="mt-1"><CurrencyField value={ec.valor_reembolso_refeicao || 0} onChange={(v) => setEditingContractData({ ...ec, valor_reembolso_refeicao: v })} /></div></div>
                      </div>
                      <div className="mt-4">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa</Label>
                        <Select value={osEditClusterFilter} onValueChange={setOsEditClusterFilter}>
                          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas as empresas</SelectItem>
                            {allClusters.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mt-4">
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Produto/Serviço Contratado *</Label>
                        <Select value={(ec as any).id_produto_segmento || "__none__"} onValueChange={(v) => setEditingContractData({ ...ec, id_produto_segmento: v === "__none__" ? "" : v } as any)}>
                          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Selecione...</SelectItem>
                            {renderProductSelect(filteredEditCatalogProducts)}
                          </SelectContent>
                        </Select>
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
                        <Textarea value={(ec as any).observacoes_projeto || ""} onChange={(e) => setEditingContractData({ ...ec, observacoes_projeto: e.target.value } as any)} placeholder="Insira observações relevantes sobre o projeto..." className="min-h-[60px]" />
                      </div>
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={cancelEditContract}>Cancelar</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Save size={14} /> Salvar</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Salvar alterações</AlertDialogTitle><AlertDialogDescription>Deseja salvar as alterações feitas nesta OS?</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEditContract}>Salvar</AlertDialogAction></AlertDialogFooter>
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
              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Tipo de Produto/Segmento</Label>
                <div className="mt-1">
                  <Select value={draftContract.id_produto_segmento || "__none__"} onValueChange={(v) => setDraftContract(prev => ({ ...prev, id_produto_segmento: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione...</SelectItem>
                      {produtoSegmentoFullOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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

            {/* Empresa */}
            <div className="mt-4">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa</Label>
              <Select value={osClusterFilter} onValueChange={setOsClusterFilter}>
                <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Todas as empresas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as empresas</SelectItem>
                  {allClusters.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Produto/Serviço */}
            <div className="mt-4">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Produto/Serviço Contratado *</Label>
              <Select value={draftContract.id_produto_segmento || "__none__"} onValueChange={(v) => setDraftContract(prev => ({ ...prev, id_produto_segmento: v === "__none__" ? "" : v }))}>
                <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione...</SelectItem>
                  {renderProductSelect(filteredCatalogProducts)}
                </SelectContent>
              </Select>
            </div>

            {/* Distribuição de Receita */}
            <div className="mt-4 border border-dashed rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase">Distribuição de Receita (Centros de Custo)</h5>
                <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setDraftContract(prev => ({ ...prev, distribuicao_receita: [...prev.distribuicao_receita, { id_centro_custo: "", percentual_rateio: 0 }] }))}><Plus size={12} /> Adicionar Centro de Custo</Button>
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
              <Button onClick={addContract} disabled={isAddingContract} className="gap-2">{isAddingContract ? "Adicionando..." : "Adicionar OS à Lista"}</Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
