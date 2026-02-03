
# Plano: Adicionar Botões de Criação de Clientes e Contribuintes

## Contexto

A página `/equipe/dev/gestao-clientes` atualmente permite apenas consultar clientes e visualizar seus contribuintes. Precisamos adicionar:

1. Botão para criar novos clientes na página principal
2. Botão para adicionar contribuintes dentro do modal de detalhes do cliente

---

## Estrutura das Tabelas

### Tabela `cliente_dev`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| nome | text | Sim |
| telefone | text | Não |
| setor_cliente | text | Não |
| fixo | text ("Sim"/"Não") | Não |
| ativo | boolean | Não (default: true) |
| municipio | text | Não |
| uf | text | Não |

### Tabela `contribuinte_dev`
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| cliente_id | uuid | Sim |
| nome_razao_social | text | Sim |
| tipo_pessoa | text | Sim |
| cpf_cnpj | text | Não |
| inscricao_estadual | text | Não |
| cod_cnae | text | Não |
| setor | text | Não |
| simples_nacional | boolean | Não (default: false) |

---

## Alterações no Arquivo

**Arquivo:** `src/pages/equipe/dev/GestaoClientes.tsx`

### Alteração 1: Importar componentes adicionais

Adicionar imports para:
- `DialogHeader`, `DialogTitle`, `DialogFooter` do dialog
- `Input` para campos de texto
- `Label` para rotular campos
- `Checkbox` para campos booleanos
- Ícone `Plus` do lucide-react

### Alteração 2: Novos Estados

```typescript
// Estados do modal de criar/editar cliente
const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
const [editingCliente, setEditingCliente] = useState<any>(null);
const [clienteForm, setClienteForm] = useState({
  nome: '',
  telefone: '',
  setor_cliente: '',
  fixo: '',
  ativo: true,
  municipio: '',
  uf: '',
});

// Estados do modal de criar contribuinte
const [contribuinteDialogOpen, setContribuinteDialogOpen] = useState(false);
const [contribuinteForm, setContribuinteForm] = useState({
  nome_razao_social: '',
  tipo_pessoa: '',
  cpf_cnpj: '',
  inscricao_estadual: '',
  cod_cnae: '',
  setor: '',
  simples_nacional: false,
});
```

### Alteração 3: Funções de CRUD

```typescript
// Salvar Cliente
const handleSaveCliente = async () => {
  if (!clienteForm.nome.trim()) {
    toast.error('Nome é obrigatório');
    return;
  }
  
  const payload = {
    nome: clienteForm.nome.trim(),
    telefone: clienteForm.telefone.trim() || null,
    setor_cliente: clienteForm.setor_cliente.trim() || null,
    fixo: clienteForm.fixo || null,
    ativo: clienteForm.ativo,
    municipio: clienteForm.municipio.trim() || null,
    uf: clienteForm.uf.trim() || null,
  };
  
  if (editingCliente) {
    await supabase.from(clienteTable).update(payload).eq('id', editingCliente.id);
    toast.success('Cliente atualizado');
  } else {
    await supabase.from(clienteTable).insert(payload);
    toast.success('Cliente criado');
  }
  
  setClienteDialogOpen(false);
  refetch();
};

// Salvar Contribuinte
const handleSaveContribuinte = async () => {
  if (!contribuinteForm.nome_razao_social.trim() || !contribuinteForm.tipo_pessoa) {
    toast.error('Nome/Razão Social e Tipo Pessoa são obrigatórios');
    return;
  }
  
  await supabase.from(contribuinteTable).insert({
    cliente_id: selectedCliente.id,
    nome_razao_social: contribuinteForm.nome_razao_social.trim(),
    tipo_pessoa: contribuinteForm.tipo_pessoa,
    cpf_cnpj: contribuinteForm.cpf_cnpj.trim() || null,
    inscricao_estadual: contribuinteForm.inscricao_estadual.trim() || null,
    cod_cnae: contribuinteForm.cod_cnae.trim() || null,
    setor: contribuinteForm.setor.trim() || null,
    simples_nacional: contribuinteForm.simples_nacional,
  });
  
  toast.success('Contribuinte adicionado');
  setContribuinteDialogOpen(false);
  // Refetch contribuintes do modal
};
```

### Alteração 4: Botão "Novo Cliente" no Card de Filtros

Adicionar botão ao lado direito do título "Filtros de Busca":

```text
┌─────────────────────────────────────────────────────────────┐
│  🔍 FILTROS DE BUSCA                    [+ Novo Cliente]    │
├─────────────────────────────────────────────────────────────┤
```

### Alteração 5: Botão "Adicionar Contribuinte" no Modal

Adicionar botão no header do modal de contribuintes:

```text
┌─────────────────────────────────────────────────────────────┐
│  🏢 Nome do Cliente               [+ Contribuinte]  [X]     │
│     Contribuintes vinculados                                │
├─────────────────────────────────────────────────────────────┤
```

### Alteração 6: Modal de Criar/Editar Cliente

Campos do formulário:
- Nome (obrigatório)
- Telefone
- Setor
- Tipo (Select: Fixo/Pontual)
- Status (Switch: Ativo/Inativo)
- Município
- UF

### Alteração 7: Modal de Criar Contribuinte

Campos do formulário:
- Nome/Razão Social (obrigatório)
- Tipo Pessoa (Select: PF/PJ - obrigatório)
- CPF/CNPJ
- Inscrição Estadual
- Código CNAE
- Setor
- Simples Nacional (Checkbox)

---

## Fluxo de Uso

```text
Página Gestão de Clientes
         │
         ├──► [+ Novo Cliente] ──► Modal Cliente ──► Salvar ──► Refresh lista
         │
         └──► Clica no nome do cliente
                    │
                    └──► Modal Contribuintes
                              │
                              └──► [+ Contribuinte] ──► Modal Contribuinte 
                                                              │
                                                              └──► Salvar ──► Refresh modal
```

---

## Resumo das Mudanças

| Localização | Mudança |
|-------------|---------|
| Imports | Adicionar DialogHeader, DialogTitle, DialogFooter, Input, Label, Checkbox, Plus |
| Estados (linha ~55) | Adicionar estados para dialogs e forms de cliente/contribuinte |
| Funções (linha ~220) | Adicionar handleSaveCliente e handleSaveContribuinte |
| Card Filtros (linha ~246) | Adicionar botão "Novo Cliente" no header |
| Modal Contribuintes (linha ~432) | Adicionar botão "Adicionar Contribuinte" no header |
| Final do arquivo | Adicionar 2 novos Dialogs para criar cliente e contribuinte |

---

## Impacto

- Funcionalidade adicional sem alterar comportamento existente
- Reutiliza padrões já usados em `EquipeCadastros.tsx`
- Queries existentes serão invalidadas após inserções para atualizar dados
- Nenhuma alteração no banco de dados necessária
