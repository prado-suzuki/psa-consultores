

## Plano: Trocar campo "Serviço Contratado" para "Produto/Serviço Contratado" (produto_segmento)

### Arquivo: `src/components/equipe/fiscal/NewClientModal.tsx`

#### 1. Atualizar query de dados (linha 594-601)

A query `produtoSegmentoFullOptions` já existe mas não inclui `cluster_id` nem join com `estrutura_clusters`. Alterar o select para:
```
"id, codigo, nome, is_active, cluster_id, estrutura_clusters(name)"
```

#### 2. Atualizar filtros de cluster (linhas 667-675)

Os `filteredCatalogServices` e `filteredEditCatalogServices` filtram `catalogServices`. Trocar para filtrar `produtoSegmentoFullOptions`:
- `filteredCatalogServices` → `filteredCatalogProducts` — filtra `produtoSegmentoFullOptions` por `osClusterFilter`
- `filteredEditCatalogServices` → `filteredEditCatalogProducts` — filtra `produtoSegmentoFullOptions` por `osEditClusterFilter`

#### 3. Validação `addContract` (linha 1111)

Trocar `if (!draftContract.id_servico)` → `if (!draftContract.id_produto_segmento)` com mensagem "Selecione um Produto/Serviço Contratado".

#### 4. Verificação de rascunho `hasDraftContractData` (linha 442)

Trocar `draftContract.id_servico?.trim()` → `draftContract.id_produto_segmento?.trim()`.

#### 5. Payload `buildOsFields` (linhas 1518-1519)

Remover `id_servico: c.id_servico || null`. Manter `id_produto_segmento: c.id_produto_segmento || null`.

#### 6. Card read-only da OS salva (linhas 3467-3489)

Trocar os dois blocos `cont.id_servico` para usar `cont.id_produto_segmento`:
- **Empresa**: resolver cluster via `produtoSegmentoFullOptions.find(p => p.id === cont.id_produto_segmento)?.estrutura_clusters?.name`
- **Label**: "Produto/Serviço Contratado" em vez de "Serviço Contratado"
- **Badge**: exibir `{p.codigo} — {p.nome}`

#### 7. Dropdown de criação (linhas 4030-4078)

- Label: "Produto/Serviço Contratado *"
- `value`: `draftContract.id_produto_segmento`
- `onValueChange`: atualiza `id_produto_segmento`
- Source: `filteredCatalogProducts` em vez de `filteredCatalogServices`
- Opções: `{p.codigo} — {p.nome}`

#### 8. Dropdown de edição (linhas 3663-3713)

Mesma troca: label, value (`ec.id_produto_segmento`), onValueChange, source (`filteredEditCatalogProducts`), opções com `{p.codigo} — {p.nome}`.

#### 9. Reset states (linhas 497, 684, 1131, 1667)

Nos resets de `draftContract`, garantir que `id_produto_segmento: ""` está presente (já está) e `id_servico` pode manter `""` por compatibilidade.

### Fora de escopo
- Coluna `id_servico` permanece no banco
- Query `catalogServices` pode permanecer (usada em outros contextos)
- Sem alteração de schema

