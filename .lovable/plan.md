

## Plano: Melhorar selecao de Membros do Projeto

### Problema Atual
A secao "Membros do Projeto" no modal de criacao/edicao de projetos Tax exibe os membros como checkboxes em um grid plano de 2 colunas dentro de uma caixa com scroll. Isso dificulta a visualizacao quando ha muitos membros.

### Solucao
Substituir o grid de checkboxes por uma **tabela compacta com checkboxes** dentro de um container com scroll, mostrando nome completo e email de cada membro. Isso torna a selecao mais organizada e profissional.

---

### Alteracao no arquivo

**Arquivo:** `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**O que muda (linhas 690-709):**

Substituir o grid de checkboxes atual por uma tabela com as colunas:
- Checkbox de selecao (com header para selecionar/deselecionar todos)
- Nome completo (first_name + last_name)
- Email

A tabela tera:
- Header fixo com checkbox "selecionar todos"
- Linhas com hover highlight
- Scroll vertical (max-h-48)
- Contador de membros selecionados abaixo da tabela

### Detalhes Tecnicos

A alteracao e pontual e restrita ao JSX de renderizacao da secao "Membros do Projeto" (linhas 690-709). A logica de toggle (`handleMemberToggle`) ja existe e sera reutilizada. Nenhuma alteracao de estado, mutation ou banco de dados e necessaria.

Estrutura da nova UI:
```text
+-----------------------------------------+
| [x] | Nome              | Email         |
+-----------------------------------------+
| [ ] | Alexandre Silva   | alex@...      |
| [x] | Carlos Prado      | carlos@...    |
| [ ] | Gabriel Gama      | gabriel@...   |
+-----------------------------------------+
  3 membros selecionados
```

