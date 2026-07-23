import { useRef, useState, type ChangeEvent } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import type { SpreadsheetRow } from '@/components/equipe/projetos/types';

interface ProjectImportDialogProps {
  onImport: (rows: SpreadsheetRow[], onImported: () => void) => Promise<void>;
}

export const ProjectImportDialog = ({ onImport }: ProjectImportDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<SpreadsheetRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const workbook = XLSX.read(readerEvent.target?.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet);
        setRows(data);
        setOpen(true);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ler o arquivo.',
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (rows.length === 0) return;

    setImporting(true);
    try {
      await onImport(rows, () => {
        setOpen(false);
        setRows([]);
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
        <Upload className="h-4 w-4 mr-2" />
        Importar CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Projetos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>{rows.length}</strong> projetos encontrados no arquivo. Verifique os dados
                abaixo antes de confirmar a importação.
              </p>
            </div>

            {rows.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {(row.name || row.Nome || row.nome || '-') as string}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {(row.description || row.Descricao || row.Descrição || '-') as string}
                        </TableCell>
                        <TableCell>
                          {(row.client_name || row.Cliente || row.cliente || '-') as string}
                        </TableCell>
                        <TableCell>{(row.status || row.Status || 'active') as string}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 10 && (
                  <div className="p-2 text-center text-sm text-muted-foreground border-t">
                    ... e mais {rows.length - 10} projetos
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setRows([]);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing || rows.length === 0}>
                {importing ? 'Importando...' : `Importar ${rows.length} Projetos`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
