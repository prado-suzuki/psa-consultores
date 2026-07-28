# Quadro societário derivado para empresas PR — `gerar-apresentacao`

Escopo cirúrgico em `supabase/functions/gerar-apresentacao/data.ts`. Sem alterar render, contrato do deck, auth, patrimonial ou templates. Algoritmo do prompt é adotado como especificação (espelha `calcularParticipacoesPR` do front); só sinalizo se o código real divergir do prescrito.

## 1. Diagnóstico confirmado
- `carregarQuadro` hoje lê apenas `quadro_societario` → funciona para holdings CN (manual), falha para PR (derivado dos bens integralizados). MMS AGRO (PR) sai vazio.
- `carregarOrganograma` extrai "Sócios" da mesma tabela → mesmo gap na faixa Sócios.
- Front usa `calcularParticipacoesPR(matriculas)` (`src/lib/templates/mapeadores.ts`) alimentado por `QuadroEmpresaProprietaria`. Vamos replicar essa lógica no Deno.

## 2. Mudanças em `carregarQuadro(admin, clienteId)`
1. **Enumerar empresas do cliente** com `pessoa?cliente_id=eq.<id>&tipo_pessoa=eq.PJ&select=id,denominacao,tipo_empresa`.
2. Para cada empresa:
   - `tipo_empresa = 'CN'` → **fluxo MANUAL atual** (`quadro_societario` por `empresa_pessoa_id`, mesmo shape/ordenação/rateio percentual).
   - `tipo_empresa = 'PR'` → **fluxo DERIVADO** (§3). Linhas manuais de `quadro_societario` para PR são ignoradas (tratadas como legado, igual ao front).
   - `tipo_empresa = 'SC'` ou nulo → ignorada como empresa (SC aparece só como sócio).
3. Só entra no resultado empresa com ≥1 sócio. Ordenação final por `empresa` (mantém padrão atual).
4. Shape preservado: `QuadroEmpresa[] { empresa, linhas[{socio,quotas,valor,pct}], totalQuotas, totalValor }`.

## 3. Derivação PR (espelho de `calcularParticipacoesPR`)
Query por empresa PR:
```
bem?empresa_destino_pessoa_id=eq.<empresaId>
   &status_integralizacao=eq.Aprovado
   &select=vlr_contabil,
     matricula(vlr_contabil,
       titularidade(integralizador,fracao,
         titular:titular_pessoa_id(id,denominacao,tipo_pessoa)),
       impedimento(id,cancelado))
```
Passos por matrícula retornada:
1. **Impedimento ativo** = algum `impedimento` com `cancelado != true` → descartar matrícula.
2. `valor = matricula.vlr_contabil ?? bem.vlr_contabil`; se `null/NaN` → pular.
3. **Dedup titulares** por pessoa (`id` quando existir, senão `nome:` + denominacao). `integralizador` por OR; `fracao` = primeira não-nula.
4. **Rateio em centavos** (`totalCent = round(valor*100)`):
   - Titulares com `fracao`: `round(totalCent * fracao/100)`. Se matrícula é "fechada" (ninguém sem fração **e** Σfrações ≈ 100 — tolerância pequena, ex.: 0,01), o último com fração absorve o resíduo `totalCent - Σ`.
   - Titulares sem `fracao`: dividem igualmente `totalCent - alocado`; último absorve resíduo.
5. **Acumular centavos por sócio** (chave dedup acima) através de todas as matrículas.
6. **Fechamento da empresa**:
   - `capitalCent = Σ cent`. Se `0` → empresa não entra.
   - Para cada sócio: `valor = cent/100`, `quotas = round(cent/100)`, `pct = cent/capitalCent*100`.
   - Ordenar por `cent desc`; `totalQuotas = round(capitalCent/100)`; último sócio absorve `totalQuotas - Σquotas` (ajuste de 1 quota).
   - `totalValor = capitalCent/100`.

Assumido: nome do sócio = `titular.denominacao ?? '—'` (mesmo fallback do MANUAL). Assumido: quando falta `id` de pessoa mas o mesmo nome se repete, agrupa pelo nome (chave `"nome:"+denominacao`).

## 4. Helper compartilhado e `carregarOrganograma`
- Extrair um helper interno `sociosDaEmpresa(admin, empresa)` que devolve `{ pessoaId?, denominacao, tipo_pessoa? }[]` aplicando CN→manual, PR→derivado. Usado por:
  - `carregarQuadro` (para montar `linhas`).
  - `carregarOrganograma` (faixa **Sócios**) — hoje só olha `quadro_societario`; passará a unir sócios manuais (CN) + derivados (PR), mantendo o filtro atual (`PF` ou `SC`), a deduplicação por id/nome e a ordenação alfabética. Nada muda em Controladoras/Controladas/Rural.

## 5. Riscos e bordas
- **Impedimento ativo**: matrícula sai do rateio (pode zerar empresa → não incluída).
- **Matrícula sem valor**: pulada; se todas caírem, empresa não entra.
- **Arredondamento**: garantido pelo "último absorve resíduo" em centavos e em quotas (idem front).
- **PR sem `Aprovado`**: nenhuma linha → empresa não entra (é o caso atual do MMS AGRO até o responsável aprovar bens).
- **Linhas manuais legadas em `quadro_societario` para PR**: ignoradas de propósito (fonte de verdade é a integralização aprovada).
- **`tipo_empresa` nulo em PJ**: ignorada (assumido: sem tipo, sem regra clara — não fabricar quadro).

## 6. Fora de escopo
Patrimonial, organograma (bandas Controladoras/Controladas/Rural), render OOXML, contrato da edge, auth/cluster, templates.

## 7. Aviso operacional (não é código)
Mesmo após o fix, o deck do MMS só exibe o quadro de **MMS AGRO** quando bens forem aprovados com `empresa_destino = MMS AGRO` (`status_integralizacao='Aprovado'`) no Diagnóstico Patrimonial. E o quadro de **MMS Participações** (CN) continua dependendo de digitação manual em `quadro_societario`.
