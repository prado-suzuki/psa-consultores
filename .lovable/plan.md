

## Diagnóstico: Erro "Could not find 'empresa_faturamento' column of 'cliente'"

### Causa raiz

A coluna `empresa_faturamento` foi **adicionada** na migração `20260302...` e depois **removida** na migração `20260311...`. O código atual (ambiente de teste) já foi limpo e **não referencia mais essa coluna em lugar nenhum**.

O erro ocorreu no **ambiente publicado (Live)**. Isso significa que a versão publicada do código ainda contém referências à coluna `empresa_faturamento`, mas o schema do banco Live já aplicou a migração que a removeu — ou vice-versa: o schema ainda tem a coluna mas o PostgREST cache está desatualizado.

### O que está acontecendo

O erro `"Could not find the 'empresa_faturamento' column of 'cliente' in the schema cache"` é emitido pelo PostgREST quando o código tenta ler ou gravar uma coluna que não existe no schema atual do banco.

### Solução

**Republicar o projeto.** O código atual no ambiente de teste já está correto (sem referências a `empresa_faturamento`). Ao publicar novamente, o código limpo será deployado no ambiente Live, resolvendo o problema.

Não há alteração de código necessária — o problema é exclusivamente uma defasagem entre o código publicado (antigo) e o schema do banco (atualizado).

