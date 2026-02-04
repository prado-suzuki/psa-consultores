import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

export function FiscalClients() {
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useQuery({
    queryKey: ['fiscal-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalog_clients')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase())
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Building className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1">
              {search ? 'Tente ajustar sua busca' : 'Nao ha clientes cadastrados'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Responsavel</TableHead>
                <TableHead className="font-semibold">Descricao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow 
                  key={client.id}
                  className="cursor-pointer hover:bg-slate-50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: client.color || '#6b7280' }}
                      />
                      <span className="font-medium text-slate-900">{client.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {client.responsible || '-'}
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-md truncate">
                    {client.description || '-'}
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
