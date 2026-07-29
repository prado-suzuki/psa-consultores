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
import { Plus, X, Pencil, Trash2, ChevronDown, Check, FolderPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SITUACAO_PROJETO_OPTIONS, formatCurrencyDisplay, isoToMasked } from "./constants";
import type { DraftOrdemServico, DraftProdutoContratado } from "@/types/clientForm";
import { createDefaultDraftContract } from "./constants";
import DateFieldWithInput from "./DateFieldWithInput";
import CurrencyField from "./CurrencyField";
import FieldPair from "./FieldPair";
import { RequiredMark } from "@/components/ui/required-mark";
import { useGenerateNextOsNumber } from "@/hooks/useDomainOrdemServicoNumero";

interface SetorCliente {
  id: string;
  nome: string;
  sigla: string;
}

const REGIAO_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "BRA", label: "BRA - Bahia, Goiás, Distrito Federal" },
  { value: "3NO", label: "3NO - BR-163 Norte" },
  { value: "3SU", label: "3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina, Norte do MS" },
  { value: "PAR", label: "PAR - Chapadão do Parecis, região sucroalcooleira, Rondônia" },
  { value: "CBA", label: "CBA - Baixada Cuiabana" },
  { value: "RAO", label: "RAO - Sul do MS, Paraná, SC, Cerrado Mineiro, São Paulo" },
  { value: "MPT", label: "MPT - Mapito, BR-010, Pará" },
];

function getRegiaoLabel(value: string | undefined): string {
  if (!value) return "—";
  return REGIAO_OPTIONS.find(o => o.value === value)?.label || value;
}

/**
 * "Empresa / Faturamento" aponta para o cluster, mas quem fatura é a empresa
 * cadastrada nele (Estrutura > Clusters > Nome da empresa). Exibimos o nome da
 * empresa e caímos no nome do cluster só quando ela não foi preenchida.
 */
function getEmpresaLabel(cluster: { name: string; nome_empresa?: string | null }): string {
  return cluster.nome_empresa?.trim() || cluster.name;
}

export interface ContratosTabProps {
  contracts: DraftOrdemServico[];
  setContracts: React.Dispatch<React.SetStateAction<DraftOrdemServico[]>>;
  isReadOnly: boolean;
  produtoSegmentoFullOptions: Array<{ id: string; codigo: string; nome: string; is_active: boolean; cluster_id: string | null; estrutura_clusters: { name: string; nome_empresa?: string | null } | null }>;
  allClusters: Array<{ id: string; name: string; nome_empresa?: string | null }>;
  CENTRO_CUSTO_OPTIONS: Array<{ id: string; codigo: string; nome: string; label: string }>;
  setoresCliente: SetorCliente[];
  /** Cria um projeto pré-preenchido a partir de uma OS já persistida (só disponível para cliente salvo). */
  onCreateProjectFromOs?: (cont: DraftOrdemServico) => void;
  /**
   * Sai do modo somente-leitura do modal. Permite criar/editar OS direto da lista,
   * sem passar pelo "Editar" do rodapé. Só é passado se o usuário tem permissão.
   */
  onRequestEditMode?: () => void;
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
  empresaId,
  onEmpresaChange,
}: {
  produtos: DraftProdutoContratado[];
  onChange: (produtos: DraftProdutoContratado[]) => void;
  produtoOptions: ContratosTabProps['produtoSegmentoFullOptions'];
  allClusters: ContratosTabProps['allClusters'];
  readOnly?: boolean;
  /** Empresa de faturamento da OS (`cluster_id`). Não filtra os produtos. */
  empresaId: string;
  onEmpresaChange: (v: string) => void;
}) {
  // Ordena pelo nome exibido (empresa), não pelo nome do cluster que vem do banco.
  const empresaOptions = useMemo(
    () => allClusters
      .map(c => ({ id: c.id, label: getEmpresaLabel(c) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [allClusters],
  );

  const [addingProductId, setAddingProductId] = useState<string>("__none__");

  const handleAdd = (produtoId: string) => {
    if (produtoId === "__none__") return;
    if (produtos.some(p => p.produto_segmento_id === produtoId)) {
      toast.error("Este produto já foi adicionado a esta OS");
      return;
    }
    onChange([...produtos, { _id: Date.now() + Math.random(), produto_segmento_id: produtoId, horas_contratadas: undefined }]);
    setAddingProductId("__none__");
  };

  const handleHorasChange = (idx: number, value: string) => {
    const updated = [...produtos];
    const num = parseFloat(value);
    updated[idx] = { ...updated[idx], horas_contratadas: isNaN(num) ? undefined : num };
    onChange(updated);
  };

  const handleRemove = (idx: number) => {
    onChange(produtos.filter((_, i) => i !== idx));
  };

  // A empresa de faturamento da OS NÃO restringe os produtos: a lista mostra
  // sempre o catálogo inteiro, apenas agrupado pela empresa de cada produto.
  const renderGroupedSelect = () => {
    const withCluster = produtoOptions.filter(p => p.estrutura_clusters?.name);
    const withoutCluster = produtoOptions.filter(p => !p.estrutura_clusters?.name);
    const groups = withCluster.reduce((acc: Record<string, typeof produtoOptions>, p) => {
      const cName = getEmpresaLabel(p.estrutura_clusters!);
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
            <SelectLabel className="text-xs font-semibold text-muted-foreground">Sem empresa</SelectLabel>
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
              {pc.horas_contratadas != null && ` (${pc.horas_contratadas}h)`}
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
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Empresa / Faturamento<RequiredMark /></Label>
        <Select value={empresaId} onValueChange={onEmpresaChange}>
          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione a empresa..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todas as empresas</SelectItem>
            {empresaOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Existing products */}
      {produtos.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase text-muted-foreground">Produtos Adicionados</Label>
          <div className="space-y-2 mt-1">
            {produtos.map((pc, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1.5 pr-1 shrink-0">
                  {getProductLabel(pc.produto_segmento_id, produtoOptions)}
                  <button type="button" className="ml-1 rounded-full hover:bg-destructive/20 p-0.5" onClick={() => handleRemove(idx)}>
                    <X size={12} className="text-destructive" />
                  </button>
                </Badge>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={pc.horas_contratadas ?? ""}
                  onChange={(e) => handleHorasChange(idx, e.target.value)}
                  className="h-7 w-28"
                  placeholder="Horas"
                />
                <span className="text-xs text-muted-foreground shrink-0">hrs contratadas /mês</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add product — entra na OS ao escolher, sem botão de confirmar */}
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">Adicionar Produto<RequiredMark /></Label>
        <Select value={addingProductId} onValueChange={handleAdd}>
          <SelectTrigger className="h-8 mt-1"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Selecione...</SelectItem>
            {renderGroupedSelect()}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

export default function ContratosTab({
  contracts, setContracts,
  isReadOnly,
  produtoSegmentoFullOptions, allClusters, CENTRO_CUSTO_OPTIONS,
  setoresCliente,
  onCreateProjectFromOs,
  onRequestEditMode,
}: ContratosTabProps) {
  const setorById = (id: string) => setoresCliente.find(s => s.id === id);
  const setorLabel = (id: string | undefined, sigla: string | undefined) => {
    if (!id && !sigla) return "—";
    const s = id ? setorById(id) : undefined;
    if (s) return `${s.sigla} - ${s.nome}`;
    return sigla || "—";
  };
  const [expandedContractId, setExpandedContractId] = useState<number | null>(null);
  const [editingContractId, setEditingContractId] = useState<number | null>(null);
  const [osEmpresaId, setOsEmpresaId] = useState<string>("__all__");
  const { mutateAsync: generateNextOsNumber, isPending: isCreatingOs } = useGenerateNextOsNumber();

  const canEditOs = !isReadOnly || !!onRequestEditMode;

  /**
   * Toda alteração cai direto na lista de OS do formulário — não existe
   * "adicionar/aplicar" intermediário. A gravação no banco continua sendo
   * só o "Salvar Alterações" do rodapé, que valida todas as OS.
   */
  const updateContract = (id: number, patch: Partial<DraftOrdemServico>) => {
    setContracts(prev => prev.map(c => (c._id === id ? ({ ...c, ...patch } as DraftOrdemServico) : c)));
  };

  // `_dbId` no tipo de propósito: é o id da linha no banco. As transformações
  // precisam preservá-lo (`{ ...row }`) — se ele se perde, o save trata a linha
  // como nova e insere uma segunda cópia do mesmo centro de custo.
  const updateDistribuicao = (
    id: number,
    fn: (dist: Array<{ id_centro_custo: string; percentual_rateio: number; _dbId?: string }>) => Array<{ id_centro_custo: string; percentual_rateio: number; _dbId?: string }>,
  ) => {
    setContracts(prev => prev.map(c => (c._id === id ? ({ ...c, distribuicao_receita: fn(c.distribuicao_receita || []) } as DraftOrdemServico) : c)));
  };

  const handleEmpresaChange = (id: number, v: string) => {
    setOsEmpresaId(v);
    updateContract(id, { cluster_id: v === "__all__" ? "" : v });
  };

  const startEditContract = (cont: DraftOrdemServico) => {
    if (isReadOnly) {
      if (!onRequestEditMode) return;
      onRequestEditMode();
    }
    setExpandedContractId(cont._id);
    setEditingContractId(cont._id);
    setOsEmpresaId(cont.cluster_id || "__all__");
  };

  const createOs = async () => {
    if (isReadOnly) {
      if (!onRequestEditMode) return;
      onRequestEditMode();
    }
    const osNumber = await generateNextOsNumber(contracts);
    const novaOs = {
      ...createDefaultDraftContract(),
      ordem_servico: osNumber,
      _id: Date.now() + Math.random(),
    } as unknown as DraftOrdemServico;
    setContracts(prev => [...prev, novaOs]);
    setExpandedContractId(novaOs._id);
    setEditingContractId(novaOs._id);
    setOsEmpresaId("__all__");
  };

  const removeContract = (id: number) => {
    if (isReadOnly) {
      if (!onRequestEditMode) return;
      onRequestEditMode();
    }
    setContracts(prev => prev.filter(c => c._id !== id));
    if (expandedContractId === id) setExpandedContractId(null);
    if (editingContractId === id) setEditingContractId(null);
  };

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">OS - Ordem de Serviço ({contracts.length})</h3>
        {canEditOs && editingContractId == null && (
          <Button size="sm" onClick={createOs} disabled={isCreatingOs} className="gap-1.5 h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white">
            <Plus size={14} /> {isCreatingOs ? "Criando..." : "Criar nova OS"}
          </Button>
        )}
      </div>
      <div className="px-4 py-3">
        {contracts.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">Nenhuma OS cadastrada.</p>
        )}

        <div className="space-y-3">
          {contracts.map((cont) => {
            const isExpanded = expandedContractId === cont._id;
            const isEditingThis = editingContractId === cont._id;
            const dist = cont.distribuicao_receita || [];
            return (
              <div key={cont._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                <div className="w-full flex items-center gap-2 p-4">
                  <button type="button" className="flex-1 min-w-0 text-left"
                    onClick={() => { if (!isEditingThis) setExpandedContractId(isExpanded ? null : cont._id); }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-foreground">
                        {getOsHeaderLabel(cont, produtoSegmentoFullOptions)}
                      </span>
                    </div>
                    <div className="font-bold text-foreground mt-0.5">{formatCurrencyDisplay(cont.valor_projeto)}</div>
                  </button>

                  {/* Ações da OS no próprio cabeçalho — sem precisar expandir o card */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditingThis ? (
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingContractId(null)}>
                        <Check size={12} /> Concluir
                      </Button>
                    ) : (
                      canEditOs && (
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => startEditContract(cont)}>
                          <Pencil size={12} /> Editar
                        </Button>
                      )
                    )}
                    {canEditOs && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive"><Trash2 size={12} /> Remover</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Remover OS</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja remover a OS "{cont.ordem_servico}"? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeContract(cont._id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <button type="button" aria-label={isExpanded ? "Recolher OS" : "Expandir OS"} className="shrink-0 p-1 rounded hover:bg-muted"
                    onClick={() => { if (!isEditingThis) setExpandedContractId(isExpanded ? null : cont._id); }}>
                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>

                {/* Leitura */}
                {isExpanded && !isEditingThis && (
                  <div className="px-4 pb-4 border-t pt-3">
                    {onCreateProjectFromOs && cont._dbId && (cont.produtos_contratados?.length ?? 0) > 0 && (
                      <div className="flex justify-end gap-2 mb-3">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs border-teal-600 text-teal-700 hover:bg-teal-50" onClick={() => onCreateProjectFromOs(cont)}><FolderPlus size={12} /> Criar projetos ({cont.produtos_contratados.length})</Button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                      <FieldPair label="Data Início" value={cont.data_inicio_projeto ? isoToMasked(cont.data_inicio_projeto) : "—"} />
                      <FieldPair label="Data Fim" value={cont.data_fim_projeto ? isoToMasked(cont.data_fim_projeto) : "—"} />
                      <FieldPair label="Data Emissão" value={cont.data_emissao ? isoToMasked(cont.data_emissao) : "—"} />
                      <FieldPair label="Valor do Projeto" value={formatCurrencyDisplay(cont.valor_projeto)} />
                      <FieldPair label="Situação do Projeto" value={SITUACAO_PROJETO_OPTIONS.find((o) => o.value === cont.situacao_projeto)?.label || "—"} />
                      <FieldPair label="Área do Negócio" value={setorLabel(cont.setor_cliente_id, cont.setor_cliente)} />
                      <FieldPair label="Região" value={getRegiaoLabel(cont.regiao)} />
                      <div className="col-span-2 grid grid-cols-2 gap-4">
                        <FieldPair label="Reembolso por KM" value={formatCurrencyDisplay(cont.valor_reembolso_km)} />
                        <FieldPair label="Reembolso Refeição" value={formatCurrencyDisplay(cont.valor_reembolso_refeicao)} />
                      </div>
                      <div className="col-span-2 md:col-span-3">
                        <ProdutoContratadoBlock
                          produtos={cont.produtos_contratados || []}
                          onChange={() => {}}
                          produtoOptions={produtoSegmentoFullOptions}
                          allClusters={allClusters}
                          readOnly
                          empresaId="__all__"
                          onEmpresaChange={() => {}}
                        />
                      </div>
                      {dist.length > 0 && (
                        <div className="col-span-2 md:col-span-3">
                          <p className="text-[10px] uppercase font-semibold text-muted-foreground">Distribuição de Receita</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {dist.map((cc, idx) => {
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

                {/* Edição — cada campo grava direto na OS */}
                {isExpanded && isEditingThis && (
                  <div className="px-4 pb-4 border-t pt-3">
                    <h5 className="text-xs font-bold uppercase text-muted-foreground border-b pb-2 mb-4">Dados da OS — {cont.ordem_servico}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data Início</Label><div className="mt-1"><DateFieldWithInput value={cont.data_inicio_projeto || ""} onChange={(v) => updateContract(cont._id, { data_inicio_projeto: v })} /></div></div>
                      <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data Fim</Label><div className="mt-1"><DateFieldWithInput value={cont.data_fim_projeto || ""} onChange={(v) => updateContract(cont._id, { data_fim_projeto: v })} /></div></div>
                      <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Data de Emissão</Label><div className="mt-1"><DateFieldWithInput value={cont.data_emissao || ""} onChange={(v) => updateContract(cont._id, { data_emissao: v })} /></div></div>
                      <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Valor do Projeto (R$)</Label><div className="mt-1"><CurrencyField value={cont.valor_projeto || 0} onChange={(v) => updateContract(cont._id, { valor_projeto: v })} /></div></div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Situação do Projeto</Label>
                        <div className="mt-1">
                          <Select value={cont.situacao_projeto || "em_andamento"} onValueChange={(v) => updateContract(cont._id, { situacao_projeto: v })}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>{SITUACAO_PROJETO_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Área do Negócio<RequiredMark /></Label>
                        <div className="mt-1">
                          <Select
                            value={cont.setor_cliente_id || "__none__"}
                            onValueChange={(v) => {
                              if (v === "__none__") {
                                updateContract(cont._id, { setor_cliente_id: "", setor_cliente: "" });
                              } else {
                                const setor = setoresCliente.find(s => s.id === v);
                                updateContract(cont._id, { setor_cliente_id: v, setor_cliente: setor?.sigla || "" });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {setoresCliente.map((setor) => (
                                <SelectItem key={setor.id} value={setor.id}>{setor.sigla} - {setor.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase text-muted-foreground">Região<RequiredMark /></Label>
                        <div className="mt-1">
                          <Select
                            value={cont.regiao || "__none__"}
                            onValueChange={(v) => updateContract(cont._id, { regiao: v === "__none__" ? "" : v })}
                          >
                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {REGIAO_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Reembolso por KM (R$)</Label><div className="mt-1"><CurrencyField value={cont.valor_reembolso_km || 0} onChange={(v) => updateContract(cont._id, { valor_reembolso_km: v })} /></div></div>
                      <div><Label className="text-xs font-semibold uppercase text-muted-foreground">Reembolso Refeição (R$)</Label><div className="mt-1"><CurrencyField value={cont.valor_reembolso_refeicao || 0} onChange={(v) => updateContract(cont._id, { valor_reembolso_refeicao: v })} /></div></div>
                    </div>

                    {/* Produtos contratados */}
                    <div className="mt-4">
                      <ProdutoContratadoBlock
                        produtos={(cont.produtos_contratados || []) as DraftProdutoContratado[]}
                        onChange={(prods) => updateContract(cont._id, { produtos_contratados: prods })}
                        produtoOptions={produtoSegmentoFullOptions}
                        allClusters={allClusters}
                        empresaId={osEmpresaId}
                        onEmpresaChange={(v) => handleEmpresaChange(cont._id, v)}
                      />
                    </div>

                    {/* Distribuição de Receita */}
                    <div className="border border-dashed rounded-lg p-3 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-xs font-bold text-muted-foreground uppercase">Distribuição de Receita (Centros de Custo)<RequiredMark /></h5>
                        <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => updateDistribuicao(cont._id, (d) => [...d, { id_centro_custo: "", percentual_rateio: 0 }])}><Plus size={12} /> Adicionar linha</Button>
                      </div>
                      {dist.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum centro de custo. A soma precisa fechar 100% para salvar.</p>}
                      {dist.map((cc, idx) => (
                        <div key={idx} className="flex items-center gap-2 mt-1">
                          <Select value={cc.id_centro_custo || "__none__"} onValueChange={(v) => updateDistribuicao(cont._id, (d) => d.map((row, i) => (i === idx ? { ...row, id_centro_custo: v === "__none__" ? "" : v } : row)))}>
                            <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {CENTRO_CUSTO_OPTIONS.map((cc_opt) => <SelectItem key={cc_opt.id} value={cc_opt.id}>{cc_opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-1 shrink-0">
                            <Input type="number" min={0} max={100} value={cc.percentual_rateio || ""} onChange={(e) => { const val = parseFloat(e.target.value) || 0; updateDistribuicao(cont._id, (d) => d.map((row, i) => (i === idx ? { ...row, percentual_rateio: val } : row))); }} className="h-8 w-20 text-right" placeholder="%" />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => updateDistribuicao(cont._id, (d) => d.filter((_, i) => i !== idx))}><X size={14} /></Button>
                        </div>
                      ))}
                      {dist.length > 0 && (() => {
                        const total = dist.reduce((acc, cc) => acc + (cc.percentual_rateio || 0), 0);
                        const preenchidos = dist.map(cc => cc.id_centro_custo).filter(Boolean);
                        const repetido = new Set(preenchidos).size !== preenchidos.length;
                        return (
                          <>
                            <p className={cn("text-xs mt-2 font-medium", total === 100 ? "text-green-600" : total > 100 ? "text-destructive" : "text-amber-600")}>Total: {total.toFixed(0)}%{total < 100 && ` — Faltam ${(100 - total).toFixed(0)}%`}{total > 100 && ` — Excedeu ${(total - 100).toFixed(0)}%`}{total === 100 && " ✓"}</p>
                            {repetido && <p className="text-xs mt-1 font-medium text-destructive">Centro de custo repetido — remova a linha duplicada para poder salvar.</p>}
                          </>
                        );
                      })()}
                    </div>

                    <div className="mt-4">
                      <h5 className="text-xs font-bold text-muted-foreground uppercase mb-2">Observações</h5>
                      <Textarea value={cont.observacoes_projeto || ""} onChange={(e) => updateContract(cont._id, { observacoes_projeto: e.target.value })} placeholder="Insira observações relevantes sobre o projeto..." className="min-h-[60px]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
