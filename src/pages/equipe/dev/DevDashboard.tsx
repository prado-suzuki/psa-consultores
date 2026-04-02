import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { DEV_NAV_LABELS } from '@/constants/devNavLabels';

interface ToolEntry {
  name: string;
  description: string;
  path: string;
  sopUrl?: string;
}

interface ToolGroup {
  label: string;
  tools: ToolEntry[];
}

const toolGroups: ToolGroup[] = [
  {
    label: DEV_NAV_LABELS.consultaSped,
    tools: [
      {
        name: DEV_NAV_LABELS.efdContribuicoes,
        description: 'Consulta e análise de escrituração fiscal digital',
        path: '/equipe/dev/consulta-efd',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/',
      },
      {
        name: DEV_NAV_LABELS.efdIcms + '/IPI',
        description: 'Consulta de EFD ICMS/IPI por contribuinte',
        path: '/equipe/dev/consulta-efd-icms',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/',
      },
      {
        name: DEV_NAV_LABELS.ecd,
        description: 'Consulta de Escrituração Contábil Digital',
        path: '/equipe/dev/consulta-ecd',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/',
      },
      {
        name: DEV_NAV_LABELS.ecf,
        description: 'Consulta de Escrituração Contábil Fiscal',
        path: '/equipe/dev/consulta-ecf',
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
      },
      {
        name: DEV_NAV_LABELS.apuracaoTributaria,
        description: 'Cálculo de apuração do cliente',
        path: '/equipe/dev/apuracao-pis-cofins',
      },
      {
        name: DEV_NAV_LABELS.analiseCruzada,
        description: 'Cruzamento de dados fiscais e contábeis',
        path: '/equipe/dev/cruzamento-dados',
      },
      {
        name: DEV_NAV_LABELS.revisaoRegistrosEfd,
        description: 'Revisão e correção de registros SPED',
        path: '/equipe/dev/correcoes-sped',
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
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/',
      },
    ],
  },
  {
    label: 'Outros',
    tools: [
      {
        name: DEV_NAV_LABELS.consultaXmls,
        description: 'Busque e visualize documentos fiscais eletrônicos',
        path: '/equipe/dev/consulta-xmls',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/',
      },
      {
        name: DEV_NAV_LABELS.calculadoraIbsCbs,
        description: 'Simulador de cálculo da reforma tributária',
        path: '/equipe/dev/calculadora-ibs-cbs',
      },
      {
        name: 'Controle PER/DCOMP',
        description: 'Gestão de pedidos de restituição e compensação',
        path: '/equipe/dev/controle-perdcomp',
        sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp',
      },
      {
        name: 'Controle de Balancetes',
        description: 'Upload e gestão de balancetes contábeis',
        path: '/equipe/dev/controle-balancetes',
      },
    ],
  },
];

const DevDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    return toolGroups
      .map((group) => ({
        ...group,
        tools: group.tools.filter((t) => t.name.toLowerCase().includes(q)),
      }))
      .filter((group) => group.tools.length > 0);
  }, [search]);

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.tools.length, 0);

  return (
    <DevLayout
      title="Início"
      subtitle="Acesse suas ferramentas automatizadas e manuais de operação"
    >
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-700">Ferramentas</h2>
        <Badge variant="secondary" className="text-[11px]">
          {totalFiltered}
        </Badge>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar ferramenta pelo nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma ferramenta encontrada para "{search}"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.label} className="shadow-sm">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    {group.label}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {group.tools.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {group.tools.map((tool) => (
                    <Card
                      key={tool.path}
                      className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm text-slate-700">{tool.name}</CardTitle>
                        <p className="text-[11px] text-slate-500 mt-0.5">{tool.description}</p>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => navigate(tool.path)}
                          className="gap-1 h-7 text-xs px-2"
                        >
                          Acessar
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        {tool.sopUrl && (
                          <a
                            href={tool.sopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-700 hover:underline text-[11px] font-medium inline-flex items-center gap-1"
                          >
                            SOP
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DevLayout>
  );
};

export default DevDashboard;
