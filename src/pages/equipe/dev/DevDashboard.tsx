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
  type LucideIcon,
} from 'lucide-react';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';

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

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.tools.length, 0);

  return (
    <DevLayout
      title="Painel de aplicações"
      subtitle="Acesse suas ferramentas automatizadas e manuais de operação"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Ferramentas</h2>
          <Badge variant="secondary" className="text-[11px]">
            {totalFiltered}
          </Badge>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedToolPath} onValueChange={setSelectedToolPath}>
            <SelectTrigger className="w-full sm:w-96 h-9 text-sm bg-white shadow-sm">
              <SelectValue placeholder="Selecione uma ferramenta..." />
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

      <div className="space-y-10">
        {filteredGroups.map((group) => (
            <section key={group.label}>
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  {group.label}
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  {group.tools.length}
                </Badge>
              </div>

              <div className="flex flex-col gap-3">
                {group.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.path}
                      className="group relative flex flex-col sm:flex-row sm:items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all duration-200 p-4 sm:p-5"
                    >
                      <button
                        onClick={() => navigate(tool.path)}
                        className="flex flex-1 items-start gap-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 rounded-lg"
                      >
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg group-hover:bg-teal-100 transition-colors shrink-0">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {tool.name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-4 shrink-0 sm:ml-auto">
                        {tool.sopUrl && (
                          <a
                            href={tool.sopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-700 underline decoration-dotted decoration-slate-300 hover:decoration-teal-500 underline-offset-4 transition-colors z-10"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Acessar manual
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(tool.path)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-teal-600 text-white text-xs font-semibold shadow-sm hover:bg-teal-700 hover:shadow transition-all"
                        >
                          Abrir ferramenta
                          <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
      </div>
    </DevLayout>
  );
};

export default DevDashboard;
