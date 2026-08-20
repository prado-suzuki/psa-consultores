# ALE-7 — As tarefas do projeto passam a nascer com a demanda

Abrir uma demanda — que neste sistema **é o projeto**, um por produto contratado da ordem de
serviço — passa a **criar sozinho** as tarefas daquele produto. Projeto que já existia ganhou
um item de menu para gerar as que faltam.

## Onde acontece, e como a tarefa nasce

Nas telas `/equipe/tax/projetos/tarefas` e `/equipe/osg/projetos/tarefas`, em três momentos:
ao criar projeto avulso; ao criar em lote, uma vez por projeto, sem que a falha de um impeça
os outros; e pelo menu **⋯ → Gerar tarefas do produto**, que cria só o que falta e avisa
quantas criou. Nos três, a lista se atualiza **sem recarregar a página**.

Cada tarefa **é um serviço do produto**, na ordem de execução — a Estruturação Societária
abre no diagnóstico patrimonial e fecha nos atos de manutenção. O responsável é o do projeto,
caindo para o líder; o prazo é a data de início do projeto; horas ficam em branco, porque o
catálogo de serviços não tem esse campo. Medido em produção: de **1 a 16** tarefas por
projeto na OSG, de **1 a 7** no Fiscal.

## Regras que parecem defeito e não são

| Regra | O que significa na prática |
|---|---|
| **Nunca duplica** | Só insere o que falta. Clicar de novo não cria nada. |
| Projeto **sem produto** gera zero | Não é erro: falta de qual catálogo puxar. |
| Aviso só quando **gerou** algo | Zero é normal: projeto completo, ou produto sem serviço. |
| Falha na criação **não desfaz** o projeto | Fica criado, erro só no console. No redisparo, aparece. |
| Editar o catálogo **não** corrige tarefa criada | O redisparo traz os novos, não renomeia os antigos. |

## Pendências

| Pendência | Dono |
|---|---|
| Prazo por etapa e horas por tarefa: o catálogo de serviços não tem esses campos | próxima sprint |
| Impedir que dois cliques simultâneos dupliquem; só a checagem em consulta protege | Eduardo |

Em produção a geração ainda devolve zero: a mudança de banco está só em desenvolvimento.
