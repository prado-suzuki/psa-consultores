
# Plano: Paginação e Modal de Contribuintes

## Objetivo

Adicionar paginação de 10 itens por página na tabela de clientes e criar um modal para visualizar os contribuintes de um cliente ao clicar no seu nome.

## Alterações a Realizar

### 1. Adicionar Paginação (10 por página)

| Item | Descrição |
|------|-----------|
| Novo estado | `currentPage` (número da página atual) |
| Constante | `ITEMS_PER_PAGE = 10` |
| Cálculos | `totalPages`, `paginatedResults` |
| Componentes | Importar componentes de paginação |

### 2. Criar Modal de Contribuintes

O modal seguirá o mesmo estilo do `EFDAnalysisModal`:

```text
+----------------------------------------------------------------+
| [Building2 icon]  NOME DO CLIENTE                         [X]  |
+----------------------------------------------------------------+
|                                                                 |
|  +----------------------------------------------------------+  |
|  | Razão Social | Tipo | Setor | Simples | CPF/CNPJ | IE | CNAE |
|  +----------------------------------------------------------+  |
|  | Empresa XYZ  | PJ   | ...   | Sim     | 00.000...| ... | ... |
|  | ...          | ...  | ...   | ...     | ...      | ... | ... |
|  +----------------------------------------------------------+  |
|                                                                 |
|  Exibindo X de Y contribuintes           Página 1 de N  [<][>] |
+----------------------------------------------------------------+
```

### 3. Colunas do Modal (na ordem especificada)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| Nome/Razão Social | nome_razao_social | Nome ou razão social |
| Tipo Pessoa | tipo_pessoa | PJ ou PF |
| Setor | setor | Setor de atuação |
| Simples Nacional | simples_nacional | Sim/Não |
| CPF/CNPJ | cpf_cnpj | Documento formatado |
| Inscrição Estadual | inscricao_estadual | IE do contribuinte |
| Código CNAE | cod_cnae | Código CNAE |

### 4. Estados a Adicionar

```text
// Paginação da tabela principal
currentPage: number (padrão 1)

// Modal de contribuintes
modalOpen: boolean (padrão false)
selectedCliente: { id: string, nome: string } | null
modalPage: number (padrão 1)
```

### 5. Queries a Adicionar

```text
// Query para contribuintes do cliente selecionado (no modal)
useQuery({
  queryKey: ['contribuintes-modal', selectedCliente?.id],
  queryFn: buscar contribuintes onde cliente_id = selectedCliente.id
  enabled: modalOpen && !!selectedCliente
})
```

## Detalhes Técnicos

### Imports a Adicionar

```text
- Dialog, DialogContent do @/components/ui/dialog
- ChevronLeft, ChevronRight, Building2 do lucide-react
- Pagination components do @/components/ui/pagination
```

### Lógica de Paginação (Tabela Principal)

```text
const ITEMS_PER_PAGE = 10;
const totalPages = Math.ceil(resultados.length / ITEMS_PER_PAGE);
const paginatedResults = resultados.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);
```

### Lógica de Paginação (Modal)

```text
const MODAL_ITEMS_PER_PAGE = 10;
const modalTotalPages = Math.ceil(contribuintesModal.length / MODAL_ITEMS_PER_PAGE);
const paginatedContribuintes = contribuintesModal.slice(
  (modalPage - 1) * MODAL_ITEMS_PER_PAGE,
  modalPage * MODAL_ITEMS_PER_PAGE
);
```

### Estilo do Modal (baseado em EFDAnalysisModal)

```text
DialogContent:
- max-w-6xl (largura ampla para a tabela)
- h-auto max-h-[80vh]
- Sem [&>button]:hidden (mantém botão X padrão)

Header:
- h-16 border-b bg-white
- Ícone Building2 em círculo colorido
- Nome do cliente em destaque

Body:
- Tabela com scroll se necessário
- Padding adequado

Footer:
- Contagem de registros
- Controles de paginação
```

### Handler para Abrir Modal

```text
const handleClienteClick = (cliente: { id: string, nome: string }) => {
  setSelectedClienteModal(cliente);
  setModalOpen(true);
  setModalPage(1);
};
```

## Formatadores a Adicionar

```text
// Formatar CPF/CNPJ
formatCpfCnpj(value: string | null) => formatar com pontos/barras

// Formatar Simples Nacional
formatSimples(value: string | null) => "Sim", "Não" ou "-"
```

## Layout Final da Página

```text
+------------------------------------------+
| Card de Filtros                          |
| [Cliente] [Contribuinte] [Status] [Tipo] |
| [Limpar] [Buscar]                        |
+------------------------------------------+

+------------------------------------------+
| Card de Resultados                       |
| Resultados (X clientes)                  |
| +--------------------------------------+ |
| | Nome Cliente | Status | Tipo | Tel | | |
| | [clicável]   | ...    | ...  | ... | | |
| +--------------------------------------+ |
| Página 1 de N                    [<][>]  |
+------------------------------------------+

+------------------------------------------+
| Modal: NOME DO CLIENTE              [X]  |
| +--------------------------------------+ |
| | Razão | Tipo | Setor | Simples | ... | |
| +--------------------------------------+ |
| Exibindo X de Y           Pág 1 de N     |
+------------------------------------------+
```

## Arquivo a Modificar

`src/pages/equipe/dev/GestaoClientes.tsx`

## Resumo das Alterações

1. Adicionar paginação de 10 itens na tabela de clientes
2. Tornar nome do cliente clicável (cursor-pointer, hover underline)
3. Criar estados para modal e paginação
4. Criar query para buscar contribuintes do cliente selecionado
5. Implementar modal no estilo EFDAnalysisModal
6. Tabela do modal com colunas na ordem especificada
7. Paginação no modal com 10 itens por página
8. Formatadores para CPF/CNPJ e Simples Nacional
