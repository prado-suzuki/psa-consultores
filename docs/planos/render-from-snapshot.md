# Plano de implementação — Renderizar a partir do snapshot após validação (OSG)

> **Para o agente implementador:** este documento é autossuficiente. Ele contém todo o
> contexto de código, schema, design e comportamento esperado. Você **não** precisa de
> informação externa. Leia inteiro antes de começar. Todos os caminhos são absolutos a partir
> de `/home/bernardo/Documentos/repos/psa-consultores`. Branch de trabalho:
> `feature/template-builder`. Não há migração de banco neste plano.

---

## 1. Problema

Na tela **Gerar Documento** (`src/pages/equipe/osg/GerarDocumento.tsx`,
rota `/equipe/osg/work/gerar-documento`), o passo **"Validar versão"** promete, na própria
copy da UI, que *"os valores atuais ficam **congelados** nesta versão — não mudam mais sozinhos"*.

Hoje isso **não acontece**. A validação grava um snapshot no banco
(`documento_gerado.snapshot_dados` / `snapshot_flags`), mas **a aplicação só escreve essas
colunas — nunca as lê de volta**. A prévia continua sendo renderizada do estado React vivo,
que por sua vez é re-derivado dos cadastros ao vivo. Consequência reproduzível: o usuário
valida a versão, depois edita o RG de uma pessoa mencionada no documento, e a **prévia mostra
o RG novo** — o congelamento é puramente nominal.

### Confirmação no código (estado atual)

- O objeto gravado é montado em `GerarDocumento.tsx:279`:
  ```ts
  snapshotDados: { selecao, registroPorBinding, valoresLivres, empresaId } as Json,
  ```
- `snapshot_dados` / `snapshot_flags` só aparecem em **escrita** (`src/hooks/useDocumentoGerado.ts:88` e `:103-104`)
  e na definição de tipos (`src/integrations/supabase/types.ts:1663-1664`). Não há nenhum `select`
  que os use para renderizar.
- A prévia (`resultado`, memo em `GerarDocumento.tsx:577-611`) é montada de `selecao`,
  `valoresLivres`, `itensPorLista`, `listas`, `flagsAtivas`, `quadro` — **tudo estado/derivação
  ao vivo**.
- Pior: ao **recarregar** um rascunho já validado, hoje **nada** hidrata `selecao` /
  `valoresLivres` do snapshot. O `useEffect` em `GerarDocumento.tsx:186-189` só restaura
  `documentoGerado` (o id, para ancorar overrides). A prévia volta vazia até o usuário
  re-selecionar os registros.

---

## 2. Objetivo e modelo conceitual

Duas fases no mesmo documento, com uma fronteira clara em "Validar versão":

- **Antes de validar (montagem):** prévia **ao vivo**, segue o cadastro. É a fase de escolher
  registros e preencher. **Mantém-se exatamente como é hoje.**
- **Depois de validar (congelado):** a prévia passa a ser renderizada **a partir do snapshot**,
  não dos cadastros vivos. Editar o RG de uma pessoa em outro lugar do sistema **não** muda mais
  o documento.

Distinção central que define o comportamento (a chave do desenho):

- **Edição passiva / externa** (alguém edita a pessoa/bem no cadastro; o refetch das listas
  chega) → **ignorada** quando congelado. É o que a copy chama de "não muda sozinho".
- **Edição explícita na própria tela Gerar** (trocar o registro de um binding, trocar a empresa,
  editar um campo na prévia, digitar um valor livre) → **intencional**: aplica e **re-congela**
  (re-grava o snapshot).
- **"Revalidar" (ação nova e explícita)** → repuxa **tudo** dos cadastros atuais e re-congela.
  É a saída para quando o cadastro mudou e o usuário **quer** a versão nova.

### Sinal de fase

`documentoGerado != null` ⟺ já foi validado pelo menos uma vez (a linha em `documento_gerado`
só nasce no "Validar versão"). Usaremos um booleano derivado **`congelado`** (ver §4.2).

### Decisão de produto adotada (Abordagem A)

Quando, já congelado, o cadastro subjacente muda, o documento **fica congelado em silêncio**;
o usuário só vê o valor novo se clicar em **"Revalidar"**. Foi a opção recomendada por casar
100% com a copy atual e ter o menor diff. A variante "B" (detectar que a origem mudou e exibir
um aviso "Atualizar do cadastro") fica **fora de escopo** — pode ser somada depois sem retrabalho,
reaproveitando o `revalidar()`.

---

## 3. Por que não basta hidratar `selecao` — o snapshot está incompleto

O contexto de render (`montarContexto` + `gerarBlocos`) é alimentado por **cinco** fontes, e o
snapshot atual só cobre duas:

| Fonte do render | Origem hoje | Está no snapshot atual? |
|---|---|---|
| `selecao` (bindings unitários: pessoa, bem, sociedade…) | estado React | ✅ sim |
| `valoresLivres` (placeholders sem binding) | estado React | ✅ sim |
| `itensPorLista` (repetidores: `socios`, `administradores`, `integralizacoes`) | `useListasDaEmpresa` **ao vivo** (`GerarDocumento.tsx:363-384`) | ❌ **não** |
| `quadro.total` (linha "total" dos sócios, calculada) | derivado ao vivo (`:376`, `:591`) | ❌ **não** |
| `flagsAtivas` (quais blocos entram) | recomputado ao vivo de `empresaRow` (`:330-335`) | ⚠️ os **nomes** estão em `snapshot_flags`, mas o render usa o memo ao vivo |

Portanto, para o congelamento ser **correto e completo** (e não gerar o próximo bug "a lista de
sócios atualizou sozinha"), precisamos:

1. **Expandir** `snapshot_dados` para incluir `itensPorLista` e `total`.
2. Usar `snapshot_flags` (já gravado) como fonte de `flagsAtivas` quando congelado — o que
   congela também **a estrutura** (quais blocos compõem), já que `template`/`bindings`/`listas`
   derivam de `flagsAtivas`.

`documento_gerado.snapshot_dados` e `snapshot_flags` são `Json | null` (jsonb). **Aumentar a
forma do objeto não exige migração.**

---

## 4. Implementação

### 4.0 Forma nova do snapshot (contrato de dados)

Defina e exporte um tipo em `src/hooks/useDocumentoGerado.ts` (perto de
`SalvarDocumentoGeradoInput`, `:46`). Importe `ItemLista` de `@/lib/templates`
(é de onde `GerarDocumento.tsx:56` já importa o tipo).

```ts
import type { ItemLista } from '@/lib/templates';

/** Conteúdo de documento_gerado.snapshot_dados (jsonb). */
export interface SnapshotDados {
  selecao: Record<string, Record<string, string>>;
  registroPorBinding: Record<string, string>;
  valoresLivres: Record<string, string>;
  empresaId: string | null;
  // NOVOS — necessários para congelar repetidores e a linha total:
  itensPorLista: Record<string, ItemLista[]>;
  /** quadro.total no momento da validação; null quando o modelo não usa sócios. */
  total: { quotas: string; vlrTotal: string; percentual: string } | null;
}
```

> **Compatibilidade com snapshots antigos:** linhas já gravadas não têm `itensPorLista`/`total`.
> Trate ambos como possivelmente `undefined` na leitura (ver §4.4) e faça fallback para a fonte
> viva, recomendando ao usuário "Revalidar" para re-congelar completo. Não quebre ao ler um
> snapshot antigo.

`SalvarDocumentoGeradoInput.snapshotDados` continua sendo `Json`; apenas o **call site** passará
o objeto novo (§4.5). Você pode tipar o input como `snapshotDados: SnapshotDados` para segurança —
`SnapshotDados` é serializável e compatível com `Json`.

### 4.1 Hidratar o estado a partir do snapshot ao carregar

**Arquivo:** `src/pages/equipe/osg/GerarDocumento.tsx`, `useEffect` em `:186-189`.

Hoje:
```ts
useEffect(() => {
  // O rascunho governa o estado: trocar de modelo/empresa re-resolve (ou zera).
  setDocumentoGerado(rascunho ?? null);
}, [rascunho]);
```

Passe a também repovoar o estado de cadastro a partir de `rascunho.snapshot_dados`, **na mesma
passada** (para `documentoGerado` e `selecao` ficarem consistentes antes de qualquer efeito ao
vivo rodar):

```ts
useEffect(() => {
  setDocumentoGerado(rascunho ?? null);
  const snap = rascunho?.snapshot_dados as SnapshotDados | null | undefined;
  if (snap) {
    setSelecao(snap.selecao ?? {});
    setRegistroPorBinding(snap.registroPorBinding ?? {});
    setValoresLivres(snap.valoresLivres ?? {});
    setEmpresaId(snap.empresaId ?? null);
  }
}, [rascunho]);
```

`itensPorLista`, `total` e os flags **não** precisam ir para estado — serão lidos diretamente de
`documentoGerado` no memo de render (§4.4) e nos memos de flags/listas.

> Por que isso é seguro: `rascunho` vem do react-query com identidade estável; o efeito só roda
> quando a linha muda (load, troca de modelo/empresa). Hidratar `empresaId` dispara o fetch das
> listas vivas, mas, congelado, elas serão ignoradas no render (§4.4) — desperdício tolerável.

### 4.2 Booleano `congelado` e flags congelados

**Arquivo:** `GerarDocumento.tsx`.

Adicione, logo após `documentoGeradoId`/`documentoRaizId` (`:190-191`):

```ts
// Versão validada => prévia renderiza do snapshot, não dos cadastros vivos.
const congelado = documentoGerado != null;
const snapshotDados = documentoGerado?.snapshot_dados as SnapshotDados | null;
const snapshotFlags = (documentoGerado?.snapshot_flags as string[] | null) ?? null;
```

**Flags — congelar a estrutura.** Hoje `flagsAtivas` (memo em `:330-335`) é sempre ao vivo. Como
`template`/`blocosCompostos`/`bindings`/`listas` derivam dela, congelar os flags congela também
quais blocos compõem o documento. Refatore para manter uma versão **viva** (necessária para o
`revalidar()`) e expor a **efetiva**:

```ts
const flagsAtivasLive = useMemo(() => {
  const declarativas: FlagDeclarativa[] = catalogoFlags
    .filter((f) => f.entidade && f.campo && f.valor)
    .map((f) => ({ nome: f.nome, entidade: f.entidade!, campo: f.campo!, valor: f.valor! }));
  return avaliarFlags(declarativas, { empresa: empresaRow });
}, [catalogoFlags, empresaRow]);

// Quando congelado, a estrutura segue os flags gravados; senão, os vivos.
const flagsAtivas = useMemo(
  () => (congelado && snapshotFlags ? snapshotFlags : flagsAtivasLive),
  [congelado, snapshotFlags, flagsAtivasLive],
);
```

Mantenha o nome `flagsAtivas` — todos os usos atuais (`:339`, `:592`, `:599`, `:278`, `:1037`)
continuam corretos passando a refletir o snapshot quando congelado.

> ⚠️ Cuidado: hoje `temBlocosComFlags` (`:325`) e `empresaRow` (`:326`) são definidos **antes** de
> `flagsAtivas` (`:330`). Coloque `flagsAtivasLive`/`flagsAtivas` após `empresaRow`, e garanta que
> `congelado`/`snapshotFlags` (definidos em `:190`) estejam no escopo — estão, pois são anteriores.

### 4.3 Travar os efeitos de re-sincronização passiva

Quando congelado, os efeitos que reagem ao **refetch dos cadastros** não podem sobrescrever o
estado hidratado.

**(a) Sociedade espelha a empresa** — `useEffect` em `:465-474`. Adicione guarda no topo:
```ts
useEffect(() => {
  if (congelado) return; // congelado: a sociedade vem do snapshot hidratado
  const sociedadeBindings = bindings.filter((b) => b.tipo === 'sociedade');
  ...
}, [empresaRow, bindings, capitalValor, totalQuotas, congelado]);
```

**(b) Remap por origem editada** — `useEffect` em `:560-575`. Adicione guarda no topo:
```ts
useEffect(() => {
  if (congelado) { setOrigemPendenteRemap(null); return; } // congelado não repuxa do cadastro
  if (!origemPendenteRemap) return;
  ...
}, [origemPendenteRemap, registros, carregandoRegistros, bindings, registroPorBinding, congelado]);
```

Não toque em `fecharCadastroOrigem` (`:536-554`): ele continua invalidando queries e abrindo
cadastros normalmente; a única diferença é que, congelado, o remap resultante é descartado.

### 4.4 Renderizar do snapshot (memo `resultado`)

**Arquivo:** `GerarDocumento.tsx`, memo em `:577-611`.

`itensPorLista` (`:377-384`) e `quadro` (`:376`) **continuam computados ao vivo** (são necessários
ao `revalidar()`). No memo de render, escolha a fonte conforme `congelado`:

```ts
const resultado = useMemo(/* ... */ () => {
  if (template.blocos.length === 0) return { blocos: [], texto: '', erro: null };
  try {
    const livres = Object.fromEntries(desconhecidosVisiveis.map((ph) => [ph, valoresLivres[ph] ?? '']));
    for (const nome of secoesDesconhecidas) livres[nome] = livres[nome] ?? '';

    // Fonte dos repetidores e do total: snapshot quando congelado; vivo na montagem.
    // Snapshot antigo sem itensPorLista/total => fallback para o vivo.
    const itensEfetivo = congelado ? (snapshotDados?.itensPorLista ?? itensPorLista) : itensPorLista;
    const totalEfetivo = congelado ? (snapshotDados?.total ?? quadro.total) : quadro.total;

    const ctx = montarContexto(bindings, selecao, livres, itensEfetivo, listas);
    if (usaTotalSocios) ctx.total = { quotas: '', vlrTotal: '', percentual: '', ...totalEfetivo };
    const blocos = gerarBlocos(template, ctx, flagsAtivas);
    const texto = unirBlocos(blocos);

    if (posicoesSobrescritas.size === 0) return { blocos, texto, erro: null };
    const original = gerarBlocos(templateOriginal, ctx, flagsAtivas);
    // ... resto idêntico ao atual (realce de diff) ...
  } catch (e) { /* idêntico */ }
}, [/* deps */]);
```

`selecao` e `valoresLivres` já vêm do estado hidratado (§4.1), então não precisam de ramo
`congelado` aqui. **Atualize o array de deps** acrescentando `congelado`, `snapshotDados`
(o array atual está em `:611`).

> Resultado: congelado, **valores unitários, valores livres, repetidores, linha total e estrutura
> por flags** todos saem do snapshot. A montagem (antes de validar) continua 100% ao vivo.

### 4.5 Gravar o snapshot completo na validação

**Arquivo:** `GerarDocumento.tsx`, `validarVersao` em `:271-283`. Inclua os campos novos:

```ts
const validarVersao = async (): Promise<DocumentoGeradoRow | null> => {
  if (!clienteId || !modeloId) return null;
  const snap: SnapshotDados = {
    selecao, registroPorBinding, valoresLivres, empresaId,
    itensPorLista,                                   // vivo no momento da validação
    total: usaTotalSocios ? quadro.total : null,
  };
  const doc = await salvarDocumento.mutateAsync({
    clienteId,
    pjPessoaId: empresaId,
    modeloId,
    snapshotFlags: flagsAtivas,                      // na 1ª validação, == flagsAtivasLive
    snapshotDados: snap as unknown as Json,
  });
  setDocumentoGerado(doc);
  return doc;
};
```

> Observação: na **primeira** validação `congelado` ainda é `false`, então `flagsAtivas ==
> flagsAtivasLive` e `itensPorLista`/`quadro.total` são os vivos — exatamente o que queremos
> congelar. Não há circularidade.

### 4.6 "Revalidar": repuxar tudo do cadastro atual

Ação explícita que sai do congelamento, repuxa dos cadastros vivos e re-congela. Como, congelado,
`bindings`/`flagsAtivas` refletem o **snapshot**, o `revalidar()` reconstrói `selecao` a partir
dos **registros vivos** para os bindings vigentes e grava com os flags/listas/total **vivos**.

Adicione o handler perto de `validarVersao` (use os mesmos helpers já importados:
`mapearRegistro` `:53`, `mapearSociedade` `:54`, `mapearRegistro`):

```ts
// "Revalidar": descarta o congelamento e refaz o snapshot com os cadastros atuais.
const revalidar = async () => {
  if (!clienteId || !modeloId) return;

  // 1. Reconstrói selecao dos registros vivos (bindings unitários) + sociedade.
  const selecaoFresh: Record<string, Record<string, string>> = { ...selecao };
  for (const b of bindings) {
    if (b.tipo === 'sociedade') {
      selecaoFresh[b.nome] = empresaRow
        ? mapearSociedade(empresaRow, { capitalValor, totalQuotas })
        : {};
      continue;
    }
    const id = registroPorBinding[b.nome];
    const reg = id ? registros[b.tipo].find((r) => r.id === id) : undefined;
    if (reg) selecaoFresh[b.nome] = mapearRegistro(b.tipo, reg.row);
  }

  // 2. Grava o snapshot com flags/listas/total VIVOS.
  const snap: SnapshotDados = {
    selecao: selecaoFresh,
    registroPorBinding,
    valoresLivres,
    empresaId,
    itensPorLista,
    total: usaTotalSocios ? quadro.total : null,
  };
  const doc = await salvarDocumento.mutateAsync({
    clienteId,
    pjPessoaId: empresaId,
    modeloId,
    snapshotFlags: flagsAtivasLive,                  // VIVO — pode ter mudado desde a validação
    snapshotDados: snap as unknown as Json,
  });
  setSelecao(selecaoFresh);
  setDocumentoGerado(doc);
};
```

> **Limitação conhecida (documente em comentário):** se uma mudança de cadastro alterar os
> **flags** a ponto de mudar **quais bindings** o modelo pede (estrutura), `revalidar()` repuxa os
> valores dos bindings que já existiam na estrutura congelada. Para uma re-montagem estrutural
> completa o usuário ainda pode trocar modelo/empresa (que re-resolve do zero). Isso cobre os
> casos comuns (RG, endereço, capital, lista de sócios) sem reescrever o pipeline de detecção.

### 4.7 Edições explícitas na tela enquanto congelado

`escolherRegistro` (`:476-482`), `editarCampo` (`:484-489`), a troca de empresa
(`setEmpresaId`), e a digitação em `valoresLivres` são **ações intencionais do usuário** —
devem aplicar **e re-congelar**. Como cada uma altera estado de forma assíncrona, re-congele a
partir do **próximo** valor, não do estado atual.

Implemente uma re-validação leve disparada por edição explícita. A forma mais robusta e de menor
risco: marque que houve edição explícita e re-grave o snapshot no próximo render estável.

```ts
// Marca que o usuário editou explicitamente enquanto congelado => re-congelar.
const [recongelarPendente, setRecongelarPendente] = useState(false);

// Chame setRecongelarPendente(true) ao fim de escolherRegistro / editarCampo /
// troca de empresa / edição de valoresLivres, SOMENTE quando `congelado`.
useEffect(() => {
  if (!congelado || !recongelarPendente) return;
  // Reusa validarVersao(): grava o snapshot com o estado (já atualizado) atual.
  validarVersao().finally(() => setRecongelarPendente(false));
}, [congelado, recongelarPendente]); // validarVersao lê estado atual via closure
```

Nos handlers, acrescente no fim, quando `congelado`:
```ts
const escolherRegistro = (nome, tipo, registroId) => {
  /* ...existente... */
  if (congelado) setRecongelarPendente(true);
};
const editarCampo = (nome, tipo, campoId, valor) => {
  /* ...existente... */
  if (congelado) setRecongelarPendente(true);
};
```
E onde `valoresLivres`/`empresaId` mudam por ação do usuário (inputs em `:1092`, seletor de
empresa, etc.), idem `if (congelado) setRecongelarPendente(true)`.

> Alternativa mais simples, se preferir reduzir superfície: **bloquear** edição dos seletores
> quando congelado e oferecer só "Revalidar". Decida pela opção acima (editar = re-congelar) por
> ser menos surpreendente para a equipe OSG; mas ambas são aceitáveis. **Não** deixe um meio-termo
> em que editar muda a tela sem persistir.

### 4.8 UI — botão "Revalidar" e copy

**Arquivo:** `GerarDocumento.tsx`, `:1198-1202` (chip "Versão validada · rascunho").

Junto ao chip existente, adicione um botão secundário discreto **"Atualizar do cadastro"**
(rótulo conversacional; o termo técnico é "revalidar") que chama `revalidar()` e mostra
`salvarDocumento.isPending`:

```tsx
{documentoGeradoId ? (
  <div className="space-y-2">
    <div className="flex items-center justify-center gap-1.5 rounded-md border border-osg-moss/30 bg-osg-moss/[0.06] px-3 py-2 text-xs font-semibold text-osg-700">
      <CheckCircle2 className="h-3.5 w-3.5 text-osg-moss" />
      Versão validada · rascunho
    </div>
    <Button
      variant="ghost"
      size="sm"
      className="w-full text-xs text-osg-600 hover:text-osg-800"
      onClick={() => void revalidar()}
      disabled={salvarDocumento.isPending}
    >
      Atualizar do cadastro
    </Button>
  </div>
) : ( /* ...botão "Validar versão" existente... */ )}
```

A copy do diálogo de confirmação (`:1353`) e do prompt de gating (`:1394`) já está correta e
passa a ser **verdadeira** após este plano — não precisa mudar. Opcional: um tooltip no
"Atualizar do cadastro" explicando *"Puxa os dados atuais dos cadastros e congela esta versão de
novo."*

---

## 5. Ordem de implementação sugerida

1. **§4.0** — tipo `SnapshotDados` + import de `ItemLista` em `useDocumentoGerado.ts`.
2. **§4.2** — `congelado`, `snapshotDados`, `snapshotFlags`, refator de `flagsAtivas`/`flagsAtivasLive`.
3. **§4.1** — hidratação no `useEffect` do rascunho.
4. **§4.3** — guardas `if (congelado) return` nos dois efeitos.
5. **§4.4** — render do snapshot no memo `resultado` (+ deps).
6. **§4.5** — gravar snapshot completo em `validarVersao`.
7. **§4.6** — handler `revalidar()`.
8. **§4.7** — re-congelar em edição explícita.
9. **§4.8** — UI do botão "Atualizar do cadastro".

Cada passo de 2–5 já deixa o app compilando; o congelamento básico (valores unitários + livres)
fica observável após o passo 5.

---

## 6. Critérios de aceite (teste manual)

Pré-requisito: usuário equipe OSG, rota `/equipe/osg/work/gerar-documento`, um modelo com binding
de pessoa (RG) **e**, idealmente, um modelo com lista de sócios para cobrir repetidores.

1. **Bug original corrigido.** Monte o documento, clique **Validar versão**. Em outra aba/tela,
   edite o RG da pessoa citada. Volte à prévia → **o RG permanece o antigo** (o do momento da
   validação).
2. **Recarregar mantém o congelado.** Saia da tela e volte (ou recarregue): a prévia reaparece
   **preenchida** com os valores do snapshot, sem precisar re-selecionar registros.
3. **Repetidores congelam.** Em modelo com sócios: valide; depois altere a participação/sócios no
   cadastro. A prévia **não muda**. (Snapshot antigo, gravado antes deste plano, pode ainda seguir
   a lista viva — esperado; "Atualizar do cadastro" re-congela completo.)
4. **Flags/estrutura congelam.** Se uma edição de cadastro mudaria um flag (ex.: regime que
   inclui/exclui um bloco), congelado a composição **não muda**.
5. **"Atualizar do cadastro" funciona.** Após editar o cadastro, clique no botão → a prévia passa
   a refletir os valores novos e **re-congela** (nova edição passiva volta a ser ignorada).
6. **Edição explícita na tela re-congela.** Congelado, troque o registro de um binding pela UI →
   a prévia muda para o novo registro e essa escolha **persiste** (recarregar mantém).
7. **Montagem segue ao vivo.** Antes de validar, todo o comportamento atual permanece (escolher
   registros, editar campos, prévia reativa).
8. **Override de bloco intacto.** Editar/reverter um override de bloco continua funcionando e o
   realce de diff (`templateOriginal`) continua correto — o `ctx` é o mesmo nos dois ramos.

---

## 7. Arquivos tocados

- `src/hooks/useDocumentoGerado.ts` — novo tipo `SnapshotDados` (+ import `ItemLista`); opcional
  apertar o tipo de `SalvarDocumentoGeradoInput.snapshotDados`.
- `src/pages/equipe/osg/GerarDocumento.tsx` — `congelado`/`snapshotDados`/`snapshotFlags`;
  `flagsAtivasLive`/`flagsAtivas`; hidratação; guardas nos dois `useEffect`; memo `resultado`;
  `validarVersao`; `revalidar`; re-congelar em edição explícita; botão na UI.

**Sem migração de banco** — `snapshot_dados`/`snapshot_flags` já são `Json | null` e a expansão é
puramente de forma do objeto. Não há mudança em `src/integrations/supabase/types.ts`.

---

## 8. Riscos e cuidados

- **Loop de efeito.** A hidratação e o re-congelar mexem em `selecao`/`documentoGerado`. Mantenha
  as deps exatamente como descrito; o `recongelarPendente` é o que evita re-snapshot em cascata.
  Não coloque `selecao` nas deps do efeito de re-congelar.
- **Ordem de declaração.** `flagsAtivasLive`/`flagsAtivas` precisam vir **depois** de `empresaRow`
  e **depois** de `congelado`/`snapshotFlags`. `temBlocosComFlags` (`:325`) usa `template`, que usa
  `flagsAtivas` via `blocosCompostos` — confira que não cria uso-antes-de-declarar (hoje `template`
  em `:214` vem antes de `flagsAtivas` em `:330` e isso já funciona porque `template` não depende de
  flags; mantenha essa ordem).
- **Snapshot antigo (sem `itensPorLista`/`total`).** Os fallbacks de §4.4 evitam quebra; o
  comportamento de lista pode ficar vivo até um "Atualizar do cadastro". Aceitável e documentado.
- **`empresaId` hidratado dispara fetch de listas** que, congelado, são ignoradas. Sem efeito
  visível, só rede. Não otimize agora.
