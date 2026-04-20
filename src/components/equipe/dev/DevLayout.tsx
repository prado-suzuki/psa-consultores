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
  ChevronRight,
  ChevronDown,
  Menu,
  Plus,
  Database,
  ArrowLeft,
  FileText,
  User,
  Calculator,
  FileSpreadsheet,
  Users,
  Layers,
  ScanSearch,
} from "lucide-react";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";

interface DevLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  sopUrl?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: DEV_NAV_LABELS.inicio, path: "/equipe/dev" },
  { icon: Plus, label: DEV_NAV_LABELS.novaFerramenta, path: "/equipe/dev/nova-ferramenta" },
  { icon: LayoutDashboard, label: DEV_NAV_LABELS.consultaXmls, path: "/equipe/dev/consulta-xmls" },
];

const spedSubItems: NavItem[] = [
  { icon: FileText, label: DEV_NAV_LABELS.efdContribuicoes, path: "/equipe/dev/consulta-efd" },
  { icon: FileText, label: DEV_NAV_LABELS.efdIcms, path: "/equipe/dev/consulta-efd-icms" },
  { icon: FileText, label: DEV_NAV_LABELS.ecd, path: "/equipe/dev/consulta-ecd" },
  { icon: FileText, label: DEV_NAV_LABELS.ecf, path: "/equipe/dev/consulta-ecf" },
];

const pisCofinsSubItems: NavItem[] = [
  { icon: Layers, label: DEV_NAV_LABELS.mapaNCMs, path: "/equipe/dev/mapa-ncm-pis-cofins" },
  { icon: Calculator, label: DEV_NAV_LABELS.apuracaoTributaria, path: "/equipe/dev/apuracao-pis-cofins" },
  { icon: ScanSearch, label: DEV_NAV_LABELS.analiseCruzada, path: "/equipe/dev/cruzamento-dados" },
  { icon: FileText, label: DEV_NAV_LABELS.revisaoRegistrosEfd, path: "/equipe/dev/correcoes-sped" },
];

const apuracaoDifalSubItems: NavItem[] = [
  { icon: Calculator, label: DEV_NAV_LABELS.icmsSaidas, path: "/equipe/dev/apuracao-difal/icms-saidas" },
];

const navItemsAfterSped: NavItem[] = [
  { icon: Calculator, label: DEV_NAV_LABELS.difalInteligente, path: "/equipe/dev/processo-difal" },
  { icon: Calculator, label: DEV_NAV_LABELS.calculadoraIbsCbs, path: "/equipe/dev/calculadora-ibs-cbs" },
  { icon: FileSpreadsheet, label: DEV_NAV_LABELS.controlePerdcomp, path: "/equipe/dev/controle-perdcomp" },
  { icon: FileText, label: DEV_NAV_LABELS.controleBalancetes, path: "/equipe/dev/controle-balancetes" },
  { icon: Users, label: DEV_NAV_LABELS.procedimentos, path: "/equipe/dev/procedimentos" },
  { icon: Database, label: DEV_NAV_LABELS.gerenciarDados, path: "/equipe/dev/gerenciar-dados" },
];

export const DevLayout = ({ children, title, subtitle, sopUrl, headerActions }: DevLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const [spedOpen, setSpedOpen] = useState(() => spedSubItems.some((item) => location.pathname === item.path));
  const [pisCofinsOpen, setPisCofinsOpen] = useState(() =>
    pisCofinsSubItems.some((item) => location.pathname === item.path),
  );
  const [apuracaoDifalOpen, setApuracaoDifalOpen] = useState(() =>
    apuracaoDifalSubItems.some((item) => location.pathname === item.path),
  );

  const isActive = (path: string) => location.pathname === path;
  const isSpedActive = spedSubItems.some((item) => location.pathname === item.path);
  const isPisCofinsActive = pisCofinsSubItems.some((item) => location.pathname === item.path);
  const isApuracaoDifalActive = apuracaoDifalSubItems.some((item) => location.pathname === item.path);

  return (
    <div className="min-h-screen bg-slate-50 flex w-full">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-0" : "w-64 border-r border-slate-200/60"} relative bg-white flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden`}
      >
        {/* Sidebar content — only rendered when expanded */}
        {!collapsed && (
          <>
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200/60 flex-shrink-0">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900 text-lg">Digital Dev</h2>
                <p className="text-xs text-slate-500">Ambiente de desenvolvimento</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-slate-900 flex-shrink-0"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>
            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                      : "text-slate-700 hover:bg-slate-50 hover:text-teal-600"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}

              {/* Consulta SPED - Collapsible */}
              <Collapsible open={spedOpen} onOpenChange={setSpedOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isSpedActive
                        ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                        : "text-slate-700 hover:bg-slate-50 hover:text-teal-600"
                    }`}
                  >
                    <span className="flex-1 text-left">{DEV_NAV_LABELS.consultaSped}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${spedOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                  {spedSubItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={`w-full justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                          : "text-slate-500 hover:bg-slate-50 hover:text-teal-600"
                      }`}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Levantamento de Créditos - Collapsible */}
              <Collapsible open={pisCofinsOpen} onOpenChange={setPisCofinsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors h-auto ${
                      isPisCofinsActive
                        ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                        : "text-slate-700 hover:text-teal-600"
                    }`}
                  >
                    <span className="flex-1 text-left">{DEV_NAV_LABELS.levantamentoPisCofins}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${pisCofinsOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                  {pisCofinsSubItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={`w-full justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                          : "text-slate-500 hover:bg-slate-50 hover:text-teal-600"
                      }`}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Apuração do DIFAL - Collapsible */}
              <Collapsible open={apuracaoDifalOpen} onOpenChange={setApuracaoDifalOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors h-auto ${
                      isApuracaoDifalActive
                        ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                        : "text-slate-700 hover:text-teal-600"
                    }`}
                  >
                    <span className="flex-1 text-left">{DEV_NAV_LABELS.apuracaoDifal}</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${apuracaoDifalOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 space-y-0.5 mt-0.5">
                  {apuracaoDifalSubItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      className={`w-full justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive(item.path)
                          ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                          : "text-slate-500 hover:bg-slate-50 hover:text-teal-600"
                      }`}
                      onClick={() => navigate(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {navItemsAfterSped.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? "bg-teal-500/10 text-teal-700 hover:bg-teal-500/15"
                      : "text-slate-700 hover:bg-slate-50 hover:text-teal-600"
                  }`}
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200/60 space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 mb-3">
                <div className="h-8 w-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user?.email?.split("@")[0] || "Usuário"}
                  </p>
                  <p className="text-xs text-slate-500">Digital Dev</p>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors"
                onClick={() => navigate("/equipe/digital")}
              >
                <ArrowLeft className="h-4 w-4 mr-3" />
                Voltar para Digital
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sair
              </Button>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200/60 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-slate-900 flex-shrink-0"
                onClick={() => setCollapsed(false)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-slate-500 flex items-center gap-0 flex-wrap">
                  {subtitle}
                  {sopUrl && (
                    <>
                      <span className="mx-2">|</span>
                      <a
                        href={sopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1 font-medium"
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
            <NotificationPopover navigateTo="/equipe/chamados" />
            {headerActions}
          </div>
        </header>

        {/* Pending Tickets Alert */}
        <PendingTicketsAlert navigateTo="/equipe/chamados" />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-6 w-full min-w-0">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default DevLayout;
