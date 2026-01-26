import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Download, Loader2, FileDown, ChevronDown, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  BLOCK_DESCRIPTIONS, 
  REG_DESCRIPTIONS, 
  EXPORT_PRESET_PROFILES,
  formatEFDValue,
  generateColumnsFromData 
} from '@/constants/efdConfig';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl } from '@/config/api';
import type { EFDArquivo, BlocoRegistro } from '@/types/efd';
import { format } from 'date-fns';

interface EFDExportDialogProps {
  arquivo: EFDArquivo;
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  disabled?: boolean;
}

export function EFDExportDialog({ 
  arquivo, 
  blocosDisponiveis,
  disabled 
}: EFDExportDialogProps) {
  const { fetchWithAuth } = useApiAuth();
  const [open, setOpen] = useState(false);
  const [selectedRegistros, setSelectedRegistros] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string>('none');
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  // Listar todos os registros disponíveis
  const allRegistros = useMemo(() => {
    return Object.values(blocosDisponiveis).flat().map(r => r.codigo);
  }, [blocosDisponiveis]);

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setSelectedRegistros(new Set());
      setExpandedBlocks(new Set());
      setSelectedProfile('none');
      setExportProgress({ current: 0, total: 0 });
    }
  }, [open]);

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

  // Aplicar perfil
  const applyProfile = (profileKey: string) => {
    setSelectedProfile(profileKey);
    
    if (profileKey === 'none') {
      return;
    }
    
    const profile = EXPORT_PRESET_PROFILES[profileKey];
    if (!profile) return;
    
    if (profile.registros === 'ALL') {
      setSelectedRegistros(new Set(allRegistros));
    } else {
      // Filtrar apenas registros que existem nos blocos disponíveis
      const availableCodes = allRegistros.map(r => r.replace('REG_', ''));
      const validRegs = profile.registros.filter(r => availableCodes.includes(r));
      setSelectedRegistros(new Set(validRegs.map(r => `REG_${r}`)));
    }
    
    toast({
      title: `Perfil "${profile.name}" aplicado`,
      description: `${profile.registros === 'ALL' ? allRegistros.length : profile.registros.length} registros selecionados`,
    });
  };

  // Contadores por bloco
  const getBlockCount = (bloco: string) => {
    const registros = blocosDisponiveis[bloco] || [];
    const selected = registros.filter(r => selectedRegistros.has(r.codigo)).length;
    return { selected, total: registros.length };
  };

  // Exportar Excel
  const handleExport = async () => {
    if (selectedRegistros.size === 0) {
      toast({
        title: 'Selecione registros',
        description: 'Selecione ao menos um registro para exportar.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: selectedRegistros.size });

    try {
      const wb = XLSX.utils.book_new();
      let processedCount = 0;

      // Para cada registro selecionado, buscar dados e criar aba
      for (const registro of Array.from(selectedRegistros)) {
        try {
          const url = getApiUrl(
            `/api/v1/efd/contribuicoes/${arquivo.CNPJ}/${arquivo.ID_ARQUIVO}/registro/${registro}`
          );
          const response = await fetchWithAuth(url);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.dados && data.dados.length > 0) {
              // Gerar colunas e formatar dados
              const columns = generateColumnsFromData(data.dados);
              const formattedData = data.dados.map((row: Record<string, unknown>) => {
                const newRow: Record<string, string> = {};
                columns.forEach(col => {
                  newRow[col.label] = formatEFDValue(row[col.id], col.id);
                });
                return newRow;
              });

              const ws = XLSX.utils.json_to_sheet(formattedData);
              
              // Ajustar largura das colunas
              ws['!cols'] = columns.map(col => ({ wch: Math.max(col.label.length + 2, 12) }));
              
              // Nome da aba (max 31 caracteres)
              const sheetName = registro.replace('REG_', '').substring(0, 31);
              XLSX.utils.book_append_sheet(wb, ws, sheetName);
            }
          }
        } catch (err) {
          console.warn(`Erro ao buscar registro ${registro}:`, err);
        }

        processedCount++;
        setExportProgress({ current: processedCount, total: selectedRegistros.size });
      }

      // Download do arquivo
      if (wb.SheetNames.length > 0) {
        const fileName = `EFD_${arquivo.NOME}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(wb, fileName);

        toast({
          title: 'Exportação concluída',
          description: `${wb.SheetNames.length} abas exportadas para ${fileName}`,
        });

        setOpen(false);
      } else {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'Os registros selecionados não possuem dados para exportar.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  const blocos = Object.keys(blocosDisponiveis);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="icon"
              disabled={disabled || blocos.length === 0}
              className="h-9 w-9 text-emerald-600 hover:text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <FileDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Exportar Excel</p>
          </TooltipContent>
        </Tooltip>
      </DialogTrigger>
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
            <div className="flex-1 min-w-[250px]">
              <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                Carregar Perfil
              </Label>
              <div className="flex gap-2">
                <Select value={selectedProfile} onValueChange={applyProfile}>
                  <SelectTrigger className="flex-1 h-11 bg-slate-50 dark:bg-slate-800">
                    <SelectValue placeholder="Selecione um perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPORT_PRESET_PROFILES).map(([key, profile]) => (
                      <SelectItem key={key} value={key}>
                        {key === 'all' && '★ '}{profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-11 w-11"
                  title="Salvar como Favorito"
                  onClick={() => toast({ title: 'Funcionalidade em desenvolvimento' })}
                >
                  <Save className="h-5 w-5" />
                </Button>
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
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary font-bold shadow-sm">
              {selectedRegistros.size}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Registros Selecionados
              </span>
              <span className="text-xs text-slate-500">
                {isExporting 
                  ? `Exportando ${exportProgress.current}/${exportProgress.total}...` 
                  : 'Pronto para exportar'
                }
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || selectedRegistros.size === 0}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório ({selectedRegistros.size})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
