import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncPerdcompToDW } from '@/lib/syncPerdcomp';
import { X, FileText, Plus, Pencil, Trash2, Loader2, History, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DcompFormModal } from './DcompFormModal';

interface PerData {
  numero_processo_per: string;
  id_contribuinte: string;
  exercicio: number;
  tri_exercicio: number;
  dt_solicitada: string;
  tp_credito: string;
  vlr_credito: number;
  nr_proc_ret?: string | null;
  contribuinte?: { nome_razao_social: string } | null;
}

interface PerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  per: PerData | null;
  contribuinteId: string;
}

const SITUACAO_OPTIONS = [
  { value: 'Deferido', label: 'Deferido' },
  { value: 'Analisado', label: 'Analisado' },
  { value: 'Em análise', label: 'Em análise' },
];

const SITUACAO_COLORS: Record<string, string> = {
  'Deferido': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Analisado': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Em análise': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

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

export function PerDetailModal({
  open,
  onOpenChange,
  per,
  contribuinteId,
}: PerDetailModalProps) {
  const queryClient = useQueryClient();
  const [novaSituacao, setNovaSituacao] = useState<string>('');
  const [dcompModalOpen, setDcompModalOpen] = useState(false);
  const [editDcompData, setEditDcompData] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dcompToDelete, setDcompToDelete] = useState<any>(null);

  // Query DCOMPs vinculados ao PER
  const { data: dcomps = [], isLoading: loadingDcomps } = useQuery({
    queryKey: ['per-dcomps', per?.numero_processo_per],
    queryFn: async () => {
      if (!per?.numero_processo_per) return [];
      const { data, error } = await supabase
        .from('dcomp')
        .select('*')
        .eq('nr_per_orig', per.numero_processo_per)
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!per?.numero_processo_per,
  });

  // Query histórico de situações
  const { data: situacoes = [], isLoading: loadingSituacoes } = useQuery({
    queryKey: ['per-situacoes', per?.numero_processo_per],
    queryFn: async () => {
      if (!per?.numero_processo_per) return [];
      const { data, error } = await supabase
        .from('per_situacao')
        .select('*')
        .eq('nr_proc_per', per.numero_processo_per)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!per?.numero_processo_per,
  });

  // Situação atual (mais recente)
  const situacaoAtual = situacoes.length > 0 ? situacoes[0].situacao : null;

  // Calcular saldo restante
  const saldoRestante = useMemo(() => {
    if (!per) return 0;
    const totalCompensado = dcomps.reduce((sum, d) => sum + (d.vlr_compensado || 0), 0);
    return per.vlr_credito - totalCompensado;
  }, [per, dcomps]);

  // Mutation para atualizar situação
  const updateSituacaoMutation = useMutation({
    mutationFn: async (situacao: string) => {
      const { data, error } = await supabase.from('per_situacao').insert({
        nr_proc_per: per?.numero_processo_per,
        situacao,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['per-situacoes', per?.numero_processo_per] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      toast.success('Situação atualizada com sucesso!');
      setNovaSituacao('');

      if (data) {
        syncPerdcompToDW({ per_situacao: [data] });
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar situação: ${error.message}`);
    },
  });

  // Mutation para excluir DCOMP
  const deleteDcompMutation = useMutation({
    mutationFn: async (nrDocumento: string) => {
      const { error } = await supabase.from('dcomp').delete().eq('nr_documento', nrDocumento);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['per-dcomps', per?.numero_processo_per] });
      queryClient.invalidateQueries({ queryKey: ['perdcomp-dcomp'] });
      toast.success('DCOMP excluído com sucesso!');
      setDeleteDialogOpen(false);
      setDcompToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir DCOMP: ${error.message}`);
    },
  });

  const handleUpdateSituacao = () => {
    if (!novaSituacao) {
      toast.error('Selecione uma situação');
      return;
    }
    updateSituacaoMutation.mutate(novaSituacao);
  };

  const handleNewDcomp = () => {
    setEditDcompData(null);
    setDcompModalOpen(true);
  };

  const handleEditDcomp = (dcomp: any) => {
    setEditDcompData(dcomp);
    setDcompModalOpen(true);
  };

  const handleDeleteDcomp = (dcomp: any) => {
    setDcompToDelete(dcomp);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteDcomp = () => {
    if (dcompToDelete) {
      deleteDcompMutation.mutate(dcompToDelete.nr_documento);
    }
  };

  if (!per) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent 
          className={cn(
            "max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0",
            "flex flex-col overflow-hidden",
            "[&>button]:hidden"
          )}
        >
          {/* Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <span>{per.numero_processo_per}</span>
                  <Badge variant="secondary" className="text-xs uppercase">
                    {per.tp_credito}
                  </Badge>
                </h3>
                <p className="text-sm text-slate-500 mt-0.5 font-medium">
                  {per.contribuinte?.nome_razao_social || 'Contribuinte'} • 
                  <span className="text-slate-700 dark:text-slate-300 ml-1">
                    {per.exercicio}/{per.tri_exercicio}T
                  </span>
                </p>
                {per.nr_proc_ret && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    <span>Retifica:</span>
                    <span className="font-mono font-medium">{per.nr_proc_ret}</span>
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="hidden xl:flex items-center gap-8 border-r border-slate-200 dark:border-slate-700 pr-6 h-12">
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    Valor Crédito
                  </p>
                  <p className="text-lg font-mono font-bold text-slate-800 dark:text-white">
                    {formatCurrency(per.vlr_credito)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    Saldo Restante
                  </p>
                  <p className={cn(
                    "text-lg font-mono font-bold",
                    saldoRestante > 0 
                      ? "text-green-600 dark:text-green-400" 
                      : saldoRestante < 0 
                        ? "text-red-600 dark:text-red-400" 
                        : "text-slate-800 dark:text-white"
                  )}>
                    {formatCurrency(saldoRestante)}
                  </p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-10 w-10 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Body: Sidebar + Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Situação */}
            <aside className="w-80 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0">
              <div className="p-4 space-y-4">
                {/* Situação Atual */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Situação Atual
                  </h4>
                  {situacaoAtual ? (
                    <Badge className={cn("text-sm px-3 py-1", SITUACAO_COLORS[situacaoAtual] || '')}>
                      {situacaoAtual}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      Sem situação
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Atualizar Situação */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Atualizar Situação
                  </h4>
                  <Select value={novaSituacao} onValueChange={setNovaSituacao}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITUACAO_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleUpdateSituacao} 
                    disabled={!novaSituacao || updateSituacaoMutation.isPending}
                    className="w-full"
                  >
                    {updateSituacaoMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Situação
                  </Button>
                </div>

                <Separator />

                {/* Histórico de Situações */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    <History className="h-3 w-3" />
                    Histórico
                  </h4>
                  <ScrollArea className="h-[300px]">
                    {loadingSituacoes ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : situacoes.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Nenhum histórico
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {situacoes.map((sit, index) => (
                          <div 
                            key={sit.id} 
                            className={cn(
                              "p-2 rounded-lg border",
                              index === 0 
                                ? "bg-white dark:bg-slate-800 border-primary/20" 
                                : "bg-slate-100/50 dark:bg-slate-800/50 border-transparent"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <Badge 
                                variant={index === 0 ? "default" : "outline"}
                                className={cn("text-xs", index === 0 && SITUACAO_COLORS[sit.situacao])}
                              >
                                {sit.situacao}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {formatDate(sit.criado_em)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </aside>

            {/* Área Principal - DCOMPs */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
              {/* Header da área */}
              <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    DCOMPs Vinculados
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {dcomps.length} registro{dcomps.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <Button onClick={handleNewDcomp} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo DCOMP
                </Button>
              </div>
              
              {/* Tabela de DCOMPs */}
              <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-800/20">
                {loadingDcomps ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Documento</TableHead>
                        <TableHead>Mês/Ano</TableHead>
                        <TableHead>Data Envio</TableHead>
                        <TableHead>Imposto</TableHead>
                        <TableHead>Tipo Crédito</TableHead>
                        <TableHead className="text-right">Valor Compensado</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dcomps.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum DCOMP vinculado a este PER
                          </TableCell>
                        </TableRow>
                      ) : (
                        dcomps.map((dcomp) => (
                          <TableRow key={dcomp.nr_documento}>
                            <TableCell className="font-medium">{dcomp.nr_documento}</TableCell>
                            <TableCell>{dcomp.mes_ano_exercicio}</TableCell>
                            <TableCell>{formatDate(dcomp.dt_envio)}</TableCell>
                            <TableCell>{dcomp.imposto}</TableCell>
                            <TableCell>{dcomp.tp_credito}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(dcomp.vlr_compensado)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleEditDcomp(dcomp)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteDcomp(dcomp)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Footer - Resumo móvel */}
              <div className="xl:hidden h-16 px-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-xs text-slate-500">Valor Crédito</p>
                  <p className="font-mono font-bold">{formatCurrency(per.vlr_credito)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Saldo Restante</p>
                  <p className={cn(
                    "font-mono font-bold",
                    saldoRestante > 0 
                      ? "text-green-600" 
                      : saldoRestante < 0 
                        ? "text-red-600" 
                        : ""
                  )}>
                    {formatCurrency(saldoRestante)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de DCOMP */}
      <DcompFormModal
        open={dcompModalOpen}
        onOpenChange={(open) => {
          setDcompModalOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ['per-dcomps', per?.numero_processo_per] });
          }
        }}
        editData={editDcompData}
        contribuinteId={contribuinteId}
        preSelectedPer={per?.numero_processo_per}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o DCOMP {dcompToDelete?.nr_documento}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteDcomp} 
              disabled={deleteDcompMutation.isPending}
            >
              {deleteDcompMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
