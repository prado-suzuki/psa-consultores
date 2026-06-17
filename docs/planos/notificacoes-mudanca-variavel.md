# Plano — Notificações de mudança de variável na tela Gerar Documento

> **Para o agente implementador:** este documento é autossuficiente. Leia a seção
> "Contexto necessário" antes de escrever código — ela aponta os arquivos exatos
> e o que cada um faz. O fluxo de geração e o snapshot já existem; aqui só se
> adiciona a camada de notificação.

---

## 1. Objetivo

Depois que uma versão de documento é validada na tela
`/equipe/osg/work/gerar-documento`, qualquer alteração feita **no cadastro de uma
variável que hidrata aquele documento** deve gerar uma notificação na própria
tela. A notificação diz **"campo X foi alterado para Y, por Z, em W"** (modelo de
**evento**, não de diff — não mostramos o valor antigo).

Requisitos de UX (do solicitante):

1. As notificações aparecem como **ícone (sino) com badge de contagem** no painel
   lateral esquerdo da tela Gerar (o card "Conferência dos dados").
2. Esse painel ganha uma **segunda aba**: "Notificações", que lista as mudanças.
3. **Marca d'água por timestamp**: depois que o usuário lê (clica em "Marcar como
   lido"), as notificações somem e só voltam a aparecer se houver **novas**
   mudanças depois disso.

---

## 2. Como funciona a detecção (modelo de evento + marca d'água)

Não há tabela de notificações materializada. As notificações são **derivadas** da
tabela `audit_logs` (que **já é populada** pelas mutações de cadastro — ver §4).
A regra é uma janela temporal:

```
notificação visível  ⟺  audit_log.performed_at > GREATEST(validado_em, visto_em)
                          E  audit_log.entity_id ∈ {entidades que hidratam o doc}
```

- **`validado_em`** — quando a versão foi validada (congelada). Marca o início da
  janela. → Adicionaremos a coluna `documento_gerado.snapshot_validado_em` (§3).
- **`visto_em`** — marca d'água por usuário: até quando este usuário já estava
  ciente. "Marcar como lido" faz `visto_em = now()`. → Tabela nova
  `documento_notificacao_visto` (§3).
- **`entity_id ∈ {...}`** — o conjunto de cadastros que alimentam *este*
  documento. Montagem detalhada em §5 (é a parte mais delicada).

Quando o usuário **revalida** o documento, `snapshot_validado_em` sobe e as
mudanças saem da janela naturalmente. "Marcar como lido" e "revalidar" são dois
gestos distintos: o primeiro só silencia; o segundo adota as mudanças no snapshot.

### Decisão de design já tomada

**Read-state é POR USUÁRIO** (cada membro da equipe lê/silencia para si). É a
semântica natural de "depois que o usuário ler". Se o solicitante preferir
**global** ("alguém da equipe já viu"), a mudança é localizada: trocar a tabela
`documento_notificacao_visto` por uma única coluna
`documento_gerado.notificacao_vista_em` e remover o `user_id` das queries. Tudo
mais permanece igual.

---

## 3. Modelo de dados (migration SQL)

Criar `supabase/migrations/20260616120000_notificacoes_mudanca_variavel.sql`
(ajuste o timestamp para a data/hora reais da criação; padrão do repo é
`YYYYMMDDHHMMSS_descricao.sql`).

```sql
-- 1) Carimbo explícito de "validado em" no documento gerado.
--    Por que não reusar updated_at: hoje updated_at ≈ última validação (a linha
--    só é atualizada pelo re-congelamento), mas isso é frágil. Uma coluna
--    dedicada deixa a janela de notificação inequívoca.
ALTER TABLE public.documento_gerado
  ADD COLUMN IF NOT EXISTS snapshot_validado_em timestamptz;

-- Backfill: documentos já validados usam updated_at como aproximação.
UPDATE public.documento_gerado
  SET snapshot_validado_em = updated_at
  WHERE snapshot_validado_em IS NULL;

-- 2) Marca d'água de leitura, por usuário e por documento.
CREATE TABLE public.documento_notificacao_visto (
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documento_gerado_id  uuid        NOT NULL REFERENCES public.documento_gerado(id) ON DELETE CASCADE,
  visto_em             timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, documento_gerado_id)
);

ALTER TABLE public.documento_notificacao_visto ENABLE ROW LEVEL SECURITY;

-- Cada usuário só enxerga/edita a própria marca d'água.
CREATE POLICY "own notificacao_visto" ON public.documento_notificacao_visto
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

> **`audit_logs` já existe** com RLS de SELECT liberada para `team_member` na área
> `'osg'` (migration `20260213173645_*`). Não precisa tocar nela.

### Atualizar tipos do Supabase

`src/integrations/supabase/types.ts` é gerado. Após a migration:

- Se houver script de geração no projeto, rode-o.
- Caso contrário, **adicione manualmente** em `types.ts`:
  - a coluna `snapshot_validado_em: string | null` em `documento_gerado`
    (Row/Insert/Update — espelhe `created_at`);
  - a tabela `documento_notificacao_visto` (Row/Insert/Update) — espelhe a forma
    de qualquer tabela simples já existente (ex.: chaves `user_id`,
    `documento_gerado_id`, `visto_em`).

---

## 4. Contexto necessário (arquivos-chave)

| Arquivo | O que tem / por que importa |
|---|---|
| `src/pages/equipe/osg/GerarDocumento.tsx` | Tela alvo. Tem `documentoGerado`/`documentoGeradoId`, `congelado`, `empresaId`, `registroPorBinding`, e as listas vivas `socios`/`administradores`/`integralizacoes`. O painel lateral esquerdo (card "Conferência dos dados") está no bloco `temPainel && <Card …>` (≈ linhas 973–1198). |
| `src/hooks/useAuditLog.ts` | `useAuditLog().logAction(...)` — **escrita**. Mostra o shape de `changed_fields`: `Record<campo, { old, new }>`. O `new` é o nosso "Y". `area` usada nos cadastros OSG = `'osg'`. |
| `src/hooks/useQualificacaoDasPartes.ts` | Mutações de pessoa/parentesco/administracao **já chamam `logAction`** com `computeFieldDiff` + listas curadas (`PESSOA_DIFF_FIELDS`, etc.). entity_type: `'pessoa'`, `'parentesco'`, `'administracao'`. |
| `src/hooks/useDiagnosticoPatrimonial.ts` | Idem para `'bem'`, `'matricula'`, `'titularidade'`. |
| `src/hooks/useQuadroSocietario.ts` | Mutação do quadro societário → entity_type `'quadro_societario'`. **(relevante p/ Tier 2, §5).** |
| `src/hooks/useGeracaoDocumento.ts` | `useListasDaEmpresa` (sócios/admin/integralizações vivos) e `useRegistrosPorTipo`. É aqui que ficam os SELECTs que precisam expor ids relacionais no Tier 2. |
| `src/components/equipe/audit/AuditLogTable.tsx` | **Reaproveite os padrões:** query de `audit_logs` (linhas ≈150–166) e lookup de `profiles` (`['audit-lookup-profiles']`, lê `profiles.id, first_name, last_name`) para resolver `performed_by → nome`. |
| `src/components/equipe/audit/auditFieldFormatter.ts` | `FIELD_LABELS` (tradução de nomes de campo → rótulo PT). Reuse para exibir "Capital social" em vez de `capital_social`. |
| `src/components/ui/tabs.tsx` | shadcn `Tabs/TabsList/TabsTrigger/TabsContent` disponível (pode usar, ou um header segmentado custom com tokens OSG — ver §6). |
| `src/contexts/AuthContext.tsx` | `useAuth().user?.id` = usuário atual (para a marca d'água). |

Tokens de estilo OSG (já no projeto): `osg-moss` (acento verde-musgo), `osg-300/60`
(borda de card), `osg-50/osg-100/osg-700`. Siga o padrão visual dos cards
existentes na tela.

---

## 5. Montagem do conjunto de entidades do documento (parte delicada)

A notificação só deve disparar para cadastros que **hidratam este documento**.
Precisamos do conjunto de `entity_id`s referenciados. Tudo já está em escopo no
componente `GerarDocumento` (lado vivo — atenção: o snapshot perde os ids das
listas porque a proveniência viaja como `Symbol` e some no JSON; por isso usamos
o **lado vivo** recalculado, não o snapshot).

### Tier 1 — ids diretos (OBRIGATÓRIO, cobre a maioria)

Monte um `useMemo<string[]>` com a união, sem duplicatas e sem nulos, de:

```ts
const entidadeIds = useMemo(() => {
  const ids = new Set<string>();
  if (empresaId) ids.add(empresaId);                          // PJ / sociedade (pessoa)
  Object.values(registroPorBinding).forEach((id) => id && ids.add(id)); // bindings simples
  socios.forEach((s) => {                                     // sócios (pessoa)
    if (s.pessoa.id && !s.pessoa.id.startsWith(PESSOA_LEGADA_PREFIX)) ids.add(s.pessoa.id);
  });
  administradores.forEach((a) => a.pessoa.id && ids.add(a.pessoa.id));
  integralizacoes.forEach((m) => {                            // matrícula + titulares
    if (m.id) ids.add(m.id);
    m.titulares.forEach((t) => t.pessoaId && !t.pessoaId.startsWith(PESSOA_LEGADA_PREFIX) && ids.add(t.pessoaId));
  });
  return [...ids];
}, [empresaId, registroPorBinding, socios, administradores, integralizacoes]);
```

`PESSOA_LEGADA_PREFIX` é exportado de `useGeracaoDocumento.ts` (sócios derivados
sem cadastro têm id sintético `legado:…`, que não existe em `audit_logs`).

**Cobre:** qualificação de pessoas, dados de imóvel/matrícula, cartório,
identidade da empresa. **Não cobre** (ainda): quotas do quadro societário, cargo
do administrador, fração de titularidade — porque essas edições são logadas com o
`entity_id` da **linha relacional** (`quadro_societario`/`administracao`/
`titularidade`), não da pessoa. Veja Tier 2.

### Tier 2 — ids das linhas relacionais (RECOMENDADO; faça junto se possível)

Variáveis como `socio.quotas` e `total.*` são hidratadas do `quadro_societario`;
`cargo` vem de `administracao`. Para notificar mudanças nelas, é preciso expor os
ids dessas linhas no lado vivo e somá-los ao `entidadeIds`. Mudanças:

1. **`useGeracaoDocumento.ts`** — adicionar `id` aos SELECTs:
   - `socios-geracao`: `.select('id, quotas, vlr_total, socio:socio_pessoa_id (*)')`
   - `administradores-geracao`: `.select('id, cargo, administrador:administrador_pessoa_id (*)')`
   - matrículas (em `useIntegralizacoesAprovadas`): a sub-relação `titularidade`
     já pode receber `id` no select.
2. **`src/lib/templates/mapeadores.ts`** — propagar esses ids nos tipos
   `SocioParaMapear`, `AdministradorParaMapear`, `MatriculaIntegralizacao`
   (campo opcional, ex.: `quadroSocietarioId?`, `administracaoId?`,
   `titularidadeIds?: string[]`). **Não** os exponha como placeholders — são só
   metadados para o conjunto de entidades.
3. No `entidadeIds`, somar `s.quadroSocietarioId`, `a.administracaoId`,
   `m.titularidadeIds`.

> **Confirme** os `entity_type`/`entity_id` reais que `useQuadroSocietario.ts` e as
> mutações de `administracao`/`titularidade` gravam (leia os `logAction(...)`
> desses hooks) antes de assumir. Se o `entity_id` logado for o id da linha
> relacional, o Tier 2 acima resolve.

Se o Tier 2 for adiado, **documente na UI/PR** que mudanças de quotas/cargo ainda
não notificam (limitação conhecida), para não dar falsa sensação de cobertura
total.

---

## 6. UI — painel lateral com abas

Alvo: o card `temPainel && <Card …>` no bloco `modoDocumento` de
`GerarDocumento.tsx`. Transformá-lo num painel de **duas abas**.

### Estrutura

- **Aba 1 — "Conferência"**: o conteúdo atual do `<CardContent>` (capital, sócios,
  administradores, etc.), sem alteração de comportamento.
- **Aba 2 — "Notificações"**: lista das mudanças (ver item "Lista" abaixo).
  O trigger desta aba mostra um **ícone de sino** (`Bell` do `lucide-react`) com
  um **badge** de contagem de não-lidas (estilo do badge de contagem já usado em
  `SecaoPainel`: `rounded-full bg-osg-moss px-1.5 text-xs text-white`).

### Quando exibir a aba de Notificações

- Só faz sentido com documento **validado**: renderize a aba apenas quando
  `documentoGeradoId != null` (congelado). Sem validação, mostre só "Conferência"
  (sem header de abas, comportamento atual).
- Sugestão: se a contagem de não-lidas for `> 0`, abrir o painel já na aba
  "Notificações" (ou ao menos manter o badge visível). Não force — apenas destaque.

### Implementação das abas

Pode usar `@/components/ui/tabs` (shadcn, disponível) **ou** um header segmentado
custom com tokens OSG para casar melhor com o card. Recomendado um header
enxuto com dois botões dentro do `<CardHeader>`:

```tsx
// dentro do CardHeader, abaixo do título
<div className="flex gap-1 rounded-md bg-osg-50 p-1">
  <button
    onClick={() => setAba('conferencia')}
    className={cn('flex-1 rounded px-2 py-1 text-sm font-medium', aba === 'conferencia' ? 'bg-white text-osg-700 shadow-sm' : 'text-slate-500')}
  >
    Conferência
  </button>
  <button
    onClick={() => setAba('notificacoes')}
    className={cn('flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-sm font-medium', aba === 'notificacoes' ? 'bg-white text-osg-700 shadow-sm' : 'text-slate-500')}
  >
    <Bell className="h-4 w-4" />
    Notificações
    {naoLidas > 0 && (
      <span className="rounded-full bg-osg-moss px-1.5 text-xs font-bold text-white tabular-nums">{naoLidas}</span>
    )}
  </button>
</div>
```

`const [aba, setAba] = useState<'conferencia' | 'notificacoes'>('conferencia')`.

### Lista de notificações (conteúdo da aba 2)

Para cada `audit_log` da janela, renderizar uma a uma. Um log pode ter vários
campos em `changed_fields` → uma linha por campo:

> **{rótulo do campo}** de _{entity_name}_ alterado para **{valor `new`}**
> {nome de `performed_by`} · {`performed_at` formatado}

- Rótulo do campo: `FIELD_LABELS[campo] ?? campo` (de `auditFieldFormatter.ts`;
  ignore os marcados `'__HIDDEN__'`).
- Nome do autor: lookup `profiles` (reaproveite a query `['audit-lookup-profiles']`
  de `AuditLogTable.tsx`).
- Data: formate em pt-BR (ex.: `Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeStyle:'short' })`).
- `action === 'deleted'` → "removido"; `'created'` → "criado". Trate além de `'updated'`.

Rodapé / topo da lista: botão **"Marcar como lido"** (só habilitado se
`naoLidas > 0`) → dispara a mutation de marca d'água (§7). Estado vazio:
"Nenhuma alteração desde a validação."

Opcional (decisão de produto, default = incluir): excluir mudanças feitas pelo
**próprio usuário** (`performed_by === user.id`). Se quiser excluir, filtre na
query/cliente. Deixe comentado o ponto de decisão.

---

## 7. Hooks novos

Criar `src/hooks/useNotificacoesDocumento.ts`.

### 7.1 Ler a marca d'água

```ts
export function useNotificacaoVisto(documentoGeradoId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notificacao-visto', documentoGeradoId, user?.id],
    enabled: !!documentoGeradoId && !!user?.id,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('documento_notificacao_visto')
        .select('visto_em')
        .eq('documento_gerado_id', documentoGeradoId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.visto_em ?? null;
    },
  });
}
```

### 7.2 Marcar como lido (upsert)

```ts
export function useMarcarNotificacoesVistas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (documentoGeradoId: string) => {
      // visto_em = now() do servidor; NÃO use Date.now no cliente para o valor
      // canônico — faça upsert deixando o default, ou passe new Date().toISOString().
      const { error } = await supabase
        .from('documento_notificacao_visto')
        .upsert(
          { user_id: user!.id, documento_gerado_id: documentoGeradoId, visto_em: new Date().toISOString() },
          { onConflict: 'user_id,documento_gerado_id' },
        );
      if (error) throw error;
    },
    onSuccess: (_r, documentoGeradoId) => {
      queryClient.invalidateQueries({ queryKey: ['notificacao-visto', documentoGeradoId] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes-documento', documentoGeradoId] });
    },
  });
}
```

### 7.3 Notificações da janela

```ts
export function useNotificacoesDocumento(params: {
  documentoGeradoId: string | null;
  validadoEm: string | null;     // documento_gerado.snapshot_validado_em
  vistoEm: string | null;        // da 7.1
  entidadeIds: string[];         // de §5
}) {
  const { documentoGeradoId, validadoEm, vistoEm, entidadeIds } = params;
  // desde = max(validadoEm, vistoEm). Se não validado, não há janela.
  const desde = [validadoEm, vistoEm].filter(Boolean).sort().at(-1) ?? null;
  return useQuery({
    queryKey: ['notificacoes-documento', documentoGeradoId, desde, entidadeIds],
    enabled: !!documentoGeradoId && !!desde && entidadeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, entity_type, entity_id, entity_name, action, changed_fields, performed_by, performed_at')
        .eq('area', 'osg')
        .in('entity_id', entidadeIds)
        .gt('performed_at', desde!)
        .order('performed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
```

`naoLidas` = `notificacoes.length` (por construção, tudo que volta está na
janela = não-lido). Se a UI também listar lidas (greyed), ajuste a contagem.

> **Nota sobre `.in('entity_id', …)`**: `entidadeIds` costuma ter dezenas de itens
> (ok). Se algum dia passar de centenas, paginar/quebrar a query. Para o uso atual,
> uma query só basta.

---

## 8. Fiação em `GerarDocumento.tsx`

1. Importar `Bell` de `lucide-react` e os hooks novos.
2. Ler `snapshot_validado_em` do `documentoGerado` (campo novo da row).
3. `const { data: vistoEm } = useNotificacaoVisto(documentoGeradoId)`.
4. Montar `entidadeIds` (§5).
5. `const { data: notificacoes = [] } = useNotificacoesDocumento({ documentoGeradoId, validadoEm, vistoEm, entidadeIds })`.
6. `const marcarVistas = useMarcarNotificacoesVistas()`.
7. Estado `aba` e badge `naoLidas = notificacoes.length`.
8. Converter o card "Conferência dos dados" no painel de duas abas (§6); render
   condicional da aba 2 por `documentoGeradoId != null`.
9. Lookup de `profiles` para nomes (reusar a query de `AuditLogTable`).

---

## 9. Casos de borda e limitações (documentar honestamente)

- **Reversão aparece**: como é modelo de evento, alterar e desfazer ainda mostra
  "alterado para Y" (mesmo Y igual ao da validação). Aceitável pelo escopo.
- **Campo fora da curadoria não notifica**: `audit_logs.changed_fields` só traz os
  campos das listas curadas (`PESSOA_DIFF_FIELDS`, `BEM_DIFF_FIELDS`, …). Se um
  modelo hidratar um campo que não está nessas listas, a edição não vira log → sem
  aviso. **Ação:** ao implementar, conferir que os campos efetivamente usados pelos
  modelos estão cobertos nessas listas; se faltar, ampliá-las nos respectivos hooks.
- **Sócios `legado:` (PR sem cadastro)**: id sintético, ignorado (não há log).
- **Quotas/cargo/fração**: só notificam com o Tier 2 (§5). Sem ele, ficam de fora.
- **Documento não validado**: sem `snapshot_validado_em` ⇒ sem janela ⇒ sem aba.
- **Múltiplas mutações no mesmo registro**: cada uma é um log; a lista mostra todas
  (mais recente primeiro). Se preferir só a última por (entity, campo), agrupar no
  cliente — **não** é requisito.

---

## 10. Checklist de arquivos

**Novos**
- [ ] `supabase/migrations/2026MMDDHHMMSS_notificacoes_mudanca_variavel.sql`
- [ ] `src/hooks/useNotificacoesDocumento.ts`

**Editados**
- [ ] `src/integrations/supabase/types.ts` (coluna `snapshot_validado_em` + tabela `documento_notificacao_visto`)
- [ ] `src/hooks/useDocumentoGerado.ts` (gravar `snapshot_validado_em` no insert e no update — ambos os caminhos de `useSalvarDocumentoGerado`)
- [ ] `src/pages/equipe/osg/GerarDocumento.tsx` (painel com abas, fiação, montagem de `entidadeIds`)
- [ ] *(Tier 2)* `src/hooks/useGeracaoDocumento.ts` + `src/lib/templates/mapeadores.ts` (expor ids relacionais)

> Em `useDocumentoGerado.ts`, no `useSalvarDocumentoGerado`, adicione
> `snapshot_validado_em: new Date().toISOString()` tanto no `.update({...})`
> (rascunho existente) quanto no `.insert({...})` (novo). Assim a janela reinicia a
> cada validação/revalidação.

---

## 11. Como testar

1. **Migration**: aplicar e confirmar tabela + coluna + RLS. Inserir/ler a marca
   d'água como dois usuários distintos prova o isolamento por usuário.
2. **Fluxo feliz**: gerar um documento, validar; editar um campo de uma pessoa que
   entra no documento (ex.: estado civil) em "Qualificação das Partes"; voltar à
   tela Gerar → badge com 1, aba lista "Estado civil de Fulano alterado para …,
   por Você, em …".
3. **Marca d'água**: clicar "Marcar como lido" → some; nova edição → reaparece.
4. **Revalidar**: editar, revalidar → janela reinicia, lista zera sem precisar
   marcar.
5. **Escopo**: editar uma pessoa que **não** entra no documento → nada aparece.
6. **Negativo**: documento não validado → sem aba de Notificações.
7. *(Tier 2)* editar quotas no Quadro Societário → notifica.

Rodar `npm run lint` / typecheck e build. Verificar no app (skill `run`/`verify`).

---

## 12. Fora de escopo (decisões já tomadas)

- **Sem tabela de alertas materializada** nem índice de dependências do snapshot —
  a detecção é por query derivada, ao vivo.
- **Sem badge fora da tela Gerar** (ex.: numa lista global de documentos). Se for
  pedido depois, aí sim se justifica materializar alertas (`documento_snapshot_alerta`)
  — mas não agora.
- **Sem diff "antes → depois"** na UI — só "alterado para Y" (modelo de evento).
- O **modal de histórico nos cadastros** (a "feature 2" da conversa) é trabalho
  separado: ele lê `audit_logs` por `entity_id` da entidade aberta. Compartilha a
  mesma tabela e o mesmo lookup de `profiles`/`FIELD_LABELS`, mas não faz parte
  deste plano.
```
