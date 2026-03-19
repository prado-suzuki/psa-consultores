

## Plano: Atualizar AI_CONTEXT.md com mudanças recentes

### Alterações necessárias

**1. Seção 6.2 — Tabelas Dev/Tributário (linha 225-226)**
Remover referências a tabelas `_dev` (`cliente_dev`, `contribuinte_dev`, `contrato_dev`). Atualizar para refletir que `cliente` e `contribuinte` agora possuem coluna `ambiente` (`'prod'` | `'dev'`, default `'prod'`).

De:
```
`cliente` / `cliente_dev`, `contribuinte` / `contribuinte_dev`, `contrato` / `contrato_dev`, ...
```
Para:
```
`cliente` (col `ambiente`), `contribuinte` (col `ambiente`), `contrato`, ...
```

**2. Seção 6.3 — Ambientes dev vs prod (linhas 240-249)**
Remover parágrafo sobre `TABLE_NAMES` e tabelas `_dev`. Adicionar documentação da nova arquitetura:
- Coluna `ambiente` em `cliente` e `contribuinte` com valores `'prod'` | `'dev'` (default `'prod'`)
- `currentAmbiente` em `src/config/api.ts` — seleciona automaticamente com base em `isProductionEnvironment`
- Tipo exportado: `Ambiente = 'prod' | 'dev'`
- Queries filtram via `.eq('ambiente', currentAmbiente)`
- `GerenciarDados.tsx` permite toggle manual entre ambientes

**3. Seção 8.1 — Hook useAuditLog (linhas 284-293)**
Atualizar a interface para refletir os tipos atuais do código:
- `area`: adicionar `'estrutura'`, `'cadastros'`, `'dev'`
- `entity_type`: adicionar `'cluster'`, `'area'`, `'equipe'`, `'membro'`, `'lider'`, `'produto_segmento'`, `'servico'`, `'centro_custo'`, `'empresa'`, `'cliente'`, `'contribuinte'`, `'participante'`, `'ordem_servico'`

**4. `.lovable/plan.md` (linha 9)**
Corrigir referência desatualizada: o default da coluna `ambiente` foi alterado de `'producao'` para `'prod'`. Atualizar o texto do plano concluído para refletir o estado final correto.

### Arquivos modificados

| Arquivo | Alteração |
|---|---|
| `docs/AI_CONTEXT.md` | Seções 6.2, 6.3 e 8.1 atualizadas |
| `.lovable/plan.md` | Corrigir valor default documentado |

