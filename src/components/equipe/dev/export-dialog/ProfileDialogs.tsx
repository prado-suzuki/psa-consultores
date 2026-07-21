import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";

interface Props {
  saveOpen: boolean; setSaveOpen(value: boolean): void; name: string; setName(value: string): void; asDefault: boolean; setAsDefault(value: boolean): void;
  selectedCount: number; createPending: boolean; onSave(): void;
  deleteId: string | null; setDeleteId(value: string | null): void; onDelete(): void;
}
export function ProfileDialogs(props: Props) {
  return <><Dialog open={props.saveOpen} onOpenChange={props.setSaveOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Salvar Perfil</DialogTitle><DialogDescription>As {props.selectedCount} colunas selecionadas serão salvas neste perfil.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor="profile-name">Nome do perfil</Label><Input id="profile-name" placeholder="Ex: Relatório Fiscal Completo" value={props.name} onChange={(event) => props.setName(event.target.value)} /></div><div className="flex items-center gap-2"><Checkbox id="save-as-default" checked={props.asDefault} onCheckedChange={(checked) => props.setAsDefault(checked === true)} /><Label htmlFor="save-as-default" className="cursor-pointer">Definir como padrão</Label></div></div><DialogFooter><Button variant="outline" onClick={() => props.setSaveOpen(false)}>Cancelar</Button><Button onClick={props.onSave} disabled={props.createPending || !props.name.trim()}>{props.createPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}Salvar</Button></DialogFooter></DialogContent></Dialog>
    <AlertDialog open={!!props.deleteId} onOpenChange={() => props.setDeleteId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir perfil?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. O perfil será permanentemente excluído.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={props.onDelete}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
