
# Plano: Corrigir Tela Branca na Aba de Relatórios

## Problema Identificado

A página de Relatórios (`EquipeRelatorios.tsx`) está ficando branca ao tentar acessar. Isso ocorre devido a **erros assíncronos não tratados** nos `useEffect` do componente que:

1. Convertem o logo para base64
2. Buscam a lista de projetos do banco de dados

Quando um erro assíncrono ocorre após a renderização inicial do componente, o React não consegue capturá-lo com error boundaries tradicionais, resultando em uma tela branca.

---

## Solução

Adicionar tratamento de erro robusto com `try/catch` em todas as operações assíncronas e incluir estados de loading/erro para feedback visual.

---

## Alterações no Arquivo

### `src/pages/equipe/EquipeRelatorios.tsx`

#### 1. Adicionar Estados de Loading e Erro

```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

#### 2. Corrigir useEffect de Conversão do Logo

```typescript
useEffect(() => {
  const convertLogo = async () => {
    try {
      const response = await fetch(logoPsa);
      if (!response.ok) {
        throw new Error('Failed to fetch logo');
      }
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result as string);
      };
      reader.onerror = () => {
        console.error('Error reading logo file');
        // Continue sem o logo - não bloqueia a página
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error converting logo:', error);
      // Continue sem o logo - não bloqueia a página
    }
  };
  convertLogo();
}, []);
```

#### 3. Corrigir useEffect de Fetch dos Projetos

```typescript
useEffect(() => {
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');
      
      if (error) {
        throw error;
      }
      
      if (data) setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Erro ao carregar projetos. Tente recarregar a página.');
    } finally {
      setLoading(false);
    }
  };
  fetchProjects();
}, []);
```

#### 4. Adicionar Tratamento de Erro nas Funções de Geração

```typescript
const handleGenerateReport = async (type: ReportType, format: 'pdf' | 'xlsx' | 'html' | 'preview') => {
  setGenerating(type);
  
  try {
    const config: ReportConfig = {
      type,
      dateRange,
      projectId: projectFilter || undefined
    };

    const data = await fetchReportData(config);
    
    // ... resto da lógica
  } catch (error) {
    console.error('Error generating report:', error);
    toast.error('Erro ao gerar relatório. Verifique sua conexão.');
  } finally {
    setGenerating(null);
  }
};
```

#### 5. Adicionar UI de Feedback

```tsx
// No início do return, antes do conteúdo principal:
{loading && (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="ml-3 text-muted-foreground">Carregando...</span>
  </div>
)}

{error && !loading && (
  <Card className="border-destructive">
    <CardContent className="py-6">
      <div className="flex items-center gap-3 text-destructive">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => window.location.reload()}
      >
        Recarregar Página
      </Button>
    </CardContent>
  </Card>
)}

{!loading && !error && (
  // Conteúdo principal da página
)}
```

---

## Alterações no Arquivo `src/lib/reportGenerator.ts`

### Adicionar Try/Catch nas Funções de Fetch

Cada função de fetch de dados precisa de tratamento de erro para evitar que erros de banco de dados causem tela branca:

```typescript
async function fetchSprintData(config: ReportConfig): Promise<ReportData> {
  try {
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select(`*, sprint_deliverables(*)`)
      .gte('start_date', config.dateRange.start || '2000-01-01')
      .lte('end_date', config.dateRange.end || '2099-12-31');

    if (error) throw error;
    
    // ... resto da lógica
  } catch (error) {
    console.error('Error fetching sprint data:', error);
    // Retorna dados vazios em vez de quebrar
    return {
      title: 'Relatório de Sprints',
      subtitle: 'Erro ao carregar dados',
      period: 'N/A',
      metrics: [],
      tables: []
    };
  }
}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/equipe/EquipeRelatorios.tsx` | Adicionar estados de loading/error, try/catch nos useEffects e funções de geração |
| `src/lib/reportGenerator.ts` | Adicionar try/catch em cada função de fetch para evitar erros não tratados |

---

## Resultado Esperado

1. A página carregará corretamente mostrando um indicador de loading
2. Se houver erro, mostrará uma mensagem amigável com opção de recarregar
3. Erros de banco de dados ou rede serão capturados e tratados graciosamente
4. Nenhum erro assíncrono causará tela branca
