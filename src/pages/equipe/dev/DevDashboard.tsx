import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Search,
  FileText,
  ShieldAlert,
  BookOpen,
  Calculator,
  Database,
  BarChart3,
  FileCheck,
  ExternalLink,
  ArrowRight,
  Wrench,
  Receipt,
} from 'lucide-react';

/* ── mock: sessões pendentes ─────────────────────────────── */
const pendingSessions = [
  {
    tool: 'DIFAL Inteligente',
    path: '/equipe/dev/auditoria-fiscal',
    lastModified: '08/03/2026',
    desc: '3 auditorias pendentes de revisão',
  },
  {
    tool: 'EFD Contribuições',
    path: '/equipe/dev/consulta-efd',
    lastModified: '07/03/2026',
    desc: 'Análise CNPJ 12.345.678/0001-99 em andamento',
  },
];

/* ── catálogo de ferramentas ─────────────────────────────── */
interface ToolEntry {
  name: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  iconBg: string;
  sopUrl?: string;
}

const tools: ToolEntry[] = [
  {
    name: 'Consulta de XMLs',
    description: 'Busque e visualize documentos fiscais eletrônicos',
    path: '/equipe/dev/consulta-xmls',
    icon: <FileText className="h-5 w-5 text-blue-600" />,
    iconBg: 'bg-blue-100',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/',
  },
  {
    name: 'DIFAL Inteligente',
    description: 'Auditoria automatizada de DIFAL por NCM',
    path: '/equipe/dev/auditoria-fiscal',
    icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
    iconBg: 'bg-rose-100',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/',
  },
  {
    name: 'EFD Contribuições',
    description: 'Consulta e análise de escrituração fiscal digital',
    path: '/equipe/dev/consulta-efd',
    icon: <BookOpen className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-100',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/',
  },
  {
    name: 'EFD ICMS/IPI',
    description: 'Consulta de EFD ICMS/IPI por contribuinte',
    path: '/equipe/dev/consulta-efd-icms',
    icon: <BarChart3 className="h-5 w-5 text-violet-600" />,
    iconBg: 'bg-violet-100',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/',
  },
  {
    name: 'ECD',
    description: 'Consulta de Escrituração Contábil Digital',
    path: '/equipe/dev/consulta-ecd',
    icon: <FileCheck className="h-5 w-5 text-cyan-600" />,
    iconBg: 'bg-cyan-100',
  },
  {
    name: 'ECF',
    description: 'Consulta de Escrituração Contábil Fiscal',
    path: '/equipe/dev/consulta-ecf',
    icon: <FileCheck className="h-5 w-5 text-indigo-600" />,
    iconBg: 'bg-indigo-100',
  },
  {
    name: 'Calculadora IBS/CBS',
    description: 'Simulador de cálculo da reforma tributária',
    path: '/equipe/dev/calculadora-ibs-cbs',
    icon: <Calculator className="h-5 w-5 text-amber-600" />,
    iconBg: 'bg-amber-100',
  },
  {
    name: 'Controle PER/DCOMP',
    description: 'Gestão de pedidos de restituição e compensação',
    path: '/equipe/dev/controle-perdcomp',
    icon: <Receipt className="h-5 w-5 text-teal-600" />,
    iconBg: 'bg-teal-100',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp/',
  },
  {
    name: 'Controle de Balancetes',
    description: 'Upload e gestão de balancetes contábeis',
    path: '/equipe/dev/controle-balancetes',
    icon: <BarChart3 className="h-5 w-5 text-orange-600" />,
    iconBg: 'bg-orange-100',
  },
];

const DevDashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredTools = tools.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DevLayout
      title="Hub de Ferramentas"
      subtitle="Acesse suas ferramentas automatizadas e manuais de operação"
    >
      {/* ── Sessões em Andamento ──────────────────────────── */}
      {pendingSessions.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Sessões em Andamento
            </CardTitle>
            <CardDescription className="text-amber-700/80">
              Você tem trabalhos não finalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingSessions.map((s) => (
              <div
                key={s.tool}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.tool}</p>
                    <p className="text-xs text-slate-500">
                      {s.desc} · Último acesso: {s.lastModified}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(s.path)}
                  className="gap-1"
                >
                  Retomar trabalho
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Hub de Ferramentas ────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-teal-600" />
          Ferramentas
        </h2>
        <Badge variant="secondary" className="text-xs">
          {filteredTools.length}
        </Badge>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ferramenta pelo nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredTools.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma ferramenta encontrada para "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => (
            <Card
              key={tool.path}
              className="flex flex-col justify-between border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tool.iconBg}`}>{tool.icon}</div>
                  <CardTitle className="text-base text-slate-700">{tool.name}</CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 flex items-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => navigate(tool.path)}
                  className="gap-1"
                >
                  Acessar Ferramenta
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                {tool.sopUrl && (
                  <a
                    href={tool.sopUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-700 hover:underline text-xs font-medium inline-flex items-center gap-1"
                  >
                    Ler Manual (SOP)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DevLayout>
  );
};

export default DevDashboard;
