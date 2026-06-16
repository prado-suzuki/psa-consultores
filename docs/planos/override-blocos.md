# Plano de implementação — Override de blocos por documento (OSG)

> **Para o agente implementador:** este documento é autossuficiente. Ele contém todo o
> contexto de código, schema, design e UX necessários. Você **não** precisa de informação
> externa. Leia inteiro antes de começar. Os caminhos são absolutos a partir de
> `/home/bernardo/Documentos/repos/psa-consultores`. Branch de trabalho: `feature/template-builder`.

---

## 1. Objetivo

Permitir que, na tela **Gerar Documento** (`/equipe/osg/work/gerar-documento`), o usuário
edite o texto de um bloco **apenas para aquele documento específico**, sem alterar o bloco
original da biblioteca. Isso é um **override** do tipo `substituicao`, escopado ao
`documento_gerado`.

O fluxo-alvo, do ponto de vista do usuário (equipe OSG, **pouco familiarizada com tecnologia** —
a UX precisa ser óbvia e à prova de confusão):

1. Usuário escolhe modelo + empresa/registros (fluxo que **já existe**).
2. Usuário clica em **"Validar versão"** (passo novo) — isso encerra a etapa de cadastros,
   **congela os valores atuais** e cria o registro persistente (`documento_gerado`).
3. Na prévia, ao passar o mouse num bloco ele se destaca; ao clicar, aparece **"Editar"**.
4. "Editar" abre um modal cujo **comportamento padrão é o override**: edita o texto só
   para este documento. O modal **deixa explícito** que o bloco original não muda.
5. O modal oferece um botão secundário **"Editar o bloco original na biblioteca"**, que leva
   o usuário para `/equipe/osg/work/biblioteca-modelos` **com o modal daquele bloco já aberto**.
6. Na prévia, blocos que receberam override exibem um **indicativo visual permanente**
   ("Ajustado neste documento").
7. O usuário pode **reverter** o ajuste e voltar ao texto original a qualquer momento.

### Escopo deste plano

- ✅ **Override (substituição)** completo: UI, modal, engine, indicador, reverter.
- ✅ Passo **"Validar versão"** que encerra os cadastros, congela os valores e persiste o
  `documento_gerado` (grava `snapshot_flags`/`snapshot_dados`).
- ✅ **Deep-link** para abrir a Biblioteca de Modelos com o modal de um bloco aberto.
- ❌ **Fora de escopo (plano futuro):** supressão e adição de blocos; herança de overrides
  em cadeia documental (1ª/2ª alteração); snapshot completo de versões para reprodutibilidade;
  **fluxo de "valor de cadastro desatualizado → avisar e pedir confirmação para atualizar no
  documento"** (a semântica de congelamento abaixo é a base disso, mas o aviso em si fica
  para depois). Não implemente esses agora — mas **não crie nada que impeça** adicioná-los
  depois (a tabela `documento_override` já suporta os três tipos; o snapshot já é gravado).

---

## 2. Decisões de produto já tomadas (não reabra)

1. **Persistência via passo explícito "Validar versão".** A tela hoje é efêmera (compõe a
   prévia ao vivo e baixa `.docx`, sem salvar nada). O override exige um `documento_gerado_id`,
   então o usuário precisa primeiro **validar a versão**. Semântica do botão: o usuário declara
   que **terminou e revisou todos os cadastros** (não que o contrato está finalizado) — isso
   **congela os valores atuais** dos cadastros nesta versão do documento. Enquanto a versão não
   for validada, ao tentar editar um bloco o sistema **abre um prompt pedindo para validar antes**
   (prompt ativo, não apenas um aviso passivo — copy em §7).
2. **Override é sempre no nível do bloco inteiro.** Nunca patch parcial de texto. (Princípio da
   arquitetura: variações pequenas independentes viram sub-blocos — fora de escopo aqui.)
3. **O bloco original da biblioteca nunca é alterado pelo override.** O override cria um
   **bloco derivado** (cópia com `bloco_origem_id` apontando ao original) e registra a troca.

---

## 3. Modelo de dados (já existe no banco — não precisa criar migration)

Migration de origem: `supabase/migrations/20260601120000_criar_modelo_composicao_documental.sql`.
Tipos TypeScript gerados em `src/integrations/supabase/types.ts` (já incluem `documento_override`).

### `documento_override` (DDL real)

```sql
CREATE TABLE public.documento_override (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_gerado_id uuid NOT NULL REFERENCES public.documento_gerado(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('substituicao','supressao','adicao')),
  bloco_alvo_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  bloco_substituto_id uuid REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT,
  ordem integer,
  justificativa text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT documento_override_campos_por_tipo CHECK (
    (tipo = 'substituicao' AND bloco_alvo_id IS NOT NULL AND bloco_substituto_id IS NOT NULL)
    OR (tipo = 'supressao'  AND bloco_alvo_id IS NOT NULL AND bloco_substituto_id IS NULL)
    OR (tipo = 'adicao'     AND bloco_alvo_id IS NULL     AND bloco_substituto_id IS NOT NULL)
  )
);
```

- Para **este plano** sempre usaremos `tipo = 'substituicao'` (alvo + substituto preenchidos).
- RLS já habilitado: `team_member+` pode `select/insert/update`; `admin` pode `delete`.
  Use **`update ativo=false` (soft-delete)** para reverter, não `delete`.

### `documento_gerado` (colunas que vamos usar)

```sql
id uuid PK
cliente_id uuid NOT NULL            -- do contexto OSG (useOsgWork → clienteId)
pj_pessoa_id uuid                   -- a empresa escolhida (empresaId na tela)
documento_template_id uuid          -- o modelo escolhido (modeloId)
documento_anterior_id uuid          -- NULL (raiz) neste plano
documento_raiz_id uuid              -- = id do próprio registro (ver §6.1)
snapshot_flags jsonb                -- grave o estado de flags ao salvar
snapshot_dados jsonb                -- grave selecao/valoresLivres ao salvar
snapshot_versoes_blocos jsonb       -- pode ficar null por ora (fora de escopo)
status text DEFAULT 'rascunho'      -- 'rascunho' ao salvar
gerado_por_id, gerado_em, observacao, created_by, updated_by ...
```

### `tmpl_bloco` (colunas de derivação — usadas ao criar o bloco derivado)

```sql
id uuid PK
nome text NOT NULL
categoria text
descricao text
tipo text                  -- 'capitulo'|'clausula'|'paragrafo'|'livre' (espelhe o do original)
bloco_origem_id uuid       -- aponta ao bloco ORIGINAL (FK self)
tipo_derivacao text        -- use 'edicao_pontual'
escopo_documento_raiz_id uuid  -- = documento_raiz_id do documento_gerado (restringe linhagem)
repete_colecao text, ancora text  -- espelhe o do original
ativo boolean DEFAULT true
```

### `tmpl_bloco_versao` (conteúdo versionado do bloco derivado)

```sql
id uuid PK
bloco_id uuid NOT NULL
numero_versao integer NOT NULL      -- 1 na criação; incrementa em re-edições
conteudo text                       -- TEXTO EDITADO (formato interno do EditorConteudoModelo)
atual boolean DEFAULT false         -- índice único garante 1 atual por bloco
changelog text                      -- use a justificativa do usuário
autor_id, created_by ...
```

> **Nota sobre `conteudo`:** o conteúdo é uma string no formato interno do editor TipTap
> (marcas `*negrito*`, `_itálico_`, `~sublinhado~`, placeholders `{{ campo }}`, tabelas markdown).
> Veja `src/components/equipe/osg/EditorConteudoModelo.tsx` (`docParaString`/`stringParaDoc`).
> O override reusa esse mesmo editor, então o formato é idêntico ao da biblioteca.

---

## 4. Arquitetura da solução (visão geral)

```
[Gerar Documento] --salvar--> documento_gerado (rascunho)   ← passo novo (§6.1)
       |
       | clicar bloco → "Editar"  (habilitado só com doc salvo)
       v
[OverrideBlocoDialog]  ← NOVO componente (§6.5)
   • edita texto só deste documento (default)
   • explica escopo (banner)
   • "Editar bloco original" → navega p/ biblioteca-modelos?bloco=<id>  (§6.6)
   • Salvar → useSalvarOverride (§6.4)
        1. cria tmpl_bloco derivado (bloco_origem_id, tipo_derivacao='edicao_pontual',
           escopo_documento_raiz_id)
        2. cria tmpl_bloco_versao (conteudo editado, atual=true)
        3. insere documento_override (substituicao, alvo→substituto)
   • Reverter → useReverterOverride (update ativo=false)
       |
       v
[Composição] aplica overrides ao montar o `template` (§6.3)
   • troca o conteúdo do bloco-alvo pelo conteúdo do substituto
   • marca a posição como "sobrescrita"
       |
       v
[FolhaDocumento] mostra indicador "Ajustado neste documento" (§6.7)
```

**Princípio-chave da aplicação do override (importante):** **não vamos mexer no motor**
`src/lib/templates/composition.ts` / `index.ts`. Em vez disso, aplicamos o override **na
montagem do `template`** dentro de `GerarDocumento.tsx` (onde o array de blocos é construído a
partir de `docBlocos`). Para uma `substituicao`, mantemos a mesma posição/flags/tipo do bloco
original e **apenas trocamos o campo `conteudo`** pelo texto do bloco substituto. Assim,
numeração, repetidores, render de placeholders e flags continuam funcionando sem alteração.
O bloco derivado existe no banco só para rastreabilidade (`bloco_origem_id`).

---

## 5. Mapa do código existente (onde tudo está)

| Papel | Arquivo | Símbolos-chave |
|---|---|---|
| Tela Gerar | `src/pages/equipe/osg/GerarDocumento.tsx` | `GerarDocumento()`, `template` (useMemo ~l.153), `blocosFolha` (useMemo ~l.549), `abrirEdicaoBloco` (~l.182), `blocoEditando` state, `<EditorBlocoDialog>` (~l.1155) |
| Prévia (folha única) | `src/components/equipe/osg/gerar/FolhaDocumento.tsx` | `FolhaDocumento()`, `interface BlocoFolha` (l.15-26), `FolhaDocumentoProps` (l.28-41), popover "Editar bloco" (l.152-173), `onEditarBloco` |
| Editor de bloco da biblioteca | `src/components/equipe/osg/EditorBlocoDialog.tsx` | `EditorBlocoDialog`, props `{open, bloco, onOpenChange, onSaved}` |
| Editor de conteúdo (TipTap) | `src/components/equipe/osg/EditorConteudoModelo.tsx` | `EditorConteudoModelo({value, onChange, ...})` |
| Dialog OSG (animação) | `src/components/equipe/osg/OsgDialog.tsx` | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (importe DAQUI, não de `ui/dialog`) |
| Tela Biblioteca | `src/pages/equipe/osg/BibliotecaModelos.tsx` | `dialog` state (`{open, bloco}`), `abrirEdicao(b)` (~l.392), `<EditorBlocoDialog>` (~l.598) |
| Hooks biblioteca | `src/hooks/useBibliotecaModelos.ts` | `useBlocos()`, `useFlags()`, `useSalvarBloco()`, `interface BlocoComVersao` |
| Hooks modelos | `src/hooks/useModelosDocumento.ts` | `useModelos()`, `useModeloBlocos(id)` |
| Motor de templates | `src/lib/templates/` | `comporBlocos` (composition.ts), `gerarBlocos`/`gerarDocumento` (index.ts), `types.ts` (`Bloco`, `Template`, `TipoBloco`) |
| Rotas | `src/App.tsx` | rotas `/equipe/osg/work/gerar-documento` e `/equipe/osg/work/biblioteca-modelos` |
| Contexto OSG | `src/components/.../OsgWorkContext.tsx` | `useOsgWork()` → `clienteId` |
| Supabase client | `src/integrations/supabase/client.ts` | `supabase` |
| Tipos do banco | `src/integrations/supabase/types.ts` | `documento_override`, `documento_gerado`, `tmpl_bloco`, `tmpl_bloco_versao` |

### Estruturas relevantes (copiar a assinatura, não reinventar)

```ts
// src/components/equipe/osg/gerar/FolhaDocumento.tsx
export interface BlocoFolha {
  id: string;                 // id da POSIÇÃO no modelo (tmpl_documento_bloco.id)
  blocoId: string | null;     // id do bloco na biblioteca (tmpl_bloco.id) — null = órfão
  nome: string;
  tipo?: TipoBloco;
  conteudo: string;
  segmentos?: SegmentoRender[];
}

// src/hooks/useBibliotecaModelos.ts
export interface BlocoComVersao extends BlocoRow {
  versao_atual: BlocoVersaoRow | null;   // { conteudo, atual, numero_versao, ... }
  flag_ids: string[];
}
```

```ts
// GerarDocumento.tsx — como o template é montado hoje (~l.153)
const template = useMemo<Template>(() => {
  const blocos = docBlocos
    .filter((b) => b.bloco?.conteudo)
    .map((b) => ({
      id: b.id,                              // posição (tmpl_documento_bloco.id)
      tipo: b.bloco!.tipo,
      conteudo: b.bloco!.conteudo as string, // ← AQUI vamos aplicar o override
      obrigatorio: b.obrigatorio,
      flagsRequeridas: b.bloco!.flags,
      repeteColecao: b.bloco!.repete_colecao ?? undefined,
      ancora: b.bloco!.ancora ?? undefined,
    }));
  return { id: modeloId ?? 'novo', nome: 'documento', blocos };
}, [docBlocos, modeloId]);
```

> `docBlocos` vem de `useModeloBlocos(modeloId)`; cada item tem `b.id` (posição),
> `b.bloco.id` (id na biblioteca = `tmpl_bloco.id`), `b.bloco.conteudo`, `b.bloco.tipo`,
> `b.bloco.flags`, etc. **`b.bloco.id` é a chave que casamos com `documento_override.bloco_alvo_id`.**

---

## 6. Tarefas de implementação (passo a passo)

### 6.1 Hook `useDocumentoGerado` — salvar/carregar o documento

Novo arquivo: `src/hooks/useDocumentoGerado.ts` (tanstack-query, padrão dos hooks vizinhos).

Expor:

- **`useDocumentoGeradoRascunho({ clienteId, pjPessoaId, modeloId })`** — `useQuery` que busca um
  `documento_gerado` existente com `status='rascunho'` para essa combinação (o mais recente).
  Retorna `null` se não houver. `enabled` só quando os três ids existem.
  ```ts
  supabase.from('documento_gerado')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('documento_template_id', modeloId)
    .eq('status', 'rascunho')
    // pj_pessoa_id: use .eq se houver, senão .is('pj_pessoa_id', null)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()
  ```
- **`useSalvarDocumentoGerado()`** — `useMutation` que faz **find-or-create**:
  1. Se já existe rascunho (mesma busca acima), retorna ele (e atualiza `snapshot_flags`/`snapshot_dados`).
  2. Senão, `insert` em `documento_gerado` com:
     `{ cliente_id, pj_pessoa_id, documento_template_id: modeloId, status: 'rascunho',
        snapshot_flags, snapshot_dados }`, depois `.select().single()`.
  3. **Defina `documento_raiz_id = id` do próprio registro** (raiz da linhagem): faça um `update`
     logo após o insert (`update({ documento_raiz_id: novo.id }).eq('id', novo.id)`).
     `created_by`/`gerado_por_id` = `auth.uid()` se o padrão do projeto preencher isso manualmente
     (verifique como outros hooks fazem; se houver default/trigger, não duplique).
  4. Invalida `['documento-gerado-rascunho', ...]`.
  - `snapshot_flags`: passe o `Set/array` de flags ativas atuais da tela.
  - `snapshot_dados`: passe `{ selecao, registroPorBinding, valoresLivres, empresaId }`.

> Esses snapshots não são usados para reprodutibilidade neste plano (fora de escopo), mas
> gravá-los agora é barato e evita migration futura. Não bloqueie a feature neles.

### 6.2 Hook `useDocumentoOverrides` — listar overrides ativos do documento

No mesmo `src/hooks/useDocumentoGerado.ts` (ou arquivo próprio `useDocumentoOverrides.ts`):

- **`useDocumentoOverrides(documentoGeradoId)`** — `useQuery`, `enabled: !!documentoGeradoId`.
  Busca `documento_override` ativos do documento e, para cada `substituicao`, traz o **conteúdo
  atual do bloco substituto**:
  ```ts
  // 1) overrides do documento
  const { data: ovs } = await supabase
    .from('documento_override')
    .select('id, tipo, bloco_alvo_id, bloco_substituto_id, justificativa')
    .eq('documento_gerado_id', documentoGeradoId)
    .eq('ativo', true);
  // 2) conteúdo atual (versao atual) de cada bloco substituto
  //    select em tmpl_bloco_versao where bloco_id in (...substitutos) and atual = true
  ```
  Retorne uma estrutura fácil de consumir:
  ```ts
  interface OverrideAplicavel {
    overrideId: string;
    blocoAlvoId: string;          // = tmpl_bloco.id do original (casar com b.bloco.id)
    blocoSubstitutoId: string;
    conteudoSubstituto: string;   // texto a injetar
    justificativa: string | null;
  }
  // hook retorna: { porBlocoAlvo: Map<string, OverrideAplicavel>, lista: OverrideAplicavel[] }
  ```
  Query key: `['documento-overrides', documentoGeradoId]`.

### 6.3 Aplicar o override na montagem do `template` (em `GerarDocumento.tsx`)

No `useMemo` do `template` (§5), após carregar `overrides = useDocumentoOverrides(...)`,
troque o conteúdo dos blocos sobrescritos e **registre quais posições foram sobrescritas**:

```ts
const { porBlocoAlvo } = useDocumentoOverrides(documentoGeradoId);

const posicoesSobrescritas = useMemo(() => {
  const set = new Set<string>();
  docBlocos.forEach((b) => {
    if (b.bloco?.id && porBlocoAlvo.has(b.bloco.id)) set.add(b.id); // b.id = posição
  });
  return set;
}, [docBlocos, porBlocoAlvo]);

const template = useMemo<Template>(() => {
  const blocos = docBlocos
    .filter((b) => b.bloco?.conteudo)
    .map((b) => {
      const ov = b.bloco?.id ? porBlocoAlvo.get(b.bloco.id) : undefined;
      return {
        id: b.id,
        tipo: b.bloco!.tipo,
        conteudo: ov ? ov.conteudoSubstituto : (b.bloco!.conteudo as string), // ← troca
        obrigatorio: b.obrigatorio,
        flagsRequeridas: b.bloco!.flags,
        repeteColecao: b.bloco!.repete_colecao ?? undefined,
        ancora: b.bloco!.ancora ?? undefined,
      };
    });
  return { id: modeloId ?? 'novo', nome: 'documento', blocos };
}, [docBlocos, modeloId, porBlocoAlvo]);
```

Depois, no `blocosFolha` (useMemo ~l.549), inclua a flag `sobrescrito`:

```ts
return {
  id: b.id,
  blocoId: bibliotecaIdPorBlocoId.get(posicaoId) ?? null,
  nome: nomePorBlocoId.get(posicaoId) ?? '',
  tipo: b.tipo,
  conteudo: b.conteudo,
  segmentos: b.segmentos,
  sobrescrito: posicoesSobrescritas.has(b.id),   // ← novo
};
```

(Adicione `sobrescrito?: boolean` em `BlocoFolha` — §6.7.)

### 6.4 Hook `useSalvarOverride` / `useReverterOverride`

Novo arquivo: `src/hooks/useOverrideBloco.ts`.

**`useSalvarOverride()`** — `useMutation`. Entrada:
```ts
{
  documentoGeradoId: string;
  documentoRaizId: string;        // = documento_gerado.documento_raiz_id
  blocoAlvo: BlocoComVersao;      // o bloco original (da biblioteca) sendo ajustado
  novoConteudo: string;           // texto editado (formato do EditorConteudoModelo)
  justificativa: string | null;
  overrideExistenteId?: string | null;       // se já há override ativo p/ este alvo
  blocoSubstitutoExistenteId?: string | null; // o derivado já criado, em re-edição
}
```
Lógica:

- **Caso 1 — primeiro override deste bloco neste documento** (`overrideExistenteId` ausente):
  1. `insert` em `tmpl_bloco`:
     ```ts
     {
       nome: `${blocoAlvo.nome} — ajuste do documento`,
       categoria: blocoAlvo.categoria,
       descricao: blocoAlvo.descricao,
       tipo: blocoAlvo.tipo,
       repete_colecao: blocoAlvo.repete_colecao,
       ancora: blocoAlvo.ancora,
       bloco_origem_id: blocoAlvo.id,
       tipo_derivacao: 'edicao_pontual',
       escopo_documento_raiz_id: documentoRaizId,
       ativo: true,
     }
     ```
     → `.select().single()` = `derivado`.
  2. `insert` em `tmpl_bloco_versao`:
     ```ts
     { bloco_id: derivado.id, numero_versao: 1, conteudo: novoConteudo,
       atual: true, changelog: justificativa ?? 'Ajuste pontual no documento' }
     ```
  3. `insert` em `documento_override`:
     ```ts
     { documento_gerado_id, tipo: 'substituicao',
       bloco_alvo_id: blocoAlvo.id, bloco_substituto_id: derivado.id,
       justificativa, ativo: true }
     ```
- **Caso 2 — re-edição** (`overrideExistenteId` + `blocoSubstitutoExistenteId` presentes):
  Crie uma **nova versão** do bloco derivado (rebaixe a anterior `atual=false`, insira
  `numero_versao = max+1`, `atual=true`, `conteudo=novoConteudo`). Reaproveite a mesma lógica
  de versionamento que `useSalvarBloco()` já usa em `useBibliotecaModelos.ts` (leia-a e siga o
  mesmo padrão de rebaixar/criar versão). Não precisa criar bloco nem override novos.

Invalide ao final: `['documento-overrides', documentoGeradoId]` e `['modelo-blocos', modeloId]`.

> **Flags:** não copie `tmpl_bloco_flag` para o derivado. A composição usa a posição/flags do
> bloco **original** (§4) e só troca o `conteudo`. O derivado serve para rastreabilidade.

**`useReverterOverride()`** — `useMutation`. Entrada `{ overrideId, documentoGeradoId }`.
Faz `update documento_override set ativo=false where id=overrideId`. (Soft-delete; mantém
auditoria e permite reativar no futuro.) Invalida `['documento-overrides', documentoGeradoId]`.
Opcional: também desativar o bloco derivado (`tmpl_bloco.ativo=false`) — **não é necessário**,
e deixá-lo ativo não afeta a composição (ninguém o referencia fora do override desativado).

### 6.5 Componente novo: `OverrideBlocoDialog.tsx`

Novo arquivo: `src/components/equipe/osg/OverrideBlocoDialog.tsx`.
Importe `Dialog, DialogContent, DialogHeader, DialogTitle` de `@/components/equipe/osg/OsgDialog`
(animação OSG). Reuse `EditorConteudoModelo` para o corpo do texto.

Props:
```ts
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoGeradoId: string;
  documentoRaizId: string;
  blocoAlvo: BlocoComVersao | null;       // bloco original (biblioteca)
  override?: OverrideAplicavel | null;    // se já existe override ativo p/ este bloco
  modeloId: string | null;                // para invalidação
}
```

Comportamento e layout (de cima para baixo):

1. **Título:** `Ajustar bloco neste documento`.
2. **Banner explicativo (sempre visível, destaque suave moss):** texto exato em §7.
3. **Editor de conteúdo** (`EditorConteudoModelo`), pré-preenchido com:
   - o `conteudo` do **override existente** se houver (`override.conteudoSubstituto`);
   - senão, o conteúdo atual do **bloco original** (`blocoAlvo.versao_atual?.conteudo`).
4. **Campo "Motivo do ajuste" (opcional)** → vira `justificativa`/`changelog`. Placeholder e
   label em §7. Não obrigue, mas incentive.
5. **Rodapé com ações:**
   - **Primária:** `Salvar ajuste deste documento` → chama `useSalvarOverride` (com
     `overrideExistenteId`/`blocoSubstitutoExistenteId` quando re-edição). Fecha ao concluir.
   - **Secundária (link/botão discreto):** `Editar o bloco original na biblioteca` →
     navegação para `/equipe/osg/work/biblioteca-modelos?bloco=${blocoAlvo.id}` via `useNavigate`.
     **Antes de navegar**, mostre uma confirmação curta (pode ser um segundo estado do próprio
     modal ou um `AlertDialog`) com o texto de aviso de §7 (porque editar o original afeta
     **todos** os documentos). Veja §6.6 para o destino.
   - **Reverter (só aparece se `override` existe):** `Voltar ao texto original` → `useReverterOverride`.
     Confirmar antes (texto em §7).
   - **Cancelar:** fecha sem salvar.

Estados de loading/erro: siga o padrão de `EditorBlocoDialog.tsx` (botão com spinner, desabilita
durante mutation). Toasts: use o mesmo utilitário de toast já usado no projeto (procure
`useToast`/`toast` em `EditorBlocoDialog.tsx` e replique).

### 6.6 Deep-link na Biblioteca de Modelos (`BibliotecaModelos.tsx`)

Hoje **não** há suporte a abrir o modal por URL. Adicione:

```ts
import { useSearchParams } from 'react-router-dom';
// ...
const [searchParams, setSearchParams] = useSearchParams();

useEffect(() => {
  const blocoIdParam = searchParams.get('bloco');
  if (!blocoIdParam || blocos.length === 0) return;
  const alvo = blocos.find((b) => b.id === blocoIdParam);
  if (alvo) {
    setDialog({ open: true, bloco: alvo });           // estado existente da tela
    // limpa o param para não reabrir ao fechar o modal:
    const next = new URLSearchParams(searchParams);
    next.delete('bloco');
    setSearchParams(next, { replace: true });
  }
}, [searchParams, blocos]);   // `blocos` vem de useBlocos()
```

> `blocos` carrega de forma assíncrona (`useBlocos()`), por isso o efeito depende de `blocos.length`
> e roda de novo quando a lista chega. Garanta que `setDialog` e o shape `{open, bloco}` batem com
> o que já existe na tela (linha ~308). Não altere o `EditorBlocoDialog` em si.

### 6.7 Indicador visual de bloco sobrescrito (`FolhaDocumento.tsx`)

1. Adicione `sobrescrito?: boolean` em `interface BlocoFolha` (l.15-26).
2. No wrapper de cada bloco (div com `group/bloco`, l.121-149), quando `bloco.sobrescrito`:
   - exiba um **selo permanente** (não só no hover) no canto: pílula pequena com ícone (use um
     ícone lucide já disponível no projeto, ex. `Pencil` ou `FileEdit`) e texto curto
     **"Ajustado neste documento"**.
   - dê um **realce de borda discreto** persistente (ex.: `ring-1 ring-inset ring-osg-moss/30`
     sempre on, ou um traço lateral moss mais visível), para diferenciar de blocos normais sem
     poluir. Mantenha coerência com o destaque de hover que já existe (`osg-moss/[0.06]`).
   - **Não** use cor de erro/alerta (vermelho) — não é um problema, é um ajuste intencional.
3. A etiqueta de nome do bloco (que hoje só aparece no hover) pode ganhar, quando sobrescrito,
   um sufixo discreto ou um ponto indicador. Mantenha legível e calmo.

Garanta `pointer-events-none` no selo para não atrapalhar o clique/hover do bloco (igual à
etiqueta de nome existente).

### 6.8 Integração na tela `GerarDocumento.tsx`

1. **Estado novo:** `documentoGeradoId` (string | null). Inicialize buscando rascunho existente
   via `useDocumentoGeradoRascunho({ clienteId, pjPessoaId: empresaId, modeloId })` quando
   `modoDocumento === true`; se vier um rascunho, seta o id.
2. **Botão "Validar versão":** mostre-o quando o documento está em cena
   (`modoDocumento === true`) e ainda não há `documentoGeradoId`. **Tooltip no hover** (texto em §7).
   Ao clicar → abra o **popup de confirmação** (texto em §7); ao confirmar →
   `useSalvarDocumentoGerado` (gravando `snapshot_flags`/`snapshot_dados` do estado atual —
   é isso que "congela os valores") → guarda o id retornado. Após validado, troque o botão por
   um indicador discreto ("Versão validada · rascunho"). Posicione perto do cabeçalho da folha
   ou no rail de ações (siga o layout do `gerarKit.tsx`/área de ações já existente).
3. **Gating do "Editar" (prompt ativo, não bloqueio passivo):** o popover de bloco em
   `FolhaDocumento` chama `onEditarBloco(bloco)`.
   - Se `documentoGeradoId` está definido → abra o **`OverrideBlocoDialog`** (substitui o uso atual
     de `EditorBlocoDialog` para este fluxo). Resolva o `blocoAlvo` (`BlocoComVersao`) a partir de
     `bloco.blocoId` usando o catálogo já disponível (`catalogoBlocos`/`useBlocos()` — veja
     `abrirEdicaoBloco` l.182). Passe também o `override` correspondente (de `useDocumentoOverrides`)
     se existir, `documentoRaizId` e `modeloId`.
   - Se `documentoGeradoId` é null → **abra o prompt "Valide a versão antes de ajustar blocos"**
     (texto em §7), cujo botão primário **dispara o mesmo fluxo de "Validar versão"** (popup de
     confirmação → `useSalvarDocumentoGerado`). Assim que validar, **reabra o `OverrideBlocoDialog`
     para o bloco que o usuário tinha clicado** (guarde o bloco-alvo pendente em estado). O "Editar"
     do popover continua clicável (não desabilitado) — o prompt é o caminho que ensina e conduz à
     validação.
4. **Mantém** o `EditorBlocoDialog` atual disponível? Para **este fluxo** (editar na prévia) o
   destino passa a ser `OverrideBlocoDialog`. O `EditorBlocoDialog` continua sendo usado na
   Biblioteca e na Montagem — **não o remova**; apenas deixe de usá-lo no clique-da-prévia.
5. **Invalidação/atualização:** ao salvar/reverter override, as queries de
   `['documento-overrides', id]` invalidam, o `template` recompõe e a prévia atualiza sozinha
   (efeito dos `useMemo` dependentes de `porBlocoAlvo`). Confirme que `useDocumentoOverrides`
   está plugado nos `useMemo` certos (§6.3).

---

## 7. Textos da interface (copy exato — escrever assim)

A equipe é pouco técnica; os textos precisam ser claros e tranquilizadores. Use exatamente:

### Botão "Validar versão" (encerra cadastros + congela valores)

**Rótulo do botão:** `Validar versão`

**Tooltip (hover do botão):**
> Confirma que os cadastros estão completos e revisados e congela os valores atuais nesta versão
> do documento. Depois de validar, você pode ajustar blocos só deste documento.
>
> _(versão curta, se o espaço apertar:)_ `Conclui os cadastros e congela os valores nesta versão do documento.`

**Popup de confirmação (ao clicar em "Validar versão"):**
> **Título:** `Validar esta versão do documento?`
> Ao validar, você confirma que **terminou e revisou todos os cadastros**.
> - Os valores atuais ficam **congelados** nesta versão — não mudam mais sozinhos.
> - Se um cadastro for alterado depois, você será **avisado antes** de atualizar o documento.
> - A partir daqui, você pode **ajustar blocos apenas deste documento**.
> Botões: `Validar versão` / `Cancelar`.

**Prompt ao tentar editar um bloco antes de validar:**
> **Título:** `Valide a versão antes de ajustar blocos`
> Para ajustar um bloco só deste documento, primeiro valide a versão — assim os valores ficam
> congelados e o ajuste fica preso a este documento.
> Botões: `Validar versão agora` / `Cancelar`.

**Indicador após validar:** `Versão validada · rascunho`

### Modal de ajuste de bloco (override)

**Banner do `OverrideBlocoDialog` (topo, fundo moss suave):**
> **Você está ajustando este bloco apenas para este documento.**
> O bloco original na Biblioteca de Modelos **não será alterado** e os outros documentos
> continuam usando o texto padrão.

**Label do campo de motivo:** `Motivo do ajuste (opcional)`
**Placeholder:** `Ex.: cliente pediu redação específica para esta cláusula.`

**Botão primário:** `Salvar ajuste deste documento`
**Botão secundário:** `Editar o bloco original na biblioteca`

**Confirmação ao clicar em "Editar o bloco original" (AlertDialog):**
> **Editar o bloco original afeta todos os documentos.**
> Você será levado para a Biblioteca de Modelos. As mudanças feitas lá valem como texto padrão
> para **todos** os documentos que usam este bloco — não apenas este.
> Botões: `Ir para a biblioteca` / `Cancelar`.

**Botão de reverter (só quando já há ajuste):** `Voltar ao texto original`
**Confirmação ao reverter:**
> **Remover o ajuste deste documento?**
> O bloco volta a usar o texto padrão da biblioteca. Você pode ajustar de novo depois.
> Botões: `Voltar ao original` / `Cancelar`.

**Selo na prévia (bloco sobrescrito):** `Ajustado neste documento`

---

## 8. Design / estilo (seguir o padrão OSG)

- **Cor de acento:** verde musgo `--osg-moss` = `#125837` (`hsl(149 66% 22%)`). Tokens em
  `src/index.css`; tema aplicado pela classe `osg-theme` no `<html>` (via `OsgLayout`).
- **Modais:** sempre via `@/components/equipe/osg/OsgDialog` (animação `animate-osg-modal-in`,
  overlay com blur). **Nunca** importe de `@/components/ui/dialog` para modais OSG.
- **Padrão de card aprovado:** borda `border-osg-300/60`, sombra tonal `shadow-osg-300/30`,
  traço lateral moss (`w-[3px] bg-osg-moss`). Reaproveite o visual de `FichaBloco` /
  `EditorBlocoDialog` para manter coerência no `OverrideBlocoDialog`.
- O banner explicativo: fundo `bg-osg-moss/[0.06]`, borda/realce `ring-osg-moss/30`, texto em
  tom escuro do tema; ícone informativo lucide (`Info` ou `Pencil`).
- Confirmações: use o `AlertDialog` já existente no projeto (procure em `src/components/ui/` e
  veja um uso real para replicar estrutura). Mantenha o destrutivo (reverter) com o tom
  `destructive` suave já tematizado (carmim do OSG), **não** vermelho berrante.

---

## 9. Casos de borda e validações

1. **Versão não validada + clique em bloco:** em vez de abrir o editor, abre o prompt
   "Valide a versão antes de ajustar blocos", que conduz à validação e então reabre o editor no
   bloco clicado (§6.8.3).
2. **Bloco órfão** (`blocoId === null` no `BlocoFolha`): não há `tmpl_bloco` para casar — desabilite
   o "Editar" para esses (acontece quando o bloco da posição não tem id de biblioteca).
3. **Re-edição de um bloco já sobrescrito:** o modal abre com o texto do override atual; salvar
   cria **nova versão** do derivado (não novo override). Garanta o caminho do Caso 2 em §6.4.
4. **Reverter:** após `ativo=false`, a prévia volta ao texto original e o selo some.
5. **Conteúdo idêntico ao original:** opcional — se o usuário "ajustou" mas o texto ficou igual ao
   original, você pode (a) salvar mesmo assim, ou (b) avisar que não há mudança. Comportamento
   mínimo aceitável: salvar normalmente. Não bloqueie.
6. **Troca de modelo/empresa na tela:** ao trocar, o `documentoGeradoId` deve ser
   re-resolvido (rascunho diferente ou nenhum). Garanta que o estado zere/recarregue junto com as
   seleções (a tela já zera `selecao`/`empresaId` ao trocar modelo — plugue o reset do
   `documentoGeradoId` no mesmo ponto).
7. **Placeholders no texto editado:** o override é só conteúdo; placeholders `{{ }}` continuam
   sendo resolvidos pelo motor normalmente (o `conteudo` substituto passa pelo mesmo `renderSegmentos`).
   Não trate placeholders de forma especial.
8. **Permissão:** RLS exige `team_member+`. Assuma que o usuário logado tem papel adequado (a tela
   já é protegida). Se o insert falhar por RLS, mostre toast de erro genérico.

---

## 10. Critérios de aceite (teste manual)

1. Entrar em `/equipe/osg/work/gerar-documento`, escolher modelo + empresa → prévia aparece.
2. Antes de validar: clicar num bloco → abre o prompt "Valide a versão antes de ajustar blocos". ✅
3. Clicar **"Validar versão"** → popup de confirmação → confirmar → indicador
   "Versão validada · rascunho"; um registro `documento_gerado` (status rascunho,
   `documento_raiz_id = id`, `snapshot_dados`/`snapshot_flags` preenchidos) existe no banco. ✅
   (Bônus: validar a partir do prompt do passo 2 reabre o editor no bloco clicado.) ✅
4. Clicar num bloco → "Editar" → abre `OverrideBlocoDialog` com banner de escopo e o texto atual. ✅
5. Editar o texto, salvar → modal fecha; a prévia mostra o **novo texto** e o selo
   **"Ajustado neste documento"**; o bloco original na biblioteca permanece **inalterado**. ✅
6. Verificar no banco: 1 `tmpl_bloco` derivado (`bloco_origem_id` = original,
   `tipo_derivacao='edicao_pontual'`, `escopo_documento_raiz_id` = raiz), 1 `tmpl_bloco_versao`
   (`atual=true`, conteúdo editado), 1 `documento_override` (`substituicao`, alvo→substituto,
   `ativo=true`). ✅
7. Reabrir o modal do mesmo bloco → vem com o texto ajustado; editar de novo → cria **versão 2**
   do derivado (sem novo override). ✅
8. Clicar **"Editar o bloco original na biblioteca"** → confirma aviso → navega para
   `/equipe/osg/work/biblioteca-modelos` **com o modal daquele bloco já aberto**; a URL não
   reabre o modal depois de fechá-lo. ✅
9. **"Voltar ao texto original"** → confirma → prévia volta ao texto padrão, selo some,
   `documento_override.ativo=false` no banco. ✅
10. Recarregar a página com a mesma seleção → o rascunho e os overrides ativos são recarregados
    (texto ajustado e selo reaparecem). ✅
11. Rodar `npm run build` / typecheck e o lint do projeto sem erros novos. ✅

---

## 11. Resumo de arquivos a criar/alterar

**Criar:**
- `src/hooks/useDocumentoGerado.ts` (salvar/carregar documento + `useDocumentoOverrides`)
- `src/hooks/useOverrideBloco.ts` (`useSalvarOverride`, `useReverterOverride`)
- `src/components/equipe/osg/OverrideBlocoDialog.tsx`

**Alterar:**
- `src/pages/equipe/osg/GerarDocumento.tsx` (estado `documentoGeradoId`, botão "Validar versão" +
  popup de confirmação + tooltip, prompt de validação no gating, aplicar override no `template`,
  `sobrescrito` no `blocosFolha`, trocar destino do "Editar")
- `src/components/equipe/osg/gerar/FolhaDocumento.tsx` (`sobrescrito` em `BlocoFolha`, selo +
  realce)
- `src/pages/equipe/osg/BibliotecaModelos.tsx` (deep-link `?bloco=<id>`)

**Não alterar (reusar como está):**
- `src/lib/templates/*` (motor) — override é aplicado fora dele.
- `src/components/equipe/osg/EditorBlocoDialog.tsx`, `EditorConteudoModelo.tsx`, `OsgDialog.tsx`.
- Nenhuma migration nova (schema já existe).

---

## 12. Notas finais para quem implementar

- Antes de codar, **leia** `GerarDocumento.tsx` (montagem do `template` e `blocosFolha`),
  `FolhaDocumento.tsx` (popover/hover) e `useBibliotecaModelos.ts` (`useSalvarBloco` —
  o padrão de versionamento de `tmpl_bloco_versao` a ser replicado).
- Siga o padrão de data-fetching já usado (tanstack-query + `supabase` client). Replique o estilo
  de `created_by`/`auth.uid()` que os hooks vizinhos já adotam — não invente um novo padrão.
- Mantenha a UX **calma e óbvia**: o usuário precisa entender, sem jargão, que está mexendo só
  naquele documento. O banner e o selo são o coração dessa clareza — não os omita.
- Commit no branch `feature/template-builder`, mensagem no padrão `feat(osg): ...`.
