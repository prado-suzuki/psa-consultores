import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { generateColumnsFromData, formatEFDValue } from '@/constants/efdConfig';
import type { EFDColumnConfig } from '@/types/efd';

interface EFDFiscalTableProps {
  data: Record<string, unknown>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function EFDFiscalTable({ 
  data, 
  isLoading, 
  emptyMessage = 'Nenhum registro encontrado',
  className 
}: EFDFiscalTableProps) {
  // Gerar colunas dinamicamente a partir dos dados
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return generateColumnsFromData(data);
  }, [data]);

  // Agrupar colunas por categoria
  const columnGroups = useMemo(() => {
    if (columns.length === 0) return [];
    
    const groups: { name: string; columns: EFDColumnConfig[] }[] = [];
    let currentGroup = '';
    
    columns.forEach(col => {
      if (col.group !== currentGroup) {
        currentGroup = col.group;
        groups.push({ name: col.group, columns: [col] });
      } else {
        groups[groups.length - 1].columns.push(col);
      }
    });
    
    return groups;
  }, [columns]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p className="font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "overflow-auto",
        "[&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3",
        "[&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:border-l [&::-webkit-scrollbar-track]:border-t [&::-webkit-scrollbar-track]:border-slate-200",
        "[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full",
        "[&::-webkit-scrollbar-thumb:hover]:bg-slate-500",
        "dark:[&::-webkit-scrollbar-track]:bg-slate-800 dark:[&::-webkit-scrollbar-track]:border-slate-700",
        "dark:[&::-webkit-scrollbar-thumb]:bg-slate-600",
        className
      )}
    >
      <table className="w-full min-w-max text-left border-collapse">
        <thead className="bg-slate-200 dark:bg-slate-800 sticky top-0 z-10 shadow-sm">
          {/* Header de Grupos (primeira linha) */}
          <tr className="border-b border-slate-300 dark:border-slate-700">
            {columnGroups.map((group, groupIdx) => (
              <th
                key={group.name}
                colSpan={group.columns.length}
                className={cn(
                  "text-center font-bold text-xs text-slate-600 dark:text-slate-300 py-2 uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80",
                  groupIdx > 0 && "border-l-2 border-slate-300 dark:border-slate-600"
                )}
              >
                {group.name}
              </th>
            ))}
          </tr>
          
          {/* Header de Colunas (segunda linha) */}
          <tr className="bg-slate-200 dark:bg-slate-800">
            {columns.map((col, idx) => {
              const isFirstOfGroup = idx === 0 || columns[idx - 1].group !== col.group;
              
              return (
                <th
                  key={col.id}
                  className={cn(
                    "px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase whitespace-nowrap min-w-[120px]",
                    "border-r border-slate-300 dark:border-slate-600 last:border-r-0",
                    isFirstOfGroup && idx > 0 && "border-l-2 border-slate-300 dark:border-slate-600"
                  )}
                >
                  {col.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
          {data.map((row, rowIdx) => (
            <tr 
              key={rowIdx} 
              className={cn(
                "hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors",
                rowIdx % 2 === 1 && "bg-slate-50 dark:bg-slate-800/30"
              )}
            >
              {columns.map((col, colIdx) => {
                const isFirstOfGroup = colIdx === 0 || columns[colIdx - 1].group !== col.group;
                
                return (
                  <td
                    key={col.id}
                    className={cn(
                      "px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap",
                      "border-r border-slate-200 dark:border-slate-700 last:border-r-0",
                      isFirstOfGroup && colIdx > 0 && "border-l border-slate-200 dark:border-slate-600"
                    )}
                  >
                    {formatEFDValue(row[col.id], col.id)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
