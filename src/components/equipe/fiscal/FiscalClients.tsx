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
import { Badge } from '@/components/ui/badge';
import { useFiscalClientsList } from '@/hooks/useFiscalClients';

export function FiscalClients() {
  const [search, setSearch] = useState('');

  const { data: clients, isLoading } = useFiscalClientsList();

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
                <TableHead className="font-semibold">Categoria</TableHead>
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
                  <TableCell>
                    {client.categoria ? (
                      <Badge variant="outline" className={
                        client.categoria === 'Bronze' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        client.categoria === 'Prata' ? 'bg-slate-200 text-slate-700 border-slate-300' :
                        client.categoria === 'Ouro' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        client.categoria === 'Diamante' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''
                      }>
                        {client.categoria}
                      </Badge>
                    ) : '-'}
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
