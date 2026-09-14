import { ArrowLeft, ChevronLeft, ChevronRight, Home, Menu, Users, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { Button } from '@/components/ui/button';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { FACE_DA_BARRA, classesItemDaBarra } from '@/lib/barraLateralCromo';
import { AREAS } from '@/lib/nomeDaArea';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
  larguraBarraCss,
} from '@/lib/sidebarMedidas';

/**
 * Layout da área Adm & Fin.
 *
 * MODELADO NO `AcessosLayout`, que é o mais recente dos nove e o único que
 * resolve layout e barra no mesmo arquivo. A diferença é o que decide o item
 * ativo: lá a seção é ESTADO da página, aqui é ROTA — cada tela desta área é uma
 * entrada em `src/config/protectedPages.ts` e um destino próprio, porque a
 * permissão da Adm & Fin precisa poder separar "ver cadastro" de "ver
 * faturamento".
 *
 * A BARRA FALA DESTA ÁREA, e é por isso que ela existe em vez de reaproveitar a
 * do Tax ou da OSG. Barra que mostra o menu de outra área é pior do que barra
 * nenhuma: ela mente sobre onde a pessoa está. O menu de hoje tem duas entradas
 * porque a área tem duas telas; a de Faturamento entra quando a tela existir.
 *
 * O TEMA NÃO É APLICADO AQUI. Quem o aplica é o `AreaThemeProvider`, a partir da
 * rota, acima dos gates de acesso (ver `src/lib/areaTheme.ts`). A Adm & Fin não
 * tem delta de cor: a âncora dela é a da casa, como a do Board e a da Rotina.
 */

interface ItemDeMenu {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  /** Marca o item como ativo também nas rotas filhas. */
  exato?: boolean;
}

const MENU: ItemDeMenu[] = [
  { id: 'inicio', label: 'Início', icon: Home, path: '/equipe/adm-fin', exato: true },
  { id: 'clientes', label: 'Clientes', icon: Users, path: '/equipe/adm-fin/clientes' },
];

export interface AdmFinLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const AdmFinLayout = ({ children, title, subtitle, headerActions }: AdmFinLayoutProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  useFecharGavetaAoNavegar(barra);
  // Trilho de ícones é coisa de desktop. A gaveta, quando abre, abre inteira.
  const trilho = collapsed && !emGaveta;

  const estaAtivo = (item: ItemDeMenu) =>
    item.exato ? pathname === item.path : pathname.startsWith(item.path);

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      className="min-h-screen flex w-full relative"
    >
      {/* Fora do <aside> para não ser clipado pelo `overflow` dele. */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-30 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
        style={{ '--sidebar-width': larguraBarraCss(trilho) } as React.CSSProperties}
        onClick={() => setCollapsed(!collapsed)}
        title={trilho ? 'Expandir menu' : 'Recolher menu'}
      >
        {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <aside
        className={`${classeLarguraBarra(trilho)} ${classesGavetaBarra(collapsed)} bg-card border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        <div className={`${classeRecuoCabecalho(trilho)} border-b border-border/60`}>
          {trilho ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-foreground text-lg">{AREAS.admFin.nome}</h2>
                <p className="text-xs text-muted-foreground">{AREAS.admFin.subtitulo}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-1">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              // O cromo é o compartilhado: pílula cheia no ativo, quadrado de
              // 40px no trilho. Sem ele esta barra nasceria com uma tinta
              // própria, que é como as nove divergiram da primeira vez.
              className={classesItemDaBarra({ ativo: estaAtivo(item), trilho })}
              onClick={() => navigate(item.path)}
              title={trilho ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!trilho && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado. É por ele que se sai do
              sistema — o "Sair" mora no menu dele, não na barra. */}
          <SidebarCartaoUsuario area="admFin" collapsed={trilho} />

          <Button
            variant="ghost"
            className={`w-full ${trilho ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors ${FACE_DA_BARRA}`}
            onClick={() => navigate('/equipe')}
            title={trilho ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${trilho ? '' : 'mr-3'}`} />
            {!trilho && 'Trocar área'}
          </Button>
        </div>
      </aside>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
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
              <TituloDaPagina
                titulo={title}
                subtitulo={subtitle}
                sobretitulo={AREAS.admFin.nome}
              />
            </div>
          </div>
          {headerActions}
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdmFinLayout;
