import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ExternalLink,
  BookOpen,
  Receipt,
  FileText,
  BookText,
  Map,
  Calculator,
  GitCompare,
  Wrench,
  Truck,
  Sparkles,
  FileCode2,
  Percent,
  FileStack,
  Scale,
  X,
  LayoutGrid,
  Cpu,
  Rocket,
  type LucideIcon,
} from 'lucide-react';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';
import { KpiHero, HatchedBar, HeroBanner, type HatchedBarSegment } from '@/components/dashboard/momentum';

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
}

const toolGroups: ToolGroup[] = [
  {
    label: DEV_NAV_LABELS.consultaXmls,
    tools: [
      {
        name: DEV_NAV_LABELS.consultaXmls,
        description: 'Busque e visualize documentos fiscais eletrônicos',
        path: '/equipe/dev/consulta-xmls',
        icon: FileCode2,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/',
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.consultaSped,
    tools: [
      {
        name: DEV_NAV_LABELS.efdContribuicoes,
        description: 'Consulta e análise de escrituração fiscal digital',
        path: '/equipe/dev/consulta-efd',
        icon: Receipt,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/',
      },
      {
        name: DEV_NAV_LABELS.efdIcms + '/IPI',
        description: 'Consulta de EFD ICMS/IPI por contribuinte',
        path: '/equipe/dev/consulta-efd-icms',
        icon: FileText,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/',
      },
      {
        name: DEV_NAV_LABELS.ecd,
        description: 'Consulta de Escrituração Contábil Digital',
        path: '/equipe/dev/consulta-ecd',
        icon: BookOpen,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/',
      },
      {
        name: DEV_NAV_LABELS.ecf,
        description: 'Consulta de Escrituração Contábil Fiscal',
        path: '/equipe/dev/consulta-ecf',
        icon: BookText,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECF/',
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.levantamentoPisCofins,
    tools: [
      {
        name: DEV_NAV_LABELS.mapaNCMs,
        description: 'Regras de crédito por NCM para PIS e COFINS',
        path: '/equipe/dev/mapa-ncm-pis-cofins',
        icon: Map,
      },
      {
        name: DEV_NAV_LABELS.apuracaoTributaria,
        description: 'Cálculo de apuração do cliente',
        path: '/equipe/dev/apuracao-pis-cofins',
        icon: Calculator,
      },
      {
        name: DEV_NAV_LABELS.analiseCruzada,
        description: 'Cruzamento de dados fiscais e contábeis',
        path: '/equipe/dev/cruzamento-dados',
        icon: GitCompare,
      },
      {
        name: DEV_NAV_LABELS.revisaoRegistrosEfd,
        description: 'Revisão e correção de registros SPED',
        path: '/equipe/dev/correcoes-sped',
        icon: Wrench,
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.apuracaoDifal,
    tools: [
      {
        name: DEV_NAV_LABELS.icmsSaidas,
        description: 'Classificação fiscal de produtos em saídas interestaduais (Beta)',
        path: '/equipe/dev/apuracao-difal/icms-saidas',
        icon: Truck,
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.difalInteligente,
    tools: [
      {
        name: DEV_NAV_LABELS.difalInteligente,
        description: 'Auditoria automatizada de DIFAL por NCM',
        path: '/equipe/dev/processo-difal',
        icon: Sparkles,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/',
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.calculadoraIbsCbs,
    tools: [
      {
        name: DEV_NAV_LABELS.calculadoraIbsCbs,
        description: 'Simulador de cálculo da reforma tributária',
        path: '/equipe/dev/calculadora-ibs-cbs',
        icon: Percent,
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.controlePerdcomp,
    tools: [
      {
        name: DEV_NAV_LABELS.controlePerdcomp,
        description: 'Gestão de pedidos de restituição e compensação',
        path: '/equipe/dev/controle-perdcomp',
        icon: FileStack,
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp',
      },
    ],
  },
  {
    label: DEV_NAV_LABELS.controleBalancetes,
    tools: [
      {
        name: DEV_NAV_LABELS.controleBalancetes,
        description: 'Upload e gestão de balancetes contábeis',
        path: '/equipe/dev/controle-balancetes',
        icon: Scale,
      },
    ],
  },
];

const DevDashboard = () => {
  const navigate = useNavigate();
  const [selectedToolPath, setSelectedToolPath] = useState<string>('');

  const filteredGroups = useMemo(() => {
    if (!selectedToolPath) return toolGroups;
    return toolGroups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((t) => t.path === selectedToolPath),
      }))
      .filter((group) => group.tools.length > 0);
  }, [selectedToolPath]);

  const totalTools = useMemo(() => toolGroups.reduce((s, g) => s + g.tools.length, 0), []);
  const totalCategories = toolGroups.length;
  const totalWithSop = useMemo(
    () => toolGroups.reduce((s, g) => s + g.tools.filter(t => t.sopUrl).length, 0),
    []
  );
  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.tools.length, 0);

  // Distribuição por categoria (hatched bar)
  const categorySegments: HatchedBarSegment[] = useMemo(
    () => toolGroups.map((g, i) => ({
      label: g.label,
      value: g.tools.length,
      hatched: i % 2 === 1,
    })),
    []
  );

  const sopCoverage = totalTools > 0 ? Math.round((totalWithSop / totalTools) * 100) : 0;

  return (
    <DevLayout
      title="Painel de aplicações"
      subtitle="Acesse suas ferramentas automatizadas e manuais de operação"
    >
      <div className="space-y-6">
        {/* LINHA 1 — KPIs Hero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiHero
            label="Ferramentas Ativas"
            value={totalTools}
            icon={<Cpu className="h-3.5 w-3.5" />}
            variation={{ value: totalTools, label: 'aplicações disponíveis' }}
          />
          <KpiHero
            label="Categorias"
            value={totalCategories}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            variation={{ value: totalCategories, label: 'grupos funcionais' }}
          />
          <KpiHero
            label="Cobertura de Manuais"
            value={`${sopCoverage}%`}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            variation={{ value: sopCoverage, label: `${totalWithSop} de ${totalTools} com SOP` }}
          />
          <KpiHero
            label="Próximas Releases"
            value="3"
            icon={<Rocket className="h-3.5 w-3.5" />}
            variant="solid"
            variation={{ value: 1, label: 'em desenvolvimento' }}
          />
        </div>

        {/* LINHA 2 — Banner Hero + Distribuição por categoria */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HeroBanner
            className="lg:col-span-2"
            eyebrow="PSA Digital"
            title="Maximize a produtividade do time fiscal"
            description="Substitua planilhas e processos manuais por ferramentas automatizadas. Cada aplicação foi desenhada para acelerar consultas, apurações e cruzamentos de dados — com manuais integrados."
            ctaLabel="Solicitar nova ferramenta"
            onCta={() => navigate('/equipe/dev/nova-ferramenta')}
            icon={<Sparkles className="h-6 w-6 text-white" />}
          />

          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Distribuição por Categoria</h3>
            </div>
            <HatchedBar segments={categorySegments} height={48} />
          </div>
        </div>

        {/* LINHA 3 — Filtro + lista de ferramentas */}
        <div className="bg-white border border-slate-200/70 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Catálogo de Ferramentas</h2>
              <Badge variant="secondary" className="text-[11px]">
                {totalFiltered} {totalFiltered === 1 ? 'item' : 'itens'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={selectedToolPath} onValueChange={setSelectedToolPath}>
                <SelectTrigger className="w-full sm:w-80 h-9 text-sm bg-white shadow-sm">
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
                  onClick={() => setSelectedToolPath('')}
                  className="h-9 text-xs text-slate-600 hover:text-teal-700"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {filteredGroups.map((group) => (
              <section key={group.label}>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                    {group.label}
                  </h3>
                  <span className="h-px flex-1 bg-slate-200" />
                  <Badge variant="outline" className="text-[10px]">
                    {group.tools.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <article
                        key={tool.path}
                        className="group relative flex flex-col bg-slate-50/60 hover:bg-white rounded-xl border border-slate-200/70 hover:border-teal-300 hover:shadow-md transition-all duration-200 p-4"
                      >
                        <button
                          onClick={() => navigate(tool.path)}
                          className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded-lg flex items-start gap-3 mb-4"
                        >
                          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition-colors flex items-center justify-center flex-shrink-0">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                              {tool.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                              {tool.description}
                            </p>
                          </div>
                        </button>

                        <div className="mt-auto pt-3 border-t border-slate-200/70 flex items-center justify-between gap-2">
                          {tool.sopUrl ? (
                            <a
                              href={tool.sopUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-teal-700"
                            >
                              <BookOpen className="h-3 w-3" />
                              Manual
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Sem manual</span>
                          )}
                          <button
                            onClick={() => navigate(tool.path)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-teal-600 text-white text-[11px] font-semibold shadow-sm hover:bg-teal-700 transition-all"
                          >
                            Abrir
                            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </DevLayout>
  );
};

export default DevDashboard;
