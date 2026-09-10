import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { PendingTicketsAlert } from '@/components/notifications/PendingTicketsAlert';
import {
  LayoutDashboard,
  LogOut,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  Menu,
  Plus,
  ArrowLeft,
  FileText,
  User,
  Calculator,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { DEV_HUBS } from '@/constants/devHubDefinitions';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { classesGavetaBarra } from '@/lib/sidebarMedidas';

interface DevLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  sopUrl?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  matchPaths?: string[];
}

interface HubSidebarSectionProps {
  label: string;
  landingPath: string;
  items: NavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active: boolean;
  currentPath: string;
  navigate: (path: string) => void;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: DEV_NAV_LABELS.inicio, path: '/equipe/dev' },
  { icon: Plus, label: DEV_NAV_LABELS.novaFerramenta, path: '/equipe/dev/nova-ferramenta' },
  { icon: LayoutDashboard, label: DEV_NAV_LABELS.consultaXmls, path: '/equipe/dev/consulta-xmls' },
];

const spedSubItems: NavItem[] = DEV_HUBS.consultaSped.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const pisCofinsSubItems: NavItem[] = DEV_HUBS.levantamentoPisCofins.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const analiseIcmsSubItems: NavItem[] = DEV_HUBS.analiseIcms.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const perdcompSubItems: NavItem[] = DEV_HUBS.perdcomp.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const planejamentoTributarioSubItems: NavItem[] = DEV_HUBS.planejamentoTributario.options.map(
  (option) => ({
    icon: option.icon,
    label: option.title,
    path: option.path,
  }),
);

const gerenciarDadosSubItems: NavItem[] = DEV_HUBS.gerenciarDados.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const navItemsAfterGroups: NavItem[] = [
  {
    icon: Calculator,
    label: DEV_NAV_LABELS.calculadoraIbsCbs,
    path: '/equipe/dev/calculadora-ibs-cbs',
  },
  {
    icon: FileText,
    label: DEV_NAV_LABELS.controleBalancetes,
    path: '/equipe/dev/controle-balancetes',
  },
  { icon: BookOpen, label: DEV_NAV_LABELS.procedimentos, path: '/equipe/dev/procedimentos' },
];

const HubSidebarSection = ({
  label,
  landingPath,
  items,
  open,
  onOpenChange,
  active,
  currentPath,
  navigate,
}: HubSidebarSectionProps) => (
  <Collapsible open={open} onOpenChange={onOpenChange}>
    <div
      className={`flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-medium transition-colors h-auto ${
        active ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted hover:text-primary'
      }`}
    >
      <button
        type="button"
        className="flex-1 px-0 py-1.5 text-left"
        onClick={() => {
          onOpenChange(true);
          navigate(landingPath);
        }}
      >
        {label}
      </button>

      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 flex-shrink-0 ${
            active
              ? 'text-primary hover:bg-primary/10 hover:text-primary'
              : 'text-foreground hover:bg-muted hover:text-primary'
          }`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </Button>
      </CollapsibleTrigger>
    </div>

    <CollapsibleContent className="mt-0.5 space-y-0.5 pl-4">
      {items.map((item) => (
        <Button
          key={item.path}
          variant="ghost"
          className={`w-full justify-start rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            currentPath === item.path
              ? 'bg-primary/10 text-primary hover:bg-primary/15'
              : 'text-muted-foreground hover:bg-muted hover:text-primary'
          }`}
          onClick={() => navigate(item.path)}
        >
          {item.label}
        </Button>
      ))}
    </CollapsibleContent>
  </Collapsible>
);

export const DevLayout = ({ children, title, subtitle, sopUrl, headerActions }: DevLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  // A barra desta área recolhe até `w-0`, sem trilho. Na gaveta ela também
  // não encolhe: ela desliza para fora da tela, com os rótulos montados.
  const trilho = collapsed && !emGaveta;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const [spedOpen, setSpedOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.consultaSped.landingPath ||
      spedSubItems.some((item) => location.pathname === item.path),
  );
  const [pisCofinsOpen, setPisCofinsOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.levantamentoPisCofins.landingPath ||
      pisCofinsSubItems.some((item) => location.pathname === item.path),
  );
  const [analiseIcmsOpen, setAnaliseIcmsOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.analiseIcms.landingPath ||
      analiseIcmsSubItems.some((item) => location.pathname === item.path),
  );
  const [perdcompOpen, setPerdcompOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.perdcomp.landingPath ||
      perdcompSubItems.some((item) => location.pathname === item.path),
  );
  const [planejamentoTributarioOpen, setPlanejamentoTributarioOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.planejamentoTributario.landingPath ||
      planejamentoTributarioSubItems.some((item) => location.pathname === item.path),
  );
  const [gerenciarDadosOpen, setGerenciarDadosOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.gerenciarDados.landingPath ||
      gerenciarDadosSubItems.some((item) => location.pathname === item.path),
  );

  const isItemActive = (item: NavItem) =>
    item.path === location.pathname || item.matchPaths?.includes(location.pathname) === true;

  const isSpedActive =
    location.pathname === DEV_HUBS.consultaSped.landingPath ||
    spedSubItems.some((item) => location.pathname === item.path);
  const isPisCofinsActive =
    location.pathname === DEV_HUBS.levantamentoPisCofins.landingPath ||
    pisCofinsSubItems.some((item) => location.pathname === item.path);
  const isAnaliseIcmsActive =
    location.pathname === DEV_HUBS.analiseIcms.landingPath ||
    analiseIcmsSubItems.some((item) => location.pathname === item.path);
  const isPerdcompActive =
    location.pathname === DEV_HUBS.perdcomp.landingPath ||
    perdcompSubItems.some((item) => location.pathname === item.path);
  const isPlanejamentoTributarioActive =
    location.pathname === DEV_HUBS.planejamentoTributario.landingPath ||
    planejamentoTributarioSubItems.some((item) => location.pathname === item.path);
  const isGerenciarDadosActive =
    location.pathname === DEV_HUBS.gerenciarDados.landingPath ||
    gerenciarDadosSubItems.some((item) => location.pathname === item.path);

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="flex min-h-screen w-full"
    >
      <aside
        className={`${trilho ? 'w-0' : 'w-64 border-r border-border/60'} ${classesGavetaBarra(collapsed)} sticky top-0 h-screen flex-shrink-0 overflow-x-hidden overflow-y-auto bg-card transition-all duration-300 ease-in-out scrollbar-hide`}
      >
        {!trilho && (
          <>
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border/60 p-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-foreground">Digital Dev</h2>
                <p className="text-xs text-muted-foreground">Ambiente de desenvolvimento</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>

            <nav className="space-y-1 p-4">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isItemActive(item)
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'text-foreground hover:bg-muted hover:text-primary'
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}

              <HubSidebarSection
                label={DEV_HUBS.consultaSped.label}
                landingPath={DEV_HUBS.consultaSped.landingPath}
                items={spedSubItems}
                open={spedOpen}
                onOpenChange={setSpedOpen}
                active={isSpedActive}
                currentPath={location.pathname}
                navigate={navigate}
              />

              <HubSidebarSection
                label={DEV_HUBS.levantamentoPisCofins.label}
                landingPath={DEV_HUBS.levantamentoPisCofins.landingPath}
                items={pisCofinsSubItems}
                open={pisCofinsOpen}
                onOpenChange={setPisCofinsOpen}
                active={isPisCofinsActive}
                currentPath={location.pathname}
                navigate={navigate}
              />

              <HubSidebarSection
                label={DEV_HUBS.analiseIcms.label}
                landingPath={DEV_HUBS.analiseIcms.landingPath}
                items={analiseIcmsSubItems}
                open={analiseIcmsOpen}
                onOpenChange={setAnaliseIcmsOpen}
                active={isAnaliseIcmsActive}
                currentPath={location.pathname}
                navigate={navigate}
              />

              <HubSidebarSection
                label={DEV_HUBS.perdcomp.label}
                landingPath={DEV_HUBS.perdcomp.landingPath}
                items={perdcompSubItems}
                open={perdcompOpen}
                onOpenChange={setPerdcompOpen}
                active={isPerdcompActive}
                currentPath={location.pathname}
                navigate={navigate}
              />

              {navItemsAfterGroups.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isItemActive(item)
                      ? 'bg-primary/10 text-primary hover:bg-primary/15'
                      : 'text-foreground hover:bg-muted hover:text-primary'
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}

              <HubSidebarSection
                label={DEV_HUBS.planejamentoTributario.label}
                landingPath={DEV_HUBS.planejamentoTributario.landingPath}
                items={planejamentoTributarioSubItems}
                open={planejamentoTributarioOpen}
                onOpenChange={setPlanejamentoTributarioOpen}
                active={isPlanejamentoTributarioActive}
                currentPath={location.pathname}
                navigate={navigate}
              />

              <HubSidebarSection
                label={DEV_HUBS.gerenciarDados.label}
                landingPath={DEV_HUBS.gerenciarDados.landingPath}
                items={gerenciarDadosSubItems}
                open={gerenciarDadosOpen}
                onOpenChange={setGerenciarDadosOpen}
                active={isGerenciarDadosActive}
                currentPath={location.pathname}
                navigate={navigate}
              />
            </nav>

            <div className="mt-auto space-y-2 border-t border-border/60 p-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user?.email?.split('@')[0] || 'Usuario'}
                  </p>
                  <p className="text-xs text-muted-foreground">Digital Dev</p>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                onClick={() => navigate('/equipe/digital')}
              >
                <ArrowLeft className="mr-3 h-4 w-4" />
                Voltar para Digital
              </Button>

              <Button
                variant="ghost"
                // Mesmo par do `OsgLayout`: o botão de sair é o mesmo botão, e
                // aqui ele estava em `red-50`/`red-600` cru. Era a segunda de
                // três cópias — a terceira segue no `FixosLayout`.
                className="w-full justify-start rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </>
        )}
      </aside>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* `min-h` e não `h-16` fixo, para o título poder crescer sem cortar:
            com altura fixa mais o `overflow-hidden` do <main>, ele cortava no
            meio. Desde 10/09/2026 os SETE cabeçalhos do produto são assim,
            porque o título subiu para 30px e a 64px não cabe mais.

            ⚠️ ESTA NOTA JÁ ESTEVE ERRADA, e a correção é sobre o método de
            medir. O texto original dizia que "alguns títulos de hub (ex.
            PIS/COFINS, PERDCOMP) passam de 100 caracteres em CAIXA ALTA". Em
            10/09/2026 eu declarei isso FALSO e escrevi a refutação aqui —
            errado. O texto original estava CERTO.

            O que eu medi foi `title="..."` literal nas páginas, e achei 28
            caracteres no máximo. O que eu não medi foi o título que chega por
            VARIÁVEL: o `DevHubPage.tsx:19` passa `title={hub.title}`, e os
            hubs vivem em `constants/devHubDefinitions.ts`. Lá estava o de 112
            caracteres, em caixa alta:

              LEVANTAMENTO PIS/COFINS — PROGRAMA DE INTEGRAÇÃO SOCIAL E
              CONTRIBUIÇÃO PARA O FINANCIAMENTO DA SEGURIDADE SOCIAL

            e mais um de 99 (PERDCOMP) — os DOIS hubs que a nota citava pelo
            nome. Ela era precisa; meu comando é que era estreito.

            A caixa alta saiu em 10/09 (catraca em `tituloEmCaixaAlta.test.ts`),
            o comprimento não: o maior segue com 112 caracteres, agora em caixa
            baixa. É por isso que `min-h` continua obrigatório aqui.

            O comando que enxerga os dois caminhos:

              grep -rhoE "(^|[^a-z])title:\s*'[^']+'" src/constants/devHubDefinitions.ts
              grep -rh -A 2 '<DevLayout' src/pages/equipe/dev/*.tsx | grep -oE '(^|[^a-z])title="[^"]*"'

            (o `[^a-z]` é obrigatório nos dois: sem ele o grep casa o fim de
            `subtitle=` e o número sai errado — foi o que aconteceu comigo.) */}
        <header className="flex min-h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-4 py-2 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => setCollapsed(false)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <TituloDaPagina
              titulo={title}
              subtitulo={subtitle}
              apendiceDoSubtitulo={
                sopUrl ? (
                  <>
                    <span className="mx-2">|</span>
                    <a
                      href={sopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:text-primary hover:underline"
                    >
                      Acessar SOP desta ferramenta
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </>
                ) : null
              }
            />
          </div>

          <div className="flex items-center gap-3">
            {/* SEM espelho: "chamados dos clientes desta área" não se aplica ao
                Digital, que não tem clientes. Ver o bloco `ESPELHO` em
                `src/lib/areaTheme.ts`. */}
            <NotificationPopover navigateTo="/equipe/chamados" backTo={location.pathname} />
            {headerActions}
          </div>
        </header>

        <PendingTicketsAlert navigateTo="/equipe/chamados" backTo={location.pathname} />

        <div className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
          <div className="w-full min-w-0 p-4 md:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default DevLayout;
