import { AREAS } from '@/lib/nomeDaArea';
import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  LayoutDashboard,
  Newspaper,
  Users,
} from 'lucide-react';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { classeLarguraBarra, classeRecuoCabecalho, classesGavetaBarra, larguraBarraCss } from '@/lib/sidebarMedidas';

interface GestaoLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

export const GestaoLayout = ({ children, title, subtitle, headerActions }: GestaoLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  // Trilho de ícones é coisa de desktop. A gaveta, quando abre, abre inteira:
  // um trilho de 80px num celular ocupa espaço e não diz o nome de nada.
  const trilho = collapsed && !emGaveta;

  // Chamados e o dashboard dele saíram daqui: passaram para o dropdown Gerencial
  // da Tax e da OSG, restritos a líder+. A área de Marketing fica com Novidades
  // e Contatos, que é o desenho acordado com a Patricia.
  const navItems: NavItem[] = [
    { icon: Newspaper, label: 'Novidades', path: '/gestao' },
    { icon: Users, label: 'Contatos', path: '/gestao/contatos' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="min-h-screen flex w-full relative"
    >
      {/* Toggle Button — fora do <aside> para não ser clipado pelo overflow da sidebar */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-30 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
        style={{ '--sidebar-width': larguraBarraCss(trilho) } as React.CSSProperties}
        onClick={() => setCollapsed(!collapsed)}
      >
        {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`${classeLarguraBarra(trilho)} ${classesGavetaBarra(collapsed)} bg-card border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        {/* Header */}
        <div className={`${classeRecuoCabecalho(trilho)} border-b border-border/60`}>
          {trilho ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">{AREAS.gestao.nome}</h2>
                <p className="text-xs text-muted-foreground">{AREAS.gestao.subtitulo}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={`w-full ${trilho ? 'justify-center px-2' : 'justify-start px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'text-foreground hover:bg-muted hover:text-primary'
              }`}
              onClick={() => navigate(item.path)}
              title={trilho ? item.label : undefined}
            >
              <item.icon className={`h-4 w-4 ${trilho ? '' : 'mr-3'}`} />
              {!trilho && item.label}
            </Button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido. */}
          {/* O "Trocar área" e o "Sair" moraram aqui embaixo até 10/09/2026;
              agora estão no menu do cartão. */}
          <SidebarCartaoUsuario area="gestao" collapsed={trilho} />
        </div>
      </aside>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
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
              <TituloDaPagina titulo={title} subtitulo={subtitle} sobretitulo={AREAS.gestao.nome} />
            </div>
          </div>
          {/* O atalho de chamados e a faixa de pendentes saíram junto com a tela:
              esta área não trata mais chamado, e apontar para a Gerencial da Tax
              levaria quem é do Marketing a uma porta que não abre para ele. */}
          <div className="flex items-center gap-3">
            <NotificationPopover navigateTo="/gestao" />
            {headerActions}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GestaoLayout;
