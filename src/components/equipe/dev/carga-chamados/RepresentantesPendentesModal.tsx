import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Users } from 'lucide-react';
import type { RepresentantePendente } from '@/hooks/useRepresentantesSemUsuario';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representantes: RepresentantePendente[];
  loading: boolean;
  running: boolean;
  onConfirmar: () => void;
  maxBatch: number;
}

export const RepresentantesPendentesModal = ({
  open,
  onOpenChange,
  representantes,
  loading,
  running,
  onConfirmar,
  maxBatch,
}: Props) => {
  const [busca, setBusca] = useState('');

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return representantes;
    return representantes.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.cliente_nome.toLowerCase().includes(q),
    );
  }, [busca, representantes]);

  const total = representantes.length;
  const excedeu = total > maxBatch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Representantes pendentes
          </DialogTitle>
          <DialogDescription>
            Representantes que ainda <strong>não</strong> possuem usuário no sistema, conforme o filtro selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="shrink-0">
            {total} pendentes
          </Badge>
        </div>

        {excedeu && (
          <p className="text-xs text-amber-600">
            Lote máximo por execução: {maxBatch}. Os primeiros {maxBatch} serão processados; rode novamente para os demais.
          </p>
        )}

        <ScrollArea className="h-[360px] rounded-md border">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Nenhum representante encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-2 font-medium">Nome</th>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Cliente</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => (
                  <tr key={r.id_representante} className="border-t">
                    <td className="p-2">{r.nome}</td>
                    <td className="p-2 text-muted-foreground">{r.email}</td>
                    <td className="p-2">{r.cliente_nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>

        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={running}>
            Cancelar
          </Button>
          <Button onClick={onConfirmar} disabled={running || total === 0}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Criar usuários ({Math.min(total, maxBatch)})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
