import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/ui/metric-card';
import { Plus, Code2, Users, Play, Pause, AlertCircle, Zap, Copy, CheckCircle, Database, FileText, Wrench } from 'lucide-react';
import { getApiUrl } from '@/config/api';

const DevDashboard = () => {
  const navigate = useNavigate();
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const testApiHealth = async () => {
    setTestLoading(true);
    setTestResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setTestResult({ error: 'Usuário não autenticado' });
        return;
      }
      
      const response = await fetch(
        getApiUrl('/auth_health'),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const data = await response.json();
      setTestResult({ 
        status: response.status, 
        ok: response.ok,
        data 
      });
    } catch (error: any) {
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const copyJwt = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      navigator.clipboard.writeText(session.access_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { data: tools, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: toolAccess } = useQuery({
    queryKey: ['tool-access'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tool_area_access')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0"><Play className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'development':
        return <Badge className="bg-amber-100 text-amber-700 border-0"><Code2 className="h-3 w-3 mr-1" />Em Desenvolvimento</Badge>;
      case 'deprecated':
        return <Badge className="bg-red-100 text-red-700 border-0"><Pause className="h-3 w-3 mr-1" />Descontinuado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getToolAreas = (toolId: string) => {
    return toolAccess?.filter(ta => ta.tool_id === toolId).map(ta => ta.area) || [];
  };

  const stats = {
    total: tools?.length || 0,
    active: tools?.filter(t => t.status === 'active').length || 0,
    development: tools?.filter(t => t.status === 'development').length || 0,
  };

  return (
    <DevLayout 
      title="Dashboard Dev" 
      subtitle="Ambiente de desenvolvimento de ferramentas automatizadas"
      headerActions={
        <Button onClick={() => navigate('/equipe/dev/nova-ferramenta')}>
          <Plus className="h-4 w-4 mr-2" />
          Nova ferramenta
        </Button>
      }
    >
      {/* Stats Cards com MetricCard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          title="Total de ferramentas"
          value={stats.total}
          icon={<Wrench className="h-5 w-5 text-teal-600" />}
          iconColor="bg-teal-100"
        />
        <MetricCard
          title="Ferramentas ativas"
          value={stats.active}
          icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
          iconColor="bg-emerald-100"
        />
        <MetricCard
          title="Em desenvolvimento"
          value={stats.development}
          icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
          iconColor="bg-amber-100"
        />
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card 
          className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-200 shadow-sm"
          onClick={() => navigate('/equipe/dev/consulta-xmls')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base text-slate-700">Consulta XMLs</CardTitle>
                <CardDescription className="text-xs text-slate-500">Busque e visualize documentos fiscais</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-slate-50 transition-colors border-slate-200 shadow-sm"
          onClick={() => navigate('/equipe/dev/gerenciar-dados')}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Database className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base text-slate-700">Gerenciar dados</CardTitle>
                <CardDescription className="text-xs text-slate-500">Importe ou limpe tabelas cliente/contribuinte</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Debug Card */}
      <Card className="mb-6 border-amber-300 border-2 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg text-slate-700">Debug: Teste API Cloud Run</CardTitle>
          </div>
          <CardDescription className="text-slate-500">Temporário - Remover depois dos testes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Button onClick={testApiHealth} disabled={testLoading}>
              <Zap className="h-4 w-4 mr-2" />
              {testLoading ? 'Testando...' : 'Testar API JWT'}
            </Button>
            <Button variant="outline" onClick={copyJwt}>
              {copied ? <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copiado!' : 'Copiar JWT'}
            </Button>
          </div>
          
          {testResult && (
            <div className={`p-4 rounded-lg font-mono text-sm ${
              testResult.error 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : testResult.ok 
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              <pre className="whitespace-pre-wrap overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools List */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-700">Ferramentas</CardTitle>
          <CardDescription className="text-slate-500">Lista de ferramentas automatizadas criadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : tools?.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-600">Nenhuma ferramenta criada</p>
              <p className="text-sm text-slate-500">Clique em "Nova ferramenta" para começar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tools?.map((tool) => {
                const areas = getToolAreas(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/equipe/dev/ferramenta/${tool.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-700">{tool.name}</h3>
                          {getStatusBadge(tool.status || 'development')}
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{tool.description}</p>
                        {areas.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-xs text-slate-500">Acesso:</span>
                            <div className="flex gap-1">
                              {areas.map((area) => (
                                <Badge key={area} variant="outline" className="text-xs border-slate-200 text-slate-600">
                                  {area}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DevLayout>
  );
};

export default DevDashboard;
