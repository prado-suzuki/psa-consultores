#!/usr/bin/env bash
#
# Carrega dados de produção no Postgres local, a partir de um export do Lovable Cloud.
#
#   Uso:  scripts/carregar-dados-locais.sh <arquivo.backup> [--anonimizar]
#
# Rode DEPOIS de `supabase db reset`. O reset cria o schema (baseline) e o seed
# (buckets e policies de storage); este script põe as linhas em cima.
#
# --anonimizar troca nome, CPF, CNPJ, email, telefone e endereço por valores
# falsos com formato válido, e põe a senha de todos os usuários em devlocal123.
# É OBRIGATÓRIO para qualquer banco que não seja a sua máquina.
#
# ATENÇÃO: o arquivo de backup contém dados reais de cliente (CPF, CNPJ, endereços,
# matrículas) e os usuários de auth com hash de senha. Não versione o backup, não
# versione o que sai daqui, e não deixe cópia em pasta sincronizada com nuvem.
#
# Por que não vira `supabase/seed.sql`: seed é commitado e roda em todo reset.
# Dado de cliente não entra no git.

set -euo pipefail

BACKUP="${1:-}"
ANONIMIZAR=0
[ "${2:-}" = "--anonimizar" ] && ANONIMIZAR=1
DB="${SUPABASE_DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then
  echo "uso: $0 <arquivo.backup> [--anonimizar]" >&2
  exit 1
fi

# Trava de segurança: dado real só na sua máquina.
if [ $ANONIMIZAR -eq 0 ] && ! grep -qE '@(127\.0\.0\.1|localhost)[:/]' <<<"$DB"; then
  echo "recusando: SUPABASE_DB_URL não é local e --anonimizar não foi passado." >&2
  echo "  Dado real de cliente não vai para banco compartilhado." >&2
  exit 1
fi

if ! pg_restore -l "$BACKUP" >/dev/null 2>&1; then
  echo "erro: $BACKUP não é um dump pg_dump em formato custom" >&2
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "== extraindo dados do schema public =="
pg_restore --data-only --schema=public --no-owner -f "$TMP/public.sql" "$BACKUP"

echo "== extraindo usuários de auth =="
pg_restore -l "$BACKUP" \
  | grep -E 'TABLE DATA auth (users|identities|mfa_factors|mfa_amr_claims) ' \
  > "$TMP/toc-auth.txt"
pg_restore -L "$TMP/toc-auth.txt" --data-only --no-owner -f "$TMP/auth.sql" "$BACKUP"

# session_replication_role = replica desliga triggers de usuário E checagem de FK
# na sessão, então a ordem em que as tabelas são carregadas deixa de importar e os
# triggers de auditoria/updated_at não disparam reescrevendo o que veio de produção.
carrega() {
  local arquivo=$1 rotulo=$2
  echo "== carregando $rotulo =="
  { echo "set session_replication_role = replica;"; cat "$arquivo"; } \
    | psql "$DB" -v ON_ERROR_STOP=1 -q
}

carrega "$TMP/auth.sql"   "auth (usuários)"
carrega "$TMP/public.sql" "public (144 tabelas)"

if [ $ANONIMIZAR -eq 1 ]; then
  echo "== anonimizando =="
  psql "$DB" -v ON_ERROR_STOP=1 -q -f "$AQUI/anonimizar-dados-locais.sql"
  echo "   senha de todos os usuários: devlocal123"
fi

echo
echo "== conferência =="
psql "$DB" -At -c "
  select 'usuários:  '||count(*) from auth.users
  union all select 'clientes:  '||count(*) from public.cliente
  union all select 'pessoas:   '||count(*) from public.pessoa
  union all select 'chamados:  '||count(*) from public.tickets
  union all select 'total public: '||coalesce(sum(n_live_tup),0)::text
    from pg_stat_user_tables where schemaname='public';"

echo
echo "Os arquivos dos buckets NÃO vêm no export, só os metadados."
echo "Se precisar, storage.objects fica vazio de propósito: linha sem arquivo dá 404."
