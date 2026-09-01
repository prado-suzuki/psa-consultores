import { useState } from 'react';
import { AlertTriangle, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { useMunicipiosIbge } from '@/hooks/useMunicipiosIbge';
import { canonicoNaLista, combinaBusca } from '@/lib/municipiosIbge';
import { cn } from '@/lib/utils';

interface MunicipioComboProps {
  /** UF como está gravada; aceita sigla ou nome por extenso. */
  uf: string | null | undefined;
  value: string | null | undefined;
  onChange: (municipio: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Município do cliente: lista da UF escolhida, com busca.
 *
 * Existe para acabar com o campo aberto, que gerava "SINOP" e "Sinop" como se
 * fossem cidades diferentes. A lista vem do IBGE, uma consulta por UF.
 *
 * Não reusa o `SingleSelectCombobox` dos painéis de propósito: aqui há quatro
 * estados que lá não existem (sem UF, carregando, IBGE fora do ar, e valor
 * gravado fora da lista), e envolver o outro componente sairia maior que este.
 *
 * Duas regras de proteção do dado que já está gravado:
 *
 * 1. Valor fora da lista continua aparecendo, marcado, em vez de a tela mostrar
 *    campo vazio e alguém salvar nulo por cima sem notar.
 * 2. Se o IBGE não responder, oferece digitar à mão. Servidor de terceiro fora
 *    do ar não pode impedir o cadastro de um cliente.
 */
export const MunicipioCombo = ({
  uf, value, onChange, disabled, className,
}: MunicipioComboProps) => {
  const [aberto, setAberto] = useState(false);
  const [manual, setManual] = useState(false);
  const { sigla, municipios, isLoading, isError } = useMunicipiosIbge(uf);

  const atual = value?.trim() ?? '';
  // Reconhecido inclui o legado: "CUIABA" casa com "Cuiabá" pela chave sem
  // acento e sem caixa, então não é marcado como fora da lista.
  const reconhecido = !atual || !!canonicoNaLista(atual, municipios);

  if (manual) {
    return (
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}>
        <Input
          disabled={disabled}
          value={atual}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: Lucas do Rio Verde"
          className="h-8"
        />
        <button
          type="button"
          className="self-start text-[11px] text-muted-foreground underline"
          onClick={() => setManual(false)}
        >
          voltar para a lista
        </button>
      </div>
    );
  }

  if (!sigla) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn('h-8 min-w-0 flex-1 justify-start font-normal', className)}
      >
        <span className="truncate text-xs text-muted-foreground">
          {uf?.trim() ? 'UF não reconhecida' : 'Escolha a UF primeiro'}
        </span>
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={cn('h-8 min-w-0 flex-1 justify-start font-normal', className)}
      >
        <Loader2 className="mr-2 h-3.5 w-3.5 shrink-0 animate-spin" />
        {/*
          O valor gravado continua à vista enquanto a lista chega. Mostrar só
          "Carregando" faria o município do cliente sumir da tela a cada
          abertura da ficha, e quem estivesse conferindo o cadastro leria como
          campo vazio.
        */}
        <span className={cn('truncate', !atual && 'text-xs text-muted-foreground')}>
          {atual || 'Carregando municípios…'}
        </span>
      </Button>
    );
  }

  if (isError) {
    return (
      <div className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}>
        <div className="flex items-center gap-2 rounded-md bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            Lista do IBGE indisponível{atual ? `. Gravado: ${atual}` : ''}
          </span>
          <button type="button" className="shrink-0 underline" onClick={() => setManual(true)}>
            digitar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={aberto}
            disabled={disabled}
            className="h-8 w-full justify-between font-normal"
          >
            <span className={cn('truncate', !atual && 'text-xs text-muted-foreground')}>
              {atual || `Município de ${sigla}`}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command
            // O filtro padrão do cmdk compara com acento, e o dado gravado não
            // tem nenhum: quem digitasse "agua boa" não achava "Água Boa".
            filter={(nome, busca) => (combinaBusca(nome, busca) ? 1 : 0)}
          >
            <CommandInput placeholder={`Buscar município de ${sigla}…`} />
            <CommandList>
              <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
              <CommandGroup>
                {municipios.map((nome) => (
                  <CommandItem
                    key={nome}
                    value={nome}
                    onSelect={() => {
                      onChange(nome);
                      setAberto(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0',
                        canonicoNaLista(atual, [nome]) ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate text-sm">{nome}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {!reconhecido && (
        <span className="flex items-center gap-1 text-[11px] text-warning">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Não é município de {sigla}. Escolha na lista para corrigir.
        </span>
      )}
    </div>
  );
};
