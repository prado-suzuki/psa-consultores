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
import { Pencil, Trash2, ChevronDown, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TIPO_PARTICIPANTE_OPTIONS, formatPhone } from "./constants";
import type { DraftParticipant } from "@/types/clientForm";
import FieldPair from "./FieldPair";

export interface ParticipantesTabProps {
  participants: DraftParticipant[];
  setParticipants: React.Dispatch<React.SetStateAction<DraftParticipant[]>>;
  draftParticipant: Partial<DraftParticipant>;
  setDraftParticipant: React.Dispatch<React.SetStateAction<Partial<DraftParticipant>>>;
  isReadOnly: boolean;
}

export default function ParticipantesTab({
  participants, setParticipants,
  draftParticipant, setDraftParticipant,
  isReadOnly,
}: ParticipantesTabProps) {
  const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const [editingParticipantData, setEditingParticipantData] = useState<Partial<DraftParticipant> | null>(null);

  const startEditParticipant = (p: DraftParticipant) => {
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
        p._id === editingParticipantId ? ({ ...p, ...editingParticipantData } as DraftParticipant) : p,
      ),
    );
    setEditingParticipantId(null);
    setEditingParticipantData(null);
    toast.success("Participante atualizado");
  };

  const addParticipant = () => {
    if (!draftParticipant.nome?.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!draftParticipant.tipo_participante) {
      toast.error("Tipo de Participante é obrigatório");
      return;
    }
    if (!draftParticipant.email?.trim()) {
      toast.error("Email é obrigatório");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(draftParticipant.email!.trim())) {
      toast.error("Formato de e-mail inválido");
      return;
    }
    if (draftParticipant.telefone?.trim()) {
      const telDigits = draftParticipant.telefone.replace(/\D/g, "");
      if (telDigits.length < 10) {
        toast.error("Telefone deve ter no mínimo 10 dígitos");
        return;
      }
    }
    if (draftParticipant.observacoes?.trim() && draftParticipant.observacoes.trim().length < 20) {
      toast.error("Observações deve ter no mínimo 20 caracteres");
      return;
    }

    setParticipants([...participants, { ...draftParticipant, _id: Date.now() + Math.random() } as DraftParticipant]);
    setDraftParticipant({
      nome: "", tipo_participante: "", cargo: "", email: "", telefone: "", observacoes: "", acesso_chamados: false,
    });
  };

  return (
    <section className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-3">
        <h3 className="text-sm font-bold text-foreground">Participantes ({participants.length})</h3>
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
                      <div className="text-sm text-muted-foreground">{part.tipo_participante}</div>
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
                              <AlertDialogTitle>Remover participante</AlertDialogTitle>
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
                        <FieldPair label="Cargo/função" value={part.tipo_participante} />
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
                            <Select value={ep.tipo_participante || "__none__"} onValueChange={(v) => setEditingParticipantData({ ...ep, tipo_participante: v === "__none__" ? "" : v })}>
                              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">Selecione...</SelectItem>
                                {TIPO_PARTICIPANTE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="gap-1.5 bg-teal-600 hover:bg-teal-700 text-white"><Save size={14} /> Aplicar</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Aplicar alterações</AlertDialogTitle>
                                <AlertDialogDescription>Deseja aplicar as alterações feitas neste participante?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction className="bg-teal-600 hover:bg-teal-700 text-white" onClick={saveEditParticipant}>Aplicar</AlertDialogAction>
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
            <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">Novo Participante</h4>
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground"> Nome <RequiredMark /></Label>
                <div className="flex-1"><Input value={draftParticipant.nome || ""} onChange={(e) => setDraftParticipant({ ...draftParticipant, nome: e.target.value })} placeholder="Nome do contato" className="font-medium h-8" /></div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Cargo/função *</Label>
                <div className="flex-1">
                  <Select value={draftParticipant.tipo_participante || "__none__"} onValueChange={(v) => setDraftParticipant({ ...draftParticipant, tipo_participante: v === "__none__" ? "" : v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Selecione...</SelectItem>
                      {TIPO_PARTICIPANTE_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Email *</Label>
                <div className="flex-1"><Input value={draftParticipant.email || ""} onChange={(e) => setDraftParticipant({ ...draftParticipant, email: e.target.value })} className="h-8" /></div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Telefone</Label>
                <div className="flex-1"><Input value={draftParticipant.telefone || ""} onChange={(e) => setDraftParticipant({ ...draftParticipant, telefone: formatPhone(e.target.value) })} className="h-8" /></div>
              </div>
              <div className="flex flex-row items-center gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground">Acesso Chamados</Label>
                <div className="flex-1">
                  <div className="flex items-center gap-2 h-8">
                    <Switch checked={draftParticipant.acesso_chamados ?? false} onCheckedChange={(c) => setDraftParticipant({ ...draftParticipant, acesso_chamados: c })} />
                    <span className="text-sm">{draftParticipant.acesso_chamados ? "Ativado" : "Desativado"}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-row items-start gap-4">
                <Label className="w-48 shrink-0 text-xs font-semibold text-muted-foreground pt-2">Observações</Label>
                <div className="flex-1"><Textarea value={draftParticipant.observacoes || ""} onChange={(e) => setDraftParticipant({ ...draftParticipant, observacoes: e.target.value })} placeholder="Observações sobre o participante (mín. 20 caracteres se preenchido)..." className="min-h-[60px]" /></div>
              </div>
              <div className="flex justify-end mt-2">
                <Button onClick={addParticipant} className="gap-2">Adicionar à Lista</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
