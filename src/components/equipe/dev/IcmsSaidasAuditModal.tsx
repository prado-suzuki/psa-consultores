import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { DifalGroupedItem, RegraICMSST } from '@/types/difal';
import { CheckCircle2, AlertTriangle, Loader2, FileText, Scale, X } from 'lucide-react';

interface IcmsSaidasAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DifalGroupedItem | null;
  ufDestino: string;
  tipoOperacao?: string;
  onDecisionSaved: (group: DifalGroupedItem, regraId: string) => void;
}

// Mock de regras NCM (front-end only — endpoint real ainda não existe)
const buildMockRegras = (ncm: string, uf: string): RegraICMSST[] => [
  {
    id: `r1-${ncm}-${uf}`,
    tipo_st: 'ICMS-ST',
    aliquota_st: 17,
    percentual_reducao: null,
    base_legal: `RICMS-${uf} Anexo X art. 3º`,
    convenio: 'Conv. ICMS 142/18',
    anexo: 'Anexo X',
  },
  {
    id: `r2-${ncm}-${uf}`,
    tipo_st: 'DIFAL',
    aliquota_st: 5,
    percentual_reducao: null,
    base_legal: 'EC 87/2015 — Diferencial de Alíquota',
    convenio: null,
    anexo: null,
  },
  {
    id: `r3-${ncm}-${uf}`,
    tipo_st: 'Sem ST',
    aliquota_st: 0,
    percentual_reducao: null,
    base_legal: 'Operação fora do regime de Substituição Tributária',
    convenio: null,
    anexo: null,
  },
];

export const IcmsSaidasAuditModal = ({
  open,
  onOpenChange,
  group,
  ufDestino,
  tipoOperacao,
  onDecisionSaved,
}: IcmsSaidasAuditModalProps) => {
  const { toast } = useToast();
  const [selectedRegraId, setSelectedRegraId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    data: regras,
    isLoading: isLoadingRegras,
  } = useQuery({
    queryKey: ['icms-saidas-ncm-regras', group?.cod_ncm, ufDestino],
    queryFn: async () => {
      if (!group) return [];
      // Simula latência de rede
      await new Promise((r) => setTimeout(r, 300));
      return buildMockRegras(group.cod_ncm, ufDestino);
    },
    enabled: open && !!group && !!ufDestino,
  });

  const handleSaveDecision = async () => {
    if (!group || !selectedRegraId) {
      toast({
        title: 'Selecione uma regra',
        description: 'É necessário selecionar uma regra para confirmar a decisão.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Sem persistência — apenas estado local no parent
      await new Promise((r) => setTimeout(r, 200));
      onDecisionSaved(group, selectedRegraId);
      toast({
        title: 'Decisão registrada localmente',
        description: 'A classificação foi aplicada nesta sessão (modo Beta).',
        duration: 1500,
      });
      setSelectedRegraId(null);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0',
          'flex flex-col overflow-hidden',
          '[&>button]:hidden',
        )}
      >
        <DialogTitle className="sr-only">Classificar Item ICMS Saídas</DialogTitle>
        <DialogDescription className="sr-only">
          Modal de classificação de item fiscal — ICMS das Saídas (Beta)
        </DialogDescription>

        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 shadow-sm">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Classificar Item</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                NCM:{' '}
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {group?.cod_ncm}
                </span>
                <span className="mx-2">•</span>
                UF Destino:{' '}
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{ufDestino}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
              Beta
            </Badge>
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

        {/* Body */}
        {group && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Product Data */}
            <div className="w-[30%] border-r border-slate-200 dark:border-slate-700 p-6 overflow-y-auto bg-slate-50/30 dark:bg-slate-800/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Dados do Produto</h3>
              </div>

              <Card className="border-slate-200">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-medium">Produto</span>
                    <p className="font-medium text-slate-900 dark:text-white text-lg mt-1">{group.xProd}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-medium">Código</span>
                      <p className="font-mono text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {group.cod_produto}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-medium">NCM</span>
                      <p className="font-mono text-sm text-slate-700 dark:text-slate-300 mt-1">{group.cod_ncm}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-medium">CFOP</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{group.cfop}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-medium">UF Destino</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{ufDestino}</p>
                    </div>
                  </div>

                  {tipoOperacao && (
                    <div>
                      <span className="text-xs text-slate-500 uppercase font-medium">Tipo de Operação</span>
                      <p className="text-slate-700 dark:text-slate-300 mt-1">{tipoOperacao}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-medium">Tributação</span>
                    <div className="flex gap-6 mt-2 flex-wrap">
                      <div>
                        <span className="text-xs text-slate-400">CST ICMS:</span>
                        <span className="ml-2 font-mono text-sm font-medium">{group.cst_icms || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Alíquota:</span>
                        <span className="ml-2 font-mono text-sm font-medium">
                          {group.aliq_icms !== null ? `${group.aliq_icms}%` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Red BC:</span>
                        <span className="ml-2 font-mono text-sm font-medium">
                          {group.pRedBC !== null && group.pRedBC !== undefined ? `${group.pRedBC}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-xs text-slate-500 uppercase font-medium">Resumo do Grupo</span>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{group.count}</p>
                        <p className="text-xs text-slate-500">Itens</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{group.nfesCount}</p>
                        <p className="text-xs text-slate-500">NFes</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(group.totalValue)}
                        </p>
                        <p className="text-xs text-slate-500">Valor Total</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Rules */}
            <div className="w-[70%] p-6 overflow-y-auto flex flex-col bg-white dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Regras Disponíveis</h3>
                <Badge variant="secondary" className="ml-auto">
                  UF: {ufDestino}
                </Badge>
              </div>

              {isLoadingRegras ? (
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : regras && regras.length > 0 ? (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {regras.map((regra) => (
                    <Card
                      key={regra.id}
                      className={cn(
                        'cursor-pointer transition-all',
                        selectedRegraId === regra.id
                          ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:bg-teal-900/20'
                          : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50',
                      )}
                      onClick={() => setSelectedRegraId(regra.id)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-sm',
                                  selectedRegraId === regra.id
                                    ? 'border-teal-500 text-teal-700 dark:text-teal-400'
                                    : '',
                                )}
                              >
                                {regra.tipo_st}
                              </Badge>
                              <span className="font-bold text-xl text-slate-900 dark:text-white">
                                {regra.aliquota_st}%
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{regra.base_legal}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {regra.convenio && (
                              <Badge variant="secondary" className="text-xs">
                                {regra.convenio}
                              </Badge>
                            )}
                            {regra.anexo && (
                              <Badge variant="secondary" className="text-xs">
                                {regra.anexo}
                              </Badge>
                            )}
                            {selectedRegraId === regra.id && (
                              <CheckCircle2 className="h-6 w-6 text-teal-600 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-700 dark:text-amber-400 font-medium">
                      Nenhuma regra encontrada para este NCM
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="h-16 px-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-end gap-3 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSaveDecision}
            disabled={!selectedRegraId || isSaving}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Salvar Decisão
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IcmsSaidasAuditModal;
