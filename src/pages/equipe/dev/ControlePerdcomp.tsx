import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Plus, Pencil, Trash2, X, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PerFormModal } from '@/components/equipe/dev/perdcomp/PerFormModal';
import { DcompFormModal } from '@/components/equipe/dev/perdcomp/DcompFormModal';
import { SituacaoFormModal } from '@/components/equipe/dev/perdcomp/SituacaoFormModal';

type TipoRegistro = 'per' | 'dcomp' | 'situacao';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export default function ControlePerdcomp() {
  const queryClient = useQueryClient();
  
  // Filter states
  const [clienteId, setClienteId] = useState<string>('');
  const [contribuinteId, setContribuinteId] = useState<string>('');
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('per');
  const [searched, setSearched] = useState(false);
  
  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Fetch clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch contribuintes based on selected cliente
  const { data: contribuintes = [] } = useQuery({
    queryKey: ['contribuintes', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('cliente_id', clienteId)
        .order('nome_razao_social');
      if (error) throw error;
      return data || [];
    },
    enabled: !!clienteId,
  });

  // Query for PER data
  const { data: perData = [], isLoading: perLoading } = useQuery({
    queryKey: ['perdcomp-per', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      const { data, error } = await supabase
        .from('per')
        .select(`
          *,
          contribuinte:id_contribuinte (nome_razao_social)
        `)
        .eq('id_contribuinte', contribuinteId)
        .order('exercicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: tipoRegistro === 'per' && searched && !!contribuinteId,
  });

  // Query for DCOMP data
  const { data: dcompData = [], isLoading: dcompLoading } = useQuery({
    queryKey: ['perdcomp-dcomp', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      // First get PERs for this contribuinte
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('numero_processo_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      
      const perNumbers = pers?.map(p => p.numero_processo_per) || [];
      if (perNumbers.length === 0) return [];
      
      const { data, error } = await supabase
        .from('dcomp')
        .select('*')
        .in('nr_per_orig', perNumbers)
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: tipoRegistro === 'dcomp' && searched && !!contribuinteId,
  });

  // Query for Situacao data
  const { data: situacaoData = [], isLoading: situacaoLoading } = useQuery({
    queryKey: ['perdcomp-situacao', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return [];
      // First get PERs for this contribuinte
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('numero_processo_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      
      const perNumbers = pers?.map(p => p.numero_processo_per) || [];
      if (perNumbers.length === 0) return [];
      
      const { data, error } = await supabase
        .from('per_situacao')
        .select('*')
        .in('nr_proc_per', perNumbers)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: tipoRegistro === 'situacao' && searched && !!contribuinteId,
  });

  // Delete mutations
  const deletePerMutation = useMutation({
    mutationFn: async (numero: string) => {
      const { error } = await supabase.from('per').delete().eq('numero_processo_per', numero);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      toast.success('PER excluído com sucesso!');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const deleteDcompMutation = useMutation({
    mutationFn: async (numero: string) => {
      const { error } = await supabase.from('dcomp').delete().eq('nr_documento', numero);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      toast.success('DCOMP excluído com sucesso!');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const deleteSituacaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('per_situacao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perdcomp-situacao'] });
      toast.success('Situação excluída com sucesso!');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (!clienteId || !contribuinteId) {
      toast.error('Selecione o cliente e contribuinte');
      return;
    }
    setSearched(true);
  };

  const handleClear = () => {
    setClienteId('');
    setContribuinteId('');
    setSearched(false);
  };

  const handleNew = () => {
    setEditData(null);
    setFormModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditData(item);
    setFormModalOpen(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    
    switch (tipoRegistro) {
      case 'per':
        deletePerMutation.mutate(itemToDelete.numero_processo_per);
        break;
      case 'dcomp':
        deleteDcompMutation.mutate(itemToDelete.nr_documento);
        break;
      case 'situacao':
        deleteSituacaoMutation.mutate(itemToDelete.id);
        break;
    }
  };

  const isLoading = perLoading || dcompLoading || situacaoLoading;
  const isDeleting = deletePerMutation.isPending || deleteDcompMutation.isPending || deleteSituacaoMutation.isPending;

  const getCurrentData = () => {
    switch (tipoRegistro) {
      case 'per': return perData;
      case 'dcomp': return dcompData;
      case 'situacao': return situacaoData;
      default: return [];
    }
  };

  const renderTable = () => {
    const data = getCurrentData();
    
    if (!searched) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione os filtros e clique em Buscar para visualizar os registros</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum registro encontrado</p>
        </div>
      );
    }

    switch (tipoRegistro) {
      case 'per':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Processo</TableHead>
                <TableHead>Contribuinte</TableHead>
                <TableHead>Exercício</TableHead>
                <TableHead>Trimestre</TableHead>
                <TableHead>Data Solicitada</TableHead>
                <TableHead>Tipo Crédito</TableHead>
                <TableHead className="text-right">Valor Crédito</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).map((item) => (
                <TableRow key={item.numero_processo_per}>
                  <TableCell className="font-medium">{item.numero_processo_per}</TableCell>
                  <TableCell>{item.contribuinte?.nome_razao_social || '-'}</TableCell>
                  <TableCell>{item.exercicio}</TableCell>
                  <TableCell>{item.tri_exercicio}º</TableCell>
                  <TableCell>{formatDate(item.dt_solicitada)}</TableCell>
                  <TableCell>{item.tp_credito}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.vlr_credito)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'dcomp':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Documento</TableHead>
                <TableHead>PER Origem</TableHead>
                <TableHead>Mês/Ano</TableHead>
                <TableHead>Data Envio</TableHead>
                <TableHead>Imposto</TableHead>
                <TableHead>Tipo Crédito</TableHead>
                <TableHead className="text-right">Valor Compensado</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).map((item) => (
                <TableRow key={item.nr_documento}>
                  <TableCell className="font-medium">{item.nr_documento}</TableCell>
                  <TableCell>{item.nr_per_orig}</TableCell>
                  <TableCell>{item.mes_ano_exercicio}</TableCell>
                  <TableCell>{formatDate(item.dt_envio)}</TableCell>
                  <TableCell>{item.imposto}</TableCell>
                  <TableCell>{item.tp_credito}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.vlr_compensado)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'situacao':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PER</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Data Pagamento</TableHead>
                <TableHead>Data Registro</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data as any[]).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nr_proc_per}</TableCell>
                  <TableCell>{item.situacao}</TableCell>
                  <TableCell>{formatDate(item.dt_pagamento)}</TableCell>
                  <TableCell>{formatDate(item.criado_em)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );
    }
  };

  const renderFormModal = () => {
    switch (tipoRegistro) {
      case 'per':
        return (
          <PerFormModal
            open={formModalOpen}
            onOpenChange={setFormModalOpen}
            editData={editData}
            clienteId={clienteId}
            contribuinteId={contribuinteId}
          />
        );
      case 'dcomp':
        return (
          <DcompFormModal
            open={formModalOpen}
            onOpenChange={setFormModalOpen}
            editData={editData}
            contribuinteId={contribuinteId}
          />
        );
      case 'situacao':
        return (
          <SituacaoFormModal
            open={formModalOpen}
            onOpenChange={setFormModalOpen}
            editData={editData}
            contribuinteId={contribuinteId}
          />
        );
    }
  };

  const getDeleteMessage = () => {
    switch (tipoRegistro) {
      case 'per':
        return `o PER ${itemToDelete?.numero_processo_per}`;
      case 'dcomp':
        return `o DCOMP ${itemToDelete?.nr_documento}`;
      case 'situacao':
        return `esta situação`;
    }
  };

  return (
    <DevLayout title="Controle PERDCOMP" subtitle="Gerenciamento de PER, DCOMP e Situações">
      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); setSearched(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Contribuinte</Label>
              <Select value={contribuinteId} onValueChange={(v) => { setContribuinteId(v); setSearched(false); }} disabled={!clienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o contribuinte" />
                </SelectTrigger>
                <SelectContent>
                  {contribuintes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <Select value={tipoRegistro} onValueChange={(v) => setTipoRegistro(v as TipoRegistro)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per">PER</SelectItem>
                  <SelectItem value="dcomp">DCOMP</SelectItem>
                  <SelectItem value="situacao">Situações</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleClear} variant="outline" className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Resultados - {tipoRegistro === 'per' ? 'PER' : tipoRegistro === 'dcomp' ? 'DCOMP' : 'Situações'}
          </CardTitle>
          {searched && (
            <Button onClick={handleNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {renderTable()}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {renderFormModal()}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {getDeleteMessage()}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DevLayout>
  );
}
