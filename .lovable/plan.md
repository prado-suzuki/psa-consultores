## Diagnóstico

O chamado "Créditos de IBS e CBS" (criado por Aline Deon em 05/05) ficou **sem `cliente_id`** mesmo com a representante corretamente vinculada ao cliente "Paiol Comercial Agricola".

### Causa raiz
O fluxo `useCreateTicketCliente` (`src/hooks/useCreateTicket.ts`) faz **duas consultas** para resolver o cliente:

1. `representante` filtrando por `user_id` → retorna `id_cliente` (✅ funciona, RLS permite `auth.uid() = user_id`).
2. `cliente` filtrando por esse `id` para "validar" → ❌ **falha silenciosamente**.

O RLS atual de `public.cliente` tem **apenas uma política de SELECT**:
```
team_select_cliente: has_role_or_higher(auth.uid(), 'team_member')
```

Ou seja, **usuários com role `client`** (como Aline) **não têm permissão de ler `cliente`**. A query retorna `null`, o código entra no `else` (loga warning no console) e o ticket é inserido sem `cliente_id`.

### Por que tickets antigos da Aline têm `cliente_id`?
Provavelmente foram criados antes do RLS atual ser aplicado, ou via um caminho de gestão (que usa role com permissão).

### Observação extra
Há **registros duplicados** de Aline em `representante` (dois `id_representante` apontando para o mesmo `id_cliente`, ambos com `excluido=false`). Não é a causa do bug, mas vale limpar.

---

## Plano de correção

Duas opções (escolher uma — recomendo a **A**, que é mais segura):

### Opção A — Eliminar a validação redundante (frontend)
A consulta no `cliente` é apenas defensiva; a tabela `representante` já é a fonte de verdade do vínculo. Remover essa segunda consulta resolve o problema sem mexer em RLS.

**Arquivo:** `src/hooks/useCreateTicket.ts` (linhas ~181–201)

```ts
if (candidateIds.length > 0) {
  clienteId = candidateIds[0]; // confia no vínculo de representante
}
```

Mantém o warning para o caso de candidateIds vazio.

### Opção B — Adicionar policy de SELECT no cliente para o próprio cliente
Permitir que `role=client` leia apenas os registros de `cliente` que ele tenha vínculo via `representante.user_id`. Mais correto conceitualmente, mas exige migration e amplia a superfície de exposição da tabela `cliente`.

```sql
CREATE POLICY "client_read_own_cliente" ON public.cliente
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.representante r
    WHERE r.id_cliente = cliente.id
      AND r.user_id = auth.uid()
      AND r.excluido = false
  )
);
```

### Correção do ticket atual
Após o fix, atualizar o ticket órfão para o cliente correto:

```sql
UPDATE tickets
SET cliente_id = '18cbce75-df5a-486b-8e25-d4939995b955'
WHERE id = '3938bcc9-aed2-4caa-a42a-08a4328c66dd';
```

(E rodar o auto-resolve de cluster/área se aplicável.)

### Limpeza opcional
Remover o registro duplicado de Aline em `representante` (manter apenas o e-mail correto `aline.deon@paiolmt.com.br`).

---

**Recomendo Opção A + correção do ticket atual.** Confirma?