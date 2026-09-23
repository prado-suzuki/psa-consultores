# TAREFA 4 — As cinco telas da Estrutura do Cliente falam a mesma língua

> **Teste de uso da Patrícia em 21/09/2026**, nas cinco rotas do agrupamento: *"botões
> repetidos, falta de padrão, tooltips que não explicam ou que faltam e não estão seguindo o
> padrão"*, com a expectativa de *"que a ferramenta fosse o mais intuitiva possível para
> quem está usando pela primeira vez"*.
>
> **A causa é uma só:** as cinco telas foram feitas em momentos diferentes e cada uma
> resolveu sozinha as **mesmas cinco decisões** — como se nomeia um botão de ícone, onde fica
> o botão de criar, como se confirma uma exclusão, o que a tela diz quando a consulta falha,
> e como um número diz de onde veio. Não são cinco problemas: são cinco gramáticas.
>
> **Banco: não.** Nenhuma migração, nenhuma RPC, nenhuma policy. Tudo deriva de dado já
> carregado pelas telas.
>
> **Não duplica a especificação.** Problema, texto aprovado e aceite completo de cada fatia
> estão em
> [`osg/ajustes-ux-estrutura-do-cliente.md`](../osg/ajustes-ux-estrutura-do-cliente.md),
> §3 a §12. Esta tarefa **consome** aquilo. **A redação aprovada não se reescreve no PR**
> (§6 de `geral/texto-explicativo-na-tela.md`) — se um texto parecer errado, volta para quem
> escreveu.
>
> **Depende da [tarefa 3](2026_09_23_exclusoes-que-apagam-mais-do-que-dizem.md)?** Não. As duas
> tocam arquivos em comum (`QualificacaoDasPartes.tsx`, `DiagnosticoPatrimonial.tsx`), então
> vale combinar a ordem para não conflitar — mas nenhuma subtarefa daqui depende de lá.

## As rotas

| Tela | Rota |
|---|---|
| Qualificação das Partes | `/equipe/osg/work/qualificacao-das-partes` |
| Quadro Societário | `/equipe/osg/work/quadro-societario` |
| Cadastro Patrimonial | `/equipe/osg/work/diagnostico-patrimonial` |
| Controle de Matrículas | `/equipe/osg/work/controle-matriculas` |
| Exploração Rural | `/equipe/osg/work/exploracao-rural` |

## Subtarefas

Cada uma corresponde a uma fatia da especificação, e **são independentes** — qualquer ordem,
qualquer corte de PR.

### T1 — Falha de consulta deixa de ser lista vazia (§3)

Quatro das cinco telas dizem "Nenhum bem cadastrado para este cliente" quando a consulta
**falhou**. A Exploração Rural é a única que separa os dois, e o comentário dela registra o
caso real que isso já causou.

Extrair `src/components/equipe/osg/EstadoDeFalha.tsx` e usar nas cinco. As quatro primeiras
precisam passar a ler `error` dos hooks, que hoje descartam. A Exploração Rural **perde** o
`error.message` visível (vai para `console.error`).

**Aceite:** com a consulta falhando, vejo "Não foi possível carregar…" com moldura de erro em
qualquer das cinco, e não "Nenhum bem cadastrado". Em nenhuma vejo mensagem de banco na tela.

### T2 — ⚠️ Todo botão de ícone ganha nome, pelo mesmo mecanismo (§4)

Quatro formas diferentes hoje: **nada** (Qualificação, Quadro, Cadastro Patrimonial),
`title=` (Matrículas, 4×), `aria-label` sem balão (Exploração Rural).

Todos passam a `ButtonTooltip` (`@/components/ui/button-tooltip`), que põe `aria-label` e
balão de uma vez. Os doze textos estão na §4 da especificação.

⚠️ **`title=` deixou de ser mecanismo permitido em 17/09/2026**, e a catraca
`src/lib/textoDeAjuda.test.ts` **não pega estas** porque elas estão em `<Button title>` e o
recorte dela cobre só os sete arquivos da TIP-02. Não é exceção: é dívida que a catraca não
enxerga.

Dois casos particulares, nos modais:
- `MatriculasSection.tsx:47` — o `ConfirmAction` de "Remover" não recebe `triggerTitle` e o
  botão fica **sem nome nenhum**.
- `TitularidadeLinha.tsx:88` — o botão desabilitado se explica por um `title` que **nunca
  aparece** (`disabled:pointer-events-none` na base do `Button`; achado do apêndice C de
  21/09, cujo comportamento global ela decidiu não mexer). A explicação sai do botão e vira
  texto de apoio na seção de Titularidade.

**Onde:** `ControleMatriculas.tsx` (219, 227, 235, 260) · `QualificacaoDasPartes.tsx` ·
`DiagnosticoPatrimonial.tsx` · `ExploracaoRural.tsx` ·
`diagnostico-patrimonial/bem/MatriculasSection.tsx` (46, 47, 53) ·
`diagnostico-patrimonial/titularidade/TitularidadeLinha.tsx` (78, 88).

**Aceite:** passando o mouse em qualquer botão de ícone das cinco telas e dos modais de bem e
matrícula, vejo um balão com o nome da ação; por teclado, o leitor anuncia o mesmo texto; uma
busca por `title=` nesses arquivos não devolve `title` de botão.

**Fora desta tarefa:** ampliar o recorte da catraca ao repositório inteiro — decisão dela de
21/09, tarefa separada, acende cinco arquivos fora deste módulo (apêndice B.3 da
especificação).

### T3 — O lápis sai da coluna de Ações (§5)

É o "botão repetido" do relato. A linha inteira já abre o modal (`rowActivateProps`), e ao
lado há um lápis que faz o mesmo — sempre visível em três telas, no hover na quarta. A coluna
de Ações fica só com o que a linha **não** faz: excluir, vincular, desvincular.

O Quadro Societário já fez esse movimento e registrou por quê (a coluna de Ações saiu da
`TabelaSocios`); esta subtarefa leva o mesmo critério às outras quatro.

**Aceite:** nas quatro listas a coluna Ações não tem lápis; clicando em qualquer ponto da
linha o modal abre; selecionando texto com o mouse dentro da linha o modal **não** abre
(comportamento atual do `rowActivateProps`, que não muda).

### T4 — A lista diz quais bens entram no documento (§6)

Só `Aprovado` e `Aprovado para 2ª Instancia` levam o bem ao documento gerado. Em produção
são **16 de 26**, e a lista não dá sinal — a frase existe (`AVISO_STATUS_ELEGIVEIS`) e só
aparece dentro do modal.

Duas coisas, **nenhuma delas tooltip**: a frase como texto de apoio acima da tabela, e a
coluna Status em `Badge variant="outline"`, **neutro**.

⚠️ **Nenhum arquivo de cor é criado.** Um oitavo mapa de status foi recusado por ela em
21/09.

**Aceite:** abrindo o Cadastro Patrimonial leio na tela quais status levam o bem ao
documento; a coluna Status mostra selo de contorno neutro, igual para os sete valores; bem
sem status mostra "—".

### T5 — "Papel" tem um nome só, e uma fonte só (§7)

O mesmo campo tem três nomes: **"Papel"** na lista, **"Tipo Empresa"** no modal, e um selo
sem rótulo na aba do Quadro. E o mapa `PR/CN/SC → rótulo` está copiado em **quatro
arquivos**, que já divergem — dois trazem as três opções, um traz duas.

Criar `src/lib/osg/papelDaEmpresa.ts` (molde do que `navegacaoOsgWork.ts` fez com os títulos
das telas) e fazer os quatro pontos lerem de lá. O campo no modal ganha texto de apoio:
*"Proprietária e Controladora aparecem no Quadro Societário."*

**Onde:** `papelDaEmpresa.ts` (novo) · `pessoa/PessoaDadosTab.tsx` (22, 144) ·
`QualificacaoDasPartes.tsx` (28-32) · `QuadroSocietario.tsx` (18-21) ·
`gerar/EscolhaEmpresa.tsx` (9-11).

**Aceite:** o rótulo é "Papel" na coluna e no campo; abrindo o campo leio que Proprietária e
Controladora aparecem no Quadro Societário; as três opções saem escritas iguais nas três
telas.

### T6 — O Quadro Societário diz por que a empresa não está lá (§8)

Uma PJ com Papel nulo ou "Sócia" **não vira aba**, e a tela não diz uma palavra. E quando
nenhuma se qualifica, o texto manda **cadastrar** empresa — quando a empresa existe e falta
o Papel.

> **Antes de começar, consultar a Patrícia:** PJ do tipo "Sócia" fica mesmo fora do Quadro
> Societário? Não há documento com o motivo; é conhecimento de negócio, não de código.
> - **É regra** → segue esta subtarefa como está: a tela passa a dizer por que a empresa
>   ficou de fora.
> - **Não é regra** → a PJ sócia deveria virar aba. Isso é outro trabalho, maior. Esta
>   subtarefa para, e o texto da §8 muda.
>
> Afeta 4 clientes em produção. É a D-09 da pauta do
> [Estado do OSG Work](https://claude.ai/artifact/WwvvC6D5xYEMsjxy6gJ3oy).

Em produção: 2 clientes têm PJ fora do quadro convivendo com PR/CN; 2 têm só PJ fora e leem
"não possui empresas cadastradas" **tendo empresas cadastradas**.

Três estados, textos na §8. Nenhuma consulta nova — `pessoas` já vem completa.

**Aceite:** num cliente com uma CN e uma PJ sem Papel, vejo a aba da CN e, abaixo, a frase
contando a que ficou de fora; num cliente com três PJ sem Papel, o texto fala em **definir o
Papel**, não em cadastrar empresa; num cliente sem PJ nenhuma, leio o texto de hoje.

### T7 — Um conceito, uma palavra: "participa da estruturação" (§9)

"Integraliz-" significa duas coisas na mesma tela: o filtro "Integralizados / Não
integralizados" lê `participa_estruturacao`, e a coluna "Status" com o valor "Integralizado"
lê `status_integralizacao` — outro campo. A linha ainda usa uma terceira redação.

O filtro passa a "Participa da estruturação", opções "Todos · Participa · Não participa". Os
valores internos (`dentro`/`fora`) não mudam.

**Aceite:** filtrando por "Não participa", toda linha listada mostra a marca "Não participa
da estruturação", com a mesma palavra; "integralizado" só aparece na coluna Status.

### T8 — "Órfã" é dita uma vez (§10)

Três marcas para o mesmo estado na mesma linha: a coluna do "!" com balão, o badge "Órfã", e
o contador. O balão explica o que já está escrito duas vezes ao lado — é literalmente o
"tooltip que não explica" do relato. Sai a coluna do "!" e o balão; a definição vira texto de
apoio acima da tabela, uma vez.

**Aceite:** uma matrícula órfã mostra o badge "Órfã" e nada mais na linha; leio uma vez,
acima da tabela, o que "órfã" significa; a tabela tem uma coluna a menos.

### T9 — O botão de criar fica sempre no mesmo lugar (§11)

Quatro telas põem "Novo X" no cabeçalho do card da lista; a Exploração Rural põe dentro do
card de **Filtros**. Passa para o cabeçalho, e o resumo de imóveis/área desce para uma linha
própria abaixo do título.

**Aceite:** nas cinco telas o botão de criar está à direita do título do card da lista.

### T10 — Os filtros ganham rótulo de verdade (§12)

Nas cinco telas o `<Label>` é texto solto: sem `htmlFor`, campo sem `id`. Nenhuma busca e
nenhum filtro tem nome acessível; a busca da `TabelaSocios` não tem nem rótulo visível.

`htmlFor` + `id` nas buscas; `aria-label` nos `SelectTrigger` (o `Select` do Radix é um
botão, e envolvê-lo em `<label>` dispara o clique duas vezes — regra escrita no
`formKit.Campo`).

**Aceite:** clicando no texto "Buscar", o cursor entra no campo, nas cinco telas; o leitor de
tela anuncia o nome de cada filtro e de cada busca.

## A Exploração Rural, e por que ela entra pela metade

Ela é a tela mais nova, tem **zero registros em produção**, e é a única que já acerta o
estado de erro e o `aria-label`. Decisão dela em 21/09: **entra só nos ajustes objetivos de
consistência que se aplicam** — T1 (parcial: perder o `error.message`), T2, T3, T9, T10 —, e
**nada de comportamento especulativo** enquanto não houver uso real.

Por isso o estado vazio dela, que está fora da forma canônica da TIP-03 §5
("…para abrir {o quê} deste cliente"), **não** entra aqui: é frase de copy e vai no lote de
texto, junto da flexão dos `(s)`.

## O que esta tarefa NÃO faz, e é decisão registrada

- **Não acrescenta tooltip onde a árvore mandou outra coisa.** A §2 de
  `geral/texto-explicativo-na-tela.md` derrubou tooltip em **quatro** pontos onde o relato
  pedia um (T2, T4, T5, T8) — o degrau 3, texto de apoio visível, é que resolve. *Informação
  necessária para decidir não depende de passar o mouse.*
- **Não cria mapa de cor de status** (T4).
- **Não amplia a catraca de `<Button title>`** ao repositório (T2).
- **Não corrige a flexão dos `(s)`** — "matrícula(s)", "órfã(s)", "imóvel(is)", "sócio(s)",
  "registro(s)" e o `(s)` de `origemDoValor`. Mesma frente aprovada em 21/09 para a
  Solicitação de Documentos: um lote só, para não haver duas redações.
- **Não troca `...` por `…`** — backlog paralelo declarado no padrão, 216 ocorrências.
- **Não mexe no `bg-osg-moss text-white` escrito à mão** nos cinco botões. No tema OSG
  `--primary` **é** `--osg-moss`: o pixel é idêntico. É dívida de código, não achado de UX.
- **Não unifica `useAllMatriculas`**, que carrega todas as matrículas e filtra no cliente.
  Funciona com 33 linhas; dívida a observar.
