# Ambiente de desenvolvimento

Como o banco de desenvolvimento funciona, e como apontar o app para ele.

## O desenho em uma frase

O **dev compartilhado é o padrão**, para que a alteração de um dev apareça na tela do
outro no mesmo dia. O **local é a bancada de teste**, para quem vai mexer em algo que
pode quebrar o dos outros.

## Precedência dos arquivos de env

O Vite carrega nesta ordem, e **o último vence**:

```
.env  →  .env.local  →  .env.development  →  .env.development.local
```

Isso importa: um `.env.development` commitado sobrescreve o `.env.local` de todo mundo.
Por isso a configuração pessoal mora em `.env.development.local`, que é o slot de maior
precedência e cai no `*.local` do `.gitignore`.

| arquivo | no git | aponta para | quem usa |
|---|---|---|---|
| `.env` | sim | produção | build de produção |
| `.env.development` | sim | dev compartilhado | todo mundo, por padrão |
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

## Usar o dev compartilhado

Ainda não existe. Quando existir, é um projeto Supabase próprio da PSA, separado do
projeto de produção (que é gerenciado pelo Lovable e não expõe credencial). Montagem:

```bash
supabase link --project-ref <ref-do-projeto-dev>
supabase db push                                    # aplica o baseline
SUPABASE_DB_URL="<connection string do dev>" \
  scripts/carregar-dados-locais.sh <arquivo.backup> --anonimizar
```

Depois é só preencher `.env.development` com a URL e a publishable key do projeto dev
e commitar. As duas são públicas por natureza.

**`supabase db push` só pode ser usado contra o dev.** Produção não tem o baseline
registrado em `supabase_migrations.schema_migrations`, então um push lá tentaria
aplicar o schema inteiro por cima.

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
