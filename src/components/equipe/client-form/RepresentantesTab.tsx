import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiredMark } from "@/components/ui/required-mark";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ChevronDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TIPO_REPRESENTANTE_OPTIONS, formatPhone } from "./constants";
import type { DraftRepresentante } from "@/types/clientForm";
import FieldPair from "./FieldPair";

export interface RepresentantesTabProps {
  participants: DraftRepresentante[];
  setParticipants: React.Dispatch<React.SetStateAction<DraftRepresentante[]>>;
  draftRepresentante: Partial<DraftRepresentante>;
  setDraftRepresentante: React.Dispatch<React.SetStateAction<Partial<DraftRepresentante>>>;
  isReadOnly: boolean;
}

export default function RepresentantesTab({
  participants, setParticipants,
  draftRepresentante, setDraftRepresentante,
  isReadOnly,
}: RepresentantesTabProps) {
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const [editingParticipantData, setEditingParticipantData] = useState<Partial<DraftRepresentante> | null>(null);

  const startEditParticipant = (p: DraftRepresentante) => {
    setEditingParticipantId(p._id);
    setEditingParticipantData({ ...p });
  };
  const cancelEditParticipant = () => {
    setEditingParticipantId(null);
    setEditingParticipantData(null);
  };
  const saveEditParticipant = () => {
    if (!editingParticipantData || editingParticipantId == null) return;
    setParticipants(
      participants.map((p) =>
        p._id === editingParticipantId ? ({ ...p, ...editingParticipantData } as DraftRepresentante) : p,
      ),
    );
    setEditingParticipantId(null);
    setEditingParticipantData(null);
    toast.success("Representante atualizado");
  };

  const addRepresentante = () => {
    if (!draftRepresentante.nome?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!draftRepresentante.tipo_representante) {
      toast.error("Tipo de Representante é obrigatório");
      return;
    }
    if (!draftRepresentante.email?.trim()) {
      toast.error("Email é obrigatório");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draftRepresentante.email!.trim())) {
      toast.error("Formato de e-mail inválido");
      return;
    }
    if (draftRepresentante.telefone?.trim()) {
      const telDigits = draftRepresentante.telefone.replace(/\D/g, "");
      if (telDigits.length < 10) {
        toast.error("Telefone deve ter no mínimo 10 dígitos");
        return;
      }
    }
    if (draftRepresentante.observacoes?.trim() && draftRepresentante.observacoes.trim().length < 3) {
      toast.error("Observações deve ter no mínimo 3 caracteres");
      return;
    }

    setParticipants([...participants, { ...draftRepresentante, _id: Date.now() + Math.random() } as DraftRepresentante]);
    setDraftRepresentante({
      nome: "", tipo_representante: "", cargo: "", email: "", telefone: "", observacoes: "", acesso_chamados: false,
    });
  };

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
        <h3 className="text-sm font-bold text-foreground">Representantes ({participants.length})</h3>
      </div>
      <div className="px-4 py-3">
        {participants.length > 0 && (
          <div className="space-y-3 mb-4">
            {participants.map((part) => {
              const isExpanded = expandedParticipantId === part._id;
              const isEditingThis = editingParticipantId === part._id;
              const ep = isEditingThis ? editingParticipantData : null;
              return (
                <div key={part._id} className="bg-muted/30 border rounded-lg overflow-hidden transition-all hover:shadow-md">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 text-left"
                    onClick={() => { if (!isEditingThis) setExpandedParticipantId(isExpanded ? null : part._id); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{part.nome}</div>
                      <div className="text-sm text-muted-foreground">{part.tipo_representante}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {part.acesso_chamados && <Badge variant="outline" className="text-[10px]">Chamados</Badge>}
                      <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isExpanded && !isEditingThis && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <div className="flex justify-end gap-2 mb-3">
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => startEditParticipant(part)}>
                          <Pencil size={12} /> Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive">
                              <Trash2 size={12} /> Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover representante</AlertDialogTitle>
                              <AlertDialogDescription>Tem certeza que deseja remover "{part.nome}"? Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { setParticipants(participants.filter((p) => p._id !== part._id)); setExpandedParticipantId(null); }}>
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

                  {isExpanded && isEditingThis && ep && (
                    <div className="px-4 pb-4 border-t pt-3">
                      <div className="flex flex-col gap-2.5">
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground"> Nome <RequiredMark /></Label>
                          <div className="flex-1"><Input value={ep.nome || ""} onChange={(e) => setEditingParticipantData({ ...ep, nome: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Cargo/função *</Label>
                          <div className="flex-1">
                            <Select value={ep.tipo_representante || "__none__"} onValueChange={(v) => setEditingParticipantData({ ...ep, tipo_representante: v === "__none__" ? "" : v })}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                {TIPO_REPRESENTANTE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Email *</Label>
                          <div className="flex-1"><Input value={ep.email || ""} onChange={(e) => setEditingParticipantData({ ...ep, email: e.target.value })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                          <div className="flex-1"><Input value={ep.telefone || ""} onChange={(e) => setEditingParticipantData({ ...ep, telefone: formatPhone(e.target.value) })} className="h-8" /></div>
                        </div>
                        <div className="flex flex-row items-center gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 h-8">
                              <Switch checked={ep.acesso_chamados ?? false} onCheckedChange={(c) => setEditingParticipantData({ ...ep, acesso_chamados: c })} />
                              <span className="text-sm">{ep.acesso_chamados ? "Ativado" : "Desativado"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-row items-start gap-4">
                          <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Observações</Label>
                          <div className="flex-1"><Textarea value={ep.observacoes || ""} onChange={(e) => setEditingParticipantData({ ...ep, observacoes: e.target.value })} className="min-h-[60px]" /></div>
                        </div>
                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                          <Button size="sm" variant="outline" onClick={cancelEditParticipant}>Cancelar</Button>
                          <Button size="sm" variant="outline" className="gap-1.5 border-teal-600 text-teal-700 hover:bg-teal-50" onClick={saveEditParticipant}><Check size={14} /> Aplicar</Button>
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
            <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">Novo Representante</h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground"> Nome <RequiredMark /></Label>
                <div className="flex-1"><Input value={draftRepresentante.nome || ""} onChange={(e) => setDraftRepresentante({ ...draftRepresentante, nome: e.target.value })} placeholder="Nome do contato" className="font-medium h-8" /></div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Cargo/função *</Label>
                <div className="flex-1">
                  <Select value={draftRepresentante.tipo_representante || "__none__"} onValueChange={(v) => setDraftRepresentante({ ...draftRepresentante, tipo_representante: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione...</SelectItem>
                      {TIPO_REPRESENTANTE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Email *</Label>
                <div className="flex-1"><Input value={draftRepresentante.email || ""} onChange={(e) => setDraftRepresentante({ ...draftRepresentante, email: e.target.value })} className="h-8" /></div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                <div className="flex-1"><Input value={draftRepresentante.telefone || ""} onChange={(e) => setDraftRepresentante({ ...draftRepresentante, telefone: formatPhone(e.target.value) })} className="h-8" /></div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
                <div className="flex-1">
                  <div className="flex items-center gap-2 h-8">
                    <Switch checked={draftRepresentante.acesso_chamados ?? false} onCheckedChange={(c) => setDraftRepresentante({ ...draftRepresentante, acesso_chamados: c })} />
                    <span className="text-sm">{draftRepresentante.acesso_chamados ? "Ativado" : "Desativado"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-row items-start gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Observações</Label>
                <div className="flex-1"><Textarea value={draftRepresentante.observacoes || ""} onChange={(e) => setDraftRepresentante({ ...draftRepresentante, observacoes: e.target.value })} placeholder="Observações sobre o representante (mín. 20 caracteres se preenchido)..." className="min-h-[60px]" /></div>
              </div>
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={addRepresentante} className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-md"><Plus size={14} /> Adicionar à Lista</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
