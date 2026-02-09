

# Adicionar Coluna Categoria ao Lado do Nome + Filtro de Categoria

## Resumo

Duas alteracoes na tela de Gestao de Clientes:
1. Adicionar coluna **Categoria** na tabela de resultados, posicionada logo apos "Nome Cliente"
2. Adicionar filtro de **Categoria** na area de filtros de busca

---

## 1. Migracao de Banco de Dados

Adicionar coluna `categoria` (text, nullable) nas tabelas `cliente` e `cliente_dev`:

```text
ALTER TABLE public.cliente ADD COLUMN categoria text DEFAULT NULL;
ALTER TABLE public.cliente_dev ADD COLUMN categoria text DEFAULT NULL;
```

As politicas de RLS existentes ja cobrem novas colunas automaticamente.

---

## 2. Filtro de Categoria (area de filtros)

Adicionar um novo Select de **Categoria** na grade de filtros, apos o filtro de Tipo.

Reorganizar o grid de 12 colunas para acomodar o novo filtro:
- Cliente: 3 colunas
- Contribuinte: 4 colunas
- Status: 2 colunas
- Tipo: 1.5 colunas
- **Categoria: 1.5 colunas**

Opcoes do Select:
- Todos (placeholder/default)
- Bronze
- Prata
- Ouro
- Diamante

O filtro sera aplicado no `useMemo` que gera `resultados`, filtrando por `categoria` quando selecionado.

---

## 3. Coluna Categoria na Tabela de Resultados

Nova ordem das colunas:

| Nome Cliente | **Categoria** | Status | Tipo Cliente | Telefone | Setor |

Exibicao como Badge colorido:
- **Bronze**: bg-amber-100 text-amber-800
- **Prata**: bg-slate-200 text-slate-700
- **Ouro**: bg-yellow-100 text-yellow-800
- **Diamante**: bg-blue-100 text-blue-800
- Sem categoria: exibe "-"

---

## 4. Sincronizacao com DW

Atualizar o tipo do payload em `syncCadastrosToDW` para incluir o campo `categoria`.

---

## 5. FiscalClients.tsx

Adicionar coluna "Categoria" na tabela de clientes do fiscal, apos "Nome", com o mesmo Badge colorido.

---

## Detalhes Tecnicos

### Arquivo: `src/pages/equipe/dev/GestaoClientes.tsx`

1. **Novo estado**: `const [categoria, setCategoria] = useState('')`
2. **syncCadastrosToDW payload** (linha 8): adicionar `categoria: string | null`
3. **hasActiveFilters** (linha ~290): incluir `|| categoria`
4. **handleClear**: resetar `categoria`
5. **resultados useMemo**: adicionar filtro por `categoria`
6. **Grid de filtros** (linha 473): ajustar colunas e adicionar Select de Categoria
7. **TableHeader** (linha 574): inserir "Categoria" apos "Nome Cliente"
8. **TableBody** (linha 592): inserir celula com Badge colorido apos nome
9. **handleSaveCliente**: incluir `categoria` no payload de insert/update
10. **Modal de criar/editar**: adicionar campo Select de categoria

### Arquivo: `src/components/equipe/fiscal/FiscalClients.tsx`
- Adicionar coluna "Categoria" apos "Cliente" com Badge colorido

