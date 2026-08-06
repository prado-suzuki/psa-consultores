import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { cn } from '@/lib/utils';
import type { EntidadeOpcao } from './DocUploadDialog';

// Dropdown de vínculo com blocos por ENTIDADE (Pessoas Físicas/Jurídicas, Bens,
// Matrículas). Cada bloco abre como um acordeão (um por vez), evitando rolar uma
// lista longa. O value viaja codificado: "sem" | "pessoa:<id>" | "bem:<id>" | "matricula:<id>".

interface Bloco {
  key: string;
  label: string;
  itens: EntidadeOpcao[];
  prefixo: 'pessoa' | 'bem' | 'matricula';
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  pessoasPF: EntidadeOpcao[];
  pessoasPJ: EntidadeOpcao[];
  bens: EntidadeOpcao[];
  matriculas: EntidadeOpcao[];
  /** Some com a opção "Sem vínculo" onde ela não faz sentido (modo Classificar: lá
   *  quem cumpre esse papel é a válvula "não é de ninguém", no balde). */
  mostrarSemVinculo?: boolean;
  /** Texto exibido enquanto nada foi escolhido (quando não há opção "Sem vínculo"). */
  placeholder?: string;
}

export function VinculoSelect({
  value, onChange, pessoasPF, pessoasPJ, bens, matriculas,
  mostrarSemVinculo = true, placeholder = 'Selecione...',
}: Props) {
  const [open, setOpen] = useState(false);
  const [blocoAberto, setBlocoAberto] = useState<string | null>(null);

  const blocos: Bloco[] = useMemo(
    () =>
      [
        { key: 'pf', label: 'Pessoas Físicas', itens: pessoasPF, prefixo: 'pessoa' as const },
        { key: 'pj', label: 'Pessoas Jurídicas', itens: pessoasPJ, prefixo: 'pessoa' as const },
        { key: 'bens', label: 'Bens', itens: bens, prefixo: 'bem' as const },
        { key: 'matriculas', label: 'Matrículas', itens: matriculas, prefixo: 'matricula' as const },
      ].filter((b) => b.itens.length > 0),
    [pessoasPF, pessoasPJ, bens, matriculas],
  );

  const semVinculo = value === 'sem' || !value;
  const labelAtual = useMemo(() => {
    if (semVinculo) return mostrarSemVinculo ? 'Sem vínculo — apenas o cliente' : placeholder;
    const [, id] = value.split(':');
    return (
      [...pessoasPF, ...pessoasPJ, ...bens, ...matriculas].find((e) => e.id === id)?.label ?? 'Selecionado'
    );
  }, [value, semVinculo, mostrarSemVinculo, placeholder, pessoasPF, pessoasPJ, bens, matriculas]);

  const escolher = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  // Ao abrir, já expande o bloco do item selecionado (se houver).
  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && !semVinculo) {
      const [kind, id] = value.split(':');
      const b = blocos.find((bl) => bl.prefixo === kind && bl.itens.some((i) => i.id === id));
      setBlocoAberto(b?.key ?? null);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            // Mesmas classes-base do SelectTrigger (ui/select) + fieldCls, para
            // ficar idêntico aos demais campos (Categoria/Tipo).
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            fieldCls,
          )}
        >
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left',
              semVinculo && !mostrarSemVinculo && 'text-muted-foreground',
            )}
          >
            {labelAtual}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto p-1"
      >
        {mostrarSemVinculo && (
          <>
            <button
              type="button"
              onClick={() => escolher('sem')}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-osg-50"
            >
              <span>Sem vínculo — apenas o cliente</span>
              {semVinculo && <Check className="h-4 w-4 shrink-0 text-osg-700" />}
            </button>

            <div className="my-1 h-px bg-osg-100" />
          </>
        )}

        <div>
          {blocos.map((b) => {
            const aberto = blocoAberto === b.key;
            return (
              <div key={b.key}>
                <button
                  type="button"
                  onClick={() => setBlocoAberto(aberto ? null : b.key)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-osg-700 hover:bg-osg-50"
                  aria-expanded={aberto}
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none',
                      aberto && 'rotate-90',
                    )}
                  />
                  <span className="flex-1 text-left">{b.label}</span>
                  <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[11px] tabular-nums text-slate-500">
                    {b.itens.length}
                  </span>
                </button>

                <div
                  className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                    aberto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                  )}
                >
                  <div className="overflow-hidden">
                    {b.itens.map((it) => {
                      const v = `${b.prefixo}:${it.id}`;
                      const sel = v === value;
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => escolher(v)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-md py-1.5 pl-7 pr-2 text-sm hover:bg-osg-50',
                            sel ? 'font-medium text-osg-700' : 'text-slate-700',
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-left">{it.label}</span>
                          {sel && <Check className="h-4 w-4 shrink-0 text-osg-700" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
