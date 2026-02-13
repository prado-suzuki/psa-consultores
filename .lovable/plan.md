

## Plano: Associar Usuarios a Areas/Ambientes na Criacao e Edicao

### Problema Atual
O formulario de criacao de usuario permite definir nome, email, senha e papeis (Admin/Membro/Cliente), mas **nao permite associar o usuario a ambientes/areas** (Gerencial, Chamados, Digital, OSG, Tax). Atualmente, o acesso a areas depende de permissoes individuais por pagina (`user_page_access`), que precisam ser configuradas manualmente uma a uma apos a criacao do usuario.

### Solucao
Adicionar um campo de **selecao de areas** (multi-select com checkboxes) nos formularios de criacao e edicao de usuario. Ao selecionar uma area, o sistema automaticamente concedera acesso a **todas as paginas daquela area** na tabela `user_page_access`.

---

### 1. Alterar formulario de criacao de usuario

Apos a secao "Papeis do usuario", adicionar uma nova secao **"Areas de Acesso"** (visivel apenas quando o papel "Membro da Equipe" estiver marcado):

- Checkboxes para cada area:
  - Gerencial (categoria: `board`)
  - Chamados (categoria: `gestao`)
  - Digital (categorias: `rotina`, `dev`)
  - OSG (categoria: `osg`)
  - Tax (categorias: `projetos`, `fiscal`)

Novo campo no estado `newUser`:
```text
areas: string[]  -- ex: ['digital', 'osg', 'tex']
```

### 2. Logica de concessao de acesso por area

Apos criar o usuario com sucesso, para cada area selecionada:
1. Buscar as `page_permissions` cujas categorias correspondem a area
2. Inserir registros em `user_page_access` para cada pagina encontrada

Mapeamento area -> categorias (mesmo ja usado em `EquipeAuth.tsx`):
```text
digital -> ['rotina', 'dev']
tex     -> ['projetos', 'fiscal']
osg     -> ['osg']
board   -> ['board']
controle_site -> ['gestao']
```

### 3. Alterar formulario de edicao de usuario

Adicionar a mesma secao "Areas de Acesso" no dialog de edicao:
- Carregar as areas atuais do usuario (inferidas a partir dos acessos existentes em `user_page_access`)
- Ao salvar, sincronizar: revogar acessos de areas desmarcadas, conceder acessos de areas marcadas

### 4. Alteracoes nos arquivos

| Componente | Alteracao |
|---|---|
| `src/pages/equipe/EquipeControleAcessos.tsx` | Adicionar campo `areas` ao `newUser` e `editUser`; secao de checkboxes de areas nos dialogs de criacao e edicao; logica de concessao/revogacao de acessos por area apos salvar |

Nenhuma alteracao no banco de dados e necessaria -- o sistema ja possui as tabelas `page_permissions` e `user_page_access` que suportam essa funcionalidade. A logica sera implementada inteiramente no frontend.

### Resultado Esperado
- Ao criar um usuario como "Membro da Equipe", o admin pode selecionar quais areas (Digital, Tax, OSG, etc.) o usuario tera acesso
- O sistema automaticamente concede acesso a todas as paginas daquela area
- Ao editar, o admin pode adicionar/remover areas de acesso
- Na tela de login da equipe, o usuario so vera as areas para as quais tem acesso (comportamento ja existente)

