import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, Pencil, Trash2, ChevronDown, Check, Copy, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { UF_STATES, formatCpfCnpj, formatCep, formatPhone } from "./constants";
import type { DraftEntity, InscricaoIE } from "@/types/clientForm";
import FieldPair from "./FieldPair";
import { useAcentoArea } from "./acentoArea";
import { RequiredMark } from "@/components/ui/required-mark";
import { useAuth } from "@/contexts/AuthContext";
import { useContribuinteDuplicateCheck, type DuplicateContribuinte } from "@/hooks/useContribuinteDuplicateCheck";
import { useContribuinteAutofill, type ContribuinteAutofill } from "@/hooks/useContribuinteAutofill";
import ListaMestreDetalhe from "./ListaMestreDetalhe";
import { idsAlterados, resolverSelecao, selecaoAposRemover } from "@/lib/listaMestreDetalhe";

export interface ContribuintesTabProps {
  entities: DraftEntity[];
  setEntities: React.Dispatch<React.SetStateAction<DraftEntity[]>>;
  inscricoesMap: Record<string, InscricaoIE[]>;
  setInscricoesMap: React.Dispatch<React.SetStateAction<Record<string, InscricaoIE[]>>>;
  cnpjLoading: boolean;
  cepLoading: boolean;
  cnpjLookup: (value: string, setter: any) => Promise<void>;
  cepLookup: (value: string, setter: any) => Promise<void>;
  isReadOnly: boolean;
  /**
   * O que a edição em curso libera. `'cliente'` veio do "Editar" do rodapé e
   * destrava tudo; `'item'` veio do "Editar" de uma linha e destrava só ela.
   */
  escopoEdicao?: 'cliente' | 'item' | null;
  /**
   * Abre a edição com escopo de item, a partir da visualização. Antes desta
   * prop não havia como corrigir um contribuinte sem destravar o cadastro todo.
   */
  onRequestItemEdit?: () => void;
  /** Os contribuintes como vieram do banco, para marcar na lista o que mudou. */
  entidadesOriginais?: DraftEntity[];
  onInlineEditingChange?: (isEditing: boolean) => void;
}

export default function ContribuintesTab({
  entities, setEntities,
  inscricoesMap, setInscricoesMap,
  cnpjLoading, cepLoading,
  cnpjLookup, cepLookup,
  isReadOnly,
  escopoEdicao,
  onRequestItemEdit,
  entidadesOriginais,
  onInlineEditingChange,
}: ContribuintesTabProps) {
  const { isAdmin } = useAuth();
  const acento = useAcentoArea();
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [editingEntityId, setEditingEntityId] = useState<number | null>(null);

  /** Adicionar e remover contribuinte pertencem ao escopo de cliente. */
  const escopoCliente = !isReadOnly && escopoEdicao !== 'item';
  /**
   * O "Editar" por linha existe só na visualização, como porta de entrada do
   * escopo de item. Em edição do cliente os campos já estão abertos.
   */
  const mostrarEditarPorLinha = isReadOnly ? !!onRequestItemEdit : escopoEdicao === 'item';

  // Mantem sempre algo selecionado, inclusive quando a lista chega depois.
  const selecaoEfetiva = resolverSelecao(entities, selecionadoId);
  useEffect(() => {
    if (selecaoEfetiva !== selecionadoId) setSelecionadoId(selecaoEfetiva);
  }, [selecaoEfetiva, selecionadoId]);

  const alterados = useMemo(
    () => idsAlterados(entities, entidadesOriginais ?? []),
    [entities, entidadesOriginais],
  );

  useEffect(() => {
    onInlineEditingChange?.(editingEntityId != null);
  }, [editingEntityId, onInlineEditingChange]);

  type DupState = { found: true; isLocal: boolean; clienteName?: string | null } | null;
  const [editDuplicate, setEditDuplicate] = useState<DupState>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const checkDuplicate = useContribuinteDuplicateCheck();
  const checkAutofill = useContribuinteAutofill();

  // Autofill de conveniência para PF: ao informar um CPF já existente na base,
  // pré-preenche os campos VAZIOS a partir da cópia mais recente. Não cria vínculo
  // nem reusa id — a linha nova continua sendo inserida com id próprio no save.
  const applyCpfAutofill = async (
    rawValue: string,
    current: Partial<DraftEntity>,
    setter: React.Dispatch<React.SetStateAction<any>>,
  ) => {
    const digits = (rawValue || "").replace(/\D/g, "");
    if (digits.length !== 11) return;
    let auto: ContribuinteAutofill | null = null;
    try {
      auto = await checkAutofill(rawValue);
    } catch (err) {
      console.error("Erro no autofill de CPF:", err);
      return;
    }
    if (!auto) return;
    const fields: (keyof ContribuinteAutofill)[] = [
      "nome_razao_social", "telefone", "cep", "logradouro", "numero",
      "complemento", "bairro", "municipio", "uf",
    ];
    const patch: Record<string, string> = {};
    for (const f of fields) {
      const cur = (current as any)[f];
      if ((!cur || String(cur).trim() === "") && auto[f]) {
        patch[f] = auto[f];
      }
    }
    if (Object.keys(patch).length === 0) return;
    setter((prev: any) => ({ ...prev, ...patch }));
    toast.success("Dados preenchidos a partir de um cadastro existente deste CPF.");
  };

  const findLocalDuplicate = (digits: string, ignoreLocalId?: number) => {
    if (digits.length !== 11 && digits.length !== 14) return false;
    return entities.some(
      (e) => e._id !== ignoreLocalId && (e.cpf_cnpj || "").replace(/\D/g, "") === digits,
    );
  };

  const runDuplicateCheck = async (
    rawValue: string,
    ignoreLocalId?: number,
    ignoreDbId?: string,
  ): Promise<DupState> => {
    const digits = (rawValue || "").replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) return null;
    if (findLocalDuplicate(digits, ignoreLocalId)) {
      return { found: true, isLocal: true };
    }
    // PF (sócio) pode ser contribuinte de mais de um cliente → não trata duplicidade
    // cross-cliente para CPF (nem bloqueia, nem avisa). PJ (CNPJ) segue 1-por-cliente.
    if (digits.length !== 14) {
      return null;
    }
    try {
      setCheckingDuplicate(true);
      const dup = await checkDuplicate(digits, ignoreDbId);
      if (dup) return { found: true, isLocal: false, clienteName: dup.cliente_nome };
      return null;
    } catch (err) {
      console.error("Erro ao verificar duplicidade de contribuinte:", err);
      return null;
    } finally {
      setCheckingDuplicate(false);
    }
  };

  /**
   * Cada campo grava direto no contribuinte da lista — não existe
   * "adicionar/aplicar" intermediário. Validação e gravação no banco
   * acontecem no "Salvar Alterações" do rodapé.
   */
  const updateEntity = (id: number, patch: Partial<DraftEntity>) => {
    setEntities(prev => prev.map(e => (e._id === id ? ({ ...e, ...patch } as DraftEntity) : e)));
  };

  /** Setter compatível com os hooks de consulta externa (CNPJ/CEP), aplicado a um contribuinte. */
  const entitySetter = (id: number) => (updater: any) => {
    setEntities(prev => prev.map(e => {
      if (e._id !== id) return e;
      return (typeof updater === "function" ? updater(e) : { ...e, ...updater }) as DraftEntity;
    }));
  };

  const handleEntityCnpjBlur = async (ent: DraftEntity, value: string) => {
    await cnpjLookup(value, entitySetter(ent._id) as any);
    const dup = await runDuplicateCheck(value, ent._id, ent._dbId);
    setEditDuplicate(dup);
    if (dup?.found) {
      toast.error(
        dup.isLocal
          ? "Contribuinte já cadastrado neste cliente"
          : `Contribuinte já cadastrado no cliente "${dup.clienteName ?? "—"}"`,
      );
    }
    if (ent.tipo_pessoa === "PF") {
      await applyCpfAutofill(value, ent, entitySetter(ent._id) as any);
    }
  };
  const handleEntityCepBlur = (ent: DraftEntity, value: string) => cepLookup(value, entitySetter(ent._id) as any);

  const startEditEntity = (ent: DraftEntity) => {
    if (isReadOnly) {
      if (!onRequestItemEdit) return;
      onRequestItemEdit();
    }
    setEditingEntityId(ent._id);
    setEditDuplicate(null);
  };

  const createEntity = () => {
    const nova = {
      tipo_pessoa: "PJ", cpf_cnpj: "", nome_razao_social: "", nome_fantasia: "",
      situacao_inscricao_estadual: "", inscricao_estadual: "", cod_cnae: "", setor: "",
      simples_nacional: "", telefone: "", cep: "", logradouro: "", numero: "", complemento: "",
      bairro: "", municipio: "", uf: "", contribuinte_faturamento: false, atividade_principal: "",
      _id: Date.now() + Math.random(),
    } as unknown as DraftEntity;
    setEntities(prev => [...prev, nova]);
    setSelecionadoId(nova._id);
    setEditingEntityId(nova._id);
    setEditDuplicate(null);
  };

  const removeEntity = (id: number) => {
    setEntities(prev => prev.filter(e => e._id !== id));
    setSelecionadoId(selecaoAposRemover(entities, id));
    if (editingEntityId === id) setEditingEntityId(null);
  };

  const handleCopyFirstAddress = (targetId: number) => {
    const first = entities.find((e) => e._id !== targetId && e.cep?.trim());
    if (!first) {
      toast.warning("Nenhum outro contribuinte com endereço cadastrado");
      return;
    }
    updateEntity(targetId, {
      cep: first.cep, logradouro: first.logradouro, numero: first.numero,
      complemento: first.complemento, bairro: first.bairro, municipio: first.municipio, uf: first.uf,
    });
    toast.success(`Endereço copiado de "${first.nome_razao_social || "outro contribuinte"}"`);
  };

  const ent = entities.find((e) => e._id === selecaoEfetiva) ?? null;
  const isEditingThis = ent != null && editingEntityId === ent._id;
  const linhaEditavel = isEditingThis || escopoCliente;

  return (
    <ListaMestreDetalhe
      titulo={"Contribuintes (" + entities.length + ")"}
      acaoCriar={escopoCliente && editingEntityId == null ? (
        <Button size="sm" onClick={createEntity} className={cn("gap-1.5 h-7 text-xs", acento.botao)}>
          <Plus size={14} /> Adicionar contribuinte
        </Button>
      ) : null}
      linhas={entities.map((e) => ({
        id: e._id,
        titulo: e.nome_razao_social?.trim() || "Novo contribuinte",
        subtitulo: e.cpf_cnpj || "sem documento",
        etiqueta: (
          <span className="flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-[10px]">{e.tipo_pessoa}</Badge>
            {e.contribuinte_faturamento && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">Faturamento</span>
            )}
            {e.simples_nacional === "optante" && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-foreground">Simples</span>
            )}
          </span>
        ),
        alterado: alterados.has(e._id),
      }))}
      selecionadoId={selecaoEfetiva}
      onSelecionar={setSelecionadoId}
      chaveDetalhe={selecaoEfetiva + ":" + (linhaEditavel ? "edicao" : "leitura")}
      vazio="Nenhum contribuinte cadastrado."
      cabecalhoDetalhe={ent ? (ent.nome_razao_social?.trim() || "Novo contribuinte") : null}
      acoesDetalhe={ent ? (
        <>
          {isEditingThis ? (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingEntityId(null)}>
              <Check size={12} /> Pronto
            </Button>
          ) : (
            mostrarEditarPorLinha && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon" variant="outline" className="h-9 w-9"
                    aria-label={"Editar " + (ent.nome_razao_social || "contribuinte")}
                    onClick={() => startEditEntity(ent)}
                  >
                    <Pencil size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar contribuinte</TooltipContent>
              </Tooltip>
            )
          )}
        </>
      ) : null}
    >
      {ent && (
        <>
                  {/* Read-only expanded view */}
                  {!linhaEditavel && (
                    <div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                        <FieldPair label="Tipo Pessoa" value={ent.tipo_pessoa} />
                        <FieldPair label="CPF/CNPJ" value={ent.cpf_cnpj} />
                        <FieldPair label="Razão Social / Nome Completo" value={ent.nome_razao_social} />
                        {ent.tipo_pessoa !== "PF" && <FieldPair label="Nome Fantasia" value={ent.nome_fantasia} />}
                        <FieldPair label="Telefone" value={ent.telefone} />
                        <FieldPair label="Possui Inscrição Estadual?" value={
                          ent.situacao_inscricao_estadual === "sim" ? "Sim"
                            : ent.situacao_inscricao_estadual === "nao" ? "Não"
                            : ent.situacao_inscricao_estadual === "isento" ? "Isento" : "—"
                        } />
                        {ent.situacao_inscricao_estadual === "sim" && (
                          <div className="col-span-2 md:col-span-3">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(inscricoesMap[ent._dbId || String(ent._id)] || []).length > 0
                                ? (inscricoesMap[ent._dbId || String(ent._id)] || []).map((ie) => (
                                    <Badge key={ie._tempId} variant="secondary" className="text-xs">
                                      {ie.uf} — {ie.situacao === "isento" ? "Isento" : ie.situacao === "nao" ? "Não inscrito" : ie.numero_ie || "—"}
                                    </Badge>
                                  ))
                                : <span className="text-sm text-muted-foreground">Nenhuma IE cadastrada</span>
                              }
                            </div>
                          </div>
                        )}
                        {ent.tipo_pessoa === "PJ" && <FieldPair label="CNAE" value={ent.cod_cnae} />}
                        {ent.tipo_pessoa === "PJ" && ent.atividade_principal && <FieldPair label="Atividade Principal" value={ent.atividade_principal} />}
                        {ent.tipo_pessoa === "PJ" && (
                          <FieldPair label="Simples Nacional" value={ent.simples_nacional === "optante" ? "Optante" : ent.simples_nacional === "nao_optante" ? "Não Optante" : "—"} />
                        )}
                        <FieldPair label="CEP" value={ent.cep} />
                        <FieldPair label="Logradouro" value={ent.logradouro} />
                        <FieldPair label="Número" value={ent.numero} />
                        <FieldPair label="Complemento" value={ent.complemento} />
                        <FieldPair label="Bairro" value={ent.bairro} />
                        <FieldPair label="Município" value={ent.municipio} />
                        <FieldPair label="UF" value={ent.uf} />
                        <FieldPair label="Contribuinte de Faturamento" value={ent.contribuinte_faturamento ? "Sim" : "Não"} />
                      </div>
                    </div>
                  )}

                  {/* Inline edit mode */}
                  {linhaEditavel && (
                    <div>
                      <div className="flex flex-col gap-2.5">
                        {/* Tipo */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo</Label>
                          <div className="flex-1">
                            <Select value={ent.tipo_pessoa || "PJ"} onValueChange={(v) => updateEntity(ent._id, { tipo_pessoa: v, cpf_cnpj: "" })}>
                              <SelectTrigger className="h-8 max-w-[160px]"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="PJ">PJ</SelectItem><SelectItem value="PF">PF</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* CPF/CNPJ */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CPF/CNPJ<RequiredMark /></Label>
                          <div className="flex-1">
                            <div className="relative">
                              <Input
                                value={ent.cpf_cnpj || ""}
                                onChange={(e) => { updateEntity(ent._id, { cpf_cnpj: formatCpfCnpj(e.target.value, ent.tipo_pessoa || "PJ") }); setEditDuplicate(null); }}
                                onBlur={(e) => handleEntityCnpjBlur(ent, e.target.value)}
                                aria-invalid={editDuplicate?.found || undefined}
                                className={cn("font-mono pr-8 h-8", editDuplicate?.found && "border-destructive focus-visible:ring-destructive")}
                              />
                              {(cnpjLoading || checkingDuplicate) && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                            {editDuplicate?.found && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-destructive">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Contribuinte já cadastrado{editDuplicate.isLocal ? " neste cliente" : ` no cliente "${editDuplicate.clienteName ?? "—"}"`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Razão Social */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">{ent.tipo_pessoa === "PF" ? <>Nome completo<RequiredMark /></> : <>Razão Social<RequiredMark /></>}</Label>
                          <div className="flex-1"><Input value={ent.nome_razao_social || ""} onChange={(e) => updateEntity(ent._id, { nome_razao_social: e.target.value })} placeholder={ent.tipo_pessoa === "PF" ? "Nome completo do contribuinte" : "Nome Empresarial"} className="font-medium h-8" /></div>
                        </div>
                        {ent.tipo_pessoa !== "PF" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome Fantasia</Label>
                            <div className="flex-1"><Input value={ent.nome_fantasia || ""} onChange={(e) => updateEntity(ent._id, { nome_fantasia: e.target.value })} className="h-8" /></div>
                          </div>
                        )}
                        {/* Telefone */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                          <div className="flex-1"><Input value={ent.telefone || ""} onChange={(e) => updateEntity(ent._id, { telefone: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" className="h-8" /></div>
                        </div>
                        {/* Possui IE? */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Possui Inscrição Estadual?</Label>
                          <div className="flex-1">
                            <Select value={ent.situacao_inscricao_estadual || undefined} onValueChange={(v) => {
                              updateEntity(ent._id, { situacao_inscricao_estadual: v });
                              if (v !== "sim") {
                                const key = ent._dbId || String(ent._id);
                                setInscricoesMap(prev => ({ ...prev, [key]: [] }));
                              }
                            }}>
                              <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem><SelectItem value="isento">Isento</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* IE list */}
                        {ent.situacao_inscricao_estadual === "sim" && (
                          <div className="border border-dashed rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                              <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => {
                                const key = ent._dbId || String(ent._id);
                                setInscricoesMap(prev => ({ ...prev, [key]: [...(prev[key] || []), { _tempId: Date.now() + Math.random(), situacao: "sim", numero_ie: "", uf: "" }] }));
                              }}><Plus size={12} /> Adicionar IE</Button>
                            </div>
                            {(inscricoesMap[ent._dbId || String(ent._id)] || []).map((ie, ieIdx) => (
                              <div key={ie._tempId} className="flex items-center gap-2 mt-1">
                                <Select value={ie.uf || undefined} onValueChange={(v) => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => { const list = [...(prev[key] || [])]; list[ieIdx] = { ...list[ieIdx], uf: v }; return { ...prev, [key]: list }; });
                                }}>
                                  <SelectTrigger className="h-8 w-24 shrink-0"><SelectValue placeholder="UF" /></SelectTrigger>
                                  <SelectContent>{UF_STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={ie.situacao || undefined} onValueChange={(v) => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => { const list = [...(prev[key] || [])]; list[ieIdx] = { ...list[ieIdx], situacao: v, numero_ie: v !== "sim" ? "" : list[ieIdx].numero_ie }; return { ...prev, [key]: list }; });
                                }}>
                                  <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue placeholder="Situação" /></SelectTrigger>
                                  <SelectContent><SelectItem value="sim">Sim</SelectItem><SelectItem value="nao">Não</SelectItem><SelectItem value="isento">Isento</SelectItem></SelectContent>
                                </Select>
                                {ie.situacao === "sim" && (
                                  <Input value={ie.numero_ie} onChange={(e) => {
                                    const key = ent._dbId || String(ent._id);
                                    setInscricoesMap(prev => { const list = [...(prev[key] || [])]; list[ieIdx] = { ...list[ieIdx], numero_ie: e.target.value }; return { ...prev, [key]: list }; });
                                  }} placeholder="Nº IE" maxLength={15} className="h-8 flex-1" />
                                )}
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => ({ ...prev, [key]: (prev[key] || []).filter((_, i) => i !== ieIdx) }));
                                }}><X size={14} /></Button>
                              </div>
                            ))}
                            {(inscricoesMap[ent._dbId || String(ent._id)] || []).length === 0 && (
                              <p className="text-xs text-muted-foreground italic mt-1">Nenhuma IE cadastrada.</p>
                            )}
                          </div>
                        )}
                        {/* CNAE */}
                        {ent.tipo_pessoa === "PJ" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CNAE<RequiredMark /></Label>
                            <div className="flex-1"><Input value={ent.cod_cnae || ""} onChange={(e) => updateEntity(ent._id, { cod_cnae: e.target.value })} className="h-8 max-w-[200px]" /></div>
                          </div>
                        )}
                        {ent.tipo_pessoa === "PJ" && (ent as any).atividade_principal && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Atividade Principal</Label>
                            <div className="flex-1"><Input value={(ent as any).atividade_principal || ""} disabled className="h-8 bg-muted/50" /></div>
                          </div>
                        )}
                        {ent.tipo_pessoa === "PJ" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Simples Nacional<RequiredMark /></Label>
                            <div className="flex-1">
                              <Select value={ent.simples_nacional || undefined} onValueChange={(v) => updateEntity(ent._id, { simples_nacional: v })}>
                                <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent><SelectItem value="optante">Optante</SelectItem><SelectItem value="nao_optante">Não Optante</SelectItem></SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {/* CEP */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CEP<RequiredMark /></Label>
                          <div className="flex-1">
                            <div className="relative max-w-[160px]">
                              <Input value={ent.cep || ""} onChange={(e) => updateEntity(ent._id, { cep: formatCep(e.target.value) })} onBlur={(e) => handleEntityCepBlur(ent, e.target.value)} className="font-mono pr-8 h-8" />
                              {cepLoading && <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Logradouro<RequiredMark /></Label>
                          <div className="flex-1"><Input value={ent.logradouro || ""} onChange={(e) => updateEntity(ent._id, { logradouro: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Número</Label>
                          <div className="flex-1"><Input value={ent.numero || ""} onChange={(e) => updateEntity(ent._id, { numero: e.target.value })} className="h-8 max-w-[120px]" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Complemento</Label>
                          <div className="flex-1"><Input value={ent.complemento || ""} onChange={(e) => updateEntity(ent._id, { complemento: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Bairro<RequiredMark /></Label>
                          <div className="flex-1"><Input value={ent.bairro || ""} onChange={(e) => updateEntity(ent._id, { bairro: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Município<RequiredMark /></Label>
                          <div className="flex-1"><Input value={ent.municipio || ""} onChange={(e) => updateEntity(ent._id, { municipio: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF<RequiredMark /></Label>
                          <div className="flex-1"><Input value={ent.uf || ""} onChange={(e) => updateEntity(ent._id, { uf: e.target.value })} maxLength={2} className="h-8 max-w-[120px]" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Contribuinte de Faturamento</Label>
                          <div className="flex items-center gap-2">
                            <Switch checked={!!(ent as any).contribuinte_faturamento} onCheckedChange={(v) => updateEntity(ent._id, { contribuinte_faturamento: v })} />
                            <span className="text-xs text-muted-foreground">{(ent as any).contribuinte_faturamento ? "Sim" : "Não"}</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-2 mt-2 pt-2 border-t">
                          {entities.length > 1 ? (
                            <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={() => handleCopyFirstAddress(ent._id)}>
                              <Copy size={12} /> Copiar endereço de outro contribuinte
                            </Button>
                          ) : <span />}
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditingEntityId(null)}><Check size={14} /> Pronto</Button>
                        </div>
                      </div>
                    </div>
                  )}
        </>
      )}
    </ListaMestreDetalhe>
  );
}