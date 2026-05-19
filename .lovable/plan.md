## Objetivo

Em `/equipe/tax/projetos/clientes`, ao cadastrar/editar um Contribuinte (modal "Cadastro de Cliente" → aba Contribuintes), impedir salvar quando o CPF/CNPJ digitado já existir em outro contribuinte e exibir um aviso visível de "Contribuinte já cadastrado".

## Escopo

- Arquivo principal: `src/components/equipe/client-form/ContribuintesTab.tsx`
- Novo hook: `src/hooks/useContribuinteDuplicateCheck.ts` (consulta no banco)
- Sem migrations, sem mudança de RLS, sem alteração em outros fluxos.

## Regras de duplicidade

Considera duplicado quando os dígitos do CPF/CNPJ (sem máscara) coincidem com:

1. **Outro contribuinte já adicionado no mesmo formulário** (lista local `entities`), ignorando o próprio item em edição (`_id`).
2. **Outro contribuinte persistido em qualquer cliente** na tabela `contribuinte`, com filtros obrigatórios:
   - `.eq('cpf_cnpj', digits)` (comparando dígitos puros — campo é armazenado sem máscara)
   - `.eq('excluido', false)`
   - `.eq('ambiente', currentAmbiente)`
   - Ignorar o registro atual via `.neq('id', editingEntityData._dbId)` quando for edição.

Se houver match, retornar nome do cliente dono (join leve em `cliente(nome)`) para exibir contexto no aviso.

## Mudanças de UI

No campo CPF/CNPJ (tanto no formulário de adição quanto na edição inline):

- **onBlur**: além do `cnpjLookup` existente, dispara checagem de duplicidade.
- Estado novo `duplicateInfo: { found: boolean; clienteName?: string; isLocal?: boolean } | null` por contexto (draft e edição).
- Quando `found=true`: exibir abaixo do input um bloco em `text-destructive` com ícone `AlertTriangle` e o texto:
  - Local: `Contribuinte já cadastrado neste cliente`
  - Global: `Contribuinte já cadastrado no cliente "<nome>"`
- Aplicar `aria-invalid` e classe `border-destructive` no Input.

## Bloqueio do save

- Em `addEntity()` e `saveEditEntity()`:
  - Após validações atuais, normalizar dígitos.
  - Verificar lista local; se duplicado → `toast.error("Contribuinte já cadastrado")` e `return`.
  - Chamar o hook de checagem no banco (await); se duplicado → toast com nome do cliente e `return`.
- Também bloquear o submit final do modal indiretamente: como o save só ocorre via `addEntity`/`saveEditEntity`, basta impedir a inclusão na lista local.

## Detalhes técnicos

```ts
// src/hooks/useContribuinteDuplicateCheck.ts
export function useContribuinteDuplicateCheck() {
  return useCallback(async (digits: string, ignoreDbId?: string) => {
    if (digits.length !== 11 && digits.length !== 14) return null;
    let q = supabase.from('contribuinte')
      .select('id, cliente_id, cliente:cliente_id(nome)')
      .eq('cpf_cnpj', digits)
      .eq('excluido', false)
      .eq('ambiente', currentAmbiente)
      .limit(1);
    if (ignoreDbId) q = q.neq('id', ignoreDbId);
    const { data, error } = await q;
    if (error) throw error;
    return data?.[0] ?? null;
  }, []);
}
```

- Estado `checking` para mostrar `Loader2` ao lado do `cnpjLoading` existente (ambos compartilham o slot).
- A checagem local é síncrona; a do banco é debounced via onBlur (já é o padrão atual).
- No `useEffect` ao trocar `tipo_pessoa` (que limpa `cpf_cnpj`), resetar `duplicateInfo`.

## Casos cobertos

- Adicionar novo contribuinte com CPF/CNPJ já usado em outro cliente → bloqueia.
- Adicionar dois contribuintes iguais no mesmo formulário → bloqueia (validação local).
- Editar um contribuinte existente e trocar para um CPF/CNPJ que pertence a outro registro → bloqueia.
- Editar o próprio contribuinte sem alterar o CPF/CNPJ → permite (ignora via `_dbId`).

## Fora de escopo

- Não cria constraint UNIQUE no banco (evita risco em dados legados).
- Não altera `useSaveClientTransaction.ts` (a checagem já barra antes da persistência).
- Não muda layout do modal nem demais abas.