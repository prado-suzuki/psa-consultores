import type { ChangeEvent, RefObject } from 'react';
import { FileSpreadsheet, Plus, Upload } from 'lucide-react';
import type { EquipeProcessosSpreadsheetRow } from '@/lib/equipeProcessos';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProcessToolbarProps {
  fileInputRef: RefObject<HTMLInputElement>;
  importData: EquipeProcessosSpreadsheetRow[];
  importing: boolean;
  isImportDialogOpen: boolean;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onImportDialogOpenChange: (open: boolean) => void;
  onCancelImport: () => void;
  onCreate: () => void;
}

export function ProcessToolbar({
  fileInputRef,
  importData,
  importing,
  isImportDialogOpen,
  onFileSelect,
  onImport,
  onImportDialogOpenChange,
  onCancelImport,
  onCreate,
}: ProcessToolbarProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={onFileSelect}
      />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Importar CSV
      </Button>
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4 mr-2" />
        Novo Processo
      </Button>

      <Dialog open={isImportDialogOpen} onOpenChange={onImportDialogOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Processos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{importData.length}</strong> processos encontrados no arquivo. Verifique os
                dados abaixo antes de confirmar a importação.
              </p>
            </div>
            {importData.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Prioridade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {row.name || row.Nome || row.nome || '-'}
                        </TableCell>
                        <TableCell>{row.area || row.Area || row.área || '-'}</TableCell>
                        <TableCell>
                          {row.stage || row.Stage || row.fase || row.Fase || 'discovery'}
                        </TableCell>
                        <TableCell>
                          {row.priority || row.Prioridade || row.prioridade || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {importData.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... e mais {importData.length - 10} processos
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={onCancelImport}>
                Cancelar
              </Button>
              <Button onClick={onImport} disabled={importing || importData.length === 0}>
                {importing ? 'Importando...' : `Importar ${importData.length} Processos`}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
