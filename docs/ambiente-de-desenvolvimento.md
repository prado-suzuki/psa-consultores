# Ambiente de desenvolvimento

Como o banco de desenvolvimento funciona, e como apontar o app para ele.

## O desenho em uma frase

O **dev compartilhado é o padrão**, para que a alteração de um dev apareça na tela do
outro no mesmo dia. O **local é a bancada de teste**, para quem vai mexer em algo que
pode quebrar o dos outros.

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
| `.env.development.local` | não | seu `supabase start` | quem quer isolamento |

## Usar o banco local

Requisitos: Docker rodando e a CLI do Supabase.

```bash
supabase start          # sobe a stack em :54321 (API), :54322 (DB), :54323 (Studio)
supabase db reset       # recria o schema do baseline e roda o seed
```

`supabase db reset` aplica `supabase/migrations/00000000000000_baseline.sql`, que é o
schema de produção inteiro, e depois `supabase/seed.sql`, que cria os 9 buckets e as
policies de `storage.objects`. O banco sobe com o schema completo e **sem nenhuma linha**.

Para apontar o app para ele, crie `.env.development.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<a chave que o `supabase start` imprime>
```

O Vite detecta o arquivo novo e reinicia sozinho. Para voltar ao compartilhado, apague.

### Com dados

O banco vazio serve para testar migration, não para navegar no app: sem usuário em
`auth.users` não dá nem para logar. Para carregar dados de produção:

```bash
scripts/carregar-dados-locais.sh ~/Downloads/psa-consultores_AAMMDD.backup
```

O arquivo `.backup` sai do Lovable em `Cloud → Overview → Advanced settings →
Export Lovable Cloud data`. Ele **não** é versionado e **não** deve ficar em pasta
sincronizada com nuvem: tem CPF, CNPJ, endereço e matrícula de cliente real, mais os
usuários com hash de senha.

Passe `--anonimizar` para trocar tudo isso por valores falsos de formato válido
(CPF com dígito verificador correto, e assim por diante). A senha de todos os usuários
vira `devlocal123`, o que também é a forma de entrar como qualquer papel.

O script se recusa a carregar dado real em banco que não seja `127.0.0.1`.

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

### Cuidado: o seed não roda no compartilhado

`supabase/seed.sql` roda no fim de todo `supabase db reset`, e reset só acontece no
local. No dev compartilhado ele foi aplicado à mão na montagem. Se você acrescentar um
bucket ou uma policy de `storage.objects` lá, o local recebe no próximo reset e o
compartilhado **não**. Aplique nos dois:

```bash
psql "$CONN" -f supabase/seed.sql
```

Os drops no começo de cada policy deixam o arquivo reaplicável, então rodar de novo é
seguro.

### Recarregar do zero

```bash
CONN='postgresql://postgres.vgzomuwnsdgrxbkyoavq:<SENHA>@aws-0-ca-central-1.pooler.supabase.com:5432/postgres'
SUPABASE_DB_URL="$CONN" scripts/carregar-dados-locais.sh <arquivo.backup> --anonimizar
```

## A regra de convivência

Migration destrutiva (`drop`, `rename`, `not null`, mudança de tipo) se ensaia primeiro
no local, com `db reset`, e só depois vai para o compartilhado. Um `drop column` errado
no compartilhado trava a equipe inteira, e é exatamente o tipo de coisa que o banco
local existe para absorver.

## Migrations

`supabase/migrations/` tem um arquivo só, o baseline. As 557 anteriores estão em
`supabase/migrations_arquivo/`, fora do caminho da CLI, com um `LEIA-ME.md` explicando
por que foram aposentadas. Migration nova entra normalmente em `supabase/migrations/`,
depois do baseline na ordem de timestamp.

Nomeie com timestamp de verdade (`date -u +%Y%m%d%H%M%S`). O histórico antigo tem sete
pares de arquivos com o mesmo timestamp, resultado de duas pessoas escolhendo a mesma
hora redonda no mesmo dia.
