import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EFDExportProfiles } from '@/components/equipe/dev/efd-export/EFDExportProfiles';
import { EFDExportStatus } from '@/components/equipe/dev/efd-export/EFDExportStatus';
import { EFDRecordSelector } from '@/components/equipe/dev/efd-export/EFDRecordSelector';
import { useEfdExportMachine } from '@/hooks/useEfdExportMachine';
import { useExportProfiles, type ExportToolType } from '@/hooks/useExportProfiles';
import { toast } from '@/hooks/use-toast';
import type { BlocoRegistro, EFDArquivo, EFDTipo } from '@/types/efd';
import { FileDown, Loader2, Save, Trash2 } from 'lucide-react';

export interface EFDExportDialogProps {
  arquivo: EFDArquivo;
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  idContribuinte: string;
  disabled?: boolean;
  tipo?: EFDTipo;
  profileType?: ExportToolType;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const profileRecords = (columns: string[], allRecords: string[]) => columns
  .map(column => column.startsWith('REG_') ? column : `REG_${column}`)
  .filter(record => allRecords.includes(record));

export function EFDExportDialog({ arquivo, blocosDisponiveis, idContribuinte, disabled, tipo = 'contribuicoes', profileType, externalOpen, onExternalOpenChange, hideTrigger = false }: EFDExportDialogProps) {
  const resolvedProfileType: ExportToolType = profileType ?? (tipo === 'contribuicoes' ? 'efd' : `efd_${tipo}` as ExportToolType);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = useCallback((value: boolean) => {
    if (externalOpen !== undefined) {
      onExternalOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  }, [externalOpen, onExternalOpenChange]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [selectedProfile, setSelectedProfile] = useState('none');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { profiles = [], isLoading, defaultProfile, createProfile, deleteProfile, setDefaultProfile } = useExportProfiles(resolvedProfileType);
  const handleCompleted = useCallback(() => setOpen(false), [setOpen]);
  const { status, statusMessage, start, resetVisual, cancel: cancelExport } = useEfdExportMachine({ arquivoId: arquivo.ID_ARQUIVO, idContribuinte, tipo, onCompleted: handleCompleted });
  const allRecords = useMemo(() => Object.values(blocosDisponiveis).flat().map(record => record.codigo), [blocosDisponiveis]);

  useEffect(() => {
    cancelExport();
    if (open) {
      resetVisual();
      setExpandedBlocks(new Set());
    }
  }, [open, cancelExport, resetVisual]);

  useEffect(() => {
    if (!open) return;
    const defaults = defaultProfile ? profileRecords(defaultProfile.columns, allRecords) : [];
    setSelectedRecords(new Set(defaults));
    setSelectedProfile(defaults.length && defaultProfile ? `user_${defaultProfile.id}` : 'none');
  }, [open, defaultProfile, allRecords]);

  const toggleExpanded = (block: string) => setExpandedBlocks(previous => {
    const next = new Set(previous);
    if (next.has(block)) next.delete(block);
    else next.add(block);
    return next;
  });
  const toggleRecord = (code: string) => {
    setSelectedRecords(previous => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setSelectedProfile('none');
  };
  const toggleBlock = (block: string) => {
    const records = blocosDisponiveis[block]?.map(record => record.codigo) || [];
    const remove = records.every(record => selectedRecords.has(record));
    setSelectedRecords(previous => {
      const next = new Set(previous);
      records.forEach(record => {
        if (remove) next.delete(record);
        else next.add(record);
      });
      return next;
    });
    setSelectedProfile('none');
  };
  const selectAll = () => { setSelectedRecords(new Set(allRecords)); setSelectedProfile('all'); };
  const clearSelection = () => { setSelectedRecords(new Set()); setSelectedProfile('none'); };
  const applyProfile = (key: string) => {
    setSelectedProfile(key);
    if (key === 'none') return;
    if (key === 'all') {
      selectAll();
      toast({ title: 'Todos os registros selecionados', description: `${allRecords.length} registros selecionados` });
      return;
    }
    const profile = profiles.find(item => item.id === key.replace('user_', ''));
    if (profile) {
      const records = profileRecords(profile.columns, allRecords);
      setSelectedRecords(new Set(records));
      toast({ title: `Perfil "${profile.name}" aplicado`, description: `${records.length} registros selecionados` });
    }
  };
  const openSaveDialog = () => {
    if (!selectedRecords.size) return void toast({ title: 'Selecione registros', description: 'Selecione ao menos um registro.', variant: 'destructive' });
    setNewProfileName(''); setSaveAsDefault(false); setSaveDialogOpen(true);
  };
  const saveProfile = async () => {
    if (!newProfileName.trim()) return void toast({ title: 'Nome obrigatório', description: 'Informe um nome para o perfil.', variant: 'destructive' });
    const result = await createProfile.mutateAsync({ name: newProfileName.trim(), columns: Array.from(selectedRecords).map(record => record.replace('REG_', '')), isDefault: saveAsDefault });
    setNewProfileName(''); setSaveDialogOpen(false);
    if (result?.id) setSelectedProfile(`user_${result.id}`);
  };
  const deleteSelectedProfile = async () => {
    if (!deleteConfirmId) return;
    await deleteProfile.mutateAsync(deleteConfirmId);
    if (selectedProfile === `user_${deleteConfirmId}`) setSelectedProfile('none');
    setDeleteConfirmId(null);
  };
  const toggleDefault = async (id: string) => {
    if (profiles.find(profile => profile.id === id)?.is_default) return void toast({ title: 'Perfil já é padrão', description: 'Este perfil já está definido como padrão.' });
    await setDefaultProfile.mutateAsync(id);
  };
  const selectedProfileIsDefault = profiles.find(profile => `user_${profile.id}` === selectedProfile)?.is_default ?? false;
  const cancel = () => { cancelExport(); resetVisual(); setOpen(false); };

  return <Dialog open={open} onOpenChange={setOpen}>
    {!hideTrigger && <TooltipProvider><Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button variant="outline" size="icon" disabled={disabled || !allRecords.length} className="h-9 w-9 text-emerald-600 hover:text-emerald-800 bg-emerald-50 border-emerald-200"><FileDown className="h-4 w-4" /></Button></DialogTrigger></TooltipTrigger><TooltipContent><p>Exportar Excel</p></TooltipContent></Tooltip></TooltipProvider>}
    <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
      <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
        <DialogTitle className="text-xl flex items-center gap-2"><FileDown className="h-6 w-6 text-emerald-600" />Exportar para Excel</DialogTitle>
        <DialogDescription>Selecione os registros para gerar o relatório personalizado.</DialogDescription>
        <EFDExportProfiles profiles={profiles} loading={isLoading} selectedProfile={selectedProfile} selectedIsDefault={selectedProfileIsDefault} defaultPending={setDefaultProfile.isPending} onApply={applyProfile} onSave={openSaveDialog} onDelete={setDeleteConfirmId} onDefault={toggleDefault} onSelectAll={selectAll} onClear={clearSelection} />
      </DialogHeader>
      <EFDRecordSelector blocosDisponiveis={blocosDisponiveis} expanded={expandedBlocks} selected={selectedRecords} onToggleBlockOpen={toggleExpanded} onToggleBlock={toggleBlock} onToggleRecord={toggleRecord} />
      <EFDExportStatus status={status} message={statusMessage} count={selectedRecords.size} onCancel={cancel} onExport={() => void start(selectedRecords)} />
    </DialogContent>
    <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Salvar Perfil de Exportação</AlertDialogTitle><AlertDialogDescription>Salve a seleção atual como um novo perfil para uso futuro.</AlertDialogDescription></AlertDialogHeader><div className="py-4 space-y-4"><div className="space-y-2"><Label htmlFor="profile-name">Nome do Perfil</Label><Input id="profile-name" value={newProfileName} onChange={event => setNewProfileName(event.target.value)} placeholder="Ex: Auditoria Completa" /></div><div className="flex items-center gap-2"><Checkbox id="save-default" checked={saveAsDefault} onCheckedChange={checked => setSaveAsDefault(checked === true)} /><Label htmlFor="save-default" className="text-sm text-muted-foreground">Definir como perfil padrão</Label></div></div><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={saveProfile} disabled={createProfile.isPending || !newProfileName.trim()}>{createProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salvar Perfil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={!!deleteConfirmId} onOpenChange={nextOpen => !nextOpen && setDeleteConfirmId(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir Perfil</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteSelectedProfile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleteProfile.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </Dialog>;
}
