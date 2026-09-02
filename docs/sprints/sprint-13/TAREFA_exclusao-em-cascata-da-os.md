# TAREFA — Rateio e produtos saem junto com a OS, pelo banco

> ## ⛔ APOSENTADA em 02/09/2026 — absorvida pela conversão da OS
>
> Esta tarefa existia para fazer **por trigger** o que a exclusão física faz sozinha. Com a
> decisão de que a ordem de serviço passa a apagar de verdade, a cascata volta a ser nativa
> das chaves estrangeiras, que **já estão** como `ON DELETE CASCADE` para rateio e produtos.
> Trigger nenhum é preciso.
>
> **A limpeza dos 26 rateios fantasma e dos 40 produtos presos migrou** para a
> [tarefa da ordem de serviço](TAREFA_os-hard-delete.md), onde vira pré-requisito da
> conversão — os órfãos precisam sair antes, senão viram lixo permanente sem OS viva que os
> alcance.
>
> O conteúdo abaixo fica como registro do diagnóstico. **Não executar.**

> **Decisão da Patricia, 02/09/2026:** *"coloca rateio pra excluir em cascata também — se
> está dentro da OS tem que excluir junto com ela."*
>
> **Origem:** medição feita durante a auditoria de permissões do cadastro de cliente
> (02/09/2026). A cascata já existe no banco, mas só para exclusão **física** — e o sistema
> exclui OS **logicamente**. Quem leva o rateio junto hoje é código de tela, e ele já falhou.

## O estado hoje, medido em produção

| | |
|---|---|
| Linhas de rateio **ativas** apontando para OS excluída | **26** |
| Percentual de rateio fantasma que elas somam | **1800%** |
| Produtos contratados presos em OS excluída | **40** |

Esses números entram em qualquer relatório que some rateio sem cruzar com `ordem_servico`,
porque a linha do rateio se diz ativa.

## Por que acontece

As chaves estrangeiras **já estão** como cascata:

```
distribuicao_receita.id_ordem_servico   -> ordem_servico   ON DELETE CASCADE
os_produtos_contratados.ordem_servico_id -> ordem_servico  ON DELETE CASCADE
```

Só que cascata de chave estrangeira dispara em `DELETE` de verdade. O cadastro nunca apaga
OS: ele grava `excluido = true` (por `soft_delete_ordem_servico`). Nenhuma cascata roda.

Para tapar isso, `useSaveClientTransaction.ts` busca o rateio da OS removida e faz o
soft-delete dele logo depois — com um comentário que antecipa o problema:

> *"O rateio acompanha a OS: sem isso sobra linha de `distribuicao_receita` ativa apontando
> pra OS excluída (receita fantasma nos relatórios)."*

A intenção está certa e a implementação está no lugar errado. Vale **só** quando a exclusão
passa por aquela tela. Qualquer outro caminho — outra tela, script, correção manual, ou o
período anterior a esse código existir — deixa o filho para trás. As 26 linhas são a prova.

`os_produtos_contratados` não tem nem o remendo: a tabela não tem coluna `excluido`, então
ao marcar a OS como excluída os 40 produtos simplesmente ficam.

---

## T1 — ⚠️ MIGRAÇÃO · Trigger na `ordem_servico`

A cascata passa a ser do banco, e vale para **qualquer** caminho que marque a OS como
excluída.

**Por que trigger e não dentro da função.** `soft_delete_ordem_servico` cobriria quem chama a
função. O vazamento aconteceu justamente por caminhos que não passaram por ela. O trigger
cobre todos.

**Por que SECURITY DEFINER.** A função do trigger escreve em `distribuicao_receita`, que tem
RLS. Uma função de trigger comum roda com o contexto de quem disparou — e cairia no mesmo
defeito que motivou as funções de soft-delete: a linha nova, com `excluido = true`, sai da
vista de quem grava e o comando é recusado com 42501.

**Só na virada `false -> true`.** Reativar OS não devolve o rateio: não existe caminho no
sistema que faça isso hoje, e adivinhar quais filhos eram da época seria pior que não fazer.

```sql
CREATE OR REPLACE FUNCTION public.tg_ordem_servico_cascata_exclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE distribuicao_receita dr
     SET excluido = true
   WHERE dr.id_ordem_servico = NEW.id
     AND dr.excluido = false;

  DELETE FROM os_produtos_contratados p
   WHERE p.ordem_servico_id = NEW.id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ordem_servico_cascata_exclusao ON public.ordem_servico;
CREATE TRIGGER trg_ordem_servico_cascata_exclusao
  AFTER UPDATE ON public.ordem_servico
  FOR EACH ROW
  WHEN (OLD.excluido = false AND NEW.excluido = true)
  EXECUTE FUNCTION public.tg_ordem_servico_cascata_exclusao();
```

> **Produto é apagado de vez, rateio é marcado.** `os_produtos_contratados` não tem coluna
> `excluido` — a tabela sempre foi de exclusão física, e a tela já apaga produto assim. O
> rateio tem a coluna e a mantém, para o valor continuar auditável.

> **Atenção ao aplicar junto com a
> [tarefa da ordem de serviço](TAREFA_os-hard-delete.md):** aquela tarefa reemite
> `soft_delete_ordem_servico` (T2 de lá). Este trigger dispara **por dentro** daquela função,
> no `UPDATE` final. Nenhum conflito — mas aplicar a tarefa de permissões primeiro, para o
> trigger nascer no mundo já ajustado.

## T2 — ⚠️ MIGRAÇÃO · Limpar o que já vazou

O trigger só vale daqui para frente. As 26 linhas de rateio e os 40 produtos que já estão
soltos continuam lá.

```sql
UPDATE public.distribuicao_receita dr
   SET excluido = true
 WHERE dr.excluido = false
   AND EXISTS (
     SELECT 1 FROM public.ordem_servico os
      WHERE os.id = dr.id_ordem_servico
        AND os.excluido = true
   );

DELETE FROM public.os_produtos_contratados p
 WHERE EXISTS (
   SELECT 1 FROM public.ordem_servico os
    WHERE os.id = p.ordem_servico_id
      AND os.excluido = true
 );
```

> **Conferir os números antes de rodar.** A contagem de hoje é 26 e 40. Se vier
> significativamente diferente na hora de aplicar, parar e entender o porquê antes de gravar
> — pode haver exclusão de OS acontecendo por caminho ainda não mapeado.

## T3 — Remover a cascata manual do front

Em `src/hooks/useSaveClientTransaction.ts`, depois de T1 estar em produção: o bloco que
busca o rateio da OS removida e chama `soft_delete_distribuicao_receita` (passo
`distribuicao_receita/soft-delete-orfas`, linhas ~420-435) vira redundante — o trigger já
marcou tudo antes de a chamada chegar.

Deixar o bloco não quebra nada (ele encontraria zero linhas), mas mantém duas fontes de
verdade para a mesma regra, que é exatamente o que produziu este bug. **Remover**, e trocar o
comentário por uma linha dizendo que a cascata agora é do banco, com o nome do trigger.

## T4 — Conferência

A mesma consulta que mediu o problema deve voltar zero nas três colunas:

```sql
SELECT
  (SELECT count(*)
     FROM public.distribuicao_receita dr
     JOIN public.ordem_servico os ON os.id = dr.id_ordem_servico
    WHERE dr.excluido = false AND os.excluido = true) AS rateio_ativo_em_os_excluida,
  (SELECT coalesce(sum(dr.percentual_rateio), 0)
     FROM public.distribuicao_receita dr
     JOIN public.ordem_servico os ON os.id = dr.id_ordem_servico
    WHERE dr.excluido = false AND os.excluido = true) AS soma_percentual_fantasma,
  (SELECT count(*)
     FROM public.os_produtos_contratados p
     JOIN public.ordem_servico os ON os.id = p.ordem_servico_id
    WHERE os.excluido = true) AS produtos_presos_em_os_excluida;
```

Depois, excluir uma OS pela tela e rodar de novo: tem que continuar zero.

---

## Decisão ainda em aberto — exclusão lógica × física

Discutido em 02/09/2026 e **não fechado**. A proposta era: só `cliente` e `contribuinte`
ficam com exclusão lógica, o resto passa a apagar de vez. O que a medição mostrou:

| Tabela | Vira física? | Por quê |
|---|---|---|
| `representante` | **pode** | nada no banco aponta para ela; custo é perder o histórico de quem foi representante e de quem teve acesso ao portal (9 marcadas hoje) |
| `ordem_servico` | **não hoje** | 70 das 152 OS ativas têm projeto apontando, e a chave `org_projects.ordem_servico_id` é `NO ACTION` — o banco recusa o apagar. Exigiria decidir antes o destino do projeto |
| `distribuicao_receita` | **não faz sentido isolado** | é filha da OS; se a OS é lógica, o rateio acompanha (é o que esta tarefa implementa) |

E, se algum dia a coluna `excluido` sair de alguma dessas tabelas, **as linhas já marcadas
voltam a aparecer**: 33 OS, 187 rateios, 9 representantes, 21 clientes, 37 contribuintes.
Precisa de escolha explícita — apagar de vez ou manter.

## Referências

- [`TAREFA_os-hard-delete.md`](TAREFA_os-hard-delete.md)
  — tarefa irmã; aplicar antes desta.
- [`20260820132950_soft_delete_os_e_rateio_security_definer.sql`](../../../supabase/migrations/20260820132950_soft_delete_os_e_rateio_security_definer.sql)
  — por que exclusão lógica com RLS precisa de SECURITY DEFINER.
- `src/hooks/useSaveClientTransaction.ts` — a cascata manual que sai em T3.
