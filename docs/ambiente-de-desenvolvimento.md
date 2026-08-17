# Ambiente de desenvolvimento

Como o banco de desenvolvimento funciona, e como apontar o app para ele.

## O desenho em uma frase

O **dev compartilhado é o padrão**, para que a alteração de um dev apareça na tela do
outro no mesmo dia. Quem precisa de isolamento aponta o app para um banco próprio pelo
`.env.development.local`.

## Qual banco cada branch usa

| onde | banco |
|---|---|
| build publicado (Lovable, a partir de `main`) | produção |
| `bun run dev` em `main` | produção |
| `bun run dev` em `develop` e branches de trabalho | dev compartilhado |
| qualquer lugar, com `.env.development.local` | o que você puser lá |

A escolha por branch é feita no `vite.config.ts`, não com conteúdo diferente de `.env`
em cada lado. O motivo é o merge: arquivo versionado com valor diferente nas duas
branches conflita em todo `develop → main`, e uma resolução errada troca o banco do app
sem ninguém perceber. Como está, os dois lados carregam exatamente os mesmos arquivos e
o merge não tem o que decidir.

O `vite.config.ts` ainda derruba o build de produção se o valor de desenvolvimento
chegar no `.env`, que é o dano que essa separação existe para evitar. A mensagem diz o
que aconteceu.

Quando `bun run dev` sobe, ele imprime para onde está apontando e por quê:

```
➜  Supabase:   https://vgzomuwnsdgrxbkyoavq.supabase.co  (.env.development)
```

### Precedência dos arquivos de env

O Vite carrega nesta ordem, e **o último vence**:

```
.env  →  .env.local  →  .env.development  →  .env.development.local
```

Isso importa: um `.env.development` commitado sobrescreve o `.env.local` de todo mundo.
Por isso a configuração pessoal mora em `.env.development.local`, que é o slot de maior
precedência e cai no `*.local` do `.gitignore`. A regra de branch fica entre os dois:
vence o `.env.development`, perde para o `.env.development.local`.

| arquivo | no git | aponta para | quem usa |
|---|---|---|---|
| `.env` | sim | produção | build de produção, e `dev` em `main` |
| `.env.development` | sim | dev compartilhado | `dev` fora de `main` |
| `.env.development.local` | não | um banco seu | quem quer isolamento |

## O dev compartilhado

Já existe e é o padrão: quem roda `bun run dev` sem `.env.development.local` cai nele.

```
ref:     vgzomuwnsdgrxbkyoavq
região:  ca-central-1
URL:     https://vgzomuwnsdgrxbkyoavq.supabase.co
```

É um projeto Supabase próprio da PSA, separado do de produção (que é gerenciado pelo
Lovable e não expõe credencial de Postgres para ninguém). Está com o schema idêntico
ao de produção, conferido pelas onze dimensões, e com os dados de produção
**anonimizados**. A senha de todos os usuários é `devlocal123`, o que é a forma de
entrar como qualquer papel.

A conexão direta (`db.<ref>.supabase.co`) é IPv6-only. Use o pooler:

```
postgresql://postgres.vgzomuwnsdgrxbkyoavq:<SENHA>@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
```

### Migration nova

```bash
supabase link --project-ref vgzomuwnsdgrxbkyoavq
supabase db push
```

O baseline já está registrado em `supabase_migrations.schema_migrations` do dev com a
versão `00000000000000`, então o push aplica só o que veio depois.

**`supabase db push` não pode ser usado contra produção.** Lá o baseline não está
registrado, então o push tentaria aplicar o schema inteiro por cima. Produção continua
recebendo migration pelo Lovable.

Escreva a migration **idempotente** (`add column if not exists`, `create or replace`,
`drop policy if exists`). Não é preciosismo: a mesma mudança vai ser aplicada por dois
caminhos (você no compartilhado, o Lovable em produção) e vai acabar existindo em dois
arquivos, o seu e o que o bot commita com nome UUID.

### O ciclo completo de uma coluna nova

O `src/integrations/supabase/types.ts` é gerado a partir do banco, e o do repositório
descreve **produção**, porque quem o gera e commita é o bot do Lovable. Enquanto a coluna
existir só no compartilhado, o `typecheck` não conhece ela. O ciclo resolve isso sem
ninguém editar o arquivo à mão:

1. Migration no arquivo, `supabase db push` no compartilhado.
2. Regenere o arquivo a partir do compartilhado e commite **sozinho**:

   ```bash
   supabase gen types typescript --project-id vgzomuwnsdgrxbkyoavq > src/integrations/supabase/types.ts
   ```

3. Escreva a feature normalmente e mande para a `develop`. Teste contra o compartilhado.
4. Antes de fechar o ciclo, peça ao Lovable, pelo chat, para aplicar aquele SQL em
   produção. Ele aplica e regenera o `types.ts` de lá, commitando na `main`.
5. Traga `main → develop`, sobrescrevendo o `types.ts` pelo da `main`.
6. Abra o PR `develop → main`. O arquivo já é igual nos dois lados, então nem aparece no
   diff.

**Produção recebe a coluna antes de o código que a usa chegar na `main`** (passo 4 antes
do 6). O app publicado é buildado da `main` e fala com produção: código na frente da
coluna quebra na tela do cliente, coluna aditiva na frente do código não incomoda ninguém.

O princípio por trás: **o `types.ts` descreve o banco daquela branch.** Conflito nele se
resolve regenerando a partir do banco da branch, nunca costurando os dois lados, porque o
conteúdo é função do schema. Colocar o arquivo no `.gitignore` não é opção: a CI faz
checkout puro e depende dele, e ninguém além do Lovable consegue gerar a versão de
produção.

### Migration só do compartilhado

Existe (`20260814190000_dev_clientes_prefixo_teste.sql`) e é legítima, mas com um limite:
ela mexe em **dados**, nunca em schema. Schema que só existe no compartilhado faz o código
compilar na `develop` e quebrar em produção.

### O que não está versionado

Duas coisas foram feitas à mão na montagem do compartilhado e não têm receita neste
repositório:

- os 9 buckets e as policies de `storage.objects`, aplicados a partir do mesmo dump que
  gerou o baseline;
- a carga dos dados de produção anonimizados.

Ou seja: bucket ou policy de storage que você criar pelo Studio do compartilhado existe
só lá, e recriar o compartilhado do zero exige repetir os dois passos fora do repo.

## A regra de convivência

Migration destrutiva (`drop`, `rename`, `not null`, mudança de tipo) não vai direto para
o compartilhado: ensaie primeiro num banco seu, apontado pelo `.env.development.local`.
Um `drop column` errado no compartilhado trava a equipe inteira.

## Migrations

`supabase/migrations/` tem um arquivo só, o baseline. As 557 anteriores estão em
`supabase/migrations_arquivo/`, fora do caminho da CLI, com um `LEIA-ME.md` explicando
por que foram aposentadas. Migration nova entra normalmente em `supabase/migrations/`,
depois do baseline na ordem de timestamp.

Nomeie com timestamp de verdade (`date -u +%Y%m%d%H%M%S`). O histórico antigo tem sete
pares de arquivos com o mesmo timestamp, resultado de duas pessoas escolhendo a mesma
hora redonda no mesmo dia.
