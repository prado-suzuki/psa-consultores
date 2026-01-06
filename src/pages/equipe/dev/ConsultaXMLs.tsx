import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

interface NFeProduto {
  nItem: number;
  cProd: string;
  xProd: string;
  vProd: number;
}

interface NFeEmit {
  CNPJ: string;
  xNome: string;
  IE: string;
  UF: string;
}

interface NFeRecord {
  chave_nfe: string;
  nNF: string;
  dhEmi: string;
  mod: string;
  natOp: string;
  emit: NFeEmit;
  produtos: NFeProduto[];
}

const ITEMS_PER_PAGE = 10;

const ConsultaXMLs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [cnpjFilter, setCnpjFilter] = useState('');
  const [dataFilter, setDataFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  const { data: mockData, isLoading, error } = useQuery({
    queryKey: ['mock-xmls'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download('mock_response.json');
      
      if (error) throw error;
      
      const text = await data.text();
      return JSON.parse(text) as NFeRecord[];
    },
  });

  const records = mockData || [];
  const totalRecords = records.length;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);
  
  const paginatedRecords = records.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const formatCNPJ = (cnpj: string) => {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      autorizada: 'default',
      cancelada: 'destructive',
      pendente: 'secondary',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      'NFe': 'bg-blue-100 text-blue-800',
      'NFSe': 'bg-green-100 text-green-800',
      'CTe': 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[tipo] || 'bg-gray-100 text-gray-800'}`}>
        {tipo}
      </span>
    );
  };

  return (
    <DevLayout 
      title="Consulta de XMLs" 
      subtitle="Busque e visualize documentos fiscais"
    >
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">CNPJ</label>
              <Input
                placeholder="00.000.000/0000-00"
                value={cnpjFilter}
                onChange={(e) => setCnpjFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Data</label>
              <Input
                type="date"
                value={dataFilter}
                onChange={(e) => setDataFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="NFe">NFe</SelectItem>
                  <SelectItem value="NFSe">NFSe</SelectItem>
                  <SelectItem value="CTe">CTe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
            <span className="text-sm text-gray-500">
              {totalRecords} registro(s) encontrado(s)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Erro ao carregar dados: {(error as Error).message}
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Razão Social</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número</TableHead>
                      <TableHead>Data Emissão</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum registro encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRecords.map((record) => (
                        <TableRow key={record.chave_nfe}>
                          <TableCell className="font-mono text-sm">
                            {record.emit.CNPJ}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={record.emit.xNome}>
                            {record.emit.xNome}
                          </TableCell>
                          <TableCell>{getTipoBadge(record.mod === '55' ? 'NFe' : 'NFSe')}</TableCell>
                          <TableCell className="font-mono">{record.nNF}</TableCell>
                          <TableCell>{formatDate(record.dhEmi)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(record.produtos.reduce((sum, p) => sum + p.vProd, 0))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">Autorizada</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-500">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </DevLayout>
  );
};

export default ConsultaXMLs;
