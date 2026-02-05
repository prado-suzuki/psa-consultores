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
import { Search, Plus, Pencil, X, Loader2, FileSpreadsheet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PerFormModal } from '@/components/equipe/dev/perdcomp/PerFormModal';
import { DcompFormModal } from '@/components/equipe/dev/perdcomp/DcompFormModal';
import { PerDetailModal } from '@/components/equipe/dev/perdcomp/PerDetailModal';



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

interface PerSituacaoMap {
  [key: string]: {
    situacao: string;
    criado_em: string;
  };
}

export default function ControlePerdcomp() {
  const queryClient = useQueryClient();
  
  // Filter states
  const [clienteId, setClienteId] = useState<string>('');
  const [contribuinteId, setContribuinteId] = useState<string>('');
  const [exercicioFilter, setExercicioFilter] = useState<string>('');
  const [processoFilter, setProcessoFilter] = useState<string>('');
  
  const [searched, setSearched] = useState(false);
  
  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  
  // PER Detail Modal states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPer, setSelectedPer] = useState<any>(null);

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
    enabled: searched && !!contribuinteId,
  });

  // Query for situações (most recent for each PER)
  const { data: perSituacoesMap = {} } = useQuery<PerSituacaoMap>({
    queryKey: ['per-situacoes', contribuinteId, searched],
    queryFn: async () => {
      if (!contribuinteId || !searched) return {};
      
      // Get all PERs for this contribuinte
      const { data: pers, error: perError } = await supabase
        .from('per')
        .select('numero_processo_per')
        .eq('id_contribuinte', contribuinteId);
      if (perError) throw perError;
      
      const perNumbers = pers?.map(p => p.numero_processo_per) || [];
      if (perNumbers.length === 0) return {};
      
      // Get all situações for these PERs
      const { data: situacoes, error } = await supabase
        .from('per_situacao')
        .select('nr_proc_per, situacao, criado_em')
        .in('nr_proc_per', perNumbers)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      
      // Build map with most recent situação for each PER
      const map: PerSituacaoMap = {};
      for (const sit of situacoes || []) {
        if (!map[sit.nr_proc_per]) {
          map[sit.nr_proc_per] = {
            situacao: sit.situacao,
            criado_em: sit.criado_em || '',
          };
        }
      }
      return map;
    },
    enabled: searched && !!contribuinteId,
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
    enabled: searched && !!contribuinteId,
  });

  // Delete mutation for DCOMP only
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
    setExercicioFilter('');
    setProcessoFilter('');
    setSearched(false);
  };

  // Frontend filtering
  const filteredPerData = perData.filter(item => {
    if (exercicioFilter && item.exercicio !== parseInt(exercicioFilter)) return false;
    if (processoFilter && !item.numero_processo_per.includes(processoFilter)) return false;
    return true;
  });

  const handleNew = () => {
    setEditData(null);
    setFormModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setEditData(item);
    setFormModalOpen(true);
  };

  const handlePerClick = (item: any) => {
    setSelectedPer(item);
    setDetailModalOpen(true);
  };

  const handleDelete = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;
    deleteDcompMutation.mutate(itemToDelete.nr_documento);
  };

  const isLoading = perLoading || dcompLoading;
  const isDeleting = deleteDcompMutation.isPending;


  const renderTable = () => {
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

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº Processo</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Atualização</TableHead>
            <TableHead>Exercício</TableHead>
            <TableHead>Trimestre</TableHead>
            <TableHead>Data Solicitada</TableHead>
            <TableHead>Tipo Crédito</TableHead>
            <TableHead className="text-right">Valor Crédito</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPerData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                Nenhum registro encontrado
              </TableCell>
            </TableRow>
          ) : filteredPerData.map((item) => {
            const situacaoInfo = perSituacoesMap[item.numero_processo_per];
            
            return (
              <TableRow 
                key={item.numero_processo_per} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handlePerClick(item)}
              >
                <TableCell className="font-medium">{item.numero_processo_per}</TableCell>
                <TableCell>{situacaoInfo?.situacao || '-'}</TableCell>
                <TableCell>{situacaoInfo?.criado_em ? formatDate(situacaoInfo.criado_em) : '-'}</TableCell>
                <TableCell>{item.exercicio}</TableCell>
                <TableCell>{item.tri_exercicio}º</TableCell>
                <TableCell>{formatDate(item.dt_solicitada)}</TableCell>
                <TableCell>{item.tp_credito}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.vlr_credito)}</TableCell>
                <TableCell>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderFormModal = () => {
    return (
      <PerFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        editData={editData}
        clienteId={clienteId}
        contribuinteId={contribuinteId}
      />
    );
  };

  return (
    <DevLayout title="Controle PERDCOMP" subtitle="Gerenciamento de PER e DCOMP">
      {/* Filters Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
              <Label>Exercício</Label>
              <Select value={exercicioFilter || "__none__"} onValueChange={(v) => setExercicioFilter(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos</SelectItem>
                  {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((year) => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nº do Processo</Label>
              <Input
                placeholder="Digite o número..."
                value={processoFilter}
                onChange={(e) => setProcessoFilter(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2 md:col-span-2">
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
          <CardTitle className="text-lg">Resultados - PER</CardTitle>
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

      {/* Delete Confirmation Dialog - Only for DCOMP */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o DCOMP {itemToDelete?.nr_documento}? Esta ação não pode ser desfeita.
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

      {/* PER Detail Modal */}
      <PerDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        per={selectedPer}
        contribuinteId={contribuinteId}
      />
    </DevLayout>
  );
}
