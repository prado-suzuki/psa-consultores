

## Plano: RequiredMark Consistente + Reordenar Endereço

### 3.1 — RequiredMark consistente (ContribuintesTab.tsx e ContratosTab.tsx)

**ContribuintesTab.tsx** — Importar `RequiredMark` e substituir `*` textual pelo componente. Campos obrigatórios (conforme validação):

| Campo | Formulário novo (linha) | Edição inline (linha) | Ação |
|-------|------------------------|----------------------|------|
| CPF/CNPJ | L440 `"CPF/CNPJ *"` | L253 `"CPF/CNPJ"` (falta!) | Ambos → `CPF/CNPJ<RequiredMark />` |
| Razão Social/Nome | L450 `"Razão Social *"` | L263 `"Razão Social *"` | Ambos → usar `<RequiredMark />` |
| CNAE (PJ) | L504 `"CNAE *"` | L341 `"CNAE"` (falta!) | Ambos → `CNAE<RequiredMark />` |
| Simples Nacional (PJ) | L516 `"Simples Nacional *"` | L353 `"Simples Nacional *"` | Ambos → usar `<RequiredMark />` |
| CEP | L527 `"CEP *"` | L364 `"CEP *"` | Ambos → `<RequiredMark />` |
| UF | L536 `"UF *"` | L373 `"UF"` (falta!) | Ambos → `UF<RequiredMark />` |
| Município | L540 `"Município *"` | L377 `"Município"` (falta!) | Ambos → `<RequiredMark />` |
| Bairro | L544 `"Bairro *"` | L381 `"Bairro"` (falta!) | Ambos → `<RequiredMark />` |
| Logradouro | L548 `"Logradouro *"` | L385 `"Logradouro"` (falta!) | Ambos → `<RequiredMark />` |

Campos SEM asterisco (corretos): Tipo, Nome Fantasia, Telefone, Número, Complemento, Contribuinte de Faturamento.

**ContratosTab.tsx** — Importar `RequiredMark`. Único campo obrigatório na validação: `Produtos Contratados` (L171 já tem `"Adicionar Produto *"` textual → substituir por `<RequiredMark />`).

### 3.2 — Reordenar campos de endereço (ContribuintesTab.tsx)

Ordem atual (novo e edição): CEP → UF → Município → Bairro → Logradouro → Número → Complemento

Ordem desejada: **CEP → Logradouro → Número → Complemento → Bairro → Município → UF**

Aplicar em **dois blocos**:
1. **Formulário novo** (L525-557): Reordenar os 7 campos de endereço
2. **Edição inline** (L362-394): Reordenar os 7 campos de endereço

A reordenação é apenas mover blocos de JSX — sem alterar lógica.

### Arquivos modificados

| Arquivo | Alterações |
|---------|-----------|
| `ContribuintesTab.tsx` | Import `RequiredMark`; substituir `*` textual por componente em ~18 labels; adicionar `<RequiredMark />` em 5 labels do inline edit que faltavam; reordenar campos de endereço em 2 blocos |
| `ContratosTab.tsx` | Import `RequiredMark`; substituir `*` textual no label "Adicionar Produto" |

