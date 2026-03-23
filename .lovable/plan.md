

## Plano: Expandir ApuracaoPisCofins para 5 abas completas

### Escopo

A ferramenta atual tem 3 abas (Apuração, Dados, Rateio). O conteúdo da aba "Dados" precisa ser redistribuido em 3 abas separadas, e as abas Apuração e Rateio precisam ser expandidas com tabelas detalhadas conforme o arquivo `page.tsx` de referencia.

### Mapeamento: 5 abas alvo

| Aba | Conteudo (do page.tsx) | Fonte atual |
|---|---|---|
| **RESUMO** (label dinamica: `{nomeCliente} - Resumo`) | Tabela pivotada com CST, Conta, Descricao, Bloco | Hoje dentro de "Dados" como `tables.resumoData` |
| **DEBITOS** | 4 secoes: Debitos + Isencoes e Exclusoes + Outras Saidas + Base de Calculo Apos Isencoes (1 linha de `resultados`) | Hoje dentro de "Dados" |
| **CREDITOS** | 4 secoes: Creditos + Isencoes e Exclusoes do Credito + Base de Calculo do Credito (1 linha) + Credito do Mes (2 linhas: PIS/COFINS) | Hoje dentro de "Dados" |
| **APURACAO** | 3 secoes: Resumo (PIS Due, COFINS Due, Total Devido) + Apuracao Debito COFINS (5 linhas detalhadas) + Apuracao Debito PIS (5 linhas) + Isencoes e Exclusoes (combinada) | Hoje so tem o resumo de 3 linhas |
| **RATEIO** (apenas EFD) | Receitas apuradas + Percentuais de rateio + PIS 101/201/301 + COFINS 101/201/301 | Hoje simplificado |

### Alteracoes

**Arquivo unico: `src/pages/equipe/dev/ApuracaoPisCofins.tsx`**

1. **Trocar `activeTab` type**: de `'apuracao' | 'dados' | 'rateio'` para `'resumo' | 'debitos' | 'creditos' | 'apuracao' | 'rateio'`

2. **Atualizar TabsList**: 5 triggers. Label do Resumo dinamica usando nome do contribuinte selecionado (`contribuintes?.find(c => c.id === selectedContribuinte)?.nome_razao_social` ou fallback "Resumo"). Rateio condicional (apenas EFD).

3. **Adicionar helper `getRateioColValue`**: extrai valores de `rateio` dos resultados (para PIS/COFINS 101/201/301).

4. **Aba Resumo** (~20 linhas): Reutiliza `ApuracaoDataTable` com `tables.resumoData`, `showCst`, `showBloco`. Titulo "Resumo Geral".

5. **Aba Debitos** (~80 linhas): 4 secoes:
   - Debitos via `ApuracaoDataTable` com `tables.debitosData`
   - Isencoes e Exclusoes via `ApuracaoDataTable` com `tables.isencoesData`
   - Outras Saidas via `ApuracaoDataTable` com `tables.outrasSaidasData`
   - "Base de Calculo Apos Isencoes/Exclusoes" — tabela manual DynamicTableHeader com 1 linha ("Base Normal") usando `getResultadoColValue(r => r.baseDebito.baseNormal)`, total = `totais.receitaBruta`

6. **Aba Creditos** (~100 linhas): 4 secoes:
   - Creditos via `ApuracaoDataTable` com `tables.creditosData`
   - Isencoes e Exclusoes do Credito via `ApuracaoDataTable` com `tables.isencoesCreditoData`
   - "Base de Calculo do Credito" — 1 linha ("Base Normal") com `getResultadoColValue(r => r.baseCredito.baseNormal)`, total = `totais.baseCredito`
   - "Credito do Mes" — 2 linhas (PIS em verde com `r.resultado.pisCreditoMes`, COFINS em verde com `r.resultado.cofinsCreditoMes`)

7. **Aba Apuracao** (expandir ~120 linhas): Manter as 3 linhas resumo atuais + adicionar:
   - "Apuracao do Debito de COFINS" — 5 linhas: Contribuicao Bruta (destructive), Credito do Mes (green), Credito Anterior/Carryforward (green), Valor Devido (bold bg-muted), Saldo Acumulado (muted)
   - "Apuracao do Debito de PIS" — mesma estrutura
   - "Isencoes e Exclusoes" — tabela combinada `[...isencoesData, ...isencoesCreditoData]` com Conta/Descricao

8. **Aba Rateio** (expandir ~100 linhas): Substituir versao simplificada por:
   - Receitas apuradas (4 linhas: Total, Tributadas, Nao Tributadas, Nao Tributadas Exp)
   - Separador "Percentual de rateio" (row header com bg-primary)
   - 3 linhas de percentuais (Tributado, Nao Tributado, Exportacao) + Total % Apurado
   - Bloco PIS: 3 linhas (PIS 101/201/301) usando `getRateioColValue`
   - Bloco COFINS: 3 linhas (COFINS 101/201/301)

### Sem alteracao

- `usePisCofinsCalculator.ts` — todos os dados necessarios ja estao disponiveis (resultados, totais, tables)
- `ApuracaoDataTable.tsx` — reutilizado sem modificacao
- `DynamicTableHeader.tsx` — reutilizado sem modificacao
- `apuracaoPisCofins.ts` — zero alteracao em logica de negocio
- Filtros — permanecem intactos

### Resumo

| Arquivo | Acao |
|---|---|
| `src/pages/equipe/dev/ApuracaoPisCofins.tsx` | Reescrever secao de abas e conteudo (~250 linhas adicionais) |

