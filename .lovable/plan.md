

# Plano: Formatacao de campos PERDCOMP

## Alteracoes

### 1. Labels de percentagem com indicador (%)

Adicionar "(%)' aos labels dos campos de percentual em:

- **DcompFormModal.tsx** (linha 403): "Percentual Aplicado" -> "Percentual Aplicado (%)"
- **PerDetailModal.tsx** (linha 773): "Percentual Aplicado" -> "Percentual Aplicado (%)"

### 2. Auto-formatacao de valores em reais (R$)

Aplicar a mesma logica de centavos ja usada no `PerFormModal` (funcoes `formatCurrencyDisplay` e `parseCurrencyToNumber`) nos seguintes campos que ainda usam `type="number"` sem mascara:

**DcompFormModal.tsx - campo `vlr_compensado`** (linhas 384-396):
- Adicionar estado local `currencyDisplay` para o valor formatado
- Trocar o input `type="number"` por input de texto com mascara de centavos
- Inicializar corretamente no `useEffect` ao carregar dados de edicao ou draft

**PerDetailModal.tsx - campo `ressarcimentoValor`** (linhas 754-762):
- Trocar o input `type="number"` por input de texto com mascara de centavos
- Adicionar estado `ressarcimentoDisplay` para exibicao formatada
- Ajustar `handleSaveRessarcimento` para usar o valor numerico ja parseado

### 3. Auto-formatacao do numero do documento DCOMP

O numero do documento DCOMP segue o mesmo padrao de numero de processo da Receita Federal (igual ao PER): `XXXXX.XXXXX/XXXX-XX` com 16 digitos.

**DcompFormModal.tsx** (linhas 257-269):
- Adicionar funcao `formatDcompNumber` que formata os digitos no padrao `XXXXX.XXXXX/XXXX-XX`
- Aplicar a formatacao no `onChange` do campo `nr_documento`, similar ao que ja e feito com `formatProcessNumber` no PER

---

## Arquivos afetados

| Arquivo | Alteracao |
|---|---|
| `DcompFormModal.tsx` | Currency mask em vlr_compensado, (%) no label porcentagem, auto-format nr_documento |
| `PerDetailModal.tsx` | Currency mask em ressarcimentoValor, (%) no label percentual |

## Detalhes tecnicos

- Reutilizar as funcoes `formatCurrencyDisplay` e `parseCurrencyToNumber` ja existentes no `PerFormModal.tsx`, copiando-as para cada arquivo ou extraindo para utilitario
- O formato do DCOMP (XXXXX.XXXXX/XXXX-XX) limita a 16 digitos, inserindo ponto apos o 5o e 10o digito, barra apos o 14o e hifen apos o 16o
- Nenhuma alteracao de banco de dados necessaria -- os valores armazenados continuam numericos puros

