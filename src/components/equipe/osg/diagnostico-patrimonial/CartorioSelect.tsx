import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UF_STATES } from '@/components/equipe/client-form/constants';
import { useCartorios, useUpsertCartorio, type CartorioRow } from '@/hooks/useDiagnosticoPatrimonial';

interface CartorioSelectProps {
  value: string;
  onChange: (cartorioId: string) => void;
  disabled?: boolean;
}

export function CartorioSelect({ value, onChange, disabled }: CartorioSelectProps) {
  const { data: cartorios = [], isLoading } = useCartorios();
  const upsert = useUpsertCartorio();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<{ nome_completo: string; numero_oficio: string; comarca: string; uf: string }>({
    nome_completo: '', numero_oficio: '', comarca: '', uf: '',
  });

  const selected = useMemo(
    () => cartorios.find((c) => c.id === value) ?? null,
    [cartorios, value],
  );

  const handleCreate = () => {
    if (!draft.nome_completo.trim()) {
      toast.error('Informe o nome do cartório');
      return;
    }
    if (!draft.comarca.trim()) {
      toast.error('Informe a comarca');
      return;
    }
    if (!draft.uf) {
      toast.error('Selecione a UF');
      return;
    }

    upsert.mutate(
      {
        values: {
          nome_completo: draft.nome_completo.trim(),
          numero_oficio: draft.numero_oficio.trim() || null,
          comarca: draft.comarca.trim(),
          uf: draft.uf,
        },
        original: null,
      },
      {
        onSuccess: ({ row }: { row: CartorioRow }) => {
          onChange(row.id);
          setCreateOpen(false);
          setDraft({ nome_completo: '', numero_oficio: '', comarca: '', uf: '' });
        },
      },
    );
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled || isLoading}
            className={cn(
              'w-full h-9 justify-between font-normal',
              !selected && 'text-muted-foreground',
            )}
          >
            <span className="truncate">
              {selected
                ? `${selected.nome_completo} — ${selected.comarca}/${selected.uf}`
                : isLoading ? 'Carregando...' : 'Selecione um cartório'}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cartório..." />
            <CommandList>
              <CommandEmpty>Nenhum cartório encontrado.</CommandEmpty>
              <CommandGroup>
                {cartorios.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.nome_completo} ${c.comarca} ${c.uf}`}
                    className="data-[selected=true]:bg-osg-moss data-[selected=true]:text-white"
                    onSelect={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === c.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{c.nome_completo}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.comarca}/{c.uf}{c.numero_oficio ? ` · ${c.numero_oficio}º Ofício` : ''}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <div className="border-t p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Novo cartório
                </Button>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo cartório</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Nome completo<RequiredMark />
              </Label>
              <Input
                value={draft.nome_completo}
                onChange={(e) => setDraft((p) => ({ ...p, nome_completo: e.target.value }))}
                placeholder="Cartório de Registro de Imóveis de..."
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Nº do Ofício</Label>
                <Input
                  value={draft.numero_oficio}
                  onChange={(e) => setDraft((p) => ({ ...p, numero_oficio: e.target.value }))}
                  placeholder="ex: 1"
                  className="h-9"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Comarca<RequiredMark />
                </Label>
                <Input
                  value={draft.comarca}
                  onChange={(e) => setDraft((p) => ({ ...p, comarca: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  UF<RequiredMark />
                </Label>
                <Select value={draft.uf || undefined} onValueChange={(v) => setDraft((p) => ({ ...p, uf: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={upsert.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={upsert.isPending} className="gap-1.5">
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Cadastrar cartório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
