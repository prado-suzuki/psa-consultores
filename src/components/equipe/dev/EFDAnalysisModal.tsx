import { useState, useEffect, useMemo } from 'react';
import { X, BarChart3, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EFDBlockTree } from './EFDBlockTree';
import { EFDFiscalTable } from './EFDFiscalTable';
import { REG_DESCRIPTIONS } from '@/constants/efdConfig';
import { useEFDDetail } from '@/hooks/useEFDData';
import type { EFDArquivo, BlocoRegistro } from '@/types/efd';

interface EFDAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arquivo: EFDArquivo | null;
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  cnpj: string;
}

export function EFDAnalysisModal({
  open,
  onOpenChange,
  arquivo,
  blocosDisponiveis,
  cnpj,
}: EFDAnalysisModalProps) {
  const [selectedRegistro, setSelectedRegistro] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  // Selecionar primeiro registro ao abrir
  useEffect(() => {
    if (open && arquivo) {
      const blocos = Object.keys(blocosDisponiveis);
      if (blocos.length > 0) {
        const primeiroBloco = blocos[0];
        const registros = blocosDisponiveis[primeiroBloco];
        if (registros && registros.length > 0) {
          setSelectedRegistro(registros[0].codigo);
        }
      }
      setCurrentPage(1);
    }
  }, [open, arquivo, blocosDisponiveis]);

  // Reset página ao mudar registro
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRegistro]);

  // Buscar dados do registro selecionado
  const { 
    data: detail, 
    isLoading: loadingDetail 
  } = useEFDDetail(
    arquivo && selectedRegistro ? {
      cnpj: cnpj || arquivo.CNPJ,
      idArquivo: arquivo.ID_ARQUIVO,
      registro: selectedRegistro,
      page: currentPage,
      limit: 100,
    } : undefined
  );

  // Formatadores
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue || 0);
  };

  const formatPeriodo = (dtIni: string, dtFin: string) => {
    // Formato ISO: 2022-12-01 -> 01/12/2022
    const formatDate = (date: string) => {
      if (!date) return '';
      if (date.includes('-')) {
        const [y, m, d] = date.split('-');
        return `${d}/${m}/${y}`;
      }
      return date;
    };
    return `${formatDate(dtIni)} a ${formatDate(dtFin)}`;
  };

  // Info do registro selecionado
  const regCode = selectedRegistro.replace('REG_', '');
  const regDescription = REG_DESCRIPTIONS[regCode] || detail?.descricao || 'Registro SPED';

  // Paginação
  const totalPaginas = detail?.paginacao?.total_paginas || 1;
  const podeIrAnterior = currentPage > 1;
  const podeIrProxima = currentPage < totalPaginas;

  // Dados da tabela
  const tableData = useMemo(() => {
    return (detail?.dados || []) as Record<string, unknown>[];
  }, [detail]);

  if (!arquivo) return null;

  return (
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
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <span>{arquivo.NOME}</span>
                <Badge 
                  variant={arquivo.TIPO_ESCRIT === 0 ? 'default' : 'secondary'}
                  className="text-xs uppercase"
                >
                  {arquivo.TIPO_ESCRIT === 0 ? 'Original' : 'Retificadora'}
                </Badge>
              </h3>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">
                Período: <span className="text-slate-700 dark:text-slate-300">
                  {formatPeriodo(arquivo.DT_INI, arquivo.DT_FIN)}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Totais PIS/COFINS */}
            <div className="hidden xl:flex items-center gap-8 border-r border-slate-200 dark:border-slate-700 pr-6 h-12">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total PIS</p>
                <p className="text-lg font-mono font-bold text-slate-800 dark:text-white">
                  {formatCurrency(arquivo.pis_devido)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total COFINS</p>
                <p className="text-lg font-mono font-bold text-slate-800 dark:text-white">
                  {formatCurrency(arquivo.cofins_devido)}
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
          {/* Sidebar - Árvore de Blocos */}
          <aside className="w-72 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 flex flex-col flex-shrink-0">
            <div className="flex-1 overflow-y-auto p-4">
              <EFDBlockTree
                blocosDisponiveis={blocosDisponiveis}
                selectedRegistro={selectedRegistro}
                onSelectRegistro={setSelectedRegistro}
              />
            </div>
          </aside>

          {/* Área Principal */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
            {/* Header do Registro */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 bg-white dark:bg-slate-900 flex-shrink-0">
              <div className="flex items-center gap-4">
                <Badge className="bg-primary text-primary-foreground text-sm font-mono font-bold px-4 py-1.5 shadow-sm">
                  REG {regCode}
                </Badge>
                <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                  {regDescription}
                </h4>
              </div>
              
              {loadingDetail && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
            </div>
            
            {/* Tabela de Dados */}
            <div className="flex-1 overflow-auto bg-slate-50/30 dark:bg-slate-800/20">
              <EFDFiscalTable
                data={tableData}
                isLoading={loadingDetail}
                emptyMessage={`Nenhum dado encontrado para o registro ${regCode}`}
                className="h-full"
              />
            </div>

            {/* Footer - Paginação */}
            {detail?.paginacao && (
              <div className="h-12 px-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between flex-shrink-0">
                <span className="text-xs text-slate-500">
                  Exibindo {tableData.length} de {detail.paginacao.total_registros} registros
                </span>
                
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Página {detail.paginacao.page} de {detail.paginacao.total_paginas}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!podeIrAnterior || loadingDetail}
                      onClick={() => setCurrentPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!podeIrProxima || loadingDetail}
                      onClick={() => setCurrentPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
