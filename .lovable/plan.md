

## Plano: Integrar Brasil API (CNPJ) e ViaCEP no NewClientModal

### 1. Mapeamento de Campos

**Brasil API (`brasilapi.com.br/api/cnpj/v1/{cnpj}`) → DraftEntity:**

| Campo API             | Campo Formulario        |
|----------------------|------------------------|
| `razao_social`       | `nome_razao_social`    |
| `cnae_fiscal` (codigo) | `cod_cnae`           |
| `descricao_situacao_cadastral` | (informativo, nao mapeado) |
| `logradouro`         | `logradouro`           |
| `bairro`             | `bairro`               |
| `municipio`          | `municipio`            |
| `uf`                 | `uf`                   |
| `cep`                | `cep` (novo campo)     |

**ViaCEP (`viacep.com.br/ws/{cep}/json/`) → DraftEntity:**

| Campo API      | Campo Formulario |
|---------------|-----------------|
| `logradouro`  | `logradouro`    |
| `bairro`      | `bairro`        |
| `localidade`  | `municipio`     |
| `uf`          | `uf`            |

---

### 2. Refatoracao da UI (nova ordem dos campos na aba Contribuintes)

**Ordem atual:**
Tipo + CPF/CNPJ → Razao Social → Inscricao Estadual → CNAE + Simples → Logradouro → Bairro + Municipio + UF

**Nova ordem:**
1. **Tipo** (PJ/PF) + **CPF/CNPJ** (com botao de busca ou busca automatica)
2. **Razao Social** + **Nome Fantasia** (novo campo, preenchido pela API)
3. **Inscricao Estadual** (situacao + numero)
4. **CNAE** + **Simples Nacional**
5. **CEP** (novo campo, com busca automatica via ViaCEP)
6. **Logradouro** + **Numero** (novo campo) + **Complemento** (novo campo)
7. **Bairro** + **Municipio** + **UF**

---

### 3. Plano de Implementacao Logica

#### 3.1. Alteracoes no tipo `DraftEntity`

Adicionar campos:
```ts
cep: string;
nome_fantasia: string;
numero: string;
complemento: string;
```

#### 3.2. Funcao `fetchCNPJ`

- **Trigger:** Quando o campo CPF/CNPJ perde o foco (`onBlur`) e contem exatamente 14 digitos (somente numeros).
- **Nao dispara** se: tem 11 digitos (CPF), menos de 14, ou campo vazio.
- **Estado de loading:** `cnpjLoading: boolean` (novo state). Exibir spinner no campo enquanto busca.
- **Fluxo:**
  1. Limpar caracteres nao numericos
  2. Verificar se `digits.length === 14`
  3. Setar `cnpjLoading = true`
  4. `fetch('https://brasilapi.com.br/api/cnpj/v1/${digits}')`
  5. Em caso de sucesso: preencher `nome_razao_social`, `cod_cnae`, `logradouro`, `bairro`, `municipio`, `uf`, `cep`, `nome_fantasia`
  6. Em caso de erro: exibir `toast.error('CNPJ nao encontrado')`, nao bloquear preenchimento manual
  7. Setar `cnpjLoading = false`
- **Sem debounce** (usa `onBlur`, nao `onChange`), evitando chamadas desnecessarias.

#### 3.3. Funcao `fetchCEP`

- **Trigger:** Quando o campo CEP perde o foco (`onBlur`) e contem exatamente 8 digitos.
- **Estado de loading:** `cepLoading: boolean`. Spinner no campo.
- **Fluxo:**
  1. Limpar caracteres nao numericos
  2. Verificar se `digits.length === 8`
  3. Setar `cepLoading = true`
  4. `fetch('https://viacep.com.br/ws/${digits}/json/')`
  5. Se `response.erro` ou falha HTTP: `toast.error('CEP nao encontrado')`
  6. Sucesso: preencher `logradouro`, `bairro`, `municipio`, `uf`
  7. Setar `cepLoading = false`
- Util quando usuario digita CEP manualmente (sem ter buscado CNPJ, ou para corrigir endereco).

#### 3.4. Fallback e flexibilidade

- Todos os campos preenchidos automaticamente permanecem editaveis.
- Nenhum campo fica `disabled` apos preenchimento automatico.
- Se a API falhar ou retornar erro, o formulario continua funcionando normalmente para preenchimento manual.
- Toast informativo (nao bloqueante) em caso de erro de API.

#### 3.5. Indicadores visuais

- Icone de `Loader2` animado dentro do campo CPF/CNPJ durante busca.
- Icone de `Loader2` animado no campo CEP durante busca.
- Apos preenchimento automatico, exibir um badge sutil "Dados preenchidos via CNPJ" que desaparece em 3 segundos (opcional, via toast de sucesso).

---

### Resumo tecnico

- **Arquivo unico:** `src/components/equipe/dev/NewClientModal.tsx`
- **APIs externas:** Brasil API (publica, sem chave) e ViaCEP (publica, sem chave)
- **Sem alteracao de banco de dados** (campos `cep`, `nome_fantasia`, `numero`, `complemento` sao apenas no formulario; se quiser persistir, sera necessaria migracao, mas nao faz parte deste escopo)
- **Sem dependencias novas** (usa `fetch` nativo)
- **Estrategia de disparo:** `onBlur` (nao necessita debounce)

