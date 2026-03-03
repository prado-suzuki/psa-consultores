

# Renomear sub-aba "Cadastros" → "Cadastros Estrutura"

Agora entendi — existem duas abas de cadastros: **"Cadastros"** (value=`cadastros`) e **"Cadastros Clientes"** (value=`cadastros_clientes`). A que precisa ser renomeada é a **"Cadastros"**.

## Alteração em `src/pages/equipe/EquipeControleAcessos.tsx`

- **Linha 833**: Trocar o texto `Cadastros` para `Cadastros Estrutura` no TabsTrigger com value `cadastros`

Apenas uma alteração de label. Nenhum value interno ou outro arquivo precisa ser modificado.

