

## Refatorar visualizacao de cliente: modo leitura com edicao sob demanda

### Resumo
Quando o usuario clicar em um cliente na tabela principal, em vez do modal de contribuintes, abrira o **NewClientModal em modo somente-leitura**, com todas as abas (Cliente, Contribuintes, Participantes, OS) preenchidas mas sem edicao. Um botao "Editar" no header habilitara a edicao.

### Alteracoes

#### 1. `NewClientModal.tsx` - Adicionar modo somente-leitura

- Nova prop `readOnly?: boolean` (default `false`)
- Novo estado interno `isReadOnly` inicializado com a prop `readOnly`
- Botao "Editar" no header (icone Pencil) que alterna `isReadOnly` para `false`
- Quando `isReadOnly = true`:
  - Todos os inputs, selects, switches e textareas recebem `disabled` ou `readOnly`
  - Botoes "Adicionar contribuinte/participante/OS" ficam ocultos
  - Botoes de remover itens ficam ocultos
  - Footer com botao "Salvar" fica oculto
  - Botoes de navegacao (Proximo/Anterior) continuam funcionando
- Quando o usuario clica "Editar", muda para modo edicao normal (identico ao fluxo atual de editar)
- Reset de `isReadOnly` ao fechar o modal

#### 2. `GestaoClientes.tsx` - Simplificar interacao

- **Remover coluna "Acoes"** da tabela principal (header + cells)
- **Remover o modal de contribuintes** (Dialog de contribuintes, linhas 649-790)
- **Remover o modal de criar/editar contribuinte** (Dialog contribuinteDialog, linhas 792-894)
- **Remover estados relacionados**: `modalOpen`, `selectedCliente`, `modalPage`, `contribuinteDialogOpen`, `editingContribuinteId`, `savingContribuinte`, `contribuinteForm`
- **Remover funcoes**: `handleNovoContribuinte`, `handleEditContribuinte`, `handleSaveContribuinte`, `handleEditCliente`
- **Alterar `handleClienteClick`**: em vez de abrir modal de contribuintes, abre o `NewClientModal` com `editingClienteId` e `readOnly={true}`
- **Remover queries**: `contribuintesModal` e `loadingModal`

#### 3. Detalhes tecnicos

**Arquivo:** `src/components/equipe/dev/NewClientModal.tsx`
- Prop: `readOnly?: boolean`
- Estado: `const [isReadOnly, setIsReadOnly] = useState(readOnly ?? false)`
- useEffect para sincronizar `isReadOnly` quando `open` ou `readOnly` mudam
- Header condicional: se `isReadOnly`, mostrar botao "Editar" (teal) no lugar do X; manter X tambem
- Inputs: aplicar `disabled={isReadOnly}` em todos os campos de formulario
- Ocultar botoes de acao (adicionar/remover itens) quando `isReadOnly`
- Ocultar footer de salvar quando `isReadOnly`

**Arquivo:** `src/pages/equipe/dev/GestaoClientes.tsx`
- Reducao significativa de codigo (~250 linhas removidas)
- `handleClienteClick` agora faz: `setEditingClienteId(id); setNovoClienteModalOpen(true);`
- Nova prop `readOnly` no NewClientModal: inicialmente `true` quando vem do clique na tabela, `false` quando vem do botao "Novo cliente"
- Novo estado `viewMode` para diferenciar abertura por clique (view) vs botao novo (create)

