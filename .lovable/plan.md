

## Reformulacao do Modal de Cadastro de Cliente com Abas

### Objetivo
Transformar o modal `NewClientModal.tsx` de um formulario em scroll unico para um formulario com **abas horizontais** (tabs) no topo, com navegacao sequencial via botao "Avancar" e "Salvar" apenas na ultima aba.

### Alteracoes no arquivo `src/components/equipe/dev/NewClientModal.tsx`

**1. Header**
- Trocar o titulo "Cadastro Completo" por **"Cadastrar Cliente"** (manter "Editar Cliente" quando `isEditing`)

**2. Sistema de Abas**
- Adicionar estado `activeTab` (valores: `"cliente"`, `"contribuintes"`, `"participantes"`, `"contratos"`)
- Usar o componente `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` do Radix (ja disponivel em `src/components/ui/tabs.tsx`)
- Abas horizontais logo abaixo do header, dentro do modal

**3. Nomes das Abas**
| Aba | Label |
|-----|-------|
| 1 | Dados do Cliente/Grupo |
| 2 | Contribuintes |
| 3 | Participantes |
| 4 | OS - Ordem de Servico |

**4. Navegacao (Footer)**
- Abas 1, 2 e 3: mostrar botao **"Avancar"** (avanca para a proxima aba) + "Cancelar"
- Aba 4 (ultima): mostrar botao **"Salvar"** (chama `handleSave`) + "Cancelar"
- Opcionalmente, botao "Voltar" nas abas 2, 3 e 4

**5. Conteudo de cada aba**
- Cada `TabsContent` contera exatamente a mesma `<section>` que ja existe hoje, removendo apenas o wrapper de numbered circle (o numero ja fica implicito na aba ativa)
- Nenhuma alteracao nos campos, inputs ou logica de dados

### Detalhes Tecnicos

- Importar `Tabs, TabsList, TabsTrigger, TabsContent` de `@/components/ui/tabs`
- Substituir o `ScrollArea` com as 4 sections por um componente `Tabs` controlado (`value={activeTab}` / `onValueChange={setActiveTab}`)
- O footer tera logica condicional:

```text
if activeTab === "contratos" (ultima aba):
  [Voltar] [Cancelar] [Salvar Cliente]
else:
  [Voltar?] [Cancelar] [Avancar ->]
```

- A funcao "Avancar" simplesmente muda o `activeTab` para o proximo valor na sequencia
- Reset do `activeTab` para `"cliente"` no `resetAndClose`

### Arquivo alterado
- `src/components/equipe/dev/NewClientModal.tsx`

### O que NAO muda
- Nenhuma tabela ou migracao de banco
- Nenhuma logica de save/insert/update
- Nenhum campo de formulario adicionado ou removido
- Apenas layout e navegacao visual

