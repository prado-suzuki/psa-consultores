#!/usr/bin/env bash
# =============================================================================
# Prova da fronteira da GES-01B (aviso de tarefa e projeto sem movimentacao)
# =============================================================================
# Nao faz parte do `bun run test`: precisa de Docker, e o repo nao tem harness
# de SQL. Rode a mao:
#
#   ./supabase/tests/ges01b-fronteira-da-inatividade/run.sh
#
# O que acontece: sobe um Postgres descartavel, cria o recorte de schema que as
# funcoes leem (00-fixture.sql, com as datas plantadas RELATIVAS a hoje), aplica
# a MIGRATION REAL do repo sem tocar nela, e roda as afirmacoes de fronteira
# (02-fronteira.sql). Qualquer afirmacao falsa aborta com exit != 0.
#
# O QUE ESTA PROVA COBRE, e e o que o "Como" do card pedia:
#   * a borda do limiar: entra no 15o dia, nao no 14o;
#   * a borda da escada: o gestor entra no 22o, nao junto com o dono;
#   * a borda do que conta como movimentacao: alteracao cadastral de ontem NAO
#     reinicia a contagem, comentario de gente reinicia, comentario de sistema
#     nao;
#   * os status que nao alertam (waiting_client, done, backlog);
#   * a borda do projeto: 29 nao, 30 sim, e projeto nao para enquanto uma tarefa
#     aberta se move;
#   * o recorte por ambiente.
#
# O QUE NAO COBRE, de proposito: a escrita do aviso. As `alertar_*` sao criadas
# pela migration mas nao chamadas aqui, porque escrever exige `notificacao`,
# `notificacao_envio` e as RPC de envio, e o que esta prova afirma e QUEM entra
# na fila e com que data. A deduplicacao foi provada rodando a varredura duas
# vezes no sandbox (1 criado / 0 negados, depois 0 criados / 1 negado).
#
# NOTA DE 21/09/2026: a maquina de desenvolvimento nao tem Docker, entao estas
# afirmacoes foram verificadas de outra forma no dia em que nasceram: o mesmo
# conjunto rodou contra as funcoes reais no sandbox, dentro de uma transacao
# encerrada com RAISE para desfazer tudo, e as dez passaram sem deixar residuo
# (conferido depois: zero linha com o prefixo da prova). Quando alguem com
# Docker rodar este script, esta e a verificacao definitiva.
# =============================================================================
set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_RAIZ="$(cd "$AQUI/../../.." && pwd)"
MIGRATION="supabase/migrations/20260921110500_ges01b_escada_do_gestor_e_projeto.sql"
TESTES="supabase/tests/ges01b-fronteira-da-inatividade"
IMAGEM="${IMAGEM_POSTGRES:-postgres:17-alpine}"
CONTAINER="psa-prova-ges01b-$$"

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

echo "✓ prova da fronteira da GES-01B passou"
