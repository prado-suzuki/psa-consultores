import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/ui/required-mark";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { TIPO_REPRESENTANTE_OPTIONS, formatPhone } from "./constants";
import type { DraftRepresentante } from "@/types/clientForm";
import FieldPair from "./FieldPair";
import { useAcentoArea } from "./acentoArea";

const DISABLE_TOOLTIP =
  "Você não tem permissão para desabilitar acesso ao chamados, fale com a equipe Digital para realizar essa operação";

export interface RepresentantesTabProps {
  participants: DraftRepresentante[];
  setParticipants: React.Dispatch<React.SetStateAction<DraftRepresentante[]>>;
  isReadOnly: boolean;
  /** Ver ContratosTab: escopo de cliente destrava tudo, de item so a linha. */
  escopoEdicao?: 'cliente' | 'item' | null;
  onRequestItemEdit?: () => void;
}

export default function RepresentantesTab({
  participants, setParticipants,
  isReadOnly,
  escopoEdicao,
  onRequestItemEdit,
}: RepresentantesTabProps) {
  const { isAdmin } = useAuth();
  const acento = useAcentoArea();
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);

  /** Adicionar e remover representante pertencem ao escopo de cliente. */
  const escopoCliente = !isReadOnly && escopoEdicao !== 'item';
  /** O "Editar" por linha e a porta de entrada do escopo de item, so na leitura. */
  const mostrarEditarPorLinha = isReadOnly ? !!onRequestItemEdit : escopoEdicao === 'item';

  // Captura o estado original (do banco) de `acesso_chamados` por _dbId.
  // Usado para travar o toggle quando o registro JÁ TINHA acesso habilitado e o usuário não é admin.
  const originalAcessoByDbId = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    for (const p of participants) {
      if (p._dbId && !originalAcessoByDbId.current.has(p._dbId)) {
        originalAcessoByDbId.current.set(p._dbId, !!p.acesso_chamados);
      }
    }
  }, [participants]);

  const isAcessoLockedFor = (p: Pick<DraftRepresentante, '_dbId'>): boolean => {
    if (isAdmin) return false;
    if (!p._dbId) return false;
    return originalAcessoByDbId.current.get(p._dbId) === true;
  };

  /**
   * Cada campo grava direto no representante da lista — sem "adicionar/aplicar".
   * A validação e a gravação no banco acontecem no "Salvar Alterações" do rodapé.
   */
  const updateParticipant = (id: number, patch: Partial<DraftRepresentante>) => {
    setParticipants(prev => prev.map(p => (p._id === id ? ({ ...p, ...patch } as DraftRepresentante) : p)));
  };

  const createParticipant = () => {
    const novo = {
      nome: "", tipo_representante: "", cargo: "", email: "", telefone: "", observacoes: "",
      acesso_chamados: false, _id: Date.now() + Math.random(),
    } as DraftRepresentante;
    setParticipants(prev => [...prev, novo]);
    setExpandedParticipantId(novo._id);
    setEditingParticipantId(novo._id);
  };

  const removeParticipant = (id: number) => {
    setParticipants(prev => prev.filter(p => p._id !== id));
    if (expandedParticipantId === id) setExpandedParticipantId(null);
    if (editingParticipantId === id) setEditingParticipantId(null);
  };

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Representantes ({participants.length})</h3>
        {escopoCliente && editingParticipantId == null && (
          <Button size="sm" onClick={createParticipant} className={cn("gap-1.5 h-7 text-xs", acento.botao)}>
            <Plus size={14} /> Adicionar representante
          </Button>
        )}
      </div>
      <div className="px-4 py-3">
        {participants.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">Nenhum representante cadastrado.</p>
        )}

        <div className="space-y-3">
          {participants.map((part) => {
            const isExpanded = expandedParticipantId === part._id;
            const isEditingThis = editingParticipantId === part._id;
            const linhaEditavel = isEditingThis || escopoCliente;
            return (
              <div key={part._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                <div className="w-full flex items-center gap-2 p-4">
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { if (!isEditingThis) setExpandedParticipantId(isExpanded ? null : part._id); }}
                  >
                    <div className="font-bold text-foreground truncate">
                      {part.nome?.trim() || <span className="text-muted-foreground italic font-normal">Novo representante — preencha os dados</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{part.tipo_representante || "—"}</div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {part.acesso_chamados && <Badge variant="outline" className="text-[10px]">Chamados</Badge>}
                    {isEditingThis ? (
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setEditingParticipantId(null)}>
                        <Check size={12} /> Pronto
                      </Button>
                    ) : (
                      mostrarEditarPorLinha && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon" variant="outline" className="h-9 w-9"
                              aria-label={`Editar ${part.nome?.trim() || 'representante'}`}
                              onClick={() => {
                                if (isReadOnly) {
                                  if (!onRequestItemEdit) return;
                                  onRequestItemEdit();
                                }
                                setExpandedParticipantId(part._id);
                                setEditingParticipantId(part._id);
                              }}
                            >
                              <Pencil size={18} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar representante</TooltipContent>
                        </Tooltip>
                      )
                    )}
                    {escopoCliente && (
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon" variant="outline"
                                className="h-9 w-9 border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                aria-label={`Remover ${part.nome?.trim() || 'representante'}`}
                              >
                                <Trash2 size={18} />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Remover representante</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover representante</AlertDialogTitle>
                            <AlertDialogDescription>Tem certeza que deseja remover "{part.nome?.trim() || "este representante"}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => removeParticipant(part._id)}>
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  <button type="button" aria-label={isExpanded ? "Recolher" : "Expandir"} className="shrink-0 p-1 rounded hover:bg-muted"
                    onClick={() => { if (!isEditingThis) setExpandedParticipantId(isExpanded ? null : part._id); }}>
                    <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>

                {isExpanded && !linhaEditavel && (
                  <div className="px-4 pb-4 border-t pt-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <FieldPair label="Nome" value={part.nome} />
                      <FieldPair label="Cargo/função" value={part.tipo_representante} />
                      <FieldPair label="Email" value={part.email} />
                      <FieldPair label="Telefone" value={part.telefone} />
                      <FieldPair label="Acesso a Chamados" value={part.acesso_chamados ? "Sim" : "Não"} />
                      {part.observacoes && (
                        <div className="col-span-2">
                          <FieldPair label="Observações" value={part.observacoes} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {isExpanded && linhaEditavel && (
                  <div className="px-4 pb-4 border-t pt-3">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-row items-center gap-4">
                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground"> Nome <RequiredMark /></Label>
                        <div className="flex-1"><Input autoFocus value={part.nome || ""} onChange={(e) => updateParticipant(part._id, { nome: e.target.value })} placeholder="Nome do contato" className="h-8" /></div>
                      </div>
                      <div className="flex flex-row items-center gap-4">
                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Cargo/função <RequiredMark /></Label>
                        <div className="flex-1">
                          <Select value={part.tipo_representante || "__none__"} onValueChange={(v) => updateParticipant(part._id, { tipo_representante: v === "__none__" ? "" : v })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Selecione...</SelectItem>
                              {TIPO_REPRESENTANTE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex flex-row items-center gap-4">
                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Email <RequiredMark /></Label>
                        <div className="flex-1"><Input value={part.email || ""} onChange={(e) => updateParticipant(part._id, { email: e.target.value })} className="h-8" /></div>
                      </div>
                      <div className="flex flex-row items-center gap-4">
                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                        <div className="flex-1"><Input value={part.telefone || ""} onChange={(e) => updateParticipant(part._id, { telefone: formatPhone(e.target.value) })} className="h-8" /></div>
                      </div>
                      <div className="flex flex-row items-center gap-4">
                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 h-8">
                            {isAcessoLockedFor(part) ? (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="inline-flex items-center gap-2 opacity-50 cursor-not-allowed select-none"
                                      aria-disabled
                                    >
                                      <Switch
                                        checked={part.acesso_chamados ?? false}
                                        disabled
                                        tabIndex={-1}
                                        className="pointer-events-none"
                                      />
                                      <span className="text-sm">{part.acesso_chamados ? "Ativado" : "Desativado"}</span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs">
                                    {DISABLE_TOOLTIP}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <>
                                <Switch checked={part.acesso_chamados ?? false} onCheckedChange={(c) => updateParticipant(part._id, { acesso_chamados: c })} />
                                <span className="text-sm">{part.acesso_chamados ? "Ativado" : "Desativado"}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row items-start gap-4">
                        <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Observações</Label>
                        <div className="flex-1"><Textarea value={part.observacoes || ""} onChange={(e) => updateParticipant(part._id, { observacoes: e.target.value })} placeholder="Observações sobre o representante (mín. 20 caracteres se preenchido)..." className="min-h-[60px]" /></div>
                      </div>
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
