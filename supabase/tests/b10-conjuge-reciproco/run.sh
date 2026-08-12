#!/usr/bin/env bash
# =============================================================================
# Prova da migration do B10 num Postgres efêmero
# =============================================================================
# Não faz parte do `bun run test`: precisa de Docker, e o repo não tem harness
# de SQL. Rode à mão:
#
#   ./supabase/tests/b10-conjuge-reciproco/run.sh
#
# Existe um banco Supabase só, e ele é PRODUÇÃO. Um gatilho que reescreve linhas
# de `pessoa` não pode ir para lá com "eu li o SQL e parece certo": sobe aqui um
# Postgres descartável, cria o recorte de schema que a migration toca
# (00-fixture.sql, já com os quatro estados de vínculo que existem hoje), aplica
# a MIGRATION REAL do repo sem tocá-la e roda as afirmações:
#
#   02-backfill.sql    o que o backfill fecha e o que ele se recusa a decidir
#   (migration de novo)
#   03-reaplicacao.sql idempotência
#   04-regras.sql      as quatro regras de reciprocidade do B10, em operação
#   05-tenancy.sql     SECURITY DEFINER confinado ao cliente
#
# A projeção da filiação a partir de `parentesco` saiu desta entrega e virou
# frente própria (docs/osg/filiacao-derivada-do-parentesco.md): a versão
# reprovada destruía dado, e a próxima tentativa traz a prova junto.
#
# Qualquer afirmação falsa aborta com exit != 0.
#
# O que NÃO é provado aqui: as policies de RLS (o teste roda como dono das
# tabelas) e a camada de tela, que é coberta por vitest.
# =============================================================================
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_RAIZ="$(cd "$AQUI/../../.." && pwd)"
MIGRACAO_CONJUGE="supabase/migrations/20260813120000_pessoa_conjuge_reciproco.sql"
TESTES="supabase/tests/b10-conjuge-reciproco"
IMAGEM="${IMAGEM_POSTGRES:-postgres:17-alpine}"
CONTAINER="psa-prova-b10-$$"

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
  echo "→ $1"
  docker exec -i "$CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "/repo/$1"
}

rodar "$TESTES/00-fixture.sql"
rodar "$MIGRACAO_CONJUGE"
rodar "$TESTES/02-backfill.sql"

echo "→ reaplicando a migration"
rodar "$MIGRACAO_CONJUGE"
rodar "$TESTES/03-reaplicacao.sql"

rodar "$TESTES/04-regras.sql"
rodar "$TESTES/05-tenancy.sql"

echo "✓ prova do B10 passou"
