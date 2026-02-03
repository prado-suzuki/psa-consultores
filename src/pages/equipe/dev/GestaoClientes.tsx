import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Filter, Search, Eraser, Users, ChevronLeft, ChevronRight, Building2, X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  // Estados do modal de criar/editar cliente
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    nome: '',
    telefone: '',
    setor_cliente: '',
    fixo: '',
    ativo: true,
    municipio: '',
    uf: '',
  });

  // Estados do modal de criar contribuinte
  const [contribuinteDialogOpen, setContribuinteDialogOpen] = useState(false);
  const [savingContribuinte, setSavingContribuinte] = useState(false);
  const [contribuinteForm, setContribuinteForm] = useState({
    nome_razao_social: '',
    tipo_pessoa: '',
    cpf_cnpj: '',
    inscricao_estadual: '',
    cod_cnae: '',
    setor: '',
    simples_nacional: false,
  });

  const queryClient = useQueryClient();

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

  // Abrir modal de novo cliente
  const handleNovoCliente = () => {
    setClienteForm({
      nome: '',
      telefone: '',
      setor_cliente: '',
      fixo: '',
      ativo: true,
      municipio: '',
      uf: '',
    });
    setClienteDialogOpen(true);
  };

  // Salvar cliente
  const handleSaveCliente = async () => {
    if (!clienteForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    setSavingCliente(true);
    try {
      const payload = {
        nome: clienteForm.nome.trim(),
        telefone: clienteForm.telefone.trim() || null,
        setor_cliente: clienteForm.setor_cliente.trim() || null,
        fixo: clienteForm.fixo || null,
        ativo: clienteForm.ativo,
        municipio: clienteForm.municipio.trim() || null,
        uf: clienteForm.uf.trim() || null,
      };
      
      const { error } = await supabase.from(clienteTable).insert(payload);
      if (error) throw error;
      
      toast.success('Cliente criado com sucesso');
      setClienteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['clientes-lista'] });
      queryClient.invalidateQueries({ queryKey: ['clientes-filtrados'] });
    } catch (error: any) {
      toast.error('Erro ao criar cliente: ' + error.message);
    } finally {
      setSavingCliente(false);
    }
  };

  // Abrir modal de novo contribuinte
  const handleNovoContribuinte = () => {
    setContribuinteForm({
      nome_razao_social: '',
      tipo_pessoa: '',
      cpf_cnpj: '',
      inscricao_estadual: '',
      cod_cnae: '',
      setor: '',
      simples_nacional: false,
    });
    setContribuinteDialogOpen(true);
  };

  // Salvar contribuinte
  const handleSaveContribuinte = async () => {
    if (!contribuinteForm.nome_razao_social.trim() || !contribuinteForm.tipo_pessoa) {
      toast.error('Nome/Razão Social e Tipo Pessoa são obrigatórios');
      return;
    }
    
    if (!selectedCliente?.id) {
      toast.error('Nenhum cliente selecionado');
      return;
    }
    
    setSavingContribuinte(true);
    try {
      const { error } = await supabase.from(contribuinteTable).insert({
        cliente_id: selectedCliente.id,
        nome_razao_social: contribuinteForm.nome_razao_social.trim(),
        tipo_pessoa: contribuinteForm.tipo_pessoa,
        cpf_cnpj: contribuinteForm.cpf_cnpj.trim() || null,
        inscricao_estadual: contribuinteForm.inscricao_estadual.trim() || null,
        cod_cnae: contribuinteForm.cod_cnae.trim() || null,
        setor: contribuinteForm.setor.trim() || null,
        simples_nacional: contribuinteForm.simples_nacional,
      });
      
      if (error) throw error;
      
      toast.success('Contribuinte adicionado com sucesso');
      setContribuinteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['contribuintes-modal', contribuinteTable, selectedCliente.id] });
      queryClient.invalidateQueries({ queryKey: ['contribuintes-por-cliente'] });
    } catch (error: any) {
      toast.error('Erro ao adicionar contribuinte: ' + error.message);
    } finally {
      setSavingContribuinte(false);
    }
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
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Filter className="h-5 w-5 text-teal-600" />
                <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
              </CardTitle>
              <Button onClick={handleNovoCliente} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
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
                          <TableHead className="text-base font-semibold">Nome Cliente</TableHead>
                          <TableHead className="text-base font-semibold">Status</TableHead>
                          <TableHead className="text-base font-semibold">Tipo Cliente</TableHead>
                          <TableHead className="text-base font-semibold">Telefone</TableHead>
                          <TableHead className="text-base font-semibold">Setor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedResults.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell 
                              className="text-base font-medium text-primary cursor-pointer hover:underline"
                              onClick={() => handleClienteClick({ id: row.id, nome: row.nome || '-' })}
                            >
                              {row.nome || '-'}
                            </TableCell>
                            <TableCell className="text-base">{formatStatus(row.ativo)}</TableCell>
                            <TableCell className="text-base">{formatTipo(row.fixo)}</TableCell>
                            <TableCell className="text-base">{row.telefone || '-'}</TableCell>
                            <TableCell className="text-base">{row.setor_cliente || '-'}</TableCell>
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
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleNovoContribuinte}
                className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                Contribuinte
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(false)}
                className="h-9 w-9 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
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

      {/* Modal de Criar Cliente */}
      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              Novo Cliente
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={clienteForm.nome}
                onChange={(e) => setClienteForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={clienteForm.telefone}
                  onChange={(e) => setClienteForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="setor">Setor</Label>
                <Input
                  id="setor"
                  value={clienteForm.setor_cliente}
                  onChange={(e) => setClienteForm(f => ({ ...f, setor_cliente: e.target.value }))}
                  placeholder="Setor do cliente"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={clienteForm.fixo} onValueChange={(v) => setClienteForm(f => ({ ...f, fixo: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sim">Fixo</SelectItem>
                    <SelectItem value="Não">Pontual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={clienteForm.ativo}
                    onCheckedChange={(checked) => setClienteForm(f => ({ ...f, ativo: checked }))}
                  />
                  <span className="text-sm">{clienteForm.ativo ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="municipio">Município</Label>
                <Input
                  id="municipio"
                  value={clienteForm.municipio}
                  onChange={(e) => setClienteForm(f => ({ ...f, municipio: e.target.value }))}
                  placeholder="Município"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uf">UF</Label>
                <Input
                  id="uf"
                  value={clienteForm.uf}
                  onChange={(e) => setClienteForm(f => ({ ...f, uf: e.target.value }))}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setClienteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCliente} disabled={savingCliente} className="bg-teal-600 hover:bg-teal-700">
              {savingCliente && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Criar Contribuinte */}
      <Dialog open={contribuinteDialogOpen} onOpenChange={setContribuinteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Novo Contribuinte
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome_razao">Nome/Razão Social *</Label>
              <Input
                id="nome_razao"
                value={contribuinteForm.nome_razao_social}
                onChange={(e) => setContribuinteForm(f => ({ ...f, nome_razao_social: e.target.value }))}
                placeholder="Nome ou Razão Social"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo Pessoa *</Label>
                <Select 
                  value={contribuinteForm.tipo_pessoa} 
                  onValueChange={(v) => setContribuinteForm(f => ({ ...f, tipo_pessoa: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input
                  id="cpf_cnpj"
                  value={contribuinteForm.cpf_cnpj}
                  onChange={(e) => setContribuinteForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input
                  id="ie"
                  value={contribuinteForm.inscricao_estadual}
                  onChange={(e) => setContribuinteForm(f => ({ ...f, inscricao_estadual: e.target.value }))}
                  placeholder="Inscrição Estadual"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnae">Código CNAE</Label>
                <Input
                  id="cnae"
                  value={contribuinteForm.cod_cnae}
                  onChange={(e) => setContribuinteForm(f => ({ ...f, cod_cnae: e.target.value }))}
                  placeholder="Código CNAE"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="setor_contrib">Setor</Label>
                <Input
                  id="setor_contrib"
                  value={contribuinteForm.setor}
                  onChange={(e) => setContribuinteForm(f => ({ ...f, setor: e.target.value }))}
                  placeholder="Setor"
                />
              </div>
              <div className="grid gap-2">
                <Label>Simples Nacional</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    checked={contribuinteForm.simples_nacional}
                    onCheckedChange={(checked) => setContribuinteForm(f => ({ ...f, simples_nacional: !!checked }))}
                  />
                  <span className="text-sm">Optante do Simples Nacional</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setContribuinteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveContribuinte} disabled={savingContribuinte} className="bg-teal-600 hover:bg-teal-700">
              {savingContribuinte && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DevLayout>
  );
};

export default GestaoClientes;
