import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NotificationPopover } from "@/components/notifications/NotificationPopover";
import { PendingTicketsAlert } from "@/components/notifications/PendingTicketsAlert";
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
} from "lucide-react";
import { DEV_HUBS } from "@/constants/devHubDefinitions";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';

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
  { icon: LayoutDashboard, label: DEV_NAV_LABELS.inicio, path: "/equipe/dev" },
  { icon: Plus, label: DEV_NAV_LABELS.novaFerramenta, path: "/equipe/dev/nova-ferramenta" },
  { icon: LayoutDashboard, label: DEV_NAV_LABELS.consultaXmls, path: "/equipe/dev/consulta-xmls" },
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

const gerenciarDadosSubItems: NavItem[] = DEV_HUBS.gerenciarDados.options.map((option) => ({
  icon: option.icon,
  label: option.title,
  path: option.path,
}));

const navItemsAfterGroups: NavItem[] = [
  { icon: Calculator, label: DEV_NAV_LABELS.calculadoraIbsCbs, path: "/equipe/dev/calculadora-ibs-cbs" },
  { icon: FileText, label: DEV_NAV_LABELS.controleBalancetes, path: "/equipe/dev/controle-balancetes" },
  { icon: BookOpen, label: DEV_NAV_LABELS.procedimentos, path: "/equipe/dev/procedimentos" },
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
        active ? "bg-primary/10 text-primary" : "text-slate-700 hover:bg-slate-50 hover:text-primary"
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
              ? "text-primary hover:bg-primary/10 hover:text-primary"
              : "text-slate-700 hover:bg-slate-100 hover:text-primary"
          }`}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
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
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-slate-500 hover:bg-slate-50 hover:text-primary"
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
  const { collapsed, setCollapsed } = useSidebarRecolhimentoController();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const [spedOpen, setSpedOpen] = useState(
    () => location.pathname === DEV_HUBS.consultaSped.landingPath || spedSubItems.some((item) => location.pathname === item.path),
  );
  const [pisCofinsOpen, setPisCofinsOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.levantamentoPisCofins.landingPath ||
      pisCofinsSubItems.some((item) => location.pathname === item.path),
  );
  const [analiseIcmsOpen, setAnaliseIcmsOpen] = useState(
    () => location.pathname === DEV_HUBS.analiseIcms.landingPath || analiseIcmsSubItems.some((item) => location.pathname === item.path),
  );
  const [perdcompOpen, setPerdcompOpen] = useState(
    () => location.pathname === DEV_HUBS.perdcomp.landingPath || perdcompSubItems.some((item) => location.pathname === item.path),
  );
  const [gerenciarDadosOpen, setGerenciarDadosOpen] = useState(
    () =>
      location.pathname === DEV_HUBS.gerenciarDados.landingPath ||
      gerenciarDadosSubItems.some((item) => location.pathname === item.path),
  );

  const isItemActive = (item: NavItem) =>
    item.path === location.pathname || item.matchPaths?.includes(location.pathname) === true;

  const isSpedActive =
    location.pathname === DEV_HUBS.consultaSped.landingPath || spedSubItems.some((item) => location.pathname === item.path);
  const isPisCofinsActive =
    location.pathname === DEV_HUBS.levantamentoPisCofins.landingPath ||
    pisCofinsSubItems.some((item) => location.pathname === item.path);
  const isAnaliseIcmsActive =
    location.pathname === DEV_HUBS.analiseIcms.landingPath || analiseIcmsSubItems.some((item) => location.pathname === item.path);
  const isPerdcompActive =
    location.pathname === DEV_HUBS.perdcomp.landingPath || perdcompSubItems.some((item) => location.pathname === item.path);
  const isGerenciarDadosActive =
    location.pathname === DEV_HUBS.gerenciarDados.landingPath ||
    gerenciarDadosSubItems.some((item) => location.pathname === item.path);

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      <aside
        className={`${collapsed ? "w-0" : "w-64 border-r border-slate-200/60"} sticky top-0 h-screen flex-shrink-0 overflow-x-hidden overflow-y-auto bg-white transition-all duration-300 ease-in-out scrollbar-hide`}
      >
        {!collapsed && (
          <>
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200/60 p-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900">Digital Dev</h2>
                <p className="text-xs text-slate-500">Ambiente de desenvolvimento</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-slate-600 hover:text-slate-900"
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
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-slate-700 hover:bg-slate-50 hover:text-primary"
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
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-slate-700 hover:bg-slate-50 hover:text-primary"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}

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

            <div className="mt-auto space-y-2 border-t border-slate-200/60 p-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{user?.email?.split("@")[0] || "Usuario"}</p>
                  <p className="text-xs text-slate-500">Digital Dev</p>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary"
                onClick={() => navigate("/equipe/digital")}
              >
                <ArrowLeft className="mr-3 h-4 w-4" />
                Voltar para Digital
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-start rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
                onClick={handleSignOut}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </>
        )}
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* `min-h` e não `h-16` fixo: alguns títulos de hub (ex. PIS/COFINS,
            PERDCOMP) passam de 100 caracteres em CAIXA ALTA e quebram em 2-3
            linhas. Com altura fixa + `overflow-hidden` do <main>, o título
            simplesmente cortava no meio — a caixa agora cresce para caber. */}
        <header className="flex min-h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-card px-6 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-slate-600 hover:text-slate-900"
                onClick={() => setCollapsed(false)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}

            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="flex flex-wrap items-center gap-0 text-sm text-slate-500">
                  {subtitle}
                  {sopUrl && (
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
                  )}
                </p>
              )}
            </div>
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
          <div className="w-full min-w-0 p-6">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default DevLayout;
