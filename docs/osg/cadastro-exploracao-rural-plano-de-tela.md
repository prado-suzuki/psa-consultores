# Cadastro de exploração rural — plano da tela (AGR-01)

Continuação de [`cadastro-exploracao-rural-modelagem.md`](./cadastro-exploracao-rural-modelagem.md),
que decidiu **que forma o dado tem**. Este decide **como a tela é feita e o que ela reusa**.

Levantamento feito em 01/09/2026, contra o código da `develop` (commit `efc64545`) e os dois
bancos ao vivo. Número sem endereço de arquivo neste documento é erro.

---

## 1. Onde o design mora — e onde não mora

**Não existe tabela de design, tema ou cor.** Conferido nos dois bancos, com o mesmo regex
(`cor|color|tema|theme|design|estilo|style|brand|paleta|palette|token|aparencia|visual|layout`):

| Banco | Como | Resultado |
|---|---|---|
| sandbox `vgzomuwnsdgrxbkyoavq` | Supabase MCP, SELECT | 7 tabelas, **todas falso-positivo** |
| produção (Lovable Cloud) | Lovable MCP `query_database`, projeto `4cb1f76a-…` | as mesmas 7 |

Os 7 são `correcoes_icms`, `efd_correcoes`, `etapa_sistemas`, `melhoria_sistemas`,
`sistema_clusters`, `sistema_responsaveis`, `sistemas_processo` — casam por conterem
"cor"/"sistema" no nome, nada a ver com UI.

Também procurei por **coluna** de cor. Existem três, e nenhuma é design system:
`estrutura_areas.color` + `color_index` e `catalog_clients.color` são a cor de identificação de
**área da estrutura organizacional** (organograma, chips de equipe) — dado de negócio.

**Conclusão: o design system é código, e tem dono declarado.** Os endereços:

| Camada | Arquivo |
|---|---|
| Temas (variáveis CSS por área) | `src/index.css` — `.base-theme`, `.tax-theme`, `.osg-theme` |
| Resolvedor de tema por rota | `src/lib/areaTheme.ts` (22 regras, 34 testes) |
| Tokens Tailwind + keyframes | `tailwind.config.ts` |
| Kit de formulário OSG | `src/components/equipe/osg/formKit.tsx` |
| Grade responsiva por contêiner | `src/lib/osgFormGrid.ts` |
| Modal com animação própria | `src/components/equipe/osg/OsgDialog.tsx` |
| Guardas de cor | `eslint-rules/token-nao-sobrescrito.js`, `eslint-rules/cor-fora-da-escala.js` |
| Decisões, com o número que as sustenta | `docs/geral/decisoes-tema-e-cor.md`, `paleta-por-area.md` |

---

## 2. O sistema de design da OSG Work — inventário

### 2.1 Cor

A OSG é um **tema congelado**: a `.osg-theme` declara as 43 variáveis do contrato, não um
delta. Não há tema delta no sistema hoje — os três que existiram (`.rotina-theme`,
`.board-theme`, `.sistema-theme`) saíram entre 29 e 31/08/2026, todos pelo mesmo motivo: a
âncora deles era a do piso.

A escala é `--osg-50/100/200/300/500/600/700` mais quatro tokens nomeados:

| Token | Papel na tela |
|---|---|
| `osg-moss` | verde-musgo — acento, foco, trilho de seção, botão primário |
| `osg-highlighter` | âmbar de marca-texto — realce de variável, selo de alerta |
| `osg-canvas` | superfície de fundo |
| `osg-red` | erro/exclusão |

A `.osg-theme` aponta `--primary`, `--accent`, `--secondary` e `--ring` **todos** para
`--osg-moss`, e `--border`/`--input` para `32 20% 88%`. Consequência prática: **componente
`ui/` sem classe de cor já sai verde-musgo na OSG.** Escrever `bg-osg-moss` num botão
primário é redundante — e o `MatriculaModal` faz isso no botão de gravar
(`MatriculaModal.tsx:139`), o que é dívida, não padrão a copiar.

### 2.2 Movimento

Há 7 animações de interface no `tailwind.config.ts` (fora as 6 trilhas do Sísifo, que são do
loader):

| Animação | Curva e duração | Onde |
|---|---|---|
| `osg-modal-in` | `0.42s cubic-bezier(0.34, 1.2, 0.42, 1)` | entrada do modal — rise + escala, com leve overshoot |
| `osg-modal-out` | `0.2s cubic-bezier(0.4, 0, 1, 1)` | saída, mais rápida que a entrada |
| `osg-overlay-in/out` | `0.3s ease-out` / `0.2s ease-in` | fundo escuro + `backdrop-blur-[2px]` |
| `osg-rise` | `0.45s cubic-bezier(0.22, 1, 0.36, 1) both` | entrada de card/KPI |
| `osg-card-in` | `0.35s …  backwards` | entrada de card em cascata |
| `osg-bar-grow` | `1.4s cubic-bezier(0.16, 1, 0.3, 1)` | barra de progresso |

**Duas regras que a casa segue sem exceção:**

1. **`motion-reduce:animate-none` acompanha toda animação.** Está no `OsgDialog` (overlay e
   content) e no `KpiCard`. Não é opcional.
2. **Cascata por `animationDelay` inline**, não por classe: `KpiCard` recebe `delay` em ms e
   aplica `style={{ animationDelay }}` — KPIs primeiro, tabela depois.

Transição de estado usa `transition-colors` e `transition-opacity`, nunca `transition-all`.
O padrão de ação de linha é **revelar no hover**: `opacity-0 transition-opacity
group-hover:opacity-100 focus-within:opacity-100` — e o `focus-within` é o que mantém a linha
operável por teclado (`TitularidadesPanel.tsx:361`).

### 2.3 Tooltip

Um padrão só, em 4 arquivos da OSG (`DocumentoCentroRail`, `OnboardingWorkspace`,
`OrganizarDocumentos`, `ModalAvisarCliente`):

```tsx
<TooltipContent className="max-w-xs text-xs leading-relaxed">
```

O `TooltipProvider` é global no `App.tsx` — componente novo **não monta o seu**. O gatilho é
um ícone ao lado do rótulo, nunca texto sob o campo.

### 2.4 Grade e layout

`src/lib/osgFormGrid.ts` resolve um defeito específico e vale entender antes de escrever
qualquer formulário: **a grade mede o contêiner, não a janela.**

- `formScopeCls` (`@container`) marca o elemento que rola o formulário;
- `formGridCls(2|3|4)` e `formSpanCls(2|3|4)` usam `@2xl:` — limite de 42rem = **672px**;
- em contêiner estreito cai para uma coluna **e os `col-span` somem junto**.

O `md:` da versão anterior media a janela, então uma coluna estreita de uma tela larga
insistia em três colunas de ~110px e os campos de largura dupla pediam colunas fantasma. O
`@container` é um plugin local no `tailwind.config.ts` (Tailwind 3 não tem container queries).

### 2.5 Seção como "passo"

`FieldSection` (`formKit.tsx:45`) é a moldura de toda seção de formulário OSG: trilho
vertical `osg-moss/70` de 1px à esquerda, número de ordem em `font-mono` (`01`, `02`…),
título em `text-[11px] font-bold uppercase tracking-[0.14em]`, e três slots — `hint` (à
direita, cinza), `badge` (depois do número) e `actions`.

Os modais numeram com um contador local, não com literal:

```tsx
let number = 0;
const next = () => String(++number).padStart(2, '0');
```

Isso importa porque seção condicional (só-parceria, só-composse) **não pode deixar buraco na
numeração** — e é exatamente o caso aqui.

### 2.6 Componentes e utilitários já prontos

| Componente | Arquivo | O que resolve |
|---|---|---|
| `OsgDialog` | `osg/OsgDialog.tsx` | modal com a animação da casa + clique-fora que ignora blur do SO |
| `useDirtyClose` + `UnsavedChangesAlert` | `osg/useDirtyClose.ts` | "descartar alterações?" ao fechar sujo |
| `validarFormulario` | `lib/osg/validacaoFormulario.ts` | **uma trilha só de falha**: toast + abre a aba + foca o campo por `data-campo` |
| `HistoricoFlutuante` | `osg/HistoricoFlutuante.tsx` | histórico de auditoria flutuante, quando o cliente já tem documento gerado |
| `DocumentosTab` | `osg/documentos/DocumentosTab.tsx` | aba de arquivos vinculados, com categoria padrão |
| `CurrencyInput` | `osg/CurrencyInput.tsx` | dinheiro |
| `DateFieldWithInput` | `client-form/DateFieldWithInput` | data |
| `UF_STATES` | `client-form/constants` | lista de UF |
| `CartorioSelect` | `diagnostico-patrimonial/CartorioSelect.tsx` | seleção de cartório |
| `rowActivateProps` | `hooks/rowActivateProps.ts` | linha clicável que **não** abre em arraste/hold |
| `clampAreaInput` / `converterArea` | `diagnostico-patrimonial/areaUtils.ts` | área com 4 casas + conversão ha↔m² com aviso de arredondamento |
| `clampFracaoInput` | `diagnostico-patrimonial/fracaoUtils.ts` | fração com 4 casas |
| `computeFieldDiff` | usado em `useDiagnosticoPatrimonial.ts` | `changed_fields` da auditoria |
| `KpiCard` | `quadro-societario/quadroKit.tsx` | cartão de indicador com cascata |
| `RequiredMark` | `ui/required-mark` | asterisco de obrigatório |

Bibliotecas: React 18 + Vite + TS, Tailwind 3, **shadcn-ui sobre Radix**, React Query,
`sonner` para toast, `lucide-react` para ícone, react-router-dom v6.

### 2.7 O que o repo policia (e vai reprovar o código, não só avisar)

Duas regras de ESLint escritas na casa:

- **`ui/token-nao-sobrescrito`** — `error`. Componente de `src/components/ui/` já chega com o
  token certo; sobrescrever com cor crua é erro. `src/components/ui/**` está fora (é o dono do
  token). Sobrescrita deliberada existe, mas exige `eslint-disable-next-line` **com
  justificativa escrita** — o `KpiCard` é o exemplo (`quadroKit.tsx:25`).
- **`ui/cor-fora-da-escala`** — `warn`, de propósito: erro de build seria apagão, não
  migração. Proíbe `--teal-500/600/700` em componente: são primitivas institucionais que
  nenhum tema sobrescreve, então a cor não acompanha a área.

Medido em 01/09/2026 (`bunx eslint . --cache`, 652 mensagens no total): **`ui/token-nao-sobrescrito`
está em zero** — como é `error`, tem de estar. A proibição de cor institucional chega por
`no-restricted-syntax`, com **113 avisos** hoje; o `decisoes-tema-e-cor.md` registrou 164 em
20/08, mas não separei quantos dos 113 são de cor, então não trate isso como a mesma medida.
O resto é `no-explicit-any` (501) e `exhaustive-deps` (28) — dívida antiga, fora deste escopo.

**Consequência para este trabalho: escrever `bg-osg-moss` num `Button` primário é
exatamente o que a regra existe para pegar.** Use a variante `default`.

---

## 3. O molde canônico de um cadastro OSG

O `MatriculaModal` é o mais completo dos três irmãos (matrícula, bem, pessoa) e a anatomia é
sempre a mesma. Sete camadas, e o cadastro rural copia todas:

```
1. Página        OsgLayout(title, subtitle) → guarda de cliente → Card de filtros → Table
2. Modal         OsgDialog + Tabs(osgTabsListCls) + footer fixo + formScopeCls no corpo
3. Aba           N × FieldSection numeradas, com formGridCls/formSpanCls
4. Rascunho      DraftX (tudo string) + emptyXDraft() + xToDraft() + xDraftToValues()
5. Validação     validarFormulario([regras]) — mensagem + aba + data-campo
6. Hook          useUpsertX: mutation → invalidate → computeFieldDiff → logAction → toast
7. Registro      App.tsx (rota) + protectedPages.ts (categoria 'osg') + OsgLayout (menu)
```

Detalhes do molde que não são óbvios e que eu vou seguir:

- **O rascunho é todo `string`.** `DraftMatricula` guarda área e valor como texto e converte
  na saída (`matriculaDraftToValues`). Evita `NaN` no meio da digitação.
- **`initialDraftRef` + `JSON.stringify` decide o "sujo"**, e é lido **só na abertura** — para
  que uma identidade nova do objeto de quem abriu não reinicie o que já foi digitado.
- **Aba com pendência ganha um ping**: `animate-ping` num ponto `osg-moss` no `TabsTrigger`
  enquanto o dado obrigatório daquela aba não existe (`MatriculaModal.tsx:126`).
- **Aba que só existe na edição fica `disabled`**, não escondida — o consultor vê que existe.
- **Insert atômico é RPC.** `criar_matricula_com_titular` grava matrícula + titularidade numa
  transação, com rollback se o titular falhar. É o precedente exato da RPC que a AGR-01 pede.
- **Erro do banco vira frase.** `matriculaErrorMessage(error)` traduz; o toast nunca mostra
  código do Postgres cru.

---

## 4. O que se reaproveita — nada de componente novo onde já existe

| O que a tela precisa | Já existe? | Origem |
|---|---|---|
| Modal com animação da casa | ✅ | `OsgDialog` |
| Abas | ✅ | `osgTabsListCls` / `osgTabTriggerCls` |
| Seção numerada | ✅ | `FieldSection` |
| Grade responsiva | ✅ | `formGridCls` / `formSpanCls` / `formScopeCls` |
| Estilo de campo, textarea, switch, rótulo | ✅ | `fieldCls`, `textareaCls`, `switchBoxCls`, `labelCls` |
| Aviso de saída sem salvar | ✅ | `useDirtyClose` + `UnsavedChangesAlert` |
| Validação com foco no campo | ✅ | `validarFormulario` |
| Auditoria com diff | ✅ | `useAuditLog` + `computeFieldDiff` |
| Data, dinheiro, UF, cartório | ✅ | `DateFieldWithInput`, `CurrencyInput`, `UF_STATES`, `CartorioSelect` |
| Área com 4 casas e conversão | ✅ | `areaUtils.ts` |
| Fração com 4 casas | ✅ | `fracaoUtils.ts` |
| Lista de partes com fração e soma | ⚠️ **molde** | `TitularidadesPanel.tsx` — mesma forma (pessoa + fração + soma + ações no hover), outra tabela |
| Linha clicável | ✅ | `rowActivateProps` |
| Aba de arquivos | ✅ | `DocumentosTab` |
| Histórico de auditoria | ✅ | `HistoricoFlutuante` |
| Seleção de pessoa | ⚠️ **molde** | o mockup tem `PessoaSelect`; a develop resolve com `usePessoasByCliente` + `Select` |
| Cartão de indicador | ✅ | `KpiCard` |

**Zero componente de UI novo.** O que se escreve é: um modal, quatro abas, um painel de
partes, um painel de imóveis, um arquivo de rascunho, um hook e uma página — todos sobre as
primitivas acima.

## 5. O que se cria

| Arquivo | Papel | Molde |
|---|---|---|
| `hooks/useExploracaoRural.ts` (**editar**) | hoje é só leitura com join singular. Passa a ler as filhas e ganha `useUpsertExploracaoRural`, `useDeleteExploracaoRural`, `usePartesByExploracao`, `useImoveisByExploracao` | `useDiagnosticoPatrimonial.ts` |
| `lib/exploracaoRuralModalModels.ts` | `DraftExploracaoRural` + `empty…` + `…ToDraft` + `…DraftToValues` | `lib/diagnosticoPatrimonialModalModels.ts` |
| `…/diagnostico-patrimonial/ExploracaoRuralModal.tsx` | modal com 4 abas | `MatriculaModal.tsx` |
| `…/exploracao-rural/ExploracaoRuralDadosTab.tsx` | instrumento | `matricula/MatriculaDadosTab.tsx` |
| `…/exploracao-rural/PartesPanel.tsx` | exploradores / compossuidores / administradores nomeados | `TitularidadesPanel.tsx` |
| `…/exploracao-rural/ImoveisPanel.tsx` | itens do Anexo + origem por imóvel | `bem/MatriculasSection.tsx` |
| `…/exploracao-rural/OrigemExternaDialog.tsx` | cadastro da origem que não é cliente | `VincularMatriculaDialog.tsx` |
| `pages/equipe/osg/ExploracaoRural.tsx` | listagem por cliente | `DiagnosticoPatrimonial.tsx` |
| RPC `salvar_exploracao_rural` (Migration A2) | grava cabeçalho + partes + imóveis + origens numa transação, valida soma de frações e área ≤ matrícula | `criar_matricula_com_titular` |

**Onde a pasta mora:** `src/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/`.
A pasta `oficina-de-contratos/` do mockup **não existe na develop** e não deve ser criada: a
taxonomia real é `biblioteca/` → `montagem/` → `gerar/` para a camada de documento, e
`diagnostico-patrimonial/` / `qualificacao-das-partes/` / `quadro-societario/` para cadastro.
"Oficina de Contratos" é o nome da área para o usuário, não uma pasta.

**Registro obrigatório** (regra inegociável do AGENTS.md): rota `/equipe/osg/work/exploracao-rural`
em `App.tsx` dentro de `PageAccessGate`, entrada em `src/config/protectedPages.ts` com
`category: 'osg'`, e item de menu no `OsgLayout.tsx` — ao lado de `quadro-societario`
(`OsgLayout.tsx:505`), porque é o irmão conceitual: cadastro relacional, não atômico.

---

## 6. Os campos, aba por aba

A tela é **camada 2 (cadastro do instrumento)**. Ela não tem prévia, não tem "preencher à
mão" e não tem foro/testemunha/nº de vias — isso é camada 3 e já existe em
`GerarDocumento.tsx` (achados #4/#5 do relatório 13). **O modal tem 4 abas, não a estrutura
de 3 seções do mockup.**

### Aba 1 — Dados

Seções numeradas por contador; as marcadas *(P)* só aparecem em parceria e *(C)* só em
composse, e é por isso que a numeração precisa ser dinâmica.

| # | Seção | Campos | Controle |
|---|---|---|---|
| 01 | Instrumento | `tipo_exploracao` **obrig.**, `referencia`, `data_assinatura`, `data_encerramento` *(P)* | Select do enum `osg_tipo_exploracao`, `DateFieldWithInput` |
| 02 | Vigência *(P)* | `data_inicio_vigencia`, `vigencia_prorrogavel` | data + `switchBoxCls` |
| 03 | Partilha *(P)* | `percentual_outorgante`, `percentual_explorador` | `clampFracaoInput`, `font-mono` |
| 04 | Atividade | `culturas`, `inclui_pecuaria` *(P)*, `permite_penhor` | Input largo + 2 switches |
| 05 | Indivisão *(C)* | `prazo_indivisao_quantidade` + `_unidade`, `indivisao_prorrogavel`, `indivisao_aviso_quantidade` + `_unidade` | número + Select `dias\|meses\|anos` |
| 06 | Administração e liquidação *(C)* | `regra_administracao`, `liquidacao_periodicidade`, `liquidacao_numero_parcelas` | Selects + número |
| 07 | Lastro | `estudo_fiscal_documento_id`, `documento_comprobatorio_id` | Select de `documento_arquivo` do cliente |

Ordem pensada para **fechar a grade de 4 colunas sem buraco no meio** — foi ajuste pedido no
mockup em 20/08 e a lição vale aqui: campo isolado em `formGridCls(2)` deixa meia linha vazia.

Fora da aba, no cabeçalho do modal: `sacas_por_hectare` **não entra** (não alimenta contrato
nenhum, quem consome é o `FiscalReport`) e `declarado_irpf` **não entra** (decidido em
01/09/2026 — momento e forma errados, pendência do time Fiscal).

### Aba 2 — Partes

Uma seção fixa e duas condicionais, todas sobre `exploracao_rural_parte` exceto o outorgante:

| Papel | Origem | Cardinalidade | Fração |
|---|---|---|---|
| Outorgante *(P)* | `exploracao_rural.outorgante_pessoa_id` (coluna) | **1**, obrigatório | — |
| Explorador *(P)* | `parte.papel='explorador'` | N, ≥1 | não tem |
| Compossuidor *(C)* | `parte.papel='compossuidor'` | N, ≥2 | **sim**, soma exibida |
| Administrador nomeado *(C)* | `parte.papel='administrador_nomeado'` | N, ≥1 quando `regra_administracao='nomeados'` | não tem |

Duas coisas que a tela precisa mostrar e que vêm do levantamento:

1. **A soma das frações**, no rodapé da lista, como o `TitularidadesPanel` já faz
   (`:204` — `{total}% {total > 100 && '• excede 100%'}`). Aqui é mais forte que lá: na
   composse a soma **deve** fechar 100%, e a validação final é da RPC.
2. **Aviso derivado de administração**: com 1 administrador nomeado o contrato sai
   "isoladamente"; com 2+, "em conjunto". Isso **não é campo** — é derivado da contagem, e a
   prova é o Termo Aditivo do `[ROS-COM]`. A tela mostra a frase resultante como `hint` da
   seção, para o consultor conferir sem abrir o gerador.

A mesma pessoa pode aparecer como compossuidor **e** administrador nomeado — duas linhas, e a
`UNIQUE (exploracao_rural_id, pessoa_id, papel)` permite exatamente isso.

### Aba 3 — Imóveis e origens

Lista de `exploracao_rural_imovel`, uma linha por matrícula:

| Campo | Controle | Cuidado |
|---|---|---|
| `matricula_id` **obrig.** | Select das matrículas do cliente | NOT NULL — decisão registrada na modelagem |
| `area_explorada` + `area_unidade` | `clampAreaInput` + Select de unidade | **não** é `matricula.area_explorada`; validar ≤ área da matrícula na aplicação |
| `ordem` | arraste ou setas | define a ordem no Anexo |
| `origem_tipo` | Select — grava `parceria\|arrendamento\|propria\|heranca\|outro`, exibe rótulo do contrato | |
| `origem_exploracao_rural_id` | Select de outro instrumento do cliente | exclusivo com a externa |
| `origem_externa_id` | abre `OrigemExternaDialog` | reusa a mesma origem em vários imóveis — é o ponto da tabela separada |
| `origem_contraparte_pessoa_id` | Select de pessoa | achado F: a contraparte pode ser **um** compossuidor |

O ganho de UX que justifica a tabela separada: no `[BV-COM]`, 15 imóveis compartilham 6
origens. A tela oferece **"reusar origem já cadastrada"** antes de "cadastrar nova" — digitar
NIRE e capital seis vezes é o defeito que a modelagem eliminou no schema, e a tela tem que
refletir isso ou o ganho se perde.

### Aba 4 — Documentos

`DocumentosTab` com `vinculo` do instrumento e `categoriaPadrao="agrarios"`. Só na edição,
`disabled` no cadastro novo — igual matrícula e bem.

---

## 7. O que NÃO vem do mockup

Sete itens, e cada um tem motivo:

| Item do mockup | Por que fica fora |
|---|---|
| Pasta `oficina-de-contratos/` | não existe na develop; criaria uma oitava pasta fora da taxonomia |
| `TEMPLATE_PARCERIA` / `TEMPLATE_COMPOSSE` (blocos em `.ts`) | bloco é linha em `tmpl_bloco`, versionado e editável na Biblioteca. Texto de cláusula em código = a Luana não ajusta redação sem deploy |
| Selo `NOVO` / `POSSUI` + `contratoRuralCampoFonte.ts` | andaime de apresentação, feito para o tech lead ver o que faltava de cadastro. No produto, campo tem origem ou não tem |
| Tooltip de trecho do modelo (`TrechoDoModelo`) | idem — depende dos blocos em código |
| Aba de prévia com "Vem do cadastro" / "Preencher à mão" | camada 3, já existe em `GerarDocumento.tsx` |
| Fixtures (`pessoasFixture`, `matriculasFixture`) | a tela lê o banco pelos hooks reais |
| Fecho artesanal (`par-fecho` / `com-fecho`) | a develop resolveu genericamente em `src/lib/templates/signatarios.ts` (~420 linhas). Portar seria uma segunda implementação do mesmo mecanismo |

**O que atravessa não é código, é conhecimento**: o inventário de campos com lastro
(`campos-exploracao-rural.md`), o texto literal das cláusulas (vira `tmpl_bloco` na Migration
B) e as regras descobertas (isolado vs. conjunto, área por item ≠ área da matrícula, origem
externa compartilhada, concordância de gênero no fecho). Tudo já está nos relatórios 05–14, na
branch `ale-3-levantamento-contratos-rurais`.

---

## 8. Ordem de execução

| Fase | Entrega | Validação |
|---|---|---|
| **0** | Migration A1 aplicada no sandbox + `types.ts` regenerado | ✅ feito em 01/09/2026 |
| **1** | `exploracaoRuralModalModels.ts` + funções puras (soma de fração, área ≤ matrícula, frase de administração) | teste unitário das puras — 2s, sem subir app |
| **2** | `useExploracaoRural.ts` evoluído: leitura das filhas + upsert + delete + auditoria | `bunx eslint` nos arquivos tocados |
| **3** | `ExploracaoRuralDadosTab` (aba 1) dentro do modal, salvando só o cabeçalho | `bun run dev`, você valida a tela |
| **4** | `PartesPanel` (aba 2) | idem |
| **5** | `ImoveisPanel` + `OrigemExternaDialog` (aba 3) | idem |
| **6** | Página + rota + `protectedPages.ts` + menu no `OsgLayout` | navegação real |
| **7** | RPC `salvar_exploracao_rural` (Migration A2, **escrita e não aplicada**) e troca do upsert avulso por ela | |
| **8** | Ajuste do `FiscalReport` e do `useExploracaoRural` para não ler as 12 colunas legadas | `bun run typecheck` |
| **9** | Migration destrutiva `20260901144839` aplicada — **só depois da fase 8** | ensaio em banco próprio antes do sandbox |

A ordem das fases 8 → 9 não é preferência: é a regra dura do AGENTS.md invertida para
remoção. O `select` do `useExploracaoRural` nomeia as FKs no embed do PostgREST
(`explorador:pessoa!explorador_pessoa_id`), então derrubar a coluna antes do código faz a
query **falhar**, não devolver campo vazio.

## 9. Decisões abertas

1. **`matricula_id` NOT NULL** — item do Anexo exige matrícula cadastrada. Se a OSG cadastra
   o instrumento antes de digitar a matrícula, isso trava e a coluna precisa virar anulável.
2. **Florestal e piscicultura** (achado B do relatório 14) — dois contratos reais de 2026
   autorizam extração de madeira e criação de peixes, e não cabem em `culturas` nem em
   `inclui_pecuaria`. Fora por decisão sua de 21/08; entram como dois booleanos no mesmo molde
   de `inclui_pecuaria` quando a redação for homologada.
3. ~~**Ordem dos imóveis** — arraste ou setas?~~ **Resolvido: setas ↑↓.** Conferi o
   `package.json` e não há nenhuma biblioteca de arraste no projeto (`dnd-kit`, `react-beautiful-dnd`,
   `sortable` — nenhuma). Introduzir uma para ordenar uma lista de até 15 itens é peso de bundle
   e dívida de acessibilidade por conveniência; setas funcionam com teclado de graça. Se um dia
   a ordenação virar necessidade em várias telas, aí a dependência se justifica.
