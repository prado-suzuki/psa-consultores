

## Plano: Correções no Controle PERDCOMP

### Diagnóstico atualizado

Após análise do código, o filtro `.eq('ambiente', currentAmbiente)` **já está aplicado** em todos os pontos relevantes:
- `ControlePerdcomp.tsx` linha 109 (clientes) e linha 124 (contribuintes)
- `PerFormModal.tsx` linha 182 (contribuintes no modal)

Portanto, o item 2 (filtro de ambiente) **não requer alteração**.

---

### Alterações necessárias

#### 1. Migração SQL — Recriar view `per_with_contribuinte`

```sql
CREATE OR REPLACE VIEW public.per_with_contribuinte
WITH (security_invoker = on) AS
SELECT
  p.*,
  c.nome_razao_social AS contribuinte_nome
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte;
```

Essa é a causa raiz do problema. A view foi perdida quando `contribuinte_dev` foi removida.

#### 2. `src/pages/equipe/dev/ControlePerdcomp.tsx` — Tratar erro silencioso

Na query de PER (linha 140), o `isError` não é capturado. O componente mostra "Nenhum registro encontrado" quando na verdade a query falhou.

**O que muda:**
- Extrair `isError` e `error` da query `perdcomp-per` (linha 140)
- Adicionar bloco condicional em `renderTable()` (antes do bloco `isLoading`, ~linha 476) que exibe toast de erro ou mensagem visual quando `isError` é `true`
- Mensagem: "Erro ao carregar registros de PER. Tente novamente."

#### 3. RLS — Fora do escopo da migração

Atualização manual das policies de `per`, `per_situacao` e `dcomp` no SQL Editor, conforme solicitado.

---

### Resumo de arquivos

| Arquivo | Alteração |
|---|---|
| Migração SQL (nova) | Recria `per_with_contribuinte` com JOIN em `contribuinte` |
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Adiciona tratamento de `isError` na query de PER com feedback visual |

