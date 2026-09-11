# Cadastro de exploração rural — modelagem das tabelas (AGR-01)

Passo de modelagem que antecede a migration. Decide **que forma o dado tem**;
não decide tela, não decide texto de contrato.

Insumos: o inventário de campos da ALE-3 (`13-auditoria-cadastro-vs-modelo.md`,
`14-analise-modelos-avelino-neri-agroalianca.md` e `campos-exploracao-rural.md`,
hoje na branch `ale-3-levantamento-contratos-rurais`) e o schema vivo do sandbox
`vgzomuwnsdgrxbkyoavq`, lido em 01/09/2026.

## Escopo: esta é a Migration A

A AGR-01 (cadastro) e a AGR-02/03 (geração do documento) pedem coisas de banco
diferentes, e travar uma na outra não ajuda:

- **Migration A — esta.** Junções do cadastro, colunas do instrumento, RLS,
  triggers. Destrava a AGR-01 inteira. Escrita em 01/09/2026, **não aplicada** —
  nem no sandbox. Saiu em **dois arquivos**, e a razão não é organização:
  - `20260901144006_cadastro_exploracao_rural_partes_imoveis_origens.sql` —
    aditiva e afrouxante (cria tabela, cria coluna, derruba CHECK). Pode ir a
    produção a qualquer momento.
  - `20260901144839_exploracao_rural_remove_colunas_legadas.sql` — as 12 colunas
    legadas. **Tem pré-condição de código.** A regra dura do AGENTS.md
    ("produção recebe a coluna antes de o código que a usa chegar na `main`") se
    inverte na remoção, e aqui isso é concreto: o `select` de
    `useExploracaoRural.ts` nomeia as FKs no embed do PostgREST
    (`explorador:pessoa!explorador_pessoa_id`, `bem:bem!bem_id`), então sem essas
    colunas a query **falha em runtime**, não devolve campo vazio; e o
    `FiscalReport` lê 7 das 12. Aplicar antes de ajustar os dois quebra o
    relatório Fiscal na cara do cliente.
  - Além disso, o `docs/ambiente-de-desenvolvimento.md` pede que migration
    destrutiva seja **ensaiada num banco próprio** (`.env.development.local`)
    antes do compartilhado — um `drop column` errado no compartilhado trava a
    equipe. Vale para o segundo arquivo.
- **Migration B — depois.** `documento_gerado.exploracao_rural_id`, o ajuste do
  índice `uq_documento_gerado_head_sem_pj`, e o seed de `tmpl_documento`/
  `tmpl_bloco` com as cláusulas. Depende de qual redação de modelo fica valendo,
  que ainda tem pendência com a OSG.

Foro, testemunhas e número de vias **não entram em nenhuma das duas como coluna
de cadastro**: são camada de geração e moram em `documento_gerado.snapshot_dados`,
versionados por minuta (achados #4 e #5 do relatório 13).

## Estado de partida, medido

`exploracao_rural` hoje: 25 colunas, **0 linhas**. Todas as colunas de imóvel,
explorador e outorgante são singulares, e nenhuma tela grava nela — quem lê é o
`FiscalReport`, que hoje roda pelo ramo de fallback (matrículas), justamente
porque a tabela está vazia.

Consequência prática: **não há dado a preservar**. Coluna legada pode sair na
mesma migration, sem etapa de convivência.

## Regra de corte

Vira **coluna do instrumento** o que tem exatamente um valor por contrato.
Vira **linha de tabela filha** o que o contrato real mostra repetindo.
Não vira nada o que é derivado (`nomeComposse` = 1º compossuidor + "E OUTROS";
`situacaoOrigem`, que sai da data de encerramento do instrumento de origem).

## As três tabelas novas

### 1. `exploracao_rural_parte` — quem é parte, e em que papel

```sql
id                   uuid    primary key default gen_random_uuid()
exploracao_rural_id  uuid    not null references exploracao_rural(id) on delete cascade
pessoa_id            uuid    not null references pessoa(id)
papel                text    not null check (papel in ('explorador','compossuidor','administrador_nomeado'))
fracao               numeric                     -- só compossuidor
ordem                integer not null default 0
created_at/created_by/updated_at/updated_by
unique (exploracao_rural_id, pessoa_id, papel)
check (papel = 'compossuidor' or fracao is null)
```

**Uma tabela com discriminador, não três tabelas.** O precedente da casa é a
`titularidade`, que resolve o mesmo problema com `tipo` + `fracao` anulável. E há
uma razão de negócio: no `[ROS-COM]` os dois administradores nomeados **são
compossuidores** — a mesma pessoa acumula papéis. Com uma tabela isso são duas
linhas; com três tabelas, a mesma pessoa aparece em duas e some de uma se alguém
esquecer. É a mesma acumulação que o `signatarios.ts` do motor já modela.

**O outorgante continua coluna, não vira linha aqui.** A OSG confirmou que ele é
sempre único (19/08/2026: se duas empresas cedem, são duas parcerias). Coluna
sustenta essa invariante no schema; linha de junção não.

**`ordem` não é enfeite:** o nome da composse é o 1º compossuidor listado seguido
de "E OUTROS", e a ordem das assinaturas segue a ordem das partes.

**Fração fechando 100% não cabe em `CHECK`** (é regra entre linhas). Vai na RPC
transacional que a AGR-01 já prevê — lá dá para devolver mensagem útil, o que um
trigger não faz bem.

**Não existe coluna de "age isoladamente ou em conjunto", e é de propósito.** O
cadastro de administração de PJ tem `administracao.pode_isoladamente`, e a
tentação é copiar. Mas na composse isso é **derivado da contagem**: 1
administrador nomeado → "isoladamente"; 2 ou mais → "em conjunto". A prova é o
Termo Aditivo do `[ROS-COM]`, que altera a MESMA cláusula de "em conjunto por
Dilceu Rossato e Catia Regina Randon Rossato" para "isoladamente pela
compossuidora Catia Regina Randon" — sem negociar nada novo, só porque Dilceu
deixou de ser compossuidor. Já está implementado assim no motor do mockup
(`administradorNomeadoUnico`/`administradorNomeadoConjunto`). Coluna aqui
duplicaria um fato que a própria lista já responde, e criaria o estado
contraditório "1 nomeado marcado como conjunto".

### 2. `exploracao_rural_imovel` — o item do Anexo Único

```sql
id                            uuid    primary key default gen_random_uuid()
exploracao_rural_id           uuid    not null references exploracao_rural(id) on delete cascade
matricula_id                  uuid    not null references matricula(id)
area_explorada                numeric
area_unidade                  text    not null default 'ha'
ordem                         integer not null default 0
origem_tipo                   text    check (origem_tipo in ('Parceria','Arrendamento','Exploração própria','Herança','Outro'))
origem_exploracao_rural_id    uuid    references exploracao_rural(id)
origem_externa_id             uuid    references exploracao_rural_origem_externa(id)
origem_contraparte_pessoa_id  uuid    references pessoa(id)
created_at/created_by/updated_at/updated_by
unique (exploracao_rural_id, matricula_id)
check (origem_exploracao_rural_id is null or origem_externa_id is null)
```

`area_explorada` aqui é **a área cedida NESTE instrumento**, e não se confunde com
`matricula.area_explorada`, que descreve o imóvel (achado #2 do relatório 13). No
Anexo real do `[BV-COM]` a área cedida é sempre menor que a área total da mesma
linha — 234 ha cedidos de um imóvel de 295,86 ha.

A origem é **por imóvel, não pelo instrumento**: o `[BV-COM]` tem 6 origens
distintas numa composse só. `origem_contraparte_pessoa_id` é o achado F do
relatório 14 — nos itens (g)-(k) daquele contrato a contraparte da origem é **uma
compossuidora nomeada**, não o grupo.

Que a área cedida não ultrapasse a área da matrícula é validação de aplicação:
`CHECK` não enxerga outra tabela.

### 3. `exploracao_rural_origem_externa` — a origem que não é cliente da PSA

```sql
id                                       uuid primary key default gen_random_uuid()
exploracao_rural_id                      uuid not null references exploracao_rural(id) on delete cascade
titulo_instrumento                       text
data_assinatura                          date
outorgante_nome                          text
outorgante_cpf_cnpj                      text
outorgante_municipio                     text
outorgante_uf                            text
outorgante_nire                          text
outorgante_capital_social_na_assinatura  numeric
outorgante_administradores               text
created_at/created_by/updated_at/updated_by
```

**Aqui a modelagem diverge do mockup, de propósito.** No rascunho da ALE-3 a
origem externa era um objeto embutido em cada imóvel. Mas o `[BV-COM]` tem 15
imóveis para 6 origens — os itens (a)-(f) vêm todos da mesma Agro Aliança.
Embutida, a mesma razão social, NIRE, capital e lista de administradores seria
digitada seis vezes, e as seis cópias divergiriam na primeira correção. Tabela
própria referenciada pelo imóvel resolve.

Todos os campos são anuláveis por evidência, não por preguiça: o achado E do
relatório 14 mostra a própria banca emitindo um Considerando V **sem capital
social**, num contrato em que a exigência do template pedia.

## `exploracao_rural`: o que entra, sai e fica

**Entram 17 colunas** (as que o contrato usa e hoje não têm onde morar). A
contagem foi conferida contra a migration escrita, uma a uma — as duas versões
anteriores deste documento diziam 15 e 16, ambas erradas porque linhas da tabela
abaixo agrupam duas colunas:

| Coluna | Tipo | Escopo |
|---|---|---|
| `data_inicio_vigencia` | date (anulável) | Parceria — só quando difere da assinatura |
| `vigencia_prorrogavel` | boolean not null default false | Parceria |
| `percentual_outorgante`, `percentual_explorador` | numeric | Parceria |
| `inclui_pecuaria` | boolean not null default true | Parceria — troca AGROPECUÁRIA/AGRÍCOLA em 3 trechos |
| `culturas` | text | ambos |
| `permite_penhor` | boolean not null default false | ambos |
| `prazo_indivisao_quantidade` / `_unidade` | integer / text `(dias\|meses\|anos)` | Composse |
| `indivisao_prorrogavel` | boolean | Composse |
| `indivisao_aviso_quantidade` / `_unidade` | integer / text | Composse |
| `regra_administracao` | text `(maioria\|nomeados)` | Composse |
| `liquidacao_periodicidade` / `_numero_parcelas` | text `(mensal\|anual)` / integer | Composse |
| `estudo_fiscal_documento_id`, `documento_comprobatorio_id` | uuid → `documento_arquivo(id)` | ambos |

Quantidade e unidade **separadas**, nunca texto livre: a composse do Franciosi
saiu com "prazo de 10 (dez) anos… renovando-se o prazo de 03 (três) anos", porque
o "3 anos" sobrou do template dentro de um campo de texto e ninguém viu.

**Saem 12 colunas** — o dado passa a morar nas filhas, e como a tabela está vazia
não há migração de conteúdo:

- `bem_id`, `imovel_descricao`, `matricula_texto`, `municipio`, `uf`,
  `area_total`, `area_explorada`, `area_unidade` → `exploracao_rural_imovel`,
  via `matricula`
- `explorador_pessoa_id`, `explorador_nome` → `exploracao_rural_parte`
- `outorgante_nome` → deriva de `pessoa`
- `vigencia` (texto legado, duplicava as duas datas)

**Ficam:** `id`, `cliente_id`, `referencia`, `tipo_exploracao`,
`outorgante_pessoa_id`, `declarado_irpf`, `data_assinatura`, `data_encerramento`,
`sacas_por_hectare`, e o bloco de auditoria.

O preço de derrubar as 12: o `FiscalReport` lê cinco delas
(`bem.denominacao`/`imovel_descricao`, `matricula_texto`, `area_explorada`,
`area_unidade`). Ele quebra em tempo de compilação e precisa ser ajustado na
mesma entrega — que é exatamente o "ajustar relatório Fiscal e consumidores
atuais" do briefing da AGR-01. Recomendo derrubar de uma vez em vez de conviver:
manter coluna morta foi o que produziu a confusão entre "coluna existe" e
"prática existe" que já custou uma rodada de selo errado nesta mesma tarefa.

## Convenções que a migration precisa seguir

**RLS — copiar o padrão da `exploracao_rural`, não o da `titularidade`.** As duas
existem hoje e só uma está certa:

```sql
-- exploracao_rural (bom): cluster nas quatro operações
SELECT  cliente_visivel_para(cliente_id)
INSERT  has_role_or_higher(auth.uid(),'team_member') AND cliente_visivel_para(cliente_id)
UPDATE  idem                                    DELETE  idem

-- titularidade (não copiar): SELECT resolve cluster, mas
-- INSERT/UPDATE/DELETE só checam papel — team_member de outro cluster escreve.
```

Como as três tabelas novas não carregam `cliente_id`, o cluster se resolve por um
helper novo, no molde exato dos que já existem:

```sql
create or replace function public.cliente_id_de_exploracao_rural(_id uuid)
returns uuid language sql stable security definer set search_path to 'public'
as $$ select cliente_id from public.exploracao_rural where id = _id; $$;
```

**DELETE explícito em toda junção.** As junções do MAPA nasceram com RLS sem
policy de DELETE; o sintoma foi duplicate key ao revincular e remoção que falhava
em silêncio. Junção sem DELETE é bug esperando data.

**Triggers:** `set_updated_by` + o touch de `updated_at`, como em `titularidade` e
`matricula`. De carona: a `exploracao_rural` hoje só tem o touch
(`trg_expr_updated_at`), sem `set_updated_by` — vale corrigir junto.

**Nome do arquivo:** conferir o timestamp contra a develop antes de nomear. A
ale-3 já colidiu uma vez (`20260820140000` existia dos dois lados com conteúdo
diferente).

**Auditoria é de aplicação, não de banco.** Conferido em 01/09/2026: não há
trigger de auditoria: quem grava é o `logAction` de `useAuditLog.ts`, chamado
pelo hook de domínio depois da escrita. `area: 'osg'` é o valor da casa (53 pontos
de chamada). O molde a copiar é o `useDiagnosticoPatrimonial.ts`, que audita `bem`
e `matricula` assim:

```ts
await logAction({
  area: 'osg',
  entity_type: 'matricula',
  entity_id: row.id,
  entity_name: `Matrícula ${row.numero}`,
  action: original ? 'updated' : 'created',
  // Obrigatório pelo AGENTS.md ("o diff campo-a-campo em changed_fields"), e o
  // molde de fato passa: `undefined` quando nada mudou, nunca objeto vazio.
  changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
});
```

Ou seja: a migration **não** cria mecanismo de auditoria nenhum — o "CUD é
auditado" da AGR-01 se cumpre no hook, com `entity_type: 'exploracao_rural'` (e
as filhas auditadas pelo instrumento, não uma linha por parte, para o log não
virar ruído).

## O que fica de fora, e por quê

- **Exploração florestal e piscicultura** (achado B do relatório 14) — dois
  contratos reais de 2026 autorizam, e não cabem em `culturas` nem em
  `inclui_pecuaria`. Ficam fora porque a redação da cláusula ainda não foi
  homologada com a OSG, e acrescentar dois booleanos depois custa uma migration
  de uma linha cada.
- **Anexo em prosa vs. tabela** (achado D) — é forma de bloco, não de cadastro; e
  a develop já resolveu o memorial de georreferenciamento por imóvel via
  `{{#memoriais}}`.
- **Fecho de assinatura** (achado A) — resolvido pelo `signatarios.ts`; entra na
  Migration B como rótulo de papel, não como coluna.
- **Ramo de PJ para explorador/compossuidor** — pergunta investigada e **fechada
  como não-achado** em 20/08/2026. Nenhum dos 5 contratos reais lidos tem PJ
  nesses papéis, e o `[BV-PAR]` troca deliberadamente "administradores da
  outorgante" por "na qualidade de **pessoas físicas** outorgadas", o que sugere
  que o papel é pensado para pessoa física por natureza. Não muda nada no schema
  (`exploracao_rural_parte.pessoa_id` referencia `pessoa`, que já cobre PF e PJ)
  — está aqui só para a migration não tentar modelar um caso que não existe.

## Decidido

**`data_inicio_vigencia` entra** (Alexandre, 01/09/2026). Coluna `date` anulável:
vazia, a vigência conta da assinatura, como o modelo oficial diz; preenchida, o
texto sai "a partir de \<data\>". Lastro: o `AgroAliança` foi assinado em
20/03/2026 e vigora "a partir de 16 de setembro de 2.026", quase seis meses
depois. É caso isolado, mas real — e uma coluna anulável agora custa menos que
descobrir a necessidade com instrumento já cadastrado.

**`declarado_irpf` fica fora do cadastro, por enquanto** (Alexandre, 01/09/2026).
A coluna existe (boolean NOT NULL), o `FiscalReport` tem a coluna "Decl. IRPF"
lendo dela, e nenhuma tela grava — o relatório responde "Não" para tudo. Ela
**continua no banco** (a migration não a derruba), só não ganha campo no modal.

Dois motivos, para quem retomar isso depois:

- **Momento.** Contrato recém-assinado ainda não foi declarado, por definição.
  Marcar "não" no cadastro é trivialmente verdadeiro; o valor só existe depois da
  declaração entregue, e quem sabe a resposta é quem faz o IRPF do cliente.
- **Forma.** O IRPF é anual e a coluna é um sim/não único. Uma parceria assinada
  em 2026 e vigente até 2029 aparece em quatro declarações. Se um dia o campo
  entrar, provavelmente entra como exercício × declarado (tabela filha), não como
  interruptor — então dar checkbox à coluna atual seria construir sobre o formato
  errado.

Fica pendente com o time Fiscal, não com a AGR-01.
