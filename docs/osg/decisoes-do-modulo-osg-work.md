# Decisões do módulo OSG Work — a leva de 22/09/2026

**Status:** Aceitas — fechadas pela Patrícia em 22/09/2026, em bloco.
**Data:** 2026-09-22

## Por que este arquivo existe

Em 22/09 as **11 análises do OSG Work** que estavam espalhadas foram fundidas numa lista
única de **75 achados** (54 de experiência de quem usa, 21 de dívida de código), com rota,
método de verificação e ajuste decidido em cada um. Dessa fusão saíram **14 perguntas** que
só a coordenação podia responder — e 11 delas foram respondidas na mesma data.

**Três das onze análises não moram neste repositório** e não aparecem em nenhuma busca por
`docs/`: o artefato "Backlog UX do OSG Work" (36 achados, 18 rotas, 22/09) e os dois Claude
Docs "Auditoria OSG Work — Onboarding" e "Análise OSG Work — Qualificação das Partes"
(ambos 21/09). Quem for reconstituir o raciocínio precisa saber que elas existem: dois dos
oito P0 e o achado do `PageAccessGate` **não estão escritos em documento nenhum daqui**.

A lista consolidada dos 75 vive em
<https://claude.ai/artifact/WwvvC6D5xYEMsjxy6gJ3oy> (privado). Este arquivo guarda o que
não pode depender de um link: **as decisões**.

---

## As onze decisões

### 1. O hub do OSG Work vira trilha, não catálogo

O hub mostra as 18 ferramentas como portas equivalentes e repete a barra lateral — mesmos
grupos, mesma ordem, mesma fonte. Mas a ordem **existe nos dados**: o Quadro Societário
exige empresa PR/CN cadastrada, a Matriz de Alçadas exige Órgãos, o Checklist exige
solicitação enviada, e Gerar Documento exige modelo com blocos.

**Decisão:** o hub passa a mostrar estado por cliente — o que já existe ("12 partes",
"patrimônio vazio") e qual é o próximo passo.

⚠️ **Antes de montar, a ordem canônica precisa ser escrita.** Ela está nas dependências de
dados e em documento nenhum. Sem isso a trilha não sai.

**A Governança ficou fora das 75 análises**, e a varredura dela (24/09/2026, artefato
"Governança do OSG Work") mediu esta dependência: a Matriz sem órgão já diz o que falta e
leva a Órgãos de Governança (`MatrizDeAlcadas.tsx`, estado vazio). É a única dependência da
lista que a tela já resolve; a trilha só precisa exibi-la.

### 2. O modelo "Teste V1" é desativado

Ele está **ativo em produção**, no seletor de Gerar Documento, ao lado do Contrato Social e
da Parceria Rural, com badge "teste" e descrição "teste". Um consultor novo não tem como
saber que não deve escolhê-lo.

**Decisão:** desativar. Modelos internos, quando houver, ficam **separados** do catálogo —
nunca na mesma grade do que se gera para cliente.

⚠️ **Fica em aberto:** quem pode publicar modelo visível a todos. Desativar resolve hoje e
não impede o próximo de aparecer.

### 3. Os decks de apresentação saem do Gerar Documento

"Apresentação Patrimonial PSA" e "Apresentação Societária PSA" estão no seletor com **0
blocos**. Escolher um trava o fluxo, e a única saída oferecida manda para a Montagem de
Documentos — a tela errada, porque esses decks nascem em Relatórios.

**Decisão:** os dois saem do seletor. Relatórios continua o único lugar onde existem.

### 4. O cliente selecionado passa a viver na URL — e só nela

Hoje ele vive em memória (`OsgWorkContext`, `useState('')`, sem `localStorage` e sem URL):
F5 perde o cliente, e link enviado a um colega nunca abre no cliente certo. Vale para as 18
rotas de uma vez.

**Decisão:** cliente na URL. **Nada de lembrar o último cliente no navegador** — o conforto
não paga o risco de abrir a ferramenta já em cima de um cliente sem perceber, que num
dossiê societário é o erro caro.

### 5. Ação que o banco recusa não aparece habilitada

"Desfazer o ato" aparece habilitado para qualquer membro da equipe, mas o `DELETE` de
`movimentacao_quotas` e `quadro_societario` exige admin; pessoa, bem e matrícula exigem
líder. A pessoa lê um diálogo dizendo que a ação é definitiva, confirma, e leva recusa do
servidor.

**Decisão:** a regra do banco está certa e não muda. A tela passa a respeitá-la —
**desabilitando com a frase que diz quem faz**, não escondendo. Esconder faz a pessoa
procurar onde não existe.

### 6. O arquivo sem dono tem uma palavra só na tela

O mesmo conceito — arquivo recebido que ainda não pertence a ninguém — tem quatro nomes
entre duas telas vizinhas: "Sem vínculo" em Documentos do Cliente, e "balde", "sem dono" e
"gaveta" no Cadastro por Documento.

**Decisão:** uma palavra só na interface. **"Balde" e "gaveta" ficam como apelido interno**
— podem seguir no código e na conversa, não na tela.

⚠️ **Fica em aberto:** qual palavra fica.

### 7. Remover documento de solicitação já enviada passa a confirmar

Hoje é um clique, e o item some da lista que o cliente está vendo no portal. O código
registra "a válvula é um clique só" como decisão deliberada — por isso a mudança precisava
de decisão, não de correção.

**Decisão:** confirma **depois do envio**, dizendo o que o cliente deixa de ver. Em rascunho
continua um clique. O que muda depois do envio não é a lista da equipe — é a do cliente.

### 8. O histórico de solicitações abre, não só informa

`buscarSolicitacaoDoCliente` faz `.limit(1)`: traz a ativa, ou a última encerrada. As
anteriores existem no banco e não têm porta nenhuma na ferramenta.

**Decisão:** navegar — as anteriores abrem em **modo consulta**, sem nenhum controle de
edição. Só informar que existem abriria a pergunta "posso ver?" sem resposta, que é trocar
uma frustração por outra, pior.

**Medir antes:** se forem dois clientes com duas solicitações cada, isso é registro e não
frente. A medição pode encerrar a tarefa antes de virar trabalho.

### 9. "Instrumento encerrado" não ganha marca agora

**Decisão: não fazer.** A Exploração Rural tem **zero registros em produção** — e não por
falta de uso: a função `salvar_exploracao_rural` grava uma coluna que não existe mais, então
salvar sempre falhou. Criar comportamento especulativo já havia sido recusado em 21/09 para
o caso da matrícula em exploração rural, e vale o mesmo aqui.

Reabrir quando existir o primeiro contrato de verdade.

### 10. O vocabulário cartorial é traduzido caso a caso

"Fundador", PR/CN/SC, "Impede transferência", "Cancelado" como nome literal de coluna.

**Decisão:** traduzir **o que não é termo técnico de verdade**, mantendo o que é, caso a
caso, dentro do lote de texto. "Papel" já havia sido decidido assim em 21/09.

### 11. Haverá um sistema de toast só, com a regra escrita

`shadcn` e `sonner` convivem, e o `AGENTS.md` **autoriza os dois** — então a inconsistência
volta sozinha a cada arquivo novo.

**Decisão:** escolher um e registrar a regra.

**Medido em 22/09:** 133 arquivos usam o toast do shadcn e 126 o sonner. Praticamente
empatado — **não existe escolha barata, e migrar tudo não se sustenta como frente própria.**
A regra vale para código novo, e a conversão acontece quando o arquivo for tocado.

⚠️ **Fica em aberto:** qual dos dois fica.

---

## O que continua em aberto, e por quê

Três perguntas ficaram, e nenhuma delas é de tecnologia:

- **PJ do tipo "Sócia" fica fora do Quadro Societário?** Uma PJ com Papel nulo ou "Sócia"
  não vira aba e a tela não diz uma palavra. Não há documentação do motivo — pode ser regra
  de negócio, pode ser esquecimento. **Em produção há 4 clientes afetados.** Precisa de quem
  conhece a regra.
- **A área cedida soma entre tipos diferentes de instrumento?** Hoje a validação só soma
  dentro do mesmo tipo. **É pergunta para o jurídico:** sobrepor área cedida por
  instrumentos diferentes é risco real de negócio, ou arrendamento e comodato são raros o
  bastante?
- **A redundância entre `conjuge_id`/`filiacao_*` e a tabela `parentesco`.** Registrada, não
  em pauta. Já houve uma tentativa de unificar que **quase causou perda de dado real**;
  qualquer nova precisa de aprovação explícita antes mesmo do desenho.

## Duas divergências entre fontes, ainda por conferir

Apareceram ao fundir as análises e **não foram resolvidas por inferência**:

- **53 ou 59 pessoas presas por movimento de quota?** A tarefa 3 da sprint 14 diz 53; a
  análise de 21/09 diz 59. Refazer o SELECT antes de escrever o teste que aponta para um
  caso real.
- **"Nenhuma migration" não vale para o módulo inteiro.** Os dois planos de UX estão certos
  no escopo deles. Mas a correção de `salvar_exploracao_rural` **exige migration** — e em
  produção isso é passo humano pelo chat do Lovable.
