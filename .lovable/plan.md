
# Corrigir erro de chave duplicada ao criar PER

## Problema

A tabela `per` usa `numero_processo_per` como chave primaria (nao um UUID auto-gerado). Quando o usuario tenta cadastrar um PER com um numero de processo que ja existe no banco, o Postgres retorna o erro `duplicate key value violates unique constraint "per_pkey"`, que e exibido como mensagem generica para o usuario.

## Solucao

Adicionar uma verificacao previa no `createMutation` antes do `insert`: consultar se ja existe um registro com o mesmo `numero_processo_per`. Se existir, lancar um erro amigavel em portugues em vez de deixar o banco rejeitar silenciosamente.

## Alteracao

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

Na funcao `mutationFn` do `createMutation` (linha 225), adicionar antes do insert:

```text
// Verificar se já existe PER com este número
const { data: existing } = await supabase
  .from('per')
  .select('numero_processo_per')
  .eq('numero_processo_per', data.numero_processo_per)
  .maybeSingle();

if (existing) {
  throw new Error('Já existe um PER cadastrado com este número de processo.');
}
```

Isso garante uma mensagem clara e em portugues para o usuario, sem depender da mensagem crua do Postgres.

Adicionalmente, melhorar o `onError` para tratar tambem o caso de a verificacao falhar por race condition (dois usuarios simultaneos), capturando o erro do Postgres e exibindo a mesma mensagem amigavel:

```text
onError: (error: any) => {
  const msg = error.message?.includes('per_pkey') || error.message?.includes('duplicate key')
    ? 'Já existe um PER cadastrado com este número de processo.'
    : error.message;
  toast.error(`Erro ao criar PER: ${msg}`);
}
```
