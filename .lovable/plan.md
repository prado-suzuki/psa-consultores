
# Plano: Atualização do Dashboard do Cliente

## Visão Geral

Adicionar uma nova seção abaixo dos cards de "Abrir Chamado" e "Meus Chamados" no Dashboard do Cliente (/cliente) com:
1. Uma sub-aba navegável entre "Projetos em Andamento" e "Dashboards/Documentos"
2. Visão de cards para projetos ativos do cliente
3. Tabela para listar dashboards e documentos disponíveis

## Análise Técnica

### Estado Atual
- O `ClienteDashboard.tsx` é simples, com dois cards de ação
- Não existe uma tabela de vinculação entre usuários autenticados e projetos/documentos do cliente
- As tabelas `project_documents` e `projects` existem, mas são voltadas para a equipe interna

### Estrutura de Dados
Para esta funcionalidade, será necessário criar novas tabelas no banco de dados:
- `client_projects` - vincular user_id a projetos do cliente
- `client_documents` - vincular user_id a documentos disponíveis para download

Por enquanto, usaremos dados de exemplo (mock) para demonstrar a interface, permitindo validação visual antes de implementar o backend.

## Mudanças Propostas

### 1. Atualização do ClienteDashboard.tsx

```text
Estrutura final:
┌─────────────────────────────────────────────────────┐
│  Header (existente)                                 │
├─────────────────────────────────────────────────────┤
│  Título de Boas-vindas (existente)                  │
├─────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐             │
│  │  Abrir Chamado │  │ Meus Chamados  │             │
│  └────────────────┘  └────────────────┘             │
├─────────────────────────────────────────────────────┤
│  [Nova Seção]                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ Tabs: [Projetos] [Dashboards e Documentos]      ││
│  ├─────────────────────────────────────────────────┤│
│  │ Conteúdo da Tab Selecionada                     ││
│  │ - Projetos: Cards com status e progresso       ││
│  │ - Documentos: Tabela com tipo, nome, ações     ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### 2. Componentes a Adicionar

**Tab "Projetos em Andamento":**
- Cards estilizados com cores da marca (Teal)
- Informações: nome do projeto, descrição, status, progresso
- Badge de status com cores semânticas

**Tab "Dashboards e Documentos":**
- Tabela responsiva usando componentes Table do projeto
- Colunas: Tipo (ícone), Nome, Descrição, Ação (botão abrir/download)
- Ícones diferenciados para Dashboard vs Documento

### 3. Dados de Exemplo (Mock)

Projetos de exemplo:
- "Diagnóstico Fiscal 2024" - Em andamento (75%)
- "Reestruturação Societária" - Em análise (30%)

Documentos de exemplo:
- Dashboard de Acompanhamento Fiscal (link externo)
- Relatório Trimestral Q4/2024 (PDF)
- Manual de Procedimentos (PDF)

### 4. Alinhamento de Marca

Seguindo o design system existente:
- Background: `bg-[hsl(210_20%_98%)]` (slate-50)
- Cards: `bg-background` com `shadow-sm`
- Cor primária: Teal (#0d9488) para ações e destaques
- Tipografia: Work Sans (configurada globalmente)
- Badges: Cores semânticas para status (verde/amarelo/azul)

## Etapas de Implementação

1. Importar componentes necessários (Tabs, Table, Badge, ícones)
2. Criar interfaces TypeScript para projetos e documentos do cliente
3. Adicionar dados mock para demonstração
4. Implementar seção de Tabs abaixo dos cards existentes
5. Criar visualização de cards para projetos
6. Criar tabela para dashboards/documentos
7. Estilizar conforme padrões da marca

## Considerações Futuras

Após validação da interface:
- Criar tabelas `client_projects` e `client_documents` no banco
- Implementar RLS para que cada cliente veja apenas seus dados
- Conectar a interface com dados reais via Supabase
- Adicionar funcionalidade de upload/download real
