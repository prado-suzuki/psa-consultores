import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link2 } from 'lucide-react';
import {
  useOrphanMatriculas,
  useSetMatriculaBem,
} from '@/hooks/useDiagnosticoPatrimonial';

interface VincularMatriculaDialogProps {
  open: boolean;
  bemId: string;
  // Cliente do bem: restringe as órfãs às que têm titular desse cliente.
  clienteId: string;
  onClose: () => void;
}

// Busca restrita a matrículas órfãs (bem_id IS NULL) do mesmo cliente do bem e
// estabelece o vínculo atualizando apenas o bem_id da matrícula selecionada.
export function VincularMatriculaDialog({ open, bemId, clienteId, onClose }: VincularMatriculaDialogProps) {
  const { data: todasOrfas = [], isLoading } = useOrphanMatriculas();
  const setBem = useSetMatriculaBem();
  const orfas = todasOrfas.filter((m) => m.titular_cliente_ids.includes(clienteId));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Vincular matrícula existente
          </DialogTitle>
        </DialogHeader>
        <Command className="rounded-none border-t">
          <CommandInput placeholder="Buscar matrícula órfã (nº, cartório, município)..." />
          <CommandList>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhuma matrícula órfã disponível.</CommandEmpty>
                <CommandGroup>
                  {orfas.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={`${m.numero} ${m.cartorio_nome ?? ''} ${m.municipio_imovel} ${m.uf_imovel}`}
                      disabled={setBem.isPending}
                      onSelect={() => {
                        setBem.mutate(
                          { matricula: m, bemId },
                          { onSuccess: () => onClose() },
                        );
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-[10px] font-mono">Mat. {m.numero}</Badge>
                          <span className="text-sm">{m.municipio_imovel}/{m.uf_imovel}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {m.cartorio_nome ?? '—'}
                          {m.cartorio_comarca ? ` · ${m.cartorio_comarca}/${m.cartorio_uf}` : ''}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
