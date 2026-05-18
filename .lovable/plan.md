## Diagnóstico: produtos aparecem em branco em /equipe/acessos

### O que já sabemos (não é latência)

Conferi o banco diretamente:

- A tabela `produto_segmento` tem **19 linhas, todas com `codigo`, `nome`, `is_active=true` e `cluster_id` preenchidos** (ADA, ADJ, AF, CC, CHA, CS, CT, DC, DS, DT, LCP, LCT, LT, OTS, PT, PTR, RCP, RCT, RT).
- A tabela tem RLS habilitada com duas policies corretas (`authenticated` lê tudo; `team_member+` faz CRUD).
- **Não há grants de coluna restringindo campos** (`information_schema.column_privileges` vazio).
- A UI já está mostrando **19 linhas** — ou seja, o request **chegou e voltou rápido** (não é latência, não é RLS bloqueando linhas).
- Esses mesmos 19 produtos aparecem **corretamente** na aba "Produto × Serviço", lado esquerdo (ADA — Apoio em defesas administrativas, etc.). Mesma tabela, mesma sessão.

Conclusão: **não é latência nem permissão de banco.** O payload está chegando, mas a aba `Produto/Segmento` está renderizando com `codigo`/`nome`/`is_active` "esvaziados" no cliente.

### Hipóteses prováveis (em ordem)

1. **Resposta crua do PostgREST está vindo sem os campos esperados** por causa do embed `estrutura_clusters(name)` — se a FK entre `produto_segmento.cluster_id` e `estrutura_clusters.id` não estiver declarada no schema cache do PostgREST, ele pode devolver 200 com objetos parciais em vez de erro. Precisamos ver a resposta real no Network.
2. **Cache stale do React Query** preenchido por outro lugar do app com objetos `{ id }` apenas (algum `setQueryData(['produto_segmento'], ...)`). Pouco provável — `rg` só achou o próprio hook usando essa key.
3. **Falha silenciosa do embed** — `estrutura_clusters(name)` pode estar fazendo PostgREST devolver os 19 ids mas null nos demais por race/serialização. Repete em todos os campos = improvável, mas vale conferir.

### Plano de investigação (passos curtos, sem mudar código de produção)

1. **Olhar a resposta real do Network no preview** da rota `/equipe/acessos` → aba Produto/Segmento. Eu uso a ferramenta de network logs para pegar o request `GET .../produto_segmento?select=...` e ver o JSON que volta — isso resolve a dúvida em 1 minuto.
2. Em paralelo, **logar o resultado do hook**: adiciono temporariamente `logger.debug('produto_segmento', { data })` dentro do `queryFn` em `src/hooks/useCategorias.ts` para imprimir no console do preview o array que o React Query está guardando.
3. **Confirmar a FK** `produto_segmento.cluster_id → estrutura_clusters.id` no Postgres (se faltar, o embed degrada). Se faltar, crio migração para adicionar a FK e o problema desaparece.

### Plano de correção (decidido após o passo 1)

- **Se a FK estiver faltando** → criar migração `ALTER TABLE produto_segmento ADD CONSTRAINT ... FOREIGN KEY (cluster_id) REFERENCES estrutura_clusters(id) ON DELETE SET NULL;` e regenerar types.
- **Se for cache do React Query** → identificar quem está fazendo `setQueryData` errado e remover.
- **Se for outra coisa** → ajustar o `select(...)` para não depender do embed (já temos os 19 itens vindo direto da tabela).

### Detalhes técnicos

- Hook: `src/hooks/useCategorias.ts` → `useProdutoSegmentoList`
- Componente: `src/components/equipe/ProdutoSegmentoTab.tsx` (renderiza `item.codigo || '—'` e `item.nome || '(sem nome)'`, daí o fallback visível).
- Query: `from('produto_segmento').select('id, codigo, nome, is_active, cluster_id, estrutura_clusters(name)').order('codigo')`.
- Quero começar pelo passo 1 do plano (Network) — em ~1 minuto eu confirmo a causa e te volto com o fix exato.
