// Um agrupador de barra lateral: cabeçalho com ícone e seta, e os itens que
// abrem no hover (ou ficam abertos quando a rota ativa é de dentro).
//
// SAIU DA PASTA DA OSG em 22/09/2026, quando o Tax Work passou a usá-lo. Ele
// nunca teve nada de OSG além de uma cor de borda, que agora é parâmetro. O
// nome do arquivo ficou; o que mudou foi o endereço, para o Tax não importar
// interface de outra área.
//
// Saiu de `OsgLayout` em 14/09/2026, quando a especificação final da Patrícia
// passou o OSG Work de DOIS agrupadores (Oficina de Contratos e Relatórios) para
// SETE. O arquivo estava em 885 linhas contra o teto de 600 do AGENTS.md, com
// QUATRO cópias deste bloco de ~58 linhas — duas do Work e duas da área OSG
// Projetos. A regra é decompor antes de acrescentar, e escrever à mão os cinco
// agrupadores que faltavam levaria o arquivo a ~1.175 linhas.
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

/**
 * Item de dentro do grupo: rota e rótulo, e nada mais.
 *
 * ÍCONE É DO CABEÇALHO DO GRUPO, e só dele — decisão de 14/09/2026. Por um dia
 * os cinco filhos de "Estrutura do Cliente" carregaram o próprio, herdado de
 * quando eram itens soltos na barra, enquanto os outros nove nunca tiveram. A
 * saída foi tirar dos cinco: o ícone do grupo já diz de que família a tela é, e
 * um por linha dentro do dropdown competia com ele sem acrescentar informação.
 */
export interface ItemDoGrupo {
  path: string;
  label: string;
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
  /**
   * A borda que liga os filhos ao cabeçalho. Cada área tem a sua: o bege da OSG
   * (`--osg-100`) é global e não muda com o tema, então pintá-lo dentro da Tax
   * daria a cor da área errada.
   */
  classeDaBorda?: string;
  /**
   * O que fazer ao clicar no CABEÇALHO do grupo. Sem isto, ele só abre e fecha,
   * que é o comportamento do OSG Work.
   *
   * O Tax Work precisa navegar: cada agrupador dele tem uma página de hub, com
   * os cards das ferramentas daquela família, e ela só é alcançável por aqui.
   * O comentário no topo deste arquivo dizia que o cabeçalho com `onClick` era
   * "uma terceira variante com razão própria" e ficava de fora; a razão continua
   * própria, e agora ela cabe aqui como opção em vez de virar uma quarta cópia
   * do bloco.
   */
  aoClicarNoCabecalho?: () => void;
}

export function GrupoDaBarra({
  icone: Icone, rotulo, ativo, itens, trilho, rotuloCls,
  classeDaBorda = 'border-osg-100',
  aoClicarNoCabecalho,
}: GrupoDaBarraProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="group/agrupador">
      <button
        type="button"
        onClick={aoClicarNoCabecalho}
        aria-label={trilho ? rotulo : undefined}
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
              trilho ? '' : cn('ml-2 pl-2 border-l', classeDaBorda),
            )}
          >
            {itens.map(({ path, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  classesItemDaBarra({ ativo: location.pathname === path, trilho }),
                )}
              >
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
