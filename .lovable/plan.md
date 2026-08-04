# Preparar ambiente de dev para o QA do Fluxo de Solicitação de Documentos

## Pré-voo (já executado)

| Verificação | Esperado | Obtido |
| --- | --- | --- |
| Vínculos ativos da automação (`3f4870f5…`) | 1 | **1** |
| Representantes ativos no cliente de QA | (informativo) | **1** |
| OS `TESTE-FLUXO/2026` já existente | 0 | **0** |
| Documentos do produto DSSG (`daa20481…`) | 46 | **46** |
| Linha Mms Agro (`4515d72f…`) | ativa hoje | `excluido = false` |

Divergência: o cliente de QA **já tem** um representante ativo — `QA-0729-1614 Marina Tavares`
(`marina.tavares.qa07291614@example.com`, user `f73bc5cc-…`, Diretor/Gestor, acesso a chamados).
Isso não bloqueia o trabalho: `resolve_user_cliente_id` valida um cliente **por usuário**, e a
automação é outro usuário. A Marina fica intocada.

## O que será feito

Uma migration única, em transação, exatamente na ordem pedida:

1. Cria a OS `TESTE-FLUXO/2026` para o cliente de QA (`fe775139-…`), situação `em_andamento`,
   cluster `b21b0b89-…`, região `3NO`, setor `AGR`.
2. Liga o produto Diagnóstico Societário, Sucessório e Governança (`daa20481-…`) a essa OS,
   buscando o id da OS por `numero_os` + `id_cliente` (sem depender de `returning`).
3. **Move** o representante de automação: marca a linha do Mms Agro (`4515d72f-…`) como
   `excluido = true` com a observação de pausa, e insere uma nova linha da automação apontando
   para o cliente de QA (Sócio/Proprietário, `acesso_chamados = false`).

O SQL de reversão fica registrado no comentário de cabeçalho da migration, sem ser executado.

## Fora de escopo (confirmado)

- Não corrigir os representantes com vínculo duplicado.
- Não apagar a linha do Mms Agro — ela só é marcada como excluída.
- Nenhum usuário de autenticação, senha, RLS, policy ou estrutura de tabela.
- Não gerar solicitação: isso é o teste da tela.

## GATE (a devolver após aplicar)

1. Os dois números do pré-voo.
2. OS criada: id, numero_os, situacao, id_cliente.
3. Produto contratado ligado a ela.
4. Contagem de documentos que a OS geraria — deve dar 46.
5. Prova de que a automação tem exatamente um vínculo, apontando para o cliente de QA.
6. Confirmação de que a linha do Mms Agro segue existindo com `excluido = true`.
