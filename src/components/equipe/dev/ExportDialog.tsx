import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, Info, Loader2 } from "lucide-react";
import { CTE_COLUMNS, CTE_COLUMN_GROUPS, NFE_COLUMNS, NFE_COLUMN_GROUPS, type ColumnConfig } from "@/constants/exportConfig";
import { useConsultaXmlsExport } from "@/hooks/useConsultaXmlsExport";
import { useExportProfiles } from "@/hooks/useExportProfiles";
import { toast } from "@/hooks/use-toast";
import { exportFilename, parseConsultaXmlsCsv } from "@/lib/consultaXmls";
import type { ExportDialogProps } from "@/types/consultaXmls";
import { ColumnSelector } from "@/components/equipe/dev/export-dialog/ColumnSelector";
import { ExportPreview } from "@/components/equipe/dev/export-dialog/ExportPreview";
import { ProfileDialogs } from "@/components/equipe/dev/export-dialog/ProfileDialogs";

export function ExportDialog(props: ExportDialogProps) {
  const { data, cteData = [], tipoDocumento, totalRecords, start_date, end_date, disabled } = props;
  const availableColumns = tipoDocumento === "cte" ? CTE_COLUMNS : NFE_COLUMNS;
  const columnGroups = tipoDocumento === "cte" ? CTE_COLUMN_GROUPS : NFE_COLUMN_GROUPS;
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("colunas");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const profilesHook = useExportProfiles();
  const fetchExportCsv = useConsultaXmlsExport(props);
  const profiles = profilesHook.profiles;

  useEffect(() => {
    if (!open) return;
    if (profilesHook.defaultProfile?.columns.length) {
      const valid = profilesHook.defaultProfile.columns.filter((id) => availableColumns.some((column) => column.id === id));
      setSelectedColumns(valid.length ? valid : availableColumns.map((column) => column.id));
      setSelectedProfileId(valid.length ? profilesHook.defaultProfile.id : "");
    } else {
      setSelectedColumns(availableColumns.map((column) => column.id));
      setSelectedProfileId("");
    }
  }, [open, profilesHook.defaultProfile, availableColumns]);

  const columnsByGroup = useMemo(() => columnGroups.reduce<Record<string, ColumnConfig[]>>((result, group) => {
    result[group] = availableColumns.filter((column) => column.group === group);
    return result;
  }, {}), [availableColumns, columnGroups]);
  const selectedColumnConfigs = useMemo(() => availableColumns.filter((column) => selectedColumns.includes(column.id)), [availableColumns, selectedColumns]);
  const previewData = useMemo(() => (tipoDocumento === "cte" ? cteData : data).slice(0, 10), [cteData, data, tipoDocumento]);

  const loadProfile = (profileId: string) => {
    if (!profileId) { setSelectedProfileId(""); return; }
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;
    const valid = profile.columns.filter((id) => availableColumns.some((column) => column.id === id));
    setSelectedColumns(valid.length ? valid : availableColumns.map((column) => column.id));
    setSelectedProfileId(profileId);
  };
  const openSaveDialog = () => {
    if (!selectedColumns.length) { toast({ title: "Selecione colunas", description: "Selecione ao menos uma coluna.", variant: "destructive" }); return; }
    setNewProfileName(""); setSaveAsDefault(false); setSaveDialogOpen(true);
  };
  const saveProfile = async () => {
    if (!newProfileName.trim()) { toast({ title: "Nome obrigatório", description: "Informe um nome para o perfil.", variant: "destructive" }); return; }
    const result = await profilesHook.createProfile.mutateAsync({ name: newProfileName.trim(), columns: selectedColumns });
    if (saveAsDefault && result?.id) await profilesHook.setDefaultProfile.mutateAsync(result.id);
    setNewProfileName(""); setSaveDialogOpen(false);
  };
  const deleteProfile = async () => {
    if (!deleteConfirmId) return;
    await profilesHook.deleteProfile.mutateAsync(deleteConfirmId);
    if (selectedProfileId === deleteConfirmId) setSelectedProfileId("");
    setDeleteConfirmId(null);
  };
  const toggleDefault = async () => {
    if (!selectedProfileId) return;
    if (profiles.find((profile) => profile.id === selectedProfileId)?.is_default) {
      toast({ title: "Perfil já é padrão", description: "Este perfil já está definido como padrão." }); return;
    }
    await profilesHook.setDefaultProfile.mutateAsync(selectedProfileId);
  };
  const toggleGroup = (group: string) => {
    const ids = columnsByGroup[group].map((column) => column.id);
    setSelectedColumns((current) => ids.every((id) => current.includes(id)) ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
  };
  const exportExcel = async () => {
    setIsExporting(true);
    try {
      const csvData = parseConsultaXmlsCsv(await fetchExportCsv(selectedColumns));
      if (!csvData.length) { toast({ title: "Nenhum dado", description: "Não há registros para exportar.", variant: "destructive" }); return; }
      const worksheet = XLSX.utils.json_to_sheet(csvData);
      worksheet["!cols"] = Object.keys(csvData[0] || {}).map((header) => ({ wch: Math.max(header.length, 15) }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, tipoDocumento === "cte" ? "CT-e" : "NF-e");
      const filename = exportFilename(tipoDocumento, start_date, end_date);
      XLSX.writeFile(workbook, filename);
      toast({ title: "Exportação concluída", description: `${csvData.length} registro(s) exportados para ${filename}` });
      setOpen(false);
    } catch (error) {
      toast({ title: "Erro na exportação", description: (error as Error).message, variant: "destructive" });
    } finally { setIsExporting(false); }
  };

  return <><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" disabled={disabled} size="sm"><FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />Exportar Excel</Button></DialogTrigger><DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col"><DialogHeader><DialogTitle>Exportar Documentos Fiscais</DialogTitle><DialogDescription>{totalRecords} registro(s) serão exportados • Período: {start_date} a {end_date}</DialogDescription><div className="flex items-start gap-2 mt-2 p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-foreground"><Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" /><span>A exportação em Excel engloba todos os arquivos carregados no filtro atual, e não apenas os visíveis nesta página.</span></div></DialogHeader>
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="colunas">Colunas</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList><TabsContent value="colunas" className="flex-1 overflow-hidden mt-4 flex flex-col"><ColumnSelector availableColumns={availableColumns} columnGroups={columnGroups} columnsByGroup={columnsByGroup} selectedColumns={selectedColumns} selectedProfileId={selectedProfileId} profiles={profiles} loadingProfiles={profilesHook.isLoading} defaultPending={profilesHook.setDefaultProfile.isPending} isSelectedProfileDefault={profiles.find((profile) => profile.id === selectedProfileId)?.is_default ?? false} onToggleColumn={(id) => setSelectedColumns((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} onToggleGroup={toggleGroup} onSelectAll={() => setSelectedColumns(availableColumns.map((column) => column.id))} onClear={() => setSelectedColumns([])} onLoadProfile={loadProfile} onSave={openSaveDialog} onDefault={toggleDefault} onDelete={setDeleteConfirmId} /></TabsContent><TabsContent value="preview" className="flex-1 overflow-hidden mt-4 flex flex-col"><ExportPreview records={previewData} selectedColumns={selectedColumns} columns={selectedColumnConfigs} totalRecords={totalRecords} availableCount={tipoDocumento === "cte" ? cteData.length : data.length} /></TabsContent></Tabs>
    <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={exportExcel} disabled={isExporting || !selectedColumns.length}>{isExporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exportando...</> : <><Download className="h-4 w-4 mr-2" />Exportar Excel</>}</Button></DialogFooter></DialogContent></Dialog>
    <ProfileDialogs saveOpen={saveDialogOpen} setSaveOpen={setSaveDialogOpen} name={newProfileName} setName={setNewProfileName} asDefault={saveAsDefault} setAsDefault={setSaveAsDefault} selectedCount={selectedColumns.length} createPending={profilesHook.createProfile.isPending} onSave={saveProfile} deleteId={deleteConfirmId} setDeleteId={setDeleteConfirmId} onDelete={deleteProfile} />
  </>;
}
