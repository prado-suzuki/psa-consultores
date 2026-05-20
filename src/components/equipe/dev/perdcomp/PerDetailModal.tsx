import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncPerdcompToDW } from '@/lib/syncPerdcomp';
import { normalizeCurrencyZero, normalizeProcessNumber } from '@/lib/perdcompUtils';
import { applySelicCorrection, isWithinGracePeriod } from '@/lib/selicCalculator';
import { useSelicTaxaAt } from '@/hooks/useSelicTaxaAt';
import { X, FileText, Plus, Pencil, Trash2, Loader2, History, ArrowRight, DollarSign, CheckCircle2, CalendarIcon, FileSpreadsheet } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SoftDeleteModal } from './SoftDeleteModal';

interface PerData {
  nr_per: string;
  id_contribuinte: string;
  exercicio: number;
  tri_exercicio: number;
  dt_solicitada: string;
  tp_credito: string;
  vlr_credito: number;
  vlr_ressarcido?: number | null;
  vlr_ressarcido_original?: number | null;
  nr_proc_ret?: string | null;
  excluido?: string | null;
  nr_cancelamento?: string | null;
  contribuinte?: { nome_razao_social: string } | null;
}

interface PerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  per: PerData | null;
  contribuinteId: string;
}

const SITUACAO_OPTIONS = [
  { value: 'Analise concluida', label: 'Análise concluída' },
  { value: 'Analise preliminar disponibilizada', label: 'Análise preliminar disponibilizada' },
  { value: 'Contribuinte intimado', label: 'Contribuinte intimado' },
  { value: 'Despacho decisorio emitido', label: 'Despacho decisório emitido' },
  { value: 'Em analise', label: 'Em análise' },
  { value: 'Em discussao administrativa - CARF', label: 'Em discussão administrativa - CARF' },
  { value: 'Em discussao administrativa - CSRF', label: 'Em discussão administrativa - CSRF' },
  { value: 'Em discussao administrativa - DRJ', label: 'Em discussão administrativa - DRJ' },
  { value: 'Homologado', label: 'Homologado' },
  { value: 'Nao admitido', label: 'Não admitido' },
  { value: 'PER deferido', label: 'PER deferido' },
  { value: 'Retificado', label: 'Retificado' },
];

const SITUACAO_COLORS: Record<string, string> = {
  'Analise concluida': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Analise preliminar disponibilizada': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Cancelado': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'Contribuinte intimado': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  'Despacho decisorio emitido': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'Em analise': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Em discussao administrativa - CARF': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Em discussao administrativa - CSRF': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Em discussao administrativa - DRJ': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'Homologado': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Nao admitido': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  'Pedido de cancelamento deferido': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
  'PER deferido': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Retificado': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Deferido': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Analisado': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Em análise': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(normalizeCurrencyZero(value));
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

/**
 * Derives the original DCOMP of a rectification chain by traversing nr_dcomp_ret links.
 * Returns the nr_documento of the root DCOMP (the one with nr_dcomp_ret = null).
 */
function findOriginalDcomp(nrDocumento: string, allDcomps: any[]): string {
  const byDoc = new Map(allDcomps.map((d: any) => [d.nr_documento, d]));
  let current = byDoc.get(nrDocumento);
  const visited = new Set<string>();
  while (current && current.nr_dcomp_ret && !visited.has(current.nr_documento)) {
    visited.add(current.nr_documento);
    const prev = byDoc.get(current.nr_dcomp_ret);
    if (!prev) break;
    current = prev;
  }
  return current?.nr_documento || nrDocumento;
}

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

  // Soft delete modal state
  const [softDeleteOpen, setSoftDeleteOpen] = useState(false);
  const [softDeleteType, setSoftDeleteType] = useState<'per' | 'dcomp'>('per');
  const [softDeleteId, setSoftDeleteId] = useState('');

  // Ressarcimento form state
  const [ressarcimentoOpen, setRessarcimentoOpen] = useState(false);
  const [ressarcimentoValor, setRessarcimentoValor] = useState('');
  const [ressarcimentoData, setRessarcimentoData] = useState('');
  const [ressarcimentoPercentual, setRessarcimentoPercentual] = useState('');
  const [ressarcimentoCalOpen, setRessarcimentoCalOpen] = useState(false);

  // Filtro de tipo de tributo na tabela de DCOMPs
  const [tributoFiltro, setTributoFiltro] = useState<string>('__todos__');

  // Query para dados atualizados do PER (refetch após mutations)
  const { data: perAtualizado } = useQuery({
    queryKey: ['per-detail', per?.nr_per],
    queryFn: async () => {
      if (!per?.nr_per) return null;
      const { data, error } = await (supabase
        .from('per') as any)
        .select('*, contribuinte(nome_razao_social)')
        .eq('nr_per', per.nr_per)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!per?.nr_per,
  });

  // Usar dados atualizados com fallback para prop
  // Cast único: vlr_ressarcido_original é coluna nova (migration via Lovable) ainda não refletida nos types.
  const perAtual = (perAtualizado || per) as (PerData & { vlr_ressarcido?: number | null; vlr_ressarcido_original?: number | null }) | null;
  const vlrRessarcido = perAtual?.vlr_ressarcido || 0;
  const perPago = vlrRessarcido > 0;

  // Query DCOMPs vinculados ao PER — filter out soft-deleted
  const { data: dcomps = [], isLoading: loadingDcomps } = useQuery({
    queryKey: ['per-dcomps', per?.nr_per],
    queryFn: async () => {
      if (!per?.nr_per) return [];
      const { data, error } = await supabase
        .from('dcomp')
        .select('*')
        .eq('nr_per_orig', per.nr_per)
        .or('excluido.is.null,excluido.eq.')
        .order('dt_envio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!per?.nr_per,
  });

  // Query histórico de situações
  const { data: situacoes = [], isLoading: loadingSituacoes } = useQuery({
    queryKey: ['per-situacoes', per?.nr_per],
    queryFn: async () => {
      if (!per?.nr_per) return [];
      const { data, error } = await supabase
        .from('per_situacao')
        .select('*')
        .eq('nr_proc_per', per.nr_per)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!per?.nr_per,
  });

  // Situação atual (mais recente)
  const situacaoAtual = situacoes.length > 0 ? situacoes[0].situacao : null;

  // Filtrar DCOMPs para exibir apenas os vigentes (excluir retificados)
  const dcompsRetificadosSet = useMemo(() => {
    return new Set(
      dcomps
        .filter((d: any) => d.nr_dcomp_ret)
        .map((d: any) => d.nr_dcomp_ret)
    );
  }, [dcomps]);

  const dcompsVigentes = useMemo(() => {
    return dcomps.filter((d: any) => !dcompsRetificadosSet.has(d.nr_documento));
  }, [dcomps, dcompsRetificadosSet]);

  // saldoRestante é calculado mais abaixo, após carregar distribuicoesPorDcomp,
  // usando a soma de valor_original (principal) das distribuições — não vlr_compensado (atualizado pela SELIC).

  // Distribuições do rateio para todas as DCOMPs vigentes — alimenta filtro de tributo
  const dcompsVigentesNrDocs = useMemo(
    () => dcompsVigentes.map((d) => d.nr_documento),
    [dcompsVigentes],
  );

  const { data: distribuicoesPorDcomp = [] } = useQuery<Array<{
    nr_documento: string;
    tributo: string;
    valor_tributo: number;
    valor_original: number | null;
    competencia: string | null;
  }>>({
    queryKey: ['per-distribuicoes', per?.nr_per, dcompsVigentesNrDocs.join(',')],
    queryFn: async () => {
      if (dcompsVigentesNrDocs.length === 0) return [];
      const { data, error } = await (supabase
        .from('distribuicao_dcomp') as any)
        .select('nr_documento, tributo, valor_tributo, valor_original, competencia')
        .in('nr_documento', dcompsVigentesNrDocs);
      if (error) throw error;
      return data || [];
    },
    enabled: open && dcompsVigentesNrDocs.length > 0,
  });

  // Tributos distintos para o filtro
  const tributosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const linha of distribuicoesPorDcomp) {
      if (linha.tributo) set.add(linha.tributo);
    }
    return Array.from(set).sort();
  }, [distribuicoesPorDcomp]);

  // Agrupa distribuições por nr_documento → tributo → soma valor_tributo
  const valorPorDcompTributo = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const linha of distribuicoesPorDcomp) {
      const doc = linha.nr_documento;
      const trib = linha.tributo;
      if (!map[doc]) map[doc] = {};
      map[doc][trib] = (map[doc][trib] || 0) + Number(linha.valor_tributo || 0);
    }
    return map;
  }, [distribuicoesPorDcomp]);

  // DCOMPs após aplicação do filtro de tributo
  const dcompsExibidos = useMemo(() => {
    if (tributoFiltro === '__todos__') {
      return dcompsVigentes.map((d) => ({
        dcomp: d,
        valorExibido: d.vlr_compensado || 0,
        tributoExibido: d.imposto,
      }));
    }
    return dcompsVigentes
      .filter((d) => {
        const tribsDoDcomp = valorPorDcompTributo[d.nr_documento] || {};
        return Object.prototype.hasOwnProperty.call(tribsDoDcomp, tributoFiltro);
      })
      .map((d) => ({
        dcomp: d,
        valorExibido: valorPorDcompTributo[d.nr_documento]?.[tributoFiltro] || 0,
        tributoExibido: tributoFiltro,
      }));
  }, [dcompsVigentes, tributoFiltro, valorPorDcompTributo]);

  // SELIC: fator vigente até hoje para este PER, com +1% mês corrente embutido
  const hojeStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const { data: selicTaxaAtual } = useSelicTaxaAt(
    perAtual?.dt_solicitada,
    hojeStr,
  );
  const emCarencia = perAtual?.dt_solicitada
    ? isWithinGracePeriod(perAtual.dt_solicitada)
    : true;
  const valorAtualizadoSelic = useMemo(() => {
    if (emCarencia || !selicTaxaAtual) return null;
    const { valorCorrigido, fator } = applySelicCorrection(
      saldoRestante,
      selicTaxaAtual.vlr_acumulado_dec,
    );
    return { valorCorrigido, fator };
  }, [emCarencia, selicTaxaAtual, saldoRestante]);

  // SELIC: fator vigente na data do ressarcimento informada — para rateio Atualizado/Original
  const { data: selicTaxaRessarcimento } = useSelicTaxaAt(
    perAtual?.dt_solicitada,
    ressarcimentoData || null,
  );
  const fatorRessarcimento = useMemo(() => {
    if (!ressarcimentoData || !perAtual?.dt_solicitada) return 0;
    // Carência calculada na data do pagamento, não hoje
    const dt = new Date(perAtual.dt_solicitada + 'T00:00:00');
    dt.setDate(dt.getDate() + 360);
    const ref = new Date(ressarcimentoData + 'T00:00:00');
    if (dt > ref) return 0;
    if (!selicTaxaRessarcimento) return 0;
    return selicTaxaRessarcimento.vlr_acumulado_dec + 0.01;
  }, [ressarcimentoData, perAtual?.dt_solicitada, selicTaxaRessarcimento]);

  const ressarcimentoValorNumerico = useMemo(() => {
    const digits = ressarcimentoValor.replace(/\D/g, '');
    return parseInt(digits || '0', 10) / 100;
  }, [ressarcimentoValor]);

  const ressarcimentoValorOriginal = useMemo(() => {
    if (fatorRessarcimento <= 0) return ressarcimentoValorNumerico;
    return ressarcimentoValorNumerico / (1 + fatorRessarcimento);
  }, [fatorRessarcimento, ressarcimentoValorNumerico]);

  // Mutation para atualizar situação
  const updateSituacaoMutation = useMutation({
    mutationFn: async (situacao: string) => {
      const { data, error } = await supabase.from('per_situacao').insert({
        nr_proc_per: per?.nr_per,
        situacao,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['per-situacoes', per?.nr_per] });
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

  // Mutation para salvar ressarcimento
  const ressarcimentoMutation = useMutation({
    mutationFn: async ({ valor, valorOriginal, dataPagamento, percentual }: { valor: number; valorOriginal: number; dataPagamento: string; percentual: number | null }) => {
      // Update per.vlr_ressarcido + porcentagem_psa + vlr_ressarcido_original (rateio Atualizado/Original congelado)
      const { error: perError } = await (supabase
        .from('per') as any)
        .update({
          vlr_ressarcido: valor,
          vlr_ressarcido_original: Math.round(valorOriginal * 100) / 100,
          porcentagem_psa: percentual,
        })
        .eq('nr_per', per?.nr_per);
      if (perError) throw perError;

      // Insert per_situacao with dt_pagamento
      const { data: sitData, error: sitError } = await supabase
        .from('per_situacao')
        .insert({
          nr_proc_per: per?.nr_per,
          situacao: 'PER deferido',
          dt_pagamento: dataPagamento,
        })
        .select()
        .single();
      if (sitError) throw sitError;

      return { valor, sitData };
    },
    onSuccess: async ({ valor, sitData }) => {
      await queryClient.refetchQueries({ queryKey: ['per-detail', per?.nr_per] });
      await queryClient.refetchQueries({ queryKey: ['per-situacoes', per?.nr_per] });
      queryClient.invalidateQueries({ queryKey: ['per-situacoes'] });
      await queryClient.refetchQueries({ queryKey: ['per-dcomps', per?.nr_per] });
      queryClient.invalidateQueries({ queryKey: ['perdcomp-per'] });
      toast.success('Ressarcimento registrado com sucesso!');
      setRessarcimentoOpen(false);
      setRessarcimentoValor('');
      setRessarcimentoData('');
      setRessarcimentoPercentual('');

      if (per) {
        syncPerdcompToDW({
          per: [{
            nr_per: per.nr_per,
            id_contribuinte: per.id_contribuinte,
            exercicio: per.exercicio,
            tri_exercicio: per.tri_exercicio,
            dt_solicitada: per.dt_solicitada,
            tp_credito: per.tp_credito,
            vlr_credito: per.vlr_credito,
            vlr_ressarcido: valor,
            nr_proc_ret: per.nr_proc_ret,
          }],
          per_situacao: sitData ? [sitData] : undefined,
        });
      }
    },
    onError: (error: any) => {
      toast.error(`Erro ao registrar ressarcimento: ${error.message}`);
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
    setSoftDeleteType('dcomp');
    setSoftDeleteId(dcomp.nr_documento);
    setSoftDeleteOpen(true);
  };

  const handleDeletePer = () => {
    if (!per) return;
    setSoftDeleteType('per');
    setSoftDeleteId(per.nr_per);
    setSoftDeleteOpen(true);
  };

  const handleSaveRessarcimento = () => {
    const valor = ressarcimentoValorNumerico;
    if (valor <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    if (!ressarcimentoData) {
      toast.error('Informe a data do pagamento');
      return;
    }
    const percentual = ressarcimentoPercentual ? parseFloat(ressarcimentoPercentual) : null;
    if (percentual !== null && percentual > 100) {
      toast.error('Percentual não pode ser maior que 100%');
      return;
    }
    ressarcimentoMutation.mutate({
      valor,
      valorOriginal: ressarcimentoValorOriginal,
      dataPagamento: ressarcimentoData,
      percentual,
    });
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
          <DialogTitle className="sr-only">Detalhes do PER</DialogTitle>
          <DialogDescription className="sr-only">Visualização detalhada do processo PER com DCOMPs e situações</DialogDescription>
          {/* Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  <span>{normalizeProcessNumber(per.nr_per)}</span>
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
                    <span className="font-mono font-medium">{normalizeProcessNumber(per.nr_proc_ret)}</span>
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
                    Saldo Restante do PER
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
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                    Valor Atualizado SELIC
                  </p>
                  {emCarencia ? (
                    <p className="text-lg font-mono font-bold text-slate-400 dark:text-slate-500">
                      Em carência
                    </p>
                  ) : valorAtualizadoSelic ? (
                    <p className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(valorAtualizadoSelic.valorCorrigido)}
                    </p>
                  ) : (
                    <p className="text-lg font-mono font-bold text-slate-400">—</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeletePer}
                  className="h-10 w-10 rounded-full text-slate-400 hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
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
          </div>

          {/* Body: Sidebar + Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar - Situação */}
            <aside className="w-80 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0 overflow-hidden">
              <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
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
                  <ScrollArea className={perPago ? "h-[200px]" : "h-[300px]"}>
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
                                {formatDateTime(sit.criado_em)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>

              {/* Banner de Ressarcimento Registrado - bottom of sidebar */}
              {perPago && (
                <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-green-800 dark:text-green-300 uppercase tracking-wider">
                          Ressarcimento Registrado
                        </h5>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
                          <div>
                            <span className="text-[10px] text-green-600 dark:text-green-400">Valor Atualizado</span>
                            <p className="text-sm font-mono font-bold text-green-800 dark:text-green-200">
                              {formatCurrency(vlrRessarcido)}
                            </p>
                          </div>
                          {perAtual?.vlr_ressarcido_original != null && (
                            <div>
                              <span className="text-[10px] text-green-600 dark:text-green-400">Valor Original</span>
                              <p className="text-sm font-mono font-bold text-green-800 dark:text-green-200">
                                {formatCurrency(perAtual.vlr_ressarcido_original)}
                              </p>
                            </div>
                          )}
                          {(() => {
                            const sitComPagamento = situacoes.find((s: any) => s.dt_pagamento);
                            return sitComPagamento ? (
                              <div>
                                <span className="text-[10px] text-green-600 dark:text-green-400">Data Pagamento</span>
                                <p className="text-sm font-mono font-bold text-green-800 dark:text-green-200">
                                  {formatDate(sitComPagamento.dt_pagamento)}
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </aside>

            {/* Área Principal - Lançamentos PER */}
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
              {/* Header da área */}
              <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-900 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                    Lançamentos PER
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    {dcompsExibidos.length} registro{dcompsExibidos.length !== 1 ? 's' : ''}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Tipo Tributo:</Label>
                    <Select value={tributoFiltro} onValueChange={setTributoFiltro}>
                      <SelectTrigger className="h-8 w-[140px] text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__todos__">Todos</SelectItem>
                        {tributosDisponiveis.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => toast.info('Exportação em desenvolvimento')}
                    size="sm"
                    variant="outline"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar Planilha
                  </Button>
                  {perPago && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-sm px-3 py-1">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Ressarcido
                    </Badge>
                  )}
                  {!perPago && (
                    <Button onClick={() => setRessarcimentoOpen(true)} size="sm" variant="outline">
                      <DollarSign className="h-4 w-4 mr-2" />
                      Novo Ressarcimento
                    </Button>
                  )}
                  {saldoRestante > 0 && (
                    <Button onClick={handleNewDcomp} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo DCOMP
                    </Button>
                  )}
                </div>
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
                        <TableHead>N DCOMP Original</TableHead>
                        <TableHead>N DCOMP Retificado</TableHead>
                        <TableHead>Mês/Ano</TableHead>
                        <TableHead>Data Envio</TableHead>
                        <TableHead>Imposto</TableHead>
                        <TableHead className="text-right">Valor Compensado</TableHead>
                        <TableHead className="w-[100px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dcompsExibidos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            {tributoFiltro === '__todos__'
                              ? 'Nenhum DCOMP vinculado a este PER'
                              : `Nenhum DCOMP com ${tributoFiltro} no rateio`}
                          </TableCell>
                        </TableRow>
                      ) : (
                        dcompsExibidos.map(({ dcomp, valorExibido, tributoExibido }) => {
                          const originalDoc = findOriginalDcomp(dcomp.nr_documento, dcomps);
                          const isRetificacao = !!dcomp.nr_dcomp_ret;

                          return (
                            <TableRow key={dcomp.nr_documento}>
                              <TableCell className="font-medium">
                {normalizeProcessNumber(isRetificacao ? originalDoc : dcomp.nr_documento)}
                              </TableCell>
                              <TableCell>
                                {isRetificacao ? (
                                  <span className="text-orange-600 dark:text-orange-400 font-medium">
                                    {normalizeProcessNumber(dcomp.nr_documento)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{dcomp.mes_ano_exercicio}</TableCell>
                              <TableCell>{formatDate(dcomp.dt_envio)}</TableCell>
                              <TableCell>{tributoExibido}</TableCell>
                              <TableCell className="text-right font-mono">
                                {formatCurrency(valorExibido)}
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
                          );
                        })
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
                  <p className="text-xs text-slate-500">Saldo Restante do PER</p>
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
            queryClient.refetchQueries({ queryKey: ['per-dcomps', per?.nr_per] });
            queryClient.refetchQueries({ queryKey: ['per-detail', per?.nr_per] });
          }
        }}
        editData={editDcompData}
        contribuinteId={contribuinteId}
        preSelectedPer={per?.nr_per}
      />

      {/* Dialog de Ressarcimento */}
      <AlertDialog open={ressarcimentoOpen} onOpenChange={setRessarcimentoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Novo Ressarcimento</AlertDialogTitle>
            <AlertDialogDescription>
              Registre o valor efetivamente ressarcido e a data do pagamento para o PER {per.nr_per}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Valor Atualizado (R$)</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={ressarcimentoValor}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  const num = parseInt(digits || '0', 10) / 100;
                  setRessarcimentoValor(num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Popover open={ressarcimentoCalOpen} onOpenChange={setRessarcimentoCalOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !ressarcimentoData && "text-muted-foreground")}>
                    {ressarcimentoData ? format(new Date(ressarcimentoData + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : <span>Selecione...</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar selected={ressarcimentoData ? new Date(ressarcimentoData + 'T00:00:00') : undefined} onSelect={(d) => { setRessarcimentoData(d ? format(d, 'yyyy-MM-dd') : ''); setRessarcimentoCalOpen(false); }} />
                </PopoverContent>
              </Popover>
            </div>
            {ressarcimentoData && ressarcimentoValorNumerico > 0 && (
              <div className="rounded-md border bg-slate-50 dark:bg-slate-800/50 p-3 text-sm">
                {fatorRessarcimento > 0 ? (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor Original (calculado)</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-white">
                        {formatCurrency(ressarcimentoValorOriginal)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Fator SELIC: {fatorRessarcimento.toFixed(6)}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Em carência — sem parcela SELIC (Valor Original = Valor Atualizado)
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Percentual Aplicado (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="Ex: 15.00"
                value={ressarcimentoPercentual}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || Number(v) <= 100) setRessarcimentoPercentual(v);
                }}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveRessarcimento}
              disabled={ressarcimentoMutation.isPending}
            >
              {ressarcimentoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Soft Delete Modal */}
      <SoftDeleteModal
        open={softDeleteOpen}
        onOpenChange={setSoftDeleteOpen}
        type={softDeleteType}
        identifier={softDeleteId}
      />
    </>
  );
}
