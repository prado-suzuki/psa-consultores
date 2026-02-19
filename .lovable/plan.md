

## Adicionar Data de Inicio e Data de Termino ao cadastro de projetos

Os campos `start_date` e `end_date` ja existem na tabela `tax_projects` no banco de dados. Basta adicionar os campos de data no formulario e incluir na logica de criacao/atualizacao.

---

### O que muda

**Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`**

1. **Estado do formulario (linha ~101):** Adicionar `start_date: ''` e `end_date: ''` ao `formData`

2. **Formulario modal (apos o campo Status, linha ~678):** Adicionar dois campos de input tipo `date` lado a lado:
   - "Data de Inicio" (`start_date`)
   - "Data de Termino" (`end_date`)

3. **Funcao `handleOpenModal` (linha ~443):** Carregar `start_date` e `end_date` do projeto ao editar

4. **Funcao `handleCloseModal` (linha ~469):** Limpar `start_date` e `end_date`

5. **Mutation `createProject` (linha ~293):** Incluir `start_date` e `end_date` no payload de insert

6. **Mutation `updateProject` (linha ~359):** Incluir `start_date` e `end_date` no payload de update + rastrear mudancas no audit log

7. **Tabela de listagem (linha ~557):** Adicionar colunas "Inicio" e "Termino" na tabela de projetos, exibindo as datas formatadas

---

### O que NAO muda

- **Banco de dados:** As colunas `start_date` e `end_date` ja existem na tabela `tax_projects` -- nenhuma migration necessaria
- **RLS policies:** Nenhuma alteracao

