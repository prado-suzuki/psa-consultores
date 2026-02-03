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
import { Filter, Search, X, Users } from 'lucide-react';

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
  const [setor, setSetor] = useState('');
  const [simplesNacional, setSimplesNacional] = useState('');

  // Verifica se há filtros ativos
  const hasActiveFilters = nome || status || tipo || nomeRazaoSocial || tipoPessoa || cpfCnpj || setor || simplesNacional;

  // Verifica se há filtros de contribuinte ativos
  const hasContribuinteFilters = nomeRazaoSocial || tipoPessoa || cpfCnpj || setor || simplesNacional;

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

  // Query para setores do contribuinte
  const { data: setores = [] } = useQuery({
    queryKey: ['contribuintes-setores', contribuinteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(contribuinteTable)
        .select('setor')
        .not('setor', 'is', null)
        .order('setor');
      
      if (error) throw error;
      const uniqueSetores = [...new Set(data?.map(d => d.setor))];
      return uniqueSetores.filter(Boolean) as string[];
    },
  });

  // Query principal - busca clientes (não contribuintes)
  const { data: resultados = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-filtrados', clienteTable, nome, status, tipo, tipoPessoa, cpfCnpj, nomeRazaoSocial, setor, simplesNacional],
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
        if (setor) contribuinteQuery = contribuinteQuery.eq('setor', setor);
        if (simplesNacional) contribuinteQuery = contribuinteQuery.eq('simples_nacional', simplesNacional === 'true');

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
    setSetor('');
    setSimplesNacional('');
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5 text-teal-600" />
              Filtros de Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* LINHA 1 - Filtros do Cliente */}
            <div className="grid grid-cols-12 gap-4">
              {/* Nome Cliente - 3 colunas */}
              <div className="col-span-12 md:col-span-3">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome Cliente</label>
                <Select value={nome} onValueChange={setNome}>
                  <SelectTrigger className="bg-white">
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

              {/* Status - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo Cliente - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tipo Cliente</label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="Sim">Fixos</SelectItem>
                    <SelectItem value="Não">Pontuais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* LINHA 2 - Filtros do Contribuinte */}
            <div className="grid grid-cols-12 gap-4">
              {/* Nome/Razão Social - 3 colunas */}
              <div className="col-span-12 md:col-span-3">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome/Razão Social</label>
                <Select value={nomeRazaoSocial} onValueChange={setNomeRazaoSocial}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {nomesRazaoSocial.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo Pessoa - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tipo Pessoa</label>
                <Select value={tipoPessoa} onValueChange={setTipoPessoa}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="PJ">PJ</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* CPF/CNPJ - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">CPF/CNPJ</label>
                <Input
                  placeholder="Digite o número"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Setor - 3 colunas */}
              <div className="col-span-6 md:col-span-3">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Setor</label>
                <Select value={setor} onValueChange={setSetor}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {setores.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Simples Nacional - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Simples Nacional</label>
                <Select value={simplesNacional} onValueChange={setSimplesNacional}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between pt-4 border-t">
              {hasActiveFilters ? (
                <Button variant="outline" onClick={handleClear} className="gap-2">
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={handleSearch} className="gap-2 bg-teal-600 hover:bg-teal-700">
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
