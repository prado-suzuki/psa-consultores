import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isProductionEnvironment } from '@/config/api';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Filter, Search, X, Users } from 'lucide-react';

const clienteTable = isProductionEnvironment ? 'cliente' : 'cliente_dev';

const GestaoClientes = () => {
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [searched, setSearched] = useState(false);

  // Query para nomes
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

  // Query para municípios
  const { data: municipios = [] } = useQuery({
    queryKey: ['clientes-municipios', clienteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select('municipio')
        .not('municipio', 'is', null)
        .order('municipio');
      
      if (error) throw error;
      const uniqueMunicipios = [...new Set(data?.map(d => d.municipio))];
      return uniqueMunicipios.filter(Boolean) as string[];
    },
  });

  // Query para UFs
  const { data: ufs = [] } = useQuery({
    queryKey: ['clientes-ufs', clienteTable],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(clienteTable)
        .select('uf')
        .not('uf', 'is', null)
        .order('uf');
      
      if (error) throw error;
      const uniqueUfs = [...new Set(data?.map(d => d.uf))];
      return uniqueUfs.filter(Boolean) as string[];
    },
  });

  // Query principal de clientes
  const { data: clientes = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-filtrados', clienteTable, nome, status, tipo, municipio, uf],
    queryFn: async () => {
      let query = supabase.from(clienteTable).select('*');

      if (nome) query = query.eq('nome', nome);
      if (status) query = query.eq('ativo', status === 'true');
      if (tipo) query = query.eq('fixo', tipo);
      if (municipio) query = query.eq('municipio', municipio);
      if (uf) query = query.eq('uf', uf);

      const { data, error } = await query.order('nome');
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
    setNome('');
    setStatus('');
    setTipo('');
    setMunicipio('');
    setUf('');
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
    <DevLayout title="Gestão de Clientes" subtitle="Consulta e filtros de clientes cadastrados">
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
            <div className="grid grid-cols-12 gap-4">
              {/* Nome - 4 colunas */}
              <div className="col-span-12 md:col-span-4">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome</label>
                <Select value={nome} onValueChange={setNome}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
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

              {/* Tipo - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tipo</label>
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

              {/* Município - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Município</label>
                <Select value={municipio} onValueChange={setMunicipio}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {municipios.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* UF - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">UF</label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {ufs.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleClear} className="gap-2">
                <X className="h-4 w-4" />
                Limpar Filtros
              </Button>
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
                  ({clientes.length} cliente{clientes.length !== 1 ? 's' : ''} encontrado{clientes.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : clientes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum cliente encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Município</TableHead>
                        <TableHead>UF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((cliente) => (
                        <TableRow key={cliente.id}>
                          <TableCell className="font-medium">{cliente.nome}</TableCell>
                          <TableCell>{formatStatus(cliente.ativo)}</TableCell>
                          <TableCell>{formatTipo(cliente.fixo)}</TableCell>
                          <TableCell>{cliente.telefone || '-'}</TableCell>
                          <TableCell>{cliente.setor_cliente || '-'}</TableCell>
                          <TableCell>{cliente.municipio || '-'}</TableCell>
                          <TableCell>{cliente.uf || '-'}</TableCell>
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
