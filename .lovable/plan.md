

# Ajustes no Controle PERDCOMP

## 1. Adicionar label "Editar" no botao de edicao da tabela principal

No arquivo `src/pages/equipe/dev/ControlePerdcomp.tsx`, o botao de edicao (linha 624-633) tem apenas o icone de lapis. Sera adicionado o texto "Editar" ao lado do icone e o botao tera `size="sm"` ao inves de `size="icon"`.

## 2. Corrigir bug de data (timezone UTC)

O problema ocorre em dois pontos:

- **`formatDate`** em `ControlePerdcomp.tsx` (linha 58-65) e `PerDetailModal.tsx` (linha 108-115): `new Date(dateStr)` interpreta datas no formato `YYYY-MM-DD` como UTC, causando deslocamento de 1 dia no fuso horario brasileiro (UTC-3). A correcao usa parse manual: `new Date(year, month-1, day)`.

- **Ressarcimento**: O campo `ressarcimentoData` no `PerDetailModal.tsx` salva a data corretamente como string YYYY-MM-DD, mas a exibicao posterior via `formatDate` usa `new Date()` que causa o shift. A mesma correcao do `formatDate` resolve.

Arquivos afetados:
- `src/pages/equipe/dev/ControlePerdcomp.tsx` - corrigir `formatDate`
- `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` - corrigir `formatDate`

## 3. Mover "Percentual Aplicado" do PER para o Ressarcimento

- **Remover** o campo `porcentagem_psa` do formulario `PerFormModal.tsx` (linhas 709-727) e do schema/defaultValues
- **Adicionar** o campo "Percentual Aplicado" no dialog de Ressarcimento em `PerDetailModal.tsx` (linhas 749-767), com input numerico step 0.01
- A mutation de ressarcimento passara a salvar `porcentagem_psa` junto com `vlr_ressarcido` na tabela `per`

## 4. Adicionar impostos faltantes no DCOMP

No `DcompFormModal.tsx` (linhas ~279-286), a lista de impostos atual e: PIS, COFINS, IPI, IRPJ, CSLL, INSS. Adicionar:
- **IRRF** (entre INSS e IRPJ)
- **CSRF** (apos CSLL)

Lista final: PIS, COFINS, IPI, IRPJ, CSLL, INSS, IRRF, CSRF

## Resumo de arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Corrigir `formatDate` + adicionar label "Editar" |
| `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Corrigir `formatDate` + adicionar campo % no ressarcimento |
| `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Remover campo `porcentagem_psa` |
| `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` | Adicionar IRRF e CSRF nos impostos |

