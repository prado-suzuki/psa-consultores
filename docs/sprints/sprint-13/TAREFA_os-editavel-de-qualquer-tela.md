# TAREFA: a ordem de serviço passa a ser editável de qualquer tela

> Aberta em 16/09/2026, a partir do Controle de Projetos da OSG
> (`/equipe/osg/projetos/controle`). Análise do módulo em
> [`docs/osg/relacao-de-projetos-planilha-x-ferramenta.md`](../../osg/relacao-de-projetos-planilha-x-ferramenta.md).
>
> **Não tem migration.** É refatoração de código, com o schema e as policies intactos.

## O problema, em um caso

No Controle de Projetos, clicar numa linha abre o modal de projeto. Se a OS daquele produto
estiver sem data, o modal recusa a criação com a mensagem de
`ProjetoOsProdutoFields.tsx:49`:

> Esta OS está sem data de início ou de fim. O projeto herda o período dela, então informe as
> datas na OS (cadastro do cliente, aba OS) antes de criar o projeto.

A mensagem está certa e diz onde consertar. O custo é o caminho: sair do Controle, abrir o
cadastro do cliente, achar a OS, preencher, salvar, voltar, achar a linha de novo.

**Tamanho medido em produção, 16/09/2026** (84 OS da OSG, recorte por produto):

| Campo | OS sem preencher |
|---|---|
| `data_inicio` | 2 |
| `data_fim` | 2 |
| `cluster_id` (Empresa / Faturamento) | 6 |
| `numero_os`, `regiao`, `setor_cliente_id`, `situacao` | 0 |

São poucas linhas. **O gatilho desta tarefa não é o volume, é a segunda tela que vai pedir a
mesma coisa**, e o Controle de Projetos já é a segunda.

## Por que não é só abrir um modal

Porque hoje **não existe onde montá-lo sem duplicar a escrita.**

`ordem_servico` é gravada num lugar só: dentro do `useSaveClientTransaction`
(`src/hooks/useSaveClientTransaction.ts`, 1344 linhas). Conferido por varredura: nenhum outro
hook faz `insert`, `update` ou `delete` nessa tabela.

E esse hook não é um hook de entidade. Ele salva **o cliente inteiro** numa transação: cliente,
contribuintes, representantes, OS, produtos contratados e rateio, com diff campo a campo
(`osFields`, linha 393), `precheck` antes do primeiro update (linha 817), `.select()` depois
para que recusa de RLS não passe como sucesso (linha 831), `recusaDeOperacao` traduzindo o erro,
id gerado no cliente no insert porque `RETURNING` faria a policy de SELECT recusar, e a
reconciliação do rateio linha a linha logo abaixo.

Chamar isso de outra tela significaria montar o rascunho do cliente inteiro. Escrever direto em
`ordem_servico` de um segundo lugar significaria perder tudo o que está no parágrafo acima.

## O padrão que a OSG Work já usa

`PessoaModal` é montado por **cinco** telas: `QualificacaoDasPartes`, `BemModal`,
`MatriculaModal`, `FichaPopout` e `GerarDocumentoDialogs`. A escrita mora num hook só,
`useUpsertPessoa`. O modal é autossuficiente por padrão e uma das telas empresta o rascunho.
`BemModal` e `MatriculaModal` seguem o mesmo desenho.

**Um modal, um hook de escrita, montados de onde precisar.** A mesma informação se cadastra de
várias telas sem se duplicar em lugar nenhum.

É esse padrão que a OS não tem.

## O que fazer

### T1 · Teste de caracterização do salvamento da OS

Antes de mover uma linha. Golden-master sobre o `useSaveClientTransaction`, travando o
comportamento observável do trecho de OS: payload exato do `buildOsFields`, ordem das operações
(precheck → update/insert → rateio → produtos), o pulo da OS intocada pelo `linhaAlterada`, o
`.select()` que transforma 0 linhas em erro, o id gerado no cliente no insert, e o texto de cada
`recusaDeOperacao`.

Sem isto, T2 é reescrita no escuro.

### T2 · Extrair `useUpsertOrdemServico`

Um hook por entidade, no molde do `useUpsertPessoa`: recebe o rascunho de uma OS, grava,
audita, devolve erro traduzido. Leva junto `buildOsFields`, o precheck, o `.select()` de
verificação e o `recusaDeOperacao`.

**O `useSaveClientTransaction` passa a chamá-lo** em vez de ter o bloco embutido. Se a
transação continuar com cópia própria, esta tarefa terá criado o caminho duplicado que ela
existe para evitar.

**Rateio e produtos contratados ENTRAM no hook** (decidido em 16/09/2026). São filhos da OS e
seguem a OS; deixá-los no transaction faria o modal gravar meia OS e obrigaria a segunda tela a
reimplementar a outra metade, que é o que a tarefa existe para evitar.

Isso leva a extração de ~60 para **~233 linhas** (822 a 1055), cobrindo oito passos:
`ordem_servico` update/insert, `distribuicao_receita` delete/update/insert e
`os_produtos_contratados` delete/insert/update.

### O raio, medido em 16/09/2026

| | |
|---|---|
| Arquivos que **escrevem** as três tabelas | **1** (`useSaveClientTransaction`) |
| Arquivos que só **leem** | 16 |
| Componentes que montam o transaction | **1** (`NewClientModal.tsx`) |

Os 16 leitores (`useOsProdutosContratados`, `useServicosContratados`, `useDomainFaturamentoOs`,
`useClientEditData`, os dashboards) têm **zero escritas** e não mudam: o hook grava na mesma
tabela e eles continuam lendo igual. `useRlsPrecheck` já cobre `ordem_servico` e
`distribuicao_receita`.

### As duas amarras que o T1 tem de travar antes

**`filhosDeOsAlterados`** é ligado em **seis** pontos dentro do rateio e dos produtos, lido por
`nadaMudouNoCadastro` (linha 111) e devolvido no resultado (linha 1233). Ele responde "mudou
alguma coisa?" para o cliente INTEIRO, não para uma OS. O hook precisa devolver esse sinal e o
transaction agregá-lo; se ficar para trás, o cadastro volta a dizer "nada mudou" depois de a
pessoa ter mexido no rateio.

**A reconciliação do rateio linha a linha** existe por causa de um defeito que o comentário da
linha 855 registra: o padrão anterior marcava tudo como excluído e reinseria, e quando o
soft-delete não pegava, cada salvamento somava um centro de custo repetido (100% → 200% →
300%) até travar o save do cliente inteiro. Ela sai inteira ou não sai.

### T3 · `OrdemServicoModal`, autossuficiente

Cadastrar, editar e excluir uma OS, montável de qualquer tela. Campos do formulário atual
(`ContratosTab` seção Classificação e `OsPeriodoFields`), com os mesmos rótulos: Área do
Negócio, Região, Data Início, Data Fim, Data Emissão, Situação do Projeto, Empresa /
Faturamento.

**Permissão: nenhuma policy muda.** O gate continua sendo a RLS da tabela mais o
`podeEditarCadastroCliente({ isAdmin, isLider, isSublider })` que o cadastro já aplica; o modal
o chama igual. Quem não pode hoje continua não podendo.

A exclusão herda o que a sprint 13 decidiu para a OS: ver
[`TAREFA_os-hard-delete.md`](TAREFA_os-hard-delete.md) e
[`TAREFA_exclusao-em-cascata-da-os.md`](TAREFA_exclusao-em-cascata-da-os.md).

### T4 · O cadastro de cliente passa a montar o modal

Prova de que o modal serve: a `ContratosTab` deixa de ter formulário próprio de OS e monta o
`OrdemServicoModal`. Se o cadastro não puder usá-lo, ele não está pronto para as outras telas.

### T5 · O Controle de Projetos monta o modal

Um segundo alvo de clique na linha (a célula da OS) abre a OS. Fecha o caso que abriu a tarefa:
preenche a data e cria o projeto sem sair da tela.

## Aceite

- Uma OS editada pelo Controle de Projetos aparece alterada no cadastro do cliente, e vice-versa,
  sem recarregar nada além do cache do React Query.
- Quem não tem papel para gravar vê a mesma recusa nas duas telas, com o mesmo texto.
- `grep` por `from("ordem_servico")` com `update`/`insert`/`delete` acha **um** arquivo.
- A suíte de caracterização do T1 passa sem edição depois do T2.

## O que NÃO entra

- **Migration.** Schema e policies ficam como estão.
- **Editar a OS pelo modal de projeto.** O período do projeto é o da OS e é leitura lá, por
  decisão registrada em `ProjetoPropertyBar.tsx`. Esta tarefa abre a OS ao lado, não move o
  campo para dentro do projeto.
- **As 6 OS sem Empresa / Faturamento.** São dado a preencher, não código; aparecem aqui só
  para dimensionar.

## Alternativa descartada, e por quê

Um diálogo pequeno no Controle de Projetos, gravando direto em `ordem_servico` só as duas datas.
É uma tarde de trabalho contra vários dias.

Descartada por criar o segundo caminho de escrita para a tabela. O primeiro tem precheck,
verificação de 0 linhas, recusa traduzida e auditoria; o segundo começaria sem parte disso e
divergiria na primeira vez que a regra do primeiro mudasse. É o mesmo motivo pelo qual o Controle
de Projetos monta o `ProjetoDialog` de verdade em vez de ter formulário próprio de projeto.
