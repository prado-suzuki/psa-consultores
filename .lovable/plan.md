

## Plano: Restaurar pergunta "Possui Inscrição Estadual?" e condicionar botão "Adicionar IE"

### Problema
O campo de pergunta "Possui Inscrição Estadual?" (que usava `situacao_inscricao_estadual`) foi removido da interface. O campo ainda existe no tipo e é salvo no banco, mas não aparece mais no formulário. O botão "Adicionar IE" aparece sempre, quando deveria aparecer somente se a resposta for "sim".

### Alterações em `src/components/equipe/dev/NewClientModal.tsx`

**3 locais a alterar** (modo edição, modo criação/draft, modo leitura):

#### 1. Modo Edição (~linhas 2144-2163)
- Antes da seção "Inscrições Estaduais", adicionar um Select com label "Possui Inscrição Estadual?" com opções: Sim / Não / Isento
- O valor vem de `editingContractData[idx].situacao_inscricao_estadual` (do contribuinte sendo editado)
- Condicionar o botão "Adicionar IE" e a lista de IEs a `situacao_inscricao_estadual === "sim"`
- Quando mudar de "sim" para outro valor, limpar as inscrições do `inscricoesMap` para aquele contribuinte

#### 2. Modo Criação/Draft (~linhas 2564-2631)
- Antes da seção "Inscrições Estaduais", adicionar o mesmo Select usando `draftEntity.situacao_inscricao_estadual`
- Condicionar botão "Adicionar IE" e lista a `draftEntity.situacao_inscricao_estadual === "sim"`
- Quando mudar de "sim" para outro valor, limpar `draftInscricoes`

#### 3. Modo Leitura (~linhas 1996-2010)
- Exibir o valor de `situacao_inscricao_estadual` como campo de leitura antes da lista de IEs

### Layout
```text
┌─────────────────────────────────────────┐
│ Possui Inscrição Estadual?  [Sim ▼]     │
├─────────────────────────────────────────┤
│ Inscrições Estaduais    [+ Adicionar IE]│  ← só aparece se "Sim"
│  AC | Sim | 123456789    [x]            │
│  SP | Sim | 987654321    [x]            │
└─────────────────────────────────────────┘
```

