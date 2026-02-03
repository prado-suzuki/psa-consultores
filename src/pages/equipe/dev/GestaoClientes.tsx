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
  // Estados do cliente (existentes)
  const [nome, setNome] = useState('');
  const [status, setStatus] = useState('');
  const [tipo, setTipo] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [searched, setSearched] = useState(false);

  // Estados do contribuinte (novos)
  const [tipoPessoa, setTipoPessoa] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeRazaoSocial, setNomeRazaoSocial] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [codCnae, setCodCnae] = useState('');
  const [setor, setSetor] = useState('');
  const [simplesNacional, setSimplesNacional] = useState('');

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

  // Query principal com JOIN
  const { data: resultados = [], isLoading, refetch } = useQuery({
    queryKey: ['clientes-contribuintes-filtrados', contribuinteTable, nome, status, tipo, municipio, uf, tipoPessoa, cpfCnpj, nomeRazaoSocial, inscricaoEstadual, codCnae, setor, simplesNacional],
    queryFn: async () => {
      let query = supabase
        .from(contribuinteTable)
        .select(`
          *,
          cliente:cliente_id (
            id,
            nome,
            ativo,
            fixo,
            municipio,
            uf,
            telefone,
            setor_cliente
          )
        `);

      // Filtros do contribuinte
      if (tipoPessoa) query = query.eq('tipo_pessoa', tipoPessoa);
      if (cpfCnpj) query = query.ilike('cpf_cnpj', `%${cpfCnpj}%`);
      if (nomeRazaoSocial) query = query.ilike('nome_razao_social', `%${nomeRazaoSocial}%`);
      if (inscricaoEstadual) query = query.ilike('inscricao_estadual', `%${inscricaoEstadual}%`);
      if (codCnae) query = query.ilike('cod_cnae', `%${codCnae}%`);
      if (setor) query = query.eq('setor', setor);
      if (simplesNacional) query = query.eq('simples_nacional', simplesNacional === 'true');

      const { data, error } = await query.order('nome_razao_social');
      if (error) throw error;

      // Filtrar no cliente (após o join)
      let filtered = data || [];
      if (nome) filtered = filtered.filter(r => r.cliente?.nome === nome);
      if (status) filtered = filtered.filter(r => r.cliente?.ativo === (status === 'true'));
      if (tipo) filtered = filtered.filter(r => r.cliente?.fixo === tipo);
      if (municipio) filtered = filtered.filter(r => r.cliente?.municipio === municipio);
      if (uf) filtered = filtered.filter(r => r.cliente?.uf === uf);

      return filtered;
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
    setMunicipio('');
    setUf('');
    // Limpar filtros do contribuinte
    setTipoPessoa('');
    setCpfCnpj('');
    setNomeRazaoSocial('');
    setInscricaoEstadual('');
    setCodCnae('');
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

  const formatSimples = (simples: boolean | null) => {
    if (simples === null || simples === undefined) return '-';
    return simples ? 'Sim' : 'Não';
  };

  return (
    <DevLayout title="Gestão de Clientes" subtitle="Consulta e filtros de clientes e contribuintes">
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
              {/* Nome - 3 colunas */}
              <div className="col-span-12 md:col-span-3">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome Cliente</label>
                <Select value={nome} onValueChange={setNome}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione" />
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

            {/* LINHA 2 - Filtros do Contribuinte */}
            <div className="grid grid-cols-12 gap-4">
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

              {/* CPF/CNPJ - 3 colunas */}
              <div className="col-span-6 md:col-span-3">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">CPF/CNPJ</label>
                <Input
                  placeholder="Digite o número"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Nome/Razão Social - 3 colunas */}
              <div className="col-span-12 md:col-span-3">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nome/Razão Social</label>
                <Input
                  placeholder="Digite o nome"
                  value={nomeRazaoSocial}
                  onChange={(e) => setNomeRazaoSocial(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Inscrição Estadual - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Inscrição Estadual</label>
                <Input
                  placeholder="Digite o número"
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  className="bg-white"
                />
              </div>

              {/* Cód. CNAE - 2 colunas */}
              <div className="col-span-6 md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Cód. CNAE</label>
                <Input
                  placeholder="Digite o código"
                  value={codCnae}
                  onChange={(e) => setCodCnae(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>

            {/* LINHA 3 - Filtros adicionais */}
            <div className="grid grid-cols-12 gap-4">
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
                  ({resultados.length} registro{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-slate-500">Carregando...</div>
              ) : resultados.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nenhum registro encontrado com os filtros selecionados.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tipo Cliente</TableHead>
                        <TableHead>Tipo Pessoa</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Nome/Razão Social</TableHead>
                        <TableHead>Inscrição Estadual</TableHead>
                        <TableHead>CNAE</TableHead>
                        <TableHead>Setor</TableHead>
                        <TableHead>Simples</TableHead>
                        <TableHead>Município</TableHead>
                        <TableHead>UF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultados.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.cliente?.nome || '-'}</TableCell>
                          <TableCell>{formatStatus(row.cliente?.ativo)}</TableCell>
                          <TableCell>{formatTipo(row.cliente?.fixo)}</TableCell>
                          <TableCell>{row.tipo_pessoa || '-'}</TableCell>
                          <TableCell>{row.cpf_cnpj || '-'}</TableCell>
                          <TableCell>{row.nome_razao_social || '-'}</TableCell>
                          <TableCell>{row.inscricao_estadual || '-'}</TableCell>
                          <TableCell>{row.cod_cnae || '-'}</TableCell>
                          <TableCell>{row.setor || '-'}</TableCell>
                          <TableCell>{formatSimples(row.simples_nacional)}</TableCell>
                          <TableCell>{row.cliente?.municipio || '-'}</TableCell>
                          <TableCell>{row.cliente?.uf || '-'}</TableCell>
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
