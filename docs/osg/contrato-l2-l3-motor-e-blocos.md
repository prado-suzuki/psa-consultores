# Contrato congelado entre o motor (L2) e o conteúdo dos blocos (L3)

Contexto: mutirão de correções do `docs/sprints/sprint-11/TAREFA_correcoes-e2e-geracao-contrato.md`.
B4, B5, B12, B13, B14 e B19 são a mesma correção partida em duas: o **motor** (`src/lib/templates/**`,
raia L2) e o **texto dos blocos** (migrations de conteúdo, raia L3). As duas correm em paralelo, então
os nomes de variável e a semântica precisam estar fixados **antes** das duas começarem. Este arquivo é
essa fixação. Ele é normativo: quem divergir dele reprova na revisão, mesmo que o resultado pareça certo.

Quem quiser mudar um item deste contrato **não muda sozinho**: escala para o orquestrador, que decide se
estende o contrato e reavisa as duas raias.

## Divisão de propriedade

| Raia | Escreve em |
|---|---|
| L2 · motor | `src/lib/templates/**`, **exceto** `binding.ts` (é da L6), `vocabulario.test.ts` e `docx.test.ts` (são da L3) |
| L3 · conteúdo | migrations NOVAS de conteúdo em `supabase/migrations/` (timestamp próprio), `src/lib/templates/vocabulario.test.ts` e `src/lib/templates/docx.test.ts` |

L2 escreve `vocabulario.ts`; L3 escreve `vocabulario.test.ts`. É de propósito: o teste é o que congela o
texto do bloco, e o texto do bloco é da L3. Ler o arquivo da outra raia é livre; escrever, não.

---

## 1 · Cartório: nome cadastrado, comarca como complemento (B4)

**Problema.** O bloco escreve o rótulo `Cartório de Registro de Imóveis de` fixo e completa com a comarca,
descartando o nome cadastrado (`Cartório de 1° Ofício de Imóveis`), que é o que identifica a serventia.

**Campos do binding `imovel` depois da correção:**

| Campo | Quem preenche | Garantia |
|---|---|---|
| `imovel.cartorio` | L2, no mapeador | **Nunca vazio.** Nome cadastrado (`cartorio.nome_completo`). Quando o cadastro não tem nome, o mapeador devolve o rótulo genérico `Cartório de Registro de Imóveis`, **sem comarca, sem preposição e sem ponto final**. |
| `imovel.cartorioComarca` | L2, no mapeador (**campo novo**) | A comarca **apenas quando ela ainda não estiver contida em `imovel.cartorio`**; `''` caso contrário. É o campo que o bloco condiciona. |
| `imovel.comarca` | L2 (já existe) | Comarca crua, `''` quando ausente. Continua existindo para quem precisar dela isolada. Não é o campo do fecho da frase. |
| `imovel.ufCartorio` | L2 (já existe) | Inalterado. |

**Redação canônica do bloco (L3), literal:**

```
do {{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}
```

Por que `cartorioComarca` e não `comarca`: sem ele, `2º Ofício de Registro de Imóveis de Sinop` sai como
`do 2º Ofício de Registro de Imóveis de Sinop da comarca de Sinop`. A supressão da redundância é decisão
**do mapeador**, num lugar só, não de cada bloco. É isso que faz o aceite do B4 passar nos dois extremos:
cartório com nome completo e cartório sem nome nenhum.

**L2 não faz:** concatenar `"Cartório de " + comarca` para bater com o gabarito da PSA. O nome da serventia
é dado do cadastro.
**L3 não faz:** manter rótulo institucional escrito à mão em variante nenhuma. L3 varre **todas** as
variantes da família "Descrição de imóvel" e os demais modelos atrás do mesmo defeito latente.

---

## 2 · Bloco sem dado não entra no documento (B5)

**Garantia que L2 entrega.** A regra é de **composição**, não de bloco. Depois de renderizar, antes de
numerar, o motor descarta o bloco que não trouxe dado nenhum. Definição exata do descarte:

> Um bloco é descartado quando ele tem **ao menos um segmento de valor** (`{{ campo }}` resolvido) e
> **todos** os seus segmentos de valor resolveram vazio, e nenhuma seção de repetição dele produziu item.

Consequências que as duas raias podem contar:

- Bloco de prosa fixa, sem nenhum placeholder, **nunca** é descartado.
- Bloco em que 1 de 5 campos veio preenchido **não** é descartado (a pontuação órfã que sobra é assunto do
  item 4 deste contrato e do aviso de documento incompleto do B2, que é da raia L6).
- Uma **tabela textual** (convenção `| … |` do `tabela.ts`) cujo corpo saiu com zero linhas conta como
  ausência de dado: cabeçalho e separadora sozinhos não seguram o bloco no documento.
- Uma **lacuna de campo manual** (item 4) **conta como conteúdo**: o bloco de fecho e assinaturas nunca
  é descartado por estar com data e testemunhas em branco. Isso é intencional.
- A numeração é publicada **depois** do descarte. Documento sem bloco descartado não pode sair com buraco
  na sequência de cláusulas ("Cláusula Quinta" seguida de "Cláusula Sétima").

**L3 pode contar com isso:** não escreva guarda `{{#campo}}…{{/campo}}` em volta de bloco inteiro só para
ele sumir quando não houver dado. O motor faz isso. Guarda continua valendo para trecho **dentro** de um
bloco que tem outro conteúdo.

**Ninguém faz:** filtrar por nome de bloco ("se for o de georref e não houver dados, pule").

---

## 3 · Signatários viram lista com papel (B12 e B13)

**Garantia que L2 entrega.** Um novo campo de topo `signatarios`: lista ordenada, já resolvida, com uma
entrada por **linha de assinatura** do documento. Cada item expõe, sob o escopo `signatario`:

| Campo | Conteúdo |
|---|---|
| `signatario.nome` | Nome completo. **Nunca vazio** (item sem nome não entra na lista). |
| `signatario.nomeMaiusculo` | O mesmo em caixa alta, para o padrão da casa. |
| `signatario.papel` | Rótulo pronto, **já concordado em gênero**: `Sócio administrador`, `Sócia`, `Administrador`, `Cônjuge outorgante`, `Cônjuge outorgante`… O bloco imprime, não monta. |
| `signatario.cpfCnpj` | CPF/CNPJ, `''` quando não houver. |
| `signatario.qualificacao` | Complemento curto opcional (ex.: `neste ato representada por …` para sócia PJ), `''` quando não houver. |
| `signatario.eSocio` / `.eAdministrador` / `.eConjuge` / `.eTestemunha` / `.eAdvogado` | `'sim'` ou `''`, para condicional dentro do laço. |

**Ordem garantida:** sócios na ordem do quadro societário, cada sócio **imediatamente seguido** do seu
cônjuge outorgante quando o regime de bens exigir; depois os administradores que não são sócios; depois
advogado e testemunhas, se o modelo os tiver.

**Deduplicação garantida:** quem é sócio **e** administrador aparece **uma vez só**, com o papel combinado
(`Sócio administrador`). É o que impede o defeito que o "Não faça" do B13 descreve.

**Redação canônica do bloco de fecho (L3):**

```
{{#signatarios sep="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}}
{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}
```

**L3 remove do fecho** o sufixo `{{#socio.exigeOutorgaConjugal}} e Outorga Conjugal{{/socio.exigeOutorgaConjugal}}`.
A flag `socio.exigeOutorgaConjugal` **continua existindo** e continua correta (o teste de regressão "solteiro
não gera outorga" é sobre ela): o que muda é que ela deixa de ser sufixo de rótulo e passa a ser o que faz o
cônjuge entrar na lista de `signatarios`, do lado do motor.

**Ninguém faz:** concatenar o nome do cônjuge no rótulo do sócio; acrescentar um segundo laço
`{{#administradores}}` no fecho.

**Dependência com a L5:** a L5 está consertando a reciprocidade do `conjuge_id` (B10). A L2 **não espera**
por ela: lê `conjuge_id` como está hoje. Quando o vínculo estiver gravado só de um lado, o cônjuge daquele
lado entra na lista e o do outro não. Isso é aceitável e some quando a L5 mesclar.

---

## 4 · Campo manual não preenchido vira lacuna (B19)

**Garantia que L2 entrega.** Campo declarado como **manual** (preenchido na tela Gerar, não vindo de
cadastro) que não foi preenchido **não resolve para `''`**. Ele resolve para uma lacuna assinalável, cujo
formato vem do **tipo do campo**, decidido no motor para todos de uma vez:

| Tipo do campo | Render quando vazio |
|---|---|
| data | `____ de ______________ de 20__` |
| valor | `R$ __________` |
| inteiro | `______` |
| texto / textarea | `____________________` |

Efeito no fecho: `{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.` deixa de sair como
`Lucas do Rio Verde/MT, .` e passa a sair com a lacuna no lugar da data, que é o que um instrumento
assinado à mão quer.

**L3 não faz:** guarda condicional em volta de campo manual, nem mexer na pontuação do fecho para
contornar o buraco. A pontuação do bloco está certa; era o campo que mentia.

---

## 5 · Livro e folha: numeral acompanha o extenso (B14)

**Campos do binding `imovel` depois da correção:**

| Campo | Quem preenche | Garantia |
|---|---|---|
| `imovel.livroNumeral` | L2 (**campo novo**) | O valor cadastrado **preenchido com zero à esquerda até 2 dígitos** quando for puramente numérico (`2` → `02`, `13` → `13`). Valor não numérico (`2-AUX`, `3-Auxiliar`) sai **inalterado**. |
| `imovel.folhaNumeral` | L2 (**campo novo**) | Mesma regra. |
| `imovel.livro` / `imovel.folha` | L2 (já existem) | Inalterados: o valor cru continua disponível. |
| `imovel.livroExtenso` / `imovel.folhaExtenso` | L2 (já existem) | Inalterados: continuam devolvendo **só** o extenso. |

**Redação canônica (L3):**

```
no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}), folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }})
```

**Ninguém faz:** fazer `livroExtenso` devolver `02 (dois)`. A variável passaria a mentir sobre o que é, e
quem quisesse só o extenso perderia a opção.

Ao varrer, a L3 confere se há **outros** campos em que o extenso substituiu o numeral em vez de acompanhá-lo,
e padroniza de uma vez.

---

## 6 · Capital, quotas e valor nominal fecham entre si (B6)

**Garantia que L2 entrega**, num único ponto que devolve os três já coerentes:

```
Σ quotas dos sócios === sociedade.totalQuotas
sociedade.totalQuotas × valor nominal da quota === sociedade.capitalValor
```

**Campos do binding `sociedade`:**

| Campo | Situação | Garantia |
|---|---|---|
| `sociedade.capitalValor` / `.capitalExtenso` | já existem | Passam a ser o valor **coerente** com as quotas, não o somatório cru. |
| `sociedade.totalQuotas` / `.totalQuotasExtenso` | já existem | Inalterados no nome. |
| `sociedade.quotaValorNominal` | **campo novo** | Valor nominal da quota, formatado (`1,00`). Parâmetro da sociedade, não constante implícita. |
| `sociedade.quotaValorNominalExtenso` | **campo novo** | O mesmo por extenso (`um real`). |

**L3 troca, em todos os blocos de capital**, o literal `R$ 1,00 (um real)` por
`R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }})`. Hoje esse literal está
em pelo menos seis migrations de seed; o bloco vivo é o que a composição do modelo referencia, e é esse
que precisa mudar, de forma idempotente.

**Ninguém faz:** trocar `Math.round` por `Math.floor`, nem somar o centavo no último sócio.

---

## 7 · Migrations de conteúdo: idempotência e override de cliente

Vale para toda migration da L3 (e para qualquer raia que mexa em texto de bloco):

- Os blocos são **editáveis pela Biblioteca**. A migration não pode sobrescrever override de cliente em
  silêncio: use o mecanismo de override já existente na Biblioteca e, quando houver override, **preserve**
  e registre, em vez de atropelar.
- A migration precisa ser **idempotente**: rodar duas vezes não pode duplicar versão de bloco nem inverter
  qual é a `atual`.
- Cada raia usa **prefixo de timestamp próprio** no nome do arquivo, para não colidir com outra raia.
- **Nunca** editar migration já existente. Migration é arquivo novo, aplicada pelo Lovable depois. Ninguém
  roda SQL contra o banco: ele é produção.

---

## 8 · Completude do documento: o que a L6 lê do motor (B2)

A raia L6 (tela Gerar) precisa de um terceiro gate, ao lado de `selecoesCompletas` e `erro`: se o
documento está **completo**. A regra tem que ser genérica ("algum campo obrigatório do modelo não foi
resolvido"), não uma lista fixa no controller, porque matrícula digitada, doação e alteração contratual
têm conjuntos de obrigatórios diferentes. Quem sabe disso é o vocabulário, que é da L2.

**L2 entrega, e a L6 apenas consome (leitura livre, escrita proibida):**

1. Em `CampoEntidade` (`vocabulario.ts`), dois marcadores novos:
   - `obrigatorio?: boolean` — sem esse campo resolvido, o documento que o usa está incompleto.
   - `manual?: boolean` — preenchido na tela Gerar, não vem de cadastro. É o mesmo conceito que
     dispara a lacuna assinalável do item 4.
2. Em `SegmentoRender` (`render.ts`), dois marcadores novos no segmento de valor:
   - `lacuna?: true` — este segmento é a lacuna de um campo manual não preenchido (item 4).
   - `pendente?: true` — este segmento é um campo **obrigatório** que resolveu vazio.
   Sem isso a L6 não teria como distinguir um campo em branco de um traço que o próprio bloco escreveu,
   já que depois do item 4 a lacuna é texto normal.
3. Uma função exportada por `src/lib/templates/index.ts`:
   ```ts
   pendenciasDoDocumento(blocos: BlocoGerado[]): Array<{ caminho: string; label: string; manual: boolean }>
   ```
   Devolve, sem repetir, os campos obrigatórios não resolvidos do documento inteiro, com o label do
   vocabulário, para a L6 **nomear o que falta** na confirmação antes de baixar.

Interação com o item 2 (bloco descartado): bloco descartado não gera pendência. Um modelo que
legitimamente não tem sócios (matrícula digitada) sai sem alarme, que é o aceite do B2.

## 9 · Emenda de 13/08/2026 — valor sintetizado e descarte que se anuncia

A revisão da L2 achou um defeito **neste contrato**, não na implementação. Fica emendado assim.

### 9.1 · Valor sintetizado pelo motor não conta como dado

Os itens 1 e 6 obrigam campos a **nunca serem vazios**: `imovel.cartorio` cai no rótulo genérico quando o
cadastro não tem nome, e `sociedade.quotaValorNominal` publica o valor nominal sempre. Combinados com a
regra de descarte do item 2 ("todos os segmentos de valor resolveram vazio"), esses campos **seguram no
documento exatamente o bloco que deveria sumir**: assim que a L3 trocar o literal `R$ 1,00 (um real)` pelas
duas variáveis, o bloco de capital passa a ter dois segmentos nunca vazios e o contrato sem sócios volta a
sair com `O capital social será de R$ (), dividido em () quotas`, que é o sintoma do B2.

Emenda: o motor **marca** o valor que ele próprio sintetizou (fallback, default, rótulo genérico) e
`blocoSemDado` **não o conta como dado**. Um bloco cujos únicos valores preenchidos são sintetizados é
descartado como se estivesse vazio, porque é isso que ele é. A alternativa de "só publicar quando houver
capital" resolve o capital e não resolve o cartório, que por contrato não pode deixar de existir: por isso
a saída é a marcação, e ela vale para os dois.

### 9.2 · Descarte se anuncia

`gerarBlocos` passa a **reportar** quais blocos foram descartados, em vez de sumir com eles calado. Motivo
concreto: o controller da tela Gerar injeta `''` para seção que o motor não conhece, então um bloco cujo
laço não está fiado renderiza vazio e **desaparece do documento sem sinal nenhum**, em vez de aparecer
visivelmente quebrado. Descarte silencioso esconde erro de fiação, e o fecho de assinaturas é justamente um
bloco cujo conteúdo inteiro é um laço.

### 9.3 · A regra de descarte é mais ampla do que o item 2 enumerava

Fica ratificado o que a L2 implementou além do enunciado, porque o enunciado estrito era incoerente com o
próprio bullet sobre tabela (uma tabela de zero linhas não emite segmento de valor nenhum, então a regra
"ao menos um segmento de valor" nunca a alcançaria). Além do item 2, também são descartados:

- bloco cujo render sai **em branco**;
- bloco com **seção de repetição sem nenhum item**, mesmo tendo prosa fixa em volta (o caput que só existe
  para introduzir uma lista vazia).

Consequência que a L3 precisa saber: um caput com valor jurídico próprio, que introduza uma lista hoje
vazia, **será descartado**. Se algum bloco depender de aparecer mesmo sem itens, ele precisa de conteúdo
que não seja o laço, e isso é escolha de redação, não de motor.

### 9.4 · `livroNumeral` / `folhaNumeral` têm dono

O item 5 atribui os dois campos à L2, mas eles não estavam na lista de bugs dela e não foram implementados,
enquanto a L3 já publicou a redação canônica que os usa. **São da L2**, e entram na rodada 2 dela.

### 9.5 · Bloco ancorado e `{{ ref }}` sobrevivem ao descarte

Reordenar para renderizar → descartar → numerar criou duas falhas novas que o contrato não previa, e que
ficam proibidas: um item de coleção cujo bloco repetidor foi descartado não pode manter o `ref` da passada
anterior (imprimiria referência para cláusula inexistente), e um bloco com `ancora` descartado não pode
fazer o render lançar `Placeholder não resolvido` em quem o referencia. Cada um precisa de destino
declarado.

## 10 · O que continua verdadeiro (regressão)

Nenhuma das duas raias pode quebrar isto, e o teste de cada uma deve continuar provando:

- CCIR compartilhado entre duas matrículas do mesmo bem.
- Bem com `participa_estruturacao` desligado ausente de todo documento gerado.
- Área em hectare com quatro casas decimais.
- Outorga conjugal só para quem o regime de bens exige (solteiro não gera).
- CNAE virando lista formatada.
