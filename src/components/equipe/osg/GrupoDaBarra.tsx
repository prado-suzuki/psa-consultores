// Um agrupador da barra lateral do OSG Work: cabeçalho com ícone e seta, e os
// itens que abrem no hover (ou ficam abertos quando a rota ativa é de dentro).
//
// Saiu de `OsgLayout` em 14/09/2026, quando a especificação final da Patrícia
// pediu um quinto agrupador. O arquivo estava em 885 linhas contra o teto de 600
// do AGENTS.md, com QUATRO cópias deste bloco de ~58 linhas — a regra é decompor
// antes de acrescentar, e acrescentar à mão levaria a 943.
//
// AS QUATRO NÃO ERAM IDÊNTICAS, e isso foi medido antes de extrair. Três usavam
// `flex-1 min-w-0 truncate` no rótulo e a Oficina de Contratos usava
// `whitespace-nowrap` mais `ml-auto` na seta. As duas formas põem a seta à
// direita e as duas estavam CERTAS: a medição de 10/09 no DOM fechou com 23
// itens e zero fora do centro em ambas. O que as separa é o rótulo longo — esta
// corta com reticências, a outra alarga a barra. A Oficina foi convertida antes
// da extração, e o componente nasce com uma forma só.
//
// FORA DAQUI ficam os agrupadores da área OSG Projetos (Projetos e Gerencial):
// eles são de outra área, e o Gerencial tem `onClick` no próprio cabeçalho, que
// é uma terceira variante com razão própria. Entram se um dia alguém decidir
// que devem entrar — não por arrasto.
//
// O NOME DO GRUPO TAILWIND É FIXO (`group/agrupador`), e tem de ser: classe
// montada por interpolação não é vista pelo scanner do JIT e o `group-hover`
// nunca sairia no CSS. Fixo funciona porque os agrupadores são IRMÃOS, nunca
// aninhados — `group-hover/agrupador` resolve no ancestral mais próximo, que é
// sempre o próprio grupo.
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { classesItemDaBarra } from '@/lib/barraLateralCromo';

export interface ItemDoGrupo {
  path: string;
  label: string;
  /**
   * Ícone do ITEM, não do grupo.
   *
   * Os agrupadores nascidos até 11/09/2026 não passam ícone nos filhos — o
   * ícone do cabeçalho já diz de que grupo se trata. O "Estrutura do Cliente"
   * passa, porque os cinco itens dele eram soltos na barra e já tinham o seu:
   * agrupar sem isto apagaria cinco ícones que hoje existem.
   */
  icone?: LucideIcon;
}

export interface GrupoDaBarraProps {
  /** Ícone do cabeçalho do grupo. */
  icone: LucideIcon;
  rotulo: string;
  /** A rota ativa é de dentro deste grupo: ele fica aberto e o cabeçalho pesa. */
  ativo: boolean;
  itens: readonly ItemDoGrupo[];
  /** Barra recolhida ao trilho de ícones. Vem do controlador do layout. */
  trilho: boolean;
  /** As classes que desbotam e zeram a largura do rótulo. Ver `OsgLayout`. */
  rotuloCls: string;
}

export function GrupoDaBarra({
  icone: Icone, rotulo, ativo, itens, trilho, rotuloCls,
}: GrupoDaBarraProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="group/agrupador">
      <button
        type="button"
        className={cn(
          // Cabeçalho de grupo: quem está aberto é o filho — ver `ancestral`.
          classesItemDaBarra({ ativo: false, ancestral: ativo, trilho }),
        )}
      >
        <Icone className="h-4 w-4 flex-shrink-0" />
        <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>
          {rotulo}
        </span>
        <ChevronDown
          className={cn(
            // `rotuloCls` por ÚLTIMO, sempre. Antes o `w-4` vinha depois do `w-0`
            // dele e o twMerge dava a vitória ao `w-4`: no trilho a seta continuava
            // com 16px e empurrava o ícone para a esquerda. Medido no DOM em
            // 10/09/2026: ícone a 27,5px num trilho de centro 39,5 — 12,5px fora,
            // só nos cabeçalhos de grupo, que são os únicos itens com três filhos.
            // A trava que lê o fonte está em `barraLateralCromo.test.ts`.
            'h-4 w-4 flex-shrink-0 duration-300',
            ativo ? 'rotate-180' : 'group-hover/agrupador:rotate-180',
            rotuloCls,
          )}
        />
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          trilho
            ? 'grid-rows-[0fr]'
            : ativo
              ? 'grid-rows-[1fr]'
              : 'grid-rows-[0fr] group-hover/agrupador:grid-rows-[1fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={cn(
              'space-y-1 pt-1',
              trilho ? '' : 'ml-2 pl-2 border-l border-osg-100',
            )}
          >
            {itens.map(({ path, label, icone: IconeDoItem }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                )}
              >
                {IconeDoItem && <IconeDoItem className="h-4 w-4 flex-shrink-0" />}
                <span className={cn('whitespace-nowrap', rotuloCls)}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GrupoDaBarra;
