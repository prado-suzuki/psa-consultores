import { useState } from 'react';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { fieldCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

interface FiliacaoComboboxProps {
  nome: string;
  pessoaId: string;
  candidates: PessoaRow[];
  placeholder: string;
  onChange: (nome: string, pessoaId: string) => void;
}

export function FiliacaoCombobox({ nome, pessoaId, candidates, placeholder, onChange }: FiliacaoComboboxProps) {
  const [open, setOpen] = useState(false);
  const termo = nome.trim().toLowerCase();
  const suggestions = termo
    ? candidates.filter((candidate) => (candidate.denominacao ?? '').toLowerCase().includes(termo)).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <Input
        value={nome}
        onChange={(event) => { onChange(event.target.value, ''); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`${fieldCls} ${pessoaId ? 'pr-8' : ''}`}
      />
      {pessoaId && <Check className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-osg-moss" />}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md">
          {suggestions.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-osg-moss hover:text-white"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(candidate.denominacao ?? '', candidate.id);
                  setOpen(false);
                }}
              >
                <span className="truncate">{candidate.denominacao}</span>
                {pessoaId === candidate.id && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
