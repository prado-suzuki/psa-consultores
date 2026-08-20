# 07 — Tooltips de justificativa (versão anterior à troca por trecho do modelo)

Este documento é um **backup de conteúdo**, não uma decisão nova. Até 20/08/2026 cada
campo do cadastro (`ExploracaoRuralDadosTab.tsx` / `ExploracaoRuralImoveisTab.tsx`) tinha
um tooltip (`Dica`, ícone `Info` ao lado do rótulo) explicando **por que o campo existe** —
lastro em contrato real, achado de reunião, regra de negócio. A pedido do usuário, esses
tooltips estão sendo substituídos por um tooltip que mostra **o trecho literal do modelo
oficial onde o campo é usado**, com o campo como `{{variável}}` (ver `contratoRuralBlocos.ts`
e o novo mapeador `contratoRuralCampoOrigem.ts`).

Este arquivo garante que a justificativa de cada campo — o "porquê", que não está em
nenhum outro lugar — não se perde na troca. Serve como referência para quem for escrever o
próximo tooltip, o card de campo no OpenProject, ou o texto de ajuda de uma tela futura.

## Aba "Dados"

### Seção 01 — Instrumento
*(hint da seção: "6 valores no enum; só Parceria e Composse têm modelo de cláusula")*

- **Tipo de exploração** — O enum `osg_tipo_exploracao` já tem 6 valores no banco, mas só
  Parceria e Composse têm modelo de cláusula escrito — os outros ficam desabilitados para
  não gerar documento vazio.
- **Data da assinatura** — sem tooltip.
- **Data de encerramento** *(só Parceria)* — sem tooltip.
- **Vigência prorrogável** *(só Parceria)* — sem tooltip.
- **Prazo de renovação** *(só Parceria)* — Redação fechada no template oficial (passa a
  tempo indeterminado, saída em 30 dias após notificação ou após a colheita). Só preencher
  se a consultora quiser regra diferente da padrão.

### Seção 02 — Partes
*(hint da seção: Composse "frações somam 100% dos frutos deste instrumento" / Parceria
"outorgante único; exploradores sem fração individual")*

- **Outorgante** *(só Parceria)* — Sempre um único, confirmado na reunião de validação de
  19/08: se duas empresas cedem, são duas Parcerias separadas. A qualificação vem do
  cadastro de Pessoa, não é redigitada aqui.
- **Exploradores** *(lista, só Parceria)* — sem tooltip próprio (só selo).
- **Compossuidores e distribuição interna** *(lista, só Composse)* — sem tooltip próprio
  (só selo).
- **Nome da composse** *(só Composse)* — Derivado: 1º compossuidor + "E OUTROS", convenção
  confirmada em `[BV-COM]` e `[ROS-COM]`. Bloqueado porque é computado, mas leva selo —
  cadastro nenhum produz esse nome hoje.

### Seção 03 — Percentual e exploração / Exploração
*(hint da seção: Composse "a partilha vem das frações dos compossuidores, não daqui" /
Parceria "mudança de percentual exige Termo Aditivo")*

- **Percentual do outorgante** *(só Parceria)* — Corte agregado entre o lado outorgante e o
  lado outorgados. Não confundir com `imovel.percentual` (fração de propriedade) nem com a
  fração dos compossuidores.
- **Percentual do explorador** *(só Parceria)* — Vale para o conjunto dos outorgados, não
  por pessoa — o percentual individual só existe na Composse. Valores reais observados:
  90/10, 70/30, 96/4, 93,9/6,1, 35/65.
- **Culturas/atividades permitidas** — Mais largo que só cultivo: o `[BV-COM]` lista
  lavouras e pecuária na mesma cláusula. A flag de cultura específica (ex.: algodão) sai
  desta lista, não é digitada duas vezes.
- **Permite penhor / financiamento** — Liga ou desliga o capítulo inteiro do penhor
  (Cláusulas 14ª a 17ª do `[BV-COM]`): produção e bens em garantia de financiamento.

### Seção 04 — Indivisão e administração *(só Composse)*
*(hint da seção: "[BV-COM] usa maioria e 60× mensal; [ROS-COM], nomeados e 10× anual")*

- **Prazo de indivisão** — Quantidade + unidade, não texto livre: a composse nova do
  Franciosi ficou com "prazo de 10 anos… renovando-se o prazo de 3 anos", porque o 3 sobrou
  do template. Distinto da vigência da Parceria de origem. No `[BV-COM]`, 3 anos da
  assinatura.
- **Indivisão prorrogável** — sem tooltip.
- **Aviso prévio para não renovar** — No `[BV-COM]` a indivisão renova por período igual,
  salvo pedido escrito de divisão até 3 meses antes do vencimento.
- **Regra de administração** — Sem padrão único entre contratos reais: `[BV-COM]` exige
  maioria dos percentuais, `[ROS-COM]` nomeia 2 compossuidores fixos. Achado ao redigir o
  modelo de contrato.
- **Periodicidade da liquidação** — Liquidação de haveres do compossuidor que sai. Também
  sem padrão: `[BV-COM]` usa 60 parcelas mensais, `[ROS-COM]` 10 anuais — ambas corrigidas
  pelo INPC.
- **Número de parcelas** — sem tooltip.
- **Administradores nomeados** *(lista)* — sem tooltip próprio (só selo).

### Seção 05 — Documento de origem
*(hint da seção: "tipo e instrumento de origem ficam por imóvel, na outra aba")*

- **Estudo fiscal** *(só Parceria)* — O entregável é o relatório/apresentação em PDF do
  Fiscal, não a planilha WP interna (confirmado com a Mônica). Seleção de arquivo já
  classificado; sem importação nesta sprint.
- **Documento comprobatório** *(só Composse)* — Arquivo do instrumento registrado, vindo de
  Documentos do Cliente. O tipo e a referência da origem ficam por imóvel, na aba Imóveis e
  origens.

### Seção 06 — Assinatura
*(hint da seção: "nenhum destes tem coluna no banco; todo contrato real traz os cinco")*

- **Foro — comarca** — Procurei em todo o schema: foro não existe em coluna nenhuma. Todo
  contrato real elege um.
- **Foro — UF** — sem tooltip.
- **Testemunha 1** — Não existe tabela de testemunha no banco. O bloco de assinatura dos
  dois templates oficiais pede nome, CPF e RG.
- **Testemunha 2** — sem tooltip (mesma justificativa da Testemunha 1).
- **Número de vias** — A cláusula de encerramento cita o número, e ele varia: `[BV-PAR]` 4
  vias, `[BV-COM]` 3 vias.

## Aba "Imóveis e origens"

Nota fixa acima da lista de cartões (não é tooltip, é texto corrido): "Um cartão por
matrícula. Nome do imóvel, município, áreas, cartório, proprietário e confrontações não
aparecem aqui: já vêm da matrícula e do bem, que têm cadastro próprio." + (Composse:
"'Situação da origem' é computada, não digitada." / Parceria: "Numa Parceria a origem é
sempre a própria matrícula.")

- **Imóvel / matrícula** — Seleciona matrícula já cadastrada. Município, áreas, cartório,
  proprietário, georreferenciamento e confrontações vêm dela e por isso não são repetidos
  aqui.
- **Área explorada** — Por instrumento × imóvel. `matricula.area_explorada` é 1 valor por
  matrícula — grão diferente, não serve de fonte: a mesma matrícula pode estar em duas
  Parcerias com áreas distintas.
- **Tipo da origem** *(só Composse)* — Só existe na Composse (OSG, 19/08): numa Parceria a
  origem é sempre a própria matrícula. "Composse" não é valor válido — trava na composse.
  "Exploração própria" é o nome que a consultora deu ao caso sem contrato de cessão por
  trás.
- **Instrumento de origem** *(só Composse)* — Aponta o elo anterior da cadeia. No
  `[BV-COM]`, 5 das 6 origens são contratos com terceiros que não são clientes da PSA — para
  esses use "Origem fora do sistema", senão o Considerando V não pode ser montado.
- **Título do instrumento** *(origem externa)* — Varia muito: o `[BV-COM]` usa três nomes
  diferentes — "Instrumento Particular de Parceria", "Contrato de Parceria Agrícola e
  Outras Avenças" e "Instrumento Particular de Exploração de Atividade Rural".
- **Data da origem** *(origem externa)* — sem tooltip.
- **CPF/CNPJ da origem** *(origem externa)* — sem tooltip.
- **Outorgante da origem** *(origem externa)* — Quem cedeu a posse na origem — não é o
  outorgante deste instrumento.
- **Sede — município** *(origem externa)* — sem tooltip.
- **Sede — UF** *(origem externa)* — sem tooltip.
- **NIRE** *(origem externa)* — Exigência literal do template oficial: a qualificação da
  empresa de origem deve conter NIRE, capital social na data da assinatura e
  administradores.
- **Capital social na assinatura** *(origem externa)* — Valor histórico, da data em que a
  origem foi assinada — não é o capital atual, então não sai de `v_quadro_societario` nem
  quando a empresa é cliente.
- **Administradores da origem** *(origem externa)* — Quem representou a outorgante na
  assinatura da origem. Texto livre: a empresa da origem normalmente não é cliente, então
  não há administração cadastrada.

## O que muda, o que não muda

O tooltip novo (trecho do modelo) responde "**onde** este campo aparece no contrato" — a
pergunta que o usuário fez e que o tooltip antigo não respondia. Ele não substitui o
"**porquê**" registrado acima; os dois são complementares. Se algum campo precisar das duas
respostas ao mesmo tempo no futuro (ex.: um painel de detalhe, não um tooltip), este arquivo
é a fonte do "porquê".
