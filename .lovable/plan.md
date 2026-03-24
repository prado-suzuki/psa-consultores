

## Plano: Remover campo Contribuinte do formulário de Projeto

O campo "Contribuinte" será removido do modal de criação/edição de projetos. A associação contribuinte ficará apenas no nível de tarefas.

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Remover do formData (linhas 90, 272, 284, 298)**
- Eliminar `contribuinte_id` do estado inicial e dos resets

**2. Remover hook (linhas 156-159)**
- Remover chamada `useContribuintes(...)` e import de `useContribuintes`

**3. Remover do onChange do cliente (linha 544)**
- `onValueChange` do cliente: tirar `, contribuinte_id: ''` do spread

**4. Remover bloco JSX do campo (linhas 558-576)**
- Remover o `<div className="col-span-2">` inteiro com Label "Contribuinte" e Select

**5. Limpar imports (linha 55)**
- Remover `useContribuintes` do import de `useTaxReferenceData`

Zero impacto funcional nos hooks de persistência — `contribuinte_id` continuará existindo na tabela e será populado via tarefas. O campo simplesmente não aparece mais no form de projeto.

