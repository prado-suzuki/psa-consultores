
# Plano: Alteracoes no NewClientModal

## 1. Aba "Dados do Cliente" -- Nomenclatura e Ordem

**Titulo da aba**: Alterar o texto do `TabsTrigger` de "Dados do Cliente" para "Dados do Cliente/Grupo" (linha 1426).

**Reordenacao dos campos** (linhas ~1461-1697): A ordem atual e:
1. Nome do Cliente/Grupo
2. Categoria
3. Status
4. Tipo de Relacionamento
5. Area do negocio
6. Tipo de produto/segmento (+ campo Outro)
7. Regiao
8. Empresa / Faturamento

Nova ordem solicitada (mantendo Nome, Categoria, Status e Tipo de Relacionamento no inicio):
1. Nome do Cliente/Grupo
2. Categoria
3. Status
4. Tipo de Relacionamento
5. **Area do negocio** (ja campo 5, mantem)
6. **Regiao** (sobe de 7 para 6)
7. **Tipo de produto/segmento** + condicional Outro (desce de 6 para 7)
8. **Empresa / Faturamento** (mantem)

Alteracao: mover o bloco de "Regiao" (linhas ~1613-1643) para antes do bloco "Tipo de produto/segmento" (linhas ~1567-1611).

---

## 2. Aba Contribuintes -- BrasilAPI e Dropdown

### 2a. Campo "Atividade principal" (CNAE descricao)

- Adicionar campo `atividade_principal` ao `DraftEntity` (tipo string, default "").
- Nos handlers `handleCnpjBlur` e `handleInlineCnpjBlur`, capturar `data.cnae_fiscal_descricao` e salvar em `atividade_principal`.
- Adicionar campo read-only "Atividade principal" logo abaixo do CNAE em 3 locais:
  - Formulario de criacao de contribuinte (~linha 2385)
  - Inline edit (~linha 2016)
  - Read-only view (FieldPair, ~linha 1824)
- Esse campo e apenas exibicao (vem da BrasilAPI), nao precisa ser persistido no banco.

### 2b. Ordem do select de Inscricao Estadual

Atualmente em todos os locais a ordem e: Sim, Isento, Nao.
Alterar para: **Sim, Nao, Isento**.

Locais afetados:
- Formulario de criacao (~linhas 2343-2347)
- Inline edit (~linhas 1974-1978)

---

## 3. Aba OS -- Bugfix de Moeda e Servicos Contratados

### 3a. Bug da mascara de moeda (R$ 1.000,00+)

O problema esta no `CurrencyField`. Quando o usuario digita, `handleCurrencyChange` formata o valor (ex: "1.000,00"), e entao `parseBRLInput` tenta converter. A funcao `parseBRLInput` remove pontos e troca virgula por ponto -- isso funciona corretamente.

O verdadeiro problema: quando o usuario digita e o campo ja tem ponto de milhar, ao adicionar mais digitos, `handleCurrencyChange` remove tudo exceto digitos e virgula (`replace(/[^\d,]/g, "")`), o que remove o ponto de milhar. Porem, ao re-digitar, o cursor behavior e o fato de que o valor formatado muda a cada keystroke pode causar problemas.

**Correcao**: Trocar a abordagem do `CurrencyField` para trabalhar com centavos (inteiro). Ao digitar, acumular apenas digitos, dividir por 100 para obter o valor real, e formatar para exibicao. Isso elimina qualquer problema com ponto/virgula durante a digitacao.

### 3b. Servicos Contratados -- trocar fonte de dados

Substituir a query `catalog_clients_services` (que busca de `catalog_clients`) por uma query em `tax_categorias` (tabela `tax_categorias`, campos `id` e `nome`), que e a mesma fonte usada na area TAX para cadastrar tarefas.

Atualizar tambem o display onde o nome do servico e exibido (usando `nome` em vez de `name`).

---

## Resumo tecnico

| Alteracao | Linhas aproximadas |
|---|---|
| TabsTrigger "Dados do Cliente/Grupo" | 1426 |
| Reordenar campos (Regiao antes de Segmento) | 1567-1643 |
| DraftEntity + atividade_principal | 120-140, 492-500, 730-750, 840-850, 953-970 |
| Campo read-only "Atividade principal" | 1824, 2016, 2385 |
| IE select: Sim, Nao, Isento | 1974-1978, 2343-2347 |
| CurrencyField bugfix (centavos) | 203-230, 349-380 |
| Servicos: tax_categorias em vez de catalog_clients | 456-461, 3065-3067, 3265-3267, 3623-3627 |
