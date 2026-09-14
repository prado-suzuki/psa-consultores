import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { GrupoDeEquipes } from '@/lib/equipesDaEstrutura';
import { PontoDaArea } from './PontoDaArea';

/**
 * O seletor de equipe da estrutura, agrupado por área.
 *
 * Existia escrito duas vezes — no campo do cadastro de usuário
 * (`EquipesEstruturaField`) e na barra de seleção em lote da matriz
 * (`BarraDeLoteDeAcessos`) —, e as duas cópias já eram a mesma coisa: o mesmo
 * `SelectGroup`, o mesmo cabeçalho com o ponto da área e o caminho, os mesmos
 * itens. Só o tamanho do gatilho e o texto de vazio mudavam.
 *
 * O CABEÇALHO DO GRUPO É O QUE JUSTIFICA O COMPONENTE. O nome da equipe sozinho
 * não diz de qual cluster e de qual área ela é, e é o caminho em cima que diz.
 * Quem montar um `<Select>` de equipe à mão tende a listar só os nomes.
 *
 * QUEM DECIDE O QUE ENTRA NA LISTA É QUEM CHAMA, e de propósito: o cadastro
 * oferece só equipe ativa e ainda tira as que a pessoa já tem, a barra de lote
 * oferece todas as ativas. Essa regra é de cada tela e não desce para cá — ver
 * a nota sobre OFERECER e MOSTRAR no `EquipesEstruturaField`.
 */
export interface SelecaoDeEquipeProps {
  /** Id da equipe escolhida. String vazia quando o seletor age como"adicionar". */
  value: string;
  onChange: (equipeId: string) => void;
  /** Já filtrados e ordenados por quem chama. */
  grupos: GrupoDeEquipes[];
  placeholder: string;
  disabled?: boolean;
  /** Classes do gatilho — é o que muda entre um diálogo e uma barra compacta. */
  className?: string;
  /** Classes de cada item. Acompanha o tamanho do gatilho. */
  itemClassName?: string;
}

export const SelecaoDeEquipe = ({
  value,
  onChange,
  grupos,
  placeholder,
  disabled = false,
  className,
  itemClassName = 'text-xs',
}: SelecaoDeEquipeProps) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className={cn('h-9 text-sm', className)}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {grupos.map((grupo) => (
        <SelectGroup key={grupo.areaId}>
          <SelectLabel className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <PontoDaArea area={{ color: grupo.cor, color_index: grupo.corIndice }} />
            {grupo.caminho}
          </SelectLabel>
          {grupo.equipes.map((equipe) => (
            <SelectItem key={equipe.id} value={equipe.id} className={itemClassName}>
              {equipe.name}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
    </SelectContent>
  </Select>
);
