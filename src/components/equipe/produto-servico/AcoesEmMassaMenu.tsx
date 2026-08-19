import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  /** Visíveis que ainda não estão vinculados. */
  faltamVincular: number;
  /** Visíveis já vinculados. */
  jaVinculados: number;
  onVincularVisiveis: () => void;
  onDesvincularVisiveis: () => void;
  /** "CHA — Canal de Chamados", para o texto da confirmação. */
  nomeDoProduto: string;
}

/**
 * As duas ações que alcançam a lista inteira, atrás de um menu.
 *
 * Antes eram dois links de texto soltos na barra de filtros — "Vincular os 90
 * visíveis" e "Desvincular os 16 visíveis" —, do tamanho de uma legenda e a um
 * clique de distância, sem confirmação nenhuma no caminho do vincular. São as
 * ações mais abrangentes da tela: mudam o que aparece no cadastro de projetos
 * de um produto inteiro.
 *
 * Agora as duas passam por confirmação, e a que desvincula sai em vermelho.
 * "Visíveis" é literal: respeita busca e filtro, e a confirmação diz o número.
 */
export default function AcoesEmMassaMenu({
  faltamVincular, jaVinculados, onVincularVisiveis, onDesvincularVisiveis, nomeDoProduto,
}: Props) {
  const [confirmar, setConfirmar] = useState<'vincular' | 'desvincular' | null>(null);
  const nada = faltamVincular === 0 && jaVinculados === 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" disabled={nada}>
            Ações em massa
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
            Alcança tudo o que está visível agora
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={faltamVincular === 0}
            onSelect={() => setConfirmar('vincular')}
          >
            <Check className="mr-2 h-3.5 w-3.5" />
            Vincular os {faltamVincular} visíveis
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={jaVinculados === 0}
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmar('desvincular')}
          >
            <X className="mr-2 h-3.5 w-3.5" />
            Desvincular os {jaVinculados} visíveis
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmar !== null} onOpenChange={(aberto) => !aberto && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmar === 'vincular'
                ? `Vincular ${faltamVincular} serviço(s)?`
                : `Desvincular ${jaVinculados} serviço(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar === 'vincular'
                ? `Todos os serviços visíveis passam a valer para projetos de "${nomeDoProduto}".`
                : `Os serviços visíveis deixam de estar disponíveis para projetos de "${nomeDoProduto}".`}
              {' '}A ação vale só para o que está na tela agora — busca e filtro contam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={confirmar === 'desvincular'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined}
              onClick={() => {
                if (confirmar === 'vincular') onVincularVisiveis();
                else onDesvincularVisiveis();
                setConfirmar(null);
              }}
            >
              {confirmar === 'vincular' ? 'Vincular' : 'Desvincular'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
