# Doação de quotas com reserva de usufruto

Frente aberta em 10/09/2026: apoiar a **alteração contratual de transferência de quotas
entre sócios da Participações**, derivada de eventos registrados na área do Quadro
Societário. É a peça que faltava no ciclo do gerador — constituição → registro na junta →
concentração de quotas → **doação com reserva de usufruto** —, e o caso que o grupo pratica
quando os fundadores passam a holding aos filhos e guardam o comando.

Referência de redação: **3ª alteração e consolidação da MMS Participações** (o casal doa a
totalidade das 9.541.796 quotas às duas filhas, em quatro pares, cada doador reservando o
usufruto vitalício estendido ao voto, com as quotas gravadas). O levantamento de 105
documentos de 23 sociedades está no artifact "Doação de cotas com reserva de usufruto
vitalício"; o que ele mostra e este documento adota está resumido abaixo.

## O que o corpus decidiu pelo desenho

1. **Na Junta o ato não se chama doação.** Ele entra como alteração contratual com os
   códigos 002 + 2018 (cessão de cotas) + 2247, mais 2001/2003 quando há ingresso ou
   retirada e 051 na consolidação. A lista é **derivada** do que o ato produz, nunca
   escolhida pelo consultor — o que casa com a derivação de eventos que já existe
   (`eventosDaAlteracao.ts`).
2. **O gravame não é texto de uma peça: é estado da sociedade.** Ele reaparece, quase
   palavra por palavra, em três pontos fixos de **toda** consolidação seguinte (capítulo do
   capital, capítulo de alienação de quotas, cláusula autônoma de usufruto e voto),
   inclusive em alterações que nada têm a ver com doação. No acervo a mesma nota atravessa
   sete alterações de uma empresa. Se o gravame morasse na resolução da doação, a peça
   seguinte o apagaria da versão vigente do contrato.
3. **Quem tem a quota não é quem vota.** A tabela da cláusula de nua-propriedade tem quatro
   colunas (plena · nua propriedade · usufruto estendido ao voto · %), o percentual é do
   **voto** e não do capital, e as colunas de nua e de usufruto fecham no mesmo total do
   capital — descrevem a mesma quota sob dois direitos. Somar por cabeça num casal daria
   151%.
4. **Cota é indivisível.** A origem declarada (parte legítima e parte disponível) cai em
   fração e os instrumentos põem a sobra na **legítima**. A regra fica fixada no código, em
   vez de arredondar em silêncio.

## Recorte em quatro fatias

| Fatia | O que entrega | Estado |
|---|---|---|
| **1. O evento no Quadro Societário** | Gesto "Doar quotas" na área do quadro: vários pares num ato, reserva de usufruto, gravames, origem legítima/disponível, data do instrumento. Grava o livro e o ônus. Tabela "Usufruto e voto" na página | ✅ entregue 10/09/2026 (sandbox) |
| **2. A peça** | O assistente da AC deriva "Doação com reserva de usufruto" com evidência, e a folha compõe as cláusulas do ato (doação, extensão do usufruto, gravames, renúncia à preferência, mapa de usufruto e voto) | ✅ entregue 10/09/2026 (sandbox) · **redação pendente de aceite jurídico** |
| **3. Os ecos na consolidação** | Os três pontos fixos do contrato consolidado passam a ler o ônus vigente, e as validações aritméticas (fração de quota, legítima ímpar, três somas independentes) | 🔵 aberta |
| **4. As variantes** | Cessão gratuita sem usufruto (sub-rogação do gravame preexistente) e instituição de usufruto avulsa, o ato próprio com guia própria | 🔵 aberta |

A ordem é a de sempre nesta frente: o fato entra no livro primeiro, e a peça nasce depois
pelo fluxo normal da tela Gerar, que já tem os porteiros dela (validar versão, snapshot
congelado, registro na junta, sucessão).

## Fatia 1, o que ficou no código

**Migration `20260910202720_doacao_de_quotas_com_usufruto.sql`** (aplicada no sandbox em
10/09/2026 por `bun run db:sync --apply`; **produção pendente**, passo humano pelo Lovable):

- três colunas em `movimentacao_quotas` — `quotas_legitima`, `quotas_disponivel` e
  `instrumento_data` —, com CHECK que as exige juntas e somando as quotas do movimento, e
  que as proíbe fora da doação;
- tabela **`onus_quotas`**: nu-proprietário, usufrutuários (array, porque o casal usufrui em
  conjunto, com acrescimento ao sobrevivente pelo art. 1.411 do CC), origem do usufruto
  (`reserva` | `instituicao`), extensão ao voto, quotas, gravames e `extinto_em`. Aponta
  para o movimento que a criou com `ON DELETE CASCADE`, e admite `movimento_id` nulo — é
  onde a instituição avulsa da fatia 4 vai caber, sem quota mudando de mão. RLS igual à de
  `ato_societario` (SELECT por cluster do cliente, escrita a `team_member+`).
- **"Indisponibilidade" ficou fora do CHECK de gravames de propósito.** É a tríade das
  alterações de 2016 e serve para *ler* o passivo herdado, nunca para gravar ônus novo.

**Domínio puro `src/lib/osg/doacaoDeQuotas.ts`** (`planejarDoacaoDeQuotas`), no molde de
`subidaDeQuotas.ts`: recebe os pares e devolve o plano — lançamentos de `doacao`, o ônus de
cada um, quadro resultante, retirantes, ingressantes e a tabela de usufruto e voto. A
validação de cada par passa pelo `problemaDoMovimento` do formulário (a mesma função, para
as duas não divergirem), e o **saldo é consumido par a par**, porque dois pares do mesmo
doador não podem, juntos, passar do que ele tem — e `problemaDoMovimento` só enxerga um
movimento.

A tabela de voto **reaproveita `montarUsufruto`**, de `usufrutoDoAto.ts`, que a calculadora
de ITCD já usava. Ela estava lá modelando o *cenário* de uma simulação; aqui monta o *fato*.
Não houve segunda implementação da mesma aritmética.

**Camada de dados `src/hooks/useDoacaoDeQuotas.ts`**: `useDoarQuotas` grava o ato, os
movimentos e o ônus, e desfaz o ato quando qualquer insert falha (o cascade leva o resto —
não há transação porque o PostgREST não expõe uma). O ônus casa com o movimento pela
**sequência**, não pela posição da resposta, porque o PostgREST não promete devolver as
linhas na ordem do insert. `useOnusDaEmpresa` lê só o ônus vigente.

**Telas**: `DoarQuotasDialog` (o macro, com prévia do que será gravado e da tabela de voto),
`ParesDaDoacao` (as linhas doador → donatário) e `UsufrutoEVotoCard`, que **só aparece
quando há ônus vigente** — é só então que o quadro societário deixa de responder quem vota.
O cônjuge entra como cousufrutuário por `pessoa.conjuge_id`, marcado por padrão quando o
cadastro o vincula.

O `MovimentoModal` continua registrando a doação **simples** (cessão gratuita) e passou a
dizer, ao escolher "Doação", que reserva de usufruto e gravames têm gesto próprio.

## O que a fatia 1 deliberadamente não faz

- **Nenhuma peça sai daqui.** Marcar o evento de doação no assistente e escrever as
  cláusulas era a fatia 2, entregue no mesmo dia (ver a seção abaixo). Na fatia 1 o livro
  acendia `evento_cessao_quotas`, porque `eventosDaAlteracao.ts` tratava `cessao` e `doacao`
  juntas: suficiente para não perder o evento, insuficiente para publicar usufruto e gravame.
- **Doador pessoa jurídica** não é oferecido: a redação homologada nomeia sócio pessoa
  física, como no acervo.
- **Anuência conjugal** não é gravada como papel. O cônjuge que anui à doação (art. 1.647
  do CC) é papel do *instrumento*, distinto do de cousufrutuário. O que a fatia 1 guarda é
  quem **usufrui**; a fatia 2 também não o tratou, e a assinatura do cônjuge anuente segue
  aberta.
- **ITCMD é externo à minuta.** Nenhum precedente trata do imposto no corpo do instrumento;
  a guia é pressuposto do registro. A calculadora de ITCD segue sendo outra tela, e a
  ligação "simulação aprovada vira a origem da doação" é decisão aberta.

## Fatia 2, o que ficou no código

**A doação deixou de ser um caso da cessão.** `eventosDaAlteracao.ts` derivava
`evento_cessao_quotas` para `cessao` e `doacao` juntas; agora cada tipo tem o seu evento,
com evidência própria ("1 doação somando 200 quotas"). `estadoProposto.ts` acompanha:
`evento_doacao_quotas` entra em `EVENTOS_DE_MOVIMENTO`, sustenta `evento_mudanca_socios`
como causa legítima, e as coleções passaram a ser liberadas por matéria, não em bloco.
Sem o evento de doação confirmado, `doacoes`, `usufrutos`, `gravamesQuotas` e
`quadroUsufruto` ficam explicitamente vazias no estado proposto (e congeladas vazias no
snapshot), para que uma versão validada não passe a narrar ônus criado depois dela.

**Quatro coleções novas no vocabulário** (`binding.ts`), com os papéis que a redação nomeia:

| Coleção | Papel do item | Seções condicionais | O que publica |
|---|---|---|---|
| `doacoes` | `doador`, `donatario`, `doacao` | `comOrigem`, `comInstrumento` | cada par do ato, com quotas, valor, legítima/disponível e a data do instrumento particular |
| `usufrutos` | `nuProprietario`, `usufruto` | `comVoto`, `semVoto` | as reservas criadas por este ato, com os cousufrutuários num nome só |
| `gravamesQuotas` | `nuProprietario`, `gravame` | nenhuma | os gravames efetivamente registrados sobre cada conjunto de quotas |
| `quadroUsufruto` | `titular`, `usufruto` | nenhuma | propriedade plena, nua, usufruto e voz e voto de **toda** a sociedade |

`mapearListasDaDoacao` (em `mapeadores.ts`) monta as quatro de uma vez. Duas fronteiras
importam: as três primeiras saem só dos ônus **deste** ato (casados ao movimento por
`movimento_id`), enquanto o `quadroUsufruto` sai de **todos** os ônus vigentes, porque é
estado da sociedade e não efeito da peça (decisão 2 do corpus). A aritmética do quadro
reaproveita `montarUsufruto`, a mesma de `usufrutoDoAto.ts` que a fatia 1 já usa: quem
aparece só como usufrutuário entra com zero quotas para poder receber voto.

**Migration `20260910212126_resolucao_doacao_quotas_usufruto.sql`** (aplicada no sandbox em
10/09/2026; **produção pendente**, passo humano pelo Lovable): a flag `evento_doacao_quotas`
no catálogo e cinco blocos `livre` logo depois da cessão (ordens 9 a 13), no mesmo molde da
resolução de qualificação de endereço: doação, reserva de usufruto, gravames, anuência e
renúncia à preferência, quadro de usufruto e voto. A resolução de cessão ganhou uma versão
nova, exclusivamente **onerosa**: o ramo `{{#seDoacao}}` saiu dela, e as versões anteriores
continuam disponíveis para os documentos já selados. A inconsistência que o corpus apontou
foi corrigida na redação nova: ficou "Em observância aos preceitos do artigo 1.911", que é o
dispositivo que autoriza o gravame.

**A migration carrega reparo de sandbox.** A primeira execução usou UUIDs sequenciais
(`ac000001-…-0008`, `-0009`, `-0012`) que já pertenciam a blocos criados fora do
repositório, e sobrescreveu a redação da retirada e do desimpedimento. Os cinco blocos
nasceram de novo com UUID v4, e o arquivo leva os `delete` e os `update` de conserto,
guardados pelo par nome + changelog: em qualquer banco que nunca viu a versão colidente,
inclusive produção, essas quatro instruções são no-op.

## Decisões abertas

1. **A simulação de ITCD deve virar a origem da doação?** Hoje o consultor lança a doação no
   quadro, e a calculadora não conversa com o livro. Ligar as duas evitaria redigitar os
   pares, mas amarra o fato societário a um cenário fiscal aprovado.
2. **A redação das cláusulas da fatia 2 precisa do aceite de quem responde pelo texto
   jurídico**, como a resolução de qualificação de endereço já precisou. O corpus dá quatro
   desenhos e uma inconsistência a corrigir: `"Não obstante o artigo 1.911"` deve sair, e
   ficar só `"Em observância aos preceitos do artigo 1.911"` — que é o dispositivo que
   *autoriza* o gravame.
3. **Vigência do gravame.** A fórmula do acervo ("enquanto os doadores estiverem vivos")
   encerra as restrições na morte deles. Se a intenção é proteger o donatário por mais
   tempo, a redação atual não entrega isso — vale levantar com quem assina.

Ver também `osg/arquitetura-alteracoes-contratuais-por-eventos.md` (a máquina da AC por
eventos, que a fatia 2 consome) e `planos/ledger-societario-e-alteracao-derivada.md` (o
ledger em que esta frente escreve).
