# Prompt de handoff — execução do teste e2e de geração de contrato

Copiar o bloco abaixo e mandar para o agente que vai executar.

---

Você vai executar um teste e2e manual, dirigindo o navegador pelo Playwright MCP, do fluxo
completo de geração de contrato da área OSG deste app. A preparação já está feita: os dados
foram extraídos dos documentos do cliente e o roteiro de passos está escrito. Seu trabalho é
executar, verificar e relatar, não redesenhar o plano.

## Leia primeiro, nesta ordem

1. `e2e/dados/roteiro.md` — os 28 passos (P00 a P27), com rota e critério de verificação de cada um.
2. `e2e/dados/dossie.json` — todos os dados a digitar. É a fonte única de verdade.
3. `e2e/dados/estado.json` — onde você registra o progresso.
4. `AGENTS.md` — convenções do repositório.

Você está na branch `test/e2e-geracao-contrato`. Não troque de branch.

## Ambiente

- O app roda em `http://localhost:8080` (Vite). Confira se já está no ar antes de subir outro:
  `ss -tlnp | grep 8080`. Se não estiver, `bun run dev`.
- Login: `bi@psaconsultores.com.br`, senha `digital2025`. A tela é `/equipe`: escolher a área
  OSG e depois email/senha. **Nunca escreva essas credenciais em nenhum arquivo do repositório.**
- O navegador do Playwright MCP (chrome-for-testing build 1237) já está instalado.

## O ponto mais importante deste teste

Este projeto tem **um único banco Supabase, que é produção**. O isolamento do teste é por
coluna, não por instância: rodando em `localhost`, `currentAmbiente` resolve para `dev`
(`src/config/api.ts:45`) e o cliente criado nasce com `ambiente='dev'`, invisível nas listas de
produção. As tabelas filhas (`pessoa`, `bem`, `matricula`, `documento_gerado`) não têm coluna de
ambiente e herdam o escopo pelo `cliente_id`.

Consequências que você deve respeitar:

- **Nunca** execute o teste apontando para uma URL de produção. Só `localhost`.
- **Pare e peça confirmação ao Bernardo antes do primeiro insert (P01)** e **antes da limpeza
  (P27)**. São os dois momentos que tocam dados de verdade. Não decida sozinho.
- O nome do cliente começa com `[TESTE E2E]` de propósito. Mantenha.

## Como executar cada passo

1. Um passo = **um formulário salvo**. Não agrupe passos.
2. O critério de sucesso é **o registro aparecer na lista**, nunca o toast de sucesso.
3. Ao fim de cada passo, atualize `e2e/dados/estado.json`: `status` do passo, o id gerado em
   `ids`, e uma linha de `obs` se algo chamou atenção. Este arquivo é a sua memória externa: se
   a sessão cair ou o contexto compactar, você retoma pelo primeiro passo que não está `ok`,
   lendo o arquivo, não o histórico da conversa.
4. Digite só o que está no `dossie.json`. Se um campo obrigatório do formulário não tem
   correspondente no dossiê, **não invente**: registre em `achados` e siga com o campo vazio (ou
   pare, se o formulário não salvar sem ele).
5. Quando algo não funcionar como esperado, **registre o achado e continue** o resto do roteiro.
   Não conserte o código do app, não contorne por SQL, não force por `browser_evaluate`. O
   objetivo é descobrir o que está quebrado, não chegar ao fim a qualquer custo.
6. Tire screenshot nos passos que mudam de tela (P01, P12, P23, P25) e nos que falharem.
7. Prefira `browser_find` com o texto que você procura a despejar a árvore inteira com
   `browser_snapshot`. O snapshot completo é verboso e enche o contexto rápido.

## Pontos de atenção já mapeados

- **P11 vem antes de P13.** O campo Cartório é um select alimentado pela tabela `cartorio`. Se o
  cartório de 1º Ofício de Lucas do Rio Verde não existir, cadastrá-lo faz parte do teste.
- **P05 existe por causa da ordem.** O select de cônjuge só lista PF já cadastradas, então o
  vínculo do primeiro fundador só fecha depois de criar o segundo.
- **P19 e P21 são o caso interessante:** duas matrículas sob um mesmo bem, compartilhando o mesmo
  código CCIR. Isso é correto (o cadastro do INCRA é da unidade rural, não da matrícula). Se o
  app recusar o CCIR repetido ou tratá-lo como único por matrícula, é achado.
- **P22 é controle negativo.** As quotas da cooperativa não participam da estruturação, e o
  contrato gerado **não** deve citá-las. Se citar, é achado.
- **Vocabulário divergente.** O Diagnóstico Patrimonial diz "Próprio" onde o select do app só
  oferece Exploração Direta / Arrendamento / Parceria / Comodato / Posse / Outro. Já está
  resolvido no dossiê, mas vale conferir se aparece em outros campos.

## A decisão que ainda está aberta

**Qual contrato gerar no P25 não está definido.** Antes de chegar lá, abra
`/equipe/osg/work/biblioteca-modelos`, liste os modelos que existem de fato e leve a lista ao
Bernardo com uma recomendação. A pasta de origem tem modelos de contrato social Agro e de
Controladora, além de instrumentos de doação, mas não sabemos quais estão cadastrados no app.
Se não houver nenhum modelo de contrato social, o teste para em P25 e **isso já é um
resultado válido** — relate e não tente criar o modelo por conta própria.

## Conferência final (P26)

O `.docx` gerado deve ser comparado campo a campo com o dossiê. Os gabaritos são os
`descricao_psa_completa` de cada matrícula (o da 9.617 veio do modelo oficial da PSA; os outros
foram reconstruídos a partir dos contratos registrados).

Antes de acusar um erro do gerador, **confira as 10 entradas de `_divergencias` no dossiê**. Elas
listam os pontos onde os próprios documentos do cliente discordam entre si (área da Fazenda
Tarumã, um centavo na matrícula 2.623, titularidade da 2.628, entre outros). Divergência de
origem não é bug do gerador, e confundir as duas coisas é o principal risco desta etapa.

## Relatório final

Ao terminar, entregue:

1. **Placar:** quantos passos ok, falhou, bloqueado, pulado.
2. **Achados**, do mais grave ao menos: o que aconteceu, em que passo, o que era esperado.
3. **Conferência do contrato:** lista dos campos que saíram errados ou vazios, separando o que é
   bug do gerador do que é divergência de origem.
4. **O que ficou de fora** e por quê.

Seja fiel ao que aconteceu: se um passo falhou, diga que falhou e mostre o erro. Se pulou, diga
que pulou. Não relate como concluído nada que não tenha verificado na lista.

Uma preferência de escrita do Bernardo: não use travessão longo em nada que você escrever para
ele. Troque por vírgula, parênteses ou dois-pontos.
