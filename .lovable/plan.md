

# Corrigir categoria da pagina de Auditoria Tax

## Problema

A pagina `/equipe/tex/auditoria` esta cadastrada no banco de dados com `category = 'projetos'`, quando deveria ser `category = 'tax'`. Por isso, na tela de Controle de Acessos, ela aparece agrupada sob "Projetos" em vez de "Tax".

O arquivo de configuracao (`protectedPages.ts`) ja esta correto com `category: 'tax'`, mas o registro no banco foi criado antes dessa correcao e nunca foi atualizado.

## Solucao

Uma unica migracao SQL para atualizar a categoria do registro existente:

```text
UPDATE page_permissions
SET category = 'tax'
WHERE page_path = '/equipe/tex/auditoria';
```

Nenhuma alteracao de codigo frontend e necessaria.

