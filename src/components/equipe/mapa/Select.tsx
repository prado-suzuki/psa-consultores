import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

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
}: SelectProps) {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const listboxId = `${buttonId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; openUp: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = useMemo(() => options.findIndex(o => o.value === value), [options, value]);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : '';

  const recomputePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const maxPanelHeight = 280;
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
      if (listRef.current?.contains(target)) return;
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
    if (open && activeIndex < 0) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex(o => !o.disabled));
    }
    if (!open) setActiveIndex(-1);
  }, [open, options, selectedIndex, activeIndex]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelector<HTMLLIElement>(`[data-index="${activeIndex}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const moveActive = (delta: number) => {
    if (!options.length) return;
    let i = activeIndex;
    for (let step = 0; step < options.length; step++) {
      i = (i + delta + options.length) % options.length;
      if (!options[i].disabled) {
        setActiveIndex(i);
        return;
      }
    }
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
    if (e.key === 'Home') { e.preventDefault(); setActiveIndex(options.findIndex(o => !o.disabled)); return; }
    if (e.key === 'End') {
      e.preventDefault();
      for (let i = options.length - 1; i >= 0; i--) {
        if (!options[i].disabled) { setActiveIndex(i); break; }
      }
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
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={activeIndex >= 0 ? `${buttonId}-opt-${activeIndex}` : undefined}
          className={`custom-select-panel ${pos.openUp ? 'opens-up' : ''}`}
          style={{
            position: 'absolute',
            top: pos.openUp ? undefined : pos.top + 4,
            left: pos.left,
            width: pos.width,
            ...(pos.openUp ? { bottom: window.innerHeight - pos.top + 4 } : {}),
          }}
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {options.length === 0 && (
            <li className="custom-select-empty" aria-disabled="true">Sem opções</li>
          )}
          {options.map((opt, i) => {
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
        </ul>,
        document.body,
      )}
    </div>
  );
}
