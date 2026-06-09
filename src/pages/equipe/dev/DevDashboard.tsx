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
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { DEV_HUBS } from "@/constants/devHubDefinitions";
import { DEV_NAV_LABELS } from "@/constants/devNavLabels";
import { KpiHero, HatchedBar, HeroBanner, type HatchedBarSegment } from "@/components/dashboard/momentum";
import { useToolsCounts } from "@/hooks/useToolsCounts";

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
    landingDescription: "Busque e visualize documentos fiscais eletronicos",
    landingIcon: FileCode2,
    tools: [
      {
        name: DEV_NAV_LABELS.consultaXmls,
        description: "Busque e visualize documentos fiscais eletronicos",
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
    landingDescription: "Simulador de calculo da reforma tributaria",
    landingIcon: Percent,
    landingSopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/",
    tools: [
      {
        name: DEV_NAV_LABELS.calculadoraIbsCbs,
        description: "Simulador de calculo da reforma tributaria",
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
    landingDescription: "Upload e gestao de balancetes contabeis",
    landingIcon: Scale,
    landingSopUrl: "https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/balancete/",
    tools: [
      {
        name: DEV_NAV_LABELS.controleBalancetes,
        description: "Upload e gestao de balancetes contabeis",
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

  const categorySegments: HatchedBarSegment[] = useMemo(
    () =>
      toolGroups.map((group, index) => ({
        label: group.label,
        value: group.tools.length,
        hatched: index % 2 === 1,
      })),
    [],
  );

  const sopCoverage = totalTools > 0 ? Math.round((totalWithSop / totalTools) * 100) : 0;

  return (
    <DevLayout
      title="Painel de aplicacoes"
      subtitle="Acesse suas ferramentas automatizadas e manuais de operacao"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiHero
            label="Ferramentas no Catalogo"
            value={totalTools}
            icon={<Cpu className="h-3.5 w-3.5" />}
            variation={{ label: "disponiveis para a equipe" }}
          />
          <KpiHero
            label="Areas Funcionais"
            value={totalCategories}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            variation={{ label: "frentes de atuacao" }}
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
            variation={{ label: "novas ferramentas em construcao" }}
            loading={isLoadingTools}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <HeroBanner
            className="lg:col-span-2"
            eyebrow="PSA Digital"
            title="Maximize a produtividade do time fiscal"
            description="Substitua planilhas e processos manuais por ferramentas automatizadas. Cada aplicacao foi desenhada para acelerar consultas, apuracoes e cruzamentos de dados, com manuais integrados."
            ctaLabel="Solicitar nova ferramenta"
            onCta={() => navigate("/equipe/dev/nova-ferramenta")}
            icon={<Sparkles className="h-6 w-6 text-white" />}
          />

          <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Distribuicao por Categoria</h3>
            </div>
            <HatchedBar segments={categorySegments} height={48} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Catalogo de Ferramentas</h2>
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
                  className="h-9 text-xs text-slate-600 hover:text-teal-700"
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
                <section key={group.label} className="flex flex-col">
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
                      className="group flex h-full w-full flex-col rounded-2xl border border-teal-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 p-5 text-left text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-300/40 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                    >
                      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-teal-200">
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
                              className="rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 transition-colors hover:border-teal-300/50 hover:bg-white/15 hover:text-white"
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
                            className="group relative flex flex-col rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 transition-all duration-200 hover:border-teal-300 hover:bg-white hover:shadow-md"
                          >
                            <button
                              onClick={() => navigate(tool.path)}
                              className="mb-4 flex items-start gap-3 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                            >
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-teal-700">
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
                                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-teal-700"
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
                                className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-teal-700"
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
      </div>
    </DevLayout>
  );
};

export default DevDashboard;
