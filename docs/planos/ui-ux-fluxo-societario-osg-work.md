# Uma entrada para os movimentos do quadro societário

**Aberto em 11/09/2026. Status: plano, implementação não iniciada.**
Leitura feita na branch `feat/doacao-quotas-com-usufruto`, base `1ac4d430`.
Escopo: UI/UX do Quadro Societário e dos formulários que ele abre. Nenhuma migration,
mudança de RLS, RPC, schema, gravação ou geração contratual faz parte desta entrega.

## 1. Decisões de interação

### Uma porta única, com escolha visível antes do formulário

Fechar em **Registrar movimento**, único botão de registro no cabeçalho da Lista de
Sócios da Controladora. Ele abre a escolha do gesto, com a empresa identificada, antes
de pedir pessoas, quotas ou datas. Os três formulários existentes continuam responsáveis
pelos seus respectivos casos.

Entradas separadas, mesmo com um botão primário e dois secundários, mantêm a pergunta
errada na página: o consultor precisa descobrir qual formulário contém seu caso antes
de conseguir comparar os efeitos. O ganho de um clique para quem já sabe não compensa
a concorrência entre três comandos, repetida sobre uma tabela cheia de ações.

O custo da porta única é um passo a mais. Aceito esse custo para retirar a escolha
implícita entre formulários. Não haverá seleção automática de Aporte ou Cessão.

### Lista vertical de opções técnicas, sem cartões ilustrados nem select fechado

Promover a responsabilidade do passo 01 do `MovimentoModal`, mas **não seu select**.
Usar uma lista de opções com `RadioGroup`, rótulo técnico, uma linha curta de distinção
e ícone de informação separado. Rodapé com **Cancelar** e **Continuar**. Escolher uma
opção não abre imediatamente o formulário, permitindo consultar a ajuda sem navegar.

As seis opções da CN, nesta ordem:

| Rótulo | Linha curta sempre visível | Destino |
|---|---|---|
| Aporte | Emissão de quotas em moeda corrente. | `MovimentoModal`, tipo `aporte` |
| Cessão | Transferência onerosa de quotas. | `MovimentoModal`, tipo `cessao` |
| Doação simples | Uma transferência gratuita, sem constituir nova reserva ou gravame. | `MovimentoModal`, tipo `doacao` |
| Doação com reserva de usufruto ou gravames | Reserva, gravames, origem patrimonial ou vários pares no mesmo ato. | `DoarQuotasDialog`, com os padrões atuais |
| Instituição de usufruto | Constituição de usufruto sem transferência da titularidade. | `InstituirUsufrutoDialog` |
| Redução | Cancelamento de quotas. | `MovimentoModal`, tipo `reducao` |

Os nomes são de cartório. A linha curta diferencia as opções, sem substituir os
tooltips de efeito e contrato. A opção longa pode ocupar duas linhas. Não truncar.

Cartões em grade dariam seis molduras para uma decisão que cabe numa lista e exigiriam
varredura horizontal. Frases coloquiais apagariam o vocabulário conhecido. O select
economizaria altura, mas esconderia as alternativas e dificultaria a ajuda independente
de cada item. Não há empate real entre esses desenhos nesta leitura.

### Tooltip no ícone de informação ao lado do rótulo

O rótulo seleciona o gesto ou aciona o campo. O ícone **i**, em botão próprio, explica.
Não depender de hover no item inteiro, de `title=` nativo ou de texto jurídico permanente.
O tooltip contém dois parágrafos identificados por **No quadro:** e **No contrato:**.

Usar `Tooltip`, `TooltipTrigger` e `TooltipContent` de `@/components/ui/tooltip`.
Hover e foco abrem a ajuda. O toque/clique no ícone também deve abri-la de forma
controlada, sem selecionar a opção nem alternar checkbox/switch. Escape fecha a ajuda
antes de fechar o diálogo. Não colocar botão de informação dentro de outro botão nem
dentro do label que alterna o controle. Nome acessível: `Sobre {rótulo}`.

O wrapper atual usa Portal e largura máxima de 280px. Nesta tela, permitir largura de
até 360px, limitada ao viewport, com texto alinhado à esquerda. Conferir colisão,
empilhamento e foco dentro do `OsgDialog`. Não alterar o wrapper global por esta frente.
Os avisos de impedimento e as consequências concretas do preenchimento ficam visíveis,
não escondidos em tooltip. Uma linha abaixo da escolha ensina: **Use o ícone de
informação para consultar o efeito no quadro e no contrato.**

### A doação simples continua, mas deixa de disputar o mesmo nome

Manter a rota avulsa. Ela não é substituível pelo macro sem mudar comportamento:

* `MovimentoModal` admite pessoas PF/PJ e chama `useRegistrarMovimento`. Pode sub-rogar
  ônus existente, não cria ato, origem patrimonial nem nova reserva.
* `DoarQuotasDialog` oferece pares PF, origem, instrumento, reserva e gravames. Chama
  `useDoarQuotas`, cria ato e recusa doador que já tenha ônus vigente.

O select de tipo deixa de aparecer quando o modal é aberto pela nova porta, que já
entrega o tipo escolhido. Portanto, **Doação sai do select de navegação, mas não sai
do domínio nem do caminho avulso**. O enum e `FORMAS_MOVIMENTO` ficam intactos.
O aviso que manda fechar a janela e procurar “Doar quotas” na lista perde a função.
No seu lugar, a escolha inicial diferencia os dois casos.

No macro, desligar a reserva continua permitido. Isso ainda pode ser uma doação com
gravames, origem declarada ou vários pares. Não transformar automaticamente essa
configuração em movimento avulso. A revisão mostrará as condições realmente escolhidas.

### Retirar o botão de cada linha de sócio

Remover a ação `ArrowLeftRight` e a coluna Ações da CN. Hoje ela apenas abre o modal
com Cessão e origem preenchidas, não oferece a doação em ato nem a instituição. Virar
menu manteria um botão por linha e acrescentaria outra gramática de navegação.

A porta única passa a pedir a pessoa no formulário, como já faz hoje quando aberta
pelo cabeçalho. O custo é selecionar o sócio. O benefício é eliminar N botões e a
suposição de que um clique na linha significa Cessão. Não criar seleção de linha com
ação oculta. A tabela continua leitura do saldo e de sua procedência.

## 2. O que foi lido e o que foi visto

`AGENTS.md` e `docs/INDICE-PLANOS.md` foram lidos antes da análise. O índice registra a
doação com usufruto como parcial e aponta a lacuna da instituição. O código desta
branch prevalece sobre documentos históricos. O formato deste arquivo segue os planos
de handoff em `docs/planos/`: evidências, decisões, fatias e critérios de aceite.

Foram lidos a página, todos os 13 arquivos de `quadro-societario/`, as quatro bibliotecas
indicadas na tarefa e `eventosDaAlteracao.ts`, os três hooks, `formKit`, `OsgDialog`,
o tooltip existente e o fechamento com alterações pendentes. A leitura contratual foi
conferida também em `mapeadores.ts:1607-1791` e `consolidacaoDoOnus.test.ts:19-127`.
Testes de domínio e wiring foram inspecionados para localizar os contratos afetados.

**Não consegui observar o Quadro Societário em sessão logada.** Havia Vite em
`http://localhost:8080`. O módulo servido do cliente Supabase confirmou o sandbox
`vgzomuwnsdgrxbkyoavq`. A página `e2e/semear-sessao.html`, com destino ao quadro,
redirecionou para `/equipe`. `node e2e/renovarSessao.mjs` encontrou token expirado e
parou com “nenhum .env aponta para vgzomuwnsdgrxbkyoavq: nao sei qual chave anon usar”.
O guia ainda cita `.env.development`, enquanto `AGENTS.md` documenta `.env.sandbox`.
Não alterei sessão, scripts ou configuração para contornar isso. Nenhum gesto de
gravação foi executado. As conclusões de densidade são de inspeção do JSX, não de
medição visual ou teste com consultores. A validação visual continua na fatia 5.

## 3. Inventário do estado atual

Referências abaixo são da base `1ac4d430`. `QS` significa
`src/pages/equipe/osg/QuadroSocietario.tsx`. Nos demais componentes, o caminho base é
`src/components/equipe/osg/quadro-societario/`. Intervalos cobrem textos condicionais
e interpolados. Os textos de ausência de valor usam hoje um traço como placeholder.

### Página, tabela e cards

| Arquivo e linhas | Botão, rótulo ou texto atual | O que faz e onde confunde |
|---|---|---|
| `QS:284-306,318-328` | “Quadro Societário”, “Distribuição de quotas e participação dos sócios por empresa”, “Proprietária”, “Controladora”, “Selecione um cliente na barra acima para visualizar e gerenciar o quadro societário.”, “Carregando...”, ausência de PR/CN | Contexto de cliente e empresa. Gerenciar pode sugerir CRUD, mas não há edição de saldo. Abas remontam o quadro pela empresa. |
| `QS:308-312,207-211` | “Ir para Qualificação das Partes” | Navega ao cadastro, tanto sem empresas como sem sócios. No quadro vazio, o texto pede aporte, mas o botão local leva para outra tela. |
| `QS:116-135` e `quadroKit.tsx:19-54` | “Capital Social Total”, “Total de Quotas”, “Valor Nominal” | Três cards, capital com fundo moss cheio, ícones, contagem animada e entrada escalonada. O resumo antecede e compete com a tarefa. Nominal da CN é capital dividido por quotas, não o nominal fixo usado na gravação. |
| `QS:141-179` | “Lista de Sócios ({n})”, “O quadro é o acumulado dos movimentos de quota desta empresa: aporte, cessão, doação e redução. Para alterá-lo, registre o movimento que aconteceu.” | Explica o ledger, mas não o efeito no contrato. O parágrafo permanente disputa espaço com os comandos. |
| `QS:148-157` | “Doar quotas”, `title="Doação de quotas com reserva de usufruto e gravames, em um ato"` | Abre macro, bloqueado sem sócios. O título sugere reserva obrigatória, embora seja desligável. Ajuda nativa não explica contrato. |
| `QS:158-167` | “Instituir usufruto”, `title="Instituir usufruto sobre quotas, sem que elas mudem de titular"` | Abre instituição, bloqueada sem sócios. Não informa condição do voto nem a lacuna da resolução contratual. |
| `QS:168-174` | “Registrar movimento” | Abre avulso com Aporte selecionado. Parece um comando abrangente, mas não alcança os outros dois formulários. |
| `QS:190-199` | Ícone sem texto, `title="Movimentar as quotas deste sócio"` | Abre avulso em Cessão, com origem. Tem alcance menor do que o nome promete. |
| `QS:203-205` | “Nenhum sócio nesta empresa. O quadro começa com o aporte de constituição: registre quem entrou e com quantas quotas.” | Explicação útil, mas desconectada do CTA de cadastro. |
| `TabelaSocios.tsx:60-81` | “Buscar sócio...”, “Nenhum sócio encontrado.”, “Sócio”, “Quotas”, “Valor (R$)”, “Participação”, “Ações” | Busca nome/documento. Valor é de capital e participação é do capital, distinções que os títulos não explicitam. |
| `TabelaSocios.tsx:94-117,127-163` | Nome, PF/PJ, CPF/CNPJ, selos de procedência, percentual com barra e badge, “Total” | Procedência é útil, mas cresce como vários selos por sócio. Barra, avatar e badge repetem destaque. Total desaparece com qualquer busca ativa, mesmo se todos os sócios corresponderem. Preservar essa regra. |
| `UsufrutoEVoto.tsx:41-46,56-65,89` | “Sócio / usufrutuário”, “Quotas”, “Propriedade plena”, “Nua propriedade”, “Usufruto (voto)”, “Voz e voto”, “usufruto em favor de {nomes}”, gravames em minúsculas, “Total” | Segunda tabela, agora de direitos e voto. Não se pode fundi-la por sócio, porque usufrutuário pode ter zero quotas. |
| `UsufrutoEVoto.tsx:139-148` | “Usufruto e voto”, texto começando “Quem tem a quota não é necessariamente quem vota por ela” e terminando “O percentual é do voto, não do capital.” | Aparece quando há qualquer ônus, inclusive só gravames. O texto fala apenas de reserva e assume voto com usufrutuário, mesmo quando `comVoto` é falso. |
| `AtosSocietarios.tsx:33-45` | “Atos societários ({n})”, texto “Cada ato agrupa o que nasceu junto...” | Só aparece com atos. Explica agrupamento e reversão, mas não representa todo o livro. Avulsos não estão nessa lista. |
| `AtosSocietarios.tsx:52-72` | Nome do ato ou “Ato de {data}”/“Ato societário”, “{n} lançamento(s) nesta empresa”, “sem lançamento no livro: só ônus sobre quotas”, “Formalizado em documento” | Nome truncado, sem ajuda. Formalização é apurada nos movimentos da empresa carregada. A instituição não tem movimento para receber o carimbo. |
| `AtosSocietarios.tsx:75-101` | “Desfazer”, “Desfazer {nome}?”, “Cancelar”, “Desfazer o ato” | Reverte ato inteiro. Confirmação diz que lançamentos saem “nas duas empresas”, mesmo em doação de uma empresa. Variante sem movimentos diz que sai o ônus e voto acompanha propriedade. “Não há como desfazer esta ação.” encerra ambas. |

### Movimento avulso

| Arquivo e linhas | Texto/controle atual | Efeito e atrito |
|---|---|---|
| `MovimentoModal.tsx:52-59,166-178` | “Registrar movimento de quotas”, empresa, “01 O que aconteceu”, “Tipo do movimento” | Escolhe Aporte por padrão ou Cessão se houver origem. O usuário entra num formulário já decidido. |
| `MovimentoModal.tsx:179-212` | Select dos quatro tipos, descrição de `FORMAS_MOVIMENTO`, “Doação com reserva de usufruto ou gravames: use ‘Doar quotas’, na lista de sócios.” | O aviso exige sair para outro fluxo. Não diferencia a sub-rogação que só este caminho oferece. |
| `src/lib/osg/movimentoQuotas.ts:32-56` | Aporte: “As quotas nascem e o capital da sociedade cresce.” Cessão: “As quotas trocam de mão a título oneroso. O capital não muda.” Doação: equivalente “a título gratuito”. Redução: “As quotas são canceladas e o capital da sociedade diminui.” | Descrevem quadro/capital, não contrato. Os rótulos são também usados em validação e toast. Não trocar esse catálogo de domínio para mudar só a navegação. |
| `MovimentoModal.tsx:217-260` e `movimentoQuotas.ts:37-55` | “02 Quem”, “Quem cede as quotas”, “Quem doa as quotas”, “Quem recebe as quotas”, “De quem as quotas saem”, “Selecione...”, “Nenhum sócio no quadro”, “Nenhuma pessoa cadastrada”, nome e saldo por opção | Origem só do quadro. Destino qualquer pessoa do cliente, exceto empresa. Tipo controla quais lados existem. |
| `MovimentoModal.tsx:266-307` | “03 Quanto”, “Quotas”, placeholder “0”, “Mover todas as {n} quotas”, “Data do movimento”, “Valor de capital das quotas movidas: {valor} · ao valor nominal de {valor} por quota, não ao preço pago.” | Quantidade inteira, data opcional, capital derivado. Manter valor calculado visível, transferir explicação do nominal para tooltip. |
| `MovimentoModal.tsx:311-338` | Avisos de sub-rogação, problema do livro/ônus, “Cancelar”, “Registrar {tipo}” | Avisos aparecem após alteração do draft e validação. Não podem virar ajuda escondida. Pendência desabilita os botões do rodapé. |

### Doação em ato e pares

| Arquivo e linhas | Texto/controle atual | Efeito e atrito |
|---|---|---|
| `DoarQuotasDialog.tsx:201-210` | “Doar quotas”, empresa, “Os sócios doam quotas a título gratuito. Com a reserva, quem doa fica com uso, gozo e voto; quem recebe fica com a nua propriedade. Tudo entra no livro num ato só.” | Descreve o padrão, mas afirma voto mesmo se desligado. |
| `DoarQuotasDialog.tsx:216-250` | “01 Quem doa, para quem, quanto”, “02 Reserva de usufruto”, “Doador reserva o usufruto vitalício”, “Quem doa continua com uso e gozo (os lucros) das quotas doadas. Sem a reserva é uma doação simples.”, “Usufruto estendido ao voto”, referência ao art. 114 e art. 1.053, “É o padrão da casa.” | Reserva/voto ligados inicialmente. Reserva desligada não elimina os gravames ligados, portanto a frase de doação simples é incompleta. |
| `DoarQuotasDialog.tsx:255-272` | “{doador} usufrui o que doa”, “{cônjuge} (cônjuge) também usufrui, em conjunto”, “sem cônjuge vinculado no cadastro” | Cônjuge entra marcado quando existe. Esse efeito não pode ficar escondido em seção recolhida. |
| `DoarQuotasDialog.tsx:283-301` e `src/lib/osg/doacaoDeQuotas.ts:54-78` | “03 Gravames sobre as quotas doadas”, Inalienabilidade (“O donatário não pode vender nem ceder as quotas.”), Impenhorabilidade (“As quotas não respondem por dívidas do donatário.”), Incomunicabilidade (“As quotas não entram na comunhão do casamento do donatário.”), Reversibilidade (“Se o donatário morrer antes do doador, as quotas voltam ao doador.”), “Extensivos aos frutos e dividendos, vigentes enquanto os doadores viverem (art. 1.911 do CC).” | Três primeiros ligados, reversibilidade desligada. Quatro caixas com explicação permanente. Há divergência entre o alcance literal da inalienabilidade e a regra que admite transmissão gratuita. |
| `DoarQuotasDialog.tsx:305-324` | “04 Origem e datas”, “Declarar a origem no patrimônio do doador”, “Metade da parte legítima, metade da disponível; a quota que sobra fica na legítima.”, “Data do instrumento de doação”, “O instrumento particular que a alteração anexa.”, “Data do ato” | Origem ligada. A UI coleta data, não faz upload/anexo. Explicação atual parece prometer anexação automática. |
| `DoarQuotasDialog.tsx:330-381` | “05 O que será gravado”, “{n} doação(ões) somando {q} quotas”, “com ônus sobre as quotas doadas”, “Quadro depois do ato”, “Usufruto e voto depois do ato”, “Cancelar”, “Registrar doação” | Revisão útil, com avisos de ingresso/retirada. Só aparece após haver par preenchido. Não é preview de documento pronto. |
| `ParesDaDoacao.tsx:48-95` | “Quem doa”, “Quem recebe”, “Quotas”, “Sócio…”, “Nenhum sócio PF no quadro”, “Pessoa…”, “0”, nomes/documentos e saldos nas opções | Só PF. Pares ficam em caixas sucessivas. Não alterar filtros ou ordem. |
| `ParesDaDoacao.tsx:99-141` | `title="Remover este par"`, “Doar todas as {n} quotas restantes”, “Origem: {n} da legítima · {n} da disponível”, “Par {i} de {n}”, “Adicionar par” | Remover só se houver mais de um par. Adicionar repete doador. “Restantes” desconta os outros pares digitados. Origem numérica precisa continuar visível. |

### Instituição de usufruto

| Arquivo e linhas | Texto/controle atual | Efeito e atrito |
|---|---|---|
| `InstituirUsufrutoDialog.tsx:168-172` | “Instituir usufruto”, “Quem tem a quota entrega o uso, o gozo e (se marcado) o voto dela a outra pessoa. A titularidade não muda: o quadro societário fica igual, e só o voto se desloca.” | Segunda frase reduz indevidamente o efeito ao voto. O usufruto muda mesmo com voto desligado. Falta empresa no título. |
| `InstituirUsufrutoDialog.tsx:178-240` | “01 Quem concede e quem usufrui”, “Quem concede (fica com a quota)”, “Sócio…”, “Nenhum sócio no quadro”, “Quotas”, “{n} com usufruto livre”, `title="Remover esta linha"`, “Quem passa a usufruir” | Concedente qualquer sócio, usufrutuários PF. O saldo livre não equivale a livre de todos os gravames. |
| `InstituirUsufrutoDialog.tsx:262-304` | “Usufruto em conjunto: no falecimento de um, o quinhão acresce ao sobrevivente (art. 1.411 do Código Civil).”, “Adicionar concessão”, “02 Condições do ato”, “O usufruto alcança o direito de voto”, referência aos arts. 114 e 1.053 e “Sem isto, quem usufrui recebe os frutos e não vota.”, “Data do ato” | Concessão adicional repete concedente. Voto inicia ligado. Lista de usufrutuários permanece visível para evitar concessão implícita. |
| `InstituirUsufrutoDialog.tsx:316-348` | “03 Como fica o voto depois do ato”, avisos/problemas, “Cancelar”, “Registrar instituição” | Preview considera ônus vigentes e novos. Grava só ato e ônus. Não há movimento para alimentar evento pendente. |

### Proprietária e suas saídas

A PR não monta os três botões da CN. Tratar as duas como se já tivessem as mesmas
ações criaria capacidades novas por acidente.

| Arquivo e linhas | Texto/controle atual | Efeito e atrito |
|---|---|---|
| `QuadroEmpresaProprietaria.tsx:185-218` | Mesmos três KPIs, nominal R$ 1,00, aviso “O quadro não pode ser gravado enquanto houver titular sem pessoa cadastrada...” e lista de titulares | PR propõe aportes dos bens quando não há saldo. Bloqueio de cadastro precisa permanecer visível. |
| `QuadroEmpresaProprietaria.tsx:235-250` | Motivo de bloqueio da subida, “Ir para Gerar Documento” | Depende de constitutivos registrados e ingresso pendente. É ação de resolver impedimento, não mais um movimento. |
| `QuadroEmpresaProprietaria.tsx:261-285` | “{n} imóvel(is) aprovado(s) fora do capital”, texto sobre aprovação após constituição e publicação na próxima AC, “Registrar aumento de capital” | Abre aumento com bens e moeda. Outro destaque moss separado da lista. |
| `QuadroEmpresaProprietaria.tsx:298-336` | “Lista de Sócios”/“Quadro proposto”, “Quadro registrado, apurado da movimentação de quotas”, “Transferir quotas para a controladora”, `title={motivoDaSubida}`, “Ainda não gravado”, “Gravar quadro societário” | Alterna proposta e saldo por `quadro.length > 0`. “Registrado” pode ser confundido com registro na junta. Tabela PR não tem ação por linha. |
| `QuadroEmpresaProprietaria.tsx:341-374` | “Gravar o quadro de constituição”, resumo de sócios/quotas/capital e “um movimento por bem integralizado”, explicação de que não seguirá sozinho o Diagnóstico, “Cancelar”, “Gravar”, texto da proposta calculada e texto do ledger | Confirmação de aporte inicial, não registro contratual. Manter a distinção. |
| `QuadroEmpresaProprietaria.tsx:378-396` | “Carregando...”, “A proposta fica em branco enquanto houver titular sem pessoa cadastrada.”/“Nenhum bem aprovado para integralização com destino a esta empresa.”, “Ir para o Diagnóstico Patrimonial” | Caminho de correção antes de poder gravar. |
| `AumentoDeCapitalDialog.tsx:46,129-158` | “Aumento de capital por integralização”, descrição dos imóveis e complemento em moeda, “Nome do ato”, padrão “Aumento de capital por integralização de imóveis”, “Data do ato” | Reutilizar esse formulário, inclusive descrição editável e data. |
| `AumentoDeCapitalDialog.tsx:162-226` | Aviso de titular sem cadastro, “Imóveis que entram ({n})”, “Matrícula {n}”, “sem titular”, “sem valor”, “Nenhum imóvel elegível fora do capital.”, “Parcela em moeda corrente, por sócio”, “Opcional. O que for digitado aqui vira uma alínea própria na cláusula, ao lado dos imóveis do mesmo sócio.” | Bens são leitura. Moeda vira lançamento próprio. Já é boa explicação do impacto contratual. |
| `AumentoDeCapitalDialog.tsx:247-293` | “O que será gravado”, “{n} lançamento(s) de aporte, em um ato”, “Capital hoje”, “Aumento”, “Capital depois do ato”, texto “O valor congela agora...” com referência a Gerar e Atos societários, “Cancelar”, “Gravar aumento de capital” | Boa conferência de delta. Não substituir por tooltip. |
| `SubirQuotasDialog.tsx:141-182` | “Transferir quotas para a controladora”, descrição da cessão e recebimento de quotas no mesmo ato, “Controladora”, “Escolha a controladora”, “Data do ato”, aviso de CN não cadastrada | Operação espelhada em duas empresas, distinta de cessão avulsa. |
| `SubirQuotasDialog.tsx:186-260` | Motivo de trava, “Lendo o quadro da controladora...”, “O que será gravado”, contagens de cessões e aportes, “Quadro da controladora depois do ato”, aviso de proporção, “Cancelar”, “Transferir quotas” | Conferência das duas pontas. Valores preservados não implicam preservação da proporção de participação. |

### Feedback compartilhado e textos derivados

| Fonte | Textos e comportamento que precisam continuar alcançáveis |
|---|---|
| `src/components/equipe/osg/OsgDialog.tsx:92-95` | X, com nome acessível atual “Close”. Usar a variante OSG em todos os diálogos novos. Não alterar o componente global para esta entrega. |
| `src/components/equipe/osg/UnsavedChangesAlert.tsx:25-36` | “Descartar alterações?”, “Você fez alterações que ainda não foram salvas. Se fechar agora, elas serão perdidas.”, “Continuar editando”, “Descartar e fechar”. Movimento, doação e instituição já usam esse guard. |
| `src/lib/osg/movimentoQuotas.ts:118-188` | Problemas de tipo, inteiro positivo, lados obrigatórios, empresa sócia de si, origem igual a destino, saldo e pagamento. Frases derivam dos rótulos do domínio. |
| `src/lib/osg/doacaoDeQuotas.ts:223-321` | Problemas por par e origem inconsistente, donatário usufruindo o que recebe, empresa usufrutuária, avisos de retirada/ingresso, doação simples, usufruto sem voto e “Origem não declarada: a cláusula não dirá quanto saiu da legítima e quanto da disponível.” |
| `src/lib/osg/onusDaSociedade.ts:159-196,283-341` | Avisos de consolidação do usufruto e sub-rogação, recusa de cessão onerosa sobre inalienáveis, falta de partes, quota inválida, própria quota, saldo já concedido e ausência de voz/voto. São consequência calculada, não conteúdo estático a esconder. |
| `src/hooks/useDoacaoDeQuotas.ts:104-108,209-219` | Recusa de doador já onerado, com instrução de usar “Registrar movimento”, “Doação de quotas registrada”, resumo de lançamentos/ônus, “Erro ao registrar a doação”. |
| `src/hooks/useInstituicaoDeUsufruto.ts:93-102` | “Instituição de usufruto registrada”, “{n} concessão(ões) de usufruto, sem mudança na titularidade das quotas.”, “Erro ao registrar a instituição de usufruto”. |
| `src/hooks/useMovimentacaoQuotas.ts:165-173,397-408,636-644,752-759,844-847` | “Quadro societário gravado”, “Erro ao gravar o quadro societário”, “{tipo} registrada” e resumo de quotas/ônus, “Erro ao registrar o movimento”, “Quotas transferidas para a controladora”, “Erro ao transferir as quotas”, “Aumento de capital gravado”, “Erro ao gravar o aumento de capital”, “Ato desfeito”, “Erro ao desfazer o ato”. Preservar chamadas e payloads. |

## 4. Arquitetura da interação

```text
Hoje, CN
  Lista de Sócios
    Doar quotas .................. DoarQuotasDialog
    Instituir usufruto ........... InstituirUsufrutoDialog
    Registrar movimento .......... MovimentoModal, começa em Aporte
    Ícone de cada sócio ........... MovimentoModal, começa em Cessão
                                    Doação no select aponta para outro botão

Proposta, CN
  Lista de Sócios
    Registrar movimento
      Escolher gesto (seis opções e seus tooltips)
        Aporte / Cessão / Doação simples / Redução
          MovimentoModal com tipo explícito
        Doação com reserva de usufruto ou gravames
          DoarQuotasDialog
        Instituição de usufruto
          InstituirUsufrutoDialog
      Continuar -> formulário existente -> registrar -> quadro atualizado
      Cancelar -> quadro
  Usufruto, voto e gravames (resumo sempre visível quando há ônus)
    Ver detalhes -> tabela existente
  Atos societários (n)
    Ver atos -> lista existente -> Desfazer -> confirmação existente
```

Um componente local `EscolherMovimentoDialog.tsx` concentra a decisão visual, sem
conhecer Supabase. Recebe o contexto de disponibilidade e devolve o gesto. A página
orquestra apenas um diálogo aberto por vez. Não criar um wizard que absorva os drafts
dos três formulários, nem um controller que replique suas mutações.

`MovimentoModal` ganha uma entrada explícita de tipo para esta navegação. O formulário
abre com o tipo escolhido e o passo de escolha é substituído por rótulo do gesto e
ajuda. Os campos Quem e Quanto, validações e montagem do payload continuam os mesmos.
Os outros dois diálogos mantêm seus estados iniciais: reserva e voto ligados, origem
declarada, três gravames padrão e cônjuge conforme cadastro. Não desligar padrões
silenciosamente para fazer o formulário parecer simples.

Adicionar **Trocar movimento** como ação textual secundária junto ao gesto, não como
segundo botão primário. Com draft limpo, volta à escolha com a opção anterior marcada.
Com draft alterado, usa a confirmação existente antes de descartá-lo. Cancelar a
confirmação mantém o formulário e seus valores. Confirmar descarta apenas o draft e
volta à escolha, sem gravar nada. Reutilizar a mecânica de dirty-close para encaminhar
o destino de saída, sem interceptar o `onSuccess` de gravação. Durante envio, a troca
fica indisponível. Não acrescentar autosave, persistência de draft ou estado na URL.

Ao salvar, fechar o formulário e voltar ao quadro pelo comportamento atual. Não abrir
Gerar Documento automaticamente. Salvar no livro não gera, valida ou registra a peça.
Troca de empresa continua remontando o contexto e nunca leva pessoas/draft para outra
sociedade. Foco entra no título/primeiro controle adequado e retorna ao botão
Registrar movimento ao encerrar. Na passagem escolha/formulário, conferir que o
restauro automático de foco do Radix não retorna ao fundo da página.

**Disponibilidade na CN:** sem saldo, Aporte continua acessível, os demais gestos
ficam indisponíveis com motivo visível. O macro exige candidatos PF como hoje. Não
ocultar a ajuda de uma opção indisponível nem transformar carregamento/erro em
“nenhum sócio”. Usar os estados dos hooks existentes, sem novas consultas ou filtros.
Não antecipar todas as regras de saldo/ônus na porta: elas pertencem ao formulário.

**PR:** preservar o contexto próprio. Antes da gravação, manter **Gravar quadro
societário** e sua confirmação, com selo **Proposta não gravada**. Depois, oferecer
**Registrar movimento** com apenas os caminhos que a PR já tem:

1. **Aumento de capital por integralização**, disponível nas mesmas condições do
   aviso de imóveis fora do capital, abrindo `AumentoDeCapitalDialog`.
2. **Transferir quotas para a controladora**, com as mesmas travas da subida,
   abrindo `SubirQuotasDialog`.

O aviso de imóveis informa a quantidade e que o aumento está em Registrar movimento,
sem outro botão primário. O motivo de bloqueio da subida e **Ir para Gerar Documento**
continuam visíveis. Não expor os seis gestos da CN na PR nesta frente. Não alterar
`gravado = quadro.length > 0`, embora saldo zerado mereça investigação separada.

Alternativa descartada para a PR: substituir “Transferir quotas para a controladora”
por Cessão no catálogo geral. Ela perderia os aportes espelhados, as conferências de
registro e a leitura do saldo da controladora. Reorganização societária continua sendo
um gesto próprio, apenas com a entrada visual alinhada à CN.

Desenhos descartados para a CN, para orientar a futura conferência visual:

```text
A. Entradas hierarquizadas
   [Registrar movimento]  Doar quotas (i)  Instituir usufruto (i)
   Mantém a escolha entre formulários na página, inclusive a sobreposição de doação.

B. Porta única com select
   [Registrar movimento] -> Tipo [Aporte v] -> Quem -> Quanto
   Esconde as alternativas e chega com uma decisão já preenchida.

C. Porta única com cartões
   [Aporte]          [Cessão]
   [Doação simples]  [Doação com reserva ou gravames]
   [Instituição]    [Redução]
   Exige comparar em duas direções e aumenta a quantidade de molduras.

D. Menu por sócio
   Sócio ... [Mais ações] -> Cessão / Doação / Instituição / Redução
   Repete comandos em todas as linhas e mantém uma segunda porta de escolha.
```

## 5. Tooltips prontos para colar

Os textos descrevem o comportamento desta branch e os modelos correspondentes. A
linha de contrato não promete geração ao clicar em Registrar. A numeração das
cláusulas depende da composição, por isso os textos nomeiam matérias, não “cláusula
oitava” ou outro número fixo. O aceite jurídico da redação da peça continua pendente
na frente de doação já indexada, não é resolvido por este plano de interface.

### Aporte

**No quadro:** Emite quotas para quem aporta e aumenta o capital social ao valor nominal. A participação e o percentual de voto são recalculados, respeitados os usufrutos existentes.

**No contrato:** Alimenta a integralização em moeda corrente e, havendo aumento em relação ao capital anteriormente publicado, a resolução de aumento. A cláusula de capital e a distribuição de quotas passam a refletir o novo saldo na peça gerada.

### Cessão

**No quadro:** Transfere quotas a título oneroso do cedente ao adquirente, sem mudar o capital social. O voto acompanha os direitos sobre as quotas, respeitados os ônus existentes e os impedimentos informados no formulário.

**No contrato:** Alimenta a resolução de cessão e a nova distribuição de quotas. Pode repercutir no ingresso ou retirada de sócios e na administração por não sócios. Os ônus vigentes continuam descritos no consolidado.

### Doação simples

**No quadro:** Registra uma transferência gratuita, sem aumentar ou reduzir o capital e sem constituir nova reserva de usufruto ou gravame. Ônus existentes podem acompanhar as quotas e influenciar quem vota.

**No contrato:** Alimenta o evento de doação e a distribuição resultante, com eventual ingresso ou retirada. Este formulário não declara origem legítima/disponível nem data de instrumento. O consolidado continua descrevendo os ônus que permanecerem vigentes.

### Doação com reserva de usufruto ou gravames

**No quadro:** Transfere quotas gratuitamente, em um ou mais pares, sem mudar o capital. Com reserva, o donatário recebe a nua propriedade e o doador conserva o usufruto. O voto só acompanha a reserva quando essa opção está marcada.

**No contrato:** Alimenta a resolução de doação, a reserva e os gravames escolhidos, com origem e data do instrumento quando informadas. A peça também compõe anuência e renúncia à preferência e o quadro de usufruto e voto conforme o caso. O consolidado republica os ônus vigentes.

### Instituição de usufruto

**No quadro:** Constitui usufruto sobre quotas que continuam com o mesmo titular, sem mudar o capital. O usufrutuário recebe uso e gozo. Recebe também o voto se a extensão ao voto estiver marcada.

**No contrato:** O ônus vigente já aparece no contrato consolidado. A resolução própria da instituição ainda não é incluída automaticamente na alteração contratual por este fluxo.

### Redução

**No quadro:** Cancela quotas do titular indicado e reduz o capital ao valor nominal. Recalcula as participações e o voto. O ônus incidente nas quotas canceladas é encerrado na proporção atingida.

**No contrato:** O capital e o quadro resultantes alimentam a peça. Este fluxo ainda não deriva uma resolução específica de redução de capital. Registrar a redução aqui não garante sua descrição completa na alteração contratual.

Essa última ressalva é verificável em `eventosDaAlteracao.ts:129-270`: há aumento,
integralização, cessão e doação, mas não um ramo de redução. Não inventar o ramo para
melhorar o tooltip. A instituição tem lacuna distinta, documentada na seção 2.

### Nua propriedade

**No quadro:** É a titularidade da quota sujeita a usufruto de outra pessoa. Não representa quotas adicionais. O nu-proprietário conserva o voto quando o usufruto não o abrange.

**No contrato:** É discriminada no quadro de usufruto do consolidado. A quota aparece sob direitos distintos, sem duplicar o capital social.

### Usufruto estendido ao voto

**No quadro:** Quando marcado, o usufrutuário exerce o voto das quotas abrangidas. Quando desmarcado, recebe uso e gozo, mas o voto permanece com o titular. O capital não muda por essa escolha.

**No contrato:** Define a previsão de voto na reserva e a distribuição de voz e voto no consolidado, com referência ao art. 114 da Lei 6.404/76 e ao art. 1.053 do Código Civil. Na instituição avulsa, permanece a limitação de inclusão da resolução própria.

### Inalienabilidade

**No quadro:** Grava as quotas sem mudar sua quantidade, capital ou voto por si só. O sistema impede cessão onerosa que alcance quotas inalienáveis. A transmissão gratuita tem tratamento próprio de sub-rogação.

**No contrato:** A restrição integra os gravames da doação e é republicada no capital e nas disposições de alienação do consolidado. A redação contratual restringe a transferência e deve ser conferida, mesmo quando o sistema admite registrar uma transmissão gratuita.

### Impenhorabilidade

**No quadro:** Registra a proteção das quotas contra dívidas do donatário, sem alterar capital, titularidade ou voto por si só. A marcação não executa medidas judiciais.

**No contrato:** Inclui a impenhorabilidade entre os gravames da doação e nas menções aos gravames vigentes do consolidado, conforme a redação do instrumento.

### Incomunicabilidade

**No quadro:** Registra que as quotas doadas não se comunicam ao cônjuge do donatário. A marcação não muda capital, quantidade de quotas ou voto por si só.

**No contrato:** Inclui a incomunicabilidade entre os gravames da doação e nas menções aos gravames vigentes do consolidado, conforme a redação do instrumento.

### Reversibilidade

**No quadro:** Registra a condição de retorno das quotas ao doador se ele sobreviver ao donatário. Não transfere quotas agora nem executa o retorno automaticamente por falecimento.

**No contrato:** Inclui a reversibilidade entre os gravames da doação e nas menções aos gravames vigentes do consolidado. A condição deve constar da redação do instrumento.

### Origem legítima e disponível

**No quadro:** Declara a origem patrimonial das quotas doadas, sem mudar o total, capital ou voto. O formulário reparte metade para a legítima e metade para a disponível, deixando a quota ímpar na legítima. Não calcula a suficiência do patrimônio do doador.

**No contrato:** Informa, em cada par de doação, quantas quotas saem da legítima e da parte disponível. Desmarcada a declaração, a cláusula omite essa divisão.

### Valor nominal

**No quadro:** É o valor de capital atribuído à quota, não o preço de cessão. Os novos movimentos deste formulário usam R$ 1,00 por quota. Na Controladora, o indicador do quadro é calculado pelo capital dividido pelo total de quotas.

**No contrato:** Compõe os valores de capital e integralização e a distribuição de quotas. Não declara o preço pago em uma cessão nem altera sozinho o capital já registrado.

### Ajuda adicional das saídas da PR

**Aumento de capital por integralização**

**No quadro:** Acrescenta os aportes dos imóveis aprovados ainda fora do capital e a parcela em moeda corrente informada por sócio. Aumenta capital e quotas e recalcula a participação.

**No contrato:** Alimenta aumento e integralização, com alíneas próprias para os bens e para a moeda corrente. O consolidado publica o novo capital e o quadro resultante.

**Transferir quotas para a controladora**

**No quadro:** Registra cessões na Proprietária e aportes correspondentes na Controladora, em um ato. O capital da Proprietária permanece e o da Controladora aumenta pelo valor aportado. Confira a participação resultante nas duas sociedades.

**No contrato:** Alimenta a cessão na peça da Proprietária e a integralização com quotas de outra sociedade na peça da Controladora, com aumento quando aplicável. O gesto não gera nem registra as peças automaticamente.

## 6. Limpeza da página e dos formulários

### Ordem de leitura da página

```text
Quadro Societário
Cliente e empresa, pelas barras existentes

Lista de Sócios (n)                         [Registrar movimento]
traço moss sob o título
Capital social: R$ ...   Quotas: ...   Valor nominal: R$ ... (i)
Saldo apurado pelos movimentos de quotas.
Busca
Tabela: Sócio | Quotas | Valor de capital (R$) | Participação no capital

Usufruto, voto e gravames                   [Ver detalhes]
Há ônus vigentes sobre as quotas. Participação no capital e voto podem diferir.

Atos societários (n)                       [Ver atos]
```

* **Sai:** trio de cards KPI, fundo moss de capital, count-up e cascata decorativa
  dessa área. Os mesmos três números passam a uma faixa de resumo dentro do card
  principal, sem três molduras. A hierarquia deixa de obrigar a ler indicadores
  grandes antes de chegar à tabela.
* **Sai:** ação por sócio, avatar de iniciais e barra de participação. Nome,
  identificação e percentual continuam. O percentual dispensa badge colorido em
  todas as linhas. Não trocar dados por decoração menor.
* **Vira detalhe:** procedência mostra a primeira origem e um comando textual
  **Ver procedência ({n})** quando há mais de uma. Expande as origens completas na
  própria célula. Não apagar o vínculo com o ledger nem chamar isso de histórico
  completo. CPF/CNPJ permanece legível, sem um novo botão para consultá-lo.
* **Colapsa:** a tabela de Usufruto e voto, mas não a existência de ônus. Cabeçalho e
  a frase acima continuam sempre visíveis quando houver ônus, inclusive só gravames
  ou usufruto sem voto. Ao expandir, reaproveitar a tabela com todas as colunas,
  pessoas com zero quotas e gravames. **Ver detalhes** vira **Ocultar detalhes**.
* **Colapsa:** lista de Atos societários sob o cabeçalho com contagem e **Ver atos**.
  Aberta, mantém nomes completos, data, quantidade, estado e Desfazer. Não chamar o
  conjunto de “Histórico de movimentos”, nem contar atos não carimbados como
  “alterações contratuais pendentes”. Instituição e avulso mostram por que isso falha.
* **Permanece visível:** bloqueios reais, proposta ainda não gravada da PR, bens fora
  do capital e atalhos de correção de cadastro/documento. Esconder essas informações
  economizaria espaço às custas de o consultor não entender por que não pode agir.

Usar `Collapsible` existente para os detalhes. As seções iniciam recolhidas por empresa,
com estado local. Não persistir a preferência. Sem ônus ou atos, continuam ausentes
como hoje. Carregamento/erro não deve ser rotulado como ausência confirmada. Nos
estados vazios da CN, manter um só Registrar movimento e trocar o texto por
**O quadro começa com um aporte. Use Registrar movimento para informar quem recebe
as quotas.** Qualificação das Partes vira link secundário para cadastrar pessoa ausente.

Cards recebem borda `border-osg-300/60` e traço `osg-moss` sob o título, sem fundos
fortes concorrentes. A faixa numérica pode quebrar linhas em tela estreita. As tabelas
continuam com rolagem horizontal própria quando necessário. Não encolher números ou
rótulos jurídicos até deixarem de ser legíveis. Manter tokens OSG e foco visível.

### Dentro dos formulários

Preservar `OsgDialog`, `FieldSection`, `fieldCls`, `labelCls`, cabeçalho identificado
e rodapé de ação. Não adicionar biblioteca nem trocar todos os campos de kit.

No macro da doação, manter as condições visíveis, pois várias já começam marcadas.
Retirar os parágrafos didáticos repetidos das caixas e colocar a redação da seção 5
nos ícones. Quatro gravames viram quatro linhas de checkbox com label e ajuda, em
vez de quatro cards. Reserva, voto e cônjuge não ficam atrás de “Avançado”.
Preservar saldos restantes, origem calculada e a revisão depois do ato. Adicionar par
continua ao fim da lista. Remover par/concessão ganha nome acessível específico da
linha, sem introduzir confirmação de exclusão para linhas ainda não gravadas.

Microcopy substituta, restrita à apresentação:

| Ponto | Texto proposto |
|---|---|
| Introdução da doação | “Registre os pares de doação e confira a reserva de usufruto, o voto e os gravames aplicáveis.” |
| Reserva desligada | “Sem reserva de usufruto. Os gravames selecionados continuam aplicáveis.” |
| Doação em ato, orientação ao caso onerado | “Para transferir quotas já oneradas, use Registrar movimento e escolha Doação simples. Este formulário não reparte ônus preexistente entre pares.” |
| Data do instrumento | “Data do instrumento particular citado na alteração contratual. Informar a data não anexa o arquivo.” |
| Introdução da instituição | “Institua usufruto sem mudar a titularidade das quotas. Confira quem recebe o uso, o gozo e, se marcado, o voto.” |
| Instituição, antes de registrar | “O consolidado já descreve o ônus. A resolução própria da instituição ainda não é incluída automaticamente neste fluxo.” |
| Redução, antes de registrar | “A redução altera o saldo e o capital. Este fluxo ainda não deriva sua resolução específica na alteração contratual.” |
| PR gravada | “Saldo apurado da movimentação de quotas.” |
| Ajuda do card de atos, aberto | “Esta lista reúne atos agrupados, inclusive os que criaram apenas ônus. Movimentos avulsos não aparecem aqui.” |
| Confirmação de reversão com movimentos | “Os lançamentos e os ônus criados por este ato serão removidos das empresas envolvidas. Os ônus que ele extinguiu serão restaurados. Não há como desfazer esta ação.” |

Não ajustar silenciosamente frases retornadas pelo domínio. Por exemplo, o aviso da
instituição sobre ficar sem voto pode aparecer com `comVoto=false`, pois a condição
em `onusDaSociedade.ts:329-335` não consulta essa flag. É achado separado, não motivo
para ocultar avisos do formulário. O tooltip deve explicar corretamente a opção.

## 7. Execução em fatias

Cada fatia é um commit de implementação futuro, verificável sem entregar banco novo.
Este documento não executa nenhuma delas. Atualizar seu status e a linha do índice
conforme cada fatia entrar, sem marcar a frente inteira como concluída antes do aceite.

### Fatia 1. Caracterização e ajuda contextual

**Arquivos:** novos testes de apresentação em `quadro-societario/`,
`AjudaSocietaria.tsx` e `ajudaSocietaria.ts` locais, `MovimentoModal.tsx`,
`DoarQuotasDialog.tsx`, `ParesDaDoacao.tsx`, `InstituirUsufrutoDialog.tsx`,
`UsufrutoEVoto.tsx`. A ajuda local compõe o tooltip existente, não substitui o kit.

Antes de mover JSX, caracterizar a inicialização, filtros de pessoas, visibilidade
condicional, dirty-close e payload recebido pelos hooks nos três formulários. Guardar
casos avulso PF/PJ, macro sem reserva e com gravames, e instituição sem voto. Depois,
adicionar os tooltips prontos e corrigir os textos de apresentação da seção 6 que
independem da porta nova. A orientação “escolha Doação simples” entra somente na
fatia 2, quando essa opção passa a existir. A navegação antiga permanece nesta
entrega intermediária.

**Aceite:** efeito e contrato acessíveis por mouse, teclado e toque. Clicar em ajuda
não alterna um campo. Textos explicativos não substituem avisos de validação. Os
payloads e padrões caracterizados permanecem iguais.

### Fatia 2. Porta única da CN

**Arquivos:** `QS`, novo `EscolherMovimentoDialog.tsx`, `MovimentoModal.tsx`,
`DoarQuotasDialog.tsx`, `InstituirUsufrutoDialog.tsx` e testes correspondentes.

Trocar as três entradas pelo seletor de seis gestos. Retirar a ação por linha da
página, deixando `TabelaSocios` operar sem `acaoDoSocio`. Passar tipo explícito ao
avulso, retirar seu select redundante e aviso antigo. Implementar Trocar movimento
com descarte confirmado, reaproveitando o padrão de guard. Usar imports por alias.

**Aceite:** cada opção abre exatamente um dos formulários, sem gravação ao escolher.
Nenhum caminho doação vira outro hook por inferência. Cancelar/trocar/reabrir não
vaza draft entre gestos ou empresas. O erro do macro sobre quotas já oneradas ainda
aponta para uma entrada que existe, e a orientação leva à Doação simples.

### Fatia 3. Hierarquia da página, incluindo PR

**Arquivos:** `QS`, `QuadroEmpresaProprietaria.tsx`, `quadroKit.tsx`,
`TabelaSocios.tsx`, `UsufrutoEVoto.tsx`, `AtosSocietarios.tsx`,
`EscolherMovimentoDialog.tsx` e testes de página.

Aplicar faixa de resumo, borda/traço aprovados, tabela sem adornos repetidos,
procedência expansível e detalhes recolhíveis. Na PR, reunir as duas saídas existentes
na porta contextual, mantendo proposta e travas. Remover `KpiCard`, count-up e imports
quando não houver consumidores, após conferir os usos. Não criar hooks novos de dados.
Remover também o contrato `acaoDoSocio` e a coluna condicional de `TabelaSocios` se
a busca de consumidores confirmar que ninguém mais os fornece.

**Aceite:** CN tem um comando de registro e zero ações por sócio. PR mantém gravação
da proposta ou escolha de suas duas operações, conforme estado. Nenhuma trava muda.
Ônus e atos continuam descobríveis sem expandir. Atos sem movimentos continuam na
lista. Busca preserva filtros e regra de ocultar Total. As duas tabelas mantêm as
somas, pessoas e percentuais de antes.

### Fatia 4. Densidade dos formulários e revisão

**Arquivos:** `DoarQuotasDialog.tsx`, `ParesDaDoacao.tsx`,
`InstituirUsufrutoDialog.tsx`, `MovimentoModal.tsx`, `AtosSocietarios.tsx` e testes.
`AumentoDeCapitalDialog.tsx` e `SubirQuotasDialog.tsx` apenas para aplicar a ajuda das
operações da PR e alinhamento visual local, preservando seus formulários.

Retirar explicações duplicadas já cobertas pelos tooltips, compactar gravames e
manter condições marcadas e revisão à vista. Usar empresa também no título da
instituição. Ajustar a confirmação textual de reversão. Não transformar revisão em
uma nova etapa obrigatória, nem adicionar validações de domínio.

**Aceite:** reserva desligada não esconde gravames ativos. Voto desligado não é
descrito como transferido nos novos textos. Cônjuge selecionado está visível.
Quantidade restante, origem ímpar, ordem dos pares e envio pendente se comportam como
na caracterização. O rodapé permanece alcançável com rolagem e zoom.

### Fatia 5. Conferência no navegador e com consultores

**Arquivos:** teste de fluxo futuro em `e2e/`, seletores afetados de
`e2e/demos/ac-reorganizacao-societaria.mjs`, evidência em `docs/osg/` e este plano/índice.
Não reescrever arquivos de evidência de execuções passadas para fingir resultado novo.

Conseguir sessão de sandbox pelo caminho documentado. Conferir desktop 1366×768,
tela estreita 390×844, zoom 200%, modo escuro e teclado. Usar casos de CN vazia, CN
com PF/PJ, doador que zera mas segue usufrutuário, só gravames, usufruto sem voto,
instituição sem movimento, PR proposta, PR bloqueada e PR com imóvel fora do capital.
Gravações de validação, se necessárias na execução, somente em dados de teste do
sandbox. Este planejamento não as fez.

Pedir ao consultor que encontre aporte, doação simples, reserva e instituição sem
instrução sobre qual botão usar. Antes de enviar, ele deve identificar efeito no
capital, quem vota e o que a peça poderá descrever. Verificar se encontra ônus,
procedência e reversão. Registrar tropeços e ajuda solicitada, não presumir que a
redução de botões prova usabilidade.

Se a observação produzir empate real entre lista vertical e cartões compactos,
materializar **duas versões rodando**, nas branches futuras
`feat/osg-movimentos-lista` e `feat/osg-movimentos-cartoes`, partindo da mesma base e
com os mesmos casos. Comparar tarefas idênticas. Não pedir escolha num menu abstrato
nem implementar duas variantes agora. A recomendação deste plano continua sendo lista.

## 8. Riscos, testes e limites da proposta

### O que não pode mudar como efeito colateral

* Movimento sem `documento_gerado_id` continua pendente, com ou sem ato. A entrada
  visual não cria `ato_id`, não reordena `sequencia` e não agrupa avulsos para fazê-los
  aparecer em Atos societários. O carimbo continua no registro da peça, não no envio
  do formulário, na geração ou na validação.
* Doação simples continua chegando a `useRegistrarMovimento`, inclusive sua
  sub-rogação. Macro continua criando ato, movimentos e ônus na ordem atual, com
  compensação em falha. Instituição continua sem escrever em `movimentacao_quotas`.
* Queries, enabled, filtros, invalidações e auditoria continuam nos hooks atuais.
  A UI não lê Supabase. Não usar a refatoração para corrigir gaps de auditoria.
* Redução não ganha evento novo. Instituição não ganha marcador de formalização.
  Os tooltips e os avisos visíveis reconhecem esses limites.
* Usufrutuário com zero quotas não pode desaparecer. Participação de capital e
  percentual de voto não são intercambiáveis. Gravames sem usufruto ainda precisam
  ser apresentados. Recolher uma seção não muda a fonte do contrato.
* Nenhum `.tsx` de produção deve ultrapassar 600 linhas, com fachada abaixo de 400
  como meta. Extrair blocos com responsabilidade, depois de caracterizar. Não criar
  wrappers que apenas repassam todas as props.

### Matriz de regressão

| Testes existentes | O que protegem / cuidado na mudança |
|---|---|
| `src/lib/osg/movimentoQuotas.test.ts` | Quatro tipos, lados nulos, inteiros, saldo, capital nominal e pagamento. Não remover `doacao` do domínio porque saiu do select. |
| `src/lib/osg/doacaoDeQuotas.test.ts:54-245` | Metades e sobra na legítima, ordem dos pares, quadro resultante, doador retirante, cônjuge conjunto, sem reserva/sem gravame, só gravame, sem voto, avisos. Mantêm-se os casos e as expectativas semânticas. |
| `src/lib/osg/onusDaSociedade.test.ts:26-250` | Quotas livres primeiro, sub-rogação parcial/total, ordem, cessão onerosa impedida, transmissão gratuita permitida, consolidação e redução. Instituição com limites por concedente e ônus anterior. |
| `src/lib/osg/usufrutoDoAto.test.ts` | Não contar usufruto conjunto duas vezes, voto e aritmética. Não refazer a tabela com contas próprias na UI. |
| `src/lib/osg/eventosDaAlteracao.test.ts:125-185,240-322,353-451` | Doação separada de cessão, pendências por documento, capital anterior pelo snapshot, empresa correta, retirada e administração. Nenhuma expectativa muda por este plano. |
| `src/hooks/useDoacaoDeQuotas.test.tsx:125-246` | Ordem ato/movimentos/ônus, vínculo por sequência, rollback, recusa de doador onerado, invalidações e diff de auditoria. A recusa verifica trecho “já tem quotas gravadas ou sob usufruto”, não só um código. |
| `src/hooks/useInstituicaoDeUsufruto.test.tsx:91-142` | Ato e ônus sem movimento, rollback, recusa, invalidações. Afirma que instituição não invalida quadro. Não alinhar artificialmente os hooks. |
| `src/hooks/useMovimentacaoQuotas.test.tsx:56-180,265-294` | Invalidações de aporte/aumento/reversão, restaurar ônus antes de apagar ato, empresa com só ônus e trava de ingresso no hook de subida. Não afrouxar porque a porta já verificou disponibilidade. |
| `src/hooks/useEventosDaAlteracao.formalizar.test.tsx` | Formalização no fluxo documental. Não chamar esse caminho ao registrar um movimento. |
| `src/lib/templates/mapeadores.test.ts` e `consolidacaoDoOnus.test.ts` | Listas de doação, estado dos ônus, tabela e redação literal dos três ecos. Tooltip novo não é motivo para atualizar snapshots/textos do contrato. |
| `src/lib/osg/aporteInicial.test.ts`, `subidaDeQuotas.test.ts`, `travaDaSubida.test.ts`, `travaDoIngresso.test.ts` | Proposta PR, aumento, operação espelhada e pré-condições que a limpeza visual não altera. |
| `e2e/demos/ac-reorganizacao-societaria.mjs:310-317` | Procura “Lista de Sócios” e botão “Registrar movimento”. A PR passará a ter esse rótulo com outro catálogo, então o roteiro deve inspecionar a opção aberta, não inferir capacidade pelo nome do botão. |

Não foram encontrados testes de renderização dedicados aos três formulários na busca
por seus nomes em `src/**/*.test.*`. O wiring de hook testa gravação, não prova foco,
roteamento visual ou preservação de draft. A caracterização da fatia 1 cobre esse
vazio antes da mudança estrutural.

Na execução, rodar os testes de apresentação da fatia e a base de regressão:

```sh
bunx vitest run src/lib/osg src/hooks/useMovimentacaoQuotas.test.tsx src/hooks/useDoacaoDeQuotas.test.tsx src/hooks/useInstituicaoDeUsufruto.test.tsx src/hooks/useEventosDaAlteracao.formalizar.test.tsx src/lib/templates/mapeadores.test.ts src/lib/templates/consolidacaoDoOnus.test.ts
bun run typecheck
bun run build
```

Rodar ESLint nos arquivos TS/TSX efetivamente tocados. Não atualizar expectativas de
payload, texto jurídico ou invalidação para fazer passar uma mudança que era visual.
Textos de apresentação deliberadamente substituídos na seção 6 podem mudar nos testes
de UI, junto com os seletores que os usavam. Este commit de documentação não executou
a suíte do app nem declara que ela passou.

### Achados que ficam fora da execução de UI

1. `useRegistrarMovimento` não invalida `movimentos-da-empresa` nem as listas de
   aportes/cessões após sucesso (`:379-386`), diferentemente dos macros. Não prometer
   atualização imediata da procedência ou de Gerar como consequência da porta única.
2. `onusDaSociedade.ts:329-335` emite aviso de perda de voz/voto sem verificar
   `comVoto`. Preservar a regra durante a divisão e abrir correção específica.
3. A redação de inalienabilidade no consolidado é mais abrangente que a recusa do
   domínio (`consolidacaoDoOnus.test.ts:29`, `onusDaSociedade.ts:189-197`). A UI não
   deve declarar que uma transmissão admitida pelo sistema está juridicamente liberada.
4. PR considera gravado quando há saldo, não quando há histórico (`:70`). O plano
   não muda o tratamento de uma empresa cujo saldo tenha sido zerado.
5. Atos societários não é um histórico completo. A formalização local da lista e a
   ausência de carimbo de instituição não devem ser convertidas em indicadores novos
   de “pendente de contrato”. Movimento avulso continua sem Desfazer nessa lista.
6. A previsão de voto do macro considera as concessões do próprio plano
   (`doacaoDeQuotas.ts:340-355`), ao passo que a instituição soma ônus vigentes e
   novos. Não vender a primeira como conferência completa de todos os ônus anteriores.
7. A sub-rogação da subida continua fora da frente, conforme
   `docs/osg/doacao-de-quotas-com-usufruto.md:275-276`. Reunir a entrada não corrige isso.

O aceite final de interface exige evidência nova do navegador e de uso. A tentativa
de sessão descrita na seção 2 não valida o desenho proposto.
