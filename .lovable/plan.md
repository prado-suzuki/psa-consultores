

# Corrigir itens em branco na aba Produto/Segmento

## Diagnóstico

Os dados existem no banco (28 itens com código e nome preenchidos), mas a interface mostra campos em branco. Preciso adicionar logging para identificar se o problema é na resposta da query ou na renderização.

## Plano

### 1. Adicionar debug logging na query (`CadastroCategorias.tsx` - ProdutoSegmentoTab)

Na queryFn de `ProdutoSegmentoTab` (linha ~134), adicionar `console.log('produto_segmento data:', data)` para capturar o que retorna do banco no próximo carregamento.

### 2. Adicionar fallback defensivo na renderização

Nas células que exibem `item.codigo` e `item.nome` (linhas 206-207), adicionar fallback para caso os valores sejam null/undefined:

```tsx
<TableCell><Badge variant="outline" className="font-mono">{item.codigo || '—'}</Badge></TableCell>
<TableCell className="font-medium">{item.nome || '(sem nome)'}</TableCell>
```

### 3. Garantir tipagem segura na resposta

Trocar o cast manual `as ProdutoSegmento[]` por uma validação que garanta que os campos existem, evitando dados fantasma.

Isso vai gerar logs no console que me permitirão identificar a causa exata caso o problema persista.

**Arquivo alterado:** `src/components/equipe/CadastroCategorias.tsx` (ProdutoSegmentoTab, ~5 linhas)

