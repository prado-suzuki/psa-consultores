#!/usr/bin/env bash
# =============================================================================
# Prova da migration do B1 (matrícula única por cliente) num Postgres efêmero
# =============================================================================
# Não faz parte do `bun run test`: precisa de Docker, e o repo não tem harness
# de SQL. Rode à mão:
#
#   ./supabase/tests/b1-matricula-identidade-por-cliente/run.sh
#
# O que acontece: sobe um Postgres descartável, cria o recorte de schema que a
# migration toca (00-fixture.sql, já com a unicidade global nos dois nomes da
# deriva), aplica a MIGRATION REAL do repo sem tocar nela, roda as afirmações
# de aceite (02-prova.sql), aplica a migration DE NOVO e confere a idempotência
# (03-reaplicacao.sql). Depois, num banco separado, monta o cenário ruim
# (04-cenario-duplicata.sql: duas matrículas iguais no mesmo cliente) e exige
# que a migration ABORTE listando a linha ofensora e sem deixar rastro
# (05-aborto-limpo.sql). Qualquer afirmação falsa aborta com exit != 0.
#
# O que NÃO é provado aqui: o comportamento das policies de RLS por cluster
# (o teste roda como dono da tabela) e a mensagem amigável da UI, que é do
# front — o que se prova é que o erro continua chegando como SQLSTATE 23505,
# que é o gatilho dela.
# =============================================================================
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_RAIZ="$(cd "$AQUI/../../.." && pwd)"
MIGRATION="supabase/migrations/20260813010000_matricula_identidade_por_cliente.sql"
TESTES="supabase/tests/b1-matricula-identidade-por-cliente"
IMAGEM="${IMAGEM_POSTGRES:-postgres:17-alpine}"
CONTAINER="psa-prova-b1-$$"

limpar() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap limpar EXIT

echo "→ subindo $IMAGEM (container $CONTAINER)"
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -v "$REPO_RAIZ":/repo:ro \
  "$IMAGEM" >/dev/null

docker exec "$CONTAINER" sh -c 'i=0; while [ $i -lt 60 ]; do pg_isready -U postgres -q && exit 0; i=$((i+1)); sleep 1; done; exit 1' \
  || { echo "Postgres não subiu a tempo"; exit 1; }

rodar() {
  local banco="$1"; shift
  echo "→ [$banco] $1"
  docker exec -i "$CONTAINER" psql -U postgres -d "$banco" -v ON_ERROR_STOP=1 -q -f "/repo/$1"
}

# --- caminho feliz + idempotência -------------------------------------------
rodar postgres "$TESTES/00-fixture.sql"
rodar postgres "$MIGRATION"
rodar postgres "$TESTES/02-prova.sql"
rodar postgres "$MIGRATION"
rodar postgres "$TESTES/03-reaplicacao.sql"

# --- caminho ruim: duplicata dentro do mesmo cliente -------------------------
echo "→ banco separado para o cenário de duplicata"
docker exec "$CONTAINER" createdb -U postgres duplicata
rodar duplicata "$TESTES/00-fixture.sql"
rodar duplicata "$TESTES/04-cenario-duplicata.sql"

echo "→ [duplicata] $MIGRATION (tem que FALHAR)"
if docker exec -i "$CONTAINER" psql -U postgres -d duplicata -v ON_ERROR_STOP=1 -q \
     -f "/repo/$MIGRATION" 2>"$AQUI/.erro-esperado.txt"; then
  echo "✗ a migration deveria ter abortado com duplicatas e não abortou"
  exit 1
fi
echo "  mensagem devolvida ao aplicador:"
sed 's/^/  | /' "$AQUI/.erro-esperado.txt"
grep -q '4.242' "$AQUI/.erro-esperado.txt" \
  || { echo "✗ a mensagem de erro não listou a linha ofensora"; exit 1; }
rm -f "$AQUI/.erro-esperado.txt"

rodar duplicata "$TESTES/05-aborto-limpo.sql"

echo "✓ prova do B1 passou"
