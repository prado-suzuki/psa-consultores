# Plano — Histórico de alterações nos modais de cadastro (OSG)

> **Para o agente implementador:** documento autossuficiente. A **escrita** do
> log já existe e funciona — esta feature é **só leitura/UI**. Leia §3 (o que já
> existe) antes de codar; há um componente quase pronto para reaproveitar.

---

## 1. Objetivo

Nos modais de cadastro da área OSG, mostrar um **histórico de alterações** —
quem alterou, quando e o que mudou — lido da tabela `audit_logs`.

**Decisões já tomadas (com o solicitante):**

1. **Gate ligado:** o histórico só aparece quando o **cliente tem ao menos um
   documento com versão gerada** (`documento_gerado`). Sem documento gerado para
   o cliente, a aba/seção de histórico **não é exibida**.
2. **Quatro modais:** `PessoaModal`, `BemModal`, `MatriculaModal` (como **aba**
   "Histórico") e `SocioModal` (como **seção colapsável**, pois não tem abas).
3. Só ao **editar** um registro existente (registro novo não tem histórico).

---

## 2. Por que o gate é só de exibição

A captura no `audit_logs` **já é incondicional** — todo upsert/delete de cadastro
OSG já loga (ver §3). Não dá (nem convém) tornar a *escrita* condicional
retroativamente. Portanto o gate "só se houver documento gerado" é aplicado
**na exibição**: o modal verifica se o cliente tem `documento_gerado` e só então
renderiza o histórico. Nada muda na captura.

---

## 3. O que já existe (reaproveitar)

| Recurso | Onde | Uso |
|---|---|---|
| **Captura de log** | `useAuditLog.ts` (`logAction`) chamado em `useQualificacaoDasPartes.ts`, `useDiagnosticoPatrimonial.ts`, `useQuadroSocietario.ts` | Já grava `area:'osg'`, `entity_type`, `entity_id`, `entity_name`, `action`, `changed_fields:{campo:{old,new}}`, `performed_by`, `performed_at`. **Não mexer.** |
| **Componente de exibição** | `src/components/equipe/client-form/HistoricoTab.tsx` | Modelo a copiar: query `audit_logs` `.in('entity_id', ids)`, lookup `profiles`, linhas expansíveis com `formatChangedFields` (old→new). |
| **Formatação de campos** | `src/components/equipe/audit/auditFieldFormatter.ts` (`formatChangedFields`, `FIELD_LABELS`, `LookupMaps`) | Traduz nomes de campo p/ rótulo PT. **Vai precisar estender** com campos de cadastro OSG (§7). |
| **Lookup de usuários** | padrão `profiles.id, first_name, last_name` (em `HistoricoTab` e `AuditLogTable`) | Resolve `performed_by → nome`. |
| **Cliente atual** | `useOsgWork().clienteId` (`src/contexts/OsgWorkContext.tsx`) | Cliente selecionado na barra OSG — usado no gate quando a entidade não tem `cliente_id` direto. |

**Tipos `entity_type` que os cadastros OSG gravam** (de `useAuditLog.ts`):
`pessoa`, `parentesco`, `administracao`, `quadro_societario`, `bem`, `matricula`,
`titularidade`, `impedimento`, `cartorio`.

---

## 4. Componente compartilhado — `HistoricoCadastro`

Criar `src/components/equipe/osg/HistoricoCadastro.tsx`: versão OSG, **compacta**
(os modais são estreitos — use uma timeline, não a `Table` larga do `HistoricoTab`).

```tsx
interface HistoricoCadastroProps {
  /** Ids de audit_logs.entity_id a buscar (entidade + sub-entidades que o modal edita). */
  entityIds: string[];
}
```

Comportamento:

1. Query react-query (`enabled: entityIds.length > 0`):
   ```ts
   supabase.from('audit_logs')
     .select('id, entity_type, entity_name, action, changed_fields, performed_by, performed_at, details')
     .eq('area', 'osg')
     .in('entity_id', entityIds)
     .order('performed_at', { ascending: false })
     .limit(100)
   ```
   `queryKey: ['historico-cadastro', entityIds]` (ordene os ids para estabilidade).
2. Lookup `profiles` (reuse o padrão; `queryKey: ['audit-lookup-profiles']` — pode
   compartilhar a key já usada em `AuditLogTable`/feature 1).
3. `lookups: LookupMaps = { profiles, projects:{}, areas:{}, clients:{}, contribuintes:{}, servicos:{}, tasks:{} }`.
4. Render por entrada (mais recente primeiro):
   - cabeçalho: `format(performed_at, "dd/MM/yyyy HH:mm", { locale: ptBR })` ·
     `profiles[performed_by] ?? 'Desconhecido'` · badge de ação
     (`created`→"Criação" emerald, `updated`→"Edição" blue, `deleted`→"Exclusão" red) ·
     rótulo do `entity_type` (mapa OSG abaixo).
   - corpo (quando `updated` com `changed_fields`): `formatChangedFields(changed_fields, lookups)`
     → lista "rótulo: ~~old~~ → **new**" (mesmo visual do `HistoricoTab`, linhas 148–160).
   - estado vazio: "Nenhuma alteração registrada." / loading: spinner OSG.
5. Estilo: tokens OSG (`border-osg-200/70`, `bg-osg-50/40`, `text-osg-700`), denso,
   `max-h-[50vh] overflow-y-auto`.

**Mapa de rótulos de `entity_type` OSG** (definir no componente):

```ts
const ENTITY_LABELS_OSG: Record<string, string> = {
  pessoa: 'Pessoa', parentesco: 'Parentesco', administracao: 'Administração',
  quadro_societario: 'Quadro societário', bem: 'Bem', matricula: 'Matrícula',
  titularidade: 'Titularidade', impedimento: 'Impedimento', cartorio: 'Cartório',
};
```

---

## 5. Gate — "cliente tem documento gerado?"

Adicionar em `src/hooks/useDocumentoGerado.ts` (já é o hub de `documento_gerado`):

```ts
/** True se o cliente possui ao menos um documento_gerado (qualquer status/versão). */
export function useClienteTemDocumentoGerado(clienteId: string | null) {
  return useQuery({
    queryKey: ['cliente-tem-documento-gerado', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<boolean> => {
      const { count, error } = await supabase
        .from('documento_gerado')
        .select('id', { count: 'exact', head: true })
        .eq('cliente_id', clienteId!);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}
```

Cada modal calcula seu `clienteId`:
- **PessoaModal** → `pessoa?.cliente_id`
- **BemModal** → `bem?.cliente_id`
- **MatriculaModal / SocioModal** → não têm `cliente_id` direto ⇒ `useOsgWork().clienteId`
  (o cliente selecionado na barra OSG, contexto em que o modal sempre abre).

`mostrarHistorico = isEdit && (useClienteTemDocumentoGerado(clienteId).data ?? false)`.

---

## 6. Integração por modal

> Em todos: a aba/seção de histórico só é montada quando `mostrarHistorico` (§5).
> Os três primeiros já importam `Tabs/TabsContent/TabsList/TabsTrigger` de
> `@/components/ui/tabs` e usam `osgTabsListCls`/`osgTabTriggerCls`.

### 6.1 PessoaModal (`qualificacao-das-partes/PessoaModal.tsx`)
- `Tabs` em ~L443; `TabsList` em ~L460 (trigger 'dados' em ~L461). `isEdit` em L279.
- Adicionar `{mostrarHistorico && <TabsTrigger value="historico" className={osgTabTriggerCls}>Histórico</TabsTrigger>}`
  e o respectivo `<TabsContent value="historico"><HistoricoCadastro entityIds={...}/></TabsContent>`.
- `entityIds`: `[pessoa.id, parentescoAtual?.id].filter(Boolean)` — o modal edita
  pessoa **e** parentesco (ver `original: parentescoAtual` em ~L317). Se houver
  mais de um parentesco em escopo, inclua todos os ids.

### 6.2 BemModal (`diagnostico-patrimonial/BemModal.tsx`)
- Já tem `Tabs` (import L22). `isEdit` em L174. Localizar o `TabsList` e somar a
  aba "Histórico".
- `entityIds`: `[bem.id]`.

### 6.3 MatriculaModal (`diagnostico-patrimonial/MatriculaModal.tsx`)
- Já tem `Tabs` (import L22). `isEdit` em L247.
- `entityIds`: `[matricula.id, ...titularidadeIds]` — o modal edita matrícula **e**
  titularidades. Colete os ids das linhas de titularidade que o modal mantém em
  estado.

### 6.4 SocioModal (`quadro-societario/SocioModal.tsx`)
- **Sem abas** (modal pequeno, `max-w-lg`, `DialogFooter` em ~L173). `isEdit` em L56.
- Adicionar uma **seção colapsável** (`Collapsible` de `@/components/ui/collapsible`)
  acima do `DialogFooter`, título "Histórico de alterações", só quando
  `mostrarHistorico`, contendo `<HistoricoCadastro entityIds={[socio.id]} />`.
  `socio.id` é o id da linha de `quadro_societario` (entity_type `quadro_societario`).

---

## 7. Estender rótulos de campo (importante p/ leitura)

`FIELD_LABELS` em `auditFieldFormatter.ts` já cobre vários campos (cpf_cnpj,
nome_razao_social, etc.), mas faltam campos de cadastro OSG. Adicionar os que os
modelos/cadastros usam, ex.:

```
estado_civil, regime_bens, profissao, nacionalidade, genero, data_nascimento,
denominacao, tipo_pessoa, tipo_empresa, endereco, numero, complemento, bairro, cep,
quotas, vlr_total, cargo, fracao, integralizador, numero (matrícula), livro, folha,
municipio_imovel, uf_imovel, area_documento, descricao_psa_completa, ...
```

> Confirme os nomes reais nas listas `*_DIFF_FIELDS` (`PESSOA_DIFF_FIELDS` em
> `useQualificacaoDasPartes.ts`, `BEM_DIFF_FIELDS`/`MATRICULA_DIFF_FIELDS` em
> `useDiagnosticoPatrimonial.ts`) — são exatamente os campos que aparecem em
> `changed_fields`. Mapeie cada um para um rótulo PT. Campo sem rótulo cai no
> próprio nome (degradação suave).

---

## 8. Casos de borda

- **Campos que são ids de outra entidade** (ex.: `socio_pessoa_id`): o valor em
  `changed_fields` será um uuid cru. `formatChangedFields` usa `LookupMaps` para
  resolver alguns ids; para os de cadastro OSG não há mapa → mostrará o uuid.
  Aceitável no v1; se incomodar, adicionar um lookup de pessoas. **Documentar.**
- **`deleted`**: a entidade pode não existir mais, mas o log persiste — a timeline
  ainda mostra "Exclusão" com `entity_name` (que é gravado no log). Ok.
- **Gate sem cliente** (`clienteId` nulo, ex.: cartório global): `mostrarHistorico`
  fica `false` → sem aba. Comportamento aceitável.
- **Volume**: `limit(100)` por modal basta (uma entidade não gera tanto log). Se um
  dia precisar, paginar.
- **Privacidade/RLS**: `audit_logs` já libera SELECT p/ `team_member` na área osg
  (migration `20260213173645_*`). Sem mudança de schema nesta feature.

---

## 9. Checklist de arquivos

**Novos**
- [ ] `src/components/equipe/osg/HistoricoCadastro.tsx`

**Editados**
- [ ] `src/hooks/useDocumentoGerado.ts` — `useClienteTemDocumentoGerado`
- [ ] `src/components/equipe/audit/auditFieldFormatter.ts` — ampliar `FIELD_LABELS` (§7)
- [ ] `src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx` — aba Histórico
- [ ] `src/components/equipe/osg/diagnostico-patrimonial/BemModal.tsx` — aba Histórico
- [ ] `src/components/equipe/osg/diagnostico-patrimonial/MatriculaModal.tsx` — aba Histórico
- [ ] `src/components/equipe/osg/quadro-societario/SocioModal.tsx` — seção colapsável

**Sem migration** — nenhuma mudança de schema (a captura e a RLS já existem).

---

## 10. Como testar

1. Cliente **sem** documento gerado: abrir qualquer modal em edição → **sem** aba/seção
   de histórico.
2. Validar um documento para o cliente (tela Gerar) → reabrir o modal → aba/seção
   de histórico **aparece**.
3. Editar um campo (ex.: estado civil em PessoaModal), salvar, reabrir → a entrada
   aparece no topo com seu nome, data e "Estado civil: ~~Solteiro~~ → Casado".
4. PessoaModal: editar o **parentesco** → também aparece (entity_type Parentesco).
5. MatriculaModal: editar **titularidade** → aparece.
6. SocioModal: editar quotas de um sócio → seção mostra "Quotas: …".
7. `npm run lint` + typecheck + build; verificar no app (skills `run`/`verify`).

---

## 11. Fora de escopo

- Página de auditoria global da OSG já existe (`/equipe/osg/auditoria`,
  `AuditLogTable`) — esta feature é só o recorte **dentro do modal**.
- Sem filtros/busca dentro do histórico do modal (a timeline é curta). Se pedirem,
  reaproveitar os filtros de `AuditLogTable`.
- Sem incluir, no histórico de uma pessoa, mudanças feitas em **outras** entidades
  que apenas a referenciam (ex.: um `quadro_societario` de outra empresa que cita
  esta pessoa). O escopo é a entidade do modal + as sub-entidades que ele edita.
- Relação com a **feature 1** (notificações): compartilham `audit_logs`, o lookup
  de `profiles` e o `FIELD_LABELS` — mas são telas independentes.
```
