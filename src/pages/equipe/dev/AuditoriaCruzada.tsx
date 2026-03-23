import { useState } from 'react';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useClientesList, useContribuintesByCliente } from '@/hooks/useDevClients';

const AuditoriaCruzada = () => {
  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [ncm, setNcm] = useState('');
  const [aliquota, setAliquota] = useState('');
  const [tipoProduto, setTipoProduto] = useState('todos');

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  const handleLimpar = () => {
    setClienteId('');
    setContribuinteId('');
    setNcm('');
    setAliquota('');
    setTipoProduto('todos');
  };

  const handleClienteChange = (value: string) => {
    setClienteId(value);
    setContribuinteId('');
  };

  return (
    <DevLayout title="Auditoria Cruzada" subtitle="Auditoria cruzada entre fontes de dados fiscais">
      <div className="space-y-4">
        {/* Filtros Globais */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <Select value={clienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contribuinte</Label>
                <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={clienteId ? 'Selecione...' : 'Selecione um cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {contribuintes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NCM</Label>
                <Input
                  placeholder="Ex: 8471.30.19"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alíquota</Label>
                <Input
                  placeholder="Ex: 1.65"
                  value={aliquota}
                  onChange={(e) => setAliquota(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Produto</Label>
                <Select value={tipoProduto} onValueChange={setTipoProduto}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="mercadoria">Mercadoria</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleLimpar}>
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
              <Button size="sm">
                <Search className="h-3.5 w-3.5 mr-1" />
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Abas */}
        <Tabs defaultValue="balancete-efd" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="balancete-efd" className="text-xs sm:text-sm">
              Balancete vs EFD Contribuições
            </TabsTrigger>
            <TabsTrigger value="efd-icms" className="text-xs sm:text-sm">
              EFD Contribuições vs EFD ICMS
            </TabsTrigger>
            <TabsTrigger value="efd-xml" className="text-xs sm:text-sm">
              EFD Contribuições vs XMLs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balancete-efd">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Em construção</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efd-icms">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Em construção</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="efd-xml">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Em construção</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DevLayout>
  );
};

export default AuditoriaCruzada;
