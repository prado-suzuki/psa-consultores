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
  ArrowRight,
  Wrench,
  ExternalLink,
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
  sopUrl?: string;
}

const tools: ToolEntry[] = [
  {
    name: 'Consulta de XMLs',
    description: 'Busque e visualize documentos fiscais eletrônicos',
    path: '/equipe/dev/consulta-xmls',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/',
  },
  {
    name: 'DIFAL Inteligente',
    description: 'Auditoria automatizada de DIFAL por NCM',
    path: '/equipe/dev/auditoria-fiscal',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/',
  },
  {
    name: 'EFD Contribuições',
    description: 'Consulta e análise de escrituração fiscal digital',
    path: '/equipe/dev/consulta-efd',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/',
  },
  {
    name: 'EFD ICMS/IPI',
    description: 'Consulta de EFD ICMS/IPI por contribuinte',
    path: '/equipe/dev/consulta-efd-icms',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/',
  },
  {
    name: 'ECD',
    description: 'Consulta de Escrituração Contábil Digital',
    path: '/equipe/dev/consulta-ecd',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/',
  },
  {
    name: 'ECF',
    description: 'Consulta de Escrituração Contábil Fiscal',
    path: '/equipe/dev/consulta-ecf',
    sopUrl: 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECF/',
  },
  {
    name: 'Calculadora IBS/CBS',
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
  {
    name: 'Gerenciar dados',
    description: 'Importe ou limpe tabelas cliente/contribuinte',
    path: '/equipe/dev/gerenciar-dados',
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
      title="Início"
      subtitle="Acesse suas ferramentas automatizadas e manuais de operação"
    >
      {/* ── Hub de Ferramentas ────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold text-slate-700">
          Ferramentas
        </h2>
        <Badge variant="secondary" className="text-[11px]">
          {filteredTools.length}
        </Badge>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar ferramenta pelo nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {filteredTools.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma ferramenta encontrada para "{search}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredTools.map((tool) => (
            <Card
              key={tool.path}
              className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm text-slate-700">{tool.name}</CardTitle>
                <CardDescription className="text-[11px] text-slate-500 mt-0.5">
                  {tool.description}
                </CardDescription>
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
      )}

      {/* ── Sessões em Andamento ──────────────────────────── */}
      {pendingSessions.length > 0 && (
        <Card className="mt-6 border-teal-200 bg-teal-50/60">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm text-slate-900 flex items-center gap-2">
              Sessões em Andamento
            </CardTitle>
            <CardDescription className="text-slate-700 text-xs">
              Você tem trabalhos não finalizados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            {pendingSessions.map((s) => (
              <div
                key={s.tool}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <div>
                    <p className="text-xs font-medium text-slate-900">{s.tool}</p>
                    <p className="text-[11px] text-slate-600">
                      {s.desc} · Último acesso: {s.lastModified}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(s.path)}
                  className="gap-1 h-7 text-xs px-2"
                >
                  Retomar
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </DevLayout>
  );
};

export default DevDashboard;
