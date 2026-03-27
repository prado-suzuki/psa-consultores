import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Loader2, FileDown, ChevronDown, Save, Server, CheckCircle2, Star, Trash2, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  BLOCK_DESCRIPTIONS, 
  REG_DESCRIPTIONS, 
} from '@/constants/efdConfig';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import { useExportProfiles, type ExportToolType } from '@/hooks/useExportProfiles';
import type { EFDArquivo, BlocoRegistro, EFDTipo } from '@/types/efd';

interface EFDExportDialogProps {
  arquivo: EFDArquivo;
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  disabled?: boolean;
  tipo?: EFDTipo;
  /** Tipo de perfil de exportação (separação por ferramenta) */
  profileType?: ExportToolType;
  /** Controle externo: se fornecido, o dialog usa esse estado ao invés de interno */
  externalOpen?: boolean;
  /** Callback para controle externo */
  onExternalOpenChange?: (open: boolean) => void;
  /** Se true, não renderiza o trigger (botão que abre o dialog) */
  hideTrigger?: boolean;
}

type ExportStatus = 'idle' | 'starting' | 'processing' | 'completed' | 'error';

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  download_url?: string;
  url?: string;
  error?: string;
  progress?: number;
  file_name?: string;
}

export function EFDExportDialog({ 
  arquivo, 
  blocosDisponiveis,
  disabled,
  tipo = 'contribuicoes',
  profileType,
  externalOpen,
  onExternalOpenChange,
  hideTrigger = false,
}: EFDExportDialogProps) {
  // Derive profileType from tipo when not explicitly provided
  const resolvedProfileType: ExportToolType = profileType ?? (tipo === 'contribuicoes' ? 'efd' : `efd_${tipo}` as ExportToolType);
  const { fetchWithAuth } = useApiAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Se controle externo é fornecido, usa ele; senão usa estado interno
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled 
    ? (value: boolean | ((prev: boolean) => boolean)) => {
        const newValue = typeof value === 'function' ? value(open) : value;
        onExternalOpenChange?.(newValue);
      }
    : setInternalOpen;
  const [selectedRegistros, setSelectedRegistros] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [selectedProfile, setSelectedProfile] = useState<string>('none');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [jobId, setJobId] = useState<string | null>(null);
  
  // Estados para gerenciamento de perfis
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Hook de perfis do usuário (filtrado pelo tipo da ferramenta)
  const {
    profiles,
    isLoading: loadingProfiles,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
  } = useExportProfiles(profileType);
  
  // AbortController para cancelar exportação
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Listar todos os registros disponíveis
  const allRegistros = useMemo(() => {
    return Object.values(blocosDisponiveis).flat().map(r => r.codigo);
  }, [blocosDisponiveis]);

  // Limpar polling ao desmontar
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Reset ao abrir e cancelar ao fechar - carrega perfil padrão do usuário
  useEffect(() => {
    if (open) {
      setExpandedBlocks(new Set());
      setExportStatus('idle');
      setStatusMessage('');
      setJobId(null);
      
      // Carregar perfil padrão do usuário se existir
      if (defaultProfile && defaultProfile.columns.length > 0) {
        // Mapear colunas do perfil (que são códigos como "C100") para formato do EFD (REG_C100)
        const profileRegistros = defaultProfile.columns
          .map(col => {
            // Verificar se já está no formato REG_XXXX
            if (col.startsWith('REG_')) return col;
            // Senão, converter para REG_XXXX
            return `REG_${col}`;
          })
          .filter(reg => allRegistros.includes(reg));
        
        if (profileRegistros.length > 0) {
          setSelectedRegistros(new Set(profileRegistros));
          setSelectedProfile(`user_${defaultProfile.id}`);
        } else {
          setSelectedRegistros(new Set());
          setSelectedProfile('none');
        }
      } else {
        setSelectedRegistros(new Set());
        setSelectedProfile('none');
      }
    } else {
      // Cancelar exportação em andamento ao fechar o modal
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [open, defaultProfile, allRegistros]);

  // Toggle acordeão
  const toggleBlock = (bloco: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(bloco)) {
        next.delete(bloco);
      } else {
        next.add(bloco);
      }
      return next;
    });
  };

  // Toggle registro individual
  const toggleRegistro = (codigo: string) => {
    setSelectedRegistros(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
    setSelectedProfile('none');
  };

  // Toggle bloco inteiro
  const toggleBloco = (bloco: string) => {
    const registros = blocosDisponiveis[bloco]?.map(r => r.codigo) || [];
    const allSelected = registros.every(r => selectedRegistros.has(r));
    
    setSelectedRegistros(prev => {
      const next = new Set(prev);
      registros.forEach(r => {
        if (allSelected) {
          next.delete(r);
        } else {
          next.add(r);
        }
      });
      return next;
    });
    setSelectedProfile('none');
  };

  // Selecionar todos
  const selectAll = () => {
    setSelectedRegistros(new Set(allRegistros));
    setSelectedProfile('all');
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedRegistros(new Set());
    setSelectedProfile('none');
  };

  // Aplicar perfil (suporta "all" e perfis do usuário)
  const applyProfile = (profileKey: string) => {
    setSelectedProfile(profileKey);
    
    if (profileKey === 'none') {
      return;
    }
    
    // Selecionar todos
    if (profileKey === 'all') {
      setSelectedRegistros(new Set(allRegistros));
      toast({
        title: 'Todos os registros selecionados',
        description: `${allRegistros.length} registros selecionados`,
      });
      return;
    }
    
    // Verificar se é um perfil do usuário (formato: user_uuid)
    if (profileKey.startsWith('user_')) {
      const profileId = profileKey.replace('user_', '');
      const userProfile = profiles.find(p => p.id === profileId);
      if (userProfile) {
        const profileRegistros = userProfile.columns
          .map(col => col.startsWith('REG_') ? col : `REG_${col}`)
          .filter(reg => allRegistros.includes(reg));
        setSelectedRegistros(new Set(profileRegistros));
        toast({
          title: `Perfil "${userProfile.name}" aplicado`,
          description: `${profileRegistros.length} registros selecionados`,
        });
      }
      return;
    }
  };

  // Abrir dialog para salvar perfil
  const openSaveDialog = () => {
    if (selectedRegistros.size === 0) {
      toast({ title: 'Selecione registros', description: 'Selecione ao menos um registro.', variant: 'destructive' });
      return;
    }
    setNewProfileName('');
    setSaveAsDefault(false);
    setSaveDialogOpen(true);
  };

  // Salvar novo perfil
  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe um nome para o perfil.', variant: 'destructive' });
      return;
    }
    // Converter REG_XXXX para XXXX para armazenar
    const columns = Array.from(selectedRegistros).map(r => r.replace('REG_', ''));
    const result = await createProfile.mutateAsync({ name: newProfileName.trim(), columns, isDefault: saveAsDefault });
    setNewProfileName('');
    setSaveDialogOpen(false);
    if (result?.id) {
      setSelectedProfile(`user_${result.id}`);
    }
  };

  // Excluir perfil
  const handleDeleteProfile = async () => {
    if (!deleteConfirmId) return;
    await deleteProfile.mutateAsync(deleteConfirmId);
    if (selectedProfile === `user_${deleteConfirmId}`) {
      setSelectedProfile('none');
    }
    setDeleteConfirmId(null);
  };

  // Toggle favorito/padrão
  const handleToggleDefault = async (profileId: string) => {
    const currentProfile = profiles.find(p => p.id === profileId);
    if (currentProfile?.is_default) {
      toast({ title: 'Perfil já é padrão', description: 'Este perfil já está definido como padrão.' });
      return;
    }
    await setDefaultProfile.mutateAsync(profileId);
  };

  // Verificar se perfil selecionado é do usuário e se é padrão
  const getSelectedUserProfileId = (): string | null => {
    if (selectedProfile.startsWith('user_')) {
      return selectedProfile.replace('user_', '');
    }
    return null;
  };

  const isSelectedProfileDefault = useMemo(() => {
    const profileId = getSelectedUserProfileId();
    if (!profileId) return false;
    return profiles.find(p => p.id === profileId)?.is_default ?? false;
  }, [profiles, selectedProfile]);

  // Contadores por bloco
  const getBlockCount = (bloco: string) => {
    const registros = blocosDisponiveis[bloco] || [];
    const selected = registros.filter(r => selectedRegistros.has(r.codigo)).length;
    return { selected, total: registros.length };
  };

  // Cancelar exportação
  const handleCancel = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setExportStatus('idle');
    setStatusMessage('');
    setJobId(null);
    setOpen(false);
  };

  // Verificar status do job
  const checkJobStatus = async (id: string, signal: AbortSignal): Promise<JobStatus | null> => {
    try {
      const url = getApiUrl(`/api/v1/efd/exportar/status/${id}`);
      const response = await fetchWithAuth(url, { signal });
      
      if (signal.aborted) return null;
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return null;
      }
      console.error('Erro ao verificar status:', err);
      return null;
    }
  };

  // Exportar Excel via API dedicada
  const handleExport = async () => {
    if (selectedRegistros.size === 0) {
      toast({
        title: 'Selecione registros',
        description: 'Selecione ao menos um registro para exportar.',
        variant: 'destructive',
      });
      return;
    }

    // Criar novo AbortController para esta exportação
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setExportStatus('starting');
    setStatusMessage('Iniciando geração do relatório...');

    try {
      const registrosCodigos = Array.from(selectedRegistros).map(r => r.replace('REG_', ''));
      
      const exportUrl = getApiUrl(
        `/api/v1/efd/${tipo}/${arquivo.CNPJ}/${arquivo.ID_ARQUIVO}/exportar`
      );
      
      const startResponse = await fetchWithAuth(exportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registros: registrosCodigos }),
        signal,
      }, 300000); // 5 min timeout para streaming de arquivos grandes

      if (signal.aborted) return;

      if (!startResponse.ok) {
        throw new Error('Falha ao iniciar exportação');
      }

      const contentType = startResponse.headers.get('content-type') || '';

      // Cache hit: JSON com URL
      if (contentType.includes('json')) {
        const data = await startResponse.json();
        const downloadUrl = data.url || data.download_url;

        if (downloadUrl) {
          setExportStatus('completed');
          setStatusMessage('Download pronto!');
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = data.file_name || 'export.xlsx';
          a.click();
          toast({ title: 'Exportação concluída', description: 'Arquivo Excel baixado com sucesso!' });
          setTimeout(() => setOpen(false), 1000);
          return;
        }

        // Fallback: resposta JSON com job_id (jobs antigos ainda no BQ)
        const newJobId = data.job_id || data.id;
        if (newJobId) {
          setJobId(newJobId);
          setExportStatus('processing');
          setStatusMessage('Gerando arquivo no servidor...');
          const pollStatus = async () => {
            if (signal.aborted) { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); return; }
            const status = await checkJobStatus(newJobId, signal);
            if (!status || signal.aborted) return;
            const url = status.download_url || status.url;
            if (status.status === 'completed' && url) {
              if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
              setExportStatus('completed'); setStatusMessage('Download pronto!');
              const a = document.createElement('a'); a.href = url; a.download = status.file_name || 'export.xlsx'; a.click();
              toast({ title: 'Exportação concluída', description: 'Arquivo Excel baixado com sucesso!' });
              setTimeout(() => setOpen(false), 1000);
            } else if (status.status === 'failed') {
              if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; }
              setExportStatus('error'); setStatusMessage(status.error || 'Erro na geração do arquivo');
              toast({ title: 'Erro na exportação', description: status.error || 'Falha ao gerar arquivo.', variant: 'destructive' });
            } else if (status.progress !== undefined) {
              setStatusMessage(`Processando... ${Math.round(status.progress * 100)}%`);
            }
          };
          pollingIntervalRef.current = setInterval(pollStatus, 2000);
          pollStatus();
          return;
        }

        throw new Error('Resposta inesperada do servidor');
      }

      // Cache miss: streaming binário direto
      setExportStatus('processing');
      const contentLength = startResponse.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (total && startResponse.body) {
        let loaded = 0;
        const reader = startResponse.body.getReader();
        const chunks: BlobPart[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          const pct = Math.round((loaded / total) * 100);
          setStatusMessage(`Baixando... ${pct}%`);
        }
        const blob = new Blob(chunks, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const disposition = startResponse.headers.get('content-disposition');
        const fileName = disposition?.match(/filename="(.+)"/)?.[1] ?? 'export.xlsx';
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
      } else {
        setStatusMessage('Baixando arquivo...');
        const blob = await startResponse.blob();
        const url = URL.createObjectURL(blob);
        const disposition = startResponse.headers.get('content-disposition');
        const fileName = disposition?.match(/filename="(.+)"/)?.[1] ?? 'export.xlsx';
        const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
      }

      setExportStatus('completed');
      setStatusMessage('Download pronto!');
      toast({ title: 'Exportação concluída', description: 'Arquivo Excel baixado com sucesso!' });
      setTimeout(() => setOpen(false), 1000);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Erro ao exportar:', error);
      setExportStatus('error');
      setStatusMessage('Erro ao iniciar exportação');
      toast({ title: 'Erro na exportação', description: 'Não foi possível iniciar a geração do arquivo.', variant: 'destructive' });
    }
  };

  const blocos = Object.keys(blocosDisponiveis);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={disabled || blocos.length === 0}
                  className="h-9 w-9 text-emerald-600 hover:text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition-transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Exportar Excel</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex-shrink-0">
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileDown className="h-6 w-6 text-emerald-600" />
            Exportar para Excel
          </DialogTitle>
          <DialogDescription>
            Selecione os registros para gerar o relatório personalizado.
          </DialogDescription>

          {/* Barra de Perfis e Ações */}
          <div className="flex flex-wrap gap-4 items-end justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-4">
            <div className="flex-1 min-w-[280px]">
              <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                Carregar Perfil
              </Label>
              <div className="flex gap-2">
                <Select value={selectedProfile} onValueChange={applyProfile}>
                  <SelectTrigger className="flex-1 h-11 bg-slate-50 dark:bg-slate-800">
                    <SelectValue placeholder={loadingProfiles ? "Carregando..." : "Selecione um perfil..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Opções base */}
                    <SelectItem value="none" className="text-slate-500">Nenhum</SelectItem>
                    <SelectItem value="all">Todos os Registros</SelectItem>
                    
                    {/* Separador se houver perfis do usuário */}
                    {profiles.length > 0 && (
                      <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    )}
                    
                    {/* Perfis do usuário */}
                    {profiles.map(profile => (
                      <div 
                        key={`user_${profile.id}`} 
                        className="relative flex items-center pr-10 group"
                      >
                        <SelectItem 
                          value={`user_${profile.id}`}
                          className="flex-1"
                        >
                          <span className="flex items-center gap-2">
                            {profile.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                            {profile.name}
                          </span>
                        </SelectItem>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDeleteConfirmId(profile.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Botão Salvar Perfil */}
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-11 w-11"
                  title="Salvar seleção como perfil"
                  onClick={openSaveDialog}
                >
                  <Plus className="h-5 w-5" />
                </Button>
                
                {/* Botão Favoritar - sempre visível se há perfis */}
                {profiles.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-11 w-11"
                    title={
                      !getSelectedUserProfileId() 
                        ? "Selecione um perfil para favoritar" 
                        : isSelectedProfileDefault 
                          ? "Perfil padrão" 
                          : "Definir como padrão"
                    }
                    onClick={() => {
                      const profileId = getSelectedUserProfileId();
                      if (profileId) handleToggleDefault(profileId);
                    }}
                    disabled={setDefaultProfile.isPending || !getSelectedUserProfileId()}
                  >
                    <Star className={cn("h-5 w-5", isSelectedProfileDefault && "text-yellow-500 fill-yellow-500")} />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-700 pl-4 h-10">
              <button 
                onClick={selectAll}
                className="text-sm font-bold text-primary hover:underline"
              >
                Selecionar Todos
              </button>
              <button 
                onClick={clearSelection}
                className="text-sm font-bold text-slate-500 hover:text-red-500 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Acordeões de Blocos */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50",
            "[&::-webkit-scrollbar]:w-3",
            "[&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800",
            "[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600",
            "[&::-webkit-scrollbar-thumb]:rounded-full"
          )}
        >
          <div className="space-y-3">
            {blocos.map(bloco => {
              const isExpanded = expandedBlocks.has(bloco);
              const registros = blocosDisponiveis[bloco] || [];
              const blockName = BLOCK_DESCRIPTIONS[bloco] || `Bloco ${bloco}`;
              const { selected, total } = getBlockCount(bloco);
              const allSelected = selected === total && total > 0;
              const someSelected = selected > 0 && selected < total;

              return (
                <div 
                  key={bloco}
                  className={cn(
                    "border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 transition-all duration-300",
                    isExpanded && "shadow-sm"
                  )}
                >
                  {/* Header do Acordeão */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    onClick={() => toggleBlock(bloco)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBloco(bloco);
                        }}
                      >
                        <Checkbox
                          checked={allSelected}
                          className={cn(someSelected && "opacity-50")}
                        />
                      </div>
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {blockName}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {selected}/{total}
                      </Badge>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 text-slate-400 transition-transform duration-300",
                        isExpanded && "rotate-180"
                      )} 
                    />
                  </div>

                  {/* Conteúdo do Acordeão */}
                  <div 
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {registros.map(reg => {
                          const regCode = reg.codigo.replace('REG_', '');
                          const description = REG_DESCRIPTIONS[regCode] || reg.descricao || 'Registro SPED';
                          const isSelected = selectedRegistros.has(reg.codigo);

                          return (
                            <label 
                              key={reg.codigo}
                              className={cn(
                                "flex items-start gap-2 cursor-pointer p-2 rounded-lg transition-colors border",
                                isSelected 
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
                                  : "bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRegistro(reg.codigo)}
                                className="mt-0.5"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                  {regCode}
                                </span>
                                <span className="text-[10px] text-slate-500 leading-tight truncate">
                                  {description}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-5 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            {exportStatus === 'processing' || exportStatus === 'starting' ? (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shadow-sm">
                <Server className="h-5 w-5 text-amber-600 animate-pulse" />
              </div>
            ) : exportStatus === 'completed' ? (
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary font-bold shadow-sm">
                {selectedRegistros.size}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {exportStatus === 'idle' ? 'Registros Selecionados' : 'Exportação em Andamento'}
              </span>
              <span className="text-xs text-slate-500">
                {statusMessage || 'Pronto para exportar'}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={exportStatus !== 'idle' || selectedRegistros.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {exportStatus === 'starting' || exportStatus === 'processing' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Gerar Relatório ({selectedRegistros.size})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Dialog para salvar novo perfil */}
      <AlertDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar Perfil de Exportação</AlertDialogTitle>
            <AlertDialogDescription>
              Salve a seleção atual como um novo perfil para uso futuro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome do Perfil</Label>
              <Input
                id="profile-name"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Ex: Auditoria Completa"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-default"
                checked={saveAsDefault}
                onCheckedChange={(checked) => setSaveAsDefault(checked === true)}
              />
              <Label htmlFor="save-default" className="text-sm text-muted-foreground">
                Definir como perfil padrão
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSaveProfile}
              disabled={createProfile.isPending || !newProfileName.trim()}
            >
              {createProfile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Perfil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Perfil</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este perfil? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProfile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
