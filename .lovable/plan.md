

# Corrigir id_contribuinte vazio vindo do draft

## Problema

Quando o formulario abre e encontra um rascunho salvo (draft), ele restaura todos os valores com `form.reset(saved)` (linha 230), incluindo um `id_contribuinte` que pode estar vazio -- especialmente se o draft foi salvo antes do campo de contribuinte ser adicionado ao formulario.

Mesmo que o usuario selecione cliente e contribuinte visualmente, se o draft ja foi restaurado com valor vazio e o usuario nao interagir com o campo Select de contribuinte (por exemplo, se ele ja aparece com o placeholder mas sem valor real), o `id_contribuinte` no estado do formulario permanece como string vazia.

## Solucao

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

### 1. Forcar `id_contribuinte` ao restaurar draft (linha 230)

Alterar de:
```typescript
form.reset(saved);
```
Para:
```typescript
form.reset({ ...saved, id_contribuinte: saved.id_contribuinte || contribuinteId || '' });
```

Isso garante que, se o draft nao tiver um `id_contribuinte` valido, ele usa o contribuinte selecionado no filtro da pagina.

### 2. Adicionar validacao no submit (linha 382)

Antes de chamar a mutation, verificar se `id_contribuinte` esta preenchido:

```typescript
const onSubmit = (data: PerFormData) => {
  if (!data.id_contribuinte) {
    toast.error('Selecione um contribuinte antes de cadastrar o PER.');
    return;
  }
  // ... resto do codigo
};
```

### 3. Melhorar o onError do createMutation

Adicionar deteccao do erro `per_id_contribuinte_fkey` para exibir mensagem amigavel caso a validacao do passo 2 seja contornada por race condition:

```typescript
onError: (error: any) => {
  const msg = error.message?.includes('per_pkey') || error.message?.includes('duplicate key')
    ? 'Ja existe um PER cadastrado com este numero de processo.'
    : error.message?.includes('per_id_contribuinte_fkey')
    ? 'Contribuinte invalido. Selecione um contribuinte valido.'
    : error.message;
  toast.error(`Erro ao criar PER: ${msg}`);
}
```

Essas tres alteracoes cobrem: draft com valor vazio, usuario que esquece de selecionar, e race conditions.

