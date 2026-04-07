

## Botão "Consultar Simples Nacional" — F100 e D100

### Contexto

API dedicada para Simples Nacional (diferente da API principal):
- **Produção:** `https://api-simples-nacional-1010211821554.southamerica-east1.run.app/buscar`
- **Dev:** simular resposta (endpoint não existe em dev)

---

### Arquivos: 4 (1 novo + 3 alterados)

#### 1. Criar hook — `src/hooks/useConsultaSimplesNacional.ts` (~40 linhas)

- Aceita `{ id_contribuinte, registro: 'f100' | 'd100' }`
- Obtém `user.email` via `useAuth`
- Usa `isProductionEnvironment` de `@/config/api`:
  - **Prod:** POST para `https://api-simples-nacional-1010211821554.southamerica-east1.run.app/buscar` com `{ id_contribuinte, registro, email }` e header `Authorization: Bearer token` (via `useApiAuth`)
  - **Dev:** delay 1.5s + mock `{ job_id: 'mock', cnpjs_encontrados: 3, tasks_criadas: 3, execucao_id: 'mock' }`
- Retorna `{ consultar, isLoading }`
- Toast de sucesso/erro

#### 2. `TabF100.tsx` — adicionar prop `contribuinteId`, botão no header do card

#### 3. `TabD100.tsx` — mesma alteração com `registro: 'd100'`

#### 4. `CorrecoesSped.tsx` — passar `contribuinteId` para ambas as abas

