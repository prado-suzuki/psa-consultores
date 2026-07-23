import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { BLOCK_DESCRIPTIONS, REG_DESCRIPTIONS } from '@/constants/efdConfig';
import { cn } from '@/lib/utils';
import type { BlocoRegistro } from '@/types/efd';
import { ChevronDown } from 'lucide-react';

interface Props {
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  expanded: Set<string>;
  selected: Set<string>;
  onToggleBlockOpen: (block: string) => void;
  onToggleBlock: (block: string) => void;
  onToggleRecord: (code: string) => void;
}

export function EFDRecordSelector({ blocosDisponiveis, expanded, selected, onToggleBlockOpen, onToggleBlock, onToggleRecord }: Props) {
  return <div className={cn('flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50', '[&::-webkit-scrollbar]:w-3', '[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600', '[&::-webkit-scrollbar-thumb]:rounded-full')}>
    <div className="space-y-3">{Object.entries(blocosDisponiveis).map(([block, records]) => {
      const selectedCount = records.filter(record => selected.has(record.codigo)).length;
      const isExpanded = expanded.has(block);
      return <div key={block} className={cn('border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 transition-all duration-300', isExpanded && 'shadow-sm')}>
        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" onClick={() => onToggleBlockOpen(block)}>
          <div className="flex items-center gap-3">
            <div className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600" onClick={event => { event.stopPropagation(); onToggleBlock(block); }}>
              <Checkbox checked={selectedCount === records.length && records.length > 0} className={cn(selectedCount > 0 && selectedCount < records.length && 'opacity-50')} />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-white">{BLOCK_DESCRIPTIONS[block] || `Bloco ${block}`}</span>
            <Badge variant="secondary" className="text-[10px]">{selectedCount}/{records.length}</Badge>
          </div>
          <ChevronDown className={cn('h-5 w-5 text-slate-400 transition-transform duration-300', isExpanded && 'rotate-180')} />
        </div>
        <div className={cn('overflow-hidden transition-all duration-300', isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0')}>
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{records.map(record => {
              const code = record.codigo.replace('REG_', '');
              const isSelected = selected.has(record.codigo);
              return <label key={record.codigo} className={cn('flex items-start gap-2 cursor-pointer p-2 rounded-lg transition-colors border', isSelected ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-transparent hover:border-slate-200')}>
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleRecord(record.codigo)} className="mt-0.5" />
                <div className="flex flex-col min-w-0"><span className="text-xs font-bold font-mono">{code}</span><span className="text-[10px] text-slate-500 leading-tight truncate">{REG_DESCRIPTIONS[code] || record.descricao || 'Registro SPED'}</span></div>
              </label>;
            })}</div>
          </div>
        </div>
      </div>;
    })}</div>
  </div>;
}
