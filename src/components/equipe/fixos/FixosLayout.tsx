import { AREAS } from '@/lib/nomeDaArea';
import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { Button } from '@/components/ui/button';
import { 
  Building,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { classeLarguraBarra, classeRecuoCabecalho, classesGavetaBarra, larguraBarraCss } from '@/lib/sidebarMedidas';

interface FixosLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const FixosLayout = ({ children, title, subtitle, headerActions }: FixosLayoutProps) => {
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  // Trilho de ícones é coisa de desktop. A gaveta, quando abre, abre inteira:
  // um trilho de 80px num celular ocupa espaço e não diz o nome de nada.
  const trilho = collapsed && !emGaveta;

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="min-h-screen flex w-full"
    >
      {/* Sidebar */}
      <aside
        className={`${classeLarguraBarra(trilho)} ${classesGavetaBarra(collapsed)} bg-white border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        {/* Header */}
        <div className={`${classeRecuoCabecalho(trilho)} border-b border-border/60`}>
          {trilho ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">{AREAS.fixos.nome}</h2>
                <p className="text-xs text-muted-foreground">{AREAS.fixos.subtitulo}</p>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-10 h-6 w-6 rounded-full border border-border bg-white hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
          style={{ '--sidebar-width': larguraBarraCss(trilho) } as React.CSSProperties}
          onClick={() => setCollapsed(!collapsed)}
        >
          {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation - Empty for now */}
        <nav className="p-4 space-y-1">
          {/* Navigation items will be added here later */}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido. */}
          {/* O "Trocar área", o "Voltar ao site" e o "Sair" moraram aqui embaixo
              até 10/09/2026; agora estão no menu do cartão. O comentário que
              ficava no "Sair" registrava a terceira cópia dele — a contagem
              acabou junto com as cópias. */}
          <SidebarCartaoUsuario area="fixos" collapsed={trilho} />
        </div>
      </aside>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="min-h-16 border-b border-border/60 bg-white flex items-center justify-between px-4 py-2 md:px-6 flex-shrink-0">
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
              <TituloDaPagina titulo={title} subtitulo={subtitle} sobretitulo={AREAS.fixos.nome} />
            </div>
          </div>
          <div className="flex items-center gap-3">
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

export default FixosLayout;
