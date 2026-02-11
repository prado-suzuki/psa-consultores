

# Reutilizar Modal de Cadastro Completo para Editar Cliente

## Resumo

Substituir o modal simples de editar cliente pelo mesmo modal completo usado no cadastro ("Cadastro Completo"), permitindo editar todas as 4 secoes (Dados, Contribuintes, Participantes, Contratos) de um cliente existente. O modal antigo de edicao sera removido.

## Alteracoes

### 1. NewClientModal.tsx - Adicionar modo de edicao

- Adicionar prop opcional `editingClienteId?: string | null` na interface `NewClientModalProps`
- Quando `editingClienteId` estiver presente:
  - Carregar dados do cliente existente da tabela `cliente`/`cliente_dev` e popular `clientData`
  - Carregar contribuintes existentes da tabela `contribuinte`/`contribuinte_dev` e popular `entities` (convertendo para `DraftEntity`)
  - Carregar participantes existentes da tabela `participante`/`participante_dev` e popular `participants` (convertendo para `DraftParticipant`)
  - Carregar contratos existentes da tabela `contrato` com servicos da tabela `servico` e popular `contracts` (convertendo para `DraftContract`)
  - Usar `useEffect` para buscar esses dados quando o modal abre com um `editingClienteId`
- Alterar header do modal: exibir "Editar Cliente" em vez de "Cadastro Completo" quando em modo edicao
- Alterar `handleSave`:
  - Se `editingClienteId` existir, fazer `update` no cliente em vez de `insert`
  - Para contribuintes/participantes/contratos: estrategia de "delete all + re-insert" (deletar os existentes vinculados ao cliente e inserir os novos da lista draft), simplificando a logica de diff
- Alterar texto do botao: "Salvar Alteracoes" em vez de "Salvar Cliente Completo"

### 2. GestaoClientes.tsx - Remover modal antigo e usar NewClientModal

- Remover estados do modal antigo de edicao: `clienteDialogOpen`, `editingClienteId` (do cliente), `savingCliente`, `clienteForm`
- Remover funcao `handleNovoCliente` (nao usada mais separadamente)
- Remover funcao `handleSaveCliente` (sera feito pelo NewClientModal)
- Remover o bloco JSX do "Modal de Editar Cliente" (linhas 899-1013)
- Adicionar estado `editingClienteId` (string | null) para controlar qual cliente esta sendo editado
- Alterar `handleEditCliente` para setar o `editingClienteId` e abrir o `NewClientModal`
- Passar `editingClienteId` como prop para o `NewClientModal`
- Quando `NewClientModal` fechar, limpar `editingClienteId`

## Detalhes Tecnicos

### Carregamento de dados existentes no NewClientModal

```ts
// Novo useEffect para carregar dados quando editando
useEffect(() => {
  if (!open || !editingClienteId) return;
  
  const loadData = async () => {
    // 1. Cliente
    const { data: cli } = await supabase.from(clienteTable).select('*').eq('id', editingClienteId).single();
    if (cli) setClientData({ nome: cli.nome, categoria: cli.categoria || 'Bronze', ... });
    
    // 2. Contribuintes
    const { data: contribs } = await supabase.from(contribuinteTable).select('*').eq('cliente_id', editingClienteId);
    if (contribs) setEntities(contribs.map(c => ({ _id: Date.now() + Math.random(), ...c })));
    
    // 3. Participantes  
    const { data: parts } = await supabase.from(participanteTable).select('*').eq('id_cliente', editingClienteId);
    if (parts) setParticipants(parts.map(p => ({ _id: Date.now() + Math.random(), ...p })));
    
    // 4. Contratos + Servicos
    const { data: contratos } = await supabase.from('contrato').select('*, servico(*)').eq('id_cliente', editingClienteId);
    if (contratos) setContracts(contratos.map(c => ({ _id: Date.now() + Math.random(), ...c, services: c.servico?.map(...) })));
  };
  loadData();
}, [open, editingClienteId]);
```

### Logica de save no modo edicao

```ts
// No handleSave, quando editingClienteId existir:
if (editingClienteId) {
  // 1. Update cliente
  await supabase.from(clienteTable).update({...}).eq('id', editingClienteId);
  
  // 2. Delete + re-insert contribuintes
  await supabase.from(contribuinteTable).delete().eq('cliente_id', editingClienteId);
  if (entities.length > 0) await supabase.from(contribuinteTable).insert([...]);
  
  // 3. Delete + re-insert participantes
  await supabase.from(participanteTable).delete().eq('id_cliente', editingClienteId);
  if (participants.length > 0) await supabase.from(participanteTable).insert([...]);
  
  // 4. Delete servicos dos contratos, delete contratos, re-insert
  // ...similar pattern
}
```

### Integracao no GestaoClientes

```tsx
const [editingClienteId, setEditingClienteId] = useState<string | null>(null);

const handleEditCliente = (e, row) => {
  e.stopPropagation();
  setEditingClienteId(row.id);
  setNovoClienteModalOpen(true);
};

<NewClientModal 
  open={novoClienteModalOpen} 
  onOpenChange={(v) => {
    setNovoClienteModalOpen(v);
    if (!v) setEditingClienteId(null);
  }}
  editingClienteId={editingClienteId}
/>
```

