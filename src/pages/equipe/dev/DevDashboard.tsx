import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ExternalLink,
  BookOpen,
  FileCode2,
  FolderTree,
  Database,
  ShieldAlert,
  Percent,
  Scale,
  X,
  LayoutGrid,
  Cpu,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { DEV_HUBS } from "@/constants/devHubDefinitions";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";
import { KpiHero } from "@/components/dashboard/momentum";
import { useToolsCounts } from "@/hooks/useToolsCounts";

/** Id de âncora da seção da categoria no catálogo, para o chip "Categorias" rolar até ela. */
const toAnchorId = (label: string) =>
  `categoria-${label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;

interface ToolEntry {
  name: string;
  description: string;
  path: string;
  icon: LucideIcon;
  sopUrl?: string;
}

interface ToolGroup {
  label: string;
  tools: ToolEntry[];
  landingIcon?: LucideIcon;
  landingPath?: string;
  landingDescription?: string;
  landingSopUrl?: string;
}

const buildHubTools = (hub: (typeof DEV_HUBS)[keyof typeof DEV_HUBS]): ToolEntry[] =>
  hub.options.map((option) => ({
    name: option.title,
    description: option.description,
    path: option.path,
    icon: option.icon,
    sopUrl: option.sopUrl,
  }));

const toolGroups: ToolGroup[] = [
  {
    label: DEV_NAV_LABELS.consultaXmls,
    landingPath: "/equipe/dev/consulta-xmls",
    landingDescription: "Busque e visualize documentos fiscais eletrônicos",
    landingIcon: FileCode2,
    tools: [
      {
        name: DEV_NAV_LABELS.consultaXmls,
        description: "Busque e visualize documentos fiscais eletrônicos",
        path: "/equipe/dev/consulta-xmls",
        icon: FileCode2,
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/",
      },
    ],
  },
  {
    label: DEV_HUBS.consultaSped.label,
    landingPath: DEV_HUBS.consultaSped.landingPath,
    landingDescription: DEV_HUBS.consultaSped.landingDescription,
    landingIcon: DEV_HUBS.consultaSped.landingIcon,
    landingSopUrl: DEV_HUBS.consultaSped.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.consultaSped),
  },
  {
    label: DEV_HUBS.levantamentoPisCofins.label,
    landingPath: DEV_HUBS.levantamentoPisCofins.landingPath,
    landingDescription: DEV_HUBS.levantamentoPisCofins.landingDescription,
    landingIcon: DEV_HUBS.levantamentoPisCofins.landingIcon,
    landingSopUrl: DEV_HUBS.levantamentoPisCofins.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.levantamentoPisCofins),
  },
  {
    label: DEV_HUBS.analiseIcms.label,
    landingPath: DEV_HUBS.analiseIcms.landingPath,
    landingDescription: DEV_HUBS.analiseIcms.landingDescription,
    landingIcon: DEV_HUBS.analiseIcms.landingIcon,
    landingSopUrl: DEV_HUBS.analiseIcms.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.analiseIcms),
  },
  {
    label: DEV_NAV_LABELS.calculadoraIbsCbs,
    landingPath: "/equipe/dev/calculadora-ibs-cbs",
    landingDescription: "Simulador de cálculo da reforma tributária",
    landingIcon: Percent,
    landingSopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/",
    tools: [
      {
        name: DEV_NAV_LABELS.calculadoraIbsCbs,
        description: "Simulador de cálculo da reforma tributária",
        path: "/equipe/dev/calculadora-ibs-cbs",
        icon: Percent,
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/",
      },
    ],
  },
  {
    label: DEV_HUBS.perdcomp.label,
    landingPath: DEV_HUBS.perdcomp.landingPath,
    landingDescription: DEV_HUBS.perdcomp.landingDescription,
    landingIcon: DEV_HUBS.perdcomp.landingIcon,
    landingSopUrl: DEV_HUBS.perdcomp.landingSopUrl,
    tools: buildHubTools(DEV_HUBS.perdcomp),
  },
  {
    label: DEV_NAV_LABELS.controleBalancetes,
    landingPath: "/equipe/dev/controle-balancetes",
    landingDescription: "Upload e gestão de balancetes contábeis",
    landingIcon: Scale,
    landingSopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/balancete/",
    tools: [
      {
        name: DEV_NAV_LABELS.controleBalancetes,
        description: "Upload e gestão de balancetes contábeis",
        path: "/equipe/dev/controle-balancetes",
        icon: Scale,
        sopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/balancete/",
      },
    ],
  },
];

const DevDashboard = () => {
  const navigate = useNavigate();
  const [selectedToolPath, setSelectedToolPath] = useState<string>("");
  const { data: toolsCounts, isLoading: isLoadingTools } = useToolsCounts();

  const filteredGroups = useMemo(() => {
    if (!selectedToolPath) return toolGroups;

    return toolGroups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((tool) => tool.path === selectedToolPath),
      }))
      .filter((group) => group.tools.length > 0);
  }, [selectedToolPath]);

  const totalTools = useMemo(() => toolGroups.reduce((sum, group) => sum + group.tools.length, 0), []);
  const totalCategories = toolGroups.length;
  const totalWithSop = useMemo(
    () => toolGroups.reduce((sum, group) => sum + group.tools.filter((tool) => tool.sopUrl).length, 0),
    [],
  );
  const totalFiltered = filteredGroups.reduce((sum, group) => sum + group.tools.length, 0);

  const sopCoverage = totalTools > 0 ? Math.round((totalWithSop / totalTools) * 100) : 0;

  const scrollToCategory = (label: string) => {
    document.getElementById(toAnchorId(label))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <DevLayout
      title={DEV_NAV_LABELS.inicio}
      subtitle="Acesse suas ferramentas automatizadas e manuais de operação"
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-600">
          Use o filtro para achar uma ferramenta específica ou explore por categoria no catálogo abaixo.
        </p>

        <a
          href="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/estrutura-pastas-drive/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-2xl border-2 border-emerald-300/70 bg-gradient-to-r from-emerald-50 via-white to-primary/5 p-6 shadow-[0_4px_24px_-8px_rgba(5,150,105,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_12px_32px_-8px_rgba(5,150,105,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
                <FolderTree className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    </span>
                    Fonte dos dados
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                    <ShieldAlert className="h-3 w-3" /> Leitura obrigatória
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    SOP oficial
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Estrutura de Pastas do Google Drive
                </h2>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
                  Cada pasta de cliente no Drive alimenta o banco de dados que abastece{" "}
                  <span className="font-semibold text-slate-800">todas as aplicações Digital DEV</span>.
                  O envio correto dos documentos na estrutura padrão é essencial para garantir a
                  integridade da coleta e o funcionamento das ferramentas. Clique em{" "}
                  <span className="font-semibold text-slate-800">Abrir manual</span> para consultar a
                  estrutura completa e evitar erros de organização.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center md:flex-col md:items-end">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform group-hover:translate-x-1">
                Abrir manual
                <ExternalLink className="h-4 w-4" />
              </span>
            </div>
          </div>
        </a>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Catálogo de Ferramentas</h2>
              <Badge variant="secondary" className="text-[11px]">
                {totalFiltered} {totalFiltered === 1 ? "item" : "itens"}
              </Badge>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Select value={selectedToolPath} onValueChange={setSelectedToolPath}>
                <SelectTrigger className="h-9 w-full bg-white text-sm shadow-sm sm:w-80">
                  <SelectValue placeholder="Filtrar por ferramenta..." />
                </SelectTrigger>
                <SelectContent>
                  {toolGroups.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel className="text-[11px] uppercase tracking-wider text-slate-500">
                        {group.label}
                      </SelectLabel>
                      {group.tools.map((tool) => (
                        <SelectItem key={tool.path} value={tool.path}>
                          {tool.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {selectedToolPath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedToolPath("")}
                  className="h-9 text-xs text-slate-600 hover:text-primary"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredGroups.map((group) => {
              const LandingIcon = group.landingIcon ?? LayoutGrid;

              return (
                <section key={group.label} id={toAnchorId(group.label)} className="flex flex-col scroll-mt-4">
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{group.label}</h3>
                    <span className="h-px flex-1 bg-slate-200" />
                    <Badge variant="outline" className="text-[10px]">
                      {group.tools.length}
                    </Badge>
                  </div>

                  {group.landingPath && !selectedToolPath ? (
                    (() => {
                      const isSingleton = group.tools.length === 1 && group.tools[0].name === group.label;

                      return (
                    <button
                      type="button"
                      onClick={() => navigate(group.landingPath!)}
                      className="group flex h-full w-full flex-col rounded-2xl border border-primary/30 bg-gradient-to-br from-surface-escura via-surface-escura-2 to-primary p-5 text-left text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground/80">
                        <LandingIcon className="h-5 w-5" />
                      </div>
                      <h4 className="text-lg font-semibold tracking-tight">{group.label}</h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/75">{group.landingDescription}</p>
                      {!isSingleton && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {group.tools.map((tool) => (
                            <button
                              key={tool.path}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(tool.path);
                              }}
                              title={`Abrir ${tool.name}`}
                              className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 transition-colors hover:border-primary-foreground/40 hover:bg-white/15 hover:text-white"
                            >
                              {tool.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-end pt-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition-transform group-hover:translate-x-1">
                          {isSingleton ? "Abrir" : "Abrir central"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                      );
                    })()
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {group.tools.map((tool) => {
                        const Icon = tool.icon;

                        return (
                          <article
                            key={tool.path}
                            className="group relative flex flex-col rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-white hover:shadow-md"
                          >
                            <button
                              onClick={() => navigate(tool.path)}
                              className="mb-4 flex items-start gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary/15">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-primary">
                                  {tool.name}
                                </h4>
                                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                  {tool.description}
                                </p>
                              </div>
                            </button>

                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3">
                              {tool.sopUrl ? (
                                <a
                                  href={tool.sopUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-primary"
                                >
                                  <BookOpen className="h-3 w-3" />
                                  Manual
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              ) : (
                                <span className="text-[11px] italic text-slate-400">Sem manual</span>
                              )}

                              <button
                                onClick={() => navigate(tool.path)}
                                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-primary/90"
                              >
                                Abrir
                                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiHero
            label="Ferramentas no Catálogo"
            value={totalTools}
            icon={<Cpu className="h-3.5 w-3.5" />}
            variation={{ label: "disponíveis para a equipe" }}
          />
          <KpiHero
            label="Áreas Funcionais"
            value={totalCategories}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            variation={{ label: "frentes de atuação" }}
          />
          <KpiHero
            label="Cobertura de Manuais"
            value={`${sopCoverage}%`}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            variation={{ label: `${totalWithSop} de ${totalTools} com manual SOP` }}
          />
          <KpiHero
            label="Em Desenvolvimento"
            value={toolsCounts?.inDevelopment ?? 0}
            icon={<Rocket className="h-3.5 w-3.5" />}
            variant="solid"
            variation={{ label: "novas ferramentas em construção" }}
            loading={isLoadingTools}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Não achou a ferramenta que precisa?</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Solicite uma nova ferramenta para a equipe Digital Dev avaliar.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate("/equipe/dev/nova-ferramenta")}
              className="shrink-0 gap-1.5"
            >
              Solicitar nova ferramenta
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Categorias</h3>
            <div className="flex flex-wrap gap-2">
              {toolGroups.map((group) => (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => scrollToCategory(group.label)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  {group.label}
                  <span className="text-slate-400">{group.tools.length}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DevLayout>
  );
};

export default DevDashboard;
