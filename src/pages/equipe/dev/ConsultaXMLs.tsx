import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { supabase } from '@/integrations/supabase/client';
import { useApiAuth } from '@/hooks/useApiAuth';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search, FileText, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NFeProduto {
  nItem: number;
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  vProd: number;
  ICMS: {
    CST: string;
    vBC: number;
    pICMS: number;
    vICMS: number;
  };
  IPI: {
    vIPI: number;
    CST: number;
  };
}

interface NFeEmit {
  CNPJ: string;
  xNome: string;
  IE: string;
  UF: string;
}

interface NFeDest {
  CNPJ: string;
  xNome: string;
  IE: string;
  UF: string;
}

interface NFeRecord {
  chave_nfe: string;
  cUF: number;
  natOp: string;
  mod: string;
  serie: number;
  nNF: string;
  dhEmi: string | null;
  tpNF: number;
  emit: NFeEmit;
  dest: NFeDest;
  produtos: NFeProduto[];
  ICMSTot: {
    vICMS: number;
    vICMSST: number;
  };
  infAdic: {
    infAdFisco: string | null;
    infCpl: string | null;
  };
}

interface ApiResponse {
  items: NFeRecord[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

interface Contribuinte {
  id: string;
  nome_razao_social: string;
  cpf_cnpj: string | null;
}

const ITEMS_PER_PAGE = 10;

const ConsultaXMLs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContribuinte, setSelectedContribuinte] = useState('');
  const [dataInicio, setDataInicio] = useState('2024-01-01');
  const [dataFim, setDataFim] = useState('2026-01-31');
  const [tipoDocumento, setTipoDocumento] = useState<'nfe' | 'cte' | 'todos'>('nfe');
  const [isExporting, setIsExporting] = useState(false);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const { fetchWithAuth } = useApiAuth();
  const navigate = useNavigate();

  // Buscar lista de contribuintes
  const { data: contribuintes, isLoading: loadingContribuintes, error: errorContribuintes } = useQuery({
    queryKey: ['contribuintes-list'],
    queryFn: async () => {
      // Verificar se usuário está autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social, cpf_cnpj')
        .order('nome_razao_social');
      
      if (error) {
        console.error('Erro ao buscar contribuintes:', error);
        if (error.message.includes('JWT')) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        throw new Error(`Erro ao carregar contribuintes: ${error.message}`);
      }
      
      return data as Contribuinte[];
    },
    retry: (failureCount, error) => {
      if ((error as Error).message.includes('Sessão expirada')) return false;
      return failureCount < 2;
    },
  });

  // Buscar documentos da API (NFe, CTe ou ambos)
  const { data: nfeData, isLoading, error, refetch } = useQuery({
    queryKey: ['documentos', selectedContribuinte, dataInicio, dataFim, tipoDocumento, currentPage],
    queryFn: async () => {
      if (!selectedContribuinte) return null;

      // CTe ainda não está disponível na API
      if (tipoDocumento === 'cte') {
        return { items: [], total: 0, page: 1, page_size: ITEMS_PER_PAGE, has_more: false } as ApiResponse;
      }

      const baseUrl = 'https://psa-backend-api-456879351254.southamerica-east1.run.app/api/v1/query/contribuintes';
      const queryParams = `?data_inicio=${dataInicio}&data_fim=${dataFim}&page=${currentPage}&page_size=${ITEMS_PER_PAGE}`;

      // Por enquanto, "todos" busca apenas NFe (CTe será adicionado quando a API estiver pronta)
      const url = `${baseUrl}/${selectedContribuinte}/nfes${queryParams}`;
      
      const response = await fetchWithAuth(url, { method: 'GET' });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      return response.json() as Promise<ApiResponse>;
    },
    enabled: searchTriggered && !!selectedContribuinte,
    retry: (failureCount, error) => {
      if ((error as Error).message === 'Sessão expirada') return false;
      return failureCount < 2;
    },
  });

  const records = nfeData?.items || [];
  const totalRecords = nfeData?.total || 0;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  const formatCNPJ = (cnpj: string) => {
    if (!cnpj) return '-';
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
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

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchTriggered(true);
    // Se já foi triggered antes, forçar refetch
    if (searchTriggered) {
      refetch();
    }
  };

  const handleExportCSV = async () => {
    if (!selectedContribuinte) return;

    setIsExporting(true);
    try {
      const url = `https://psa-backend-api-456879351254.southamerica-east1.run.app/api/v1/query/export/${selectedContribuinte}/nfe/csv`;
      
      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify({
          data_inicio: dataInicio,
          data_fim: dataFim,
          colunas: [
            'chave_nfe',
            'dEmi',
            'emit.CNPJ',
            'emit.xNome',
            'dest.xNome',
            'produtos.xProd',
            'produtos.vProd'
          ]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na exportação: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `nfe_export_${dataInicio}_${dataFim}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Exportação concluída",
        description: "O arquivo CSV foi baixado com sucesso.",
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      if (errorMessage !== 'Sessão expirada') {
        toast({
          title: "Erro ao exportar",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DevLayout 
      title="Consulta de XMLs" 
      subtitle="Busque e visualize documentos fiscais"
    >
      <div className="w-full min-w-0 max-w-full overflow-hidden space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Contribuinte</label>
                {errorContribuintes ? (
                  <div className="text-destructive text-sm p-3 border border-destructive/50 rounded-md bg-destructive/10">
                    {(errorContribuintes as Error).message}
                    <Button 
                      variant="link" 
                      className="text-destructive p-0 h-auto ml-2"
                      onClick={() => navigate('/equipe')}
                    >
                      Fazer login novamente
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedContribuinte} onValueChange={(value) => {
                    setSelectedContribuinte(value);
                    setSearchTriggered(false);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingContribuintes ? "Carregando..." : "Selecione um contribuinte"} />
                    </SelectTrigger>
                    <SelectContent>
                      {contribuintes?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_razao_social} {c.cpf_cnpj ? `(${formatCNPJ(c.cpf_cnpj)})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Tipo</label>
                <Select value={tipoDocumento} onValueChange={(value: 'nfe' | 'cte' | 'todos') => {
                  setTipoDocumento(value);
                  setSearchTriggered(false);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nfe">NFe</SelectItem>
                    <SelectItem value="cte">
                      <span className="flex items-center gap-2">
                        CTe <Badge variant="secondary" className="text-xs">Em breve</Badge>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setSearchTriggered(false);
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setSearchTriggered(false);
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  className="flex-1" 
                  onClick={handleSearch}
                  disabled={!selectedContribuinte || isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                  Buscar
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={!selectedContribuinte || isExporting}
                >
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {totalRecords} registro(s) encontrado(s)
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!searchTriggered ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione os filtros e clique em "Buscar" para visualizar os documentos fiscais
              </div>
            ) : !selectedContribuinte ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione um contribuinte para buscar os documentos fiscais
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <p className="text-destructive text-center max-w-md">
                  {(error as Error).message}
                </p>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[1100px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Chave NFe</TableHead>
                        <TableHead className="whitespace-nowrap">CNPJ Emitente</TableHead>
                        <TableHead className="whitespace-nowrap">Razão Social</TableHead>
                        <TableHead className="whitespace-nowrap hidden xl:table-cell">IE</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">UF</TableHead>
                        <TableHead className="whitespace-nowrap hidden xl:table-cell">Nat. Operação</TableHead>
                        <TableHead className="whitespace-nowrap">Tipo</TableHead>
                        <TableHead className="whitespace-nowrap">Número</TableHead>
                        <TableHead className="whitespace-nowrap">Data Emissão</TableHead>
                        <TableHead className="whitespace-nowrap text-right">Valor</TableHead>
                        <TableHead className="whitespace-nowrap">Produtos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((record) => (
                          <TableRow key={record.chave_nfe}>
                            <TableCell className="font-mono text-xs max-w-[180px]">
                              <span className="truncate block" title={record.chave_nfe}>
                                {record.chave_nfe.slice(0, 20)}...
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm whitespace-nowrap">
                              {formatCNPJ(record.emit.CNPJ)}
                            </TableCell>
                            <TableCell className="max-w-[150px]">
                              <span className="truncate block" title={record.emit.xNome}>
                                {record.emit.xNome}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-sm hidden xl:table-cell">{record.emit.IE}</TableCell>
                            <TableCell className="hidden lg:table-cell">{record.emit.UF}</TableCell>
                            <TableCell className="max-w-[120px] hidden xl:table-cell">
                              <span className="truncate block" title={record.natOp}>
                                {record.natOp}
                              </span>
                            </TableCell>
                            <TableCell>{getTipoBadge(record.mod === '55' ? 'NFe' : 'NFSe')}</TableCell>
                            <TableCell className="font-mono">{record.nNF}</TableCell>
                            <TableCell className="whitespace-nowrap">{formatDate(record.dhEmi)}</TableCell>
                            <TableCell className="text-right font-medium whitespace-nowrap">
                              {formatCurrency(record.produtos.reduce((sum, p) => sum + p.vProd, 0))}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.produtos.length} item(s)</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t">
                    <span className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || isLoading}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || isLoading}
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
      </div>
    </DevLayout>
  );
};

export default ConsultaXMLs;
