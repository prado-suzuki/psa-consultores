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
