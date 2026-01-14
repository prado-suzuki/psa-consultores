import { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { Download, Loader2, Save, Trash2, Star, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { useExportProfiles, ExportProfile } from '@/hooks/useExportProfiles';
import { toast } from '@/hooks/use-toast';
import {
  NFE_COLUMNS,
  CTE_COLUMNS,
  NFE_COLUMN_GROUPS,
  CTE_COLUMN_GROUPS,
  ColumnConfig,
  AVAILABLE_COLUMNS,
} from '@/constants/exportConfig';
import { API_BASE_URL } from '@/config/api';
import { useApiAuth } from '@/hooks/useApiAuth';

// Re-exportar para retrocompatibilidade
export type { ColumnConfig };
export { NFE_COLUMNS, CTE_COLUMNS, AVAILABLE_COLUMNS };

interface NFeRecord {
  chave_nfe: string;
  cUF: number;
  natOp: string;
  mod: string;
  serie: number;
  nNF: string;
  dhEmi: string | null;
  tpNF: number;
  emit: {
    CNPJ: string;
    xNome: string;
    IE: string;
    UF: string;
  };
  dest: {
    CNPJ: string;
    xNome: string;
    IE: string;
    UF: string;
  };
  produtos: Array<{
    nItem: number;
    cProd: string;
    xProd: string;
    NCM: string;
    CFOP: string;
    vProd: number;
    PIS?: {
      CST: string | null;
      vBC: number | null;
      pPIS: number | null;
      vPIS: number | null;
      qBCProd: number | null;
      vAliqProd: number | null;
      vBC_ST: number | null;
      pPIS_ST: number | null;
      vPIS_ST: number | null;
    };
    COFINS?: {
      CST: string | null;
      vBC: number | null;
      pCOFINS: number | null;
      vCOFINS: number | null;
      qBCProd: number | null;
      vAliqProd: number | null;
      vBC_ST: number | null;
      pCOFINS_ST: number | null;
      vCOFINS_ST: number | null;
    };
  }>;
  ICMSTot: {
    vICMS: number;
    vICMSST: number;
  };
}

interface CTeRecord {
  chave_cte: string;
  cCT: number;
  cfop: string;
  natOp: string;
  mod: string;
  serie: number;
  nCT: number;
  dEmi: string | null;
  tpEmis: number;
  tpCTe: number;
  modal: string;
  tpServ: number;
  cMunIni: number;
  xMunIni: string;
  cMunFim: number;
  xMunFim: string;
  vTPrest: number;
  vRec: number;
  vCarga: number | null;
  proPred: string | null;
  emit: {
    CNPJ: string | null;
    CPF: string | null;
    IE: string | null;
    xNome: string;
    xFant: string | null;
    UF: string;
    cMun: number;
  };
  dest: {
    CNPJ: string | null;
    CPF: string | null;
    IE: string | null;
    xNome: string;
    xFant: string | null;
    UF: string;
    cMun: number;
    ISUF: string | null;
  };
  tomador: {
    toma: number;
    CNPJ: string | null;
    CPF: string | null;
    IE: string | null;
    xNome: string;
    UF: string;
    cMun: number;
  };
  icms: {
    CST: string;
    vBC: number | null;
    pICMS: number | null;
    vICMS: number | null;
    pRedBC: number | null;
    vBCSTRet: number | null;
    vICMSSTRet: number | null;
    vTotTrib: number | null;
  };
  infAdic: {
    xObs: string | null;
    infAdFisco: string | null;
  };
  docs_nfe: string[];
  medidas: Array<{
    cUnid: string;
    tpMed: string;
    qCarga: number;
  }>;
  rems: Array<{
    CNPJ: string | null;
    CPF: string | null;
    IE: string | null;
    xNome: string;
    xFant: string | null;
    UF: string;
    cMun: number;
  }>;
}

interface ExportDialogProps {
  data: NFeRecord[];
  cteData?: CTeRecord[];
  tipoDocumento: 'nfe' | 'cte' | 'todos';
  totalRecords: number;
  dataInicio: string;
  dataFim: string;
  disabled?: boolean;
  // Props para buscar todos os dados
  contribuinteId?: string;
  tipoMov?: string;
  emitente?: string;
  destinatario?: string;
}

// Função para acessar valores aninhados (suporta até 3 níveis: produtos.PIS.vPIS)
const getNestedValue = (obj: any, path: string): any => {
  const parts = path.split('.');
  
  // Tratamento especial para campos de produtos - ANTES do loop
  if (parts[0] === 'produtos' && Array.isArray(obj.produtos)) {
    if (parts.length === 1) {
      // Apenas "produtos" - retornar contagem ou vazio
      return obj.produtos.length > 0 ? `${obj.produtos.length} item(s)` : '-';
    }
    if (parts.length === 2) {
      // produtos.xProd, produtos.NCM, etc.
      const propName = parts[1];
      const values = obj.produtos.map((p: any) => {
        const val = p[propName];
        return val !== null && val !== undefined ? String(val) : '';
      }).filter((v: string) => v !== '');
      return values.length > 0 ? values.join('; ') : '-';
    }
    if (parts.length === 3) {
      // produtos.PIS.vPIS, produtos.COFINS.CST, etc.
      const subObj = parts[1];
      const propName = parts[2];
      const values = obj.produtos.map((p: any) => {
        const subValue = p[subObj];
        if (subValue && typeof subValue === 'object') {
          const val = subValue[propName];
          return val !== null && val !== undefined ? String(val) : '';
        }
        return '';
      }).filter((v: string) => v !== '');
      return values.length > 0 ? values.join('; ') : '-';
    }
  }
  
  // Navegação padrão para campos não-produtos
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return '';
    current = current[part];
  }
  
  return current ?? '';
};

// Formatar valor para exibição
const formatValue = (value: any, columnId: string): string => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Se for objeto ou array, converter para string legível
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const stringValues = value.map(v => v !== null && v !== undefined ? String(v) : '').filter(v => v !== '');
      return stringValues.length > 0 ? stringValues.join('; ') : '-';
    }
    // Objeto genérico - tentar extrair valores ou retornar placeholder
    try {
      const keys = Object.keys(value);
      if (keys.length === 0) return '-';
      // Tentar extrair valores simples do objeto
      const simpleValues = keys.map(k => value[k]).filter(v => v !== null && v !== undefined && typeof v !== 'object');
      if (simpleValues.length > 0) {
        return simpleValues.join('; ');
      }
      return JSON.stringify(value);
    } catch {
      return '[objeto]';
    }
  }
  
  // Formatar data
  if ((columnId === 'dhEmi' || columnId === 'dEmi') && value) {
    return new Date(value).toLocaleDateString('pt-BR');
  }
  
  // Formatar valores monetários (inclui PIS e COFINS)
  if (columnId.includes('vProd') || columnId.includes('vICMS') || columnId.includes('vTPrest') || 
      columnId.includes('vRec') || columnId.includes('vCarga') || columnId.includes('vBC') ||
      columnId.includes('vPIS') || columnId.includes('vCOFINS') || columnId.includes('vAliqProd')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    }
  }

  // Formatar percentual (inclui PIS e COFINS)
  if (columnId.includes('pICMS') || columnId.includes('pRedBC') ||
      columnId.includes('pPIS') || columnId.includes('pCOFINS')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return `${num.toFixed(2)}%`;
    }
  }
  
  // Formatar CNPJ
  if (columnId.includes('CNPJ') && typeof value === 'string') {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
  }
  
  return String(value);
};

export function ExportDialog({ 
  data, 
  cteData = [], 
  tipoDocumento, 
  totalRecords, 
  dataInicio, 
  dataFim, 
  disabled,
  contribuinteId,
  tipoMov,
  emitente,
  destinatario
}: ExportDialogProps) {
  // Hook para autenticação da API
  const { fetchWithAuth } = useApiAuth();
  
  // Determinar colunas e grupos baseado no tipo de documento
  const availableColumns = tipoDocumento === 'cte' ? CTE_COLUMNS : NFE_COLUMNS;
  const columnGroups = tipoDocumento === 'cte' ? CTE_COLUMN_GROUPS : NFE_COLUMN_GROUPS;

  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('colunas');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Estados para o dialog interno de salvar perfil
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  const {
    profiles,
    isLoading: loadingProfiles,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
  } = useExportProfiles();

  // Lógica unificada de auto-carregamento ao abrir o modal
  useEffect(() => {
    if (open) {
      // Prioridade: perfil padrão > todas as colunas
      if (defaultProfile && defaultProfile.columns.length > 0) {
        // Filtrar apenas colunas válidas para o tipo atual
        const validColumns = defaultProfile.columns.filter(
          col => availableColumns.some(ac => ac.id === col)
        );
        if (validColumns.length > 0) {
          setSelectedColumns(validColumns);
          setSelectedProfileId(defaultProfile.id);
        } else {
          // Perfil padrão não tem colunas válidas para este tipo
          setSelectedColumns(availableColumns.map(c => c.id));
          setSelectedProfileId('');
        }
      } else {
        // Sem perfil padrão: selecionar todas
        setSelectedColumns(availableColumns.map(c => c.id));
        setSelectedProfileId('');
      }
    }
  }, [open, defaultProfile, availableColumns]);

  // Colunas agrupadas
  const columnsByGroup = useMemo(() => {
    const groups: Record<string, ColumnConfig[]> = {};
    columnGroups.forEach(group => {
      groups[group] = availableColumns.filter(c => c.group === group);
    });
    return groups;
  }, [availableColumns, columnGroups]);

  // Toggle coluna
  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Selecionar todas
  const selectAll = () => {
    setSelectedColumns(availableColumns.map(c => c.id));
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedColumns([]);
  };

  // Selecionar/desselecionar grupo
  const toggleGroup = (group: string) => {
    const groupColumns = columnsByGroup[group].map(c => c.id);
    const allSelected = groupColumns.every(id => selectedColumns.includes(id));
    
    if (allSelected) {
      setSelectedColumns(prev => prev.filter(id => !groupColumns.includes(id)));
    } else {
      setSelectedColumns(prev => [...new Set([...prev, ...groupColumns])]);
    }
  };

  // Carregar perfil
  const loadProfile = (profileId: string) => {
    if (!profileId) {
      setSelectedProfileId('');
      return;
    }
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      // Filtrar apenas colunas válidas para o tipo atual
      const validColumns = profile.columns.filter(
        col => availableColumns.some(ac => ac.id === col)
      );
      setSelectedColumns(validColumns.length > 0 ? validColumns : availableColumns.map(c => c.id));
      setSelectedProfileId(profileId);
    }
  };

  // Abrir dialog para salvar perfil
  const openSaveDialog = () => {
    if (selectedColumns.length === 0) {
      toast({ title: 'Selecione colunas', description: 'Selecione ao menos uma coluna.', variant: 'destructive' });
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
    const result = await createProfile.mutateAsync({ name: newProfileName.trim(), columns: selectedColumns });
    if (saveAsDefault && result?.id) {
      await setDefaultProfile.mutateAsync(result.id);
    }
    setNewProfileName('');
    setSaveDialogOpen(false);
  };

  // Atualizar perfil existente
  const handleUpdateProfile = async () => {
    if (!selectedProfileId) return;
    await updateProfile.mutateAsync({ id: selectedProfileId, columns: selectedColumns });
  };

  // Excluir perfil
  const handleDeleteProfile = async () => {
    if (!deleteConfirmId) return;
    await deleteProfile.mutateAsync(deleteConfirmId);
    if (selectedProfileId === deleteConfirmId) {
      setSelectedProfileId('');
    }
    setDeleteConfirmId(null);
  };

  // Toggle favorito/padrão
  const handleToggleDefault = async () => {
    if (!selectedProfileId) return;
    const currentProfile = profiles.find(p => p.id === selectedProfileId);
    if (currentProfile?.is_default) {
      // Já é padrão - não faz nada (não há opção de "remover padrão" no hook)
      toast({ title: 'Perfil já é padrão', description: 'Este perfil já está definido como padrão.' });
      return;
    }
    await setDefaultProfile.mutateAsync(selectedProfileId);
  };

  // Verificar se perfil selecionado é o padrão
  const isSelectedProfileDefault = useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId)?.is_default ?? false;
  }, [profiles, selectedProfileId]);

  // Preview dos dados (primeiros 10 registros)
  const previewData = useMemo(() => {
    return tipoDocumento === 'cte' ? cteData.slice(0, 10) : data.slice(0, 10);
  }, [data, cteData, tipoDocumento]);

  // Colunas selecionadas para preview
  const selectedColumnConfigs = useMemo(() => {
    return availableColumns.filter(c => selectedColumns.includes(c.id));
  }, [selectedColumns, availableColumns]);

  // Função para buscar CSV do endpoint de export
  const fetchExportCsv = async (): Promise<string> => {
    if (!contribuinteId) {
      throw new Error('Contribuinte não selecionado');
    }

    const docType = tipoDocumento === 'cte' ? 'cte' : 'nfe';
    const url = `${API_BASE_URL}/api/v1/query/export/${contribuinteId}/${docType}/csv`;
    
    const body = {
      data_inicio: dataInicio,
      data_fim: dataFim,
      colunas: selectedColumns,
      ...(tipoMov && { tipo_mov: tipoMov }),
      ...(emitente && { emitente: emitente.replace(/\D/g, '') }),
      ...(destinatario && { destinatario: destinatario.replace(/\D/g, '') }),
    };

    const response = await fetchWithAuth(url, { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao exportar: ${response.status} - ${errorText}`);
    }
    
    return response.text();
  };

  // Converter CSV para array de objetos
  const parseCsv = (csvText: string): Record<string, string>[] => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    // Detectar separador (vírgula ou ponto-e-vírgula)
    const separator = lines[0].includes(';') ? ';' : ',';
    
    const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
  };

  // Exportar para Excel
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Buscar CSV do endpoint de export
      const csvText = await fetchExportCsv();
      const csvData = parseCsv(csvText);
      
      if (csvData.length === 0) {
        toast({
          title: 'Nenhum dado',
          description: 'Não há registros para exportar.',
          variant: 'destructive',
        });
        return;
      }

      // Criar workbook a partir do CSV
      const ws = XLSX.utils.json_to_sheet(csvData);
      
      // Ajustar largura das colunas baseado nos headers
      const headers = Object.keys(csvData[0] || {});
      const colWidths = headers.map(h => ({
        wch: Math.max(h.length, 15)
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      const sheetName = tipoDocumento === 'cte' ? 'CT-e' : 'NF-e';
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // Download
      const fileName = `${tipoDocumento}_export_${dataInicio}_${dataFim}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: 'Exportação concluída',
        description: `${csvData.length} registro(s) exportados para ${fileName}`,
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={disabled} size="sm">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Exportar Excel
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Exportar Documentos Fiscais</DialogTitle>
            <DialogDescription>
              {totalRecords} registro(s) serão exportados • Período: {dataInicio} a {dataFim}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="colunas">Colunas</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Aba Colunas */}
            <TabsContent value="colunas" className="flex-1 overflow-hidden mt-4">
              {/* Toolbar de Perfis */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Select value={selectedProfileId || "__none__"} onValueChange={(val) => loadProfile(val === "__none__" ? "" : val)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={loadingProfiles ? "Carregando..." : "Carregar Preset"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {profiles.map(profile => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <span className="flex items-center gap-2">
                          {profile.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                          {profile.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={openSaveDialog}
                  title="Salvar como novo perfil"
                >
                  <Save className="h-4 w-4" />
                </Button>

                {selectedProfileId && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleToggleDefault}
                      disabled={setDefaultProfile.isPending}
                      title={isSelectedProfileDefault ? "Perfil padrão" : "Definir como padrão"}
                    >
                      <Star className={`h-4 w-4 ${isSelectedProfileDefault ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteConfirmId(selectedProfileId)}
                      title="Excluir perfil"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}

                <div className="h-6 w-px bg-border mx-1" />

                <Button variant="outline" size="icon" onClick={selectAll} title="Selecionar todas">
                  <CheckSquare className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={clearSelection} title="Limpar seleção">
                  <Square className="h-4 w-4" />
                </Button>

                <Badge variant="secondary" className="ml-auto">
                  {selectedColumns.length} de {availableColumns.length} selecionadas
                </Badge>
              </div>

              {/* Lista de Colunas com Accordions */}
              <ScrollArea className="h-[350px] pr-4">
                <Accordion type="multiple" defaultValue={[]} className="w-full">
                  {columnGroups.map(group => {
                    const groupCols = columnsByGroup[group] || [];
                    if (groupCols.length === 0) return null;
                    
                    const selectedInGroup = groupCols.filter(c => selectedColumns.includes(c.id)).length;
                    const allSelected = selectedInGroup === groupCols.length;
                    const someSelected = selectedInGroup > 0 && selectedInGroup < groupCols.length;

                    return (
                      <AccordionItem key={group} value={group}>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`group-${group}`}
                            checked={allSelected}
                            onCheckedChange={() => toggleGroup(group)}
                            onClick={(e) => e.stopPropagation()}
                            className={someSelected ? 'opacity-50' : ''}
                          />
                          <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{group}</span>
                              <Badge variant="outline" className="text-xs">
                                {selectedInGroup}/{groupCols.length}
                              </Badge>
                            </div>
                          </AccordionTrigger>
                        </div>
                        <AccordionContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6 pt-2">
                            {groupCols.map(col => (
                              <div key={col.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={col.id}
                                  checked={selectedColumns.includes(col.id)}
                                  onCheckedChange={() => toggleColumn(col.id)}
                                />
                                <Label htmlFor={col.id} className="text-sm cursor-pointer">
                                  {col.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </ScrollArea>
            </TabsContent>

            {/* Aba Preview */}
            <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {Math.min(10, tipoDocumento === 'cte' ? cteData.length : data.length)} de {totalRecords} registros
                  </p>
                  <Badge variant="secondary">{selectedColumns.length} colunas selecionadas</Badge>
                </div>

                {selectedColumns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Selecione ao menos uma coluna para visualizar o preview.
                  </div>
                ) : previewData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado disponível para preview.
                  </div>
                ) : (
                  <ScrollArea className="h-[320px] w-full">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {selectedColumnConfigs.map(col => (
                              <TableHead key={col.id} className="whitespace-nowrap text-xs">
                                {col.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewData.map((record, idx) => (
                            <TableRow key={idx}>
                              {selectedColumnConfigs.map(col => (
                                <TableCell key={col.id} className="text-xs whitespace-nowrap max-w-[150px] truncate">
                                  {formatValue(getNestedValue(record, col.id), col.id)}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0}>
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog interno para salvar novo perfil */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Perfil</DialogTitle>
            <DialogDescription>
              As {selectedColumns.length} colunas selecionadas serão salvas neste perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome do perfil</Label>
              <Input
                id="profile-name"
                placeholder="Ex: Relatório Fiscal Completo"
                value={newProfileName}
                onChange={e => setNewProfileName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="save-as-default"
                checked={saveAsDefault}
                onCheckedChange={(checked) => setSaveAsDefault(checked === true)}
              />
              <Label htmlFor="save-as-default" className="cursor-pointer">
                Definir como padrão
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={createProfile.isPending || !newProfileName.trim()}>
              {createProfile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O perfil será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
