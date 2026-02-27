import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TABLE_NAMES } from '@/config/api';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Filter, Search, Eraser, Plus, FileSpreadsheet } from 'lucide-react';
import { UploadBalanceteModal } from '@/components/equipe/dev/balancete/UploadBalanceteModal';

const ControleBalancetes = () => {
  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [periodo, setPeriodo] = useState<{ month: number; year: number } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-balancetes', TABLE_NAMES.cliente],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE_NAMES.cliente)
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  // Fetch contribuintes filtered by client
  const { data: contribuintes } = useQuery({
    queryKey: ['contribuintes-balancetes', TABLE_NAMES.contribuinte, clienteId],
    queryFn: async () => {
      let query = supabase
        .from(TABLE_NAMES.contribuinte)
        .select('id, nome_razao_social, cliente_id')
        .order('nome_razao_social');
      if (clienteId) query = query.eq('cliente_id', clienteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleClear = () => {
    setClienteId('');
    setContribuinteId('');
    setPeriodo(null);
  };

  const hasFilters = clienteId || contribuinteId || periodo;

  return (
    <DevLayout title="Controle de Balancetes" subtitle="Upload e consulta de balancetes contábeis">
      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-primary">
            <Filter className="h-5 w-5 text-teal-600" />
            <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Cliente */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); }}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contribuinte */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">Contribuinte</Label>
              <Select value={contribuinteId} onValueChange={setContribuinteId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="col-span-4 space-y-2">
              <Label className="text-sm font-medium text-slate-700">Período</Label>
              <MonthYearPicker value={periodo} onChange={setPeriodo} placeholder="Selecione o período" />
            </div>
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
            {hasFilters && (
              <Button variant="outline" onClick={handleClear} className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
                <Eraser className="h-4 w-4" />
                Limpar filtros
              </Button>
            )}
            <Button className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Balancetes</CardTitle>
          <Button onClick={() => setModalOpen(true)} className="gap-2 bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4" />
            Novo Balancete
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full">
            <Table className="text-xs">
              <TableHeader className="[&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-slate-700">
                <TableRow>
                  <TableHead>Contribuinte</TableHead>
                  <TableHead>Período Início</TableHead>
                  <TableHead>Período Fim</TableHead>
                  <TableHead>Adicionado por</TableHead>
                  <TableHead>Data Upload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-400">
                    <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium">Nenhum balancete encontrado</p>
                    <p className="text-xs mt-1">Clique em "+ Novo Balancete" para enviar um arquivo</p>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <UploadBalanceteModal open={modalOpen} onOpenChange={setModalOpen} />
    </DevLayout>
  );
};

export default ControleBalancetes;
