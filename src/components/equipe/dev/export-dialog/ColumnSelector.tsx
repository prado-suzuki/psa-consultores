import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Save, Square, Star, Trash2 } from "lucide-react";
import type { ColumnConfig } from "@/constants/exportConfig";
import type { ExportProfile } from "@/hooks/useExportProfiles";

interface Props {
  availableColumns: ColumnConfig[]; columnGroups: readonly string[]; columnsByGroup: Record<string, ColumnConfig[]>;
  selectedColumns: string[]; selectedProfileId: string; profiles: ExportProfile[]; loadingProfiles: boolean;
  defaultPending: boolean; isSelectedProfileDefault: boolean;
  onToggleColumn(id: string): void; onToggleGroup(group: string): void; onSelectAll(): void; onClear(): void;
  onLoadProfile(id: string): void; onSave(): void; onDefault(): void; onDelete(id: string): void;
}

export function ColumnSelector(props: Props) {
  return <>
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <Select value={props.selectedProfileId || "__none__"} onValueChange={(value) => props.onLoadProfile(value === "__none__" ? "" : value)}><SelectTrigger className="w-[200px] min-w-0"><SelectValue placeholder={props.loadingProfiles ? "Carregando..." : "Carregar Preset"} /></SelectTrigger><SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{props.profiles.map((profile) => <SelectItem key={profile.id} value={profile.id}><span className="flex items-center gap-2">{profile.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}{profile.name}</span></SelectItem>)}</SelectContent></Select>
      <ToolButton label="Salvar" onClick={props.onSave}><Save className="h-4 w-4" /></ToolButton>
      {props.selectedProfileId && <><ToolButton label="Favoritar" onClick={props.onDefault} disabled={props.defaultPending}><Star className={`h-4 w-4 ${props.isSelectedProfileDefault ? "text-yellow-500 fill-yellow-500" : ""}`} /></ToolButton><ToolButton label="Excluir" onClick={() => props.onDelete(props.selectedProfileId)} destructive><Trash2 className="h-4 w-4" /></ToolButton></>}
    </div>
    <div className="flex items-center justify-between gap-2 mb-4 py-2 px-3 bg-muted/50 rounded-md"><div className="flex items-center gap-2"><Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={props.onSelectAll}><CheckSquare className="h-4 w-4" /><span className="text-xs">Marcar todos</span></Button><Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={props.onClear}><Square className="h-4 w-4" /><span className="text-xs">Desmarcar todos</span></Button></div><Badge variant="secondary">{props.selectedColumns.length} de {props.availableColumns.length} selecionadas</Badge></div>
    <div className="flex-1 min-h-0 overflow-y-auto pr-4"><Accordion type="multiple" defaultValue={[]} className="w-full">{props.columnGroups.map((group) => {
      const columns = props.columnsByGroup[group] || [];
      if (!columns.length) return null;
      const selected = columns.filter((column) => props.selectedColumns.includes(column.id)).length;
      return <AccordionItem key={group} value={group}><div className="flex items-center gap-2"><Checkbox id={`group-${group}`} checked={selected === columns.length} onCheckedChange={() => props.onToggleGroup(group)} onClick={(event) => event.stopPropagation()} className={selected > 0 && selected < columns.length ? "opacity-50" : ""} /><AccordionTrigger className="flex-1 py-3 hover:no-underline"><div className="flex items-center gap-2"><span className="font-semibold">{group}</span><Badge variant="outline" className="text-xs">{selected}/{columns.length}</Badge></div></AccordionTrigger></div><AccordionContent><div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6 pt-2">{columns.map((column) => <div key={column.id} className="flex items-center gap-2"><Checkbox id={column.id} checked={props.selectedColumns.includes(column.id)} onCheckedChange={() => props.onToggleColumn(column.id)} /><Label htmlFor={column.id} className="text-sm cursor-pointer">{column.label}</Label></div>)}</div></AccordionContent></AccordionItem>;
    })}</Accordion></div>
  </>;
}

function ToolButton({ label, children, onClick, disabled, destructive }: { label: string; children: React.ReactNode; onClick(): void; disabled?: boolean; destructive?: boolean }) {
  return <Button variant="outline" className={`flex flex-col items-center justify-center h-auto py-1.5 px-2 gap-0.5 min-w-[48px] ${destructive ? "text-destructive hover:text-destructive" : ""}`} onClick={onClick} disabled={disabled}>{children}<span className="text-[10px] leading-tight">{label}</span></Button>;
}
