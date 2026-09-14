import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AREA_CATEGORIES_MAP } from '@/config/areaCategories';
import { ROLE_OPTIONS } from './roleOptions';

/**
 * Os dois blocos de caixas dos diálogos de criar e editar usuário.
 *
 * Eles eram escritos à mão nos DOIS diálogos, byte a byte iguais — mudava só o
 * prefixo do `id`. Setenta linhas em duplicata num lugar onde divergir é caro:
 * "Papéis do usuário" é o que abre o sistema, e uma opção que entrasse num
 * diálogo e não no outro produziria um usuário que só pode ser criado, ou só
 * corrigido, com aquele papel.
 *
 * O campo irmão dos dois — `EquipesEstruturaField` — já era componente desde o
 * começo; estes dois ficaram para trás.
 *
 * O PREFIXO DO ID É OBRIGATÓRIO, e não enfeite. Os dois diálogos vivem montados
 * ao mesmo tempo na aba de Usuários. Sem prefixos diferentes, dois `<Label>`
 * apontariam o mesmo `htmlFor` e clicar no rótulo de um marcaria a caixa do
 * outro — que é o motivo de o código original já trazer `role_` e `edit_role_`.
 */

interface CaixaEmListaProps {
  id: string;
  marcada: boolean;
  onMarcar: (marcada: boolean) => void;
  rotulo: string;
  descricao: string;
}

/** Uma linha: caixa à esquerda, rótulo clicável e a descrição embaixo. */
const CaixaEmLista = ({ id, marcada, onMarcar, rotulo, descricao }: CaixaEmListaProps) => (
  <div className="flex items-start space-x-3 p-2 rounded-lg bg-muted border border-border">
    <Checkbox
      id={id}
      checked={marcada}
      onCheckedChange={(checked) => onMarcar(checked === true)}
      className="mt-0.5"
    />
    <div>
      <Label htmlFor={id} className="text-foreground text-sm font-medium cursor-pointer">
        {rotulo}
      </Label>
      <p className="text-xs text-muted-foreground">{descricao}</p>
    </div>
  </div>
);

export interface CampoDeCaixasProps {
  /** Valores marcados hoje. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Prefixo do `id` das caixas — ver a nota sobre colisão, acima. */
  idPrefix: string;
}

/** Os papéis do sistema, na ordem de `ROLE_OPTIONS`. */
export const PapeisDoUsuarioField = ({ value, onChange, idPrefix }: CampoDeCaixasProps) => (
  <div className="space-y-3">
    <Label className="text-foreground text-sm font-medium">Papéis do usuário</Label>
    {ROLE_OPTIONS.map((papel) => (
      <CaixaEmLista
        key={papel.value}
        id={`${idPrefix}${papel.value}`}
        marcada={value.includes(papel.value)}
        onMarcar={(marcada) =>
          onChange(marcada ? [...value, papel.value] : value.filter((v) => v !== papel.value))
        }
        rotulo={papel.label}
        descricao={papel.desc}
      />
    ))}
  </div>
);

/** As áreas de acesso, com as categorias de página que cada uma abre. */
export const AreasDeAcessoField = ({ value, onChange, idPrefix }: CampoDeCaixasProps) => (
  <div className="space-y-3">
    <Label className="text-foreground text-sm font-medium">Áreas de Acesso</Label>
    <p className="text-xs text-muted-foreground">Selecione as áreas que o membro terá acesso</p>
    {Object.entries(AREA_CATEGORIES_MAP).map(([chave, area]) => (
      <CaixaEmLista
        key={chave}
        id={`${idPrefix}${chave}`}
        marcada={value.includes(chave)}
        onMarcar={(marcada) =>
          onChange(marcada ? [...value, chave] : value.filter((v) => v !== chave))
        }
        rotulo={area.label}
        descricao={area.categories.join(', ')}
      />
    ))}
  </div>
);
