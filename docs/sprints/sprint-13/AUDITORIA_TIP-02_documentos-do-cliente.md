# AUDITORIA TIP-02 — Documentos do Cliente

> **O que é.** A auditoria de clareza da rota `/equipe/osg/work/documentos`, controle por
> controle, pela árvore de [`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md).
> Cada ficha segue a §6 daquele documento: **a redação final está aqui, e a implementação não a
> reescreve.**
>
> **Origem de cada ficha está declarada.** `tela` = veio de olhar o controle contra a árvore.
> `go-live` = veio da lista de perguntas do GO-06 — **e essa lista não está no repositório**
> (a tarefa fechou sem anexo). As fichas de origem `go-live` estão em branco de propósito, para
> quem esteve na sala preencher. Nenhuma pergunta foi inventada.
>
> **Por que esta rota e não o checklist.** Medido em 18/09: os cinco commits da GO-11 tocaram
> **22 arquivos do checklist** (+990/−1098) e **zero** desta rota. O checklist já passou pela
> régua da coordenação; esta não passou por régua nenhuma.

## O que a rota é

`DocumentosCliente` → `OrganizarDocumentos` (a árvore de pastas + a lista da pasta aberta) e
quatro modais: **Anexar**, **Vincular**, **Renomear** e **Pré-visualizar**. O modo Classificar
não está aqui — saiu para o Onboarding.

**23 controles auditados. 9 com intervenção, 14 sem.** A proporção é o esperado de uma árvore
que começa perguntando se o controle precisa mesmo de texto.

---

## A. Defeitos — o texto ou a marcação está errado

### A1 · Os quatro botões de ação da linha não têm nome acessível

```
Rota:          Documentos do Cliente
Controle:      botões Renomear / Vincular / Baixar / Excluir, na linha de cada documento
Problema:      são botões só de ícone com <Tooltip> e SEM aria-label. Quem navega por
               leitor de tela ouve "botão" quatro vezes por linha. O degrau 0 manda
               `aria-label` sempre; a conversão do lote 2 não os alcançou porque eles já
               eram <Tooltip> — nunca foram `title=`
Intervenção:   degrau 0 — marcação (o texto do balão já existe e fica)
Texto final:   Renomear · Vincular documento · Baixar · Excluir documento
Comportamento: o mesmo de hoje; o balão continua abrindo no hover
Marcação:      trocar o <Tooltip> cru pelo ButtonTooltip de @/components/ui/button-tooltip,
               que dá o aria-label e o balão de uma vez
Origem:        tela
```

Os dois textos que mudam, e por quê: `Vincular a pessoa, matrícula ou bem` tem **35 caracteres**
(teto do rótulo exposto é 30) e a lista de alvos está dentro do próprio modal que o botão abre;
`Excluir o documento e o arquivo` tem **31**, e a consequência já está escrita na confirmação, que
é onde ela é necessária. `Renomear o nome exibido` → `Renomear`: a ressalva vive na descrição do
modal, e o rótulo é nome, não explicação.

### A2 · O nome do arquivo é lido como "Pré-visualizar"

```
Rota:          Documentos do Cliente
Controle:      botão do nome do arquivo (abre a pré-visualização)
Problema:      o botão tem texto visível — o nome do arquivo — e ganhou
               aria-label="Pré-visualizar" na conversão do lote 2. O aria-label SUBSTITUI o
               conteúdo para leitor de tela: os 40 documentos da pasta viram 40 "Pré-visualizar",
               e o nome do arquivo, que é a única coisa que distingue uma linha da outra,
               desaparece. O degrau 0 diz explicitamente "quando não usar: o controle já tem
               texto — aí é redundância"
Intervenção:   degrau 0 — remover o aria-label; manter o balão
Texto final:   (balão) Pré-visualizar
Comportamento: o balão continua ajudando a descobrir que o nome é clicável — nem todo
               arquivo é previsível, e só os previsíveis viram botão
Marcação:      ButtonTooltip sem aria-label no <button> interno
Origem:        tela
```

Isto é regressão, não dívida antiga: o `aria-label` entrou em 17/09.

### A3 · O placeholder do tipo de documento faz trabalho de três recursos

```
Rota:          Documentos do Cliente → Anexar documento
Controle:      campo "Tipo de documento (opcional)"
Problema:      placeholder="Selecionar da lista (define a categoria)" é a forma minoritária
               (Selecionar… contra a canônica Selecione…, 23 × 130 no repositório) e carrega
               uma explicação entre parênteses. Placeholder é forma do campo: não é rótulo
               nem instrução. E a informação que ele esconde é real e vale toda vez —
               escolher o tipo preenche a categoria sozinho, três campos abaixo
Intervenção:   placeholder canônico + texto de apoio (degrau 3)
Texto final:   placeholder: Selecione…
               texto de apoio: Escolher o tipo preenche a categoria.
Comportamento: o texto de apoio é permanente, abaixo do campo
Marcação:      <p className="text-sm text-muted-foreground"> com id e aria-describedby no
               SelectTrigger (§3 — sem isso o texto existe e não é anunciado)
Origem:        tela
```

É um dos 226 placeholders que a catraca `textoDeAjuda.test.ts` congela. Pagar este desce o
número no mesmo commit.

### A4 · "Storage" na confirmação de exclusão

```
Rota:          Documentos do Cliente
Controle:      diálogo "Excluir documento?"
Problema:      "o arquivo é apagado do storage" usa termo técnico interno, que a §4 proíbe
               na tela; e "A recuperação só é possível dentro de 7 dias" é nominalização
               ("realizar a validação" é o mesmo defeito)
Intervenção:   redação (§4)
Texto final:   "{nome}" sai da lista e o arquivo é apagado. A recuperação é possível por 7 dias.
Comportamento: inalterado
Marcação:      AlertDialogDescription, como hoje
Origem:        tela
```

---

## B. Inconsistências — o mesmo conceito com duas redações

### B1 · "Vincule uma matrícula" × "Vincule a uma matrícula"

```
Rota:          Documentos do Cliente → Anexar / Vincular / Pré-visualizar
Controle:      aviso de georreferenciamento sem matrícula (três lugares)
Problema:      o mesmo bloqueio tem dois títulos: "Vincule uma matrícula" no Anexar e
               "Vincule a uma matrícula" nos outros dois. A descrição é idêntica nos três.
               Regra 6 — a mesma palavra para o mesmo conceito, sempre
Intervenção:   redação (§4)
Texto final:   título: Vincule a uma matrícula
               descrição: Documentos de georreferenciamento precisam estar vinculados a uma
               matrícula.
Comportamento: inalterado
Marcação:      toast destrutivo, como hoje
Origem:        tela
```

### B2 · "limpar" × "Limpar"

```
Rota:          Documentos do Cliente
Controle:      botão de limpar seleção — no cabeçalho da pasta e dentro do Anexar
Problema:      a mesma ação aparece como "Limpar" no cabeçalho e "limpar" em caixa baixa no
               modal. Dois textos equivalentes têm de sair parecidos (§4)
Intervenção:   redação (§4)
Texto final:   Limpar
Comportamento: inalterado
Marcação:      inalterada
Origem:        tela
```

### B3 · "arquivo(s) ignorado(s)" convive com plural de verdade na mesma tela

```
Rota:          Documentos do Cliente → Anexar documento
Controle:      três contagens — "N arquivo(s) ignorado(s)", "N não enviado(s)",
               "N arquivo(s) selecionado(s)"
Problema:      a mesma tela pluraliza de verdade ("1 documento" / "N documentos",
               "selecionado" / "selecionados") e, nos toasts do Anexar, usa "(s)". O "(s)"
               é marca de texto que ninguém revisou, e o vizinho prova que dá para fazer
               certo
Intervenção:   redação (§4)
Texto final:   1 arquivo ignorado / N arquivos ignorados
               1 arquivo não enviado / N arquivos não enviados
               1 arquivo selecionado / N arquivos selecionados
Comportamento: inalterado
Marcação:      inalterada
Origem:        tela
```

### B4 · O sufixo do rótulo repete a mensagem que já está abaixo dele

```
Rota:          Documentos do Cliente → Anexar documento
Controle:      rótulo "Vincular a (obrigatório para georreferenciamento)"
Problema:      quando a categoria é georreferenciamento, o rótulo diz "(obrigatório para
               georreferenciamento)" e três linhas abaixo aparece "Selecione uma matrícula
               para anexar documentos de georreferenciamento." A mesma ideia, duas vezes,
               uma delas dentro do rótulo — que tem teto de 30 caracteres
Intervenção:   redação (§4, regra 5) — encurtar o sufixo; a razão fica na mensagem
Texto final:   Vincular a (obrigatório)
Comportamento: o sufixo continua trocando com a categoria; a mensagem abaixo continua
               aparecendo só quando falta a matrícula
Marcação:      inalterada
Origem:        tela
```

---

## C. Degrau 5 — sai da tela

### C1 · A nota da barra lateral da pré-visualização

```
Rota:          Documentos do Cliente → Pré-visualizar
Controle:      <p> "Classifique o vínculo deste documento sem fechar a pré-visualização."
Problema:      explica o óbvio (regra 4). A pessoa está com a pré-visualização aberta e o
               seletor de vínculo na frente dela; a frase descreve o que ela está vendo
Intervenção:   nenhuma — remover o texto
Texto final:   —
Comportamento: a barra lateral continua igual, sem a legenda
Marcação:      —
Origem:        tela
```

---

## D. Intervenção: nenhuma — analisados e autoexplicativos

A árvore foi aplicada e parou no degrau 5. Estão aqui para ficar registrado que foram olhados.

| Controle | Por que nada muda |
|---|---|
| Árvore de pastas (Pessoas / PF / PJ / Bens / Matrículas / Sem vínculo) | Rótulos são substantivos de 1–2 palavras, com contagem ao lado. Degrau 2 já cumprido: o número está visível, não explicado |
| "Todos os documentos" | Rótulo da opção "todos" — a exceção escrita na §3; casa com o nó da árvore |
| Contagem "N de M selecionados" | Mostra o valor em vez de explicá-lo (degrau 2), e pluraliza certo |
| Botão "Baixar N em .zip" | O texto é o próprio andamento ("Compactando…", "Baixando 3/8…"). Uma ideia, nome no infinitivo |
| Botão "Anexar" e "Anexar o primeiro" | Nome da ação; o segundo é o estado vazio convidando ao primeiro uso |
| Estado vazio "Nenhum documento nesta pasta." | Texto de lista vazia — específico por decisão de 11/09, nomeia o que não foi achado |
| "Carregando…" | Reticências canônica, sem ponto |
| "Selecione um cliente na barra acima para navegar pelos documentos." | Mensagem contextual correta: depende do estado, diz o que fazer, e a pessoa não está olhando para o seletor |
| Alternador "Recebido do cliente" / "Produzido pela PSA" | Dois rótulos de 3 palavras que nomeiam a origem. Melhorar o rótulo (degrau 1) não tem o que melhorar |
| Sufixos "(opcional)" em Tipo, Vincular a e Categoria | Mesma forma nos três campos; é restrição que vale toda vez e está colada ao rótulo |
| "Arraste os arquivos aqui" + "PDF, imagens ou Office · até 50 MB cada" | Instrução de formato no lugar certo (permanente, visível), e o limite é informação necessária para decidir — não pode depender de hover |
| Descrição do Anexar ("Tipo, vínculo e categoria são opcionais — deixe como estão para organizar/vincular depois.") | Uma ideia, começa pela informação que faz decidir, e usa travessão de verdade |
| Descrição do Renomear ("Altera apenas o nome exibido… o arquivo no armazenamento não é alterado.") | A distinção é necessária antes de agir, e está visível, não em hover. "Armazenamento" é português, não jargão |
| Descrição do Vincular (`Deixe "Sem vínculo" se ainda não souber.`) | Dá a saída para o caso em que a pessoa não sabe — o oposto de explicar o óbvio |

---

## E. O go-live — o que foi perguntado, e onde cai

Fonte: transcrição da reunião de **09/09/2026**, "Reunião OSG — Solicitação e cadastro de
documentos" (13 participantes, 55 min). Ela não está no repositório; a leitura foi feita a partir
do arquivo de anotações do Gemini.

**Duas perguntas foram feitas na sala.** O resto da reunião é o Alexandre narrando a demonstração
— e narração não é pergunta. A distinção importa: o briefing da AUD-01 diz que *"pergunta feita no
go-live é explicação que falta na tela"*, e o que alguém explica sem ser perguntado é evidência do
mesmo tipo, mas mais fraca. As duas estão separadas abaixo, e nenhuma foi inventada.

### E1 · Thiago Santos — "qual a finalidade de cadastrar aqueles documentos?"

> *"Eu só queria perguntar sobre a qualificação das partes ali, qual que é a finalidade de
> cadastrar aqueles documentos? Se ele vai ficar vinculado nesse sistema OSG Work ou se ele vai
> nos dar um documento de qualificação pronto?"* — 00:29:35, repetida em 00:31:48 (*"mas então vai
> sair uma qualificação pronta, não é isso ou não?"*)

Precisou de **dois minutos e duas pessoas** para ser respondida (Alexandre e Bernardo): os dados
alimentam o checklist, a calculadora de ITCMD, o quadro societário e a geração de contratos.

**Rota: Qualificação das Partes.** Fora do escopo da TIP-02 → vai para a **TIP-03**. Registrada
aqui com a citação para não se perder.

### E2 · Luana Stelle — "quem é que vai receber a notificação?"

> *"da forma que tá mostrando aí para mim, eu não consigo visualizar quais são os representantes
> que estão dentro da plataforma do cliente, porque isso vai estar lá no cadastro inicial. Tudo
> bem que a pessoa vai ser notificada, mas como que eu vou saber que os dados estão corretos?"*
> — 00:39:01, retomada em 00:45:33 e fechada em 00:47:00

Foi a discussão mais longa da reunião (8 minutos, três pessoas). O caso real: o cliente nomeia um
administrador ou funcionário como representante, e o assistente que acompanha o projeto não tem
acesso à OS para conferir quem está lá.

**Já foi respondida por código.** Virou a **GO-09** — *"Destinatário do aviso: mostrar quem recebe,
e deixar escolher"* —, concluída em 11/09. Intervenção de texto: **nenhuma**. Fica registrada
porque é a única pergunta do go-live que já tem resposta entregue, e isso é informação.

### O que foi explicado sem ninguém perguntar — e cai nesta rota

Duas passagens da demonstração são sobre a tela **Documentos do Cliente**:

> *"no módulo de documentos, na aba de explorador de arquivos, vocês vão ter a lista de todos os
> documentos dos clientes. **Conforme vocês forem vinculando, ele já vai fazendo o cadastro
> automático.**"* — 00:30:32

> *"esse campo de anexar documentos aqui à parte é normalmente **quando o cliente manda pro
> WhatsApp, ele manda por algum meio externo** e aí vocês precisam anexar manualmente."* — 00:30:32

A segunda virou ficha. A primeira não — ver abaixo.

```
Rota:          Documentos do Cliente → Anexar documento
Controle:      descrição do diálogo
Problema:      "Anexar" não diz PARA QUE serve, e a resposta é a primeira coisa que o
               Alexandre explicou ao chegar nela: é o caminho do arquivo que chegou FORA
               da plataforma (WhatsApp, e-mail, em mãos). A descrição atual começa por
               "Arraste ou escolha arquivos (ou uma pasta)", que é o que a área de soltar
               e os dois botões abaixo já dizem — explica o óbvio (regra 4). E a segunda
               frase ("Tipo, vínculo e categoria são opcionais") repete o "(opcional)" que
               já está nos três rótulos
Intervenção:   redação (§4, regras 1 e 4) — a informação que faz decidir vem primeiro, e
               o que já está na tela sai
Texto final:   Para arquivos que chegaram fora da plataforma — por WhatsApp, e-mail ou
               em mãos.
Comportamento: inalterado
Marcação:      DialogDescription, como hoje
Origem:        go-live (00:30:32, narração)
```

```
Rota:          Documentos do Cliente
Controle:      a árvore de pastas
Problema:      ninguém na sala soube, pela tela, que as pastas nascem sozinhas dos
               vínculos — o Alexandre precisou dizer
Intervenção:   nenhuma
Texto final:   —
Comportamento: —
Marcação:      —
Origem:        go-live (00:30:32, narração)
```

**Por que nenhuma.** O vínculo não se faz aqui: ele se faz no *Cadastro por documento*, que é
outra rota (Onboarding). Explicar nesta tela de onde vêm as pastas é explicar o efeito no lugar
errado — e o degrau 2 já está cumprido, porque a contagem ao lado de cada pasta mostra o
resultado em vez de descrevê-lo. Se a dúvida for real, ela pertence à tela onde o vínculo
acontece, e é item da TIP-03.

### O que a transcrição manda para a TIP-03

Passagens em que a demonstração precisou explicar o que a tela não diz, todas **fora** das duas
rotas desta tarefa. Ficam listadas com o minuto para quem pegar a TIP-03 não reassistir a gravação:

| Onde | O que precisou ser explicado | Minuto |
|---|---|---|
| Solicitação Inicial | o que são os "documentos opcionais" (*"é basicamente o que não veio"*) | 00:12:43 |
| Solicitação Inicial | que editar a descrição de um documento **vale só para aquele cliente**, e o padrão global continua — a Patrícia precisou dizer isso **duas vezes** | 00:14:13 e 00:15:34 |
| Solicitação Inicial | o que faz "atualizar a partir da OS" (repuxar os documentos quando o produto estava errado) | 00:15:34 |
| Solicitação Inicial | que finalizar **trava** a solicitação e grava um retrato do estado | 00:48:26 |
| Solicitação Inicial | que editar a lista depois do checklist **vale para todas as pessoas** (*"se eu tirar CPF, ele tira de todas"*) | 00:49:47 |
| Cadastro por documento | o que significa marcar "não se aplica", e que a marca vale para a fase seguinte | 00:23:28 |
| Checklist | que o aviso ao cliente é **manual** por decisão, não por falta de automação | 00:37:08 |

**Uma dúvida citada e não registrada:** a Patrícia menciona em 00:52:45 que *"a Daniela já até
mandou algumas dúvidas"* pelo suporte. Não estão na transcrição. Se existirem em outro lugar,
entram aqui.

---

## F. Um achado fora do escopo, registrado para não se perder

O mesmo bloqueio de georreferenciamento existe em **`documentos/DocumentosTab.tsx:61`**, ainda com
o título divergente `Vincule uma matrícula`. Aquele componente **não é desta rota** — ele vive nas
abas de documento do Cadastro Patrimonial e da Qualificação das Partes (`BemModal`,
`MatriculaModal`, `PessoaModal`). Não foi tocado aqui porque está fora do escopo declarado da
TIP-02, e alinhá-lo é uma linha para quem pegar essas rotas na TIP-03.

## Ordem de implementação

1. **A1 e A2** primeiro: são acessibilidade, e a A2 é regressão de ontem.
2. **A3**: desce um dos 226 do inventário da catraca.
3. **A4, B1 a B4, C1**: redação, todas mecânicas.

Nenhuma exige migração, RPC ou policy. Tudo é edição de tela.

**Depois de aplicar:** rodar `bunx vitest run src/lib` — a catraca do `title=` e a do placeholder
moram lá, e a A3 muda o número do placeholder, que desce no mesmo commit.
