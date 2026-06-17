import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const normalizeSearch = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  hasError?: boolean;
  id?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  /** Ação fixa no topo do painel (ex.: "+ Cadastrar novo"). Fecha o painel ao clicar. */
  footerAction?: { label: string; onClick: () => void };
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  disabled,
  className = '',
  compact,
  hasError,
  id,
  ariaLabel,
  style,
  footerAction,
}: SelectProps) {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const listboxId = `${buttonId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedIndex = useMemo(() => options.findIndex(o => o.value === value), [options, value]);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : '';
  const searchable = Boolean(footerAction);

  const filteredOptions = useMemo(() => {
    const normalizedSearch = normalizeSearch(searchTerm);
    return options
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => {
        if (!searchable || !normalizedSearch) return true;
        return normalizeSearch(`${option.label} ${option.value}`).includes(normalizedSearch);
      });
  }, [options, searchTerm, searchable]);

  const recomputePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxPanelHeight = 320;
    const openUp = spaceBelow < maxPanelHeight && rect.top > spaceBelow;
    setPos({
      top: openUp ? rect.top + window.scrollY : rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (open) recomputePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => recomputePosition();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const activeIsVisible = filteredOptions.some(({ option, index }) => index === activeIndex && !option.disabled);
      if (!activeIsVisible) {
        const selectedVisible = filteredOptions.find(({ option, index }) => index === selectedIndex && !option.disabled);
        const firstEnabled = filteredOptions.find(({ option }) => !option.disabled);
        setActiveIndex(selectedVisible?.index ?? firstEnabled?.index ?? -1);
      }
    } else {
      setActiveIndex(-1);
      setSearchTerm('');
    }
  }, [open, filteredOptions, selectedIndex, activeIndex]);

  useEffect(() => {
    if (!open || !searchable) return;
    window.requestAnimationFrame(() => searchRef.current?.focus());
  }, [open, searchable]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLLIElement>(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const moveActive = (delta: number) => {
    const enabledOptions = filteredOptions.filter(({ option }) => !option.disabled);
    if (!enabledOptions.length) return;
    const currentPosition = enabledOptions.findIndex(({ index }) => index === activeIndex);
    const basePosition = currentPosition >= 0 ? currentPosition : (delta > 0 ? -1 : 0);
    const nextPosition = (basePosition + delta + enabledOptions.length) % enabledOptions.length;
    setActiveIndex(enabledOptions[nextPosition].index);
  };

  const commit = (i: number) => {
    const opt = options[i];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const isSearchInput = e.target === searchRef.current;
    if (open && isSearchInput) {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); return; }
      if (e.key === 'Enter') { e.preventDefault(); commit(activeIndex); return; }
      return;
    }
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); return; }
    if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(filteredOptions.find(({ option }) => !option.disabled)?.index ?? -1);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      const lastEnabled = [...filteredOptions].reverse().find(({ option }) => !option.disabled);
      setActiveIndex(lastEnabled?.index ?? -1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); commit(activeIndex); return; }
    if (e.key === 'Tab') { setOpen(false); return; }
  };

  const triggerCls = [
    'custom-select-trigger',
    compact ? 'custom-select-compact' : '',
    open ? 'is-open' : '',
    hasError ? 'has-error' : '',
    disabled ? 'is-disabled' : '',
    selectedLabel ? '' : 'is-placeholder',
    className,
  ].filter(Boolean).join(' ');

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const scrollX = typeof window !== 'undefined' ? window.scrollX : 0;
  const availablePanelWidth = Math.max(260, viewportWidth - 24);
  const panelWidth = pos
    ? Math.min(searchable ? Math.max(pos.width, 620) : pos.width, availablePanelWidth)
    : 0;
  const panelLeft = pos
    ? Math.max(scrollX + 12, Math.min(pos.left, scrollX + viewportWidth - panelWidth - 12))
    : 0;

  return (
    <div className="custom-select-wrapper" style={style}>
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        className={triggerCls}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
      >
        <span className="custom-select-value">{selectedLabel || placeholder}</span>
        <span className="custom-select-caret" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          className={`custom-select-panel ${pos.openUp ? 'opens-up' : ''}`}
          style={{
            position: 'absolute',
            top: pos.openUp ? undefined : pos.top + 4,
            left: panelLeft,
            width: panelWidth,
            ...(pos.openUp ? { bottom: window.innerHeight - pos.top + 4 } : {}),
          }}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {searchable && (
            <div className="custom-select-topbar">
              <div className="custom-select-search-wrap">
                <input
                  ref={searchRef}
                  type="search"
                  className="custom-select-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome..."
                  aria-label="Buscar opção por nome"
                />
              </div>
              {footerAction && (
                <button
                  type="button"
                  className="custom-select-top-action"
                  aria-label={footerAction.label}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    footerAction.onClick();
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span className="custom-select-top-action-label">{footerAction.label}</span>
                </button>
              )}
            </div>
          )}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-activedescendant={activeIndex >= 0 ? `${buttonId}-opt-${activeIndex}` : undefined}
            className="custom-select-options"
          >
          {filteredOptions.length === 0 && (
            <li className="custom-select-empty" aria-disabled="true">
              {options.length === 0 ? 'Sem opções' : 'Nenhuma opção encontrada'}
            </li>
          )}
          {filteredOptions.map(({ option: opt, index: i }) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={`${opt.value}-${i}`}
                id={`${buttonId}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                data-index={i}
                className={[
                  'custom-select-option',
                  isSelected ? 'is-selected' : '',
                  isActive ? 'is-active' : '',
                  opt.disabled ? 'is-disabled' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => !opt.disabled && setActiveIndex(i)}
                onMouseDown={(e) => { e.preventDefault(); commit(i); }}
              >
                <span className="custom-select-option-label">{opt.label}</span>
                {isSelected && (
                  <span className="custom-select-option-check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </li>
            );
          })}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
