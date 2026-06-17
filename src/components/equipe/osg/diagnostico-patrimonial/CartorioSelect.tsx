import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { UF_STATES } from '@/components/equipe/client-form/constants';
import {
  useCartorios, useUpsertCartorio, useDeleteCartorio, type CartorioRow,
} from '@/hooks/useDiagnosticoPatrimonial';

interface CartorioSelectProps {
  value: string;
  onChange: (cartorioId: string) => void;
  disabled?: boolean;
}

const emptyDraft = { nome_completo: '', comarca: '', uf: '' };

export function CartorioSelect({ value, onChange, disabled }: CartorioSelectProps) {
  const { data: cartorios = [], isLoading } = useCartorios();
  const upsert = useUpsertCartorio();
  const deleteCartorio = useDeleteCartorio();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  // null = criando; preenchido = editando este cartório.
  const [editing, setEditing] = useState<CartorioRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CartorioRow | null>(null);
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft);

  const selected = useMemo(
    () => cartorios.find((c) => c.id === value) ?? null,
    [cartorios, value],
  );

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft);
    setFormOpen(true);
  };

  const openEdit = (c: CartorioRow) => {
    setEditing(c);
    setDraft({ nome_completo: c.nome_completo, comarca: c.comarca, uf: c.uf });
    setFormOpen(true);
  };

  const handleSave = () => {
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
          comarca: draft.comarca.trim(),
          uf: draft.uf,
        },
        original: editing,
      },
      {
        onSuccess: ({ row }: { row: CartorioRow }) => {
          if (!editing) onChange(row.id);
          setFormOpen(false);
          setEditing(null);
          setDraft(emptyDraft);
        },
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteCartorio.mutate(deleteTarget, {
      onSuccess: (c) => {
        // Se o cartório removido era o selecionado, limpa a seleção do formulário.
        if (c.id === value) onChange('');
      },
      onSettled: () => setDeleteTarget(null),
    });
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
                    className="group data-[selected=true]:bg-osg-moss data-[selected=true]:text-white"
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
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm truncate">{c.nome_completo}</span>
                      <span className="text-xs text-muted-foreground group-data-[selected=true]:text-white/80">
                        {c.comarca}/{c.uf}
                      </span>
                    </div>
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-data-[selected=true]:opacity-100">
                      <button
                        type="button"
                        title="Editar cartório"
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/20"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpen(false);
                          openEdit(c);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Excluir cartório"
                        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-white/20"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpen(false);
                          setDeleteTarget(c);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
                    openCreate();
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

      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cartório' : 'Novo cartório'}</DialogTitle>
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
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={upsert.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
              {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? 'Salvar alterações' : 'Cadastrar cartório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartório?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o cartório "{deleteTarget?.nome_completo} — {deleteTarget?.comarca}/{deleteTarget?.uf}"?
              Cartórios em uso por matrículas não podem ser removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCartorio.isPending}
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
