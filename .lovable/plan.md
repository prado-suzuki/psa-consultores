

## Mover campo Serviço de Tarefas para Projetos

### Contexto
Hoje o campo "Serviço" fica no `TaskModal` (tarefas). A lógica atual: projeto → OS → produto → filtra serviços via `produto_servico`. Você quer mover essa mesma lógica para o formulário de projeto, e remover o campo de tarefas.

### Fluxo proposto
1. Usuário cadastra cliente com OS (já tem produto na OS)
2. No formulário de projeto, seleciona cliente → OS (já existe)
3. **Novo**: Após selecionar a OS, aparece o campo "Serviço" filtrado pelos serviços vinculados ao produto da OS selecionada (via `produto_servico`)
4. O serviço fica persistido no projeto (`tax_projects.servico_id`)
5. Tarefas herdam o serviço do projeto (sem campo próprio)

### Mudanças

**1. Migration — adicionar coluna `servico_id` em `tax_projects`**
```sql
ALTER TABLE public.tax_projects
ADD COLUMN servico_id uuid REFERENCES public.servicos_prestados(id);
```

**2. `FiscalProjetosCadastro.tsx` — formulário de projeto**
- Adicionar `servico_id` ao `emptyForm` e ao `formData`
- Quando `selectedOsId` muda, buscar o `id_produto_segmento` da OS e carregar os serviços vinculados via `produto_servico` (mesma lógica que hoje está no TaskModal)
- Renderizar um `Select` de "Serviço" logo abaixo da seleção de OS, dentro da seção Identificação
- Limpar `servico_id` quando a OS muda
- Persistir `servico_id` no create/update

**3. `useTaxProjects.ts` — hook de projetos**
- Incluir `servico_id` no select, no create e no update
- Adicionar ao tipo `TaxProject` e `CreateTaxProjectInput`
- Incluir na comparação de auditoria do update

**4. `TaskModal.tsx` — remover campo Serviço**
- Remover do schema zod (`servico_id`)
- Remover as queries `project-os-produto` e `fiscal-task-servicos-by-produto`
- Remover o `FormField` de Serviço do JSX
- Remover variáveis derivadas (`servicoFieldDisabled`, `servicoPlaceholder`)
- Remover o `form.setValue('servico_id', undefined)` do effect de troca de projeto

**5. `useFiscalTasks.ts` — limpar referência**
- Remover `servico_id` do tipo `FiscalTask` e `CreateFiscalTaskInput`
- Remover do payload de create/update (a coluna no banco pode ficar por retrocompatibilidade, mas não será mais preenchida por novas tarefas)

**6. Listagem de projetos (tabela)**
- Opcionalmente exibir o nome do serviço na tabela de projetos (já exibe o produto/OS, pode adicionar uma coluna "Serviço" se desejado)

### Arquivos afetados
- `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`
- `src/hooks/useTaxProjects.ts`
- `src/components/equipe/fiscal/tasks/TaskModal.tsx`
- `src/hooks/useFiscalTasks.ts`
- Migration SQL (1 coluna)

### O que NÃO muda
- A tabela `fiscal_tasks` mantém a coluna `servico_id` no banco (retrocompatibilidade com dados existentes)
- A lógica de filtro produto → serviços via `produto_servico` é a mesma, só muda de lugar

