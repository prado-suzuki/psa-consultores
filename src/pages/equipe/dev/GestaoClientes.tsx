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
import { Filter, Search, Eraser, Users, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import NewClientModal from '@/components/equipe/dev/NewClientModal';

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';

const ITEMS_PER_PAGE = 10;

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

  // Modal de cadastro completo (usado para criar, editar e visualizar)
  const [novoClienteModalOpen, setNovoClienteModalOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState(false); // true = readOnly (clique na tabela), false = edição

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

  const handleClienteClick = (cliente: { id: string }) => {
    setEditingClienteId(cliente.id);
    setViewMode(true);
    setNovoClienteModalOpen(true);
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
              <Button onClick={() => { setEditingClienteId(null); setViewMode(false); setNovoClienteModalOpen(true); }} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
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
                            onClick={() => handleClienteClick({ id: row.id })}
                          >
                            <TableCell className="px-4 py-3.5 font-medium text-slate-900">
                              {row.nome || '-'}
                            </TableCell>
                            <TableCell className="px-4 py-3.5">{formatCategoria((row as any).categoria)}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{formatStatus(row.ativo)}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{formatTipo(row.fixo)}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{row.telefone || '-'}</TableCell>
                            <TableCell className="px-4 py-3.5 text-slate-600">{row.setor_cliente || '-'}</TableCell>
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

      {/* Modal de Cadastro Completo (Novo, Editar e Visualizar Cliente) */}
      <NewClientModal
        open={novoClienteModalOpen}
        onOpenChange={(v) => {
          setNovoClienteModalOpen(v);
          if (!v) {
            setEditingClienteId(null);
            setViewMode(false);
          }
        }}
        editingClienteId={editingClienteId}
        readOnly={viewMode}
      />
    </DevLayout>
  );
};

export default GestaoClientes;
