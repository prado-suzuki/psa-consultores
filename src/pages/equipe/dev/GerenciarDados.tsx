import { useState, useRef } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  CheckCircle,
  FileSpreadsheet,
  Database,
  Loader2,
  Info,
  Zap,
  Copy,
} from 'lucide-react';
import { getApiUrl } from '@/config/api';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CargaPerdcompCSV } from '@/components/equipe/dev/perdcomp/CargaPerdcompCSV';

type TableType = 'cliente' | 'contribuinte';
type AmbienteValue = 'producao' | 'desenvolvimento';


const GerenciarDados = () => {
  const [selectedTable, setSelectedTable] = useState<TableType>('cliente');
  const [selectedAmbiente, setSelectedAmbiente] = useState<AmbienteValue>('desenvolvimento');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ambienteLabel = selectedAmbiente === 'producao' ? 'Produção' : 'Desenvolvimento';

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    // Detecta automaticamente o separador (vírgula ou ponto e vírgula)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    
    const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(separator).map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }
    
    return rows;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        throw new Error('CSV vazio ou formato inválido. Use ; como separador.');
      }

      if (selectedTable === 'cliente') {
        const clientes = rows.map(row => ({
          id: row.id_cliente || row.id || undefined,
          nome: row.nome || row.name || '',
          ativo: row.ativo?.toLowerCase() === 'true' || row.ativo === '1' || true,
          fixo: row.fixo || undefined,
          telefone: row.telefone || row.phone || undefined,
          setor_cliente: row.setor_cliente || row.setor || undefined,
          municipio: row.municipio || row.cidade || undefined,
          uf: row.uf || row.estado || undefined,
          ambiente: selectedAmbiente,
        })).filter(c => c.nome);

        if (clientes.length === 0) {
          throw new Error('Nenhum cliente válido encontrado. Verifique se a coluna "nome" existe.');
        }

        const { error } = await supabase
          .from('cliente')
          .insert(clientes);

        if (error) throw error;

        setResult({
          success: true,
          message: `${clientes.length} clientes importados (${ambienteLabel})!`,
          count: clientes.length
        });
      } else {
        const { data: clientesExistentes } = await supabase
          .from('cliente')
          .select('id, nome')
          .eq('ambiente', selectedAmbiente);

        const clienteMap = new Map(clientesExistentes?.map(c => [c.nome.toLowerCase(), c.id]) || []);

        const contribuintes = rows.map(row => {
          const clienteNome = (row.cliente || row.cliente_nome || '').toLowerCase();
          const clienteId = row.id_cliente || row.cliente_id || clienteMap.get(clienteNome) || '';
          
          return {
            id: row.id_contribuinte || row.id || undefined,
            cliente_id: clienteId,
            tipo_pessoa: row.tipo_pessoa || (row.cpf_cnpj?.replace(/\D/g, '').length === 11 ? 'PF' : 'PJ'),
            nome_razao_social: row.nome_razao_social || row.nome || row.razao_social || '',
            cpf_cnpj: row.cpf_cnpj || row.cnpj || row.cpf || undefined,
            inscricao_estadual: row.inscricao_estadual || row.ie || undefined,
            cod_cnae: row.cod_cnae || row.cnae || undefined,
            setor: row.setor || undefined,
            simples_nacional: row.simples_nacional?.toLowerCase() === 'true' || row.simples_nacional === '1' || false,
            ambiente: selectedAmbiente,
          };
        }).filter(c => c.nome_razao_social && c.cliente_id);

        if (contribuintes.length === 0) {
          throw new Error('Nenhum contribuinte válido encontrado. Verifique se as colunas "nome_razao_social" e "cliente" (ou cliente_id) existem.');
        }

        const { error } = await supabase
          .from('contribuinte')
          .insert(contribuintes);

        if (error) throw error;

        setResult({
          success: true,
          message: `${contribuintes.length} contribuintes importados (${ambienteLabel})!`,
          count: contribuintes.length
        });
      }

      toast({
        title: 'Importação concluída',
        description: result?.message || 'Dados importados com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro na importação:', error);
      setResult({
        success: false,
        message: error.message || 'Erro ao importar dados'
      });
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearTable = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Para limpar clientes, precisamos deletar contribuintes primeiro (FK)
      if (selectedTable === 'cliente') {
        const { error: contribError } = await supabase
          .from('contribuinte')
          .delete()
          .eq('ambiente', selectedAmbiente);

        if (contribError) throw contribError;
      }

      const { error } = await supabase
        .from(selectedTable)
        .delete()
        .eq('ambiente', selectedAmbiente);

      if (error) throw error;

      setResult({
        success: true,
        message: selectedTable === 'cliente' 
          ? `Clientes e contribuintes (${ambienteLabel}) limpos!` 
          : `Contribuintes (${ambienteLabel}) limpos!`
      });

      toast({
        title: 'Tabela limpa',
        description: `Registros de ${ambienteLabel} removidos.`,
      });
    } catch (error: any) {
      console.error('Erro ao limpar tabela:', error);
      setResult({
        success: false,
        message: error.message || 'Erro ao limpar tabela'
      });
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DevLayout 
      title="Gerenciar dados" 
      subtitle="Importe ou limpe dados das tabelas cliente e contribuinte"
    >
      <div className="space-y-6 max-w-3xl">
        {/* Aviso */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Formato CSV</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Use <strong>;</strong> (ponto e vírgula) como separador.</p>
            <p className="text-xs text-muted-foreground">
              <strong>Cliente:</strong> nome, ativo, fixo, telefone, setor_cliente, municipio, uf
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Contribuinte:</strong> cliente (nome do cliente), nome_razao_social, tipo_pessoa, cpf_cnpj, inscricao_estadual, cod_cnae, setor, simples_nacional
            </p>
          </AlertDescription>
        </Alert>

        {/* Seleção de Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Selecionar tabela
            </CardTitle>
            <CardDescription>Escolha qual tabela deseja gerenciar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium mb-3 block">Tabela</Label>
                <RadioGroup 
                  value={selectedTable} 
                  onValueChange={(v) => setSelectedTable(v as TableType)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cliente" id="cliente" />
                    <Label htmlFor="cliente" className="cursor-pointer">Cliente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="contribuinte" id="contribuinte" />
                    <Label htmlFor="contribuinte" className="cursor-pointer">Contribuinte</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-sm font-medium mb-3 block">Ambiente</Label>
                <RadioGroup 
                  value={selectedAmbiente} 
                  onValueChange={(v) => setSelectedAmbiente(v as AmbienteValue)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="desenvolvimento" id="dev" />
                    <Label htmlFor="dev" className="cursor-pointer flex items-center gap-2">
                      Desenvolvimento
                      <Badge variant="secondary" className="text-xs">dev</Badge>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="producao" id="prod" />
                    <Label htmlFor="prod" className="cursor-pointer flex items-center gap-2">
                      Produção
                      <Badge variant="destructive" className="text-xs">CUIDADO</Badge>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Tabela: <strong className="text-foreground">{selectedTable}</strong> · Ambiente: <strong className="text-foreground">{ambienteLabel}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Importar dados via CSV ou limpar a tabela</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Upload CSV */}
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Importar CSV
                </Button>
              </div>

              {/* Limpar Tabela */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={loading} className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Limpar tabela
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Confirmar exclusão
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {selectedTable === 'cliente' ? (
                        <>
                          Esta ação irá <strong>remover todos os registros</strong> de cliente e contribuinte
                          com ambiente <strong>{ambienteLabel}</strong> (devido à FK).
                        </>
                      ) : (
                        <>
                          Esta ação irá <strong>remover todos os registros</strong> de contribuinte
                          com ambiente <strong>{ambienteLabel}</strong>.
                        </>
                      )}
                      <br /><br />
                      <strong>Esta ação não pode ser desfeita!</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleClearTable}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, limpar tabela
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Resultado */}
            {result && (
              <Alert variant={result.success ? 'default' : 'destructive'}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>{result.success ? 'Sucesso' : 'Erro'}</AlertTitle>
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Template CSV */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Template CSV
            </CardTitle>
            <CardDescription>Copie o template abaixo para criar seu arquivo CSV</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTable === 'cliente' ? (
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`nome;ativo;fixo;telefone;setor_cliente;municipio;uf
Empresa ABC;true;1112223333;11999998888;Comércio;São Paulo;SP
Indústria XYZ;true;;11988887777;Indústria;Campinas;SP`}
              </pre>
            ) : (
              <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
{`cliente;nome_razao_social;tipo_pessoa;cpf_cnpj;inscricao_estadual;cod_cnae;setor;simples_nacional
Empresa ABC;Matriz ABC LTDA;PJ;12345678000199;123456789;4711302;Varejo;false
Empresa ABC;Filial ABC Norte;PJ;12345678000280;123456790;4711302;Varejo;true`}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Separador */}
        <Separator className="my-8" />

        {/* Carga PER/DCOMP */}
        <CargaPerdcompCSV />

        {/* Debug: Teste API Cloud Run */}
        <DebugApiCard />
      </div>
    </DevLayout>
  );
};

/* ── Bloco de Debug (movido do Dashboard Dev) ── */
function DebugApiCard() {
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
      const response = await fetch(getApiUrl('/auth_health'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setTestResult({ status: response.status, ok: response.ok, data });
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

  return (
    <Card className="border-amber-300 border-2 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Debug: Teste API Cloud Run</CardTitle>
        </div>
        <CardDescription>Temporário — Remover depois dos testes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4">
          <Button onClick={testApiHealth} disabled={testLoading} className="gap-2">
            <Zap className="h-4 w-4" />
            {testLoading ? 'Testando...' : 'Testar API JWT'}
          </Button>
          <Button variant="outline" onClick={copyJwt} className="gap-2">
            {copied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
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
  );
}

export default GerenciarDados;