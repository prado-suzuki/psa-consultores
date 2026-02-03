import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Filter, Search, Eraser, Users } from 'lucide-react';

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';
const contribuinteTable = isProductionEnvironment ? 'contribuinte' : 'contribuinte_dev';

const GestaoClientes = () => {
  // Estados do cliente
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [searched, setSearched] = useState(false);

  // Estados do contribuinte (apenas para filtrar)
  const [tipoPessoa, setTipoPessoa] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');

  // Verifica se há filtros ativos
  const hasActiveFilters = nome || status || tipo || nomeRazaoSocial || tipoPessoa || cpfCnpj;

  // Verifica se há filtros de contribuinte ativos
  const hasContribuinteFilters = nomeRazaoSocial || tipoPessoa || cpfCnpj;

  // Query para nomes de clientes
  const { data: nomes = [] } = useQuery({
    queryKey: ['clientes-nomes', clienteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select('nome')
        .not('nome', 'is', null)
        .order('nome');
      
      if (error) throw error;
      const uniqueNomes = [...new Set(data?.map(d => d.nome))];
      return uniqueNomes.filter(Boolean) as string[];
    },
  });

  // Query para nomes/razão social do contribuinte
  const { data: nomesRazaoSocial = [] } = useQuery({
    queryKey: ['contribuintes-nomes', contribuinteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(contribuinteTable)
        .select('nome_razao_social')
        .not('nome_razao_social', 'is', null)
        .order('nome_razao_social');
      
      if (error) throw error;
      const uniqueNomes = [...new Set(data?.map(d => d.nome_razao_social))];
      return uniqueNomes.filter(Boolean) as string[];
    },
  });

  // Query principal - busca clientes (não contribuintes)
  const { data: resultados = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-filtrados', clienteTable, nome, status, tipo, tipoPessoa, cpfCnpj, nomeRazaoSocial],
    queryFn: async () => {
      // Se houver filtros de contribuinte, primeiro buscar cliente_ids correspondentes
      let clienteIds: string[] | null = null;
      
      if (hasContribuinteFilters) {
        let contribuinteQuery = supabase
          .from(contribuinteTable)
          .select('cliente_id');
        
        if (tipoPessoa) contribuinteQuery = contribuinteQuery.eq('tipo_pessoa', tipoPessoa);
        if (cpfCnpj) contribuinteQuery = contribuinteQuery.ilike('cpf_cnpj', `%${cpfCnpj}%`);
        if (nomeRazaoSocial) contribuinteQuery = contribuinteQuery.eq('nome_razao_social', nomeRazaoSocial);

        const { data: contribuintes, error: contribError } = await contribuinteQuery;
        if (contribError) throw contribError;
        
        // Extrair cliente_ids únicos
        clienteIds = [...new Set(contribuintes?.map(c => c.cliente_id))] as string[];
        
        // Se não houver contribuintes correspondentes, retornar vazio
        if (clienteIds.length === 0) return [];
      }

      // Buscar clientes
      let clienteQuery = supabase
        .from(clienteTable)
        .select('*');
      
      // Filtros diretos do cliente
      if (nome && nome !== '__todos__') clienteQuery = clienteQuery.eq('nome', nome);
      if (status) clienteQuery = clienteQuery.eq('ativo', status === 'true');
      if (tipo) clienteQuery = clienteQuery.eq('fixo', tipo);
      
      // Filtrar por cliente_ids (se houver filtros de contribuinte)
      if (clienteIds !== null) {
        clienteQuery = clienteQuery.in('id', clienteIds);
      }

      const { data, error } = await clienteQuery.order('nome');
      if (error) throw error;

      return data || [];
    },
    enabled: searched,
  });

  const handleSearch = () => {
    setSearched(true);
    refetch();
  };

  const handleClear = () => {
    // Limpar filtros do cliente
    setNome('');
    setStatus('');
    setTipo('');
    // Limpar filtros do contribuinte
    setTipoPessoa('');
    setCpfCnpj('');
    setNomeRazaoSocial('');
    setSearched(false);
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
                <Select value={nome} onValueChange={setNome}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="__todos__">Todos os Clientes</SelectItem>
                    {nomes.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
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
                    {nomesRazaoSocial.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
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
                      {resultados.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.nome || '-'}</TableCell>
                          <TableCell>{formatStatus(row.ativo)}</TableCell>
                          <TableCell>{formatTipo(row.fixo)}</TableCell>
                          <TableCell>{row.telefone || '-'}</TableCell>
                          <TableCell>{row.setor_cliente || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DevLayout>
  );
};

export default GestaoClientes;
