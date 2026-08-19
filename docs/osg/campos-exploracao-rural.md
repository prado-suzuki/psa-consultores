# Campos — Parceria e Composse rural

Detalhe completo, fontes e conferências em [`levantamento-contratos-rurais.md`](./levantamento-contratos-rurais.md).

## 1. Campos que já existem em outro cadastro (reaproveitáveis)

Já têm tela própria, correta, em outro módulo da OSG Work — o cadastro de
exploração rural só seleciona/lê por FK, não redigita.

| Campo | Tabela.coluna | Módulo / Tela / Modal | Observação |
|---|---|---|---|
| Qualificação do outorgante / explorador / compossuidor (nome, CPF/CNPJ, endereço etc.) | `pessoa.*` | Qualificação das Partes → Modal de Pessoa, aba Dados | Selecionar por FK. |
| Vínculo familiar / cônjuge / regime de bens | `parentesco.*`, `pessoa.conjuge_id`, `.regime_bens` | Qualificação das Partes → Modal de Pessoa, aba Dados (painel de Parentesco) | Leitura; não entra no formulário de exploração. |
| Identificação da matrícula (número, cartório, livro, folha, data) | `matricula.numero/.cartorio_id/.livro/.folha/.data_matricula` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Selecionar por FK. |
| Localização do imóvel (Município/UF) | `matricula.municipio_imovel/.uf_imovel` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Leitura. |
| Áreas do imóvel (documento, real, unidade) | `matricula.area_documento/.area_real/.area_unidade` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Leitura. |
| Área explorada | `matricula.area_explorada` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | ⚠ Grão errado: hoje é 1 valor por matrícula; Parceria/Composse precisa de 1 valor por instrumento × imóvel (a mesma matrícula pode estar em mais de uma Parceria ao mesmo tempo). |
| Georreferenciamento (status) | `matricula.georreferenciado/.georref_prejudica_transferencia` | Diagnóstico Patrimonial → Modal de Matrícula, aba Dados | Leitura; memorial real vem do BigQuery — já resolvido, sem trabalho novo. |
| Documento comprobatório / estudo fiscal (arquivo) | `documento_arquivo.*` | Documentos do Cliente (também embutido como aba Documentos nos modais) | Selecionar arquivo já classificado; sem importação nova. |

## 2. Campos que precisam ser criados

Inclui colunas que **já existem** em `exploracao_rural` mas não têm nenhuma
tela que grave nelas hoje (0 linhas em produção) — contam como "novo" na
prática, porque não há front-end funcionando.

| Campo | Tipo de dado | Tabela/coluna (se já existe) | O que salva |
|---|---|---|---|
| Referência do instrumento | texto | `exploracao_rural.referencia` (existe, sem tela) | Identificador do contrato no cadastro. |
| Tipo de exploração | enum | `exploracao_rural.tipo_exploracao` (existe, sem tela) | Se é Parceria, Composse, Arrendamento etc. |
| Data de assinatura / encerramento | data | `exploracao_rural.data_assinatura/.data_encerramento` (existe, sem tela) | Datas do instrumento. |
| Vigência | texto | `exploracao_rural.vigencia` (existe, sem tela) | Prazo do contrato, em texto livre. |
| Vigência prorrogável | booleano | sem coluna | Se a Parceria renova sozinha ao vencer. |
| Prazo de renovação | texto | sem coluna | Por quanto tempo renova — pendência, sem contrato real confirmando. |
| Declarado no IRPF | booleano | `exploracao_rural.declarado_irpf` (existe, sem tela) | Se consta na declaração do cliente. |
| Sacas por hectare | decimal | `exploracao_rural.sacas_por_hectare` (existe, sem tela) | Remuneração fixa, quando aplicável. |
| Outorgantes / Exploradores (vínculo) | relação N:N com pessoa | `exploracao_rural.outorgante_pessoa_id/.explorador_pessoa_id` (existem, mas só 1 de cada) | Corrigido 19/08: virou lista — contrato real (`[BV-PAR]`) tem 1 outorgante e 3 outorgados numa parceria só. |
| Fração do outorgante / explorador | decimal (0–100) | sem coluna | Fatia de cada um dentro do próprio lado; não confundir com o percentual agregado entre outorgante e explorador, abaixo. |
| Imóvel vinculado ao instrumento | relação N:N com matrícula | sem coluna (`exploracao_rural.bem_id` é singular) | Um instrumento pode cobrir várias matrículas — hoje só cabe 1. |
| Compossuidores | relação N:N com pessoa | sem coluna | Quem divide a posse na Composse. |
| Fração do compossuidor | decimal (0–100) | sem coluna | Fatia de cada um nos frutos; soma sempre 100%. |
| Partes extras (anuente/interveniente/garantidor) | relação N:N com pessoa + papel (texto) | sem coluna | Achado real em contrato; nome do papel ainda em aberto. |
| Percentual do outorgante | decimal (0–100) | sem coluna | Fatia da partilha de frutos de quem cede a terra. |
| Percentual do explorador | decimal (0–100) | sem coluna | Fatia de quem explora. |
| Vigência do percentual | data | sem coluna | Desde quando o percentual atual vale. |
| Termo Aditivo de referência | texto | sem coluna | Qual aditivo formalizou uma mudança de percentual. |
| Culturas/atividades permitidas | lista de texto | sem coluna | O que pode ser plantado/criado na área. |
| Benfeitorias indenizáveis | booleano | sem coluna | Se melhorias na terra geram indenização ao sair. |
| Permite penhor/financiamento | booleano | sem coluna | Se produção/bens podem virar garantia. |
| Prazo de indivisão | número + unidade | sem coluna | Por quanto tempo os compossuidores não podem dividir o imóvel. |
| Indivisão prorrogável | booleano | sem coluna | Se esse prazo renova sozinho. |
| Aviso prévio para não renovar | número + unidade | sem coluna | Prazo pra avisar que quer sair, antes do vencimento. |
| Tipo do instrumento de origem (por imóvel) | enum: Parceria / Arrendamento / Herança / Outro | sem coluna | De que tipo de contrato anterior aquele imóvel específico veio. |
| Instrumento de origem (por imóvel) | relação opcional com outro instrumento | sem coluna | Qual contrato anterior deu a posse daquele imóvel — varia por imóvel numa mesma Composse. |
