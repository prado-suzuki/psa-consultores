import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';

// Helper para sincronizar com DW em background (fire-and-forget)
const syncCadastrosToDW = (payload: {
  clientes?: Array<{
    id_cliente: string;
    nome: string;
    fixo: string | null;
    telefone: string | null;
    setor_cliente: string | null;
    municipio: string | null;
    uf: string | null;
    ativo: boolean | null;
    categoria: string | null;
    created_at: string;
    updated_at: string;
  }>;
  contribuintes?: Array<{
    id_contribuinte: string;
    id_cliente: string;
    tipo_pessoa: string;
    cpf_cnpj: string | null;
    nome_razao_social: string;
    inscricao_estadual: string | null;
    cod_cnae: string | null;
    setor: string | null;
    simples_nacional: boolean | null;
    created_at: string;
    updated_at: string;
  }>;
}) => {
  const environment = isProductionEnvironment ? 'production' : 'development';
  
  supabase.functions.invoke('sync-cadastros', {
    body: { ...payload, environment }
  }).then(({ error }) => {
    if (error) {
      console.error('[sync-cadastros] Erro ao invocar:', error.message);
    } else {
      console.log('[sync-cadastros] Sync iniciado em background');
    }
  }).catch(err => {
    console.error('[sync-cadastros] Erro:', err);
  });
};
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
import { Filter, Search, Eraser, Users, ChevronLeft, ChevronRight, Building2, X, Loader2, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import NewClientModal from '@/components/equipe/dev/NewClientModal';

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
  const [categoria, setCategoria] = useState('');
  const [searched, setSearched] = useState(false);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);

  // Estados do contribuinte (apenas para filtrar)
  const [tipoPessoa, setTipoPessoa] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');

  // Estados do modal de detalhes (contribuintes)
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<{ id: string; nome: string } | null>(null);
  const [modalPage, setModalPage] = useState(1);

  // Estados do modal de criar/editar contribuinte
  const [contribuinteDialogOpen, setContribuinteDialogOpen] = useState(false);
  const [editingContribuinteId, setEditingContribuinteId] = useState<string | null>(null);
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

  // Novo modal de cadastro completo (usado para criar e editar)
  const [novoClienteModalOpen, setNovoClienteModalOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Verifica se há filtros ativos
  const hasActiveFilters = clienteId || status || tipo || categoria || nomeRazaoSocial || tipoPessoa || cpfCnpj;

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
      
      if (clienteId && clienteId !== '__todos__') {
        query = query.eq('cliente_id', clienteId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const uniqueContribuintes = [...new Map(data?.map(d => [d.nome_razao_social, d]) || []).values()];
      return uniqueContribuintes;
    },
  });

  // Limpar contribuinte quando cliente mudar
  useEffect(() => {
    setNomeRazaoSocial('');
  }, [clienteId]);

  // Auto-selecionar contribuinte quando há apenas um
  useEffect(() => {
    if (clienteId && clienteId !== '__todos__' && contribuintes && contribuintes.length === 1 && !nomeRazaoSocial) {
      setNomeRazaoSocial(contribuintes[0].nome_razao_social);
    }
  }, [clienteId, contribuintes, nomeRazaoSocial]);

  // Query principal - busca clientes
  const { data: resultados = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-filtrados', clienteTable, clienteId, status, tipo, categoria, tipoPessoa, cpfCnpj, nomeRazaoSocial],
    queryFn: async () => {
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
        
        filteredClienteIds = [...new Set(contribData?.map(c => c.cliente_id))] as string[];
        
        if (filteredClienteIds.length === 0) return [];
      }

      let clienteQuery = supabase
        .from(clienteTable)
        .select('*');
      
      if (clienteId && clienteId !== '__todos__') {
        clienteQuery = clienteQuery.eq('id', clienteId);
      }
      
      if (status) clienteQuery = clienteQuery.eq('ativo', status === 'true');
      if (tipo) clienteQuery = clienteQuery.eq('fixo', tipo);
      if (categoria) clienteQuery = clienteQuery.eq('categoria', categoria);
      
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
    setClienteId('');
    setStatus('');
    setTipo('');
    setCategoria('');
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

  // Abrir modal de editar cliente (usando o modal completo)
  const handleEditCliente = (e: React.MouseEvent, row: any) => {
    e.stopPropagation();
    setEditingClienteId(row.id);
    setNovoClienteModalOpen(true);
  };

  // Abrir modal de novo contribuinte
  const handleNovoContribuinte = () => {
    setEditingContribuinteId(null);
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

  // Abrir modal de editar contribuinte
  const handleEditContribuinte = (e: React.MouseEvent, row: any) => {
    e.stopPropagation();
    setEditingContribuinteId(row.id);
    setContribuinteForm({
      nome_razao_social: row.nome_razao_social || '',
      tipo_pessoa: row.tipo_pessoa || '',
      cpf_cnpj: row.cpf_cnpj || '',
      inscricao_estadual: row.inscricao_estadual || '',
      cod_cnae: row.cod_cnae || '',
      setor: row.setor || '',
      simples_nacional: row.simples_nacional ?? false,
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
      const contribPayload = {
        nome_razao_social: contribuinteForm.nome_razao_social.trim(),
        tipo_pessoa: contribuinteForm.tipo_pessoa,
        cpf_cnpj: contribuinteForm.cpf_cnpj.trim() || null,
        inscricao_estadual: contribuinteForm.inscricao_estadual.trim() || null,
        cod_cnae: contribuinteForm.cod_cnae.trim() || null,
        setor: contribuinteForm.setor.trim() || null,
        simples_nacional: contribuinteForm.simples_nacional,
      };

      let data: any;
      if (editingContribuinteId) {
        const { data: updated, error } = await supabase.from(contribuinteTable).update(contribPayload).eq('id', editingContribuinteId).select().single();
        if (error) throw error;
        data = updated;
        toast.success('Contribuinte atualizado com sucesso');
      } else {
        const { data: inserted, error } = await supabase.from(contribuinteTable).insert({
          ...contribPayload,
          cliente_id: selectedCliente!.id,
        }).select().single();
        if (error) throw error;
        data = inserted;
        toast.success('Contribuinte adicionado com sucesso');
      }
      setContribuinteDialogOpen(false);
      setEditingContribuinteId(null);
      queryClient.invalidateQueries({ queryKey: ['contribuintes-modal', contribuinteTable, selectedCliente.id] });
      queryClient.invalidateQueries({ queryKey: ['contribuintes-por-cliente'] });
      
      // Sync assíncrono com DW
      if (data) {
        syncCadastrosToDW({
          contribuintes: [{
            id_contribuinte: data.id,
            id_cliente: data.cliente_id,
            tipo_pessoa: data.tipo_pessoa,
            cpf_cnpj: data.cpf_cnpj,
            nome_razao_social: data.nome_razao_social,
            inscricao_estadual: data.inscricao_estadual,
            cod_cnae: data.cod_cnae,
            setor: data.setor,
            simples_nacional: data.simples_nacional,
            created_at: data.created_at,
            updated_at: data.updated_at,
          }]
        });
      }
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

  const formatCategoria = (cat: string | null) => {
    if (!cat) return '-';
    const colors: Record<string, string> = {
      Bronze: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
      Prata: 'bg-slate-200 text-slate-700 hover:bg-slate-200',
      Ouro: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      Diamante: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    };
    return <Badge className={colors[cat] || ''}>{cat}</Badge>;
  };

  return (
    <DevLayout title="Gestão de clientes" subtitle="Consulta e filtros de clientes">
      <div className="space-y-6">
        {/* Card de Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Filter className="h-5 w-5 text-teal-600" />
                <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
              </CardTitle>
              <Button onClick={() => { setEditingClienteId(null); setNovoClienteModalOpen(true); }} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="h-4 w-4" />
                Novo cliente
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

              {/* Categoria - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 block">Categoria</label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="Bronze">Bronze</SelectItem>
                    <SelectItem value="Prata">Prata</SelectItem>
                    <SelectItem value="Ouro">Ouro</SelectItem>
                    <SelectItem value="Diamante">Diamante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              {hasActiveFilters && (
                <Button onClick={handleClear} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                  <Eraser className="h-4 w-4" />
                  Limpar filtros
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
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow className="hover:bg-slate-50 border-b-2 border-slate-200">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Nome Cliente</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Categoria</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Status</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Tipo Cliente</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Telefone</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Setor</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4 w-16">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-slate-100">
                        {paginatedResults.map((row, index) => (
                          <TableRow 
                            key={row.id}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-teal-50/60",
                              index % 2 === 1 && "bg-slate-50/50"
                            )}
                            onClick={() => handleClienteClick({ id: row.id, nome: row.nome || '-' })}
                          >
                            <TableCell className="px-4 py-3.5 font-medium text-slate-900">
                              {row.nome || '-'}
                            </TableCell>
                            <TableCell className="px-4 py-3.5">{formatCategoria((row as any).categoria)}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{formatStatus(row.ativo)}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{formatTipo(row.fixo)}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{row.telefone || '-'}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{row.setor_cliente || '-'}</TableCell>
                            <TableCell className="px-4 py-3.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                                onClick={(e) => handleEditCliente(e, row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
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
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="hover:bg-slate-50 border-b-2 border-slate-200">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Nome/Razão Social</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Tipo Pessoa</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Setor</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Simples Nacional</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">CPF/CNPJ</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Inscrição Estadual</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">Código CNAE</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4 w-16">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-slate-100">
                    {paginatedContribuintes.map((row, index) => (
                      <TableRow 
                        key={row.id}
                        className={cn(
                          "transition-colors hover:bg-teal-50/60",
                          index % 2 === 1 && "bg-slate-50/50"
                        )}
                      >
                        <TableCell className="px-4 py-3.5 font-medium text-slate-900">{row.nome_razao_social || '-'}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600">{row.tipo_pessoa || '-'}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600">{row.setor || '-'}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600">{formatSimples(row.simples_nacional)}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600 font-mono text-sm">{formatCpfCnpj(row.cpf_cnpj)}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600">{row.inscricao_estadual || '-'}</TableCell>
                        <TableCell className="px-4 py-3.5 text-slate-600">{row.cod_cnae || '-'}</TableCell>
                        <TableCell className="px-4 py-3.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                            onClick={(e) => handleEditContribuinte(e, row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
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

      {/* Modal de Criar/Editar Contribuinte */}
      <Dialog open={contribuinteDialogOpen} onOpenChange={setContribuinteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              {editingContribuinteId ? 'Editar Contribuinte' : 'Novo Contribuinte'}
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

      {/* Modal de Cadastro Completo (Novo + Editar Cliente) */}
      <NewClientModal
        open={novoClienteModalOpen}
        onOpenChange={(v) => {
          setNovoClienteModalOpen(v);
          if (!v) setEditingClienteId(null);
        }}
        editingClienteId={editingClienteId}
      />
    </DevLayout>
  );
};

export default GestaoClientes;
