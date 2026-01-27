import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { API_BASE_URL } from '@/config/api';
import {
  DifalItem,
  NCMRegrasResponse,
  RegraICMSST,
  SyncPayload,
  SyncResponse,
  TipoDecisao,
} from '@/types/difal';
import {
  CheckCircle2,
  XCircle,
  Ban,
  AlertTriangle,
  Loader2,
  FileText,
  Scale,
} from 'lucide-react';

interface DifalAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DifalItem | null;
  ufDestino: string;
}

export const DifalAuditModal = ({
  open,
  onOpenChange,
  item,
  ufDestino,
}: DifalAuditModalProps) => {
  const { toast } = useToast();
  const { fetchWithAuth } = useApiAuth();
  const queryClient = useQueryClient();
  const [selectedRegraId, setSelectedRegraId] = useState<string | null>(null);

  // Query para buscar regras NCM
  const {
    data: regrasData,
    isLoading: isLoadingRegras,
    error: regrasError,
  } = useQuery({
    queryKey: ['ncm-regras', item?.cod_ncm, ufDestino],
    queryFn: async () => {
      if (!item) return null;

      const response = await fetchWithAuth(`${API_BASE_URL}/api/v1/ncm/regras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncms: [item.cod_ncm],
          uf: ufDestino,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar regras NCM');
      }

      return response.json() as Promise<NCMRegrasResponse>;
    },
    enabled: open && !!item && !!ufDestino,
  });

  // Mutation para sincronizar decisão
  const syncMutation = useMutation({
    mutationFn: async (payload: SyncPayload) => {
      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/v1/classificacoes/sync`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao salvar classificação');
      }

      return response.json() as Promise<SyncResponse>;
    },
    onSuccess: (data) => {
      if (data.sucesso) {
        toast({
          title: 'Classificação salva',
          description: `${data.total_processado} item(s) processado(s) com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });
        onOpenChange(false);
      } else {
        toast({
          title: 'Erro na classificação',
          description: data.erros.join(', '),
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const handleSaveDecision = (decisao: TipoDecisao, regraId: string | null = null) => {
    if (!item) return;

    // Validação: REGRA_SELECIONADA requer id_icms_st
    if (decisao === 'REGRA_SELECIONADA' && !regraId) {
      toast({
        title: 'Selecione uma regra',
        description: 'É necessário selecionar uma regra ICMS-ST.',
        variant: 'destructive',
      });
      return;
    }

    const payload: SyncPayload = {
      decisoes: [
        {
          id_contribuinte: item.id_contribuinte,
          cod_produto: item.cod_produto,
          cod_ncm: item.cod_ncm,
          decisao,
          id_icms_st: regraId,
        },
      ],
    };

    syncMutation.mutate(payload);
  };

  const regrasNCM = regrasData?.[item?.cod_ncm || ''];

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col [&>button]:hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-teal-600" />
              Classificar Item
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {item && (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lado Esquerdo: Dados do XML */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Dados do XML</h3>
                </div>

                <Card className="border-slate-200">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <span className="text-xs text-slate-500 uppercase">Produto</span>
                      <p className="font-medium text-slate-900">{item.xProd}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-slate-500 uppercase">Código</span>
                        <p className="font-mono text-sm text-slate-700">{item.cod_produto}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase">NCM</span>
                        <p className="font-mono text-sm text-slate-700">{item.cod_ncm}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-slate-500 uppercase">CFOP</span>
                        <p className="font-mono text-sm text-slate-700">{item.cfop}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase">Valor</span>
                        <p className="font-semibold text-slate-900">
                          {formatCurrency(item.vProd)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-slate-500 uppercase">UF Origem</span>
                        <p className="text-slate-700">{item.uf_emit}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 uppercase">UF Destino</span>
                        <p className="text-slate-700">{item.uf_dest}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500 uppercase">
                        Tributação de Entrada
                      </span>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <span className="text-xs text-slate-400">CST ICMS:</span>
                          <span className="ml-1 font-mono text-sm">
                            {item.cst_icms || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400">Alíquota:</span>
                          <span className="ml-1 font-mono text-sm">
                            {item.aliq_icms !== null ? `${item.aliq_icms}%` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(item.cst_pis || item.cst_cofins) && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-500 uppercase">PIS/COFINS</span>
                        <div className="flex gap-4 mt-1">
                          <div>
                            <span className="text-xs text-slate-400">CST PIS:</span>
                            <span className="ml-1 font-mono text-sm">
                              {item.cst_pis || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400">CST COFINS:</span>
                            <span className="ml-1 font-mono text-sm">
                              {item.cst_cofins || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Lado Direito: Regras Disponíveis */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="h-4 w-4 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">Regras Disponíveis</h3>
                  <Badge variant="secondary" className="ml-auto">
                    UF: {ufDestino}
                  </Badge>
                </div>

                {isLoadingRegras ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                ) : regrasError ? (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-sm text-red-700">Erro ao carregar regras</p>
                    </CardContent>
                  </Card>
                ) : regrasNCM?.regras && regrasNCM.regras.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {regrasNCM.regras.map((regra: RegraICMSST) => (
                      <Card
                        key={regra.id}
                        className={`cursor-pointer transition-all ${
                          selectedRegraId === regra.id
                            ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500/20'
                            : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                        }`}
                        onClick={() => setSelectedRegraId(regra.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    selectedRegraId === regra.id
                                      ? 'border-teal-500 text-teal-700'
                                      : ''
                                  }
                                >
                                  {regra.tipo_st}
                                </Badge>
                                <span className="font-semibold text-slate-900">
                                  {regra.aliquota_st}%
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mt-1">
                                {regra.base_legal}
                              </p>
                              {regra.percentual_reducao && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Redução: {regra.percentual_reducao}%
                                </p>
                              )}
                            </div>
                            {selectedRegraId === regra.id && (
                              <CheckCircle2 className="h-5 w-5 text-teal-600 flex-shrink-0" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4 text-center">
                      <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm text-amber-700">
                        Nenhuma regra ST encontrada para este NCM
                      </p>
                      {regrasNCM?.descricao && (
                        <p className="text-xs text-amber-600 mt-1">
                          {regrasNCM.descricao}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Botões de exceção */}
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 uppercase mb-3">
                    Ou marcar como exceção:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDecision('SEM_ST')}
                      disabled={syncMutation.isPending}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Sem ST
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDecision('ISENTO')}
                      disabled={syncMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Isento
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveDecision('NAO_APLICAVEL')}
                      disabled={syncMutation.isPending}
                      className="flex-1"
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Não Aplicável
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer com ações */}
        <div className="flex-shrink-0 flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={syncMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleSaveDecision('REGRA_SELECIONADA', selectedRegraId)}
            disabled={!selectedRegraId || syncMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {syncMutation.isPending ? (
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

export default DifalAuditModal;
