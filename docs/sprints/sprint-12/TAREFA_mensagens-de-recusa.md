# TAREFA 4 de 4 — As mensagens de recusa do cadastro de cliente

> **Uma das quatro tarefas** que arrumam o módulo de cadastro de cliente depois da auditoria
> de 02/09/2026. As outras: [registrar](TAREFA_registrar-por-cargo.md) ·
> [alterar](TAREFA_alterar-por-cargo.md) · [excluir](TAREFA_excluir-por-cargo.md).
>
> **Só código, nenhuma migração.** Independente das três — pode ir antes, depois ou junto.
>
> **O texto de cada mensagem está fechado** (Patricia, 02/09/2026) e vive neste arquivo, nas
> tabelas de T1. Quem executa não escreve frase nova: monta as frases a partir do catálogo.
>
> **T1 a T5 ✅ CONCLUÍDO (02/09/2026)** — catálogo e tradução em `src/lib/rlsMessages.ts`,
> pontos silenciosos fechados em `src/hooks/useSaveClientTransaction.ts`, testes em
> `src/lib/rlsMessages.cadastro.test.ts`. As decisões D1 a D5 estão fechadas. **Falta a T6**,
> a conferência na tela como `lider`/`sublider` — é da Patricia.

## O funil de hoje

As 24 operações do salvamento passam por **um único ponto** no fim, e ele escolhe entre dois
textos. O que decide é um teste de palavras **em inglês** na mensagem devolvida pelo banco:

```
Se contém "row-level security", "violates row" ou "permission denied", ou traz o código 42501:
  -> "Sem permissão para {cadastrar|atualizar} cliente. {frase do banco} ({passo}, {código}). Fale com a liderança."

Senão:
  -> "Erro ao {cadastrar|atualizar} cliente: {frase do banco}"
```

Daí saem os defeitos abaixo. Todos estão documentados com a frase exata de cada uma das
24 operações no artefato da auditoria.

## Os defeitos

**B1 — Toda mensagem diz "cliente", qualquer que seja o item recusado.**
Contribuinte, inscrição estadual, representante, OS, rateio e produto produzem a mesma
abertura. O item real só aparece em inglês, no meio da frase, e no rótulo entre parênteses. Na
prática a mensagem **aponta para a tela errada**: a pessoa vai conferir a aba Cliente, que
está correta, quando o problema estava na aba Contribuintes.

**B2 — As mensagens escritas em português são rebaixadas.**
O teste procura texto em inglês, então toda frase escrita com cuidado, em português, cai do
lado errado da bifurcação e aparece como erro comum. Acontece com as três melhores do módulo,
inclusive a única que diz **qual papel** seria necessário:

```
"Você precisa do papel "Sublíder" ou superior para realizar essa ação."
  -> sai como: Erro ao atualizar cliente: Você precisa do papel "Sublíder" ou superior...
```

**B3 — Seis das 24 operações recusam sem dizer nada.**
Alterar representante · alterar produto · excluir produto · excluir cluster do cliente ·
excluir inscrição estadual · e o desfazer do cliente. Nessas seis a tela não confere quantas
linhas foram afetadas: a recusa dá zero linhas, nenhum erro é devolvido, e o salvamento
termina anunciando **"Cliente atualizado com sucesso!"**.

É o pior tipo de falha — a pessoa não repete a ação, porque acredita que deu certo. E ganha
importância depois das tarefas 1 a 3: com a escrita liberada por cargo, alterar e excluir
passam a ser barrados **pela leitura**, silenciosamente (medido em dev: *"um líder sem o
cluster do cliente afeta 0 linhas, sem erro"*). O limite é de propósito; o silêncio não.

**B4 — "Fale com a liderança" manda para a pessoa errada.**
Em todo caso de cluster, quem resolve é quem mantém a estrutura de equipes — a liderança da
pessoa não tem o que fazer. E no caso de excluir contribuinte, antes da tarefa 3, ninguém
resolvia.

**B6 — O passo informado pode apontar para a tabela errada.**
Falha em inscrição estadual é reportada como `contribuinte/upsert`, porque a tela não troca a
etiqueta ao entrar nas inscrições.

**B7 — Inscrição estadual joga o erro no chão nas três operações, não só no apagar.**
As chamadas de `inscricao_contribuinte` — `delete`, `update` e `insert` — são aguardadas sem
desmontar o retorno, então o `error` do supabase-js não é lido em nenhuma das três. Um 42501
no update de inscrição estadual hoje não produz mensagem nenhuma: o salvamento segue e termina
em sucesso. (A auditoria havia registrado só o apagar.)

---

## A regra da mensagem

Toda mensagem responde, sempre que possível, a três perguntas, nesta ordem:

**O que aconteceu?** → **Em qual item?** → **O que a pessoa deve fazer agora?**

O item é nomeado **pelo nome que aparece na tela** — "o contribuinte", "a OS 1234", "o rateio
de receita da OS 1234". Nunca aparece no texto que a pessoa lê:

- nome de tabela ou de coluna do banco (`contribuinte`, `ordem_servico`, `os_produtos_contratados`, `excluido`)
- nome de função ou RPC (`soft_delete_contribuinte`, `can_perform`)
- texto em inglês do Postgres ou do PostgREST, "RLS", "row-level security", "violates row",
  "permission denied", o código `42501`
- identificador interno (UUID), `upsert`, o rótulo do passo (`contribuinte/upsert`)

Tudo isso continua indo para o `console.error`, junto com o passo e o código — é o que permite
abrir chamado sem reproduzir o erro. Sai só do texto da interface.

## As quatro categorias

| Categoria | Quando usar | Texto |
|---|---|---|
| **Permissão confirmada** | o sistema **sabe** que faltou cargo: o `can_perform` respondeu qual papel falta, ou a recusa é uma das de cargo conhecidas (ver T1) | `Você não tem permissão para {ação} {item}.` <br> `É necessário ter o papel de {papel} ou superior para realizar esta ação.` |
| **Regra de negócio conhecida** | a recusa é uma regra do catálogo de regras (T1), que a pessoa consegue corrigir | a frase curada da regra — nunca o texto do banco |
| **Falha** | causa técnica ou desconhecida | `Não foi possível {ação} {item}.` <br> `{fecho}` |
| **Zero linhas** | a operação deveria alterar ou excluir um registro e não afetou nenhum | `Não foi possível {ação} {item}.` <br> `Os dados podem ter sido modificados. Atualize a página e tente novamente.` |
| **Sucesso** | a operação aconteceu | `{Item} {ação concluída} com sucesso.` |

Nenhum erro do banco vira "sem permissão" por parecer com um, e **nenhuma frase afirma uma
causa que o sistema não conhece**. Um código de permissão cru não basta: enquanto a escrita
puder ser barrada por cluster — ou seja, até as tarefas 1 a 3 estarem em produção — a recusa
pode não ser por cargo, e prometer "papel de Sublíder" a quem já é sublíder é pior do que não
explicar. Nesse caso, Falha.

Regra de negócio é a exceção que faz diferença na prática: se a pessoa consegue corrigir,
esconder o motivo atrás de "Não foi possível cadastrar o cliente" tira dela exatamente a
informação necessária para agir. A frase que aparece é a do catálogo, curada; a do banco, que
cita nome de tabela e identificador interno, continua só no `console.error`.

E "Fale com a liderança" sai de todas. O destino agora é específico: se falta cargo, a frase
diz **qual papel**; se é problema técnico, manda ao suporte; se algum dia houver limite que
dependa da estrutura de equipes, a frase orienta sobre a estrutura, não sobre a liderança.

---

## T1 — Um lugar só para traduzir a recusa

Sai o teste de palavras em inglês. Entra uma função que recebe a recusa, a operação e o item,
e devolve a frase pronta, montada a partir das tabelas abaixo.

`src/lib/rlsMessages.ts` já é o lugar dessa tradução — hoje ele serve só ao precheck. Ampliar
ali, em vez de criar outro, para não repetir o defeito de ter duas fontes para a mesma frase.

O catálogo entra no código como **uma tabela de dados**, não como frases espalhadas pelos
pontos de chamada: cada operação passa a chave do item e a ação, e a montagem das categorias é
uma função só. São quatro tabelas — A e B pelos fragmentos de cada operação, C pelo sucesso e
**D pelas regras de negócio**, que não dependem da operação e sim do que o banco recusou.

O aviso vai ao toast partido em duas partes (o que aconteceu · o que fazer): num texto único o
`\n` não quebra linha no `sonner` e as duas frases apareceriam coladas.

### Tabela A — o fragmento `{ação} {item}` da Falha e da Zero linhas

| Item | Cadastrar | Atualizar | Excluir |
|---|---|---|---|
| Cliente | cadastrar o cliente | atualizar o cliente | desfazer o cadastro do cliente |
| Cluster do cliente | vincular o cluster ao cliente | — | remover o cluster do cliente |
| Contribuinte | cadastrar o contribuinte | atualizar o contribuinte | excluir o contribuinte |
| Inscrição estadual | cadastrar a inscrição estadual | atualizar a inscrição estadual | excluir a inscrição estadual |
| Representante | cadastrar o representante | atualizar o representante | excluir o representante |
| Ordem de serviço | cadastrar a ordem de serviço | atualizar a OS {número} ⚑ | excluir a OS {número} |
| Rateio da receita | cadastrar o rateio de receita | atualizar o rateio de receita da OS {número} ⚑ | excluir o rateio de receita |
| Produto contratado | adicionar o produto à OS | atualizar o produto contratado | excluir o produto contratado |

**Fecho da Falha:** `Tente novamente. Se o problema continuar, entre em contato com o suporte.`
⚑ **exceção:** nas duas células marcadas o fecho é `Atualize os dados e tente novamente.`

**Fecho da Zero linhas**, sempre: `Os dados podem ter sido modificados. Atualize a página e tente novamente.`

Exemplo montado:

```
Não foi possível excluir o produto contratado.
Os dados podem ter sido modificados. Atualize a página e tente novamente.
```

### Tabela B — o fragmento `{ação} {item}` da Permissão

Muda de A em duas coisas: o item vem no demonstrativo ("este", "esta"), e o rateio não repete
o número da OS.

| Item | Cadastrar | Atualizar | Excluir |
|---|---|---|---|
| Cliente | cadastrar este cliente | atualizar este cliente | excluir este cliente |
| Cluster do cliente | vincular este cluster ao cliente | — | remover este cluster do cliente |
| Contribuinte | cadastrar este contribuinte | atualizar este contribuinte | excluir este contribuinte |
| Inscrição estadual | cadastrar esta inscrição estadual | atualizar esta inscrição estadual | excluir esta inscrição estadual |
| Representante | cadastrar este representante | atualizar este representante | excluir este representante |
| Ordem de serviço | cadastrar esta ordem de serviço | atualizar a OS {número} | excluir a OS {número} |
| Rateio da receita | cadastrar este rateio de receita | atualizar este rateio de receita | excluir este rateio de receita |
| Produto contratado | adicionar este produto à OS | atualizar este produto contratado | excluir este produto contratado |

Exemplo montado:

```
Você não tem permissão para atualizar esta inscrição estadual.
É necessário ter o papel de Sublíder ou superior para realizar esta ação.
```

### Tabela D — Regras de negócio (conferidas no schema de produção em 02/09/2026)

Estas são as recusas que a pessoa consegue corrigir. A coluna da esquerda é como o sistema
reconhece a regra — nome da constraint (casamento firme) ou trecho de frase de uma função
**nossa**, nunca palavra em inglês do Postgres. Sem casamento, a recusa cai em Falha: degrada,
não inventa causa.

| Reconhecida por | Texto na tela |
|---|---|
| `Selecione ao menos 1 cluster` (RPC de criação) · `precisa estar vinculado a pelo menos 1 cluster` (gatilho, na edição) | **É necessário informar pelo menos um cluster.** Selecione um cluster para o cliente e salve novamente. |
| `Não é possível remover o último cluster` | **O cliente precisa permanecer vinculado a pelo menos um cluster.** Vincule outro cluster antes de remover este. |
| constraint `unique_cliente_cluster` | **Este cluster já está vinculado ao cliente.** Remova o item duplicado e salve novamente. |
| constraint de unicidade de `(OS, produto)` | **Este produto já está vinculado à OS.** Remova o item duplicado e salve novamente. |

Duas escolhas de texto, fechadas em 02/09: no último cluster a frase é o **feedback da ação**
("o cliente precisa permanecer vinculado"), não o enunciado da regra ("é necessário manter") —
a consequência de remover fica clara. E as duas duplicidades usam a **mesma construção**, "já
está vinculado" + "remova o item duplicado", para não pedir interpretação diferente de uma para
a outra. Há teste travando as duas coisas.

As três primeiras nascem de `RAISE EXCEPTION` com `ERRCODE 23514`; as de unicidade, `23505`.
Todas citam identificador interno ou nome de tabela na frase original — por isso o texto da
tela vem daqui.

Outras três regras existem no banco e hoje a tela barra antes (`cliente_nome_nao_vazio`,
`contribuinte_tipo_pessoa_check`, `ordem_servico_numero_parcelas_faixa`). Ficam fora do
catálogo até aparecerem de fato — entram com uma linha cada.

**A regra de cargo que dá certeza.** `criar_cliente_com_clusters` é SECURITY DEFINER e o único
`42501` que ela levanta é o teste de cargo (`has_role_or_higher(sublider)`), conferido em
produção. Essa recusa entra em Permissão confirmada, com "Sublíder" — é justamente a que barrou
o cadastro em 01/09. Fora dela, permissão só quando o `can_perform` disser o papel.

### Tabela C — Sucesso

| Item | Cadastrar | Atualizar | Excluir |
|---|---|---|---|
| Cliente | Cliente cadastrado com sucesso. | Cliente atualizado com sucesso. | Cadastro do cliente desfeito com sucesso. |
| Cluster do cliente | Cluster vinculado ao cliente com sucesso. | — | Cluster removido do cliente com sucesso. |
| Contribuinte | Contribuinte cadastrado com sucesso. | Contribuinte atualizado com sucesso. | Contribuinte excluído com sucesso. |
| Inscrição estadual | Inscrição estadual cadastrada com sucesso. | Inscrição estadual atualizada com sucesso. | Inscrição estadual excluída com sucesso. |
| Representante | Representante cadastrado com sucesso. | Representante atualizado com sucesso. | Representante excluído com sucesso. |
| Ordem de serviço | Ordem de serviço cadastrada com sucesso. | OS {número} atualizada com sucesso. | OS {número} excluída com sucesso. |
| Rateio da receita | Rateio de receita cadastrado com sucesso. | Rateio de receita atualizado com sucesso. | Rateio de receita excluído com sucesso. |
| Produto contratado | Produto adicionado à OS com sucesso. | Produto contratado atualizado com sucesso. | Produto contratado excluído com sucesso. |

**Atenção:** hoje, tirando as do Cliente, nenhuma dessas frases tem onde aparecer — as 24
operações acontecem dentro de um único "Salvar cliente", que dá um aviso só no fim (T4). A
tabela C é o texto decidido para quando uma dessas operações ganhar salvamento próprio; ver a
decisão **D3** sobre o que entra no código agora.

O código e o passo continuam úteis para abrir chamado: vão para o `console.error`, não para o
texto que a pessoa lê.

## T2 — Rotular o passo corretamente

`currentStep` fica em `contribuinte/upsert` durante toda a gravação das inscrições estaduais.
Passar a marcar `inscricao_contribuinte/*` ao entrar nesse trecho, para a pista apontar para a
tabela certa (B6). O rótulo é para o `console.error` — nunca para a tela.

## T3 — Fechar as operações silenciosas

Regra dura: **operação que esperava alterar ou excluir registro e afetou zero linhas nunca é
sucesso.** Ela interrompe o salvamento e mostra a mensagem da categoria Zero linhas, com o
item da tabela A.

É o que o `UPDATE` de contribuinte e as funções `soft_delete_*` já fazem — devolvem quantas
linhas marcaram. O que falta, por ponto de chamada:

| Passo | Falta hoje | O que fazer |
|---|---|---|
| `cliente/delete` (o desfazer, no rollback) | não lê o erro nem confere linha | ler o retorno; se nada foi apagado, dizer que o cadastro ficou pela metade |
| `cliente_clusters/delete` | confere o erro, não confere linha | `.select('id')` e comparar com o que se pediu |
| `inscricao_contribuinte/delete` | não lê o erro nem confere linha (B7) | desmontar `{ error }`, `.select('id')` e comparar |
| `inscricao_contribuinte/update` e `/insert` | não lê o erro (B7) | desmontar `{ error }`; no update, conferir linha |
| `representante/update` | confere o erro, não confere linha | `.select(id_representante)` e falhar em zero |
| `os_produtos_contratados/update` | confere o erro, não confere linha | `.select('id')` e falhar em zero |
| `os_produtos_contratados/delete` | confere o erro, não confere linha | `.select('id')` e comparar com o que se pediu |

O desfazer é caso à parte: ele roda **dentro** do tratamento de outra falha. Se ele falhar,
mostrar as duas coisas — o erro que interrompeu o salvamento **e** a frase de que o cadastro
recém-criado não pôde ser desfeito e precisa ser levado ao suporte. É esse silêncio que deixou
os clientes órfãos da [tarefa de excluir](TAREFA_excluir-por-cargo.md).

## T4 — A mensagem do salvamento completo

As 24 operações são etapas de um "Salvar cliente" só. Então não há aviso de sucesso
intermediário — as frases das tabelas servem para **nomear a etapa que falhou**.

**Todas as etapas terminaram:** um aviso só, o do Cliente (ver **D1**).

**Qualquer etapa falhou:** o salvamento não pode terminar em sucesso, e a mensagem final
identifica a etapa:

```
Não foi possível salvar o cliente.
Ocorreu um problema ao {fragmento da tabela A}. {fecho}
```

```
Não foi possível salvar o cliente.
Ocorreu um problema ao cadastrar o contribuinte. Tente novamente.
```

```
Não foi possível salvar o cliente.
Ocorreu um problema ao atualizar a OS 1234. Atualize os dados e tente novamente.
```

Quando a recusa é de permissão, a primeira linha permanece e as duas linhas da categoria
Permissão entram no lugar da segunda — a pessoa precisa saber que o salvamento inteiro não
aconteceu, e qual papel resolveria:

```
Não foi possível salvar o cliente.
Você não tem permissão para atualizar esta inscrição estadual.
É necessário ter o papel de Sublíder ou superior para realizar esta ação.
```

O aviso de "Nenhuma alteração detectada" e o de pendências não mudam.

## T5 — Testes

Em `src/lib/`, sobre a função de tradução — sem banco:

1. As quatro categorias, para cada célula das tabelas A e B: a frase renderizada é comparada
   com o texto do catálogo, com o número da OS interpolado. É esse teste que impede o "arrumar
   o texto" de amanhã.
2. Nenhuma frase renderizada contém os termos proibidos da seção "A regra da mensagem" —
   varredura por lista, incluindo `42501`, `row-level`, `permission denied`, `upsert`, os nomes
   de tabela do módulo e o formato de UUID.
3. Erro do banco **sem** sinal de permissão (por exemplo, violação de unicidade) cai em Falha,
   não em Permissão.
4. Recusa com `allowed: false` do `can_perform` e recusa com código `42501` caem em Permissão.
5. Zero linhas afetadas produz a mensagem da categoria Zero linhas e faz o salvamento falhar —
   para cada um dos pontos de T3.

## T6 — Conferência (Patricia)

Reproduzir cada recusa **como Líder e como Sublíder**, comparando com a coluna de mensagens do
artefato da auditoria. **Não vale conferir só que "apareceu um erro".** Em cada recusa, quatro
pontos:

| | |
|---|---|
| **Entidade** | a frase nomeia o item que recusou — e é a aba onde o problema está |
| **Ação** | cadastrar, atualizar ou excluir, a que foi tentada |
| **Motivo** | quando conhecido, aparece: qual papel falta, ou qual regra de negócio |
| **Nenhum sucesso depois** | nenhuma mensagem de sucesso aparece na sequência da recusa |

O último é o essencial: é ele que pega as falhas silenciosas. Nenhuma recusa pode terminar em
"Cliente atualizado com sucesso", e nenhuma frase pode conter os termos proibidos.

---

## Decisões fechadas (Patricia, 02/09/2026)

**D1 — O aviso de sucesso do salvamento.** Ficam `Cliente cadastrado com sucesso.` e `Cliente
atualizado com sucesso.`, sem exclamação. A tela sabe se é criação ou edição, e a mensagem
específica informa mais do que "Cliente salvo com sucesso".

**D2 — De onde sai o `{papel}`.** Do `required_role` que o banco devolve, quando existe. Sem
ele, "Sublíder" **somente** quando a recusa é de cargo com certeza (a lista de recusas de cargo
conhecidas, em T1). Se a recusa ainda puder ser por cluster, é Falha genérica. A regra é não
afirmar uma causa que o sistema não conhece. Quando as tarefas 1 a 3 estiverem em produção, a
escrita passa a ser só por cargo: aí a chave `RECUSA_DE_ESCRITA_E_SO_POR_CARGO` vira `true` em
`src/lib/rlsMessages.ts` e todo código de permissão volta a informar o papel.

**D3 — Sucesso das outras entidades.** Só documentado (tabela C). Sem salvamento próprio, não
faz sentido criar constante que ninguém consome.

**D4 — Precheck que falhou por outro motivo (`grant_missing`).** Falha, não falta de permissão:
se a chamada caiu por rede ou função indisponível, não se sabe se a pessoa tinha permissão.
"Você não tem permissão" só quando confirmado.

**D5 — Validação de negócio do banco.** Vira a terceira categoria, com catálogo próprio
(tabela D): regra que a pessoa consegue corrigir continua aparecendo, curada, porque esconder o
motivo tira dela a informação necessária para agir. Texto bruto do banco fica só no log.

## Critérios de aceite

Desta tarefa:

- [x] Nenhuma mensagem chama tudo de "cliente": a frase nomeia a entidade certa.
- [x] Nenhuma mensagem da interface contém RLS, `42501`, nome de tabela, UUID, RPC, `upsert`
      ou texto cru do banco. O diagnóstico continua no `console.error`.
- [x] A categoria vem do motivo do erro (`can_perform`, código do banco, catálogo de regras),
      nunca de procurar palavra em inglês na mensagem.
- [x] Quando o motivo é cargo **e isso é certeza**, a frase informa qual papel é necessário; nos
      demais casos não afirma causa.
- [x] Regra de negócio conhecida aparece curada e acionável, em vez de virar genérico.
- [x] "Fale com a liderança" não aparece em nenhuma mensagem do módulo.
- [x] Toda operação de update e de delete confere se houve linha afetada.
- [x] Zero linhas afetadas nunca termina em sucesso.
- [x] Nenhum dos pontos silenciosos de T3 continua silencioso.
- [x] No salvamento completo, qualquer falha intermediária impede o aviso final de sucesso.
- [x] A mensagem final identifica a operação e a entidade que falharam.
- [x] Os testes de T5 passam, com uma asserção por célula das tabelas A e B.
- [ ] Os quatro pontos da T6 conferidos na tela (entidade, ação, motivo, nenhum sucesso depois).

Das tarefas 1 a 3, conferidos aqui só para não serem mascarados por mensagem:

- [ ] Escrita segue a regra de cargo; leitura continua recortada por cluster.
- [ ] Contribuinte e representante podem ser excluídos por quem cumpre a regra —
      [alterar](TAREFA_alterar-por-cargo.md) e [excluir](TAREFA_excluir-por-cargo.md). Isso
      **não** se resolve com mensagem de "falta de permissão": se a pessoa deveria conseguir, o
      comportamento é que está errado.

## O que fica de fora

**B5 — produto repetido na mesma OS.** `os_produtos_contratados` tem única em
`(ordem_servico_id, produto_segmento_id)`; o banco recusa **no último dos 8 passos**, depois
de tudo gravado. A tela deveria impedir antes de salvar. É validação de formulário, não
mensagem de recusa — vale tarefa própria, ou entra aqui se der no mesmo esforço.

**A suíte que trava a regra de RLS** — as 24 operações de escrita e as 8 leituras testadas
contra o banco, para que uma migração futura não reintroduza recorte por cluster na escrita.
Ela precisa existir, mas é teste de **policy**, não de texto: pertence ao aceite das tarefas
[2](TAREFA_alterar-por-cargo.md) e [3](TAREFA_excluir-por-cargo.md), que são as que mexem nas
policies. Os testes de T5 aqui rodam sem banco.

## Referências

- Auditoria das 24 operações (artefato, 02/09/2026) — a frase exata de cada recusa.
- `src/hooks/useSaveClientTransaction.ts` — o funil no `catch`, o rollback do desfazer e os
  pontos silenciosos de T3.
- `src/hooks/useRlsPrecheck.ts` e `src/lib/rlsMessages.ts` — o precheck, o `required_role` e os
  textos de hoje.
