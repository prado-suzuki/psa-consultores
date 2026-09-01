import { User } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

/**
 * O cartão do usuário no pé da barra lateral — um só, para as cinco áreas.
 *
 * Ele existe porque o markup deste cartão estava copiado em cinco layouts, com
 * diferença só de cor de acento e rótulo, e foi essa cópia que deixou o bug de
 * corte vivo em um deles: o OSG era o único que mantinha o cartão montado ao
 * recolher, e lá o avatar de 32px vazava do chip. O estado recolhido correto
 * está embutido aqui, então não há como uma tela nova herdá-lo errado.
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
    nome: 'text-slate-900',
    rotulo: 'text-slate-500',
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
 * As cinco áreas com barra lateral de trilho recolhido. É um registro fechado de
 * propósito: área nova entra por uma linha aqui, e não por uma sexta cópia do
 * cartão. As cores literais ficam concentradas neste mapa — se um dia a
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
  tax: { rotulo: 'Tax', acento: 'bg-primary/10 text-primary', tom: 'tokens' },
  osg: { rotulo: 'OSG', acento: 'bg-primary/10 text-primary', tom: 'tokens' },
  gestao: { rotulo: 'Gestão', acento: 'bg-primary/10 text-primary', tom: 'tokens' },
  administracao: {
    rotulo: 'Administrador',
    acento: 'bg-teal-500/10 text-teal-600',
    tom: 'slate',
  },
  fixos: { rotulo: 'Fixos', acento: 'bg-blue-500/10 text-blue-600', tom: 'slate' },
} satisfies Record<string, DefinicaoDeArea>;

export type AreaDoCartaoDeUsuario = keyof typeof AREAS;

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
  const { user } = useAuth();
  const { rotulo, acento, tom } = AREAS[area];
  const cores = TONS[tom];
  const nome = user?.email?.split('@')[0] || 'Usuário';

  return (
    <div
      className={cn(
        'flex items-center py-2 rounded-lg mb-3',
        cores.chip,
        // Recolhido, o avatar de 32px é a largura útil inteira do chip: sem o
        // recuo de 12px e sem o `gap-3`, que continua ocupando 12px mesmo com o
        // texto reduzido a zero e é o que empurrava o círculo para fora.
        collapsed ? 'justify-center px-2' : 'gap-3 px-3',
      )}
      title={collapsed ? `${nome} · ${rotulo}` : undefined}
    >
      <div
        className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
          acento,
        )}
        // Recolhido, o avatar é a única coisa que sobra na tela: é ele que passa
        // a carregar o nome para o leitor de tela, já que o texto ao lado sai da
        // árvore de acessibilidade.
        role={collapsed ? 'img' : undefined}
        aria-label={collapsed ? `${nome} · ${rotulo}` : undefined}
      >
        <User className="h-4 w-4" />
      </div>
      <div
        className={cn(
          'flex-1 min-w-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
          collapsed ? 'pointer-events-none -translate-x-1 opacity-0' : 'opacity-100 delay-150',
        )}
        // Recolhido o texto está invisível e fora do trilho: escondê-lo também
        // de leitor de tela evita anunciar duas vezes o que o `title` do chip já
        // diz.
        aria-hidden={collapsed || undefined}
      >
        <p className={cn('text-sm font-medium truncate', cores.nome)}>{nome}</p>
        <p className={cn('text-xs', cores.rotulo)}>{rotulo}</p>
      </div>
    </div>
  );
};

export default SidebarCartaoUsuario;
