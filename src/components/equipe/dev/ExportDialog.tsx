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

export const AVAILABLE_COLUMNS: ColumnConfig[] = [
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
];

// Grupos de colunas
const COLUMN_GROUPS = ['Documento', 'Emitente', 'Destinatário', 'Totais', 'Produtos'];

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
  }>;
  ICMSTot: {
    vICMS: number;
    vICMSST: number;
  };
}

interface ExportDialogProps {
  data: NFeRecord[];
  totalRecords: number;
  dataInicio: string;
  dataFim: string;
  disabled?: boolean;
}

// Função para acessar valores aninhados
const getNestedValue = (obj: any, path: string): any => {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return '';
    
    // Se for array de produtos, retornar lista
    if (part === 'produtos' && Array.isArray(current.produtos)) {
      return current.produtos;
    }
    
    // Se estiver acessando propriedade de produtos (ex: produtos.xProd)
    if (parts[0] === 'produtos' && Array.isArray(obj.produtos)) {
      const propName = parts[1];
      return obj.produtos.map((p: any) => p[propName]).join('; ');
    }
    
    current = current[part];
  }
  
  return current ?? '';
};

// Formatar valor para exibição
const formatValue = (value: any, columnId: string): string => {
  if (value === null || value === undefined || value === '') return '-';
  
  // Formatar data
  if (columnId === 'dhEmi' && value) {
    return new Date(value).toLocaleDateString('pt-BR');
  }
  
  // Formatar valores monetários
  if (columnId.includes('vProd') || columnId.includes('vICMS')) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
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

export function ExportDialog({ data, totalRecords, dataInicio, dataFim, disabled }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map(c => c.id)
  );
  const [activeTab, setActiveTab] = useState('colunas');
  const [isExporting, setIsExporting] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    COLUMN_GROUPS.forEach(group => {
      groups[group] = AVAILABLE_COLUMNS.filter(c => c.group === group);
    });
    return groups;
  }, []);

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
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.id));
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
    return data.slice(0, 10);
  }, [data]);

  // Colunas selecionadas para preview
  const selectedColumnConfigs = useMemo(() => {
    return AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.id));
  }, [selectedColumns]);

  // Exportar para Excel
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({ title: 'Selecione colunas', description: 'Selecione ao menos uma coluna para exportar.', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      // Preparar dados
      const exportRows: Record<string, any>[] = [];
      
      // Verificar se há colunas de produtos selecionadas
      const hasProdutoColumns = selectedColumns.some(c => c.startsWith('produtos.'));
      
      data.forEach(record => {
        if (hasProdutoColumns && record.produtos && record.produtos.length > 0) {
          // Uma linha por produto
          record.produtos.forEach(produto => {
            const row: Record<string, any> = {};
            selectedColumnConfigs.forEach(col => {
              if (col.id.startsWith('produtos.')) {
                const propName = col.id.split('.')[1];
                row[col.label] = formatValue(produto[propName as keyof typeof produto], col.id);
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

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(exportRows);
      
      // Ajustar largura das colunas
      const colWidths = selectedColumnConfigs.map(col => ({
        wch: Math.max(col.label.length, 15)
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Documentos Fiscais');

      // Download
      const fileName = `nfe_export_${dataInicio}_${dataFim}.xlsx`;
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
                  {selectedColumns.length} de {AVAILABLE_COLUMNS.length} selecionadas
                </Badge>
              </div>

              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-6">
                  {COLUMN_GROUPS.map(group => {
                    const groupCols = columnsByGroup[group];
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
