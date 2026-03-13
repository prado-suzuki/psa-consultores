import React from "react";
import type { DraftEntity, InscricaoIE } from "@/types/clientForm";
import { UF_STATES, formatCpfCnpj, formatCep, formatPhone } from "./constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, X, Trash2, Loader2, Pencil, ChevronDown, Save, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { RequiredMark } from "@/components/ui/required-mark";

interface ContribuintesTabProps {
  entities: DraftEntity[];
  setEntities: React.Dispatch<React.SetStateAction<DraftEntity[]>>;
  draftEntity: Partial<DraftEntity>;
  setDraftEntity: React.Dispatch<React.SetStateAction<Partial<DraftEntity>>>;
  inscricoesMap: Record<string, InscricaoIE[]>;
  setInscricoesMap: React.Dispatch<React.SetStateAction<Record<string, InscricaoIE[]>>>;
  draftInscricoes: InscricaoIE[];
  setDraftInscricoes: React.Dispatch<React.SetStateAction<InscricaoIE[]>>;
  expandedEntityId: number | null;
  setExpandedEntityId: React.Dispatch<React.SetStateAction<number | null>>;
  editingEntityId: number | null;
  editingEntityData: Partial<DraftEntity> | null;
  setEditingEntityData: React.Dispatch<React.SetStateAction<Partial<DraftEntity> | null>>;
  cnpjLoading: boolean;
  cepLoading: boolean;
  onAdd: () => void;
  onCnpjBlur: (value: string) => void;
  onCepBlur: (value: string) => void;
  onInlineCnpjBlur: (value: string) => void;
  onInlineCepBlur: (value: string) => void;
  onStartEdit: (ent: DraftEntity) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onCopyFirstAddress: () => void;
  isReadOnly: boolean;
}

const FieldPair = ({ label, value }: { label: string; value: string | undefined }) => (
  <div>
    <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
    <div className="text-sm text-foreground">{value || "—"}</div>
  </div>
);

export function ContribuintesTab({
  entities,
  setEntities,
  draftEntity,
  setDraftEntity,
  inscricoesMap,
  setInscricoesMap,
  draftInscricoes,
  setDraftInscricoes,
  expandedEntityId,
  setExpandedEntityId,
  editingEntityId,
  editingEntityData,
  setEditingEntityData,
  cnpjLoading,
  cepLoading,
  onAdd,
  onCnpjBlur,
  onCepBlur,
  onInlineCnpjBlur,
  onInlineCepBlur,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onCopyFirstAddress,
  isReadOnly,
}: ContribuintesTabProps) {
  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
        <h3 className="text-sm font-bold text-foreground">Contribuintes ({entities.length})</h3>
      </div>
      <div className="px-4 py-3">
        {entities.length > 0 && (
          <div className="space-y-3 mb-4">
            {entities.map((ent) => {
              const isExpanded = expandedEntityId === ent._id;
              const isEditingThis = editingEntityId === ent._id;
              const ed = isEditingThis ? editingEntityData : null;
              return (
                <div
                  key={ent._id}
                  className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Header - always visible */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => {
                      if (!isEditingThis) setExpandedEntityId(isExpanded ? null : ent._id);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{ent.nome_razao_social}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {ent.cpf_cnpj || "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {ent.contribuinte_faturamento && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                          Faturamento
                        </span>
                      )}
                      {ent.simples_nacional === "optante" && (
                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-bold text-foreground">
                          Simples
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {ent.tipo_pessoa}
                      </Badge>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded content - read only */}
                  {isExpanded && !isEditingThis && (
                    <div className="px-4 pb-4 border-t pt-3">
                      {!isReadOnly && (
                        <div className="flex justify-end gap-2 mb-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartEdit(ent);
                            }}
                          >
                            <Pencil size={12} /> Editar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 size={12} /> Remover
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover contribuinte</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja remover "{ent.nome_razao_social}"? Esta ação não
                                  pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => {
                                    setEntities(entities.filter((x) => x._id !== ent._id));
                                    setExpandedEntityId(null);
                                  }}
                                >
                                  Remover
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                        <FieldPair label="Tipo Pessoa" value={ent.tipo_pessoa} />
                        <FieldPair label="CPF/CNPJ" value={ent.cpf_cnpj} />
                        <FieldPair label="Razão Social / Nome Completo" value={ent.nome_razao_social} />
                        {ent.tipo_pessoa !== "PF" && (
                          <FieldPair label="Nome Fantasia" value={ent.nome_fantasia} />
                        )}
                        <FieldPair label="Telefone" value={ent.telefone} />
                        <FieldPair label="Possui Inscrição Estadual?" value={
                          ent.situacao_inscricao_estadual === "sim" ? "Sim"
                            : ent.situacao_inscricao_estadual === "nao" ? "Não"
                            : ent.situacao_inscricao_estadual === "isento" ? "Isento"
                            : "—"
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
                        {ent.tipo_pessoa === "PJ" && ent.atividade_principal && (
                          <FieldPair label="Atividade Principal" value={ent.atividade_principal} />
                        )}
                        {ent.tipo_pessoa === "PJ" && (
                          <FieldPair
                            label="Simples Nacional"
                            value={
                              ent.simples_nacional === "optante"
                                ? "Optante"
                                : ent.simples_nacional === "nao_optante"
                                  ? "Não Optante"
                                  : "—"
                            }
                          />
                        )}
                        <FieldPair label="CEP" value={ent.cep} />
                        <FieldPair label="Logradouro" value={ent.logradouro} />
                        <FieldPair label="Número" value={ent.numero} />
                        <FieldPair label="Complemento" value={ent.complemento} />
                        <FieldPair label="Bairro" value={ent.bairro} />
                        <FieldPair label="Município" value={ent.municipio} />
                        <FieldPair label="UF" value={ent.uf} />
                        <FieldPair
                          label="Contribuinte de Faturamento"
                          value={ent.contribuinte_faturamento ? "Sim" : "Não"}
                        />
                      </div>
                    </div>
                  )}

                  {/* Inline edit mode */}
                  {isExpanded && isEditingThis && ed && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <div className="flex flex-col gap-2.5">
                        {/* Tipo */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo</Label>
                          <div className="flex-1">
                            <Select
                              value={ed.tipo_pessoa || "PJ"}
                              onValueChange={(v) =>
                                setEditingEntityData({ ...ed, tipo_pessoa: v, cpf_cnpj: "" })
                              }
                            >
                              <SelectTrigger className="h-8 max-w-[160px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PJ">PJ</SelectItem>
                                <SelectItem value="PF">PF</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* CPF/CNPJ */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CPF/CNPJ</Label>
                          <div className="flex-1">
                            <div className="relative">
                              <Input
                                value={ed.cpf_cnpj || ""}
                                onChange={(e) =>
                                  setEditingEntityData({
                                    ...ed,
                                    cpf_cnpj: formatCpfCnpj(e.target.value, ed.tipo_pessoa || "PJ"),
                                  })
                                }
                                onBlur={(e) => onInlineCnpjBlur(e.target.value)}
                                className="font-mono pr-8 h-8"
                              />
                              {cnpjLoading && (
                                <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Razão Social */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                            {ed.tipo_pessoa === "PF" ? <>Nome completo <RequiredMark /></> : <>Razão Social <RequiredMark /></>}
                          </Label>
                          <div className="flex-1">
                            <Input
                              value={ed.nome_razao_social || ""}
                              onChange={(e) =>
                                setEditingEntityData({ ...ed, nome_razao_social: e.target.value })
                              }
                              placeholder={
                                ed.tipo_pessoa === "PF"
                                  ? "Nome completo do contribuinte"
                                  : "Nome Empresarial"
                              }
                              className="font-medium h-8"
                            />
                          </div>
                        </div>
                        {/* Nome Fantasia */}
                        {ed.tipo_pessoa !== "PF" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome Fantasia</Label>
                            <div className="flex-1">
                              <Input
                                value={ed.nome_fantasia || ""}
                                onChange={(e) =>
                                  setEditingEntityData({ ...ed, nome_fantasia: e.target.value })
                                }
                                className="h-8"
                              />
                            </div>
                          </div>
                        )}
                        {/* Telefone */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                          <div className="flex-1">
                            <Input
                              value={ed.telefone || ""}
                              onChange={(e) =>
                                setEditingEntityData({ ...ed, telefone: formatPhone(e.target.value) })
                              }
                              placeholder="(00) 00000-0000"
                              className="h-8"
                            />
                          </div>
                        </div>
                        {/* Possui Inscrição Estadual? */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                            Possui Inscrição Estadual?
                          </Label>
                          <div className="flex-1">
                            <Select
                              value={ed.situacao_inscricao_estadual || undefined}
                              onValueChange={(v) => {
                                setEditingEntityData({ ...ed, situacao_inscricao_estadual: v });
                                if (v !== "sim") {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => ({ ...prev, [key]: [] }));
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sim">Sim</SelectItem>
                                <SelectItem value="nao">Não</SelectItem>
                                <SelectItem value="isento">Isento</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Inscrições Estaduais - inline edit */}
                        {ed.situacao_inscricao_estadual === "sim" && (
                          <div className="border border-dashed rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs"
                                onClick={() => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => ({
                                    ...prev,
                                    [key]: [...(prev[key] || []), { _tempId: Date.now() + Math.random(), situacao: "sim", numero_ie: "", uf: "" }],
                                  }));
                                }}
                              >
                                <Plus size={12} /> Adicionar IE
                              </Button>
                            </div>
                            {(inscricoesMap[ent._dbId || String(ent._id)] || []).map((ie, ieIdx) => (
                              <div key={ie._tempId} className="flex items-center gap-2 mt-1">
                                <Select value={ie.uf || undefined} onValueChange={(v) => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => {
                                    const list = [...(prev[key] || [])];
                                    list[ieIdx] = { ...list[ieIdx], uf: v };
                                    return { ...prev, [key]: list };
                                  });
                                }}>
                                  <SelectTrigger className="h-8 w-24 shrink-0"><SelectValue placeholder="UF" /></SelectTrigger>
                                  <SelectContent>
                                    {UF_STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Select value={ie.situacao || undefined} onValueChange={(v) => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => {
                                    const list = [...(prev[key] || [])];
                                    list[ieIdx] = { ...list[ieIdx], situacao: v, numero_ie: v !== "sim" ? "" : list[ieIdx].numero_ie };
                                    return { ...prev, [key]: list };
                                  });
                                }}>
                                  <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue placeholder="Situação" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sim">Sim</SelectItem>
                                    <SelectItem value="nao">Não</SelectItem>
                                    <SelectItem value="isento">Isento</SelectItem>
                                  </SelectContent>
                                </Select>
                                {ie.situacao === "sim" && (
                                  <Input
                                    value={ie.numero_ie}
                                    onChange={(e) => {
                                      const key = ent._dbId || String(ent._id);
                                      setInscricoesMap(prev => {
                                        const list = [...(prev[key] || [])];
                                        list[ieIdx] = { ...list[ieIdx], numero_ie: e.target.value };
                                        return { ...prev, [key]: list };
                                      });
                                    }}
                                    placeholder="Nº IE"
                                    maxLength={15}
                                    className="h-8 flex-1"
                                  />
                                )}
                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                                  const key = ent._dbId || String(ent._id);
                                  setInscricoesMap(prev => ({
                                    ...prev,
                                    [key]: (prev[key] || []).filter((_, i) => i !== ieIdx),
                                  }));
                                }}>
                                  <X size={14} />
                                </Button>
                              </div>
                            ))}
                            {(inscricoesMap[ent._dbId || String(ent._id)] || []).length === 0 && (
                              <p className="text-xs text-muted-foreground italic mt-1">Nenhuma IE cadastrada.</p>
                            )}
                          </div>
                        )}
                        {/* CNAE */}
                        {ed.tipo_pessoa === "PJ" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CNAE</Label>
                            <div className="flex-1">
                              <Input
                                value={ed.cod_cnae || ""}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                                  setEditingEntityData({ ...ed, cod_cnae: digits });
                                }}
                                maxLength={7}
                                inputMode="numeric"
                                placeholder="0000000"
                                className="h-8 max-w-[200px]"
                              />
                            </div>
                          </div>
                        )}
                        {/* Atividade Principal (read-only) */}
                        {ed.tipo_pessoa === "PJ" && (ed as any).atividade_principal && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Atividade Principal</Label>
                            <div className="flex-1">
                              <Input
                                value={(ed as any).atividade_principal || ""}
                                disabled
                                className="h-8 bg-muted/50"
                              />
                            </div>
                          </div>
                        )}
                        {/* Simples Nacional */}
                        {ed.tipo_pessoa === "PJ" && (
                          <div className="flex flex-row items-center gap-4">
                            <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Simples Nacional <RequiredMark /></Label>
                            <div className="flex-1">
                              <Select
                                value={ed.simples_nacional || undefined}
                                onValueChange={(v) =>
                                  setEditingEntityData({ ...ed, simples_nacional: v })
                                }
                              >
                                <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="optante">Optante</SelectItem>
                                  <SelectItem value="nao_optante">Não Optante</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {/* CEP */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CEP <RequiredMark /></Label>
                          <div className="flex-1">
                            <div className="relative max-w-[160px]">
                              <Input
                                value={ed.cep || ""}
                                onChange={(e) =>
                                  setEditingEntityData({ ...ed, cep: formatCep(e.target.value) })
                                }
                                onBlur={(e) => onInlineCepBlur(e.target.value)}
                                className="font-mono pr-8 h-8"
                              />
                              {cepLoading && (
                                <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>
                        {/* UF */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF</Label>
                          <div className="flex-1">
                            <Select
                              value={ed.uf || "__none__"}
                              onValueChange={(v) => setEditingEntityData({ ...ed, uf: v === "__none__" ? "" : v })}
                            >
                              <SelectTrigger className="h-8 max-w-[120px]">
                                <SelectValue placeholder="UF" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                {UF_STATES.map((uf) => (
                                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* Município */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Município</Label>
                          <div className="flex-1">
                            <Input
                              value={ed.municipio || ""}
                              onChange={(e) =>
                                setEditingEntityData({ ...ed, municipio: e.target.value })
                              }
                              className="h-8"
                            />
                          </div>
                        </div>
                        {/* Bairro */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Bairro</Label>
                          <div className="flex-1">
                            <Input
                              value={ed.bairro || ""}
                              onChange={(e) => setEditingEntityData({ ...ed, bairro: e.target.value })}
                              className="h-8"
                            />
                          </div>
                        </div>
                        {/* Logradouro */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Logradouro</Label>
                          <div className="flex-1">
                            <Input
                              value={ed.logradouro || ""}
                              onChange={(e) =>
                                setEditingEntityData({ ...ed, logradouro: e.target.value })
                              }
                              className="h-8"
                            />
                          </div>
                        </div>
                        {/* Número */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Número</Label>
                          <div className="flex-1">
                            <Input
                              value={ed.numero || ""}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, "");
                                setEditingEntityData({ ...ed, numero: digits });
                              }}
                              inputMode="numeric"
                              className="h-8 max-w-[120px]"
                            />
                          </div>
                        </div>
                        {/* Complemento */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Complemento</Label>
                          <div className="flex-1">
                            <Input
                              value={ed.complemento || ""}
                              onChange={(e) =>
                                setEditingEntityData({ ...ed, complemento: e.target.value })
                              }
                              className="h-8"
                            />
                          </div>
                        </div>
                        {/* Contribuinte de Faturamento */}
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                            Contribuinte de Faturamento
                          </Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!!(ed as any).contribuinte_faturamento}
                              onCheckedChange={(v) =>
                                setEditingEntityData({ ...ed, contribuinte_faturamento: v })
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {(ed as any).contribuinte_faturamento ? "Sim" : "Não"}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                          <Button size="sm" variant="outline" onClick={onCancelEdit}>
                            Cancelar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"
                              >
                                <Save size={14} /> Salvar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Salvar alterações</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Deseja salvar as alterações feitas neste contribuinte?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-teal-600 hover:bg-teal-700 text-white"
                                  onClick={onSaveEdit}
                                >
                                  Salvar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isReadOnly && (
          <div className="bg-muted/50 rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-muted-foreground uppercase">Novo Contribuinte</h4>
              {entities.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={onCopyFirstAddress}
                >
                  <Copy size={12} /> Copiar endereço do primeiro contribuinte
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              {/* Tipo */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Tipo</Label>
                <div className="flex-1">
                  <Select
                    value={draftEntity.tipo_pessoa || "PJ"}
                    onValueChange={(v) =>
                      setDraftEntity({ ...draftEntity, tipo_pessoa: v, cpf_cnpj: "" })
                    }
                  >
                    <SelectTrigger className="h-8 max-w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="PF">PF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* CPF/CNPJ */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CPF/CNPJ <RequiredMark /></Label>
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      value={draftEntity.cpf_cnpj || ""}
                      onChange={(e) =>
                        setDraftEntity({
                          ...draftEntity,
                          cpf_cnpj: formatCpfCnpj(e.target.value, draftEntity.tipo_pessoa || "PJ"),
                        })
                      }
                      onBlur={(e) => onCnpjBlur(e.target.value)}
                      placeholder={
                        draftEntity.tipo_pessoa === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"
                      }
                      className="font-mono pr-8 h-8"
                    />
                    {cnpjLoading && (
                      <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              {/* Razão Social */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                  {draftEntity.tipo_pessoa === "PF" ? <>Nome completo <RequiredMark /></> : <>Razão Social <RequiredMark /></>}
                </Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.nome_razao_social || ""}
                    onChange={(e) =>
                      setDraftEntity({ ...draftEntity, nome_razao_social: e.target.value })
                    }
                    placeholder={
                      draftEntity.tipo_pessoa === "PF"
                        ? "Nome completo do contribuinte"
                        : "Nome Empresarial"
                    }
                    className="font-medium h-8"
                  />
                </div>
              </div>
              {/* Nome Fantasia */}
              {draftEntity.tipo_pessoa !== "PF" && (
                <div className="flex flex-row items-center gap-4">
                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Nome Fantasia</Label>
                  <div className="flex-1">
                    <Input
                      value={draftEntity.nome_fantasia || ""}
                      onChange={(e) =>
                        setDraftEntity({ ...draftEntity, nome_fantasia: e.target.value })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
              )}
              {/* Telefone */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.telefone || ""}
                    onChange={(e) =>
                      setDraftEntity({ ...draftEntity, telefone: formatPhone(e.target.value) })
                    }
                    placeholder="(00) 00000-0000"
                    className="h-8"
                  />
                </div>
              </div>
              {/* Possui Inscrição Estadual? */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                  Possui Inscrição Estadual?
                </Label>
                <div className="flex-1">
                  <Select
                    value={draftEntity.situacao_inscricao_estadual || undefined}
                    onValueChange={(v) => {
                      setDraftEntity(prev => ({ ...prev, situacao_inscricao_estadual: v }));
                      if (v !== "sim") {
                        setDraftInscricoes([]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="isento">Isento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Inscrições Estaduais - draft */}
              {draftEntity.situacao_inscricao_estadual === "sim" && (
                <div className="border border-dashed rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => setDraftInscricoes(prev => [...prev, { _tempId: Date.now() + Math.random(), situacao: "sim", numero_ie: "", uf: "" }])}
                    >
                      <Plus size={12} /> Adicionar IE
                    </Button>
                  </div>
                  {draftInscricoes.map((ie, ieIdx) => (
                    <div key={ie._tempId} className="flex items-center gap-2 mt-1">
                      <Select value={ie.uf || undefined} onValueChange={(v) => {
                        setDraftInscricoes(prev => {
                          const list = [...prev];
                          list[ieIdx] = { ...list[ieIdx], uf: v };
                          return list;
                        });
                      }}>
                        <SelectTrigger className="h-8 w-24 shrink-0"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent>
                          {UF_STATES.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={ie.situacao || undefined} onValueChange={(v) => {
                        setDraftInscricoes(prev => {
                          const list = [...prev];
                          list[ieIdx] = { ...list[ieIdx], situacao: v, numero_ie: v !== "sim" ? "" : list[ieIdx].numero_ie };
                          return list;
                        });
                      }}>
                        <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue placeholder="Situação" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                          <SelectItem value="isento">Isento</SelectItem>
                        </SelectContent>
                      </Select>
                      {ie.situacao === "sim" && (
                        <Input
                          value={ie.numero_ie}
                          onChange={(e) => {
                            setDraftInscricoes(prev => {
                              const list = [...prev];
                              list[ieIdx] = { ...list[ieIdx], numero_ie: e.target.value };
                              return list;
                            });
                          }}
                          placeholder="Nº IE"
                          maxLength={15}
                          className="h-8 flex-1"
                        />
                      )}
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => {
                        setDraftInscricoes(prev => prev.filter((_, i) => i !== ieIdx));
                      }}>
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                  {draftInscricoes.length === 0 && (
                    <p className="text-xs text-muted-foreground italic mt-1">Nenhuma IE cadastrada. Clique em "Adicionar IE" para incluir.</p>
                  )}
                </div>
              )}
              {/* CNAE */}
              {draftEntity.tipo_pessoa === "PJ" && (
                <div className="flex flex-row items-center gap-4">
                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CNAE *</Label>
                  <div className="flex-1">
                    <Input
                      value={draftEntity.cod_cnae || ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                        setDraftEntity({ ...draftEntity, cod_cnae: digits });
                      }}
                      maxLength={7}
                      inputMode="numeric"
                      placeholder="0000000"
                      className="h-8 max-w-[200px]"
                    />
                  </div>
                </div>
              )}
              {/* Atividade Principal (read-only) */}
              {draftEntity.tipo_pessoa === "PJ" && (draftEntity as any).atividade_principal && (
                <div className="flex flex-row items-center gap-4">
                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Atividade Principal</Label>
                  <div className="flex-1">
                    <Input
                      value={(draftEntity as any).atividade_principal || ""}
                      disabled
                      className="h-8 bg-muted/50"
                    />
                  </div>
                </div>
              )}
              {/* Simples Nacional */}
              {draftEntity.tipo_pessoa === "PJ" && (
                <div className="flex flex-row items-center gap-4">
                  <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Simples Nacional *</Label>
                  <div className="flex-1">
                    <Select
                      value={draftEntity.simples_nacional || undefined}
                      onValueChange={(v) => setDraftEntity({ ...draftEntity, simples_nacional: v })}
                    >
                      <SelectTrigger className="h-8 max-w-[200px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="optante">Optante</SelectItem>
                        <SelectItem value="nao_optante">Não Optante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {/* CEP */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">CEP *</Label>
                <div className="flex-1">
                  <div className="relative max-w-[160px]">
                    <Input
                      value={draftEntity.cep || ""}
                      onChange={(e) =>
                        setDraftEntity({ ...draftEntity, cep: formatCep(e.target.value) })
                      }
                      onBlur={(e) => onCepBlur(e.target.value)}
                      placeholder="00000-000"
                      className="font-mono pr-8 h-8"
                    />
                    {cepLoading && (
                      <Loader2 className="absolute right-2.5 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
              {/* UF */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">UF *</Label>
                <div className="flex-1">
                  <Select
                    value={draftEntity.uf || "__none__"}
                    onValueChange={(v) => setDraftEntity({ ...draftEntity, uf: v === "__none__" ? "" : v })}
                  >
                    <SelectTrigger className="h-8 max-w-[120px]">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione...</SelectItem>
                      {UF_STATES.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Município */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Município *</Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.municipio || ""}
                    onChange={(e) => setDraftEntity({ ...draftEntity, municipio: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              {/* Bairro */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Bairro *</Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.bairro || ""}
                    onChange={(e) => setDraftEntity({ ...draftEntity, bairro: e.target.value })}
                    className="h-8"
                  />
                </div>
              </div>
              {/* Logradouro */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Logradouro *</Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.logradouro || ""}
                    onChange={(e) => setDraftEntity({ ...draftEntity, logradouro: e.target.value })}
                    placeholder="Rua, Av., Rod..."
                    className="h-8"
                  />
                </div>
              </div>
              {/* Número */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Número</Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.numero || ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      setDraftEntity({ ...draftEntity, numero: digits });
                    }}
                    inputMode="numeric"
                    placeholder="Nº"
                    className="h-8 max-w-[120px]"
                  />
                </div>
              </div>
              {/* Complemento */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Complemento</Label>
                <div className="flex-1">
                  <Input
                    value={draftEntity.complemento || ""}
                    onChange={(e) => setDraftEntity({ ...draftEntity, complemento: e.target.value })}
                    placeholder="Sala, Andar..."
                    className="h-8"
                  />
                </div>
              </div>
              {/* Contribuinte de Faturamento */}
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">
                  Contribuinte de Faturamento
                </Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!draftEntity.contribuinte_faturamento}
                    onCheckedChange={(v) =>
                      setDraftEntity({ ...draftEntity, contribuinte_faturamento: v })
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {draftEntity.contribuinte_faturamento ? "Sim" : "Não"}
                  </span>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button onClick={onAdd} className="gap-2">
                  Adicionar à Lista
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
