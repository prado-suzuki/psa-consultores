import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useMeuPerfil } from '@/hooks/useDomainMeuPerfil';
import { AREAS as NOMES_DE_AREA } from '@/lib/nomeDaArea';
import { nomeDeExibicao } from '@/lib/nomeDoUsuario';
import { cn } from '@/lib/utils';

/**
 * O cartão do usuário no pé da barra lateral — um só, para as NOVE áreas.
 *
 * Ele existe porque o markup deste cartão estava copiado em cinco layouts, com
 * diferença só de cor de acento e rótulo, e foi essa cópia que deixou o bug de
 * corte vivo em um deles: o OSG era o único que mantinha o cartão montado ao
 * recolher, e lá o avatar de 32px vazava do chip. O estado recolhido correto
 * está embutido aqui, então não há como uma tela nova herdá-lo errado.
 *
 * Desde 10/09/2026 ele também é a PORTA da conta: clicar abre o menu com quem
 * você é, e é dali que se sai do sistema.
 *
 * SÓ O "SAIR" ENTROU. A primeira versão levou os três botões do rodapé para
 * dentro do menu — "Trocar área" e "Voltar ao site" junto — e a Patricia
 * mandou os dois de volta para fora no mesmo dia: eles são NAVEGAÇÃO, ficam na
 * barra ao lado dos outros destinos, e escondê-los atrás de um clique no nome
 * de quem está logado faz a equipe procurar. Sair é o único que não é destino:
 * é o fim da sessão, e é ele que pertence à conta. Se um dia bater a vontade de
 * "limpar o rodapé" de novo, a resposta já foi dada uma vez.
 *
 * A aritmética (por que `px-2` e por que sem `gap` ao recolher) está em
 * `src/lib/sidebarMedidas.ts` e travada em `sidebarMedidas.test.ts`.
 */

/** Tom neutro do chip. Duas famílias de cor convivem no sistema: */
const TONS = {
  /**
   * Áreas que declaram tema no `<html>` (Tax, OSG, Gestão): tudo por token, e a
   * área resolve o tom.
   */
  tokens: {
    chip: 'bg-muted',
    nome: 'text-foreground',
    rotulo: 'text-muted-foreground',
  },
  /**
   * Áreas ainda em slate cru (Administração e Fixos), cujas barras são
   * `bg-white` fixo. Trocá-las por token aqui tingiria o chip (o `--muted` base
   * é `--base-50`) e o escureceria no tema escuro dentro de uma barra que
   * continuaria branca — é migração de paleta, não correção de corte.
   */
  slate: {
    chip: 'bg-muted',
    nome: 'text-foreground',
    rotulo: 'text-muted-foreground',
  },
} as const;

interface DefinicaoDeArea {
  /** Rótulo sob o nome do usuário. */
  rotulo: string;
  /** Cor do círculo e do ícone do avatar. */
  acento: string;
  tom: keyof typeof TONS;
}

/**
 * As áreas com barra lateral. É um registro fechado de propósito: área nova
 * entra por uma linha aqui, e não por mais uma cópia do cartão. As cores literais ficam concentradas neste mapa — se um dia a
 * Administração e a Fixos passarem a declarar tema no `<html>`, é só este
 * arquivo que muda.
 */
const AREAS = {
  // As três áreas com tema no `<html>` usam o MESMO acento, e é isso que faz o
  // avatar mudar de cor sozinho ao trocar de área: `--primary` é a âncora da
  // área, então o cartão herda a identidade sem que este arquivo a conheça.
  //
  // A Tax vinha com `bg-success/10 text-success` — o verde de "deu certo", um
  // token de STATUS pintando IDENTIDADE. Ficava verde na barra da Tax e não
  // mudava ao trocar de área, porque `--success` é o mesmo em todas.
  tax: {
    rotulo: 'Tax',
    acento: 'bg-primary/10 text-primary',
    tom: 'tokens',
  },
  osg: {
    rotulo: 'OSG',
    acento: 'bg-primary/10 text-primary',
    tom: 'tokens',
  },
  gestao: {
    rotulo: 'Gestão',
    acento: 'bg-primary/10 text-primary',
    tom: 'tokens',
  },
  // A Rotina entrou quando o `EquipeLayout` deixou de recolher para `w-0` e
  // passou a ter trilho: o cartão dele era o markup copiado à mão, e copiado
  // sem o estado recolhido — no trilho de 80px ele cortaria o avatar. A chave é
  // `rotina` e não `equipe` para casar com o nome que a rota já tem em
  // `MAPA_DE_ROTAS` (`/equipe/dashboard`, `/equipe/sprints` e as outras doze
  // resolvem para a área `rotina`).
  rotina: {
    rotulo: 'Digital Rotina',
    acento: 'bg-primary/10 text-primary',
    tom: 'tokens',
  },
  administracao: {
    rotulo: 'Administrador',
    acento: 'bg-teal-500/10 text-teal-600',
    tom: 'slate',
  },
  fixos: {
    rotulo: 'Fixos',
    acento: 'bg-blue-500/10 text-blue-600',
    tom: 'slate',
  },
  // As tres ultimas entraram em 10/09/2026, quando a Patricia pediu o cartao em
  // TODA tela com barra. Eram 56 telas sem ele: 20 do Board, 23 do Dev e 13 do
  // Mapeamento. Nas tres o acento e o `--primary`, porque as tres vestem a cor
  // da casa: nenhuma declara tema proprio no `<html>` (ver `TEMA_DA_AREA`).
  board: {
    rotulo: 'Board',
    // `slate` e nao `tokens`: a barra do Board e pintada pelo design system
    // dele, com `--bd-chrome` — que hoje vale `#FFFFFF` literal, nao token.
    acento: 'bg-primary/10 text-primary',
    tom: 'slate',
  },
  // O Dev ja tinha cartao: uma COPIA A MAO do markup, com o avatar, o
  // `email.split('@')[0]` e o nome da area — sem o estado recolhido e sem o
  // nome vindo de `profiles`. Era a setima copia, e a razao de este componente
  // existir. O rotulo sai de `nomeDaArea`, que ja era a fonte dele.
  dev: {
    rotulo: NOMES_DE_AREA.dev.nome,
    acento: 'bg-primary/10 text-primary',
    tom: 'tokens',
  },
  // O Controle de Acessos era a UNICA tela de dentro do sistema sem barra
  // lateral, e por isso a unica sem este cartao. Ganhou barra propria em
  // 10/09/2026, com as sete abas dela viradas menu.
  acessos: {
    rotulo: NOMES_DE_AREA.acessos.nome,
    acento: 'bg-primary/10 text-primary',
    tom: 'tokens',
  },
  mapa: {
    rotulo: 'Mapeamento',
    // A barra do Mapeamento e CSS legado (`mapa.css`), fora do Tailwind: o
    // chip entra como ilha de token dentro dela, como o `slate` das outras.
    acento: 'bg-primary/10 text-primary',
    tom: 'slate',
  },
} satisfies Record<string, DefinicaoDeArea>;

export type AreaDoCartaoDeUsuario = keyof typeof AREAS;

/**
 * As chaves do registro, em lista. Existe para o teste percorrer TODAS as areas
 * sem repetir a lista num literal que envelhece — area nova entra aqui sozinha,
 * e se ela quebrar o cartao o teste cai no mesmo commit que a criou.
 */
export const AREAS_DO_CARTAO = Object.keys(AREAS) as AreaDoCartaoDeUsuario[];

export interface SidebarCartaoUsuarioProps {
  /** Qual barra está montando o cartão: define o rótulo e a cor do avatar. */
  area: AreaDoCartaoDeUsuario;
  /** Estado do trilho. Recolhido, sobra o avatar centralizado. */
  collapsed: boolean;
}

/**
 * Cartão do usuário do rodapé da barra lateral.
 *
 * Recolhido o avatar **fica** e só o texto desbota. Desmontar o texto (o
 * `{!collapsed && …}` que quatro layouts faziam) fazia o cartão inteiro sumir de
 * estalo enquanto a barra ainda encolhia — é isso que dava a sensação de corte
 * seco. Agora ele desbota e desliza junto com a largura.
 */
export const SidebarCartaoUsuario = ({ area, collapsed }: SidebarCartaoUsuarioProps) => {
  const { user, signOut } = useAuth();
  const { data: perfil } = useMeuPerfil();
  const navigate = useNavigate();
  const { rotulo, acento, tom } = AREAS[area];
  const cores = TONS[tom];
  const nome = nomeDeExibicao(perfil, user?.email);

  const sair = async () => {
    // Os seis layouts faziam exatamente estes dois passos, e o `navigate('/')`
    // não é decoração: sem ele a árvore fica montada numa rota protegida sem
    // sessão, e quem decide o que fazer com isso passa a ser o gate de acesso.
    await signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center py-2 rounded-lg mb-3 w-full text-left',
            'transition-shadow hover:ring-2 hover:ring-primary/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            cores.chip,
            // Recolhido, o avatar de 32px é a largura útil inteira do chip: sem o
            // recuo de 12px e sem o `gap-3`, que continua ocupando 12px mesmo com o
            // texto reduzido a zero e é o que empurrava o círculo para fora.
            collapsed ? 'justify-center px-2' : 'gap-3 px-3',
          )}
          title={collapsed ? `${nome} · ${rotulo}` : undefined}
          // Recolhido o texto ao lado sai da árvore de acessibilidade, e sobra um
          // botão com um ícone dentro. É o botão que passa a carregar o nome —
          // antes disto o cartão era um `div` e quem carregava era o avatar, com
          // `role="img"`. Um botão nomeado diz as duas coisas de uma vez: quem é,
          // e que abre alguma coisa.
          aria-label={collapsed ? `${nome} · ${rotulo}` : undefined}
        >
          <span
            className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
              acento,
            )}
          >
            <User className="h-4 w-4" />
          </span>
          <span
            className={cn(
              'flex-1 min-w-0 block transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
              collapsed ? 'pointer-events-none -translate-x-1 opacity-0' : 'opacity-100 delay-150',
            )}
            // Recolhido o texto está invisível e fora do trilho: escondê-lo também
            // de leitor de tela evita anunciar duas vezes o que o nome do botão já
            // diz.
            aria-hidden={collapsed || undefined}
          >
            <span className={cn('block text-sm font-medium truncate', cores.nome)}>{nome}</span>
            <span className={cn('block text-xs', cores.rotulo)}>{rotulo}</span>
          </span>
        </button>
      </DropdownMenuTrigger>

      {/* Recolhida a barra tem 64px: um menu ancorado acima do trilho nasceria
          fora dele. Aberto, ele sobe do cartão, que é o último elemento da
          barra. */}
      <DropdownMenuContent
        side={collapsed ? 'right' : 'top'}
        align="start"
        className="w-60"
      >
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium">{nome}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {user?.email}
          </span>
          <span
            className={cn(
              'mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              acento,
            )}
          >
            {rotulo}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* "Trocar área" e "Voltar ao site" NÃO entram aqui: são navegação e
            ficam na barra (ver a nota no topo do arquivo). */}
        <DropdownMenuItem
          // `void`: o `onSelect` do Radix ignora a promessa, e sem isto o
          // lint aponta a flutuante.
          onSelect={() => void sair()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SidebarCartaoUsuario;
