import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const DIFAL_TOOLTIPS = {
  cliente: 'Filtra os cálculos de DIFAL por cliente ou grupo.',
  contribuinte: 'CNPJ/CPF vinculado ao cliente. Obrigatório para a busca.',
  start_date: 'Define o período inicial da busca.',
  end_date: 'Define o período final da busca.',
  colStatus: 'Status atual da classificação tributária do item.',
  colProduto: 'Descrição do produto e código interno na nota fiscal.',
  colNcm: 'Nomenclatura Comum do Mercosul (NCM) do produto.',
  colCfop: 'Código Fiscal de Operações e Prestações (CFOP).',
  colTributacao: 'Situação Tributária (CST), Alíquota e Redução de Base de Cálculo originais.',
  colMvaSt: 'Regra de DIFAL/ST validada, incluindo alíquota e redução aplicáveis.',
  salvarAlteracoes: 'Sincroniza as decisões validadas na sessão com o banco de dados principal.',
  exportarExcel: 'Gera a planilha com todos os NCMs classificados no período.',
} as const;

type DifalTooltipName = keyof typeof DIFAL_TOOLTIPS;

export const FieldTooltip = ({ name }: { name: DifalTooltipName }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <TooltipContent
      side="top"
      className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]"
    >
      {DIFAL_TOOLTIPS[name]}
    </TooltipContent>
  </Tooltip>
);

export const ColumnTooltip = ({
  name,
  children,
}: {
  name: DifalTooltipName;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">
        {children}
      </span>
    </TooltipTrigger>
    <TooltipContent
      side="top"
      className="max-w-[220px] font-normal normal-case tracking-normal text-xs text-center"
    >
      {DIFAL_TOOLTIPS[name]}
    </TooltipContent>
  </Tooltip>
);

export const ButtonTooltip = ({
  name,
  children,
}: {
  name: DifalTooltipName;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent
      side="top"
      className="max-w-[220px] font-normal normal-case tracking-normal text-xs text-center"
    >
      {DIFAL_TOOLTIPS[name]}
    </TooltipContent>
  </Tooltip>
);
