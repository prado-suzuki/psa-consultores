# Nomenclaturas e tooltips do OSG Work — a conferência

> **O que é.** Percorrer as telas do OSG Work **controle por controle**, decidir o que muda e
> escrever o texto final, para que a tela se explique sozinha em vez de a dúvida ser respondida
> por treinamento. A régua é [`geral/texto-explicativo-na-tela.md`](../geral/texto-explicativo-na-tela.md),
> em vigor desde 17/09/2026.
>
> **A unidade é o controle, não o arquivo.** Um arquivo pode sair com oito fichas ou com nenhuma.
>
> **Nem todo controle precisa de tooltip.** Quando o problema é o nome, a correção é o nome.
> **"Intervenção: nenhuma" é resultado válido** e fica registrado — na rota `/documentos`,
> 14 dos 23 controles fecharam assim.
>
> **Banco: não**, com uma exceção — as descrições dos modelos (B-14) são dado de produção
> (`tmpl_documento.descricao`), não código.
>
> **Depende de:** nada. Quatro decisões da Patrícia travam itens específicos, nenhuma trava a frente.
> A quinta, a palavra do arquivo sem dono, **foi decidida em 24/09: fica "Sem vínculo", em todos os lugares.**

**Lista de trabalho para distribuir:** <https://claude.ai/artifact/Npz8BHj3xvi2xChYZ7sa9f> —
os mesmos itens, filtráveis por responsável, com marca compartilhada de "conferido na tela".
A página também **monta o prompt de validação por rota**: escolhe-se a rota, copia-se o texto e
cola-se na extensão do Claude com a tela aberta. O prompt pede confirmação do que já foi medido,
proíbe redação nova e termina perguntando o que apareceu na tela e não está em item nenhum.

**Custo:** 63,5 h de execução nos 46 itens, mais 14 h de varredura nas oito rotas que nunca
tiveram ficha. A hora é de **execução do PR com o texto já escrito** — decidir e redigir não
entram na conta, e decisão não tem hora.

## Nada disto começa do zero

Três passadas já aconteceram e **não se refazem**:

| Passada | Recorte | Estado |
|---|---|---|
| [`AUDITORIA_TIP-02`](../sprints/sprint-13/AUDITORIA_TIP-02_documentos-do-cliente.md) | `/documentos`, controle a controle, 23 fichas | Executada 18/09. 2 validações abertas |
| [`Ajustes_Demais_Rotas`](../sprints/sprint-13/Ajustes_Demais_Rotas_OSG_Work_para_Tarefas.md) | nomenclatura e navegação das demais rotas | Executada 18/09. 3 validações abertas |
| [`ajustes-ux-estrutura-do-cliente`](../osg/ajustes-ux-estrutura-do-cliente.md) §4 | os 12 rótulos dos botões de ícone das 5 telas | Aprovada 21/09, **não executada** — é a tarefa [2026_09_23_consistencia…](2026_09_23_consistencia-das-telas-de-estrutura-do-cliente.md) |

As cinco validações abertas estão em
[`2026_09_18_pendencias-de-validacao-tip02-tip03.md`](2026_09_18_pendencias-de-validacao-tip02-tip03.md)
e aparecem abaixo como itens A-03, A-08, A-10, E-05 e E-06.

## O que a medição desmentiu

A TIP-03 se dá por executada em 18/09, e está certa pela metade. Conferido **no código** em
23/09, não no que o documento diz de si mesmo:

- **Já no código:** B-11, B-12, A-01 e E-07 — mais o B-18, que já estava marcado.
- **Pela metade:** A-02 (a frase do estado vazio padronizou nas dez telas, o verbo não) e
  A-07 (os `ex:` minúsculos zeraram, as buscas seguem com `...`).
- **Só o filtro:** B-07 — "Órfãs (!)" virou "Órfãs", mas as três marcas da linha continuam.
- **Achado novo:** o A-02 não é mais "aplicar a forma canônica"; é **fechar no verbo**, porque
  hoje convivem "abrir", "ver", "ver e gerenciar", "navegar pelos" e "apurar".

Os caminhos do anexo envelheceram: o texto do checklist mudou de arquivo e o do sócio de
linha. **Procure pelo texto, não pela linha.**

### E o que a remedição de 24/09 corrigiu na própria conferência

Quatro itens estavam medidos por baixo, ou medidos errado:

- **A-02 são 15 telas, não dez.** A contagem de 23/09 deixou de fora Quadro Societário, Órgãos,
  Protocolo, Qualificação e Relatórios. Dez frases fecham no cânone — "…para **abrir** {o quê}
  **deste cliente**". **Cinco** fogem, e fogem duas vezes: trocam o verbo *e* largam o "deste
  cliente" — `ver` (Checklist), `navegar pelos` (Documentos), `ver e gerenciar` (Exploração
  Rural), `visualizar e gerenciar` (Quadro Societário) e `apurar` (Calculadora).
- **E-09 são 13 pontos, não sete**, em 12 arquivos, já descartados os `Number(s)` e afins que
  são identificador de código e não texto de tela.
- **P-04 não são duas versões commitadas.** O arquivo tem **um único commit** (`26e4c87f`), que
  é o próprio `HEAD`, com 508 linhas; o disco tem 358 e o `git diff` contra o `HEAD` acusa
  **+134 / −284**. É uma alteração local **nunca commitada** — e que morre em qualquer limpeza
  da árvore de trabalho. A decisão não é "qual versão vale": é commitar ou descartar.
- **P-06 deixou de ser decisão.** O `App.tsx` tem 20 rotas e o `navegacaoOsgWork.ts` declara 19
  `path:`. Os números **batem**: 20 = o hub + as 19 telas. Errados estão três comentários do
  arquivo, que falam em "as 17 telas" (linhas 17 e 74) e na "17ª tela" (linha 179). São 0,5 h de
  conserto, não uma pergunta para você.

E dois itens ficaram mais estreitos do que estavam escritos:

- **A-03:** restam 38 "ITCD" no `src` e **nenhum é rótulo de tela** — são comentário, nome de
  teste, mensagem de `throw` e as citações da GIA-ITCD-e da SEFAZ/MT, que é o nome real do
  formulário. O `checklistPadrao.ts` **já diz "GIA / DAR de ITCMD"** (linha 27): o ITCD saiu do
  catálogo sem passar pela área fiscal, e a pergunta virou a inversa — quem procurar pelo nome
  do formulário de MT não acha.
- **E-11:** o `BOTOES_DA_TIP_02` tem exatamente sete caminhos, e o `TITLE_NATIVO_LEGADO` é **0**.
  A catraca do `title` nativo não guarda dívida nenhuma; o que falta é só ampliar o recorte.

## Cobertura das 20 rotas

O router tem 20 rotas sob `/equipe/osg/work` (o hub mais 19 telas).

A coluna **Varredura** é o custo de passar a rota controle a controle onde isso ainda não
aconteceu. Ela **não** inclui os itens já fichados acima — esses já estão contados por item.

| Rota | Quem | O que falta | Varredura |
|---|---|---|---|
| `/` (hub) | **sem dono** | varredura inteira; nunca passou por régua de texto | 1 h |
| `…/onboarding` | Alexandre | commitar ou descartar a edição local do plano; conferir o que ele não cita | — |
| `…/onboarding/cadastro` | Eduardo | varredura; o vocabulário do arquivo sem dono | 2 h |
| `…/qualificacao-das-partes` | Bernardo | executar a §4; o par "8 CNPJs" × "Pessoas Jurídicas" | — |
| `…/quadro-societario` | Bernardo | executar; a PJ sem Papel que não vira aba | — |
| `…/diagnostico-patrimonial` | Bernardo | a conferência visual da §8; o nome do relatório | 1 h |
| `…/controle-matriculas` | Bernardo | as três marcas da órfã; os quatro `title=` legados | — |
| `…/exploracao-rural` | Alexandre | combinar com o Bernardo: a tela está na tarefa dele | — |
| `…/governanca/orgaos` | Eduardo | varredura controle a controle | 2 h |
| `…/governanca/matriz` | Eduardo | varredura controle a controle | 2 h |
| `…/governanca/acordo` | Eduardo | varredura; o cabeçalho de duas linhas | 2 h |
| `…/governanca/protocolo` | Eduardo | varredura controle a controle | 2 h |
| `…/biblioteca-modelos` | Bernardo | cabeçalhos em slug; o cartão que repete o título | — |
| `…/montagem-documentos` | Bernardo | os badges em slug; a ação duplicada | — |
| `…/gerar-documento` | Bernardo | as descrições dos modelos | — |
| `…/documentos` | Eduardo | as duas validações abertas; o subtítulo | — |
| `…/checklists` | Alexandre | os quatro nomes acessíveis que o teste não encontra | — |
| `…/calculadora-itcmd` | **sem dono** | a pendência fiscal do nome do documento no catálogo | — |
| `…/relatorios` | Alexandre | a mensagem de erro que culpa a Edge Function | — |
| `…/apresentacoes` | Alexandre | varredura controle a controle | 2 h |

**14 h de varredura**, oito rotas — e seis delas são do Eduardo.

## O roteiro de validação em tela

Medido em produção por SELECT em **24/09** (MCP do Lovable, só leitura), porque metade dos itens
não se vê sem o cliente certo aberto — e trocar de cliente é o movimento caro. O roteiro é por
**sessão**, não por rota: abre-se um cliente e esgota-se o que ele consegue mostrar.

O que o banco disse, e que reorganiza tudo: **existem só dois clientes reais com cadastro OSG**
(Mms Agro e Família Lunardi), um terceiro que só tem documento (Bombonatto/Frigobom) e mais seis
que são de teste. Um deles, `Ÿ Osg - Teste 1`, está marcado `ambiente = prod` sem prefixo — é a
tarefa [2026_09_22 · prefixo `[TESTE]`](2026_09_22_prefixo-teste-nos-cadastros-de-dev.md)
aparecendo aqui.

### Sessão 1 — Família Lunardi (prod)

*0 bens · 8 matrículas, todas as 8 órfãs · 9 arquivos, nenhum sem vínculo · 1 solicitação · 4 PJ, todas com papel*

É o cliente mais rico do roteiro, porque os zeros dele são justamente os estados que ninguém
consegue reproduzir de propósito.

| Item | Rota | Por que este cliente |
|---|---|---|
| B-07 | `…/controle-matriculas` | **é o único cliente com matrícula órfã em todo o banco**, e são 8 de 8 — as três marcas aparecem em toda linha |
| A-05 | `…/relatorios` | zero bens: "Imprimir" e "Gerar apresentação" clicáveis sem nada a gerar |
| E-03 | `…/documentos` | 9 arquivos: dá para ver o subtítulo prometendo consulta e o "Anexar" duplicado |
| E-04 | `…/onboarding/cadastro` | balde **vazio** — é o estado em que o zero é dito quatro vezes |
| P-02 | `…/diagnostico-patrimonial` × `…/relatorios` | a conferência visual da §8, com a ressalva de que a lista de bens está vazia |

### Sessão 2 — Mms Agro (prod)

*2 bens · 2 matrículas, nenhuma órfã · 2 solicitações · 7 pessoas · 2 PJ, ambas com papel*

| Item | Rota | Por que este cliente |
|---|---|---|
| B-08 | `…/diagnostico-patrimonial` | é o único cliente real com bem: a coluna Status tem o que mostrar |
| B-09 | `…/qualificacao-das-partes` | o sub-rótulo do seletor contra o card de Pessoas Jurídicas |
| B-04 | `…/qualificacao-das-partes` × `…/quadro-societario` | o mesmo campo como "Papel", "Tipo Empresa" e selo sem rótulo |
| A-09 | `…/onboarding` | duas solicitações: os botões do topo e o modal de encerrar |

### Sessão 3 — Bombonatto / Frigobom (prod)

*288 arquivos, os 288 sem vínculo · nenhuma pessoa cadastrada*

**É o único cliente do banco em que o balde tem conteúdo.** Sem ele, E-01 e E-02 não se validam.

| Item | Rota |
|---|---|
| E-01 · P-01 | `…/documentos` e `…/onboarding/cadastro`, em sequência, para ver as quatro palavras |
| E-02 | `…/onboarding/cadastro` — os rótulos do painel com 288 itens dentro |
| E-04 (cheio) | o contrário da sessão 1: a pílula, o contador, o cabeçalho e o botão lendo a contagem |

### Sessão 4 — qualquer cliente sem solicitação

`Ÿ Osg - Teste 1` serve, e também os `[TESTE]`. Fecha o **A-05 no Checklist**, que é o par do
A-05 dos Relatórios e precisa de um estado que os dois clientes reais não têm.

### Sessão 5 — sem cliente, e a barra lateral

**E-12**, o grupo de menu com um item só, não depende de cliente nenhum: é olhar a barra.

### Sessão 6 — as oito varreduras

Hub, Cadastro por Documento, Órgãos, Matriz, Acordo, Protocolo, Apresentações e a conferência
visual do Cadastro Patrimonial. São as 14 h, e podem sair com o cliente da sessão 2 aberto.
O prompt da página já sai em modo varredura para Matriz, Protocolo e Apresentações, que não têm
item fichado nenhum.

### O que NÃO dá para validar em tela hoje

Levantado no mesmo SELECT, e é o que evita mandar alguém procurar o que não existe:

- **A-06 — não há uma única exploração rural em produção.** Nenhum cliente, nenhum registro. Os
  seis tipos de instrumento não se veem degradando porque não há o que abrir. Validar exige
  **criar** um registro, e isso não é conferência de texto.
- **B-10 — nenhum cliente real reproduz.** Os quatro que reproduzem são de teste: `Alessio Sansão`
  e `Barralcool` (2 abas + 1 "Sócia" cada, ambos `dev`) e `Ÿ Osg - Teste 1` e `Agro Amazônia`
  (só PJ sem papel). Mms Agro e Família Lunardi têm **todas** as PJ com papel. O defeito é real e
  o texto continua faltando — mas hoje ele não atinge cliente nenhum de verdade, e isso muda a
  ordem em que ele entra.
- **A-04** — precisa forçar uma falha com a Edge Function **publicada**, não olhar a tela.
- **E-06** — precisa de cliente com produto da área **sem** projeto criado; não foi medido.
- **B-06** — não é validação visual: é nome acessível, e pede leitor de tela ou o inspetor de
  acessibilidade do Chrome.

### E o que o SELECT já fechou, sem tela nenhuma

- **B-17 continua valendo, medido em 24/09:** o modelo "Teste V1" está `ativo = true` em
  produção, tipo `teste`, descrição `"teste"`, na mesma grade dos outros sete.
- **B-14 são 8 modelos, todos ativos** — não "as descrições", que sugeria um número aberto.
  Cinco têm jargão interno: `edge function gerar-apresentacao` (duas vezes), "montado a partir
  do modelo da Patrícia" mais "blocos fatiados por tipo estrutural", "Ligue o binding do imóvel
  a uma matrícula no passo de registros", e o `"teste"` do B-17. Duas já falam do documento
  (Composse Rural e Parceria Rural) e **não se mexe nelas**. E há um achado novo: **"Contrato
  Social - (Participações)" tem `descricao` nula** — o cartão dele sai sem descrição nenhuma.
- **B-13 confirmado:** os seis `tipo` de `tmpl_documento` são exatamente os seis slugs que a
  conferência listou nos badges.

## A ficha, que é o entregável

Uma por controle com intervenção; uma linha na lista dos sem intervenção, para os outros.
O formato é o da auditoria TIP-02, que já rodou uma rota inteira assim.

```
Rota:          Documentos do Cliente
Controle:      botões Renomear / Vincular / Baixar / Excluir, na linha de cada documento
Problema:      são botões só de ícone com <Tooltip> e SEM aria-label
Intervenção:   degrau 0 — marcação (o texto do balão já existe e fica)
Texto final:   Renomear · Vincular documento · Baixar · Excluir documento
Comportamento: o mesmo de hoje; o balão continua abrindo no hover
Marcação:      ButtonTooltip de @/components/ui/button-tooltip
Origem:        tela
```

## Bernardo — Estrutura do Cliente e Oficina de Contratos

| Id | Controle | Estado do texto | Horas |
|---|---|---|---|
| B-01 | os botões só de ícone das 5 telas (4 mecanismos diferentes) | **escrito** — os 12 rótulos estão na §4 | 4 |
| B-02 | "Remover" sem nome nenhum, `MatriculasSection.tsx:47` | **escrito** — §4 | 0,5 |
| B-03 | explicação presa num `title` de botão desabilitado, `TitularidadeLinha.tsx:88` | **escrito** — vira texto de apoio | 1 |
| B-04 | o campo "Papel", com três nomes e quatro cópias do mapa PR/CN/SC | **escrito** | 4 |
| B-05 | o filtro "Integraliz-" → "Participa da estruturação" | **escrito** | 1 |
| B-06 | buscas e filtros sem nome acessível nas 5 telas | **escrito** — ⚠️ `aria-label`, não `<label>`: o Select do Radix dispara o clique duas vezes | 3 |
| B-07 | as três marcas da matrícula órfã | **decisão da Patrícia** (layout). O filtro "Órfãs (!)" já foi corrigido | 1,5 |
| B-08 | a regra de elegibilidade do bem, na lista | **decisão da Patrícia** (layout) | 1,5 |
| B-09 | "8 CNPJs" × "Pessoas Jurídicas (0)" | **escrito** — o seletor é da frente do Alexandre; combinem | 0,5 |
| B-10 | a PJ sem Papel que não vira aba | **falta escrever** (3 estados) | 2 |
| B-11 | "vai à junta e carimba o ledger" / "não mexe na sociedade" | ✅ **já no código** (medido 23/09). Sobra a frase de apoio abaixo do seletor | 0,5 |
| B-12 | "Flag de composição" / "Todas as flags" | ✅ **já no código** (medido 23/09) | — |
| B-13 | badges com a chave do banco (`instrumento_agrario`, …) | **falta escrever** (6 rótulos) | 1 |
| B-14 | descrições dos modelos ("binding", "edge function", nome de quem redigiu) | **falta escrever** — ⚠️ é dado de produção | 1,5 |
| B-15 | o cartão que repete o próprio título; cabeçalhos em slug | **falta escrever** | 2 |
| B-16 | a metáfora interna da Montagem, e a ação duplicada | **escrito** | 1 |
| B-17 | o modelo "Teste V1" ativo no catálogo | **decidido 22/09**: desativar | 0,5 |
| B-18 | o subtítulo de Gerar Documento | **já executado** — conferido no código em 23/09 | — |

**Bernardo: 25,5 h.**

## Alexandre — barra de cliente, Solicitação, Relatórios, Checklist, Rural

| Id | Controle | Estado do texto | Horas |
|---|---|---|---|
| A-01 | `Selecione um cliente...` no seletor | ✅ **já no código** (medido 23/09) | — |
| A-02 | **15** estados vazios: a frase padronizou, o verbo não | **falta escrever** — 10 usam "abrir … deste cliente"; **5** fogem: "ver", "navegar pelos", "ver e gerenciar", "visualizar e gerenciar" e "apurar" | 1 |
| A-03 | ITCD × ITCMD | **executado 18/09** — o catálogo já diz ITCMD; falta a área fiscal dizer se o nome do formulário de MT some de vez | 0,5 |
| A-04 | o `catch` único dos Relatórios, que sempre culpa a Edge Function | **falta escrever** | 1,5 |
| A-05 | "Imprimir" e "Gerar apresentação" habilitados sem dado | **falta escrever** a razão | 2 |
| A-06 | os 4 de 6 tipos que a Exploração Rural não trata | **falta decidir, depois escrever** | 2 |
| A-07 | placeholders fora do cânone | **metade feita**: os `ex:` zeraram no repositório inteiro; as duas buscas do módulo seguem com `...` | 0,5 |
| A-08 | `FichaFormularios.tsx:71` e `CartorioSelect.tsx:125,217` | **decisão**: perdem a referência ao objeto ou não? | 0,5 |
| A-09 | as sete fatias aprovadas da Solicitação | **escrito** — ⚠️ o plano de onde saem os textos só existe commitado; o disco tem uma edição não commitada 284 linhas menor | 8 |
| A-10 | quatro nomes acessíveis divergentes entre tela e teste, no Checklist | **falta decidir** qual nome fica | 1,5 |

**Alexandre: 17,5 h** — metade delas no A-09, que é a única frente de comportamento desta lista.

## Eduardo — Documentos, Cadastro por Documento, Governança, lote de texto

| Id | Controle | Estado do texto | Horas |
|---|---|---|---|
| E-01 | o arquivo sem dono, com quatro nomes ("Sem vínculo", "balde", "sem dono", "gaveta") | ✅ **escrito** — decidido em 24/09: **"Sem vínculo"** no rótulo, no filtro e no nome da pasta, nas duas telas. "Balde" e "gaveta" viram apelido interno | 1,5 |
| E-02 | os textos do painel do balde | **falta escrever** — tooltip só onde explica consequência. **Destravado**: a palavra é "Sem vínculo" | 3 |
| E-03 | o subtítulo de Documentos do Cliente | **falta escrever** | 1,5 |
| E-04 | o zero dito quatro vezes no Cadastro por Documento | **falta escrever** o rótulo do botão; as outras três menções saem. As que ficarem usam **"sem vínculo"** | 2 |
| E-05 | "Trazer para o checklist" — o texto novo omite uma consequência | **validar antes de encurtar** | 1 |
| E-06 | o rail de produtos | **comportamento antes do texto** | 0,5 |
| E-07 | "Digite e tecle Enter" como placeholder | ✅ **já no código** (medido 23/09), com redação melhor que a proposta | — |
| E-08 | o cabeçalho do Acordo de Quotistas | **decisão da Patrícia** (layout) | 1,5 |
| E-09 | o plural entre parênteses, "arquivo(s)" | **falta escrever** — **13 pontos em 12 arquivos** (medido 24/09), num lote só | 3 |
| E-10 | reticências `...` e travessão `--` | trocar pelo caractere; a catraca de placeholder fora do cânone está congelada em 215 | 2 |
| E-11 | a catraca não enxerga `title=` dentro de `<Button>` fora dos 7 arquivos da TIP-02 | ampliar o recorte — acende 5 arquivos fora do módulo | 3 |
| E-12 | grupo de menu com um item só; rota × rótulo | **escrito** | 1 |
| E-13 | o nome da quarta tela de Governança | ✅ **decidido em 24/09: "Protocolo de Remuneração"**, que é o nome do código inteiro (navegação, títulos, avisos, arquivo gerado). "Protocolo Familiar" não existe no repositório e sai da lista de trabalho e da conversa | — |

**Eduardo: 20 h.** O E-10 e o E-11 não são de tela: são catraca e substituição de caractere,
e podem sair antes de qualquer decisão sua.

## O que trava, e é decisão da Patrícia

1. ~~**A palavra do arquivo sem dono.**~~ **Decidido em 24/09: "Sem vínculo", em tudo.** Destravou E-01,
   E-02 e também o **E-04**, que a lista dava como independente e não era — a pílula e o cabeçalho
   dele dizem "sem dono" hoje, e passam a dizer "sem vínculo".
2. **O nome do relatório: as fontes se contradizem.** A TIP-03 §9 registra que o relatório
   **mantém** "Diagnóstico Patrimonial" porque ali a palavra é literal; o EX-16 da compilação de
   22/09 diz que fica um nome só em toda a interface e o relatório muda junto. Hoje a mesma tela
   mostra os dois, mais uma terceira forma em minúscula no subtítulo. A conferência visual pedida
   na §8 da TIP-03 também continua devendo.
3. **Duas rotas sem dono:** o hub e a Calculadora de ITCMD não aparecem na lista de frentes de 23/09.
4. **O plano da Solicitação: commitar a edição local ou descartá-la.** Medido em 24/09, não são
   duas versões commitadas — é uma só (`26e4c87f`, que é o `HEAD`) mais uma edição no disco que
   tira 284 linhas e nunca foi commitada. Enquanto ficar assim ela morre em qualquer limpeza da
   árvore de trabalho. Trava A-09.
5. **Os três itens de layout** — B-07, B-08 e E-08. Ela decide, o Eduardo executa; os filtros
   ficam com o Alexandre.

O sexto item desta lista **saiu**: o inventário de rotas fecha (20 no router = o hub + as 19
telas do `navegacaoOsgWork.ts`). O que sobrou é conserto de três comentários mentirosos no
`navegacaoOsgWork.ts`, e isso não é pergunta para ninguém — é o P-06, 0,5 h, em qualquer PR
desta frente.

## O que já está certo, e não se mexe

- Os estados vazios de Órgãos de Governança, Matriz de Alçadas, Acordo de Quotistas, Quadro
  Societário e Checklist explicam o conceito e oferecem a saída.
- Os modais de exclusão da Exploração Rural e do bem contam a consequência em cascata.
- O Acordo de Quotistas recusa o selo de "pronto" e mostra "n de total respondidos".
- A Calculadora prefixa todo erro com o que não aconteceu: "Simulação não gravada: …".
- Os 16 subtítulos das telas foram revisados e estão conformes a "verbo + objeto + finalidade".
- Em `/documentos` ficam os dois bons usos de tooltip: o que explica **de onde o dado vem** e o
  que diz **o que acontece ao clicar**. São a referência do degrau 4.
- O `ButtonTooltip` traz o próprio `TooltipProvider` desde 18/09 — usar ele, nunca `<Tooltip>`
  cru, senão o teste de unidade quebra fora do `App`.
- A catraca do `title` nativo está verde: `GradeDoProtocolo.tsx:96` foi a última ocorrência.

## Pronto quando

- [ ] Cada responsável recebeu a lista dos seus módulos, com o controle, o problema e o texto
      final definidos.
- [ ] Toda rota da tabela de cobertura tem, ou as fichas dos controles com intervenção, ou a
      linha dizendo que passou pela revisão sem intervenção.
- [ ] As cinco decisões acima foram respondidas, e os itens que elas travavam ganharam texto.
- [ ] Nenhum `title=` novo entrou; nenhum texto aprovado foi reescrito no PR.
