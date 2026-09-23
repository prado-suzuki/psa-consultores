import { ArrowLeft, ChevronLeft, ChevronRight, ClipboardList, FolderKanban, Home, LayoutDashboard, ListChecks, Menu, MessageSquare, MessagesSquare, Scale } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { Button } from '@/components/ui/button';
import { GrupoDaBarra, type ItemDoGrupo } from '@/components/layout/GrupoDaBarra';
import { ButtonTooltip } from '@/components/ui/button-tooltip';
import { resolverCabecalho, type TextoDoCabecalho } from '@/config/textosDasTelas';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { FACE_DA_BARRA, classesItemDaBarra } from '@/lib/barraLateralCromo';
import { AREAS } from '@/lib/nomeDaArea';
import { linkEspelhado } from '@/lib/areaTheme';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
  larguraBarraCss,
} from '@/lib/sidebarMedidas';
import { cn } from '@/lib/utils';

interface ItemDeMenu {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  /** Marca o item como ativo tambem nas rotas filhas. */
  exato?: boolean;
}

const ITENS_TOPO: ItemDeMenu[] = [
  { id: 'inicio', label: 'Início', icon: Home, path: '/equipe/juridico/inicio', exato: true },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/equipe/juridico/dashboard' },
];

const GRUPO_PROJETOS: readonly ItemDoGrupo[] = [
  { path: '/equipe/juridico/projetos/clientes', label: 'Clientes', icon: ClipboardList },
  { path: '/equipe/juridico/projetos/cadastro', label: 'Projetos e tarefas', icon: FolderKanban },
  { path: '/equipe/juridico/projetos/controle', label: 'Controle de Projetos', icon: ListChecks },
  { path: '/equipe/juridico/projetos/feed', label: 'Feed', icon: MessagesSquare },
];

// A porta Work existe sem ferramenta dentro: o menu fica so no Inicio ate a
// primeira ferramenta da area entrar.
const MENU_WORK: ItemDeMenu[] = [
  { id: 'work', label: 'Início', icon: Home, path: '/equipe/juridico/work', exato: true },
];

export type JuridicoLayoutProps = {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  /** A tela e dona da propria rolagem; o conteudo recebe a altura util. */
  rolagemNoConteudo?: boolean;
} & TextoDoCabecalho;

export const JuridicoLayout = (props: JuridicoLayoutProps) => {
  const { children, headerActions, rolagemNoConteudo = false } = props;
  const { title, subtitle } = resolverCabecalho(props, 'juridico');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  useFecharGavetaAoNavegar(barra);
  const trilho = collapsed && !emGaveta;

  const isWork = pathname.startsWith('/equipe/juridico/work');
  const menu = isWork ? MENU_WORK : ITENS_TOPO;
  const area = isWork ? AREAS.juridicoWork : AREAS.juridicoProjects;
  const projetosAtivo = pathname.startsWith('/equipe/juridico/projetos');

  // Desbota e zera a largura do rótulo no trilho: invisível não é sem espaço.
  const rotuloCls = cn(
    'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
    trilho ? 'w-0 overflow-hidden opacity-0' : 'opacity-100',
  );

  const estaAtivo = (item: ItemDeMenu) =>
    item.exato ? pathname === item.path : pathname.startsWith(item.path);

  return (
    <div className={cn('flex w-full', rolagemNoConteudo ? 'h-screen overflow-hidden' : 'min-h-screen')}>
      {/* Fora do <aside> para nao ser clipado pelo `overflow` dele. */}
      <ButtonTooltip text={trilho ? 'Expandir menu' : 'Recolher menu'}>
        <Button
          variant="ghost"
          size="icon"
          aria-label={trilho ? 'Expandir menu' : 'Recolher menu'}
          className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-30 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
          style={{ '--sidebar-width': larguraBarraCss(trilho) } as React.CSSProperties}
          onClick={() => setCollapsed(!collapsed)}
        >
          {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </ButtonTooltip>

      {/* SEM `relative` junto de `sticky`: o merge do Tailwind trata as duas
          como a mesma propriedade e fica com a ultima, apagando o sticky. */}
      <aside
        className={`${classeLarguraBarra(trilho)} ${classesGavetaBarra(collapsed)} bg-card border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        <div className={`${classeRecuoCabecalho(trilho)} border-b border-border/60`}>
          {trilho ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Scale className="h-5 w-5 text-primary" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground text-lg">{area.nome}</h2>
                <p className="text-xs text-muted-foreground">{area.subtitulo}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-1">
          {menu.map((item) => (
            <ButtonTooltip key={item.id} text={trilho ? item.label : undefined}>
              <button
                aria-label={trilho ? item.label : undefined}
                type="button"
                className={classesItemDaBarra({ ativo: estaAtivo(item), trilho })}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>{item.label}</span>
              </button>
            </ButtonTooltip>
          ))}

          {!isWork && (
            <GrupoDaBarra
              icone={FolderKanban}
              rotulo="Projetos"
              ativo={projetosAtivo}
              itens={GRUPO_PROJETOS}
              trilho={trilho}
              rotuloCls={rotuloCls}
              classeDaBorda="border-border"
            />
          )}

          {!isWork && (
            <ButtonTooltip text={trilho ? 'Chamados' : undefined}>
              <button
                aria-label={trilho ? 'Chamados' : undefined}
                type="button"
                className={classesItemDaBarra({
                  ativo: pathname.startsWith('/equipe/chamados'),
                  trilho,
                })}
                onClick={() => navigate(linkEspelhado('/equipe/chamados', 'juridico'))}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0" />
                <span className={cn('flex-1 min-w-0 truncate text-left', rotuloCls)}>Chamados</span>
              </button>
            </ButtonTooltip>
          )}
        </nav>

        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          <SidebarCartaoUsuario area="juridico" collapsed={trilho} />

          <ButtonTooltip text={trilho ? 'Trocar ambiente' : undefined}>
            <Button
              variant="ghost"
              aria-label={trilho ? 'Trocar ambiente' : undefined}
              className={`w-full ${trilho ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors ${FACE_DA_BARRA}`}
              onClick={() => navigate('/equipe/juridico')}
            >
              <ArrowLeft className={`h-4 w-4 ${trilho ? '' : 'mr-3'}`} />
              {!trilho && 'Trocar ambiente'}
            </Button>
          </ButtonTooltip>
        </div>
      </aside>

      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="min-h-16 border-b border-border/60 bg-card flex items-center justify-between px-4 py-2 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <TituloDaPagina titulo={title} subtitulo={subtitle} sobretitulo={area.nome} />
            </div>
          </div>
          {headerActions}
        </header>

        <div className={rolagemNoConteudo ? 'min-h-0 flex-1 overflow-hidden' : 'flex-1 overflow-y-auto'}>
          <div className={cn('p-4 md:p-6', rolagemNoConteudo && 'flex h-full flex-col')}>{children}</div>
        </div>
      </main>
    </div>
  );
};

export default JuridicoLayout;
