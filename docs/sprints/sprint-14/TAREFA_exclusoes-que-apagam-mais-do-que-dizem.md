# TAREFA 3 — As exclusões da Estrutura do Cliente apagam mais do que dizem

> **Achado da leitura das cinco telas em 21/09/2026**, não relatado por usuário: o incômodo
> que abriu a análise era de UX, e embaixo dele estavam dois diálogos de exclusão que
> descrevem menos do que a exclusão faz. **Esta tarefa é correção de fato, não de UX** — e
> por isso é a primeira.
>
> **Banco: não.** Nenhuma migração, nenhuma RPC, nenhuma policy. As regras de FK que
> sustentam os dois defeitos **já estão em produção** e não mudam; o que muda é a tela
> perguntar antes. Os dois hooks novos são `SELECT`.
>
> **Não duplica a especificação.** O texto aprovado, os aceites completos, a evidência de
> produção e as regras de FK moram em
> [`osg/ajustes-ux-estrutura-do-cliente.md`](../../osg/ajustes-ux-estrutura-do-cliente.md),
> §1, §2 e apêndice A. Esta tarefa **consome** aquilo; não redecide nada. **A redação
> aprovada não se reescreve no PR** (§6 de `geral/texto-explicativo-na-tela.md`).

## Os defeitos

### B1 — Excluir um bem apaga o capital social registrado, e o diálogo fala só de matrículas

`movimentacao_quotas.bem_id` é **`ON DELETE CASCADE`** em produção. Um bem usado como
pagamento de aporte leva junto os movimentos de quota que o citam — e o quadro societário é
o acumulado desses movimentos, então o capital social registrado da empresa é reescrito.

O `DeleteBemDialog` enumera apenas as matrículas vinculadas.

**O caso existe hoje, e é o pior possível:**

```
referencia_dp                       PS-BARR-01
matrículas                          0
movimentos de quota pagos com ele   42
```

Com 0 matrículas, o diálogo cai no ramo mais tranquilizador que ele tem:
*"Nenhuma matrícula vinculada. Esta ação não pode ser desfeita."* — e a segunda frase é a
única verdadeira.

### B2 — O diálogo de excluir pessoa lista um vínculo de sete

Ele diz que "os vínculos de parentesco associados também serão removidos". Em produção,
excluir uma pessoa **também** apaga em cascata `checklist_cliente_item`, `administracao`,
`projeto_flag_valor` e `solicitacao_item_nao_aplicavel`, e **orfana** `documento_arquivo`
(SET NULL). O item de checklist some de outra tela, que é onde alguém vai reparar.

### B3 — Na maioria dos casos reais a exclusão de pessoa falha, mostrando Postgres na tela

`titularidade` é **RESTRICT** (19 pessoas em produção), `movimentacao_quotas` é
**NO ACTION** (53 pessoas), `acordo_signatario` e `acordo_sociedade_relacionada` são
**RESTRICT**. A pessoa lê a confirmação, confirma, e recebe
`description: error.message` — a mensagem crua do Postgres, em inglês, num toast.

### B4 — O comentário do `useDeletePessoa` afirma o contrário do que o banco faz

Linhas 137-139: *"O CASCADE do banco apaga as linhas do quadro societário da pessoa (como
empresa ou como sócia)"*. Não apaga — `movimentacao_quotas` é `NO ACTION`, e é exatamente
por isso que a exclusão falha (B3). O comentário está errado desde que foi escrito e induz
quem vier depois.

## Subtarefas

### T0 — Reconferir as duas contagens em produção antes de mexer

SELECT pelo MCP do Lovable (**só SELECT**, conforme o `AGENTS.md`), reproduzindo o apêndice
A da especificação: bens com movimento de quota, e pessoas presas por titularidade e por
movimento. Os números de 21/09 são 1 bem / 19 e 53 pessoas; se mudaram, a tarefa não muda,
mas o teste de T7 precisa de um caso real para apontar.

É barato e evita escrever teste contra um caso que deixou de existir.

### T1 — `useMovimentosDoBem(bemId)`

Em `src/hooks/useDiagnosticoPatrimonial.ts`, no molde do `useMatriculasByBem` (linha 360):
`enabled: !!bemId`, sem pré-carga. Devolve a contagem e o `empresa_pessoa_id` — o diálogo
precisa nomear a empresa.

**Aceite:** abrindo a lista do Cadastro Patrimonial, a aba de rede não mostra consulta de
movimento nenhuma; ela só aparece ao clicar numa lixeira.

### T2 — O bloqueio no `DeleteBemDialog`

`src/pages/equipe/osg/DiagnosticoPatrimonial.tsx`. Havendo ao menos um movimento, o diálogo
**não oferece exclusão**: só "Fechar" e "Ir para o Quadro Societário". O texto aprovado está
na §1 da especificação e vai como está.

**Aceite:**
- Clicando na lixeira de `PS-BARR-01`, vejo o nome da empresa, a contagem de movimentos, e
  **nenhum** botão que exclua.
- Clicando na lixeira de um bem sem movimento e com duas matrículas, vejo o diálogo de
  hoje, com "Manter matrículas" e "Excluir bem e matrículas".
- Clicando na lixeira de um bem sem movimento e sem matrícula, vejo "Nenhuma matrícula
  vinculada. Esta ação não pode ser desfeita." e o botão "Remover".

### T3 — `useVinculosDaPessoa(pessoaId)`

Em `src/hooks/useQualificacaoDasPartes.ts`, mesma forma do T1: consulta ao clicar, **não por
linha**. Decisão dela de 21/09 — pré-carregar por pessoa foi recusado.

Cobre os quatro vínculos que impedem (titularidade, movimento de quota, signatário de
acordo, sociedade relacionada) e os que apenas cascateiam, porque o diálogo da pessoa livre
precisa listá-los.

**Aceite:** abrindo a Qualificação das Partes de um cliente com 88 pessoas, nenhuma consulta
de vínculo é disparada até eu clicar numa lixeira.

### T4 — Recusa para pessoa presa, lista completa para pessoa livre

`src/pages/equipe/osg/QualificacaoDasPartes.tsx`. O `AlertDialog` de gatilho na linha vira
diálogo controlado, no molde do `DeleteBemDialog`. Textos aprovados na §2.

**Aceite:**
- Clicando na lixeira de uma pessoa titular de matrícula, vejo qual vínculo impede e em que
  tela desfazê-lo, e **nenhum** botão "Remover".
- Clicando na lixeira de uma pessoa sem vínculo, o diálogo cita parentescos, itens de
  checklist e documentos.

### T5 — Erro de banco sai da tela nos três caminhos de exclusão deste módulo

`useDeletePessoa` (`useQualificacaoDasPartes.ts:152`), `useDeleteBem`
(`useDiagnosticoPatrimonial.ts:298`) e `useDeleteMatricula` (`:607`) passam da mensagem crua
para a forma fixa da §4 do padrão, com o fecho que **já existe** no catálogo
(`FECHO_SUPORTE`, de `@/lib/rlsMessages`):

> **Não foi possível remover a pessoa.**
> Tente novamente. Se o problema continuar, entre em contato com o suporte.

O erro cru vai para `console.error` — é o que permite abrir chamado sem reproduzir.

⚠️ **Escopo:** são **16** `error.message` em toast nesses dois hooks. Esta tarefa converte
os **três de exclusão**. Os outros 13 (salvar bem, salvar pessoa, vínculo, administrador,
titularidade, impedimento, cartório) ficam registrados aqui como **B5** e são lote próprio —
ampliar de carona é o erro simétrico do que esta tarefa corrige.

**Aceite:** forçando a falha em qualquer das três exclusões, o toast não contém palavra em
inglês nem nome de tabela, e o `console` contém o erro original.

### T6 — Corrigir o comentário do `useDeletePessoa` (B4)

Três linhas. Não é cosmética: o comentário afirma o oposto do banco, e é o que faria a
próxima pessoa concluir que a exclusão funciona.

**Aceite:** o comentário descreve `NO ACTION` e diz que é por isso que a exclusão falha.

### T7 — Testes

Caracterizar os dois diálogos: bem com movimento (não oferece exclusão), bem sem movimento
nas três variantes de matrícula, pessoa presa (recusa) e pessoa livre (lista completa). E um
caso de `onError` provando que a mensagem do banco não chega ao toast.

**Aceite:** a suíte dos dois arquivos passa, e cada teste novo foi visto reprovando antes da
correção.

## Ordem

`T0 → T1 → T2` e `T0 → T3 → T4` são independentes entre si e podem ir em paralelo. `T5` e
`T6` são pequenos e podem ir a qualquer momento. `T7` fecha.

**Sugestão de corte de PR:** um PR para o bem (T1, T2), um para a pessoa (T3, T4, T6), um
para o T5. Assim um revert não leva os outros dois defeitos junto.

## O que esta tarefa NÃO faz

- **Não muda regra de FK.** Bloquear na tela não exige mexer no banco, e mexer no banco é
  passo humano pelo chat do Lovable (`AGENTS.md`).
- **Não desfaz movimento de quota.** O caminho de desfazer já existe no Quadro Societário; a
  tarefa direciona para lá, não reimplementa.
- **Não mexe na exclusão de matrícula usada em exploração rural.**
  `exploracao_rural_imovel.matricula_id` é `NO ACTION`, mas há **zero** explorações rurais
  em produção — decisão dela de 21/09 de não criar comportamento especulativo. Registrado no
  "fora do escopo" da especificação.
- **Não converte os outros 13 `error.message`** (B5, acima).
