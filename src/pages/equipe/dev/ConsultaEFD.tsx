import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { useEFDOverview, useEFDDetail } from '@/hooks/useEFDData';
import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import { generateColumnsFromData, formatEFDValue } from '@/constants/efdConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText,
  ArrowLeft,
  Search,
  Info,
  FileSpreadsheet,
  Calendar,
  Building2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { EFDViewMode, EFDArquivo, BlocoRegistro } from '@/types/efd';

const ConsultaEFD = () => {
  // Estados de visualização
  const [viewMode, setViewMode] = useState<EFDViewMode>('lista');
  const [selectedArquivo, setSelectedArquivo] = useState<EFDArquivo | null>(null);
  const [selectedBloco, setSelectedBloco] = useState<string>('');
  const [selectedRegistro, setSelectedRegistro] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Hooks de dados
  const { 
    data: overview, 
    isLoading: loadingOverview, 
    error: errorOverview,
    refetch: refetchOverview 
  } = useEFDOverview();

  const { 
    data: detail, 
    isLoading: loadingDetail, 
    error: errorDetail 
  } = useEFDDetail(
    selectedArquivo?.id_arquivo,
    selectedRegistro
  );

  // Quando overview carregar, selecionar primeiro bloco
  useEffect(() => {
    if (overview?.blocos_disponiveis) {
      const blocos = Object.keys(overview.blocos_disponiveis);
      if (blocos.length > 0 && !selectedBloco) {
        setSelectedBloco(blocos[0]);
      }
    }
  }, [overview, selectedBloco]);

  // Quando bloco mudar, selecionar primeiro registro
  useEffect(() => {
    if (selectedBloco && overview?.blocos_disponiveis[selectedBloco]) {
      const registros = overview.blocos_disponiveis[selectedBloco];
      if (registros.length > 0) {
        setSelectedRegistro(registros[0].codigo);
        setActiveTab(registros[0].codigo);
      }
    }
  }, [selectedBloco, overview]);

  // Gerar colunas dinâmicas a partir dos dados
  const dynamicColumns = useMemo(() => {
    if (!detail?.dados || detail.dados.length === 0) return [];
    return generateColumnsFromData(detail.dados);
  }, [detail]);

  // Filtrar dados com busca
  const filteredData = useMemo(() => {
    if (!detail?.dados) return [];
    if (!searchTerm) return detail.dados;
    
    const term = searchTerm.toLowerCase();
    return detail.dados.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(term)
      )
    );
  }, [detail, searchTerm]);

  // Handler para analisar arquivo
  const handleAnalisar = (arquivo: EFDArquivo) => {
    setSelectedArquivo(arquivo);
    setViewMode('analise');
  };

  // Handler para voltar à lista
  const handleVoltar = () => {
    setViewMode('lista');
    setSelectedArquivo(null);
    setSearchTerm('');
  };

  // Formatar CNPJ
  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  };

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Exibir erro se houver
  useEffect(() => {
    if (errorOverview) {
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os arquivos EFD. Verifique se o arquivo JSON está no bucket.',
        variant: 'destructive',
      });
    }
  }, [errorOverview]);

  // Blocos disponíveis
  const blocosDisponiveis = overview?.blocos_disponiveis 
    ? Object.keys(overview.blocos_disponiveis) 
    : [];

  // Registros do bloco selecionado
  const registrosBloco = selectedBloco && overview?.blocos_disponiveis[selectedBloco]
    ? overview.blocos_disponiveis[selectedBloco]
    : [];

  return (
    <DevLayout 
      title="Consulta EFD Contribuições" 
      subtitle="Análise de arquivos SPED Contribuições"
      headerActions={
        viewMode === 'analise' && (
          <Button variant="outline" size="sm" onClick={handleVoltar}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Lista
          </Button>
        )
      }
    >
      {viewMode === 'lista' ? (
        <div className="space-y-6">
          {/* Card de Filtros */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Arquivos EFD Contribuições
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtro de Blocos */}
              <div className="flex flex-wrap gap-4 items-end mb-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                    Bloco
                  </label>
                  <Select value={selectedBloco} onValueChange={setSelectedBloco}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um bloco" />
                    </SelectTrigger>
                    <SelectContent>
                      {blocosDisponiveis.map(bloco => (
                        <SelectItem key={bloco} value={bloco}>
                          Bloco {bloco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                    Registro
                  </label>
                  <Select 
                    value={selectedRegistro} 
                    onValueChange={setSelectedRegistro}
                    disabled={registrosBloco.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um registro" />
                    </SelectTrigger>
                    <SelectContent>
                      {registrosBloco.map(reg => (
                        <SelectItem key={reg.codigo} value={reg.codigo}>
                          {reg.codigo} - {reg.descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => refetchOverview()}
                  disabled={loadingOverview}
                >
                  {loadingOverview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* CNPJ Info */}
              {overview?.cnpj && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Building2 className="h-4 w-4" />
                  <span>CNPJ: {formatCNPJ(overview.cnpj)}</span>
                </div>
              )}

              {/* Tabela de Arquivos */}
              {loadingOverview ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : overview?.arquivos && overview.arquivos.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Arquivo</TableHead>
                        <TableHead className="font-semibold">Período</TableHead>
                        <TableHead className="font-semibold">Tipo</TableHead>
                        <TableHead className="font-semibold text-right">PIS Devido</TableHead>
                        <TableHead className="font-semibold text-right">COFINS Devido</TableHead>
                        <TableHead className="font-semibold text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {overview.arquivos.map((arquivo) => (
                        <TableRow key={arquivo.id_arquivo} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{arquivo.identificacao.NOME}</p>
                                <p className="text-xs text-muted-foreground">{arquivo.id_arquivo}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {arquivo.identificacao.DT_INI} a {arquivo.identificacao.DT_FIN}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={arquivo.identificacao.TIPO_ESCRIT === '0' ? 'default' : 'secondary'}>
                              {arquivo.identificacao.TIPO_ESCRIT === '0' ? 'Original' : 'Retificadora'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(arquivo.totais.pis_devido)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(arquivo.totais.cofins_devido)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleAnalisar(arquivo)}
                            >
                              Analisar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum arquivo encontrado</p>
                  <p className="text-sm mt-1">Verifique se o arquivo EFD_CONTRIBUICOES_N1.json está no bucket.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header da Análise */}
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedArquivo?.identificacao.NOME}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Período: {selectedArquivo?.identificacao.DT_INI} a {selectedArquivo?.identificacao.DT_FIN}
                    <Badge variant="outline" className="ml-2">
                      {selectedArquivo?.identificacao.TIPO_ESCRIT === '0' ? 'Original' : 'Retificadora'}
                    </Badge>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nos dados..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-[220px]"
                    />
                  </div>
                  
                  <EFDExportDialog
                    data={filteredData}
                    registro={selectedRegistro}
                    idArquivo={selectedArquivo?.id_arquivo || ''}
                    disabled={loadingDetail || filteredData.length === 0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs de Registros e Grid */}
          <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* Footer Tabs (abas de registros) */}
              <div className="border-b bg-muted/30">
                <ScrollArea className="w-full">
                  <TabsList className="h-10 bg-transparent p-0 justify-start">
                    {registrosBloco.map(reg => (
                      <TabsTrigger
                        key={reg.codigo}
                        value={reg.codigo}
                        className="data-[state=active]:bg-background rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4"
                        onClick={() => setSelectedRegistro(reg.codigo)}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{reg.codigo}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{reg.descricao}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>

              {/* Conteúdo da Tab */}
              <TabsContent value={activeTab} className="m-0">
                <CardContent className="p-0">
                  {loadingDetail ? (
                    <div className="p-6 space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : errorDetail ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <Info className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Erro ao carregar detalhes</p>
                      <p className="text-sm mt-1">Verifique se o arquivo EFD_CONTRIBUICOES_N2.json está no bucket.</p>
                    </div>
                  ) : filteredData.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">Nenhum registro encontrado</p>
                      {searchTerm && (
                        <p className="text-sm mt-1">Tente ajustar o termo de busca.</p>
                      )}
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px]">
                      <div className="min-w-max">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              {dynamicColumns.map(col => (
                                <TableHead 
                                  key={col.id} 
                                  className="whitespace-nowrap text-xs font-semibold"
                                >
                                  {col.label}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.map((row, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/30">
                                {dynamicColumns.map(col => (
                                  <TableCell 
                                    key={col.id} 
                                    className="whitespace-nowrap text-xs py-2"
                                  >
                                    {formatEFDValue(row[col.id], col.id)}
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

                  {/* Footer com info de paginação */}
                  {detail?.paginacao && (
                    <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex justify-between">
                      <span>
                        Exibindo {filteredData.length} de {detail.paginacao.total_registros} registros
                      </span>
                      <span>
                        Página {detail.paginacao.page}
                      </span>
                    </div>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      )}
    </DevLayout>
  );
};

export default ConsultaEFD;
