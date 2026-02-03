import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Filter, Search, Eraser, Users, ChevronLeft, ChevronRight, Building2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';

const ITEMS_PER_PAGE = 10;
const MODAL_ITEMS_PER_PAGE = 10;

// Formatadores
const formatCpfCnpj = (value: string | null) => {
  if (!value) return '-';
  const clean = value.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
};

const formatSimples = (value: boolean | null) => {
  if (value === null || value === undefined) return '-';
  return value ? 'Sim' : 'Não';
};

const GestaoClientes = () => {
  // Estados do cliente
  const [clienteId, setClienteId] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [searched, setSearched] = useState(false);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Estados do contribuinte (apenas para filtrar)
  const [tipoPessoa, setTipoPessoa] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');

  // Estados do modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nome: string } | null>(null);
  const [modalPage, setModalPage] = useState(1);

  // Verifica se há filtros ativos
  const hasActiveFilters = clienteId || status || tipo || nomeRazaoSocial || tipoPessoa || cpfCnpj;

  // Verifica se há filtros de contribuinte ativos
  const hasContribuinteFilters = nomeRazaoSocial || tipoPessoa || cpfCnpj;

  // Query para lista de clientes (id + nome)
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-lista', clienteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select('id, nome')
        .not('nome', 'is', null)
        .order('nome');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query para contribuintes - filtrado por cliente_id quando selecionado
  const { data: contribuintes = [] } = useQuery({
    queryKey: ['contribuintes-por-cliente', contribuinteTable, clienteId],
    queryFn: async () => {
      let query = supabase
        .from(contribuinteTable)
        .select('id, nome_razao_social, cliente_id')
        .not('nome_razao_social', 'is', null)
        .order('nome_razao_social');
      
      // Filtrar por cliente_id se um cliente específico estiver selecionado
      if (clienteId && clienteId !== '__todos__') {
        query = query.eq('cliente_id', clienteId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Retornar lista única de nomes
      const uniqueContribuintes = [...new Map(data?.map(d => [d.nome_razao_social, d]) || []).values()];
      return uniqueContribuintes;
    },
  });

  // Limpar contribuinte quando cliente mudar
  useEffect(() => {
    setNomeRazaoSocial('');
  }, [clienteId]);

  // Query principal - busca clientes (não contribuintes)
  const { data: resultados = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-filtrados', clienteTable, clienteId, status, tipo, tipoPessoa, cpfCnpj, nomeRazaoSocial],
    queryFn: async () => {
      // Se houver filtros de contribuinte, primeiro buscar cliente_ids correspondentes
      let filteredClienteIds: string[] | null = null;
      
      if (hasContribuinteFilters) {
        let contribuinteQuery = supabase
          .from(contribuinteTable)
          .select('cliente_id');
        
        if (tipoPessoa) contribuinteQuery = contribuinteQuery.eq('tipo_pessoa', tipoPessoa);
        if (cpfCnpj) contribuinteQuery = contribuinteQuery.ilike('cpf_cnpj', `%${cpfCnpj}%`);
        if (nomeRazaoSocial) contribuinteQuery = contribuinteQuery.eq('nome_razao_social', nomeRazaoSocial);

        const { data: contribData, error: contribError } = await contribuinteQuery;
        if (contribError) throw contribError;
        
        // Extrair cliente_ids únicos
        filteredClienteIds = [...new Set(contribData?.map(c => c.cliente_id))] as string[];
        
        // Se não houver contribuintes correspondentes, retornar vazio
        if (filteredClienteIds.length === 0) return [];
      }

      // Buscar clientes
      let clienteQuery = supabase
        .from(clienteTable)
        .select('*');
      
      // Filtro direto por cliente_id
      if (clienteId && clienteId !== '__todos__') {
        clienteQuery = clienteQuery.eq('id', clienteId);
      }
      
      if (status) clienteQuery = clienteQuery.eq('ativo', status === 'true');
      if (tipo) clienteQuery = clienteQuery.eq('fixo', tipo);
      
      // Filtrar por cliente_ids (se houver filtros de contribuinte)
      if (filteredClienteIds !== null) {
        clienteQuery = clienteQuery.in('id', filteredClienteIds);
      }

      const { data, error } = await clienteQuery.order('nome');
      if (error) throw error;

      return data || [];
    },
    enabled: searched,
  });

  // Query para contribuintes do modal
  const { data: contribuintesModal = [], isLoading: loadingModal } = useQuery({
    queryKey: ['contribuintes-modal', contribuinteTable, selectedCliente?.id],
    queryFn: async () => {
      if (!selectedCliente?.id) return [];
      
      const { data, error } = await supabase
        .from(contribuinteTable)
        .select('*')
        .eq('cliente_id', selectedCliente.id)
        .order('nome_razao_social');
      
      if (error) throw error;
      return data || [];
    },
    enabled: modalOpen && !!selectedCliente?.id,
  });

  // Reset página quando buscar novamente
  useEffect(() => {
    setCurrentPage(1);
  }, [resultados]);

  // Paginação da tabela principal
  const totalPages = Math.ceil(resultados.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    return resultados.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [resultados, currentPage]);

  // Paginação do modal
  const modalTotalPages = Math.ceil(contribuintesModal.length / MODAL_ITEMS_PER_PAGE);
  const paginatedContribuintes = useMemo(() => {
    return contribuintesModal.slice(
      (modalPage - 1) * MODAL_ITEMS_PER_PAGE,
      modalPage * MODAL_ITEMS_PER_PAGE
    );
  }, [contribuintesModal, modalPage]);

  const handleSearch = () => {
    setSearched(true);
    setCurrentPage(1);
    refetch();
  };

  const handleClear = () => {
    // Limpar filtros do cliente
    setClienteId('');
    setStatus('');
    setTipo('');
    // Limpar filtros do contribuinte
    setTipoPessoa('');
    setCpfCnpj('');
    setNomeRazaoSocial('');
    setSearched(false);
    setCurrentPage(1);
  };

  const handleClienteClick = (cliente: { id: string; nome: string }) => {
    setSelectedCliente(cliente);
    setModalOpen(true);
    setModalPage(1);
  };

  const formatStatus = (ativo: boolean | null) => {
    if (ativo === null || ativo === undefined) return '-';
    return ativo ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inativo</Badge>
    );
  };

  const formatTipo = (fixo: string | null) => {
    if (!fixo) return '-';
    return fixo === 'Sim' ? 'Fixo' : fixo === 'Não' ? 'Pontual' : '-';
  };

  return (
    <DevLayout title="Gestão de Clientes" subtitle="Consulta e filtros de clientes">
      <div className="space-y-6">
        {/* Card de Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Filter className="h-5 w-5 text-teal-600" />
              <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* LINHA ÚNICA - Todos os Filtros */}
            <div className="grid grid-cols-12 gap-6">
              {/* Cliente - 3 colunas */}
              <div className="col-span-12 md:col-span-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">Cliente</label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="__todos__">Todos os Clientes</SelectItem>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contribuinte - 5 colunas */}
              <div className="col-span-12 md:col-span-5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">Contribuinte</label>
                <Select value={nomeRazaoSocial} onValueChange={setNomeRazaoSocial}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {contribuintes.map((c) => (
                      <SelectItem key={c.id} value={c.nome_razao_social}>{c.nome_razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">Tipo</label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="Sim">Fixos</SelectItem>
                    <SelectItem value="Não">Pontuais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões - Ambos à direita */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {hasActiveFilters && (
                <Button onClick={handleClear} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                  <Eraser className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
              <Button onClick={handleSearch} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card de Resultados */}
        {searched && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-teal-600" />
                Resultados
                <span className="text-sm font-normal text-slate-500">
                  ({resultados.length} cliente{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : resultados.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum cliente encontrado com os filtros selecionados.
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome Cliente</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Tipo Cliente</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Setor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedResults.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell 
                              className="font-medium text-primary cursor-pointer hover:underline"
                              onClick={() => handleClienteClick({ id: row.id, nome: row.nome || '-' })}
                            >
                              {row.nome || '-'}
                            </TableCell>
                            <TableCell>{formatStatus(row.ativo)}</TableCell>
                            <TableCell>{formatTipo(row.fixo)}</TableCell>
                            <TableCell>{row.telefone || '-'}</TableCell>
                            <TableCell>{row.setor_cliente || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 px-2">
                      <span className="text-xs text-slate-500">
                        Exibindo {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, resultados.length)} de {resultados.length}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          Página {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Contribuintes */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent 
          className={cn(
            "max-w-6xl h-auto max-h-[80vh] p-0",
            "flex flex-col overflow-hidden",
            "[&>button]:hidden"
          )}
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCliente?.nome}
                </h3>
                <p className="text-xs text-slate-500">
                  Contribuintes vinculados
                </p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setModalOpen(false)}
              className="h-9 w-9 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-auto p-6">
            {loadingModal ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : contribuintesModal.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Nenhum contribuinte vinculado a este cliente.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome/Razão Social</TableHead>
                      <TableHead>Tipo Pessoa</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Simples Nacional</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Inscrição Estadual</TableHead>
                      <TableHead>Código CNAE</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedContribuintes.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.nome_razao_social || '-'}</TableCell>
                        <TableCell>{row.tipo_pessoa || '-'}</TableCell>
                        <TableCell>{row.setor || '-'}</TableCell>
                        <TableCell>{formatSimples(row.simples_nacional)}</TableCell>
                        <TableCell className="font-mono text-sm">{formatCpfCnpj(row.cpf_cnpj)}</TableCell>
                        <TableCell>{row.inscricao_estadual || '-'}</TableCell>
                        <TableCell>{row.cod_cnae || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Footer - Paginação */}
          {contribuintesModal.length > 0 && (
            <div className="h-12 px-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-500">
                Exibindo {paginatedContribuintes.length} de {contribuintesModal.length} contribuintes
              </span>
              
              {modalTotalPages > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Página {modalPage} de {modalTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={modalPage === 1 || loadingModal}
                      onClick={() => setModalPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={modalPage === modalTotalPages || loadingModal}
                      onClick={() => setModalPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DevLayout>
  );
};

export default GestaoClientes;
