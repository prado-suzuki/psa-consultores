

# Criar ferramenta Controle de Balancetes

## Arquivos a criar/modificar

### 1. Novo arquivo: `src/pages/equipe/dev/ControleBalancetes.tsx`

Pagina principal seguindo o padrao visual de GestaoClientes/ControlePerdcomp:

- **Card de Filtros** com CardHeader (`[Filter] FILTROS DE BUSCA`) e grid 12 colunas contendo:
  - Cliente (col-span-4): Select populado via `TABLE_NAMES.cliente`
  - Contribuinte (col-span-4): Select populado via `TABLE_NAMES.contribuinte`, filtrado pelo cliente selecionado
  - Periodo (col-span-4): MonthYearPicker para filtrar por mes/ano
- Rodape com botoes "Limpar filtros" (outline, vermelho sutil) e "Buscar" (teal solido)

- **Card de Resultados** com CardHeader contendo titulo "Balancetes" e botao "+ Novo Balancete" alinhado a direita
- Tabela de resultados inicialmente vazia (placeholder para futuras consultas)

- Ao clicar em "+ Novo Balancete", abre o modal de upload

### 2. Novo arquivo: `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx`

Modal (Dialog) com os seguintes campos:

- **Cliente** (Select): lista de clientes via `TABLE_NAMES.cliente`
- **Contribuinte** (Select): filtrado pelo cliente selecionado, via `TABLE_NAMES.contribuinte`
- **Periodo Inicio** (MonthYearPicker): seleciona mes/ano, converte para `yyyy-mm-01`
- **Periodo Fim** (MonthYearPicker): seleciona mes/ano, converte para ultimo dia do mes
- **Arquivo** (input type="file"): aceita apenas `.xlsx, .xls`

Ao submeter:
- Monta um `FormData` com os campos: `id_contribuinte`, `periodo_inicio`, `periodo_fim`, `adicionado_por` (email do usuario logado via `useAuth`), e o arquivo
- Envia via POST para `getApiUrl('/api/v1/contabil/balancetes')` usando `fetchWithAuth` (sem Content-Type, para o browser definir o boundary do multipart)
- Exibe toast de sucesso ou erro

### 3. Modificar: `src/hooks/useApiAuth.ts`

**Problema critico**: `fetchWithAuth` sempre injeta `Content-Type: application/json`, o que quebra uploads `multipart/form-data` (o browser precisa definir o boundary automaticamente).

**Solucao**: Quando `options.body` for uma instancia de `FormData`, nao incluir `Content-Type` nos headers. Apenas incluir `Authorization`.

```text
Antes:
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

Depois:
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Authorization': `Bearer ${token}`,
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  };
```

Aplicar a mesma logica no bloco de retry (headers do 401).

### 4. Modificar: `src/components/equipe/dev/DevLayout.tsx`

Adicionar item na sidebar (navItems):

```text
{ icon: FileText, label: 'Controle Balancetes', path: '/equipe/dev/controle-balancetes' }
```

Posicionar antes de "Gestao de clientes" na lista.

### 5. Modificar: `src/App.tsx`

Adicionar rota:

```text
import ControleBalancetes from "./pages/equipe/dev/ControleBalancetes";

<Route path="/equipe/dev/controle-balancetes"
  element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/controle-balancetes"><ControleBalancetes /></PageAccessGate></TeamRoute>} />
```

## Resumo de arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/equipe/dev/ControleBalancetes.tsx` | Criar |
| `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx` | Criar |
| `src/hooks/useApiAuth.ts` | Modificar (FormData support) |
| `src/components/equipe/dev/DevLayout.tsx` | Modificar (nav item) |
| `src/App.tsx` | Modificar (rota) |

