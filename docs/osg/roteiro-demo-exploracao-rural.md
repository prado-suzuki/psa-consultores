# Demonstração para a equipe — Exploração Rural e os contratos de parceria e composse

Roteiro de apresentação, escrito em 16/09/2026. O cliente é o `[TESTE] MMS`
(ambiente `dev`, sandbox `vgzomuwnsdgrxbkyoavq`), e os instrumentos assinados que
servem de gabarito estão em
`Downloads\SOPs\MMS -Exemplos\Exemplo organizado - recebido da OSG\Diagnóstico Patrimonial\`
e em `G:\Drives compartilhados\OSG - Sucessão\MMS`.

## Antes de começar (20 min, sozinho)

| # | Passo | Por quê |
|---|---|---|
| 1 | `git rev-parse --abbrev-ref HEAD` → deve dizer `develop` | fora da `main`, o `bun run dev` aponta para o sandbox, que é onde o exemplo mora |
| 2 | `bun run dev` | — |
| 3 | Abrir **Exploração Rural** (menu OSG, ícone de broto, ao lado de Quadro Societário), cliente `[TESTE] MMS` | confirma rota, permissão e leitura |
| 4 | Abrir a **Parceria** e depois a **Composse**, passando pelas 3 abas | a origem por imóvel **só existe na composse** (decisão registrada em `ImoveisPanel.tsx:396`); na parceria a aba mostra matrícula, área cedida e área do imóvel |
| 5 | **Gerar Documento** → Parceria Rural → escolher a empresa (**MMS AGRO LTDA**) → escolher o instrumento → baixar o `.docx` | o caminho cadastro → tela → `.docx` **nunca tinha rodado**: não há nenhum `documento_gerado` rural no banco |
| 6 | Repetir com o Composse | idem |
| 7 | Deixar abertos: PDF assinado + `.docx` gerado | a comparação é o ponto alto |

Depois de escolher o instrumento, a prévia leva **cerca de 15 segundos** para aparecer
enquanto a API local (porta 8000) não estiver no ar: a tela busca o
georreferenciamento de cada matrícula e espera os retries. O documento sai idêntico
com ou sem ela — os limites e confrontações do Anexo vêm do texto da matrícula, não
do georref. Para eliminar a espera, rode `gcloud auth application-default login` e
suba a API com `uvicorn src.main:app --port 8000` em `psa-backend-api`.

Valores dos campos manuais (não são cadastro — são do ato de gerar). **Sem eles o
arquivo sai com a faixa `RASCUNHO — DOCUMENTO INCOMPLETO`, com o nome terminando em
"(rascunho)" e com as lacunas à mostra** (`em () vias`, `comarca de , Estado ,`,
`/, 10 de outubro de 2.022`). Preenchidos, o documento sai limpo:

| Campo | Parceria | Composse |
|---|---|---|
| Foro — comarca / UF | Lucas do Rio Verde / MT | Lucas do Rio Verde / MT |
| Número de vias | 4 | 3 |
| Instituto que apura o preço | IMEA – Instituto Mato-Grossense de Economia e Agropecuária | — |
| Nome da composse | — | `JOSE EDUARDO DE MACEDO SOARES JUNIOR E ESPOSA` (o padrão derivado é "… E OUTROS") |

## O roteiro (≈20 min)

### 1. Abertura — 2 min

Os dois instrumentos assinados do MMS na tela. "A OSG redigia isto a partir de um
modelo, à mão. Hoje o instrumento é **cadastro**, e o contrato sai do cadastro."

### 2. O cadastro — 6 min

Lista por cliente → abrir a **Parceria**.

- **Aba Dados** — as seções são numeradas e mudam com o tipo do instrumento:
  Vigência e Partilha só na parceria; Indivisão e Administração só na composse.
  O capital do outorgante vem pré-preenchido pelo sistema e é editável, porque é
  **retrato da data da assinatura**, não o capital de hoje.
- **Aba Partes** — outorgante e exploradores. Abrir a composse: as frações somam
  100% no rodapé, e a frase "será administrada **isoladamente**" é **derivada** da
  contagem de administradores nomeados — com um segundo nomeado, ela vira "em
  conjunto" sozinha. É o melhor momento da demo.
- **Aba Imóveis** — área cedida ≠ área da matrícula (234 ha cedidos de 284,96 ha
  na Capuaba); ordem por setas = ordem das alíneas do Anexo. A **origem é por
  imóvel e só aparece na composse**: lá os seis apontam para a parceria, e é isso
  que escreve o Considerando V.

### 3. Do cadastro ao contrato — 7 min

Tela **Gerar Documento** → escolher o modelo → escolher a empresa do contrato
(MMS AGRO LTDA) → escolher o instrumento → preencher os campos manuais → baixar.
Dizer em voz alta: **foro, número de vias e instituto de preço não são cadastro** —
são do ato de gerar, e por isso vivem ali.

O passo "Escolha a empresa do contrato" aparece por ser regra geral da tela; o
modelo rural não usa `sociedade.*`, mas é essa escolha que amarra o documento
gerado à outorgante.

### 4. A prova — 4 min

Gerado × assinado, lado a lado:

- preâmbulo com NIRE, capital por extenso e os dois administradores qualificados;
- alínea com Livro, Folha, cartório e CCIR;
- 20 cláusulas, os 6 parágrafos da Cláusula Quinta, Anexo com limites e
  Elementos do Perímetro.

Número para citar: a conferência parágrafo a parágrafo contra os dois assinados
não deixou **nenhum parágrafo com conteúdo sem bloco**
(`docs/osg/contratos_exploracao/mapa-blocos/`).

### 5. Fechamento — 1 min

56 blocos na Parceria, 46 na Composse, versionados: a redação muda na Biblioteca,
sem deploy. O mesmo cadastro alimenta o relatório Fiscal.

## Perguntas prováveis, com a resposta

- **"A data do Considerando V está diferente do nosso contrato."** O gerado diz
  **10 de outubro** porque é a data real da parceria; o composse assinado diz 11.
  É erro do documento assinado, catalogado junto com outros (`R$ R$`,
  "seiscentos e setenta e quatro**s** reais", "em, em 11 de outubro").
- **"E se o cliente tiver duas parcerias?"** O cadastro suporta. O rascunho do
  documento é chaveado por (cliente, modelo, **empresa do contrato**) — então duas
  parcerias com outorgantes diferentes convivem, mas duas parcerias da MESMA
  outorgante caem no mesmo rascunho. Chavear também pelo instrumento é o próximo
  passo. Por isso não se gera dois instrumentos iguais hoje.
- **"Dá para marcar se foi declarado no IRPF?"** A coluna existe, o campo não:
  IRPF é anual e a coluna é um sim/não único. Entra como exercício × declarado
  quando o Fiscal definir.
- **"E exploração florestal / piscicultura?"** Fora por ora, com dois contratos
  reais de 2026 já mapeados; entram como dois interruptores quando a redação for
  homologada com a banca.

## O que não mostrar hoje

- Cadastrar **origem externa** ao vivo — a tabela está zerada, o caminho nunca
  rodou com dado.
- Gerar **dois instrumentos do mesmo tipo** para o mesmo cliente.
- O **Acordo de Quotistas**: o sandbox recebeu hoje (16/09) a migration
  `motor_subitem_alinea_inciso`, da branch `feat/governanca-osg`, e os 237 blocos
  novos usam tipos (`item`, `subitem`, `inciso`, `alinea`) que o motor da
  `develop` ainda não conhece. Não afeta os rurais nem o Contrato Social.
- A seção **Lastro documental**, a menos que os PDFs sejam anexados antes (o
  cliente de teste está com zero arquivos).

## Plano B

Se a geração travar ao vivo, abrir
`docs/osg/contratos_exploracao/gerado/mms-parceria-gerado.md`: é o contrato
inteiro renderizado com os blocos reais do banco, e serve para a comparação com o
assinado sem depender da tela.
