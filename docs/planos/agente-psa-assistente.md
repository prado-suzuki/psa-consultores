# Agente PSA — assistente conversacional das telas

**Status:** implementado na `develop`, **pendente de migration nos dois bancos**.
**Primeira tela:** Board > Estratégico (`/equipe/board/dashboard`).
**Cockpit:** Digital > Acessos > aba **Agente** (`/equipe/acessos`).

---

## 1. O que ele é

Um balão flutuante no canto inferior direito, com a logo da PSA, que responde
sobre **os dados da tela em que o usuário está**, devolve insight estratégico e
**aprende com as correções** de quem usa.

A decisão de arquitetura que sustenta todo o resto:

> **O agente não recalcula nada.** A tela publica um snapshot do que ela já
> desenhou (rótulo, valor formatado, janela, nota, aviso de falha) e a edge
> function responde sobre esse texto.

Se ele consultasse o banco por conta própria, a tela mostraria `R$ 4,1 mi` e ele
responderia `R$ 3,8 mi` — duas verdades para o mesmo número, nenhuma auditável.
Do jeito que está, **todo número que ele cita é localizável na tela com Ctrl+F**.

Consequência: ligar o agente numa aba nova = a tela publicar o seu snapshot +
uma linha em `agente_config`. Nenhuma alteração no balão.

---

## 1.1 Decisão de 21/08 — ponto de entrada ÚNICO

Chegaram a existir dois pontos de entrada: o balão flutuante
(`AgentePsaWidget`) e um ícone discreto ao lado do título, montado no
`BoardLayout` (`AgentePsaTrigger`). **Ficou o balão, e só ele.**

Por quê, na ordem que decidiu:

1. **O agente é do sistema, não do Board.** O ícone encaixava no cabeçalho
   padronizado do `BoardLayout` — que Tax, OSG e Acessos não têm. Fora do Board
   o ícone não existe, então ele nunca foi a alternativa ao balão: era o balão
   mais um caso especial.
2. **Dois idiomas para a mesma função é pior que qualquer um dos dois.** Quem
   aprende o balão no Tax e chega no Board não encontraria balão.
3. **Descoberta.** Ícone ao lado de título é achado por quem procura; balão de
   chat no canto é gesto já aprendido em outro lugar.

A objeção legítima ao balão — aparecer numa apresentação da diretoria — foi
resolvida **deixando o balão quieto**, não criando uma segunda porta: 46px,
`opacity: .55` em repouso, presença no hover e no foco de teclado. Com aviso de
falha na tela ele volta a 100% (`:has(.agente-bolha-ping)`), porque aviso
apagado não é aviso.

**Uma cópia só da máquina de estado.** O widget virou layout puro e consome
`useAgenteConversaController`. Havia duas cópias do fluxo (widget e gatilho), e
duas cópias significam que a correção do usuário pode virar lição por um
caminho e não pelo outro — divergência que só aparece quando o agente responde
diferente para a mesma pergunta em dois lugares.

**O que sobreviveu do gatilho:** `AgentePainelDecisao` passou a ser montado
dentro do painel do balão. A faixa "Exige decisão" e os avisos de falha agora
aparecem nos dois lugares — no painel e na grade da tela.

### Os cards de aviso FICAM na grade

O plano paralelo era tirar da grade a faixa de alertas e o card "Dados
incompletos" e deixá-los só dentro do painel. **Não foi feito**, por medição:

`/equipe/board/dashboard` está com uma consulta quebrada hoje — o embed de
`org_projects` devolve HTTP 400 porque `external_client_id` nunca teve FK para
`cliente` (a correção é `20260821151417_org_projects_external_client_id_fkey.sql`,
escrita e **não aplicada**). Enquanto ela não entrar, aquele card é o único
lugar onde o defeito aparece: sem ele na grade, quem não abre o painel vê zero
projetos ativos, pontualidade sobre nada e áreas vazias, sem sinal de que a
consulta morreu — o comportamento que o Bloco D existiu para matar.

Depois da FK aplicada o card passa a ser raro em vez de permanente, e a
conversa sobre tirá-lo da grade fica honesta. Antes disso, não.

---

## 2. Peças

### Banco (`supabase/migrations/20260821182647_agente_psa.sql`)

| Tabela | Papel |
| --- | --- |
| `agente_config` | Uma linha por escopo (aba). Prompt personalizado, modelo, temperatura, nível de acesso, máx. de insights, liga/desliga. |
| `agente_conversas` | Thread de um usuário num escopo, com os filtros ativos no início. |
| `agente_mensagens` | Turno + `campos_usados` (o que a resposta processou) + `metricas` (latência, modelo, confiança, lições aplicadas). |
| `agente_insights` | Um insight por linha — é o que torna "volume de insights gerados" mensurável sem varrer jsonb. |
| `agente_aprendizados` | **A memória.** Correção humana virada em lição; toda lição ativa volta no prompt daquele escopo. |

RLS habilitado nas cinco. **Nenhuma policy de INSERT, de propósito:** quem
escreve é o service role dentro da edge function. Se o navegador escrevesse, o
histórico de aprendizado seria adulterável e a métrica de insights não mediria
nada. Leitura: a própria conversa (ou tudo, para admin); lição é conhecimento da
casa e todo autenticado lê; curadoria de lição é do admin.

### Edge function (`supabase/functions/agente-psa/`)

`index.ts` (roteador + auth + persistência), `prompt.ts` (montagem — **funções
puras**, é onde mora a regra de honestidade), `ai.ts` (gateway da Lovable,
tool-calling), `tipos.ts` (contrato com a tela).

Ações: `chat`, `feedback`, `avaliar_insight`, `historico`, `cockpit`,
`salvar_config`.

Regras fixas no prompt (não configuráveis pelo admin, de propósito):
1. responder só sobre o CONTEXTO da tela;
2. dado ausente → dizer o que falta e onde se obtém, **nunca estimar**;
3. aviso de falha de carregamento → tratar como **desconhecido**, nunca zero;
4. respeitar a janela de cada bloco (o Estratégico tem duas);
5. insight sem número que o sustente não deve ser gerado.

### Front

| Arquivo | Papel |
| --- | --- |
| `src/hooks/useAgenteContexto.ts` | Contexto React + `useRegistrarContextoAgente` (a tela publica o snapshot). |
| `src/contexts/AgenteProvider.tsx` | Provider global no `App.tsx`. Renderiza o balão. |
| `src/lib/agenteContextoBoard.ts` | Snapshot do Board Estratégico. **Função pura, com testes.** |
| `src/lib/agenteApi.ts` | Desembrulha o corpo do erro que o `functions.invoke` descarta. |
| `src/hooks/useDomainAgentePsa.ts` | React Query sobre a edge function. Nenhum `supabase.from('agente_*')`. |
| `src/components/ui/ai-prompt-box.tsx` | Compositor (adaptado da referência de design). |
| `src/components/agente/` | Balão, painel, conversa, modos. |
| `src/hooks/useAgenteConversaController.ts` | A máquina de estado da conversa. Cópia única. |
| `src/components/agente/AgentePainelDecisao.tsx` | "Exige decisão" + avisos dentro do painel. |
| `src/components/acessos/AgenteTab.tsx` + `agente/` | Cockpit da aba Agente. |
| `src/index.css` | Tokens `--agente-*` e classes `.agente-*`. |

O Provider é global; **o balão não**. Ele só aparece onde alguma tela publicou
contexto — por isso não vaza para a home pública nem para o portal do cliente.

---

## 3. Os três modos

| Modo | O que muda |
| --- | --- |
| **Dados** | Leitura fiel: número + janela + nota. Sem recomendação. |
| **Estratégia** (padrão) | Cruza pelo menos dois blocos e diz o que implica em decisão. Todo insight cita o número que o sustenta. |
| **Corrigir** | O texto do usuário vira lição em `agente_aprendizados` **antes** da resposta de confirmação — assim a própria confirmação já sai sob a regra nova, e uma falha da IA depois disso não descarta o que foi ensinado. Só aparece quando existe resposta para corrigir. |

O lápis em cada resposta leva direto ao modo Corrigir apontando para aquela
mensagem.

---

## 4. Como ele aprende

1. Usuário corrige (modo Corrigir ou lápis na resposta).
2. `agente_aprendizados` recebe: pergunta original, resposta original, correção
   e a **lição** (nasce igual à correção — reescrever com IA aqui inventaria
   regra que ninguém disse).
3. Toda conversa seguinte **daquele escopo** recebe as lições ativas no system
   prompt, ordenadas por peso, com a instrução de que **valem mais que a
   inferência do modelo**.
4. Admin refina, repesa ou desliga em Digital > Acessos > Agente.

Sem fine-tuning e sem embedding, por escolha: uma regra errada aprendida em
produção precisa ser removível por uma pessoa, na hora, sem retreinar nada.

---

## 5. Cockpit (Digital > Acessos > Agente)

Na ordem em que a dúvida aparece:

1. **Está sendo usado?** — perguntas, respostas, pessoas, latência média, por escopo.
2. **Sobre o que ele responde?** — ranking dos campos do snapshot que
   sustentaram as respostas (`campos_usados`, declarado pela própria resposta).
   Campo que nunca aparece é candidato a sair da tela; campo que aparece sempre
   merece subir nela.
3. **Como se comporta?** — configuração: ativo, rótulo, nível de acesso, modelo,
   temperatura, máx. de insights e **personalização do prompt**.
4. **O que já aprendeu?** — histórico de correções, com peso, liga/desliga e o
   rastro de onde cada lição nasceu.

Mais: insights por categoria, úteis x descartados, distribuição por modo e
contagem de respostas com **confiança baixa** — cada uma é pista de um campo
faltando no snapshot.

A varredura tem teto (3000 registros por janela); ao bater no teto a aba diz que
o número é piso, não total.

---

## 6. PENDENTE — o que falta para ir ao ar

### 6.1 Migration (bloqueio real)

O Supabase CLI **não está instalado nesta máquina**, então os passos 1–2 do
AGENTS.md ("Mudança de schema") não foram executados. O arquivo de migration
está escrito e é idempotente. Falta:

1. **Sandbox:** `supabase db push` e
   `supabase gen types typescript --project-id vgzomuwnsdgrxbkyoavq > src/integrations/supabase/types.ts`,
   commitado sozinho.
2. **Produção (humano, pelo chat do Lovable):** aplicar o mesmo SQL; o bot
   regenera o `types.ts` de lá e commita na `main`.
3. Deploy da function `agente-psa` e do segredo `LOVABLE_API_KEY` (já usado por
   `gerar-sintese-executiva` — se está lá, está lá para todas).

**O front não depende do `types.ts` para compilar.** Tudo passa pela edge
function, exatamente para o código não ficar preso ao ciclo de regeneração. Sem
a migration aplicada, o balão aparece e o painel responde
`Esta tela ainda não tem o agente configurado.` — recusa explícita, não erro
mudo.

### 6.2 Nunca validado com dado real

Nenhuma resposta do agente foi vista contra a base de produção. O que precisa de
olho humano na primeira semana:

- a resposta cita número que existe na tela? (o teste automatizado trava o
  formato do snapshot, não a fidelidade do modelo);
- o insight cruza blocos ou repete a resposta em outras palavras?
- o teto de contexto (24k caracteres) está cortando bloco no Estratégico?
  (`serializarContexto` avisa no prompt quando corta, mas ninguém mediu ainda).

### 6.3 Fora do escopo desta entrega

- **Áudio e anexo.** A referência de design trazia microfone e clipe; não
  entraram porque não existe transcrição nem visão no caminho de dados. Botão
  que não faz nada é pior que botão ausente.
- **Streaming da resposta** (hoje espera o turno inteiro).
- **Outras abas.** Cada uma entra publicando o seu snapshot + uma linha em
  `agente_config`. Candidatas naturais: Board > Projetos, Board > Clientes,
  OSG Gerencial.
