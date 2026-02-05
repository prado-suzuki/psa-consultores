import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { isProductionEnvironment } from '@/config/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface Cliente {
  id: string;
  nome: string;
  municipio: string | null;
  uf: string | null;
  setor_cliente: string | null;
  telefone: string | null;
  fixo: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export function FiscalClients() {
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useQuery<Cliente[]>({
    queryKey: ['empresa-clients'],
    queryFn: async () => {
      const { data, error } = isProductionEnvironment
        ? await supabase
            .from('cliente')
            .select('*')
            .eq('ativo', true)
            .order('nome')
        : await supabase
            .from('cliente_dev')
            .select('*')
            .eq('ativo', true)
            .order('nome');
      
      if (error) throw error;
      return data as Cliente[];
    },
  });

  const filteredClients = clients?.filter(client =>
    client.nome.toLowerCase().includes(search.toLowerCase()) ||
    (client.municipio && client.municipio.toLowerCase().includes(search.toLowerCase())) ||
    (client.uf && client.uf.toLowerCase().includes(search.toLowerCase()))
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1">
              {search ? 'Tente ajustar sua busca' : 'Não há clientes cadastrados'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Cliente</TableHead>
                <TableHead className="font-semibold">Setor</TableHead>
                <TableHead className="font-semibold">Município</TableHead>
                <TableHead className="font-semibold">UF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow 
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <span className="font-medium text-foreground">{client.nome}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.setor_cliente ? (
                      <Badge variant="outline" className="font-normal">
                        {client.setor_cliente}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.municipio || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.uf || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
