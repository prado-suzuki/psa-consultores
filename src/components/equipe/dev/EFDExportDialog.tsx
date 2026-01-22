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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Download, Loader2, CheckSquare, Square, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateColumnsFromData, formatEFDValue, EFD_COLUMN_GROUPS } from '@/constants/efdConfig';
import type { EFDColumnConfig } from '@/types/efd';

interface EFDExportDialogProps {
  data: Record<string, any>[];
  registro: string;
  idArquivo: string;
  disabled?: boolean;
}

export function EFDExportDialog({ 
  data, 
  registro, 
  idArquivo, 
  disabled 
}: EFDExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('colunas');
  const [isExporting, setIsExporting] = useState(false);

  // Gerar colunas dinamicamente a partir dos dados
  const availableColumns = useMemo(() => {
    return generateColumnsFromData(data);
  }, [data]);

  // Agrupar colunas
  const columnsByGroup = useMemo(() => {
    const groups: Record<string, EFDColumnConfig[]> = {};
    EFD_COLUMN_GROUPS.forEach(group => {
      const cols = availableColumns.filter(c => c.group === group);
      if (cols.length > 0) {
        groups[group] = cols;
      }
    });
    return groups;
  }, [availableColumns]);

  // Selecionar todas ao abrir
  useEffect(() => {
    if (open) {
      setSelectedColumns(availableColumns.map(c => c.id));
    }
  }, [open, availableColumns]);

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

  // Toggle grupo
  const toggleGroup = (group: string) => {
    const groupColumns = columnsByGroup[group]?.map(c => c.id) || [];
    const allSelected = groupColumns.every(id => selectedColumns.includes(id));
    
    if (allSelected) {
      setSelectedColumns(prev => prev.filter(id => !groupColumns.includes(id)));
    } else {
      setSelectedColumns(prev => [...new Set([...prev, ...groupColumns])]);
    }
  };

  // Preview dos dados
  const previewData = useMemo(() => data.slice(0, 10), [data]);

  // Colunas selecionadas para preview
  const selectedColumnConfigs = useMemo(() => {
    return availableColumns.filter(c => selectedColumns.includes(c.id));
  }, [availableColumns, selectedColumns]);

  // Exportar Excel
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'Selecione colunas',
        description: 'Selecione ao menos uma coluna para exportar.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      // Filtrar apenas colunas selecionadas
      const filteredData = data.map(row => {
        const newRow: Record<string, any> = {};
        selectedColumns.forEach(colId => {
          const column = availableColumns.find(c => c.id === colId);
          const rawValue = row[colId];
          newRow[column?.label || colId] = formatEFDValue(rawValue, colId);
        });
        return newRow;
      });

      // Criar Excel
      const ws = XLSX.utils.json_to_sheet(filteredData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, registro.replace('REG_', ''));

      // Ajustar largura das colunas
      const colWidths = selectedColumns.map(colId => {
        const column = availableColumns.find(c => c.id === colId);
        return { wch: Math.max((column?.label || colId).length + 2, 12) };
      });
      ws['!cols'] = colWidths;

      // Download
      const fileName = `EFD_${registro}_${idArquivo}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: 'Exportação concluída',
        description: `${data.length} registros exportados para ${fileName}`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled || data.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar {registro}
          </DialogTitle>
          <DialogDescription>
            Selecione as colunas a exportar. Total: {data.length} registros.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colunas">
              Colunas ({selectedColumns.length}/{availableColumns.length})
            </TabsTrigger>
            <TabsTrigger value="preview">
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="colunas" className="flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-1" />
                Selecionar Todas
              </Button>
              <Button variant="outline" size="sm" onClick={clearSelection}>
                <Square className="h-4 w-4 mr-1" />
                Limpar
              </Button>
              <Badge variant="secondary" className="ml-auto">
                {selectedColumns.length} selecionadas
              </Badge>
            </div>

            <ScrollArea className="h-[350px] border rounded-md">
              <Accordion type="multiple" defaultValue={Object.keys(columnsByGroup)} className="p-2">
                {Object.entries(columnsByGroup).map(([group, columns]) => {
                  const allGroupSelected = columns.every(c => selectedColumns.includes(c.id));
                  const someGroupSelected = columns.some(c => selectedColumns.includes(c.id));

                  return (
                    <AccordionItem key={group} value={group}>
                      <AccordionTrigger className="py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allGroupSelected}
                            className={someGroupSelected && !allGroupSelected ? 'opacity-50' : ''}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleGroup(group);
                            }}
                          />
                          <span className="font-medium">{group}</span>
                          <Badge variant="outline" className="ml-2">
                            {columns.filter(c => selectedColumns.includes(c.id)).length}/{columns.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pl-6">
                          {columns.map(column => (
                            <div key={column.id} className="flex items-center gap-2">
                              <Checkbox
                                id={column.id}
                                checked={selectedColumns.includes(column.id)}
                                onCheckedChange={() => toggleColumn(column.id)}
                              />
                              <Label 
                                htmlFor={column.id} 
                                className="text-sm cursor-pointer truncate"
                                title={column.label}
                              >
                                {column.label}
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

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] border rounded-md">
              <div className="min-w-max">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectedColumnConfigs.map(column => (
                        <TableHead 
                          key={column.id} 
                          className="whitespace-nowrap text-xs font-medium"
                        >
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.length === 0 ? (
                      <TableRow>
                        <TableCell 
                          colSpan={selectedColumnConfigs.length || 1} 
                          className="text-center text-muted-foreground"
                        >
                          Sem dados para exibir
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewData.map((row, idx) => (
                        <TableRow key={idx}>
                          {selectedColumnConfigs.map(column => (
                            <TableCell 
                              key={column.id} 
                              className="whitespace-nowrap text-xs"
                            >
                              {formatEFDValue(row[column.id], column.id)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-2">
              Exibindo {previewData.length} de {data.length} registros
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedColumns.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar ({data.length} registros)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
