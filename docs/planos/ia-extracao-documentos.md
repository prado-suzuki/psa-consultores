# IA na extração de documentos — onde cabe, o que aguenta, como montar

Conversa de **03/08/2026**, derivada de `docs/planos/cadastro-vinculo-documentos.md`. Registrada em
arquivo separado porque é uma frente própria: nada aqui é pré-requisito do fluxo de classificação, que
funciona inteiro sem IA. Isto é sobre onde a máquina economiza trabalho **sem** virar fonte de erro.

Ainda não tem tarefas. Não começar pela infraestrutura — ver a §7, o experimento que vem antes.

---

## 1. O princípio: a máquina não substitui a leitura, substitui a digitação

O fluxo de classificação já põe o consultor com o documento aberto na tela, lendo-o para preencher a
ficha. **A conferência do que a IA propõe não é trabalho extra — é o trabalho que ele já ia fazer.**
É isso que torna a coisa aceitável, e não a qualidade do modelo.

Três propriedades sustentam a confiabilidade, e nenhuma delas depende do modelo:

1. **Dígito verificador.** CPF, CNPJ e número de matrícula são validáveis localmente. Se a leitura
   erra um dígito, a conta não fecha e o resultado é descartado. **Dado errado vira dado nenhum** — o
   único tipo de falha aceitável.
2. **Concordância entre duas fontes.** Quando o número extraído casa com alguém já cadastrado naquele
   cliente, há duas fontes independentes concordando. Isso vale mais que qualquer confiança
   auto-declarada pelo modelo.
3. **Campo duvidoso fica vazio, nunca preenchido com palpite.** Um CPF com um dígito errado é pior
   que um campo em branco: o branco alguém preenche, o errado alguém confia.

E uma regra de fronteira: **nada salva sozinho.**

## 2. Os três lugares onde cabe

Em ordem de **valor**. A ordem de dificuldade é outra (§6).

### 2.1 Ler os identificadores de cada arquivo

CPF, CNPJ, número de matrícula. **Não é IA, é parsing** — achar padrão em texto e conferir dígito.
Sem modelo, sem chave de API, sem serviço de terceiro. É a base dos outros dois.

### 2.2 A varredura — "que outros arquivos são dessa pessoa?"

É a **questão aberta nº 2** do plano principal, que hoje só tem palpite (nome do arquivo, lote de
envio). Com os identificadores lidos, "quais arquivos mencionam este CPF" deixa de ser heurística e
vira busca. É o passo que o plano aponta como a diferença entre "funciona" e "é bom".

### 2.3 Pré-preencher a ficha

O de maior valor, porque é o trabalho de digitar, e é o **formato 3 da §7** do plano principal —
mudar o trabalho de *digitar* para *revisar*.

## 3. Onde NÃO colocar IA

| o que | por quê |
|---|---|
| **Decidir o dono e vincular** | o vínculo é 1:1 e põe o documento na ficha de uma pessoa. Numa consultoria patrimonial, documento na pessoa errada é problema de verdade, não erro de digitação. A máquina sugere, o humano comita |
| **Decidir que um documento "não se aplica"** | é exatamente o julgamento reservado ao consultor quando se decidiu que "faltante" é marcação manual. É a distinção que a subtração não faz — e a IA também não |
| **Interpretar contrato social para inferir quotas e estrutura societária** | valor altíssimo, confiabilidade baixa, consequência jurídica. No máximo sugestão destacada, nunca dado gravado |

## 4. A realidade dos arquivos que chegam

**Correção importante de uma suposição otimista:** "PDF com camada de texto sai de graça" cobre bem
menos do que parece nesta categoria.

| gaveta | como os arquivos chegam | caminho |
|---|---|---|
| **Pessoa jurídica** | gerado digitalmente — contrato social do advogado, cartão CNPJ do site da Receita, comprovante de luz do portal | tem camada de texto, extração gratuita |
| **Pessoa física** | foto de RG, CPF passado no CamScanner, certidão escaneada | é imagem, exige OCR |

Ou seja: a gaveta de PJ se beneficia do caminho barato; a de PF é quase toda imagem.

**Onde o OCR vai apanhar, e isso é honesto:**

- **reflexo do flash no RG plastificado** — o caso mais comum e o pior;
- **RG antigo**, com campos datilografados ou manuscritos e tipografia difícil;
- foto de tela, foto torta, resolução baixa, documento cortado;
- **o cliente escaneia a pilha toda num PDF só** — CPF, RG e comprovante no mesmo arquivo. Aí "o tipo
  do documento" deixa de ter resposta única, e isso o plano principal não prevê.

### Os três níveis de resultado

O desenho assume que **só o primeiro é confiável**:

1. **Identificadores** — quase determinístico, porque validável. **É suficiente para 2.1 e 2.2**, que
   são as duas coisas de maior valor. Para ler números impressos, scan mediano já serve: o OCR só
   precisa acertar dígitos, e há como conferir.
2. **Nome e datas** — a leitura dá um candidato, não validável por estrutura, mas cruzável: o nome
   parece com alguém já cadastrado nesse cliente? A data é plausível?
3. **O resto** (nome da mãe, endereço no RG, órgão emissor) — sugestão, e o que mais sofre com scan
   ruim.

### O piso que não é IA: o nome do arquivo

"RG - Maria Aparecida (frente e verso).pdf" foi escrito por uma pessoa e carrega o tipo **e** o dono.
Cruzado com "quem já está cadastrado nesse cliente", faz a varredura funcionar **mesmo quando o OCR
falha completamente**. A varredura não deve depender só de OCR: **o nome do arquivo é o piso, o OCR é
o teto.**

## 5. Arquitetura

### Processar: no GCP, disparado pela chegada no bucket

Arquivo cai no armazenamento → evento → serviço que extrai. É a mesma forma do pipeline fiscal que já
roda (arquivo no armazenamento, serviço processa, grava). Não é padrão novo na casa.

Reagir ao **evento do bucket** em vez de chamar a extração dentro do passo de finalização do upload
tem dupla vantagem: não deixa o upload mais lento, e pega o arquivo independentemente de por onde ele
entrou. Em troca, o serviço só conhece a chave do objeto e precisa achar a linha do banco por ela —
o que é fácil, porque o caminho do arquivo já está gravado.

**O processamento tem que ser idempotente.** Evento de bucket é reentregue; se a chave do resultado
for o próprio objeto, reprocessar sobrescreve em vez de duplicar.

### Guardar: Supabase, não BigQuery

Os três consumidores (ordenar o balde, sugerir tipo, pré-preencher) são **leitura de um registro, na
hora, filtrada por permissão, dentro da tela**. É o oposto do que o BigQuery faz bem:

- **latência** — consulta de segundos numa tela que abre um arquivo por clique;
- **custo** — modelo por volume varrido, para buscar uma linha;
- **permissão** — toda a autorização vive nas políticas do Supabase; texto de documento no BigQuery
  obriga a inventar um segundo caminho de autorização para o front;
- **junção** — ordenar o balde exige comparar com `pessoa` e `matricula`, que estão no Supabase.

### Separar o derivado do texto bruto

| o que | onde | por quê |
|---|---|---|
| **Derivado** — identificadores encontrados, tipo sugerido, confiança | Supabase, junto do arquivo | pequeno, estruturado, indexável; é o que alimenta as três funcionalidades |
| **Texto bruto** — pode ser grande (matrícula com averbações, contrato de 40 páginas) | Supabase, em **tabela própria**, uma linha por arquivo, com índice de busca textual | mantém estreita a tabela do arquivo, que é consultada o tempo todo. Ter o texto no Postgres faz "quais arquivos mencionam este nome" funcionar sem infraestrutura nova — o plano B da varredura quando não há identificador |
| **O original** | o objeto no bucket, como hoje | nada disso o substitui |

### O único pedaço realmente novo na infra

Hoje os serviços do GCP escrevem no **BigQuery**. Aqui passariam a escrever no **Supabase**, o que
exige credencial de serviço e portanto um caminho que ignora as políticas de permissão. É padrão e é
seguro, mas é superfície nova: tratar com o mesmo cuidado das outras chaves de serviço e **restringir
esse serviço a escrever só nas duas tabelas de extração**.

### Onde o BigQuery entra de verdade

Depois, e como cópia: quantos documentos por tipo, tempo entre pedido e envio, auditoria entre
clientes. Análise agregada é o que ele faz bem — só não é ele que a tela consulta.

## 6. Dificuldade, em ordem

| | dificuldade | por quê |
|---|---|---|
| **Identificadores** (2.1) | **fácil** — dias | não usa modelo nenhum; a costura já existe (o upload já passa por um passo de finalização no backend) e o padrão já roda na casa. O único item de verdade é onde guardar, que é uma migração |
| **Varredura** (2.2) | **fácil-médio** | quase tudo é consequência do anterior; metade backend, metade tela — e a tela já existe. O trabalho real é desempate e o caso do arquivo sem identificador nenhum |
| **Pré-preencher** (2.3) | **médio-difícil** — semanas | é aqui que o escopo cresce se ninguém vigiar |

O custo do terceiro **não é o modelo**. É, em ordem de chatice:

1. **O mapeamento documento→ficha.** ~28 campos só na pessoa física, quatro tipos de entidade, e cada
   tipo de documento alimenta um subconjunto diferente (o RG dá órgão emissor e UF; a certidão de
   casamento dá estado civil). Tedioso, não difícil — e é o grosso.
2. **A regra de deixar vazio quando duvidoso.** A confiabilidade vem menos do modelo e mais de
   validação local: data plausível, UF que existe na lista, município conhecido, e o CPF extraído tem
   que casar com o identificador já achado. Isso é código comum.
3. **Procedência por campo** — deixa de ser questão aberta e vira requisito: migração mais interface.
4. **OCR para documento digitalizado** — é aqui que a feature vira projeto: decisão de
   infraestrutura, custo por página, fila de processamento.

**Ordem de execução:** 2.1 → 2.2 → e o 2.3 só para **um** tipo de documento como piloto, o CPF, que é
o mais regular.

**A métrica honesta do piloto:** com que frequência o consultor **não mudou nada**. Se ele corrige
metade dos campos, não se economizou digitação — criou-se trabalho de revisão. Melhor descobrir isso
em um tipo de documento do que em cinquenta e oito.

## 7. O experimento que vem antes de construir qualquer coisa

Pegar **20 a 30 arquivos reais já recebidos**, escolhendo de propósito os piores (RG fotografado com
reflexo, CamScanner, matrícula digitalizada), rodar uma vez pelo OCR e contar três números:

1. achou CPF/CNPJ **válido**?
2. acertou o tipo do documento?
3. quantos campos do formulário saíram certos?

Meio dia de trabalho, e responde melhor do que qualquer argumento. O custo não é o obstáculo — OCR é
centavos por página e o volume é de dezenas por cliente. O que está em jogo é se a precisão em
entrada ruim justifica o resto.

## 8. O que isto muda no plano principal

A **questão aberta nº 3** de `cadastro-vinculo-documentos.md` (procedência por campo ou por ficha)
deixa de ser indiferente: se a máquina passa a propor campos, saber **qual campo veio da máquina e
qual veio da pessoa** é necessário. A resposta passa a ser **por campo**.
