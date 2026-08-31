import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';

/**
 * ENTRAR NA TABELA — o mesmo controle na doação e no usufruto.
 *
 * ERA UM `Select`, e por isso não funcionava: uma caixa da largura de um campo, com
 * chevron e o texto "Escolha a pessoa", lê como **filtro**. O analista procurava onde
 * adicionar alguém e via um seletor que parecia recortar a tabela.
 *
 * Agora é o molde de combobox da OSG — o mesmo do `CartorioSelect`: um BOTÃO com `+`,
 * que abre uma lista com BUSCA. Três coisas mudam de uma vez:
 *
 *  · a afordância fica certa — `+` diz adicionar, e nada mais;
 *  · a busca aparece, e ela faz falta: cliente com vinte pessoas físicas não se
 *    percorre com o olho;
 *  · a lista fecha ao escolher, então adicionar dois é dois pares de cliques.
 *
 * Sem candidato, não fica um botão morto na tela: fica a frase que diz por que não há
 * ninguém para adicionar.
 */
export function AdicionarPessoa({ rotulo, vazio, opcoes, onEscolher }: {
  rotulo: string;
  vazio: string;
  opcoes: Array<{ pessoaId: string; texto: string }>;
  onEscolher: (pessoaId: string) => void;
}) {
  const [aberto, setAberto] = useState(false);

  // `h-9`: a mesma altura do botão que esta frase substitui. Sem isso a barra encolhe
  // no instante em que a última pessoa entra no ato, e a tabela sobe uns pixels.
  if (opcoes.length === 0) {
    return (
      <p className="flex h-9 items-center text-xs text-muted-foreground">{vazio}</p>
    );
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={rotulo}
          className="h-9 gap-1.5 border border-dashed border-osg-200 text-osg-700 transition-colors hover:border-osg-moss hover:bg-osg-50 hover:text-osg-moss"
        >
          <Plus className="h-3.5 w-3.5" />
          {rotulo}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar pessoa…" />
          <CommandList>
            <CommandEmpty>Nenhuma pessoa com esse nome.</CommandEmpty>
            <CommandGroup>
              {opcoes.map((o) => (
                <CommandItem
                  key={o.pessoaId}
                  value={o.texto}
                  onSelect={() => {
                    onEscolher(o.pessoaId);
                    setAberto(false);
                  }}
                >
                  {o.texto}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
