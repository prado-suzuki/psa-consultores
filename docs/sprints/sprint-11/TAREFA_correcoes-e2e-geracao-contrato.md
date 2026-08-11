# Correções do fluxo de geração de contrato (OSG) — achados do teste e2e

Origem: execução manual do roteiro `e2e/dados/roteiro.md` em 11/08/2026 (branch `test/e2e-geracao-contrato`),
cadastrando o caso MMS inteiro e gerando os contratos. Estado da execução e achados brutos em
`e2e/dados/estado.json`. O relatório de leitura está em
<https://claude.ai/code/artifact/688d6aa0-b948-424c-8509-7570475e03a6>.

**Como usar este arquivo.** Um bug = um bloco `Bn`, com sintoma, causa raiz, rastro de código e a correção
esperada. Cada bloco tem uma seção **Não faça** com o atalho que resolveria só o caso MMS: a correção que
cair nela está errada, porque o próximo cliente reabre o bug. Ao concluir, marcar `✅ CONCLUÍDO (data)` no
bloco e atualizar o índice do `README.md` da sprint.

**Ordem sugerida.** B1 e B2 primeiro (um trava o cadastro, o outro deixa sair documento inválido). B3 a B7
mexem no gerador e compartilham contexto. Os amarelos são independentes entre si.

**Regra que vale para todos.** Nenhuma correção pode assumir "contrato social de constituição com um imóvel
e dois sócios". O mesmo motor atende doação, alteração contratual, matrícula digitada e o que vier depois.

---

## Vermelhos

### B1 · Matrícula é única no banco inteiro, não por cliente ⚠️ MIGRAÇÃO

**Sintoma.** Cadastrar a matrícula 9.617 no 1º Ofício de Lucas do Rio Verde retorna `409`, `23505`,
`duplicate key value violates unique constraint "matricula_numero_cartorio_unq"`, porque esse par já existe
para outro cliente. Bloqueia o cadastro e bloqueou o teste.

**Causa raiz.** A unicidade é `(cartorio_id, numero)` global. `matricula` não tem coluna `ambiente` e não
tem o `cliente_id` no índice, então o escopo de tenancy que protege `cliente` não alcança as filhas. Duas
consequências: um cliente de teste em `dev` colide com dado real de produção, e dois clientes reais que
compartilhem uma matrícula (condomínio, espólio, permuta, desmembramento) não podem coexistir.

**Rastro.**
- `supabase/migrations/20260526150000_matricula_decouple_from_bem.sql:23` — `ADD CONSTRAINT matricula_cartorio_numero_unique UNIQUE (cartorio_id, numero)`
- `supabase/migrations/20260526205004_2bb98a15-eb25-4ce5-979f-e09af7c18e71.sql:10` — repete a mesma constraint
- `src/hooks/useDiagnosticoPatrimonial.ts:438` — traduz o `23505` para a mensagem de UI
- `supabase/migrations/20260526160000_criar_matricula_com_titular.sql` — a RPC que estoura

⚠️ **Divergência entre repositório e produção:** o banco respondeu com o nome `matricula_numero_cartorio_unq`,
que **não existe em nenhuma migration do repo** (lá o nome é `matricula_cartorio_numero_unique`). Antes de
escrever a migration, listar as constraints reais da tabela em produção e corrigir a deriva, senão a
migration não encontra o objeto que precisa derrubar.

**Correção esperada.** Decidir o escopo real da identidade de uma matrícula e aplicá-lo por inteiro. O
caminho recomendado: a matrícula é única **por cliente**, `UNIQUE (cliente_id, cartorio_id, numero)` (ou
`bem_id` na cadeia, se `cliente_id` não estiver desnormalizado), preservando a checagem de duplicidade
dentro do mesmo cliente, que é a que tem valor de negócio. Se o produto quiser mesmo uma matrícula única
global e compartilhada entre clientes, então a mudança é outra: transformar `matricula` em entidade
compartilhada com vínculo N:N para `bem`, e aí a tela precisa de fluxo de "vincular existente" com
permissão, o que é bem maior. Escolher uma das duas e registrar a decisão no arquivo.
Junto: propagar o escopo de ambiente para as filhas (coluna `ambiente` herdada do cliente, ou índice que
inclua o `cliente_id`), para que dados de teste em `dev` nunca disputem chave com produção.

**Não faça.** Remover a constraint, renomeá-la, ou trocar a mensagem de erro. Sem unicidade nenhuma, o
cadastro duplicado do mesmo imóvel volta a acontecer dentro do próprio cliente, que é o problema que a
constraint resolve.

**Aceite.** Dois clientes distintos conseguem ter a matrícula `9.617` no mesmo cartório; o mesmo cliente
continua impedido de cadastrar `9.617` duas vezes, com a mensagem amigável atual.

---

### B2 · Documento incompleto é baixável e sai com cara de pronto

**Sintoma.** Com zero sócios e zero imóveis, o botão "Baixar .docx" continua ativo e o arquivo sai com
`O capital social da empresa será de R$ (), dividido em () quotas ... sendo: ,` e a tabela de sócios só com
cabeçalho. Nada no arquivo indica que está incompleto.

**Causa raiz.** O gate do botão olha se a *seleção* está completa e se o render não deu erro, não se o
documento tem conteúdo. Campo sem valor resolve para string vazia e o parágrafo é emitido do mesmo jeito.

**Rastro.**
- `src/components/equipe/osg/gerar/PainelAcoes.tsx:36` — `disabled={!pronto || baixando}`
- `src/hooks/useGerarDocumentoController.ts:1075-1081` — `folhaEstado`: `pendente` / `carregando` / `erro` / `pronto`
- `src/components/equipe/osg/gerar/PainelConferencia.tsx:168-264` — o painel já sabe que há 0 sócios e 0 imóveis e diz isso na tela
- `src/lib/templates/render.ts:131-152` — `resolver` e `truthy`, onde o campo vazio vira `''`

**Correção esperada.** Introduzir no controller um estado explícito de **completude do documento**, derivado
das mesmas contagens que o painel de conferência já calcula, e usá-lo como terceiro gate ao lado de
`selecoesCompletas` e `erro`. A regra tem que ser genérica: um documento está incompleto quando **algum
campo obrigatório do modelo não foi resolvido**, não quando "não há sócios". Modelo de matrícula digitada,
doação e alteração contratual têm conjuntos de campos obrigatórios diferentes, então a obrigatoriedade
precisa vir da definição do modelo/bloco (o vocabulário já descreve os campos em
`src/lib/templates/vocabulario.ts`), não de uma lista fixa no controller.
Comportamento sugerido: com pendências, o botão continua clicável mas abre confirmação nomeando o que
falta, e o arquivo gerado sai marcado como rascunho. Bloquear em silêncio é pior que hoje.

**Não faça.** `disabled={socios.length === 0}`. Isso conserta o contrato social e quebra qualquer modelo que
legitimamente não tenha sócios.

**Aceite.** Um modelo sem sócios por natureza (matrícula digitada) continua baixável sem alarme; o contrato
social sem sócios avisa antes de baixar e o arquivo sai identificado como incompleto.

---

### B3 · O status que habilita a integralização está fixo no código

**Sintoma.** Bens gravados como `Integralizado` produzem "Nenhum bem aprovado para integralização nesta
empresa" e o contrato sai sem imóveis e sem sócios. Só `Aprovado` alimenta o gerador.

**Causa raiz.** Filtro literal na query.

**Rastro.**
- `src/hooks/useGeracaoDocumento.ts:222` — `.eq('status_integralizacao', 'Aprovado')`
- `src/hooks/useDiagnosticoPatrimonial.ts:55-70` — a lista de status possíveis (`Pendente`, `Em análise`, `Aprovado`, `Aprovado para 2ª Instancia`, `Integralizado`, `Recusado`, `Não se aplica`)

**Correção esperada.** Substituir o literal por um predicado nomeado e único, do tipo
`STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO`, definido junto da lista de status e usado por toda consulta que
pergunta "esse bem entra no documento". No mínimo `Aprovado` e `Aprovado para 2ª Instancia` pertencem ao
conjunto; decidir com o time se `Integralizado` entra (bem já integralizado em ato anterior, que uma
alteração contratual ainda precisa descrever) ou se o vocabulário do status precisa mudar. Qualquer que
seja a decisão, a tela do Diagnóstico Patrimonial deve dizer, no próprio campo de status, quais valores
levam o bem para o documento; hoje o consultor descobre isso só quando o contrato sai vazio.

**Não faça.** Trocar `'Aprovado'` por `'Integralizado'`, ou por um `in.(...)` inline em um único hook. O
mesmo conceito é consultado em mais de um lugar e volta a divergir.

**Aceite.** Mudar o conjunto de status elegíveis em um ponto muda o comportamento da tela Gerar, do painel
de conferência e de qualquer relatório que use o conceito, sem editar cada query.

---

### B4 · O nome do cartório é descartado e substituído por texto genérico

**Sintoma.** O bloco do imóvel imprime `do Cartório de Registro de Imóveis de Lucas do Rio Verde` quando o
cadastro diz `Cartório de 1° Ofício de Imóveis`. O ofício, que identifica a serventia, se perde.

**Causa raiz.** Não é o motor: é o texto dos blocos. O mapeador expõe as duas variáveis, e os blocos
escolhem a errada, escrevendo o rótulo "Cartório de Registro de Imóveis de" fixo e completando com a
comarca.

**Rastro.**
- `src/lib/templates/mapeadores.ts:367-369` — `set('cartorio', m.cartorio?.nome_completo)`, `set('comarca', …)`, `set('ufCartorio', …)`
- `supabase/migrations/20260806140000_seed_familia_descricao_imovel.sql:91-115` — as cinco variantes da família "Descrição de imóvel" usam `Cartório de Registro de Imóveis de {{ imovel.comarca }}`
- `supabase/migrations/20260810120000_paragrafo_integralizacao_delega_a_familia.sql:91-95` — mesma redação
- `src/lib/templates/vocabulario.test.ts:255` — o teste congela o texto errado e vai falhar junto; atualizar

**Correção esperada.** ⚠️ MIGRAÇÃO de conteúdo: reescrever as variantes para usar o nome cadastrado, com a
comarca como complemento e não como substituto, algo como
`do {{ imovel.cartorio }}{{#imovel.comarca}} da comarca de {{ imovel.comarca }}{{/imovel.comarca}}`.
Como o cadastro de cartório pode ter nome vazio, definir no mapeador um fallback explícito para o rótulo
genérico, de modo que a decisão fique em um lugar só e não em cada bloco. Vale varrer as demais variantes e
modelos atrás de outros rótulos institucionais escritos à mão, que têm o mesmo defeito latente.
Junto: os blocos são editáveis pela Biblioteca, então a correção precisa ser idempotente e não sobrescrever
override de cliente sem aviso (ver o mecanismo de override já existente na Biblioteca).

**Não faça.** Concatenar no mapeador algo como `"Cartório de " + comarca` para bater com o gabarito da PSA.
O nome da serventia é dado do cadastro, não texto derivado.

**Aceite.** Um cartório cadastrado como "2º Ofício de Registro de Imóveis de Sinop" aparece assim no
documento, e um cartório sem nome preenchido continua gerando frase gramatical.

---

### B5 · Bloco de georreferenciamento é impresso vazio, e depois das assinaturas

**Sintoma.** Em matrícula com `georreferenciado = Não`, o `.docx` termina com
`O imóvel possui área de  ha e perímetro de  m, georreferenciado no sistema , certificado junto ao SIGEF sob o código  em , conforme o memorial descritivo:`
e a tabela de vértices só com cabeçalho, depois das testemunhas.

**Causa raiz.** O padrão correto existe e funciona: o bloco seeded envolve tudo em `{{#imovel.georefArea}}`,
e o mapeador preenche os campos georef com `''`, que `truthy` trata como falso. Ou seja, o bloco que entrou
no modelo Agro **não é o bloco guardado** (cópia sem a guarda, provavelmente montada na Biblioteca), ou a
guarda foi perdida em uma edição. O problema estrutural é que a corretude depende de cada autor de bloco
lembrar de escrever a guarda, e nada valida isso.

**Rastro.**
- `supabase/migrations/20260810160000_modelo_matricula_digitada.sql:26-108` — o bloco correto, com `{{#imovel.georefArea}}` e o comentário explicando por quê
- `src/lib/templates/mapeadores.ts:385-395` — `GEOREF_CAMPOS_MATRICULA` com default `''`
- `src/lib/templates/render.ts:149-152` — `truthy('') === false`
- `src/hooks/useGeorefByMatricula.ts:20-33` — 404 vira `null`, por contrato
- Verificar no banco quais blocos a composição do modelo "Contrato Social — Sociedade Limitada (Agro)"
  referencia, e qual deles tem a redação sem guarda (tabelas `tmpl_bloco` / `tmpl_bloco_versao` e a
  composição do modelo)

**Correção esperada.** Duas camadas, e as duas importam:
1. Consertar o bloco que está sem guarda (⚠️ MIGRAÇÃO de conteúdo).
2. Tornar o motor resistente a isso: um bloco cujo render resulte só em espaço em branco, pontuação solta
   ou tabela sem linhas **não entra no documento**. Isso é regra de composição, não de bloco, e resolve de
   uma vez toda uma classe de defeito (qualquer bloco opcional de qualquer modelo futuro). O lugar natural
   é onde os blocos compostos viram segmentos, com teste dedicado.

Complemento de ordenação: o memorial saiu depois do fecho de assinaturas porque a posição vem da ordem da
composição. Conferir a ordem do modelo Agro e, se o bloco for anexo por natureza, tratá-lo como anexo
explícito em vez de depender de o autor colocá-lo no lugar certo.

**Não faça.** Filtrar pelo nome do bloco ("se for o de georref e não houver dados, pule"). O próximo bloco
condicional (ônus, benfeitorias, arrendamento) reproduz o defeito.

**Aceite.** Um modelo com cinco blocos condicionais e nenhum dado correspondente gera um documento sem
nenhuma frase órfã, sem que nenhum dos cinco blocos precise de guarda escrita à mão.

---

### B6 · Capital social não fecha com o número de quotas

**Sintoma.** A cláusula quinta afirma capital de `R$ 558.413,55` dividido em `558.414` quotas de `R$ 1,00`.
As quotas somam `R$ 558.414,00`, quarenta e cinco centavos a mais. A tabela de sócios repete o par
incoerente.

**Causa raiz.** O modelo assume quota de R$ 1,00 e deriva a quantidade arredondando o capital, sem que nada
force a identidade `Σ quotas × valor nominal = capital`. O resto do centavo não tem para onde ir.

**Rastro.**
- `src/lib/templates/mapeadores.ts:137` — `return { capitalValor: capital, totalQuotas: Math.round(capital) }`
- `src/lib/templates/mapeadores.ts:603-624` — participações por titular, `quotas: Math.round(a.cent / 100)` e o "último absorve a diferença"
- `src/lib/templates/mapeadores.test.ts:739,786-800` — os testes congelam a invariante atual (Σ quotas = `Math.round(capital)`), que é justamente a que produz a incoerência; revisar junto

**Correção esperada.** Tratar valor nominal da quota como parâmetro da sociedade, não como constante
implícita de R$ 1,00, e fechar a conta pelo lado do capital: com quota de R$ 1,00, o capital do contrato
deve ser o valor inteiro correspondente às quotas, e a diferença de centavos precisa ter destino declarado
(ajuste do valor integralizado, quota de valor nominal diferente, ou capital com centavos e quota fracionada
onde o estatuto permitir). Escolher a regra com o time e implementá-la em um único ponto que devolva capital
e quotas já coerentes entre si, com teste de propriedade: para qualquer conjunto de valores de entrada,
`Σ quotas × valorNominal === capital` e `Σ quotas dos sócios === totalQuotas`.

**Não faça.** Trocar `Math.round` por `Math.floor`, ou somar o centavo no último sócio. Continua sem
invariante, só muda o caso em que o erro aparece.

**Aceite.** Teste de propriedade com valores aleatórios (inclusive com centavos, com um sócio e com muitos)
sem nenhuma combinação em que a cláusula de capital se contradiga.

---

### B7 · Empresa Proprietária não tem como registrar cessão de quotas

**Sintoma.** No Quadro Societário da MMS Agro (tipo PR) não existe botão de vincular sócio; a tela diz que
a participação é calculada da integralização aprovada. Mas a composição real veio de **cessão de quotas**
(os fundadores passaram tudo à holding), que não é integralização de bem. A estrutura societária não tem
onde ser representada.

**Causa raiz.** O modelo de dados da participação de uma PR é derivado, sem espaço para participação
adquirida por outro fato jurídico.

**Rastro.**
- `src/pages/equipe/osg/QuadroSocietario.tsx:45-50` — desvio por `tipo_empresa === 'PR'`
- `src/components/equipe/osg/quadro-societario/QuadroEmpresaProprietaria.tsx` — a tela somente leitura
- `src/lib/templates/mapeadores.ts:125-141` — `calcularCapitalSociedade`, que para PR soma integralizações e para os demais lê `socios`
- `src/hooks/useQuadroSocietario.ts` — o caminho de escrita que existe hoje só para CN

**Correção esperada.** Decisão de produto antes de código: a participação numa PR pode ter **origens
diferentes** (integralização de bens, cessão, aumento de capital em moeda, doação). O desenho generalizado é
representar participação como fato com origem, e a integralização passa a ser uma das origens, calculada,
convivendo com lançamentos manuais auditáveis. A tela então mostra as duas fontes e a soma, deixando claro o
que é derivado e o que foi lançado. Registrar a decisão em `docs/osg/` e linkar aqui.

**Não faça.** Liberar o "Vincular sócio" para PR gravando por cima do cálculo. Ficariam duas verdades para o
mesmo número, sem dizer qual vale no contrato.

**Aceite.** O caso MMS (holding com 100% da operacional por cessão) e o caso de constituição por
integralização de bens convivem na mesma tela, cada um com sua origem visível.

---

## Amarelos

### B8 · Área em m² é truncada em duas casas, e trocar a unidade arredonda em silêncio

**Sintoma.** `699,8677 m²` (valor da matrícula real) vira `699,86`. Trocar a unidade de ha para m² depois de
digitar arredonda o número já preenchido, sem aviso.

**Causa raiz.** Regra de precisão por unidade, com a premissa de que m² não precisa de casas decimais.
Matrícula urbana contradiz isso.

**Rastro.**
- `src/components/equipe/osg/diagnostico-patrimonial/areaUtils.ts:12-14` — `maxAreaDecimals` e `areaStep`
- `src/components/equipe/osg/diagnostico-patrimonial/areaUtils.ts:35-42` — `clampDecimals` / `clampAreaInput`
- `src/components/equipe/osg/diagnostico-patrimonial/MatriculaModal.tsx` e `BemModal.tsx` — consumidores
- `src/components/equipe/osg/diagnostico-patrimonial/TitularidadesPanel.tsx:266` — `step="0.01"` na fração, revisar pelo mesmo critério

**Correção esperada.** Precisão de entrada não pode ser menor que a precisão do documento de origem. Adotar
uma casa decimal única e suficiente para todas as unidades (quatro casas atende ha, m² e a decomposição
ha + m²) e deixar a formatação de exibição, essa sim, variar por unidade. Conversão entre unidades nunca
deve alterar o valor digitado em silêncio: ou converte de fato (10.000 m² = 1 ha) ou preserva e avisa.

**Não faça.** `maxAreaDecimals = 4` só para `m2`. O problema é a premissa de amarrar precisão de
armazenamento a unidade; qualquer unidade nova repete o bug.

**Aceite.** `699,8677 m²`, `284,8610 ha` e `1.234 ha e 5.678 m²` entram, gravam e voltam idênticos, e trocar
a unidade com valor preenchido não altera a quantidade representada.

---

### B9 · Valor contábil do bem: coluna lida na lista, mas sem onde ser preenchida

**Sintoma.** A lista de bens mostra "Vlr. contábil", "Vlr. mercado" e "Total contábil: R$ 0,00" mesmo com
matrícula gravada com R$ 558.413,55. Para imóvel o formulário do bem não tem esses campos; para Participação
Societária tem.

**Causa raiz.** Os valores migraram do bem para a matrícula, e a lista continuou lendo a coluna do bem, que
agora ninguém preenche. Duas fontes para o mesmo número.

**Rastro.**
- `src/pages/equipe/osg/DiagnosticoPatrimonial.tsx:62-68` — totais somando `b.vlr_contabil`
- `src/pages/equipe/osg/DiagnosticoPatrimonial.tsx:222-223` — os rodapés de total
- `src/components/equipe/osg/diagnostico-patrimonial/BemModal.tsx:53,90` — `isImovel` decide se os campos de valor existem e se são obrigatórios
- `src/hooks/useDiagnosticoPatrimonial.ts:60-83` — `BEM_DIFF_FIELDS` e `MATRICULA_DIFF_FIELDS`, com o comentário "antes ficavam apenas no bem"

**Correção esperada.** Definir uma fonte só. Para bem com matrícula, o valor do bem é a soma das matrículas
e deve ser derivado na leitura (view ou agregação no hook), nunca uma coluna paralela que envelhece. Para
bem sem matrícula, o valor continua no próprio bem. A lista e os totais consomem o valor derivado,
independente do tipo, e o formulário só mostra campo editável onde ele é a fonte.

**Não faça.** Copiar o valor da matrícula para a coluna do bem ao salvar. Cria duas verdades e a segunda
desatualiza no primeiro edit que não passar pela tela.

**Aceite.** Bem com duas matrículas mostra a soma das duas na lista; bem sem matrícula mostra o que foi
digitado; nenhum caminho grava o mesmo número em dois lugares.

---

### B10 · Vínculo de cônjuge não é espelhado, e o select não filtra quem já tem cônjuge

**Sintoma.** Gravar PF-02 apontando PF-01 deixa PF-01 sem cônjuge; é preciso abrir o outro cadastro e
repetir. O select ainda oferece pessoas já casadas com terceiros.

**Causa raiz.** `conjuge_id` é um ponteiro simples, escrito de um lado só, sem reciprocidade garantida.

**Rastro.**
- `src/hooks/useQualificacaoDasPartes.ts:29` — `conjuge_id` na lista de campos
- `src/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab.tsx` — o select e a condição por estado civil
- `src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx` — montagem do payload

**Correção esperada.** Casamento é relação simétrica: garantir a reciprocidade na escrita (dos dois lados na
mesma transação, ou trigger no banco que espelhe, ou leitura que considere as duas pontas). Junto, impedir
o estado inconsistente: quem já tem cônjuge não aparece como opção livre, e trocar o cônjuge de alguém
desfaz o vínculo anterior explicitamente. A mesma regra vale para qualquer relação simétrica futura.

**Não faça.** Só escrever o outro lado no ponto do modal. O próximo caminho de escrita (importação, cadastro
por documento, correção em massa) volta a criar vínculo pela metade.

**Aceite.** Depois de salvar de qualquer caminho, abrir as duas pessoas mostra o vínculo nos dois; trocar o
cônjuge de A libera B.

---

### B11 · Filiação aceita um único vínculo, e a tabela suporta vários

**Sintoma.** Não há como apontar pai e mãe: a seção tem um único trio Parente / Tipo / Natureza. A mãe fica
só no campo de texto livre.

**Causa raiz.** Limitação de UI, não do modelo: `parentesco` é tabela própria, com N linhas por pessoa.

**Rastro.**
- `src/hooks/useQualificacaoDasPartes.ts:159-222` — CRUD de `parentesco`, já plural
- `src/components/equipe/osg/qualificacao-das-partes/pessoa/FiliacaoCombobox.tsx` — o combobox único
- `src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx` — envia um parentesco só

**Correção esperada.** Transformar a seção em lista de vínculos (adicionar, editar, remover), do mesmo jeito
que Administradores já funciona no modal de PJ, sem limite fixo de quantidade nem de tipo. Aproveitar para
usar os vínculos como fonte da qualificação (o texto livre de filiação vira derivado ou some).

**Não faça.** Duplicar o combobox em "pai" e "mãe". Não cobre segundo grau, adoção, tutela nem a
multiparentalidade que a própria tabela já admite.

**Aceite.** Uma pessoa com pai, mãe e um tio cadastrados mostra os três, e a lista de parentesco da tela
principal reflete todos.

---

### B12 · Outorga conjugal fica na linha do próprio sócio, sem linha para o cônjuge

**Sintoma.** Sai `JOSE EDUARDO ... Sócio administrador e Outorga Conjugal` e
`CAMILA ... Sócia e Outorga Conjugal`. Quem outorga é o cônjuge, e o cônjuge não tem onde assinar.

**Causa raiz.** A outorga é tratada como sufixo do rótulo do sócio, não como signatário. A decisão de
*quando* exigir está correta.

**Rastro.**
- `supabase/migrations/20260810180000_blocos_faltantes_dos_contratos_mms.sql:120-140` — bloco de fecho, com `{{#socio.exigeOutorgaConjugal}} e Outorga Conjugal{{/socio.exigeOutorgaConjugal}}`
- `src/lib/templates/vocabulario.ts:315-321` — a flag "exige outorga conjugal", derivada do regime de bens
- `src/lib/templates/concordancia.ts:27` — concordância do rótulo
- `src/lib/templates/docx.test.ts:121,130` — teste que congela a redação atual

**Correção esperada.** Modelar **signatários** como lista com papel (sócio, administrador, cônjuge
outorgante, testemunha, advogado), montada a partir do quadro societário mais os vínculos de cônjuge, e o
bloco de fecho passa a percorrer essa lista. Assim o cônjuge ganha linha própria com o nome dele, e
qualquer instrumento futuro (doação com anuência, procuração) reaproveita a mesma lista. Depende de o nome
do cônjuge chegar ao mapeador, o que se apoia em B10.

**Não faça.** Concatenar o nome do cônjuge no rótulo do sócio. A assinatura precisa de linha própria para
valer.

**Aceite.** Sócio casado em comunhão gera duas linhas de assinatura (ele e o cônjuge, nomeado); sócio
solteiro gera uma; administrador não sócio também recebe a sua (ver B13).

---

### B13 · Administrador não sócio é qualificado mas não assina

**Sintoma.** No contrato da holding, José Eduardo e Maria são qualificados na cláusula de administração e o
fecho traz linha só para as sócias.

**Causa raiz.** O bloco de fecho itera `{{#socios}}`, e administrador não sócio não está nessa lista.

**Rastro.** Mesmo bloco de B12 (`20260810180000_blocos_faltantes_dos_contratos_mms.sql:120-140`) e
`src/lib/templates/mapeadores.ts` (`mapearAdministrador`).

**Correção esperada.** Resolvido pela mesma lista de signatários de B12: quem administra assina, seja sócio
ou não, com o papel correto no rótulo. Tratar os dois bugs na mesma entrega.

**Não faça.** Acrescentar um segundo laço `{{#administradores}}` no fecho: administrador que também é sócio
passa a aparecer duas vezes.

---

### B14 · Livro e folha saem só por extenso

**Sintoma.** `no Livro dois, Folhas/Ficha um`, quando o padrão da PSA é `no Livro 02 (dois), folhas/ficha 01 (um)`.

**Causa raiz.** O bloco usa apenas a variante `*Extenso`, embora o mapeador exponha também o valor cru.

**Rastro.**
- `src/lib/templates/mapeadores.ts:351-352` — `set('livro', m.livro)`, `set('folha', m.folha)`
- `supabase/migrations/20260810120000_paragrafo_integralizacao_delega_a_familia.sql:91-95` — `Livro {{ imovel.livroExtenso }}`
- `supabase/migrations/20260806140000_seed_familia_descricao_imovel.sql:91-115` — idem nas cinco variantes

**Correção esperada.** ⚠️ MIGRAÇÃO de conteúdo: adotar o padrão numeral + extenso nas variantes, como o resto
do documento já faz com valores e quotas. Ao varrer, conferir se há outros campos onde o extenso substituiu
o numeral em vez de acompanhá-lo, e padronizar de uma vez.

**Não faça.** Fazer `livroExtenso` devolver "02 (dois)". A variável passa a mentir sobre o que é, e quem
quiser só o extenso perde a opção.

---

### B15 · O binding de imóvel do modelo é de escolha única

**Sintoma.** No passo "Este modelo também precisa de: Imóvel" só cabe uma matrícula, mas o contrato de
constituição integraliza várias (no caso MMS, sete).

**Causa raiz.** O papel do binding é singular, enquanto o parágrafo de integralização é um laço.

**Rastro.**
- `src/lib/templates/binding.ts` — definição dos papéis
- `src/hooks/useGerarDocumentoController.ts:432-449` — `bindingMatricula`, `registroPorBinding`, e a distinção entre binding e listas
- `supabase/migrations/20260810120000_paragrafo_integralizacao_delega_a_familia.sql` — o laço `{{#imoveis}}` que já existe

**Correção esperada.** Deixar o papel declarar cardinalidade (um ou muitos) e a tela oferecer seleção
múltipla quando for o caso, alimentando o laço que o bloco já usa. O georref, que é por matrícula, precisa
seguir a matrícula de cada item do laço, não um binding único.

**Não faça.** Ignorar o binding e sempre usar todos os imóveis aprovados da empresa. Modelos que descrevem
um imóvel só (matrícula digitada) quebram.

---

### B16 · Validação sem mensagem: o formulário troca de aba e não diz o que falta

**Sintoma.** Salvar bem sem titular leva para a aba Titularidade com um asterisco no campo, sem toast nem
texto. Parece que o botão não funcionou.

**Causa raiz.** O caminho de validação que muda de aba não emite feedback, ao contrário dos outros
(`toast.error` existe para os demais casos no mesmo arquivo).

**Rastro.**
- `src/components/equipe/osg/diagnostico-patrimonial/BemModal.tsx:89-90` — exemplos de validação que avisam
- `src/components/equipe/osg/diagnostico-patrimonial/MatriculaModal.tsx` — mesmo padrão, titular inicial
- `AGENTS.md` — feedback visual obrigatoriamente via `useToast` / `sonner`

**Correção esperada.** Um utilitário único de "falha de validação" usado por todos os modais: leva foco ao
primeiro campo inválido, troca de aba se necessário **e** avisa dizendo o que falta. Aplicar a todos os
modais do módulo, não só ao de bem.

---

### B17 · Obrigatoriedade só descoberta pelo servidor (cluster do cliente)

**Sintoma.** Salvar cliente sem cluster volta `400` com `Selecione ao menos 1 cluster` vindo da RPC. O campo
não é marcado como obrigatório na tela.

**Rastro.**
- `supabase/migrations/20260717134443_ea8ddc93-74be-4fbe-860d-6f0bf5aa2b2b.sql:18` — `RAISE EXCEPTION 'Selecione ao menos 1 cluster' USING ERRCODE = '23514'`
- `src/hooks/useSaveClientTransaction.ts` — trata o erro depois do round-trip

**Correção esperada.** Toda regra obrigatória que vive na RPC precisa de espelho no formulário: marcação
visual de obrigatório e bloqueio antes do envio, com a mensagem do servidor como rede de segurança.
Varrer as RPCs do módulo atrás de outros `RAISE` de validação sem par na UI e cobrir todos.

---

### B18 · Campos do cadastro sem lugar para dados que os documentos usam

**Sintoma.** O formulário de cliente não tem município e UF. A administração de PJ não tem observação, e a
regra real ("administração isolada, mas os atos da cláusula sexta exigem as duas assinaturas") só coube num
marcador booleano.

**Rastro.**
- Modal de cliente (aba Dados do Cliente/Grupo) e `src/hooks/useSaveClientTransaction.ts`
- `src/components/equipe/osg/qualificacao-das-partes/pessoa/AdministracaoPanel.tsx`

**Correção esperada.** Confrontar o que os modelos pedem (o vocabulário em
`src/lib/templates/vocabulario.ts` é a lista de campos que os documentos consomem) com o que o cadastro
oferece, e fechar as lacunas encontradas. Para poderes de administração, o booleano "assina isoladamente"
não descreve o caso comum de limite por tipo de ato; avaliar um campo estruturado, com texto livre como
saída de emergência.

---

### B19 · Data de assinatura sai com pontuação quebrada quando o campo manual está vazio

**Sintoma.** `Lucas do Rio Verde/MT, .`

**Rastro.** `supabase/migrations/20260810180000_blocos_faltantes_dos_contratos_mms.sql:126` —
`{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.`

**Correção esperada.** Campo de preenchimento manual não resolvido deve render como lacuna assinalável
(`____ de __________ de 20__`) ou desaparecer com a pontuação, decidido no motor para todos os campos
manuais de uma vez, e não bloco a bloco. Casa com o aviso de documento incompleto de B2.

---

### B20 · Nome do cliente exibido em Title Case

**Sintoma.** `[TESTE E2E] Grupo MMS` aparece como `[Teste E2e] Grupo Mms`. O valor gravado está correto.

**Correção esperada.** Não normalizar caixa na exibição de nomes próprios e razões sociais: sigla é
significado. Se a intenção era uniformizar entrada bagunçada, fazer isso na escrita, com o usuário vendo, e
nunca na renderização.

---

### B21 · Sessão cai no meio do trabalho e a alteração em andamento se perde

**Sintoma.** Depois de cerca de quarenta minutos, `POST /auth/v1/token?grant_type=refresh_token` voltou
`400` e o app deslogou para `/equipe`. Os dados já salvos sobreviveram; o "Salvar alterações" em andamento
se perdeu.

**Rastro.** `src/contexts/AuthContext.tsx` e a configuração do cliente Supabase em
`src/integrations/supabase/` (arquivo autogerado, não editar; a correção fica no contexto de auth).

**Correção esperada.** Diagnosticar o motivo do refresh falhar (rotação de token com abas concorrentes é a
suspeita mais comum) e, independente da causa, tornar a expiração não destrutiva: avisar antes, permitir
reautenticar sem perder o formulário aberto, e reenviar a operação pendente. Vale para qualquer formulário
longo do sistema, não só os do OSG.

---

## Confirmações que devem continuar passando

Não são bugs; são comportamentos corretos observados no teste, que servem de teste de regressão para quem
mexer nos itens acima.

- Duas matrículas sob o mesmo bem compartilhando um CCIR são aceitas (o CCIR é do imóvel rural como unidade).
- Bem com `participa_estruturacao` desligado não aparece em nenhum documento gerado.
- O modal de matrícula se adapta ao tipo: urbano troca ITR por IPTU e esconde georreferenciamento.
- A área em hectare preserva as quatro casas do documento de origem.
- A flag de outorga conjugal por regime de bens acerta quem precisa (solteiro não gera outorga).
- Objeto social com CNAE vira lista formatada no documento.
