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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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

// Definição das colunas disponíveis
export interface ColumnConfig {
  id: string;
  label: string;
  group: string;
}

// Colunas NFe
export const NFE_COLUMNS: ColumnConfig[] = [
  // Documento
  { id: 'chave_nfe', label: 'Chave NFe', group: 'Documento' },
  { id: 'dhEmi', label: 'Data Emissão', group: 'Documento' },
  { id: 'nNF', label: 'Número NF', group: 'Documento' },
  { id: 'serie', label: 'Série', group: 'Documento' },
  { id: 'natOp', label: 'Natureza Operação', group: 'Documento' },
  { id: 'tpNF', label: 'Tipo NF (0=Entrada, 1=Saída)', group: 'Documento' },
  { id: 'mod', label: 'Modelo', group: 'Documento' },
  // Emitente
  { id: 'emit.CNPJ', label: 'CNPJ Emitente', group: 'Emitente' },
  { id: 'emit.xNome', label: 'Razão Social Emitente', group: 'Emitente' },
  { id: 'emit.IE', label: 'IE Emitente', group: 'Emitente' },
  { id: 'emit.UF', label: 'UF Emitente', group: 'Emitente' },
  // Destinatário
  { id: 'dest.CNPJ', label: 'CNPJ Destinatário', group: 'Destinatário' },
  { id: 'dest.xNome', label: 'Razão Social Destinatário', group: 'Destinatário' },
  { id: 'dest.IE', label: 'IE Destinatário', group: 'Destinatário' },
  { id: 'dest.UF', label: 'UF Destinatário', group: 'Destinatário' },
  // Totais
  { id: 'ICMSTot.vICMS', label: 'Valor ICMS', group: 'Totais' },
  { id: 'ICMSTot.vICMSST', label: 'Valor ICMS ST', group: 'Totais' },
  // Produtos (será expandido por item)
  { id: 'produtos.xProd', label: 'Nome Produto', group: 'Produtos' },
  { id: 'produtos.cProd', label: 'Código Produto', group: 'Produtos' },
  { id: 'produtos.NCM', label: 'NCM', group: 'Produtos' },
  { id: 'produtos.CFOP', label: 'CFOP', group: 'Produtos' },
  { id: 'produtos.vProd', label: 'Valor Produto', group: 'Produtos' },
  // Produtos - PIS
  { id: 'produtos.PIS.CST', label: 'CST PIS', group: 'Produtos' },
  { id: 'produtos.PIS.vBC', label: 'Base Cálculo PIS', group: 'Produtos' },
  { id: 'produtos.PIS.pPIS', label: 'Alíquota PIS (%)', group: 'Produtos' },
  { id: 'produtos.PIS.vPIS', label: 'Valor PIS', group: 'Produtos' },
  { id: 'produtos.PIS.qBCProd', label: 'Qtd BC PIS', group: 'Produtos' },
  { id: 'produtos.PIS.vAliqProd', label: 'Alíq. PIS (R$)', group: 'Produtos' },
  { id: 'produtos.PIS.vBC_ST', label: 'BC PIS ST', group: 'Produtos' },
  { id: 'produtos.PIS.pPIS_ST', label: 'Alíq. PIS ST (%)', group: 'Produtos' },
  { id: 'produtos.PIS.vPIS_ST', label: 'Valor PIS ST', group: 'Produtos' },
  // Produtos - COFINS
  { id: 'produtos.COFINS.CST', label: 'CST COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.vBC', label: 'Base Cálculo COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.pCOFINS', label: 'Alíquota COFINS (%)', group: 'Produtos' },
  { id: 'produtos.COFINS.vCOFINS', label: 'Valor COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.qBCProd', label: 'Qtd BC COFINS', group: 'Produtos' },
  { id: 'produtos.COFINS.vAliqProd', label: 'Alíq. COFINS (R$)', group: 'Produtos' },
  { id: 'produtos.COFINS.vBC_ST', label: 'BC COFINS ST', group: 'Produtos' },
  { id: 'produtos.COFINS.pCOFINS_ST', label: 'Alíq. COFINS ST (%)', group: 'Produtos' },
  { id: 'produtos.COFINS.vCOFINS_ST', label: 'Valor COFINS ST', group: 'Produtos' },
];

// Colunas CT-e
export const CTE_COLUMNS: ColumnConfig[] = [
  // Documento
  { id: 'chave_cte', label: 'Chave CTe', group: 'Documento' },
  { id: 'dEmi', label: 'Data Emissão', group: 'Documento' },
  { id: 'nCT', label: 'Número CT', group: 'Documento' },
  { id: 'serie', label: 'Série', group: 'Documento' },
  { id: 'natOp', label: 'Natureza Operação', group: 'Documento' },
  { id: 'cfop', label: 'CFOP', group: 'Documento' },
  { id: 'mod', label: 'Modelo', group: 'Documento' },
  { id: 'modal', label: 'Modal', group: 'Documento' },
  // Origem/Destino
  { id: 'xMunIni', label: 'Município Origem', group: 'Trajeto' },
  { id: 'xMunFim', label: 'Município Destino', group: 'Trajeto' },
  { id: 'cMunIni', label: 'Código Mun. Origem', group: 'Trajeto' },
  { id: 'cMunFim', label: 'Código Mun. Destino', group: 'Trajeto' },
  // Emitente
  { id: 'emit.CNPJ', label: 'CNPJ Emitente', group: 'Emitente' },
  { id: 'emit.xNome', label: 'Razão Social Emitente', group: 'Emitente' },
  { id: 'emit.xFant', label: 'Nome Fantasia Emitente', group: 'Emitente' },
  { id: 'emit.IE', label: 'IE Emitente', group: 'Emitente' },
  { id: 'emit.UF', label: 'UF Emitente', group: 'Emitente' },
  // Destinatário
  { id: 'dest.CNPJ', label: 'CNPJ Destinatário', group: 'Destinatário' },
  { id: 'dest.xNome', label: 'Razão Social Destinatário', group: 'Destinatário' },
  { id: 'dest.IE', label: 'IE Destinatário', group: 'Destinatário' },
  { id: 'dest.UF', label: 'UF Destinatário', group: 'Destinatário' },
  // Tomador
  { id: 'tomador.CNPJ', label: 'CNPJ Tomador', group: 'Tomador' },
  { id: 'tomador.xNome', label: 'Razão Social Tomador', group: 'Tomador' },
  { id: 'tomador.IE', label: 'IE Tomador', group: 'Tomador' },
  { id: 'tomador.UF', label: 'UF Tomador', group: 'Tomador' },
  // Valores
  { id: 'vTPrest', label: 'Valor Prestação', group: 'Valores' },
  { id: 'vRec', label: 'Valor a Receber', group: 'Valores' },
  { id: 'vCarga', label: 'Valor da Carga', group: 'Valores' },
  // ICMS
  { id: 'icms.CST', label: 'CST ICMS', group: 'ICMS' },
  { id: 'icms.vBC', label: 'Base Cálculo ICMS', group: 'ICMS' },
  { id: 'icms.pICMS', label: 'Alíquota ICMS', group: 'ICMS' },
  { id: 'icms.vICMS', label: 'Valor ICMS', group: 'ICMS' },
];

// Grupos de colunas
const NFE_COLUMN_GROUPS = ['Documento', 'Emitente', 'Destinatário', 'Totais', 'Produtos'];
const CTE_COLUMN_GROUPS = ['Documento', 'Trajeto', 'Emitente', 'Destinatário', 'Tomador', 'Valores', 'ICMS'];

// Para retrocompatibilidade
export const AVAILABLE_COLUMNS = NFE_COLUMNS;

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
}

// Função para acessar valores aninhados (suporta até 3 níveis: produtos.PIS.vPIS)
const getNestedValue = (obj: any, path: string): any => {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return '';
    
    // Se for array de produtos, retornar lista
    if (part === 'produtos' && Array.isArray(current.produtos)) {
      return current.produtos;
    }
    
    // Se estiver acessando propriedade de produtos (ex: produtos.xProd ou produtos.PIS.vPIS)
    if (parts[0] === 'produtos' && Array.isArray(obj.produtos)) {
      if (parts.length === 2) {
        // produtos.xProd
        const propName = parts[1];
        return obj.produtos.map((p: any) => p[propName]).join('; ');
      }
      if (parts.length === 3) {
        // produtos.PIS.vPIS ou produtos.COFINS.vCOFINS
        const subObj = parts[1];
        const propName = parts[2];
        return obj.produtos.map((p: any) => p[subObj]?.[propName]).join('; ');
      }
    }
    
    current = current[part];
  }
  
  return current ?? '';
};

// Formatar valor para exibição
const formatValue = (value: any, columnId: string): string => {
  if (value === null || value === undefined || value === '') return '-';
  
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

export function ExportDialog({ data, cteData = [], tipoDocumento, totalRecords, dataInicio, dataFim, disabled }: ExportDialogProps) {
  // Determinar colunas e grupos baseado no tipo de documento
  const availableColumns = tipoDocumento === 'cte' ? CTE_COLUMNS : NFE_COLUMNS;
  const columnGroups = tipoDocumento === 'cte' ? CTE_COLUMN_GROUPS : NFE_COLUMN_GROUPS;

  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('colunas');
  const [isExporting, setIsExporting] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Resetar colunas selecionadas quando o tipo de documento muda
  useEffect(() => {
    setSelectedColumns(availableColumns.map(c => c.id));
  }, [tipoDocumento]);

  const {
    profiles,
    isLoading: loadingProfiles,
    defaultProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
  } = useExportProfiles();

  // Carregar perfil padrão ao abrir
  useEffect(() => {
    if (open && defaultProfile) {
      setSelectedColumns(defaultProfile.columns);
      setSelectedProfileId(defaultProfile.id);
    }
  }, [open, defaultProfile]);

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
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setSelectedColumns(profile.columns);
      setSelectedProfileId(profileId);
    }
  };

  // Salvar novo perfil
  const handleSaveProfile = async () => {
    if (!newProfileName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe um nome para o perfil.', variant: 'destructive' });
      return;
    }
    if (selectedColumns.length === 0) {
      toast({ title: 'Selecione colunas', description: 'Selecione ao menos uma coluna.', variant: 'destructive' });
      return;
    }
    await createProfile.mutateAsync({ name: newProfileName.trim(), columns: selectedColumns });
    setNewProfileName('');
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

  // Preview dos dados (primeiros 10 registros)
  const previewData = useMemo(() => {
    return tipoDocumento === 'cte' ? cteData.slice(0, 10) : data.slice(0, 10);
  }, [data, cteData, tipoDocumento]);

  // Colunas selecionadas para preview
  const selectedColumnConfigs = useMemo(() => {
    return availableColumns.filter(c => selectedColumns.includes(c.id));
  }, [selectedColumns, availableColumns]);

  // Exportar para Excel
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({ title: 'Selecione colunas', description: 'Selecione ao menos uma coluna para exportar.', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      const exportRows: Record<string, any>[] = [];
      
      if (tipoDocumento === 'cte') {
        // Exportar CT-e
        cteData.forEach(record => {
          const row: Record<string, any> = {};
          selectedColumnConfigs.forEach(col => {
            row[col.label] = formatValue(getNestedValue(record, col.id), col.id);
          });
          exportRows.push(row);
        });
      } else {
        // Exportar NF-e
        const hasProdutoColumns = selectedColumns.some(c => c.startsWith('produtos.'));
        
        data.forEach(record => {
          if (hasProdutoColumns && record.produtos && record.produtos.length > 0) {
            // Uma linha por produto
            record.produtos.forEach(produto => {
              const row: Record<string, any> = {};
              selectedColumnConfigs.forEach(col => {
                if (col.id.startsWith('produtos.')) {
                  const pathParts = col.id.split('.');
                  if (pathParts.length === 2) {
                    // produtos.xProd
                    const propName = pathParts[1];
                    row[col.label] = formatValue(produto[propName as keyof typeof produto], col.id);
                  } else if (pathParts.length === 3) {
                    // produtos.PIS.vPIS ou produtos.COFINS.vCOFINS
                    const subObj = pathParts[1] as 'PIS' | 'COFINS';
                    const propName = pathParts[2];
                    const subObjValue = produto[subObj];
                    const value = subObjValue ? (subObjValue as any)[propName] : null;
                    row[col.label] = formatValue(value, col.id);
                  }
                } else {
                  row[col.label] = formatValue(getNestedValue(record, col.id), col.id);
                }
              });
              exportRows.push(row);
            });
          } else {
            // Uma linha por documento
            const row: Record<string, any> = {};
            selectedColumnConfigs.forEach(col => {
              if (col.id.startsWith('produtos.')) {
                row[col.label] = '-';
              } else {
                row[col.label] = formatValue(getNestedValue(record, col.id), col.id);
              }
            });
            exportRows.push(row);
          }
        });
      }

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(exportRows);
      
      // Ajustar largura das colunas
      const colWidths = selectedColumnConfigs.map(col => ({
        wch: Math.max(col.label.length, 15)
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
        description: `Arquivo ${fileName} baixado com sucesso.`,
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
          <Button variant="outline" disabled={disabled}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="colunas">Colunas</TabsTrigger>
              <TabsTrigger value="perfis">Perfis</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* Aba Colunas */}
            <TabsContent value="colunas" className="flex-1 overflow-hidden mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <Square className="h-4 w-4 mr-1" />
                  Limpar Seleção
                </Button>
                <Badge variant="secondary" className="ml-auto">
                  {selectedColumns.length} de {availableColumns.length} selecionadas
                </Badge>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-6">
                  {columnGroups.map(group => {
                    const groupCols = columnsByGroup[group] || [];
                    if (groupCols.length === 0) return null;
                    const allSelected = groupCols.every(c => selectedColumns.includes(c.id));
                    const someSelected = groupCols.some(c => selectedColumns.includes(c.id));

                    return (
                      <div key={group}>
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            id={`group-${group}`}
                            checked={allSelected}
                            onCheckedChange={() => toggleGroup(group)}
                            className={someSelected && !allSelected ? 'opacity-50' : ''}
                          />
                          <Label htmlFor={`group-${group}`} className="font-semibold cursor-pointer">
                            {group}
                          </Label>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 ml-6">
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
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Aba Perfis */}
            <TabsContent value="perfis" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-6">
                {/* Carregar perfil */}
                <div className="space-y-2">
                  <Label>Carregar Perfil Salvo</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProfileId} onValueChange={loadProfile}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={loadingProfiles ? "Carregando..." : "Selecione um perfil"} />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            <span className="flex items-center gap-2">
                              {profile.name}
                              {profile.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedProfileId && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleUpdateProfile}
                          disabled={updateProfile.isPending}
                          title="Atualizar perfil com colunas atuais"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDefaultProfile.mutate(selectedProfileId)}
                          disabled={setDefaultProfile.isPending || profiles.find(p => p.id === selectedProfileId)?.is_default}
                          title="Definir como padrão"
                        >
                          <Star className="h-4 w-4" />
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
                  </div>
                </div>

                {/* Criar novo perfil */}
                <div className="space-y-2">
                  <Label>Salvar Novo Perfil</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do perfil"
                      value={newProfileName}
                      onChange={e => setNewProfileName(e.target.value)}
                    />
                    <Button onClick={handleSaveProfile} disabled={createProfile.isPending}>
                      {createProfile.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    As {selectedColumns.length} colunas selecionadas serão salvas neste perfil.
                  </p>
                </div>

                {/* Lista de perfis */}
                {profiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Seus Perfis ({profiles.length})</Label>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {profiles.map(profile => (
                          <div
                            key={profile.id}
                            className={`p-3 rounded-md border cursor-pointer transition-colors ${
                              selectedProfileId === profile.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => loadProfile(profile.id)}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium flex items-center gap-2">
                                {profile.name}
                                {profile.is_default && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-500" />
                                    Padrão
                                  </Badge>
                                )}
                              </span>
                              <Badge variant="outline">{profile.columns.length} colunas</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Aba Preview */}
            <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {Math.min(10, data.length)} de {totalRecords} registros
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
                  <ScrollArea className="h-[320px]">
                    <div className="overflow-x-auto">
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
