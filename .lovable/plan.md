

# Plano: Adicionar carga de Participantes no Gerenciar Dados

## Contexto
A tabela `participante` (e `participante_dev`) possui as colunas: `id_participante` (auto), `nome`, `email`, `id_cliente` (FK), `telefone`, `tipo_participante`, `observacoes`, `acesso_chamados`, `excluido`, `updated_at` (auto). O CSV básico contém apenas `nome`, `email` e `cliente` (nome do cliente).

## Mudanças em `src/pages/equipe/dev/GerenciarDados.tsx`

### 1. Atualizar o tipo `TableType`
```typescript
type TableType = 'cliente' | 'contribuinte' | 'participante';
```

### 2. Adicionar interface `ParsedParticipante`
```typescript
interface ParsedParticipante {
  id_participante?: string;
  nome: string;
  email?: string;
  id_cliente: string;
  telefone?: string;
  tipo_participante?: string;
  observacoes?: string;
  acesso_chamados?: boolean;
  excluido?: boolean;
}
```

### 3. Adicionar opção "Participante" no RadioGroup da seleção de tabela (linha ~314)

### 4. Adicionar lógica de importação no `handleFileUpload`
- Buscar clientes existentes (como já faz para contribuintes) para mapear nome do cliente → `id_cliente`
- Mapear colunas do CSV: aceitar tanto colunas completas quanto o formato básico (`nome`, `email`, `cliente`)
- Filtrar registros que tenham pelo menos `nome` e `id_cliente` resolvido
- Inserir na tabela `participante` ou `participante_dev`

### 5. Atualizar `handleClearTable`
- Adicionar suporte para limpar tabela `participante`/`participante_dev`

### 6. Adicionar template CSV para participantes
Exibir template com todas as colunas suportadas + nota sobre formato básico:
```
nome,email,cliente,telefone,tipo_participante,observacoes,acesso_chamados
```

### 7. Atualizar textos
- Subtitle, alert de formato CSV, e mensagens de erro/sucesso para incluir "participante"

