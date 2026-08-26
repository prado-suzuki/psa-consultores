# Spec 02 — Schema da calculadora no sandbox

**Para:** subagent em **Opus 5**
**Branch:** `suc-01-calculadora-itcmd`
**Tarefa que isto atende:** SUC-01B (domínio versionado)
**Estado:** versão inicial. **Vai ser reescrita depois da spec 01**, com a lista do que realmente faltou.

> ## Leia isto primeiro
>
> O relatório da spec 01 traz três listas: reaproveitado, faltou, decidido. **A lista "faltou" é a entrada real desta spec.** Enquanto ela não existir, o que está aqui é hipótese derivada da homologação, não requisito confirmado.
>
> Quem executar esta spec deve começar lendo esse relatório e **corrigindo esta spec** antes de escrever SQL.

---

## 1. Escopo

Criar o schema que a calculadora precisa e ligar a tela da spec 01 aos campos reais. Duas frentes:

1. **Campos que faltam no cadastro existente** — o valor de ITR não tem campo canônico.
2. **Entidades novas da simulação** — nada disso existe hoje; conferido, zero tabelas.

## 2. Regra dura: escrever e não aplicar

**Você escreve a migration e não a executa. Nunca.** Sem `supabase db push`, sem `apply_migration`, sem DDL por MCP. Leitura do sandbox é `SELECT` e só.

Quem valida é o agente principal; quem aprova é o Alexandre. Ao terminar, diga na mesma mensagem que existe migration pendente de aprovação e qual o caminho do arquivo.

Toda migration é **idempotente** (`if not exists`, `create or replace`, `drop policy if exists`) e tem timestamp real de `date -u +%Y%m%d%H%M%S` — ela vai ser aplicada por dois caminhos e existir em duas versões, como o AGENTS.md descreve.

---

## 3. Frente 1 — o campo canônico do valor de ITR

O problema, medido: `bem.vlr_itr_iptu` existe e está preenchido em **0 de 27** linhas. `matricula` **não tem** essa coluna. O valor contábil mora na matrícula, em 22 de 26 — e é lá que também moram área e município. Onde há dado é em `vlr_imposto_anual`, campo com nome de imposto devido, em 8 matrículas, e nessas 8 há mistura de imposto com valor de imóvel.

Detalhe que importa e ninguém pediu: `vlr_benfeitorias` existe nas duas tabelas com **zero preenchido**. O valor de ITR é de terra nua — construção e benfeitoria são linha separada. Na guia real que conferimos, o valor de mercado veio quebrado em R$ 2.473.500 de terra e R$ 354.000 de construções.

**Decisão que precisa sair antes do SQL** (é do Bernardo, não sua): o valor de ITR passa a morar em `matricula.vlr_itr_iptu`, espelhando o contábil? E o imóvel tem um valor por cenário ou dois — terra e benfeitoria?

Quando decidido: migration aditiva criando a coluna, mais backfill a partir de `vlr_imposto_anual` **com triagem declarada** das 8 linhas ambíguas — nunca copiar as 8 em bloco. E estender `src/lib/osg/valoresDoBem.ts` para a terceira métrica, seguindo o padrão que já está lá para contábil e mercado.

## 4. Frente 2 — as entidades da simulação

A SUC-01B nomeia seis. O conteúdo de cada uma já está definido em `SPEC-motor-itcmd-mt.md`; o que falta é a forma.

| Entidade | Guarda | Por que existe separada |
|---|---|---|
| `itcmd_parametro` | UPF por competência, faixas e deduções com vigência | parâmetro versionado: mudar a UPF de hoje não pode mexer em simulação de ontem |
| `itcmd_simulacao` | cliente, empresa, data, **UPF congelada**, versão das regras | é o cabeçalho e o que torna a revisão reproduzível |
| `itcmd_participante` | doador ou donatário, com a doação anterior declarada | a lista de herdeiros é congelada junto, não lida ao vivo do cadastro |
| `itcmd_distribuicao` | legítima calculada e disponível atribuída, por participante | separa o que o motor produz do que o analista escolheu |
| `itcmd_resultado` | base e imposto por participante e cenário | o quadro de saída, congelado |
| `itcmd_revisao` | versões da simulação, com estado e aprovação | *"alterar entrada precisa criar nova revisão"* — é o ponto de atenção do card |

Nomes são sugestão; confira o padrão do repositório antes de fixar.

**A regra que amarra tudo:** mudança cadastral ou de parâmetro **não pode alterar silenciosamente uma revisão antiga**. Na prática, a simulação guarda o que usou — UPF, lista de participantes, doações anteriores e os valores dos imóveis no momento — em vez de rejoinar o cadastro na leitura. Se você resolver isso por FK viva, o critério de aceite da tarefa cai.

Cada tabela precisa de RLS coerente com as vizinhas de OSG, e de autoria (`created_by`, `updated_by`) — o card pede auditar criação e alteração. Antes de escrever policy, leia como as tabelas de cadastro OSG fazem: vínculo mais política de `SELECT` por papel.

## 5. Frente 3 — ligar a tela

Depois do schema, trocar o estado em React da spec 01 por persistência: hooks de domínio em `src/hooks/`, no padrão `useDomain*`, nunca Supabase dentro de componente. A tela passa a salvar, listar e abrir revisão.

`src/integrations/supabase/types.ts` se **regenera** pelo CLI contra o sandbox, e vai commitado **sozinho**. Não editar à mão, não costurar em conflito.

---

## 6. Entregáveis

- migrations em `supabase/migrations/`, idempotentes, **não aplicadas**;
- `valoresDoBem.ts` estendido, se a frente 1 tiver decisão;
- hooks de domínio e a tela persistindo;
- testes: o motor continua com os 77 casos verdes, e a persistência tem teste de que revisão antiga não muda quando parâmetro novo entra;
- versão inicial de retrospectiva e anexo da **SUC-01B**, pelas skills em `.claude/skills/criar-retrospectiva` e `criar-anexo`, gravados em `…\PSA Lovable\retrospectivas\SUC-01B\`.

## 7. Reportar

O SQL escrito, o que ele muda, e **o que ele apaga ou sobrescreve** se houver. Mais: toda decisão de modelagem que esta spec não fixou. Fechar dizendo que a migration está pendente de aprovação.
