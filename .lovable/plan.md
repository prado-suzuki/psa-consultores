

## Plano: Filtro de Filiais com Nome no Badge do CNPJ

### Objetivo
Adicionar um dropdown de filtro de filiais diretamente no badge do CNPJ, exibindo o **nome do estabelecimento** (campo `NOME`) e o código da filial. O CNPJ permanecerá visível em tamanho menor abaixo.

---

### Dados Disponíveis da API

A API já retorna os campos necessários em cada arquivo `EFDArquivo`:

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `NOME` | Nome do estabelecimento | "EMPRESA ABC LTDA - FILIAL SP" |
| `num_filial` | Código da filial | "0001" (ou null para matriz) |
| `IE` | Inscrição Estadual | "123456789110" |
| `CNPJ` | CNPJ completo com dígitos da filial | "33664228000235" |

---

### Layout Proposto

**Antes (atual):**
```
+----------------------------------------------------------+
|  Building2 CNPJ: 33.664.228/0001-35  [Refresh] [Baixar]  |
+----------------------------------------------------------+
```

**Depois (novo):**
```
+----------------------------------------------------------+
|  Building2  [EMPRESA ABC - MATRIZ     ▼]  [↻] [Baixar]   |
|             CNPJ: 33.664.228/0001-35                     |
+----------------------------------------------------------+
```

Dropdown expandido:
```
+------------------------------------------+
| Todas as filiais                         |
| ---------------------------------------- |
| EMPRESA ABC LTDA                  (0000) |
| EMPRESA ABC - FILIAL SP           (0001) |
| EMPRESA ABC - FILIAL RJ           (0002) |
+------------------------------------------+
```

---

### Alterações Técnicas

#### Arquivo: `src/pages/equipe/dev/ConsultaEFDICMS.tsx`

| Seção | Alteração |
|-------|-----------|
| Estado | Adicionar `selectedFilial: string` (default "todas") |
| Memoização | Criar `filiaisDisponiveis` extraindo combinações únicas de `NOME + num_filial` |
| Filtragem | Atualizar `arquivosFiltrados` para incluir filtro por filial |
| Header UI | Substituir badge estático por dropdown com nome + CNPJ menor |
| Clear | Resetar `selectedFilial` em `handleClearFilters` |

---

### Implementacao Detalhada

#### 1. Novo Estado
```typescript
const [selectedFilial, setSelectedFilial] = useState<string>("todas");
```

#### 2. Extrair Filiais Unicas dos Arquivos
```typescript
interface FilialOption {
  codigo: string;      // "0000", "0001", etc.
  nome: string;        // Nome do estabelecimento
  ie: string;          // Inscricao Estadual
  cnpjCompleto: string; // CNPJ completo com digitos da filial
}

const filiaisDisponiveis = useMemo((): FilialOption[] => {
  if (!overview?.arquivos) return [];
  
  const filiaisMap = new Map<string, FilialOption>();
  
  overview.arquivos.forEach(arq => {
    const codigo = arq.num_filial || '0000';
    
    if (!filiaisMap.has(codigo)) {
      filiaisMap.set(codigo, {
        codigo,
        nome: arq.NOME || (codigo === '0000' ? 'Matriz' : `Filial ${codigo}`),
        ie: arq.IE || '',
        cnpjCompleto: arq.CNPJ,
      });
    }
  });
  
  return Array.from(filiaisMap.values())
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}, [overview?.arquivos]);
```

#### 3. Atualizar Filtragem
```typescript
const arquivosFiltrados = useMemo(() => {
  if (!overview?.arquivos) return [];
  
  let filtrados = overview.arquivos;
  
  // Filtro por filial
  if (selectedFilial && selectedFilial !== 'todas') {
    filtrados = filtrados.filter(arq => 
      (arq.num_filial || '0000') === selectedFilial
    );
  }
  
  // Filtro por periodo (existente)
  if (dataInicio || dataFim) {
    filtrados = filtrados.filter(arquivo => {
      const arquivoInicio = new Date(arquivo.DT_INI);
      const arquivoFim = new Date(arquivo.DT_FIN);
      const filtroInicio = dataInicio ? new Date(dataInicio) : null;
      const filtroFim = dataFim ? new Date(dataFim) : null;
      
      const depoisDoInicio = !filtroInicio || arquivoFim >= filtroInicio;
      const antesDoFim = !filtroFim || arquivoInicio <= filtroFim;
      
      return depoisDoInicio && antesDoFim;
    });
  }
  
  return filtrados;
}, [overview?.arquivos, selectedFilial, dataInicio, dataFim]);
```

#### 4. Obter Dados da Filial Selecionada (para exibicao)
```typescript
const filialSelecionada = useMemo(() => {
  if (selectedFilial === 'todas' || filiaisDisponiveis.length === 0) {
    return null;
  }
  return filiaisDisponiveis.find(f => f.codigo === selectedFilial) || null;
}, [selectedFilial, filiaisDisponiveis]);
```

#### 5. Novo Header com Dropdown (substituir linhas 471-519)
```tsx
{overview?.cnpj && (
  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
    <div className="flex items-center justify-between">
      {/* Lado Esquerdo - Dropdown de Filial + CNPJ */}
      <div className="flex items-center gap-4">
        <Building2 className="h-5 w-5 text-primary" />
        
        <div className="flex flex-col">
          {/* Dropdown de Filial */}
          <Select 
            value={selectedFilial} 
            onValueChange={setSelectedFilial}
          >
            <SelectTrigger className="h-auto w-auto min-w-[200px] border-0 bg-transparent p-0 shadow-none gap-1.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-0 [&>svg]:h-4 [&>svg]:w-4">
              <SelectValue>
                {selectedFilial === 'todas' 
                  ? 'Todas as filiais' 
                  : filialSelecionada?.nome || 'Matriz'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border z-50 min-w-[300px]">
              <SelectItem value="todas">
                <span className="font-medium">Todas as filiais</span>
              </SelectItem>
              {filiaisDisponiveis.map(filial => (
                <SelectItem key={filial.codigo} value={filial.codigo}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span className="font-medium truncate max-w-[200px]">
                      {filial.nome}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({filial.codigo})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* CNPJ em tamanho menor */}
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            CNPJ: {formatCNPJ(
              selectedFilial !== 'todas' && filialSelecionada 
                ? filialSelecionada.cnpjCompleto 
                : overview.cnpj
            )}
          </span>
        </div>
        
        {/* Botao Refresh */}
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={() => refetchOverview()}
          disabled={loadingOverview}
        >
          {loadingOverview ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Lado Direito - Baixar Todos (mantido) */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={downloadingAll || arquivosFiltrados.length === 0}
              className="gap-2"
            >
              {downloadingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar Todos
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Baixar {arquivosFiltrados.length} arquivo(s) em ZIP</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </div>
)}
```

#### 6. Atualizar handleClearFilters
```typescript
const handleClearFilters = () => {
  setSelectedCliente("");
  setSelectedContribuinte("");
  setSelectedFilial("todas");  // Novo
  setMesInicio(null);
  setMesFim(null);
  setSearchTriggered(false);
};
```

#### 7. Resetar Filial ao Mudar Contribuinte
Adicionar no onChange do contribuinte:
```typescript
onValueChange={(value) => {
  setSelectedContribuinte(value);
  setSelectedFilial("todas");  // Resetar filial
  setSearchTriggered(false);
}}
```

---

### Comportamento Esperado

1. Usuario busca arquivos de um contribuinte
2. API retorna todos os arquivos com diferentes filiais
3. Dropdown mostra "Todas as filiais" por padrao
4. Ao expandir, exibe lista com nome do estabelecimento + codigo
5. CNPJ completo (com digitos da filial) aparece abaixo
6. Ao selecionar uma filial, tabela e de filtrada
7. "Baixar Todos" respeita o filtro de filial ativo
8. "Limpar Filtros" reseta para "Todas as filiais"

---

### Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/equipe/dev/ConsultaEFDICMS.tsx` | Implementar filtro de filiais com nome |

