import { ChevronDown, Loader2, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGerarApresentacao, type DeckTipo } from '@/hooks/useGerarApresentacao';

// Menu do cabeçalho: gera a apresentação PSA (decks Patrimonial + Societária) do cliente.
export function GerarApresentacaoMenu({ clienteId }: { clienteId: string }) {
  const { gerar, gerando } = useGerarApresentacao(clienteId);
  const busy = gerando !== null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Presentation className="mr-2 h-4 w-4" />}
          {busy ? 'Gerando…' : 'Gerar apresentação'}
          <ChevronDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Apresentação PSA (.pptx)</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => gerar('ambas')} className="gap-2">
          Apresentação completa
          <span className="ml-auto text-[11px] text-muted-foreground">2 decks</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => gerar('patrimonial')}>Só Organização Patrimonial</DropdownMenuItem>
        <DropdownMenuItem onClick={() => gerar('societaria')}>Só Organização Societária</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Botão contextual: gera um deck específico, dentro do relatório correspondente.
export function GerarDeckButton({ clienteId, tipo, label }: { clienteId: string; tipo: DeckTipo; label: string }) {
  const { gerar, gerando } = useGerarApresentacao(clienteId);
  const busy = gerando === tipo;
  return (
    <Button size="sm" onClick={() => gerar(tipo)} disabled={gerando !== null}>
      {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Presentation className="mr-2 h-3.5 w-3.5" />}
      {busy ? 'Gerando…' : label}
    </Button>
  );
}
