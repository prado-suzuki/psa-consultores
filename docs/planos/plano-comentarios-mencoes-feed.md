# Comentários, menções, anexos e feed — desenho das tabelas

**Status:** fase 1 e fase 2 implementadas (ver §10); reações e follow/unfollow seguem propostas
**Escopo:** comentários com menção e anexo em tarefas (`org_tasks`) e projetos (`org_projects`), mais o feed centralizado que vem em sequência.
**Referência de UX:** painel *Activity* do ClickUp (thread, responder, reagir, anexar) + canal do Slack (feed).

---

## 1. Decisões travadas

| # | Decisão | Motivo |
|---|---|---|
| 1 | **Uma tabela unificada** `org_comments` (polimórfica: tarefa ou projeto), não duas irmãs | Menções, anexos e reações são idênticos nos dois contextos — duas mães obrigariam a duplicar os três satélites, as RLS, os hooks e o componente de thread. E o feed em duas tabelas exigiria misturar duas fontes e paginar em cima disso. |
| 2 | **Feed é um stream único**, não segmentado por canal/projeto | Definido por Bernardo. |
| 3 | **Não existe tarefa sem projeto** | Definido por Bernardo. Vira `project_id NOT NULL` em `org_comments` (ver §3.2 e a verificação obrigatória em §9). |
| 4 | **Reações ficam para a fase 2** | Parte mais dispensável; entra depois sem migração, nada depende dela. |
| 5 | Visibilidade no feed é **derivada** na v1 (o que tem a ver com você), sem "seguir/deixar de seguir" manual | Evita spam sem inventar tabela de assinatura antes de saber se faz falta. |

---

## 2. Estado atual (o que existe hoje)

### 2.1 `org_task_comments` — 7 colunas, 39 linhas

```sql
CREATE TABLE public.fiscal_task_comments (   -- renomeada p/ org_task_comments em 2026-05-12
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES public.fiscal_tasks(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id),
  user_name  text,
  comment    text NOT NULL,
  is_system  boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

**As 39 linhas têm `is_system = true`. Zero comentário humano.** Na prática a tabela é um log de eventos (reatribuição e revisão), não um chat — a feature é greenfield e não há conteúdo de usuário para migrar.

### 2.2 Achados que motivam o redesenho

| Achado | Onde | Consequência |
|---|---|---|
| Tipo do evento é **adivinhado por prefixo de string** | `TaskModal.tsx:210-222` — `comment.startsWith('Enviado para revisão')`, `comment === 'Tarefa aprovada'` | Já é frágil hoje; quebra de vez quando o mesmo campo receber texto livre com menções. Vira coluna `kind` tipada. |
| RLS de **escrita só checa papel** | `rls_org_task_comments_insert/update` = `has_role_or_higher('team_member')`; delete = `lider+` | Qualquer team_member edita comentário de qualquer outro, em qualquer tarefa. Precisa amarrar ao autor **e** à visibilidade da entidade. |
| RLS de **leitura já está correta** | `org_task_comments_select` → `org_task_visivel(task_id)` | Herda a visibilidade da tarefa. É o padrão a preservar. |
| **Sem índice em `task_id`** | nenhuma migration cria | FK sem índice. |
| `created_at` nullable, `is_system` nullable | DDL acima | `created_at` vira chave de paginação do feed — não pode ser nulo. |
| FK `user_id` sem `ON DELETE` | DDL acima | Desligar um usuário travaria por FK. |
| Sem `parent_id`, sem `editado_em`, sem soft delete, sem anexo, sem menção | — | É o corpo desta proposta. |

### 2.3 Peças da casa que vamos reaproveitar

| Peça | Onde | Uso aqui |
|---|---|---|
| `org_task_visivel(task_id)` | `20260715144422_...sql:200` | Semântica de visibilidade de tarefa a preservar |
| `can_view_org_project(uid, project_id)` | `20260507160516_...sql:35` | Idem, projeto |
| `has_role_or_higher(uid, app_role)` | — | Papéis |
| Helper de permissão retornando `uuid[]` + `= ANY(...)` | `resolve_user_cluster_ids` (`20260623130000_dashboards_rpcs.sql:20`) | Padrão para a visibilidade em conjunto do feed (§4) |
| View com `security_invoker = on` | 10 views no repo, ex. `profiles_safe` | Padrão para a view de feed (§3.8) |
| Bucket privado + policy por papel | `deliverable-attachments` (`20251211184739_...sql:38`) | Padrão para o bucket de anexos (§3.5) |
| `ALTER PUBLICATION supabase_realtime ADD TABLE` | `20260320142657_...sql:1` | Thread e feed ao vivo (§7) |
| Marca d'água de leitura por usuário | `documento_notificacao_visto` (OSG) | Padrão para o "até onde eu li" do feed (§3.7) |

### 2.4 Não confundir

`tasks` e `task_comments` existem no banco e **não têm nenhuma referência no código** (legado do módulo antigo). O sistema vivo é `org_tasks` / `org_projects`. Esta proposta não toca nas legadas.

---

## 3. Desenho das tabelas

```
                        ┌──────────────────────────┐
                        │      org_comments        │  ← tabela central
                        │  entity_type + entity_id │    (tarefa OU projeto)
                        │  project_id (etiqueta)   │
                        │  parent_id (thread)      │
                        │  kind (comment/sistema)  │
                        └────────────┬─────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
   org_comment_mentions   org_comment_attachments   org_comment_reactions
   (= caixa de menções)   (prints, bucket privado)      (FASE 2)

   org_feed_visto  → marca d'água "até onde eu li" (FASE 2, junto com o feed)
   org_comments_feed (VIEW) → comentário + título da tarefa + nome do projeto
```

### 3.1 Enums

```sql
-- Que tipo de coisa está sendo comentada.
CREATE TYPE public.org_comment_entity AS ENUM ('org_task', 'org_project');

-- Natureza do registro. Substitui o boolean is_system e o parsing de string.
CREATE TYPE public.org_comment_kind AS ENUM (
  'comment',              -- conversa de gente
  'assignment_changed',   -- "Tarefa reatribuída para X. Motivo: Y"
  'review_submitted',     -- "Enviado para revisão"
  'review_approved',      -- "Tarefa aprovada"
  'review_adjustments',   -- "Devolvido para ajustes"
  'status_changed'        -- reservado
);
```

> Nomes de coluna em inglês para casar com `org_tasks`/`org_projects`. Exceção: o soft delete usa `excluido`, que é a convenção obrigatória do AGENTS.md.

### 3.2 `org_comments` — tabela central

```sql
CREATE TABLE public.org_comments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- A quem o comentário pertence (polimórfico).
  entity_type  public.org_comment_entity NOT NULL,
  entity_id    uuid NOT NULL,

  -- Etiqueta desnormalizada: o projeto do comentário. Preenchida por trigger,
  -- nunca pelo cliente. É o que faz o feed ser barato (§4).
  --   entity_type = 'org_project' → project_id = entity_id
  --   entity_type = 'org_task'    → project_id = org_tasks.project_id
  project_id   uuid NOT NULL REFERENCES public.org_projects(id) ON DELETE CASCADE,

  -- Thread de profundidade 1: resposta aponta para a raiz; raiz tem parent_id NULL.
  parent_id    uuid REFERENCES public.org_comments(id) ON DELETE CASCADE,

  kind         public.org_comment_kind NOT NULL DEFAULT 'comment',

  -- Corpo em markdown-lite. Menções ficam no texto como token @[Nome](uuid)
  -- e normalizadas em org_comment_mentions.
  body         text NOT NULL,

  -- Payload estruturado dos eventos de sistema (ex.: {"from":"uuid","to":"uuid"}).
  -- Para kind = 'comment' fica '{}'.
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,

  author_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name  text,                    -- snapshot, sobrevive à saída do usuário

  editado_em   timestamptz,             -- NULL = nunca editado

  excluido     boolean NOT NULL DEFAULT false,
  excluido_em  timestamptz,
  excluido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_comments ENABLE ROW LEVEL SECURITY;
```

**Por que `entity_id` não tem FK:** não existe FK que aponte para duas tabelas. A integridade vem de trigger (§3.3). O `project_id`, esse sim, é FK real — e é ele que dá o `ON DELETE CASCADE`: apagar um projeto limpa os comentários dele e das tarefas dele.

**Por que `body_plain` não existe:** busca textual não está no escopo. Se entrar, é coluna gerada + índice GIN, sem mexer no resto.

#### Índices

```sql
-- Thread da tela de tarefa/projeto.
CREATE INDEX idx_org_comments_entity
  ON public.org_comments (entity_type, entity_id, created_at DESC)
  WHERE excluido = false;

-- Feed: filtra pelos projetos visíveis e ordena por data (paginação por cursor).
CREATE INDEX idx_org_comments_feed
  ON public.org_comments (project_id, created_at DESC, id DESC)
  WHERE excluido = false AND kind = 'comment';

CREATE INDEX idx_org_comments_parent
  ON public.org_comments (parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX idx_org_comments_author
  ON public.org_comments (author_id);
```

### 3.3 Triggers de `org_comments`

Quatro triggers. Os dois primeiros são integridade que a FK polimórfica não dá; os dois últimos são segurança.

**(a) Preencher `project_id` e validar que a entidade existe** — `BEFORE INSERT`

```sql
CREATE OR REPLACE FUNCTION public.org_comments_resolve_escopo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.entity_type = 'org_project' THEN
    SELECT p.id INTO v_project_id
      FROM public.org_projects p WHERE p.id = NEW.entity_id;
    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Projeto % não existe', NEW.entity_id USING ERRCODE = '23503';
    END IF;

  ELSIF NEW.entity_type = 'org_task' THEN
    SELECT t.project_id INTO v_project_id
      FROM public.org_tasks t WHERE t.id = NEW.entity_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tarefa % não existe', NEW.entity_id USING ERRCODE = '23503';
    END IF;
    -- Regra de negócio: não existe tarefa sem projeto. Fail-loud.
    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Tarefa % não tem projeto — comentário exige projeto', NEW.entity_id
        USING ERRCODE = '23502';
    END IF;
  END IF;

  NEW.project_id := v_project_id;   -- ignora o que o cliente mandar
  RETURN NEW;
END; $$;
```

**(b) Thread de profundidade 1 e mesma entidade** — `BEFORE INSERT OR UPDATE`

Impede resposta-de-resposta e resposta que atravessa entidades (comentário da tarefa A respondendo comentário do projeto B).

```sql
-- se NEW.parent_id IS NOT NULL:
--   pai deve existir, ter parent_id IS NULL,
--   e ter o mesmo (entity_type, entity_id) do filho.
```

**(c) Travar colunas no UPDATE** — `BEFORE UPDATE`

Esta é a fronteira de segurança da edição. A policy de UPDATE (§3.9) deixa entrar o autor **ou** `lider+`; o trigger decide o que cada um pode mexer:

- **Nunca mudam, para ninguém:** `entity_type`, `entity_id`, `project_id`, `kind`, `author_id`, `created_at`.
- **Autor:** pode alterar `body` (e o trigger carimba `editado_em = now()`, `updated_at = now()`).
- **Não-autor (`lider+`):** só pode virar `excluido` de `false` para `true` (trigger carimba `excluido_em`/`excluido_por`). Qualquer outra diferença → exceção.

**(d) Limpar comentários de tarefa apagada** — `AFTER DELETE ON public.org_tasks`

O cascade por projeto já cobre o caso "projeto apagado". Falta o caso "tarefa apagada, projeto vivo", que a FK polimórfica não pega:

```sql
DELETE FROM public.org_comments
 WHERE entity_type = 'org_task' AND entity_id = OLD.id;
```

### 3.4 `org_comment_mentions` — menções **e** caixa de notificações

Não existe tabela genérica de notificação no projeto; os padrões atuais (`useReviewTaskNotifications`, `useNotificacoesDocumento`) derivam a notificação da própria entidade. Então esta tabela **é** a caixa de entrada: badge = contagem de `lido_em IS NULL`.

```sql
CREATE TABLE public.org_comment_mentions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id        uuid NOT NULL REFERENCES public.org_comments(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lido_em           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, mentioned_user_id)
);

ALTER TABLE public.org_comment_mentions ENABLE ROW LEVEL SECURITY;

-- Badge e lista "minhas menções não lidas".
CREATE INDEX idx_org_comment_mentions_inbox
  ON public.org_comment_mentions (mentioned_user_id, created_at DESC)
  WHERE lido_em IS NULL;
```

O `UNIQUE` impede menção duplicada da mesma pessoa no mesmo comentário (o texto pode citar `@Bernardo` duas vezes; a notificação é uma).

### 3.5 `org_comment_attachments` + bucket

```sql
CREATE TABLE public.org_comment_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid NOT NULL REFERENCES public.org_comments(id) ON DELETE CASCADE,
  file_path   text NOT NULL,          -- caminho dentro do bucket
  file_name   text NOT NULL,
  file_size   integer NOT NULL,
  file_type   text,
  width       integer,                -- imagem: evita pulo de layout no render
  height      integer,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_comment_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_org_comment_attachments_comment
  ON public.org_comment_attachments (comment_id);
```

**Bucket privado `comment-attachments`**, no padrão do `deliverable-attachments`:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('comment-attachments', 'comment-attachments', false);
-- policies de SELECT/INSERT/DELETE em storage.objects com
--   bucket_id = 'comment-attachments' AND has_role_or_higher(auth.uid(), 'team_member')
-- (mesmo nível de granularidade dos buckets existentes; leitura via signed URL)
```

**Convenção de caminho:** `{project_id}/{comment_id}/{uuid}.{ext}`

**Ordem de gravação (importa para o Ctrl+V de print):** o anexo precisa existir antes do comentário para dar preview, mas o caminho depende do `comment_id`. Solução: **o cliente gera o UUID do comentário** (`crypto.randomUUID()`) antes de subir o arquivo. Sobe o print nesse caminho, mostra o preview, e só então insere comentário + anexos + menções — de preferência numa RPC única (§6), para não deixar arquivo órfão se o insert falhar.

### 3.6 `org_comment_reactions` — **FASE 2**

Desenhada aqui só para registrar que nada depende dela; entra depois sem migração.

```sql
CREATE TABLE public.org_comment_reactions (
  comment_id uuid NOT NULL REFERENCES public.org_comments(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id, emoji)
);
```

Tabela em vez de coluna `jsonb` em `org_comments` por dois motivos: (1) reagir é *outra pessoa* escrevendo — com `jsonb` seria preciso abrir o UPDATE da linha do comentário para todos que o veem, e o trigger que garante "só mexeu em reactions" passaria a ser a fronteira de segurança do `body`; (2) dois cliques simultâneos em 👍 fazem read-modify-write do mesmo JSON e um se perde. Com tabela, a PK composta dá unicidade de graça e a permissão é `user_id = auth.uid()`.

### 3.7 `org_feed_visto` — **FASE 2** (junto com o feed)

Marca d'água "até onde eu li", equivalente à linha de *novas mensagens* do Slack. Uma linha por usuário, porque o feed é stream único (decisão #2).

```sql
CREATE TABLE public.org_feed_visto (
  user_id  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  visto_em timestamptz NOT NULL DEFAULT now()
);
```

### 3.8 `org_comments_feed` — VIEW

**Por que precisa existir:** como `entity_id` não é FK, o PostgREST **não consegue** fazer embed (`select=*,org_tasks(title)` é impossível). O feed precisa mostrar "dito na tarefa X, do projeto Y". A view entrega isso pronto.

```sql
CREATE OR REPLACE VIEW public.org_comments_feed
WITH (security_invoker = on) AS
SELECT
  c.id, c.entity_type, c.entity_id, c.project_id, c.parent_id, c.kind,
  c.body, c.metadata, c.author_id, c.author_name,
  c.editado_em, c.created_at, c.updated_at,
  COALESCE(t.title, p.name)                    AS entity_title,
  p.name                                        AS project_name,
  (SELECT count(*) FROM public.org_comments r
     WHERE r.parent_id = c.id AND r.excluido = false) AS reply_count,
  (SELECT count(*) FROM public.org_comment_attachments a
     WHERE a.comment_id = c.id)                 AS attachment_count,
  c.excluido
FROM public.org_comments c
JOIN public.org_projects p ON p.id = c.project_id
LEFT JOIN public.org_tasks t
       ON c.entity_type = 'org_task' AND t.id = c.entity_id;
```

`security_invoker = on` é obrigatório: sem isso a view roda como dona e **fura a RLS** da tabela base (ver o comentário na migration `20260318205052`, que documenta exatamente essa pegadinha).

**A view não filtra `excluido`** — expõe a coluna e deixa o consumidor filtrar, conforme a convenção de soft delete do AGENTS.md. A primeira versão (migration `20260728132114`) filtrava, e isso tornava o critério de aceite do BER-24 impossível: o comentário excluído desaparecia da view e as respostas dele ficavam órfãs, apontando para um `parent_id` fora do resultado. Corrigido na migration `20260728140000`.

### 3.9 RLS

#### Helpers de visibilidade em conjunto

O motivo é de desempenho e está explicado em §4. Dois helpers, no padrão `uuid[]` + `= ANY(...)` do `resolve_user_cluster_ids`:

```sql
-- Projetos que o usuário vê (membro ∪ responsável/líder/criador ∪ caminhos de área).
-- Mesma semântica de can_view_org_project, mas devolvendo o conjunto.
CREATE OR REPLACE FUNCTION public.visible_org_project_ids(_uid uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ ... $$;

-- Tarefas visíveis por relação individual, mesmo sem acesso ao projeto:
-- assigned_to = _uid OR created_by = _uid OR (reviewer_id = _uid AND status = 'review').
-- Conjunto pequeno (dezenas por usuário).
CREATE OR REPLACE FUNCTION public.own_org_task_ids(_uid uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ ... $$;
```

> `own_org_task_ids` existe para **preservar a semântica atual**: o `org_task_visivel` de hoje dá acesso a quem é responsável, criador ou revisor-em-revisão, *mesmo não sendo membro do projeto*. Uma RLS só por projeto seria mais restritiva que o sistema atual.

#### `org_comments`

```sql
-- SELECT: dois caminhos, ambos por conjunto (nada de função linha a linha).
CREATE POLICY org_comments_select ON public.org_comments FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR project_id = ANY (public.visible_org_project_ids(auth.uid()))
  OR (entity_type = 'org_task' AND entity_id = ANY (public.own_org_task_ids(auth.uid())))
);

-- INSERT: só em nome próprio e só onde eu enxergo.
CREATE POLICY org_comments_insert ON public.org_comments FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND excluido = false
  AND (
    project_id = ANY (public.visible_org_project_ids(auth.uid()))
    OR (entity_type = 'org_task' AND entity_id = ANY (public.own_org_task_ids(auth.uid())))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- UPDATE: entra autor ou lider+; o trigger (c) decide o que cada um pode mexer.
CREATE POLICY org_comments_update ON public.org_comments FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.has_role_or_higher(auth.uid(), 'lider'::app_role))
WITH CHECK (author_id = auth.uid() OR public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- DELETE: nenhuma policy. Apagar é soft delete (excluido = true) via UPDATE.
```

Isso é um aperto real em relação ao que existe hoje, onde qualquer `team_member` edita comentário de qualquer um.

#### `org_comment_mentions`

- **SELECT:** `mentioned_user_id = auth.uid()` **ou** vê o comentário (`EXISTS` em `org_comments`, que já filtra pela policy acima).
- **INSERT:** quem pode comentar naquele comentário — na prática, o autor do comentário sendo criado.
- **UPDATE:** `mentioned_user_id = auth.uid()`, e trigger travando tudo exceto `lido_em` (marcar como lida é a única edição possível).
- **DELETE:** nenhuma (cascade do comentário resolve).

#### `org_comment_attachments`

- **SELECT:** herda — `EXISTS` no comentário visível.
- **INSERT:** `uploaded_by = auth.uid()` e comentário visível.
- **DELETE:** autor do anexo ou `lider+`.

---

## 4. Por que o feed exige a etiqueta e os helpers de conjunto

Comentário de tela é "me dá tudo da entidade X" — 30 linhas, índice direto. O feed é "me dá as últimas N de tudo que eu vejo, por data" — e aí duas coisas que eram irrelevantes viram estruturais:

1. **Permissão avaliada linha a linha vira gargalo.** Uma função de visibilidade chamada por linha é barata em 30 linhas e cara varrendo a ordem global — pior ainda porque *descarta* a maioria (você vê 3 de 40 projetos). Por isso a policy de SELECT compara contra **conjuntos pré-calculados** (`= ANY`), avaliados uma vez por consulta.
2. **A etiqueta `project_id` no próprio comentário** é o que permite esse `= ANY` e o índice `idx_org_comments_feed`. Sem ela, todo filtro de feed teria que passar pela tarefa.

**Paginação:** cursor por `(created_at, id)`, não `OFFSET` — daí `created_at NOT NULL` e o `id DESC` no índice como desempate.

**Limite honesto:** o caminho rápido é o de projeto. O segundo caminho (`own_org_task_ids`) é conjunto também, mas cresce com quantas tarefas a pessoa toca. Se o feed der latência com o volume real, o próximo passo é desnormalizar participantes ou materializar feed por usuário — **não** antecipar isso agora.

**Ruído (v1, derivado):** o feed lista o que tem a ver com você — projetos onde você é membro/responsável/líder, tarefas suas ou em sua revisão, e tudo em que você foi mencionado ou respondeu. Não precisa de tabela nova; é filtro na consulta. Se faltar controle fino, entra `follow/unfollow` depois, sem tocar em `org_comments`.

---

## 5. Migração dos 39 registros legados

Todos são de sistema. O mapeamento usa **a mesma lógica de prefixo que a UI já aplica hoje** — uma vez só, e o parsing morre com ela.

```sql
INSERT INTO public.org_comments
  (id, entity_type, entity_id, project_id, kind, body, author_id, author_name, created_at, updated_at)
SELECT
  oc.id, 'org_task', oc.task_id, t.project_id,
  CASE
    WHEN oc.comment LIKE 'Tarefa reatribuída%'   THEN 'assignment_changed'
    WHEN oc.comment LIKE 'Enviado para revisão%' THEN 'review_submitted'
    WHEN oc.comment =    'Tarefa aprovada'       THEN 'review_approved'
    WHEN oc.comment LIKE 'Devolvido para ajustes%' THEN 'review_adjustments'
    ELSE 'comment'
  END::public.org_comment_kind,
  oc.comment, oc.user_id, oc.user_name,
  COALESCE(oc.created_at, now()), COALESCE(oc.created_at, now())
FROM public.org_task_comments oc
JOIN public.org_tasks t ON t.id = oc.task_id;
```

Notas: preserva os `id` (links antigos continuam válidos); `project_id` vem do JOIN (o trigger de escopo é `BEFORE INSERT` e também resolveria, mas explícito é mais claro numa carga); `INNER JOIN` descarta órfão, se houver.

**Depois da migração:** renomear a antiga para `_deprecated_org_task_comments` e só derrubar depois que a v1 estiver em produção. São 3 pontos de leitura no código (§8) — não vale manter view de compatibilidade.

---

## 6. RPC de criação (recomendado)

Criar um comentário é hoje 3 gravações (comentário + menções + anexos). Sem transação, um erro no meio deixa menção órfã ou arquivo no bucket sem registro. Uma RPC `SECURITY INVOKER` (respeita RLS normalmente) resolve:

```sql
CREATE OR REPLACE FUNCTION public.criar_org_comment(
  _id uuid,                      -- UUID gerado no cliente (o do caminho do anexo)
  _entity_type public.org_comment_entity,
  _entity_id uuid,
  _parent_id uuid,
  _body text,
  _mentions uuid[],
  _attachments jsonb             -- [{file_path, file_name, file_size, file_type, width, height}]
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$ ... $$;
```

---

## 7. Realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.org_comments;
```

Realtime **não funciona em view** — o front assina a tabela e refaz a busca na view quando chega evento. Padrão já usado em `useDomainEquipeSprintDetalhes.ts:335` com `sprint_deliverables`.

---

## 8. Impacto no código

### Banco / migrations
- Registrar em `rls_precheck_allowed_tables` (migration `20260522173826`): `org_comments` → `['update']` (não há delete), `org_comment_attachments` → `['delete']`, `org_comment_mentions` → `['update']`.
- Atualizar `docs/rls/mapa-do-banco.md` com as tabelas novas.

### Frontend
| Arquivo | O que muda |
|---|---|
| `src/hooks/useOrgTasks.ts:403, 446, 479` | Os 3 pontos que tocam `org_task_comments` hoje (`useOrgTaskComments`, `useCreateOrgTaskComment`, reatribuição) passam a usar `org_comments` |
| `src/components/equipe/fiscal/tasks/TaskModal.tsx:210-222` | Parsing de prefixo sai; passa a ler `kind` |
| `src/components/equipe/fiscal/tasks/TaskStatusTransitionDialog.tsx` | Idem, ao gravar evento de revisão |
| **novo** `src/hooks/useDomainOrgComments.ts` | Camada de dados (thread, criar, editar, soft delete, menções, anexos) |
| **novo** `src/components/comentarios/` | Componente de thread compartilhado entre tarefa, projeto e feed |
| `src/components/equipe/projetos-cadastro/ProjetoDialog.tsx` | Redesenhado em duas colunas (projeto + thread) e decomposto em `projeto-modal/`; consome `OrgCommentsPanel` com `entityType = 'org_project'`. A identidade visual comum aos dois modais vive em `src/lib/modalChipStyles.ts` e `src/components/ui/section-heading.tsx` |

⚠️ **`TaskModal.tsx` tem 1423 linhas**, contra o teto de 600 do AGENTS.md. **Não cabe painel de comentários ali sem decompor antes** — a decomposição é pré-requisito, não parte do trabalho de comentários.

**Auditoria:** as mutations são novas, então valem a regra integral — `useAuditLog` com `changed_fields` em criar/editar/excluir comentário (`entity_type: 'org_comment'`).

---

## 9. Verificação obrigatória antes de rodar

A regra "não existe tarefa sem projeto" virou `project_id NOT NULL`. Se houver tarefa órfã no banco hoje, a migração de dados (§5) descarta silenciosamente e o trigger passa a barrar comentário nessas tarefas. Conferir primeiro:

```sql
SELECT count(*) FROM public.org_tasks WHERE project_id IS NULL;

SELECT count(*) FROM public.org_task_comments oc
  JOIN public.org_tasks t ON t.id = oc.task_id
 WHERE t.project_id IS NULL;
```

Se der zero nos dois, seguir. Se não, decidir o destino dessas tarefas **antes** — e considerar tornar `org_tasks.project_id` `NOT NULL` como endurecimento separado, para a regra passar a valer no banco e não só no acordo verbal.

> Esta checagem ficou pendente: o token de acesso usado na análise expirou antes de rodá-la.

---

## 10. Resumo do que entra em cada fase

**Fase 1 — comentários**
`org_comments` + 4 triggers + índices + RLS · `org_comment_mentions` · `org_comment_attachments` + bucket · helpers `visible_org_project_ids` / `own_org_task_ids` · view `org_comments_feed` · RPC de criação · migração dos 39 registros · realtime · decomposição do `TaskModal`

**Fase 2 — feed** — ENTREGUE em 2026-07-29, menos a marca d'água
Tela "Feed" (`/equipe/{tax,osg}/projetos/feed`), espelhada nas duas áreas no padrão
do `PainelTarefas`: `src/components/comentarios/feed/`, `src/hooks/useDomainFeedComentarios.ts`,
`src/lib/feedComentarios.ts`, migration `20260729144600_feed_org_comments.sql`.

- **`org_feed_visto` NÃO entrou.** A marca d'água de "não lidos" ficou fora do escopo da sprint
  por decisão do ticket — sem badge, sem linha de "novas mensagens".
- **Relevância:** por decisão de Bernardo (2026-07-29), o recorte é o que a RLS já permite ver —
  `visible_org_project_ids` cru, com o bypass de admin. Ou seja, admin vê a conversa da empresa
  toda e líder/sublíder vê os projetos da área dele. As duas outras fontes do §4 (mencionado,
  respondeu) entram por herança desses conjuntos, sem ramo próprio de consulta. Se o volume
  incomodar, o aperto é um helper `feed_relevant_project_ids(_uid)` (membro/responsável/líder,
  sem admin e sem os caminhos de área) — troca de uma linha na função SQL, sem tocar no front.
- **Paginação:** cursor em `(created_at, id)` dentro da função `feed_org_comments`, com sentinelas
  máximas na primeira página para o predicado continuar sendo limite de índice. Índice novo
  `org_comments_feed_cronologico_idx (created_at DESC, id DESC)`, irmão sem `project_id` do
  `org_comments_project_feed_idx`.

Dois consertos embarcados junto, porque o feed dependia deles:

- **A view usava `JOIN` interno em `org_projects`** e apagava comentário que a RLS de
  `org_comments` deixa passar: `rls_org_projects_select` não tem o ramo "tenho tarefa neste
  projeto", que é justamente o que `own_org_task_ids` cobre. Quem executava tarefa em projeto de
  que não é membro não via os comentários da própria tarefa — na thread também, não só no feed.
  Agora é `LEFT JOIN`; no pior caso `project_name` vem nulo.
- **`org_comments_select` reavaliava `visible_org_project_ids` por linha** (função STABLE em
  qual de policy não é dobrada em constante). Reescrita com subconsulta escalar, no mesmo padrão
  que `rls_org_projects_select` já usava — mesma regra, uma avaliação por consulta. Junto, o
  índice que faltava em `org_project_members (user_id)`.

**Caixa de menções (§3.4) — ENTREGUE em 2026-07-29**
A menção passou a notificar quem foi citado, no sino que já existe. Sem tabela nova: a
notificação **é** a linha de `org_comment_mentions` com `lido_em IS NULL`, que a RPC
`criar_org_comment` já gravava desde a fase 1 e ninguém lia.

- **Front:** `src/hooks/useNotificacoesMencao.ts` (caixa + carimbo de leitura),
  `src/lib/mencaoNotificacoes.ts` (junção e regras puras), item de menção no
  `NotificationPopover`, e `useMarcarMencoesLidasDaThread` no `OrgCommentsPanel`.
- **Nenhuma migration.** Tabela, índice de caixa de entrada (`mentioned_user_id` +
  `lido_em IS NULL`), RLS e trigger que só deixa mexer em `lido_em` já estavam de pé.
- **Duas consultas, não uma:** a caixa lê as menções pendentes e depois hidrata os
  comentários pela view em lote. Não dá para embutir — `org_comments_feed` é view, o
  PostgREST não embute view sem FK declarada, e é ela que traz título da entidade e nome
  do projeto.
- **Lido em dois caminhos:** clicar no item do sino, e abrir a thread onde o comentário
  está (senão o contador ficaria pendurado depois de a pessoa já ter lido).
- **Auto-menção não notifica.** A RPC grava qualquer id que venha no `_mentions`, inclusive
  o do próprio autor; o filtro está na camada pura.

⚠️ **Gap conhecido — menção sem alcance não aparece.** `org_comment_mentions_select` libera o
mencionado a ver a linha da menção, mas `org_comments_select` **não tem o ramo "fui
mencionado"**: é projeto visível ou tarefa de vínculo individual. Então a menção a quem não
alcança o comentário (ex.: revisor que não é membro do projeto e cuja tarefa saiu de
`status = 'review'`; ou ex-membro do projeto) é descartada em silêncio — notificação sem
conteúdo seria pior. O conserto é um ramo novo na policy, no padrão de conjunto do §4
(`id = ANY(public.mentioned_org_comment_ids(auth.uid()))`, não `EXISTS` por linha, que
pesaria na varredura global do feed). Fica como decisão de escopo/segurança, não embarcada.

**Filtros do feed — ENTREGUE em 2026-07-30**
Cinco recortes na tela de Feed: cliente, projeto, autor, "só o que me menciona" e período.

- **Filtro é do BANCO, não do front.** O feed pagina por cursor: filtrar a lista já
  carregada filtraria a janela de 20 comentários, não o feed. Os cinco entram como
  parâmetros opcionais de `feed_org_comments`, resolvidos no `WHERE` antes do `LIMIT`
  (migration `20260730151500_feed_org_comments_filtros.sql`).
- **`org_comments_feed` ganhou `client_id`** = `COALESCE(org_projects.external_client_id,
  ordem_servico.id_cliente)`, a mesma precedência de `useOrgProjects`/`useDomainFeedClientes`,
  por LEFT JOIN nos dois lados (INNER apagaria comentário cuja OS o leitor não alcança —
  o mesmo bug que a migration anterior consertou no join de `org_projects`). Só o ID: o NOME
  do cliente continua vindo por fora, por projeto, porque é cadastro compartilhado por todos
  os comentários do mesmo projeto.
- **Nulo ≠ vazio** nos parâmetros de array: nulo passa tudo, `'{}'` passa zero. É o que faz
  "filtrei um cliente sem conversa" devolver feed vazio em vez do feed inteiro.
- **Menção é semi-join por conjunto** (`id IN (subconsulta)`), não `EXISTS` correlacionado,
  para o planner partir do lado pequeno em vez de varrer a ordem cronológica global. O gap
  conhecido continua valendo: o filtro mostra menções DENTRO do que a RLS já deixa ver.
- **Período ancora na meia-noite LOCAL** (`desdeDoPeriodo`), não em "agora menos N × 24h":
  o feed é lido em blocos de dia, e um piso ancorado no dia é estável durante o dia inteiro —
  o que faz todas as páginas da mesma rolagem compartilharem o mesmo corte.
- **O recorte vive na URL** (`?cliente=&projeto=&autor=&mencoes=1&periodo=7d`), não em estado
  local: sobrevive ao F5, ao voltar do deep-link de tarefa e ao link colado no chat. Cada
  recorte é uma lista paginada própria (a query key carrega os filtros); a invalidação passou
  a ser por PREFIXO, senão a resposta escrita no feed só reapareceria no recorte sem filtro.
- **Front:** `src/lib/feedFiltros.ts` (+ teste), `src/components/comentarios/feed/FeedFiltros.tsx`,
  `useDomainFeedComentarios(filtros)`, estado vazio próprio de "nenhuma conversa nesse recorte".
- **Índices novos:** `org_comments_feed_autor_idx` (irmão cronológico do `idx_org_comments_author`,
  que não tinha a data) e `org_comment_mentions_usuario_idx` (os dois que existiam não respondem
  "todas as menções a mim, lidas ou não").
- **Fora do escopo, na fila:** dois filtros independentes podem se contradizer (cliente X +
  projeto de Y = zero resultados) — estreitar a lista de projetos pelo cliente escolhido exige
  o mapa projeto→cliente do universo visível, que hoje ninguém carrega. Multi-seleção já está
  pronta no banco (os parâmetros são arrays), falta só a tela.

**Fase 3 — se fizer falta**
`org_comment_reactions` · `follow/unfollow` explícito · busca textual no corpo · marca d'água de
não lidos (`org_feed_visto`, §3.7 — nunca entrou)

A view de feed, os helpers de conjunto e a etiqueta `project_id` entram **na fase 1 mesmo sendo para o feed** — são os três itens que causariam retrabalho se deixados para depois.
