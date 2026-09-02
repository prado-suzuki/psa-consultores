import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useDomainDifalAudit } from '@/hooks/useDomainDifalAudit';
import { cn } from '@/lib/utils';
import {
  DifalGroupedItem,
  RegraICMSST,
  TipoDecisao,
} from '@/types/difal';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileText,
  Scale,
  X,
} from 'lucide-react';

interface DifalAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DifalGroupedItem | null;
  ufDestino: string;
  sessaoId: string | null;
  onDecisionSaved: (group: DifalGroupedItem) => void;
}

export const DifalAuditModal = ({
  open,
  onOpenChange,
  group,
  ufDestino,
  sessaoId,
  onDecisionSaved,
}: DifalAuditModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegraId, setSelectedRegraId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Query para buscar regras NCM
  const { regrasQuery, saveDecisionMutation } = useDomainDifalAudit({
    open,
    group,
    ufDestino,
  });
  const {
    data: regrasData,
    isLoading: isLoadingRegras,
    error: regrasError,
  } = regrasQuery;

  // Salvar decisão em difal_decisao (Supabase) ao invés de enviar para API
  const handleSaveDecision = async (decisao: TipoDecisao, regraId: string | null = null) => {
    if (!group || !sessaoId) {
      toast({
        title: 'Sessão não iniciada',
        description: 'É necessário iniciar uma busca antes de classificar.',
        variant: 'destructive',
      });
      return;
    }

    // Validação: REGRA_SELECIONADA requer id_icms_st
    if (decisao === 'REGRA_SELECIONADA' && !regraId) {
      toast({
        title: 'Selecione uma regra',
        description: 'É necessário selecionar uma regra ICMS-ST.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      await saveDecisionMutation.mutateAsync({
        sessaoId,
        codNcm: group.cod_ncm,
        decisao,
        regraId,
      });

      toast({
        title: 'Decisão registrada',
        description: 'Clique em "Salvar Alterações" para enviar ao banco principal.',
        duration: 500,
      });

      onDecisionSaved(group); // Passa o grupo decidido
      queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar decisão',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const regrasNCM = regrasData?.[group?.cod_ncm || ''];

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0",
          "flex flex-col overflow-hidden",
          "[&>button]:hidden"
        )}
      >
        <DialogTitle className="sr-only">Classificar Item DIFAL</DialogTitle>
        <DialogDescription className="sr-only">Modal de classificação de item fiscal DIFAL/ICMS-ST</DialogDescription>
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-border bg-white/95 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                Classificar Item
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                NCM: <span className="font-mono font-medium text-foreground">{group?.cod_ncm}</span>
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Body: Two Columns */}
        {group && (
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Product Data */}
            <div className="w-[30%] border-r border-border p-6 overflow-y-auto bg-muted/30">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg text-foreground">Dados do Produto</h3>
              </div>

              <Card className="border-border">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-medium">Produto</span>
                    <p className="font-medium text-foreground text-lg mt-1">{group.xProd}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-medium">Código</span>
                      <p className="font-mono text-sm text-foreground mt-1">{group.cod_produto}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-medium">NCM</span>
                      <p className="font-mono text-sm text-foreground mt-1">{group.cod_ncm}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-medium">CFOP</span>
                      <p className="text-foreground mt-1">{group.cfop}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-medium">UF Destino</span>
                      <p className="text-foreground mt-1">{ufDestino}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground uppercase font-medium">
                      Tributação
                    </span>
                    <div className="flex gap-6 mt-2 flex-wrap">
                      <div>
                        <span className="text-xs text-muted-foreground">CST ICMS:</span>
                        <span className="ml-2 font-mono text-sm font-medium">
                          {group.cst_icms || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Alíquota:</span>
                        <span className="ml-2 font-mono text-sm font-medium">
                          {group.aliq_icms !== null ? `${group.aliq_icms}%` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Red BC:</span>
                        <span className="ml-2 font-mono text-sm font-medium">
                          {group.pRedBC !== null && group.pRedBC !== undefined ? `${group.pRedBC}%` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Grupo */}
                  <div className="pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground uppercase font-medium">
                      Resumo do Grupo
                    </span>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">{group.count}</p>
                        <p className="text-xs text-muted-foreground">Itens</p>
                      </div>
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">{group.nfesCount}</p>
                        <p className="text-xs text-muted-foreground">NFes</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-foreground">
                          {formatCurrency(group.totalValue)}
                        </p>
                        <p className="text-xs text-muted-foreground">Valor Total</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column: Available Rules */}
            <div className="w-[70%] p-6 overflow-y-auto flex flex-col bg-white">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg text-foreground">Regras Disponíveis</h3>
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
              ) : regrasError ? (
                <Card className="border-destructive/40 bg-destructive/10">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                    <p className="text-foreground">Erro ao carregar regras</p>
                  </CardContent>
                </Card>
              ) : regrasNCM?.regras && regrasNCM.regras.length > 0 ? (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {regrasNCM.regras.map((regra: RegraICMSST) => (
                    <Card
                      key={regra.id}
                      className={cn(
                        "cursor-pointer transition-all",
                        selectedRegraId === regra.id
                          ?'border-primary bg-primary/5 ring-2 ring-ring/20'
                          :'border-border hover:border-primary/40 hover:bg-muted'
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
                                  "text-sm",
                                  selectedRegraId === regra.id
                                    ? 'border-primary text-primary'
                                    : ''
                                )}
                              >
                                {regra.tipo_st}
                              </Badge>
                              <span className="font-bold text-xl text-foreground">
                                {regra.aliquota_st}%
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {regra.base_legal}
                            </p>
                            {regra.percentual_reducao && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Redução: <span className="font-medium">{regra.percentual_reducao}%</span>
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {regra.convenio && (
                              <Badge variant="secondary" className="text-xs">
                                Convênio: {regra.convenio}
                              </Badge>
                            )}
                            {regra.anexo && (
                              <Badge variant="secondary" className="text-xs">
                                {regra.anexo}
                              </Badge>
                            )}
                            {selectedRegraId === regra.id && (
                              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-warning/40 bg-warning/10">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-3" />
                    <p className="text-foreground font-medium">
                      Nenhuma regra ST encontrada para este NCM
                    </p>
                    {regrasNCM?.descricao && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {regrasNCM.descricao}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="h-16 px-6 border-t border-border bg-white flex items-center justify-end gap-3 flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => handleSaveDecision('REGRA_SELECIONADA', selectedRegraId)}
            disabled={!selectedRegraId || isSaving}
            className="bg-primary hover:bg-primary/90"
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

export default DifalAuditModal;
