## OSG-EXPR-01 — Tabela `exploracao_rural` + geração da Relação no FiscalReport

### Pré-voo (confirmado)
- `public.exploracao_rural` **não existe**; enum `osg_tipo_exploracao` **não existe**. OK criar.
- Helpers `cliente_visivel_para`, `has_role_or_higher`, `checklist_touch_updated_at` e enum `app_role` existem.
- **Ajuste necessário:** `pessoa.nome_completo` **não existe** — a coluna correta é `pessoa.denominacao` (mesma convenção de `bem.denominacao`). O plano do usuário assumia `nome_completo`; corrigimos o embed/mapeamento para `denominacao`. Sem esse ajuste, o hook quebra.

### Parte 1 — Migração (banco)
Aplicar exatamente o SQL proposto (enum + tabela + índices + trigger `updated_at` + RLS com 4 policies + 3 CHECKs). Acrescentar apenas as GRANTs obrigatórias antes do `ENABLE ROW LEVEL SECURITY`:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exploracao_rural TO authenticated;
GRANT ALL ON public.exploracao_rural TO service_role;
```

Sem `anon` (todas as policies dependem de `auth.uid()` via `cliente_visivel_para` / `has_role_or_higher`).

### Parte 2 — Frontend (leitura + geração da Relação)

**Novo hook** `src/hooks/useExploracaoRural.ts`:
- Usa `supabase as any` (padrão do `useOsgChecklist.ts`, sem regenerar `types.ts`).
- Query: `.from('exploracao_rural').select('*, explorador:pessoa!explorador_pessoa_id(denominacao), outorgante:pessoa!outorgante_pessoa_id(denominacao), bem:bem!bem_id(denominacao)').eq('cliente_id', clienteId).order('created_at')`.
- Retorna tipo local `ExploracaoRuralRow` (sem depender de `Database`).

**`src/components/equipe/osg/relatorios/FiscalReport.tsx`** — só a seção "Imóveis e áreas exploradas":
- Consumir `useExploracaoRural(clienteId)`.
- Se `data.length > 0`: montar `rows` a partir dos registros com o mapa de 13 colunas abaixo; `meta` = `${n} registros · ${somaAreaExplorada} ha`.
- Se `data.length === 0`: manter integralmente o fallback atual (linhas de `matriculas`), inclusive `meta` atual.
- Estado de loading: enquanto `useExploracaoRural` estiver `isLoading`, seguir com o fallback (evita flicker).
- Nenhuma outra seção do relatório é tocada.

**Mapa de colunas** (por registro de `exploracao_rural`):

| Coluna         | Origem                                                                        |
|----------------|-------------------------------------------------------------------------------|
| Tipo           | label do enum: Arrendamento / Parceria / Composse / Comodato / Condomínio / Própria |
| Explorador     | `explorador_nome ?? explorador.denominacao ?? '—'`                            |
| Outorgante     | `outorgante_nome ?? outorgante.denominacao ?? '—'`                            |
| Imóvel         | `bem.denominacao ?? imovel_descricao ?? '—'`                                  |
| Matrícula      | `matricula_texto ?? '—'`                                                      |
| Município/UF   | `[municipio, uf].filter(Boolean).join('/') ?? '—'`                            |
| Área total     | `area_total` + unidade (`ha`/`m²`) via helper `fmtArea` já existente          |
| Área explorada | `area_explorada` + unidade                                                    |
| Decl. IRPF     | `declarado_irpf ? 'Sim' : 'Não'`                                              |
| Assinatura     | `data_assinatura` (formatado pt-BR)                                           |
| Encerramento   | `data_encerramento` (formatado pt-BR)                                         |
| Vigência       | `vigencia`                                                                    |
| Sacas/ha       | `sacas_por_hectare` (tabular-nums)                                            |

### Fora de escopo (não mexer)
- Nenhuma UI de CRUD para `exploracao_rural`.
- `matricula`, checklist, `documento_arquivo`, enum `osg_checklist_status`, demais seções do FiscalReport.
- Não remover o fallback de matrículas.
- Não regenerar `types.ts`.

### GATE de validação
1. **Estrutural (SQL read-only):** tabela + colunas/tipos, enum com os 6 valores, 4 policies (SELECT/INSERT/UPDATE/DELETE), 3 CHECKs (`chk_expr_imovel`, `chk_expr_explorador`, `chk_expr_outorgante`), índices `idx_expr_cliente` e `idx_expr_bem`, trigger `trg_expr_updated_at`.
2. **RLS/CHECK:** inserir 1 registro de teste (via `supabase--insert` como admin) em cliente visível → aparece; tentar INSERT sem `bem_id` e sem `imovel_descricao` → `chk_expr_imovel` barra.
3. **Front:** cliente **sem** registros → tabela cai no fallback de matrículas (comportamento atual, sem quebra). Cliente **com** registros → Relação exibe explorador/outorgante/terceiros/vigência/sacas reais.

### Notas técnicas
- `pessoa.denominacao` é o campo-nome real (não existe `nome_completo`); embed e mapeamento seguem essa coluna.
- `supabase as any` isola a tabela nova do `Database` type, evitando regenerar tipos.
- GRANTs incluídos por exigência do PostgREST — sem eles a RLS retorna permission error.
