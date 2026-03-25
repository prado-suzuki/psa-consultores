import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FilterX, SlidersHorizontal, X, Check } from 'lucide-react';
import { Drawer, DrawerContent, DrawerClose, DrawerTitle } from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'search' | 'daterange' | 'segmented';
  options?: { value: string; label: string }[];
  placeholder?: string;
  width?: string;
}

interface BoardFilterBarProps {
  filters: FilterConfig[];
  onFilterChange: (key: string, value: string | string[]) => void;
  activeFilters: Record<string, string | string[]>;
  onReset?: () => void;
  activeCount?: number;
  rightSlot?: React.ReactNode;
  resultCount?: number;
  totalCount?: number;
}

export const BoardFilterBar: React.FC<BoardFilterBarProps> = ({
  filters, onFilterChange, activeFilters, onReset, activeCount = 0,
  rightSlot, resultCount, totalCount,
}) => {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const handleSearchChange = useCallback((key: string, value: string) => {
    setSearchDebounce(prev => ({ ...prev, [key]: value }));
    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => onFilterChange(key, value), 300);
  }, [onFilterChange]);

  useEffect(() => {
    return () => { Object.values(debounceTimers.current).forEach(clearTimeout); };
  }, []);

  const renderFilter = (f: FilterConfig, vertical = false) => {
    const val = activeFilters[f.key];
    const style = vertical ? { width: '100%' } : { width: f.width || 'auto' };

    switch (f.type) {
      case 'segmented':
        return (
          <div key={f.key} className="flex items-center gap-1.5" style={vertical ? { flexDirection: 'column', alignItems: 'stretch' } : {}}>
            {!vertical && <span className="v3-fi-label">{f.label}</span>}
            {vertical && <span className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.label}</span>}
            <div className="v3-segs" style={vertical ? { width: '100%' } : {}}>
              {f.options?.map(o => (
                <button key={o.value} className={`v3-seg ${val === o.value ? 'on' : ''}`} onClick={() => onFilterChange(f.key, o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={f.key} className="flex items-center gap-1.5" style={vertical ? { flexDirection: 'column', alignItems: 'stretch' } : {}}>
            {!vertical && <span className="v3-fi-label">{f.label}</span>}
            {vertical && <span className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.label}</span>}
            <select
              className="v3-fi"
              value={val as string}
              onChange={e => onFilterChange(f.key, e.target.value)}
              aria-label={f.label}
              style={{ ...style, padding: '4px 9px' }}
            >
              {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        );

      case 'multiselect':
        return (
          <MultiselectFilter
            key={f.key}
            config={f}
            value={(val as string[]) || []}
            onChange={v => onFilterChange(f.key, v)}
            vertical={vertical}
          />
        );

      case 'search':
        return (
          <div key={f.key} style={vertical ? { width: '100%' } : {}}>
            {vertical && <span className="text-xs font-semibold mb-1 block" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.label}</span>}
            <input
              className="v3-fi"
              placeholder={f.placeholder || `Buscar...`}
              value={searchDebounce[f.key] ?? (val as string) ?? ''}
              onChange={e => handleSearchChange(f.key, e.target.value)}
              aria-label={f.label}
              style={{ ...style, padding: '5px 10px', minWidth: vertical ? '100%' : 140 }}
            />
          </div>
        );

      case 'daterange':
        const dates = (val as string) || '';
        const [from, to] = dates.split('|');
        return (
          <div key={f.key} className="flex items-center gap-1.5" style={vertical ? { flexDirection: 'column', alignItems: 'stretch' } : {}}>
            {vertical && <span className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{f.label}</span>}
            <input type="date" className="v3-fi" value={from || ''} onChange={e => onFilterChange(f.key, `${e.target.value}|${to || ''}`)} aria-label={`${f.label} de`} style={{ padding: '4px 6px' }} />
            <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>até</span>
            <input type="date" className="v3-fi" value={to || ''} onChange={e => onFilterChange(f.key, `${from || ''}|${e.target.value}`)} aria-label={`${f.label} até`} style={{ padding: '4px 6px' }} />
          </div>
        );

      default:
        return null;
    }
  };

  // Mobile: collapsed into drawer
  if (isMobile) {
    return (
      <>
        <div className="v3-fbar" style={{ justifyContent: 'space-between' }}>
          <button className="v3-fi" onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}>
            <SlidersHorizontal style={{ width: 13, height: 13 }} />
            Filtros
            {activeCount > 0 && <span className="v3-fi-badge">{activeCount}</span>}
          </button>
          {rightSlot}
        </div>
        {resultCount !== undefined && totalCount !== undefined && resultCount < totalCount && (
          <div className="v3-fi-count" aria-live="polite">Exibindo {resultCount} de {totalCount} itens</div>
        )}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="px-4 pb-6 pt-2">
            <DrawerTitle className="text-sm font-bold mb-4">Filtros</DrawerTitle>
            <div className="space-y-4">
              {filters.map(f => renderFilter(f, true))}
            </div>
            <div className="flex gap-2 mt-6">
              <button className="v3-fi flex-1" style={{ padding: '8px 12px', fontWeight: 600 }} onClick={() => setDrawerOpen(false)}>Aplicar</button>
              {onReset && activeCount > 0 && (
                <button className="v3-fi flex-1" style={{ padding: '8px 12px', color: 'hsl(var(--destructive))' }} onClick={() => { onReset(); setDrawerOpen(false); }}>Limpar tudo</button>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop
  return (
    <>
      <div className="v3-fbar">
        {filters.map(f => renderFilter(f))}
        {activeCount > 0 && (
          <>
            <span className="v3-fi-badge">{activeCount} filtro{activeCount > 1 ? 's' : ''} ativo{activeCount > 1 ? 's' : ''}</span>
            {onReset && (
              <button className="v3-fi-reset" onClick={onReset}>
                <X style={{ width: 11, height: 11 }} /> Limpar filtros
              </button>
            )}
          </>
        )}
        {rightSlot && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{rightSlot}</div>}
      </div>
      {resultCount !== undefined && totalCount !== undefined && resultCount < totalCount && (
        <div className="v3-fi-count" aria-live="polite">Exibindo {resultCount} de {totalCount} itens</div>
      )}
    </>
  );
};

// ---- Multiselect sub-component ----
const MultiselectFilter: React.FC<{
  config: FilterConfig;
  value: string[];
  onChange: (v: string[]) => void;
  vertical?: boolean;
}> = ({ config, value, onChange, vertical }) => {
  const allSelected = value.length === 0 || (config.options && value.length === config.options.length);
  const label = allSelected ? (config.placeholder || `Todos`) : `${value.length} selecionado${value.length > 1 ? 's' : ''}`;

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  return (
    <div className="flex items-center gap-1.5" style={vertical ? { flexDirection: 'column', alignItems: 'stretch' } : {}}>
      {vertical && <span className="text-xs font-semibold mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{config.label}</span>}
      {!vertical && <span className="v3-fi-label">{config.label}</span>}
      <Popover>
        <PopoverTrigger asChild>
          <button className="v3-fi" style={{ padding: '4px 9px', display: 'flex', alignItems: 'center', gap: 4 }} aria-label={config.label}>
            {label}
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.5 }}><path d="M2 4l3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.5" /></svg>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <div role="listbox" aria-multiselectable="true" className="space-y-1">
            {config.options?.map(o => (
              <label key={o.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm">
                <Checkbox checked={value.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Empty state when filters result in 0 items
export const FilterEmptyState: React.FC<{ onReset?: () => void }> = ({ onReset }) => (
  <div className="v3-fi-empty">
    <FilterX style={{ width: 32, height: 32, color: 'hsl(var(--muted-foreground))', marginBottom: 8, opacity: 0.5 }} />
    <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 8 }}>Nenhum resultado para os filtros aplicados</p>
    {onReset && (
      <button className="v3-fi" onClick={onReset} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600 }}>Limpar filtros</button>
    )}
  </div>
);
