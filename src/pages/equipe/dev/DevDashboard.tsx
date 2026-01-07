import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Code2, Users, Play, Pause, AlertCircle, Zap, Copy, CheckCircle } from 'lucide-react';

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
        'https://psa-backend-api-456879351254.southamerica-east1.run.app/auth_health',
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
        return <Badge className="bg-green-100 text-green-700"><Play className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'development':
        return <Badge className="bg-yellow-100 text-yellow-700"><Code2 className="h-3 w-3 mr-1" />Em Desenvolvimento</Badge>;
      case 'deprecated':
        return <Badge className="bg-red-100 text-red-700"><Pause className="h-3 w-3 mr-1" />Descontinuado</Badge>;
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
          Nova Ferramenta
        </Button>
      }
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Ferramentas</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ferramentas Ativas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Em Desenvolvimento</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{stats.development}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Debug Card - Teste API */}
      <Card className="mb-6 border-yellow-400 border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">Debug: Teste API Cloud Run</CardTitle>
          </div>
          <CardDescription>Temporário - Remover depois dos testes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Button onClick={testApiHealth} disabled={testLoading}>
              <Zap className="h-4 w-4 mr-2" />
              {testLoading ? 'Testando...' : 'Testar API JWT'}
            </Button>
            <Button variant="outline" onClick={copyJwt}>
              {copied ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copiado!' : 'Copiar JWT'}
            </Button>
          </div>
          
          {testResult && (
            <div className={`p-4 rounded-lg font-mono text-sm ${
              testResult.error 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : testResult.ok 
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            }`}>
              <pre className="whitespace-pre-wrap overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tools List */}
      <Card>
        <CardHeader>
          <CardTitle>Ferramentas</CardTitle>
          <CardDescription>Lista de ferramentas automatizadas criadas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : tools?.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhuma ferramenta criada</p>
              <p className="text-sm">Clique em "Nova Ferramenta" para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tools?.map((tool) => {
                const areas = getToolAreas(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/equipe/dev/ferramenta/${tool.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                          {getStatusBadge(tool.status || 'development')}
                        </div>
                        <p className="text-sm text-gray-500 mb-3">{tool.description}</p>
                        {areas.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Acesso:</span>
                            <div className="flex gap-1">
                              {areas.map((area) => (
                                <Badge key={area} variant="outline" className="text-xs">
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