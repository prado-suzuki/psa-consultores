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
> `src/lib/rlsMessages.cadastro.test.ts`. **Falta T6** (conferência na tela, com usuário
> `lider`/`sublider`) e as três decisões de D1–D3, aplicadas por ora pela recomendação.

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
| **Permissão** | só quando o sistema **sabe** que a recusa foi por permissão: o `can_perform` respondeu `allowed: false`, ou o erro veio com o código `42501` | `Você não tem permissão para {ação} {item}.` <br> `É necessário ter o papel de {papel} ou superior para realizar esta ação.` |
| **Falha** | não deu para concluir e **não** há confirmação de que o motivo é permissão | `Não foi possível {ação} {item}.` <br> `{fecho}` |
| **Zero linhas** | a operação deveria alterar ou excluir um registro e não afetou nenhum | `Não foi possível {ação} {item}.` <br> `Os dados podem ter sido modificados. Atualize a página e tente novamente.` |
| **Sucesso** | a operação aconteceu | `{Item} {ação concluída} com sucesso.` |

Nenhum erro do banco vira "sem permissão" por parecer com um. Fora das duas condições da
primeira linha, a categoria é **Falha**.

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
pontos de chamada: cada operação passa a chave do item e a ação, e a montagem das quatro
categorias é uma função só.

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

## T6 — Conferência

Reproduzir cada recusa como um `lider` ou `sublider` e comparar com a coluna de mensagens do
artefato da auditoria. Nenhuma recusa pode terminar em "Cliente atualizado com sucesso!", e
nenhuma frase pode conter os termos proibidos.

---

## Decisões que faltam

**D1 — O aviso de sucesso do salvamento: "salvo" ou "cadastrado/atualizado"?**
O catálogo (tabela C) traz `Cliente cadastrado com sucesso.` e `Cliente atualizado com
sucesso.`; a regra do salvamento completo pede `Cliente salvo com sucesso.`
*Recomendação:* manter as duas frases da tabela C — a tela sabe se está criando ou editando, e
"cadastrado" x "atualizado" informa mais do que "salvo". `Cliente salvo com sucesso.` fica
para a tela que não souber distinguir.

**D2 — De onde sai o `{papel}` da frase de permissão.**
O catálogo diz "Sublíder ou superior", que é a regra do módulo depois das tarefas 1 a 3.
Enquanto elas não estiverem em produção, parte das recusas ainda é por **cluster**, e aí a
frase mentiria para quem já é sublíder.
*Recomendação:* usar o `required_role` que o `can_perform` devolve quando ele existe; sem ele
(42501 cru), usar Sublíder, a regra do módulo. Assim a frase acompanha o banco em vez de
repetir uma promessa.

**D3 — As frases de sucesso das outras entidades entram no código agora?**
Hoje só as do Cliente têm onde aparecer (T4).
*Recomendação:* deixar a tabela C no documento e implementar apenas o que alguma tela usa —
constante sem consumidor é detrito, e o AGENTS.md pede que não fique.

**D4 — Recusa em que o precheck falhou por outro motivo (`grant_missing`).**
O precheck usa esse mesmo motivo quando a própria chamada dele falha (rede, função ausente),
então ele não confirma que houve recusa por permissão.
*Aplicado:* cai em Falha, não em Permissão — a regra é só usar Permissão quando se sabe. Se
preferir o contrário, é uma linha em `categoriaDaRecusa`.

**D5 — Mensagem escrita por gatilho de validação do banco.**
Há gatilhos que devolvem frase em português, curada (é o caso de B2). Pela regra de não exibir
texto vindo do banco, essa frase agora fica só no `console.error` e a tela mostra a Falha do
item.
*Aplicado assim*, mas é justamente a frase que B2 reclamava de ver rebaixada. Se essas frases
devem aparecer, elas precisam virar catálogo aqui, uma por regra de negócio.

## Critérios de aceite

Desta tarefa:

- [ ] Nenhuma mensagem chama tudo de "cliente": a frase nomeia a entidade certa.
- [ ] Nenhuma mensagem da interface contém RLS, `42501`, nome de tabela, UUID, RPC, `upsert`
      ou texto cru do banco. O diagnóstico continua no `console.error`.
- [ ] A categoria Permissão é decidida pelo motivo do erro (`can_perform` ou código `42501`),
      nunca por procurar palavra em inglês na mensagem.
- [ ] Quando o motivo é cargo, a frase informa qual papel é necessário.
- [ ] "Fale com a liderança" não aparece em nenhuma mensagem do módulo.
- [ ] Toda operação de update e de delete confere se houve linha afetada.
- [ ] Zero linhas afetadas nunca termina em sucesso.
- [ ] Nenhum dos pontos silenciosos de T3 continua silencioso.
- [ ] No salvamento completo, qualquer falha intermediária impede o aviso final de sucesso.
- [ ] A mensagem final identifica a operação e a entidade que falharam.
- [ ] Os testes de T5 passam, com uma asserção por célula das tabelas A e B.

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
