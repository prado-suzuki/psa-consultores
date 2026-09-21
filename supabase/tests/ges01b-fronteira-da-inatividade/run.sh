#!/usr/bin/env bash
# =============================================================================
# Prova da fronteira da GES-01B (aviso de tarefa e projeto sem movimentacao)
# =============================================================================
# Nao faz parte do `bun run test`: precisa de um Postgres descartavel, e o repo
# nao tem harness de SQL. Rode a mao, num dos dois modos.
#
#   Docker (padrao):
#     ./supabase/tests/ges01b-fronteira-da-inatividade/run.sh
#
#   Binarios locais, sem Docker e sem instalar nada:
#     PG_BIN=/caminho/para/pgsql/bin ./supabase/tests/ges01b-fronteira-da-inatividade/run.sh
#
# O SEGUNDO MODO EXISTE PORQUE A MAQUINA DE DESENVOLVIMENTO NAO TEM DOCKER, e
# instalar exigiria WSL2, elevacao de administrador e reinicio. O zip de binarios
# do Postgres (get.enterprisedb.com/postgresql, ~315 MB) resolve sem nada disso:
# descompacta, `initdb`, sobe numa porta alta, roda, derruba. Foi assim que esta
# prova rodou pela primeira vez, em 21/09/2026, com as 15 afirmacoes passando
# contra o Postgres 17.6.
#
# O QUE ESTA PROVA COBRE, e e o que o "Como" do card pedia:
#   * a borda do limiar: entra no 15o dia, nao no 14o;
#   * a borda da escada: o gestor entra no 22o, nao junto com o dono, e com
#     atraso 0 volta a ser junto;
#   * a borda do que conta como movimentacao: alteracao cadastral de ontem NAO
#     reinicia a contagem, comentario de gente reinicia, comentario de sistema
#     nao, e tarefa sem auditoria cai no created_at;
#   * os status que nao alertam (waiting_client, done, backlog);
#   * a borda do projeto: 29 nao, 29 com limiar 29 sim, e projeto nao para
#     enquanto uma tarefa aberta se move;
#   * o recorte por ambiente.
#
# O QUE NAO COBRE, de proposito: a escrita do aviso. As `alertar_*` sao criadas
# pela migration mas nao chamadas aqui, porque escrever exige `notificacao`,
# `notificacao_envio` e as RPC de envio, e o que esta prova afirma e QUEM entra
# na fila e com que data. A deduplicacao foi provada rodando a varredura duas
# vezes no sandbox (1 criado / 0 negados, depois 0 criados / 1 negado).
# =============================================================================
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_RAIZ="$(cd "$AQUI/../../.." && pwd)"
MIGRATION="supabase/migrations/20260921110500_ges01b_escada_do_gestor_e_projeto.sql"
TESTES="supabase/tests/ges01b-fronteira-da-inatividade"

# --------------------------------------------------------------------------- #
# Modo 2: binarios locais                                                      #
# --------------------------------------------------------------------------- #
if [[ -n "${PG_BIN:-}" ]]; then
  PORTA="${PG_PORTA:-54329}"
  DATA="$(mktemp -d)/data"

  limpar() {
    "$PG_BIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true
    rm -rf "$(dirname "$DATA")"
  }
  trap limpar EXIT

  echo "→ initdb em $DATA"
  "$PG_BIN/initdb" -D "$DATA" -U postgres -A trust -E UTF8 --locale=C >/dev/null

  echo "→ subindo na porta $PORTA"
  "$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORTA" -l "$(dirname "$DATA")/log.txt" start >/dev/null
  for _ in $(seq 1 30); do
    "$PG_BIN/pg_isready" -p "$PORTA" -U postgres -q && break
    sleep 1
  done

  rodar() {
    echo "→ $1"
    "$PG_BIN/psql" -p "$PORTA" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f "$REPO_RAIZ/$1"
  }

  rodar "$TESTES/00-fixture.sql"
  rodar "$MIGRATION"
  rodar "$TESTES/02-fronteira.sql"

  echo "✓ prova da fronteira da GES-01B passou (binarios locais)"
  exit 0
fi

# --------------------------------------------------------------------------- #
# Modo 1: Docker                                                               #
# --------------------------------------------------------------------------- #
IMAGEM="${IMAGEM_POSTGRES:-postgres:17-alpine}"
CONTAINER="psa-prova-ges01b-$$"

command -v docker >/dev/null 2>&1 || {
  echo "docker não encontrado. Use o modo de binários locais:"
  echo "  PG_BIN=/caminho/para/pgsql/bin $0"
  exit 1
}

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
rodar "$MIGRATION"
rodar "$TESTES/02-fronteira.sql"

echo "✓ prova da fronteira da GES-01B passou (docker)"
