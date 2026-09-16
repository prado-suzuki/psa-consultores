import { resolverCabecalho, type TextoDoCabecalho } from '@/config/textosDasTelas';
import { AREAS } from '@/lib/nomeDaArea';
import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { Menu } from 'lucide-react';
import { FiscalSidebar } from './FiscalSidebar';
import { Button } from '@/components/ui/button';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { TourProvider } from '@/components/tour/TourProvider';
import TourTrigger from '@/components/tour/TourTrigger';
import { REGISTRO_TAX, resolverTourTax } from './tour/tours';
import { useLocation } from 'react-router-dom';

/**
 * Ou `tela` — o texto espelhado, de `@/config/textosDasTelas` — ou `title` e
 * `subtitle` escritos à mão, para as telas que a OSG não tem. Nunca os dois.
 */
type FiscalLayoutProps = {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
} & TextoDoCabecalho;

export const FiscalLayout = (props: FiscalLayoutProps) => {
  const { children, headerActions } = props;
  // A ÁREA É DO LAYOUT, e não do invólucro. É isto que torna o espelho
  // estrutural: uma tela da Tax não tem como puxar o texto da OSG, porque ela
  // não escolhe a área — só nomeia a tela. Aqui é sempre `tax`, fixo, e não a
  // apresentação da rota: o `sobretitulo` logo abaixo é outra pergunta.
  const { title, subtitle } = resolverCabecalho(props, 'tax');
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const barra = useSidebarRecolhimentoController();
  const { collapsed: isCollapsed, setCollapsed: setIsCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  const { pathname } = useLocation();
  const temGuia = resolverTourTax(pathname) !== null;

  // O tema da área NÃO é aplicado aqui: quem o aplica é o `AreaThemeProvider`,
  // a partir da rota, acima dos gates de acesso (ver `src/lib/areaTheme.ts`).
  // Fazer isso no layout deixava a tela sem tema enquanto o `LiderRoute`
  // carregava o papel do usuário — era de onde vinha o anel de foco lime em
  // /equipe/tax/gerencial/chamados.

  return (
    // O provider embrulha a área: o guia de cada tela abre por rota, e o "?" do
    // header precisa do contexto. A árvore abaixo fica sem reindentar de
    // propósito, para o diff mostrar o que mudou e não o arquivo inteiro.
    <TourProvider registro={REGISTRO_TAX}>
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="min-h-screen flex w-full"
    >
      {/* Sidebar */}
      <FiscalSidebar
        isCollapsed={isCollapsed}
        emGaveta={emGaveta}
        onToggle={() => setIsCollapsed(!isCollapsed)}
      />

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!isCollapsed} onFechar={() => setIsCollapsed(true)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — altura, tipografia e conteúdo espelhados do OSG Projects. O
            usuário mora no rodapé da barra da esquerda; aqui ficam só o título
            da página e as ações. */}
        <header className="min-h-16 border-b border-border/60 bg-card flex items-center justify-between px-4 py-2 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <TituloDaPagina titulo={title} subtitulo={subtitle} sobretitulo={AREAS.tax.nome} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headerActions}

            {/* O "?" abre o guia da tela atual. Em rota sem guia ele não
                aparece: botão que não faz nada ensina a ignorar o botão. */}
            {temGuia && (
              <TourTrigger
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                dataTour="help"
              />
            )}

            <NotificationPopover
              navigateTo="/equipe/chamados"
              espelho="tax"
              tasksNavigateTo="/equipe/tax/projetos/tarefas"
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
    </TourProvider>
  );
};

export default FiscalLayout;
