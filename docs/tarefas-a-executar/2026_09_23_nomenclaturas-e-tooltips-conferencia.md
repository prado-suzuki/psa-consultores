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
> **Depende de:** nada. Seis decisões da Patrícia travam itens específicos, nenhuma trava a frente.

**Lista de trabalho para distribuir:** <https://claude.ai/artifact/Npz8BHj3xvi2xChYZ7sa9f> —
os mesmos itens, filtráveis por responsável, com marca compartilhada de "conferido na tela".

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

## Cobertura das 20 rotas

O router tem 20 rotas sob `/equipe/osg/work` (o hub mais 19 telas).

| Rota | Quem | O que falta |
|---|---|---|
| `/` (hub) | **sem dono** | varredura inteira; nunca passou por régua de texto |
| `…/onboarding` | Alexandre | resolver qual versão do plano vale; conferir o que ela não cita |
| `…/onboarding/cadastro` | Eduardo | varredura; o vocabulário do arquivo sem dono |
| `…/qualificacao-das-partes` | Bernardo | executar a §4; o par "8 CNPJs" × "Pessoas Jurídicas" |
| `…/quadro-societario` | Bernardo | executar; a PJ sem Papel que não vira aba |
| `…/diagnostico-patrimonial` | Bernardo | a conferência visual da §8; o nome do relatório |
| `…/controle-matriculas` | Bernardo | as três marcas da órfã; os quatro `title=` legados |
| `…/exploracao-rural` | Alexandre | combinar com o Bernardo: a tela está na tarefa dele |
| `…/governanca/orgaos` | Eduardo | varredura controle a controle |
| `…/governanca/matriz` | Eduardo | varredura controle a controle |
| `…/governanca/acordo` | Eduardo | varredura; o cabeçalho de duas linhas |
| `…/governanca/protocolo` | Eduardo | varredura controle a controle |
| `…/biblioteca-modelos` | Bernardo | cabeçalhos em slug; o cartão que repete o título |
| `…/montagem-documentos` | Bernardo | os badges em slug; a ação duplicada |
| `…/gerar-documento` | Bernardo | as descrições dos modelos |
| `…/documentos` | Eduardo | as duas validações abertas; o subtítulo |
| `…/checklists` | Alexandre | os quatro nomes acessíveis que o teste não encontra |
| `…/calculadora-itcmd` | **sem dono** | a pendência fiscal do nome do documento no catálogo |
| `…/relatorios` | Alexandre | a mensagem de erro que culpa a Edge Function |
| `…/apresentacoes` | Alexandre | varredura controle a controle |

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

| Id | Controle | Estado do texto |
|---|---|---|
| B-01 | os botões só de ícone das 5 telas (4 mecanismos diferentes) | **escrito** — os 12 rótulos estão na §4 |
| B-02 | "Remover" sem nome nenhum, `MatriculasSection.tsx:47` | **escrito** — §4 |
| B-03 | explicação presa num `title` de botão desabilitado, `TitularidadeLinha.tsx:88` | **escrito** — vira texto de apoio |
| B-04 | o campo "Papel", com três nomes e quatro cópias do mapa PR/CN/SC | **escrito** |
| B-05 | o filtro "Integraliz-" → "Participa da estruturação" | **escrito** |
| B-06 | buscas e filtros sem nome acessível nas 5 telas | **escrito** — ⚠️ `aria-label`, não `<label>`: o Select do Radix dispara o clique duas vezes |
| B-07 | as três marcas da matrícula órfã | **decisão da Patrícia** (layout). O filtro "Órfãs (!)" já foi corrigido |
| B-08 | a regra de elegibilidade do bem, na lista | **decisão da Patrícia** (layout) |
| B-09 | "8 CNPJs" × "Pessoas Jurídicas (0)" | **escrito** — o seletor é da frente do Alexandre; combinem |
| B-10 | a PJ sem Papel que não vira aba | **falta escrever** (3 estados) |
| B-11 | "vai à junta e carimba o ledger" / "não mexe na sociedade" | ✅ **já no código** (medido 23/09). Sobra a frase de apoio abaixo do seletor |
| B-12 | "Flag de composição" / "Todas as flags" | ✅ **já no código** (medido 23/09) |
| B-13 | badges com a chave do banco (`instrumento_agrario`, …) | **falta escrever** (6 rótulos) |
| B-14 | descrições dos modelos ("binding", "edge function", nome de quem redigiu) | **falta escrever** — ⚠️ é dado de produção |
| B-15 | o cartão que repete o próprio título; cabeçalhos em slug | **falta escrever** |
| B-16 | a metáfora interna da Montagem, e a ação duplicada | **escrito** |
| B-17 | o modelo "Teste V1" ativo no catálogo | **decidido 22/09**: desativar |
| B-18 | o subtítulo de Gerar Documento | **já executado** — conferido no código em 23/09 |

## Alexandre — barra de cliente, Solicitação, Relatórios, Checklist, Rural

| Id | Controle | Estado do texto |
|---|---|---|
| A-01 | `Selecione um cliente...` no seletor | ✅ **já no código** (medido 23/09) |
| A-02 | dez estados vazios: a frase padronizou, o verbo não | **falta escrever** — 5 usam "abrir"; sobraram "ver", "ver e gerenciar", "navegar pelos" e "apurar" |
| A-03 | ITCD × ITCMD | **executado 18/09** — falta confirmar "GIA / DAR de ITCMD/ITCD" com a área fiscal |
| A-04 | o `catch` único dos Relatórios, que sempre culpa a Edge Function | **falta escrever** |
| A-05 | "Imprimir" e "Gerar apresentação" habilitados sem dado | **falta escrever** a razão |
| A-06 | os 4 de 6 tipos que a Exploração Rural não trata | **falta decidir, depois escrever** |
| A-07 | placeholders fora do cânone | **metade feita**: os `ex:` minúsculos zeraram; as buscas seguem com `...` |
| A-08 | `FichaFormularios.tsx:71` e `CartorioSelect.tsx:125,217` | **decisão**: perdem a referência ao objeto ou não? |
| A-09 | as sete fatias aprovadas da Solicitação | **escrito** — ⚠️ o plano no disco está 284 linhas menor que `26e4c87f` |
| A-10 | quatro nomes acessíveis divergentes entre tela e teste, no Checklist | **falta decidir** qual nome fica |

## Eduardo — Documentos, Cadastro por Documento, Governança, lote de texto

| Id | Controle | Estado do texto |
|---|---|---|
| E-01 | o arquivo sem dono, com quatro nomes ("Sem vínculo", "balde", "sem dono", "gaveta") | **decisão da Patrícia**: qual palavra |
| E-02 | os textos do painel do balde | **falta escrever** — tooltip só onde explica consequência |
| E-03 | o subtítulo de Documentos do Cliente | **falta escrever** |
| E-04 | o zero dito quatro vezes no Cadastro por Documento | **falta escrever** |
| E-05 | "Trazer para o checklist" — o texto novo omite uma consequência | **validar antes de encurtar** |
| E-06 | o rail de produtos | **comportamento antes do texto** |
| E-07 | "Digite e tecle Enter" como placeholder | ✅ **já no código** (medido 23/09), com redação melhor que a proposta |
| E-08 | o cabeçalho do Acordo de Quotistas | **decisão da Patrícia** (layout) |
| E-09 | o plural entre parênteses, "arquivo(s)" | **falta escrever** — um lote só |
| E-10 | reticências `...` e travessão `--` | **catraca**: 225 → 216 em 18/09 |
| E-11 | a catraca não enxerga `title=` dentro de `<Button>` fora dos 7 arquivos da TIP-02 | ampliar o recorte |
| E-12 | grupo de menu com um item só; rota × rótulo | **escrito** |

## O que trava, e é decisão da Patrícia

1. **A palavra do arquivo sem dono** — "Sem vínculo" ou "Sem dono". Trava E-01 e E-02.
2. **O nome do relatório: as fontes se contradizem.** A TIP-03 §9 registra que o relatório
   **mantém** "Diagnóstico Patrimonial" porque ali a palavra é literal; o EX-16 da compilação de
   22/09 diz que fica um nome só em toda a interface e o relatório muda junto. Hoje a mesma tela
   mostra os dois, mais uma terceira forma em minúscula no subtítulo. A conferência visual pedida
   na §8 da TIP-03 também continua devendo.
3. **Duas rotas sem dono:** o hub e a Calculadora de ITCMD não aparecem na lista de frentes de 23/09.
4. **Qual versão do plano da Solicitação vale** — a do disco ou a de `26e4c87f`. Trava A-09.
5. **Os três itens de layout** — B-07, B-08 e E-08. Ela decide, o Eduardo executa; os filtros
   ficam com o Alexandre.
6. **O inventário de rotas não fecha:** o router tem 20, o `navegacaoOsgWork.ts` declara 19
   caminhos e o comentário dele diz "as 17 telas"; a compilação de 22/09 conta 18 e a TIP-03 fala
   em 19. Esta tarefa usa os 20 do router. Acertar o comentário é item de uma linha.

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
- [ ] As seis decisões acima foram respondidas, e os itens que elas travavam ganharam texto.
- [ ] Nenhum `title=` novo entrou; nenhum texto aprovado foi reescrito no PR.
