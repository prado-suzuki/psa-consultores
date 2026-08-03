# Cadastro e Vínculo de Documentos — direção de desenho

Frente de **Bernardo**, a seguinte à de solicitação de documentos. Decisões de direção tomadas em
**03/08/2026**, em conversa. Ainda não tem tarefas escritas nem código.

Pré-requisito de leitura: `docs/planos/fluxo-solicitacao-documentos.md` — é de lá que vem o material
de entrada desta frente (arquivos que chegaram no balde de uma gaveta, sem vínculo com nada).

---

## 1. O problema

Hoje o consultor faz duas viagens. Primeiro vai à tela de qualificação das partes e cadastra a
pessoa; depois volta e vincula os documentos dela. O cadastro e o documento são tratados como coisas
independentes que se encontram no fim.

Isso inverte a ordem real do trabalho: **o consultor não sabe nada da pessoa antes de ler o documento
dela**. O documento não é anexo de uma ficha que já existe — ele é a origem da ficha.

## 2. A troca conceitual

O documento passa a ser o ponto de partida do cadastro, e **o vínculo deixa de ser um passo**. Ele
vira **procedência**: "este campo eu preenchi olhando este documento".

O consultor não vincula nada — ele preenche, e o vínculo é a sombra do preenchimento.

Ganho colateral que hoje não existe: quando um dado for questionado meses depois, dá para responder
*onde* aquilo foi visto.

## 3. A unidade de trabalho é a entidade, não o arquivo

O desenho natural seria uma fila de arquivos: pega o próximo, classifica, próximo. **Quebra na
primeira semana**, porque um documento não corresponde a uma ficha:

- um contrato social qualifica a empresa **e** três sócios;
- uma matrícula qualifica o imóvel e nomeia proprietários;
- uma pessoa precisa de vários documentos para ficar cadastrada.

O fluxo correto é o inverso. O consultor pega um arquivo qualquer do balde — um CPF, digamos —, abre
a ficha da pessoa a partir dele, e então **varre o resto do balde recrutando tudo que é daquela
pessoa**: seja porque tem informação que ele ainda precisa preencher, seja simplesmente porque o
documento pertence a ela. O balde encolhe como efeito colateral do cadastro.

"Entidade" aqui é pessoa física, pessoa jurídica, bem ou matrícula — o fluxo é o mesmo para os
quatro.

## 4. As duas consequências que mudam o plano

**A tela de classificação deixa de existir como tela.** Não há um lugar onde o consultor "classifica
arquivos". Ele cadastra entidades, e a classificação acontece de lado. Duas etapas que estavam sendo
pensadas separadas viram uma.

**Aparece um indicador de progresso honesto, de graça: quantos arquivos ainda não têm dono.** Não
depende de definir "documento faltante", não depende de quantidade esperada por entidade, e é uma
pergunta que sempre tem resposta certa. Provavelmente é o único número de progresso que esta frente
precisa.

## 5. Regras de desenho

Quatro decisões que separam um fluxo fluido de um fluxo insuportável.

1. **Criar do zero tem que ser tão fácil quanto apontar para quem já existe.** A primeira pergunta de
   todo arquivo é "é alguém que eu já tenho, ou alguém novo?". Se criar for mais difícil, o consultor
   vincula no registro errado só para não sair da tela.
2. **Não perguntar o motivo do vínculo.** Obrigar a declarar "usei para preencher" vs. "só pertence"
   é burocracia, e é desnecessário: se a procedência dos campos já é registrada, a diferença entre os
   dois aparece sozinha nos dados.
3. **Um arquivo tem um dono só.** Decidido em 03/08/2026: vínculo 1:1. Recrutar um arquivo o retira
   do balde de vez. O ganho é que a regra da varredura fica trivial — *vinculado = saiu do balde* — e
   não é preciso marcar, por tipo de documento, se ele aceita um ou vários donos (o que exigiria mais
   um campo na tela de cadastro).
   **O custo aceito:** o contrato social vai para a empresa e não aparece na ficha do sócio.
   **O gatilho para reverter:** o consultor subir o mesmo arquivo duas vezes para contornar — isso é
   pedido de 1:N disfarçado.
   **Onde o vínculo mora:** nas colunas da própria linha do arquivo, como hoje, com a regra de **no
   máximo um dono preenchido**. Não em tabela separada — 1:1 é exatamente o que uma coluna expressa, e
   a tabela cobraria junção em toda leitura e mais uma superfície de RLS por um ganho que só existe se
   o 1:N vier. Se vier, migrar é mecânico (a tabela tem 43 linhas, 22 ativas): a reversão já é barata
   sem pré-construir nada.
4. **Precisa existir a saída "isto não é de ninguém"** — documento do cliente como um todo, ou coisa
   que não se aplica. Sem essa válvula sobra sempre um resíduo no balde, o indicador de "sem dono"
   nunca zera, e com isso ele perde a utilidade.

Vale reforçar o que já é regra da frente anterior: **vários arquivos para a mesma entidade é o caso
normal**, não a exceção (três alterações de contrato social, por exemplo). Nada no fluxo pode travar
no "já tem um".

### A arrumação de schema que cabe nesta frente

Pequena, e é a que o 1:1 permite: **apagar as duas colunas reservadas sem FK nem uso**
(`contribuinte_id` e `org_projects_id`) e acrescentar a regra de **no máximo um dono preenchido**.
Nada além disso.

Descartado, e por quê: trocar as colunas de FK por um par `tipo_entidade` + `entidade_id` com
enforcement por gatilho. O argumento a favor era evitar que a tabela acumule colunas conforme surjam
novas entidades vinculáveis — preocupação legítima, e as duas colunas reservadas são a prova de que a
deriva começou. Mas o par polimórfico não elimina esse custo, só troca de forma: sem FK, impedir
órfão exige gatilho em **cada tabela pai** para barrar o `delete`, então cada entidade nova passa a
custar um valor de enum (que também é migração e não se remove) **mais** um guardião escrito à mão.
Um item previsível que o banco garantia sozinho vira um que alguém precisa lembrar de fazer. Além
disso, os tipos aqui são quatro e fechados pelo negócio (pessoa, bem, matrícula, cliente) — o
polimórfico só se paga quando são muitos e em aberto.

**Pendência aberta pela implementação (03/08/2026):** a válvula "não é de ninguém" **não tem onde ser
gravada**. Nenhuma das 24 colunas de `documento_arquivo` expressa "este arquivo é do cliente como um
todo" — hoje "sem dono" e "é do cliente" são o mesmo estado (as três colunas nulas). Falta uma coluna
booleana (algo como `dono_cliente`), e ela entra junto com a arrumação acima. Enquanto não entrar, a
válvula só funciona dentro da sessão.

## 6. Onde vale gastar esforço técnico: a varredura

"Tem mais coisa dessa pessoa aqui?" contra 40 arquivos é tedioso, e é o passo que o consultor vai
repetir para cada entidade cadastrada. Depois que existe nome e CPF na ficha, o sistema consegue
**ordenar o balde por probabilidade** em vez de só listar — e aí o consultor confere 5, não 40.

É o único ponto onde investir esforço muda o resultado de "funciona" para "é bom". E não exige ler o
conteúdo dos arquivos para começar a valer.

## 7. Formatos considerados

| formato | avaliação |
|---|---|
| **Partir do arquivo, varrer o balde por entidade** (§3) | **Escolhido.** A lista de trabalho é a pilha de arquivos; nada fica sem classificar porque o trabalho *é* esvaziar a pilha |
| Partir da ficha, com a gaveta de arquivos ao lado | Mais perto do que existe hoje e menos truncado, mas o vínculo volta a ser ato de vontade — dá para terminar a ficha sem tocar em arquivo nenhum, e o problema original volta |
| O documento propõe a ficha preenchida, o consultor confere | O mais forte — muda o trabalho de *digitar* para *revisar* — e o mais caro. Não é decisão de agora, mas o formato escolhido deve nascer sabendo que **um campo tem origem**, para que depois seja só trocar quem propõe: hoje o consultor, amanhã a máquina |

## 8. Documento faltante — fora desta frente

Decisão: **não haverá cálculo de "faltante"**. Em vez de derivar a falta por subtração, o consultor
**aponta manualmente** o que faltou. A dívida de "quantidade esperada por entidade" deixa de existir
em vez de ser paga.

O motivo é mais forte do que evitar adivinhação: um cálculo automático nunca separa **"o cliente não
mandou"** de **"este documento não se aplica a este caso"**. O consultor separa, e é essa a informação
que importa.

Mas isso pertence à **etapa de checklist**, não a esta frente. Fica registrado aqui só para não ser
re-decidido. Quando chegar a vez, resta escolher onde a marcação de falta vive:

- dentro da solicitação encerrada, como registro histórico que nunca se atualiza, e a próxima
  solicitação nasce dela;
- no cliente, e alguém precisa limpá-la quando o documento chegar;
- não existir marcação — o que o consultor produz no encerramento **já é** a próxima solicitação.

A primeira e a terceira não têm manutenção. A segunda tem, e é a que apodrece.

## 9. Paralelismo com a sprint em curso

A sprint de solicitação (Eduardo e Alexandre) está em execução. Esta frente pode andar em paralelo
com uma ressalva:

| pode agora | não pode agora |
|---|---|
| **Classificar e cadastrar** — apoia-se no catálogo de tipos de documento e nas tabelas de cadastro, ambos estáveis | **Cobertura / "o que falta" / progresso por item** — apoia-se na lista de documentos esperados por cliente, que vai ser reescrita |

A tabela de arquivos recebe um campo novo na sprint deles (de qual pedido o arquivo veio). É
acréscimo, não alteração — não afeta esta frente.

**Dependência barata a combinar:** eles vão renomear o catálogo de tipos de documento e passar a
gravar a gaveta de cada documento. Nenhuma das duas muda conceito, só nome. Começar depois que as
duas caírem custa zero; começar antes custa um retrabalho pequeno e mecânico.

## 10. Questões abertas

| # | questão |
|---|---|
| 1 | ~~Como o consultor sinaliza que terminou com um arquivo~~ — **resolvida** pelo 1:1 da regra 3 do §5: vincular já é terminar, e o arquivo sai do balde |
| 2 | O que a varredura ordenada usa como sinal na primeira versão (nome do arquivo, lote de upload, gaveta) e se isso é suficiente para o consultor confiar na ordem |
| 3 | Se a procedência é registrada por campo ou por ficha. Por campo é o que habilita o formato 3 do §7; por ficha é mais barato e já resolve o vínculo |
| 4 | Se o fluxo é o mesmo para bem e matrícula ou se a varredura por imóvel tem sinais próprios |

---

## Apêndice — refinamento de uma questão da frente anterior

Levantado nesta mesma conversa, sobre a questão aberta nº 1 de
`docs/planos/fluxo-solicitacao-documentos.md` (o índice que deveria impedir o mesmo documento de
entrar duas vezes na mesma solicitação). Registrado aqui para não ser re-derivado; a decisão é de lá,
não desta frente.

O índice proposto na tarefa não protege **nenhum** dos dois casos, não só o documento manual. Item de
catálogo entra com o nome do documento em branco (a gravação não copia, por decisão), e o banco trata
campos em branco como sempre distintos entre si — então duas cópias do mesmo item de catálogo passam.
No documento manual acontece o mesmo, porque o campo de entidade também passa a ficar em branco.

Saída: **dois índices, um para cada tipo de linha** — um sobre o item de catálogo, outro sobre o nome
do documento manual — em vez de um único que tenta cobrir os dois.

Duas coisas a decidir junto, que não estão registradas do outro lado:

1. **A granularidade entra na chave do documento manual?** Se dois grãos podem legitimamente pedir um
   documento de mesmo nome, ela precisa entrar. Se não podem, nome igual em grãos diferentes é erro
   de digitação. Além disso, comparar só em minúsculas não pega espaço sobrando nem acento trocado —
   normalizar o texto antes de comparar custa nada.
2. **O choque com a regra de que remover item não deleta a linha, só marca como dispensada.** A linha
   dispensada continua ocupando a chave: o consultor remove um documento, muda de ideia, e é barrado
   ao tentar adicioná-lo de novo. Ou o índice ignora as linhas dispensadas, ou adicionar reativa a
   linha existente em vez de inserir uma nova. É decisão de comportamento, e vem antes do schema.
