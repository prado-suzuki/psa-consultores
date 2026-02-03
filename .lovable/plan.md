

# Plano: Sincronização Assíncrona com DW via Edge Function

## Arquitetura

A sincronização será feita de forma **assíncrona** usando o padrão "fire-and-forget" com `EdgeRuntime.waitUntil()`. O usuário não precisa esperar o sync terminar para continuar usando a aplicação.

```text
┌─────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  GestaoClientes │────►│  Edge Function    │────►│  API DW          │
│  (insert/update)│     │  sync-cadastros   │     │  /api/v1/sync    │
└─────────────────┘     └───────────────────┘     └──────────────────┘
        │                        │
        │ Retorno imediato       │ Executa em
        │ para o usuário         │ background
        ▼                        ▼
   "Cliente criado!"        POST assíncrono
```

---

## Componentes

### 1. Nova Edge Function: `sync-cadastros`

**Arquivo:** `supabase/functions/sync-cadastros/index.ts`

Responsabilidades:
- Receber dados de cliente e/ou contribuinte
- Enviar para a API do DW em background
- Usar o token do usuário para autenticação
- Não bloquear a resposta

```typescript
// Estrutura principal
Deno.serve(async (req) => {
  // 1. Validar autenticação
  // 2. Receber dados (clientes e/ou contribuintes)
  // 3. Iniciar sync em background com waitUntil
  // 4. Retornar imediatamente para o frontend
  
  EdgeRuntime.waitUntil(syncWithDW(data, authToken));
  return new Response(JSON.stringify({ status: 'syncing' }));
});
```

### 2. Configuração de Secret

**Secret necessário:** `DW_SYNC_TOKEN`
- Token de serviço para autenticar com a API do DW
- Será usado pela Edge Function para fazer o POST

### 3. Atualização do Frontend

**Arquivo:** `src/pages/equipe/dev/GestaoClientes.tsx`

Modificar as funções `handleSaveCliente` e `handleSaveContribuinte` para:
1. Após salvar no banco, chamar a Edge Function `sync-cadastros`
2. A chamada será "fire-and-forget" (não esperar resposta)

```typescript
// Exemplo de chamada assíncrona
const handleSaveCliente = async () => {
  // ... validações e insert/update no banco ...
  
  toast.success('Cliente salvo');
  setClienteDialogOpen(false);
  refetch();
  
  // Sync assíncrono (não bloqueia)
  supabase.functions.invoke('sync-cadastros', {
    body: { clientes: [clienteData] }
  }).catch(console.error); // Não espera resposta
};
```

---

## URLs por Ambiente

A Edge Function detectará o ambiente e usará a URL correta:

| Ambiente | URL da API DW |
|----------|---------------|
| Development | `https://psa-backend-api-456879351254.southamerica-east1.run.app` |
| Production | `https://psa-backend-api-1010211821554.southamerica-east1.run.app` |

---

## Payload da Sincronização

```json
{
  "clientes": [{
    "id_cliente": "uuid",
    "nome": "string",
    "fixo": "Fixo|Pontual",
    "telefone": "string",
    "setor_cliente": "string",
    "municipio": "string",
    "uf": "string",
    "ativo": true,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }],
  "contribuintes": [{
    "id_contribuinte": "uuid",
    "id_cliente": "uuid",
    "tipo_pessoa": "PF|PJ",
    "cpf_cnpj": "string",
    "nome_razao_social": "string",
    "inscricao_estadual": "string",
    "cod_cnae": "string",
    "setor": "string",
    "simples_nacional": false,
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }]
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/sync-cadastros/index.ts` | Criar | Edge Function para sync assíncrono |
| `supabase/config.toml` | Editar | Adicionar configuração da nova função |
| `src/pages/equipe/dev/GestaoClientes.tsx` | Editar | Chamar Edge Function após salvar |

---

## Detalhes Técnicos

### Edge Function (`sync-cadastros`)

```typescript
// Principais características:
// 1. Autenticação via getClaims()
// 2. Validação de role (team_member ou admin)
// 3. Detecção de ambiente para URL correta
// 4. Execução em background com waitUntil
// 5. Logs para debugging
// 6. Tratamento de erros silencioso (não falha o request principal)
```

### Configuração TOML

```toml
[functions.sync-cadastros]
verify_jwt = false
```

### Fluxo no Frontend

1. Usuário clica em "Salvar"
2. Insert/Update no Supabase (síncrono)
3. Toast de sucesso + fecha modal
4. Chama Edge Function (assíncrono, não espera)
5. Edge Function faz POST para DW em background

---

## Vantagens desta Abordagem

1. **Zero tempo de espera** - O usuário não percebe o sync
2. **Resiliência** - Se o DW estiver offline, o dado já foi salvo no banco principal
3. **Flexibilidade** - Pode sincronizar cliente, contribuinte ou ambos
4. **Logs** - Edge Function tem logs para debugging
5. **Segurança** - Usa autenticação do usuário + validação de role

---

## Próximo Passo Necessário

Antes de implementar, preciso que você forneça o **token de autenticação** que a Edge Function usará para chamar sua API do DW. Este token será armazenado como secret `DW_SYNC_TOKEN`.

