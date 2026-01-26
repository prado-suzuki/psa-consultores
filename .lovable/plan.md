

# Plano: Adicionar Página EFD Contribuições ao Controle de Acessos

## Objetivo

Inserir o registro da página `/equipe/dev/consulta-efd` na tabela `page_permissions` para que ela apareça no Controle de Acessos.

## Alteração

### Migration SQL

Executar o seguinte comando SQL:

```sql
INSERT INTO public.page_permissions 
  (page_path, page_name, page_description, category, requires_team_member)
VALUES
  ('/equipe/dev/consulta-efd', 'EFD Contribuições', 'Consulta de arquivos EFD Contribuições', 'dev', true);
```

## Detalhes do Registro

| Campo | Valor |
|-------|-------|
| page_path | `/equipe/dev/consulta-efd` |
| page_name | `EFD Contribuições` |
| page_description | `Consulta de arquivos EFD Contribuições` |
| category | `dev` |
| requires_team_member | `true` |
| is_active | `true` (padrão) |
| requires_admin | `false` (padrão) |

## Resultado Esperado

Após a migration, a página "EFD Contribuições" aparecerá na lista do Controle de Acessos na categoria "Digital Dev".

