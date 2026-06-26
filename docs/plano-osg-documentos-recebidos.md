# Plano de implementação — OSG: anexar documentos recebidos (v1)

> **Para o agente implementador.** Este documento é autossuficiente. Você não precisa
> ler a vault nem conversas anteriores. Ele contém o contexto, as decisões de
> arquitetura, o código completo dos arquivos novos e instruções de edição ancoradas
> para os arquivos existentes. Os dois repositórios envolvidos são:
>
> - **Frontend:** `/home/bernardo/Documentos/repos/psa-consultores` (React + Vite + TS, Supabase, Tailwind)
> - **Backend:** `/home/bernardo/Documentos/repos/psa-backend-api` (FastAPI + Pydantic 2, Cloud Run, GCS)
>
> Ordem recomendada de execução: **Infra GCP → Backend → Migração → Types → Hook → Componente → Fiação nos modais → Testes.**

---

## 1. Objetivo e escopo

Permitir que a equipe **anexe arquivos recebidos do cliente** (PDF, imagens, Office)
de dentro das telas de cadastro do módulo OSG (bem, matrícula, pessoa), guardando o
**binário no Google Cloud Storage** e os **metadados no Supabase**.

Esta é a **fatia 1** de uma feature maior de "storage de documentos". A fatia 2
(congelar o `.docx` gerado no momento do "registrar") **não** faz parte deste plano,
mas a infra construída aqui (broker de signed URL + tabela) é compartilhada com ela —
por isso a tabela já reserva a coluna `documento_gerado_id`.

### Princípio que organiza as decisões

Documento recebido do cliente = **o arquivo é a fonte da verdade** (evidência externa,
imutável, não regenerável). Guarda-se byte-a-byte; nunca se faz hard-delete do registro.

### Divisão de responsabilidades (decisão de arquitetura)

O backend FastAPI **hoje não escreve no Supabase** — ele só lê o JWT para autenticar.
Todas as escritas de cadastro são feitas pelo frontend, direto no Supabase, sob RLS.
**Mantemos essa divisão:**

- **Cloud Run = cartório de assinatura.** Valida o JWT, gera a chave opaca do objeto e
  devolve uma **signed URL** (PUT para upload, GET para download). Não toca no Postgres.
- **Frontend = dono do metadado.** Insere/atualiza a linha em `documento_arquivo` no
  Supabase **sob RLS** (a RLS por papel é o portão de autorização de verdade), faz o
  `PUT` direto no GCS e chama o `finalize`.
- **Sem Eventarc/Cloud Function na v1.** Como o navegador faz o `PUT` e sabe quando
  terminou, ele chama `POST /finalize`, que faz um `HEAD` (`blob.reload()`) para
  confirmar que o objeto chegou e capturar `tamanho`/`checksum`. Um "faxineiro" de
  órfãos via Eventarc fica para depois.

### Modelo de segurança

A signed URL é uma capability limitada a **uma** chave aleatória (uuid opaco). O ACL
autoritativo continua sendo a **RLS** sobre `documento_arquivo` (insert/select passam
por `has_role_or_higher(..., 'team_member')`). Um objeto sem a linha correspondente fica
órfão e inacessível pela UI. O `sign-download` só assina URIs que pertencem ao bucket
OSG, e o front só conhece a `gcs_uri` porque leu a linha sob RLS.
**Limitação aceita na v1:** o backend não verifica papel nem se o usuário tem acesso
*àquele cliente* (ele não tem o mapa de papéis). Endurecer o `sign-download` por prefixo
de cliente acessível fica para fase 2.

### Fluxo (upload)

```
DocumentosTab ── escolhe arquivo ──▶ useUploadDocumento (frontend)
  1. POST /api/v1/osg/documentos/sign-upload {cliente_id, filename, content_type}
       └─▶ Cloud Run valida JWT → gera chave {ambiente}/{cliente_id}/{uuid}.{ext}
           → generate_signed_url(blob, 15min, "PUT") → {object_key, gcs_uri, signed_url, ambiente}
  2. PUT signed_url  (bytes do File, SEM Authorization) ──────▶ GCS (bucket psa-osg-documentos)
  3. POST /api/v1/osg/documentos/finalize {object_key}
       └─▶ Cloud Run faz blob.reload() → {tamanho, checksum, content_type}
  4. supabase.insert documento_arquivo {status:'ativo', gcs_uri, checksum, tamanho, categoria, vínculo} [RLS]
  5. invalida a query da lista ──▶ arquivo aparece na aba
```

### Fluxo (download)

```
Front lê a linha (RLS) → tem gcs_uri → POST /sign-download {gcs_uri}
  └─▶ Cloud Run → signed GET URL → window.open(url)  (browser baixa direto do GCS)
```

---

## 2. Pré-requisitos de infra (GCP) — fazer uma vez

> Requer `gcloud` autenticado no projeto. Use o `GCP_PROJECT_ID` do backend
> (`psa-backend-api/.env`) e o e-mail da service account que o Cloud Run usa
> (`<SA_EMAIL>`). Região do projeto: `southamerica-east1`.

```bash
PROJECT=<GCP_PROJECT_ID>
SA=<SA_EMAIL>                       # SA do serviço Cloud Run psa-backend-api
BUCKET=psa-osg-documentos

# 1) Bucket dedicado, com uniform bucket-level access e versionamento ligado
gcloud storage buckets create gs://$BUCKET \
  --project=$PROJECT --location=southamerica-east1 --uniform-bucket-level-access
gcloud storage buckets update gs://$BUCKET --versioning

# 2) A SA precisa ler/escrever objetos no bucket
gcloud storage buckets add-iam-policy-binding gs://$BUCKET \
  --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"

# 3) Assinatura keyless (signBlob): a SA precisa poder criar tokens para si mesma.
#    É o que permite generate_signed_url V4 funcionar no Cloud Run sem chave de SA.
gcloud iam service-accounts add-iam-policy-binding $SA \
  --member="serviceAccount:$SA" --role="roles/iam.serviceAccountTokenCreator"

# 4) CORS no bucket — OBRIGATÓRIO para o PUT/GET direto do navegador funcionar
cat > /tmp/osg-cors.json <<'JSON'
[{
  "origin": [
    "https://psa-consultores.lovable.app",
    "https://psaconsultores.com.br",
    "https://www.psaconsultores.com.br",
    "http://localhost:8080",
    "http://localhost:3000"
  ],
  "method": ["GET", "PUT"],
  "responseHeader": ["Content-Type"],
  "maxAgeSeconds": 3600
}]
JSON
gcloud storage buckets update gs://$BUCKET --cors-file=/tmp/osg-cors.json
```

> **Gotcha nº 1 (o mais provável de quebrar):** sem o passo 4 (CORS), o `PUT` do
> navegador para o GCS falha com erro de CORS no console e o upload nunca chega.
> Se o preflight `OPTIONS` falhar, confira que `method` inclui `PUT` e a origem bate.

---

## 3. Backend — `psa-backend-api`

### 3.1 `src/core/config.py` — nova setting

Adicione na classe `Settings`, logo após `GCS_BUCKET_NAME` (linha ~25):

```python
    OSG_DOCS_BUCKET_NAME: str = "psa-osg-documentos"
```

E registre a variável no deploy:
- `psa-backend-api/.env` e `psa-backend-api/.env.example`: `OSG_DOCS_BUCKET_NAME=psa-osg-documentos`
- No serviço Cloud Run (via GitHub Actions em `.github/`, ou no console): mesma env var nos ambientes dev e prod.

### 3.2 `src/schemas/osg_documentos.py` — novo arquivo

```python
# stdlib
from datetime import datetime
from typing import Optional

# third-party
from pydantic import BaseModel, Field


class SignUploadRequest(BaseModel):
    cliente_id: str = Field(..., description="UUID do cliente dono do documento")
    filename: str = Field(..., description="Nome original do arquivo (usado p/ extrair a extensão)")
    content_type: Optional[str] = Field(None, description="MIME informado pelo navegador (apenas log)")


class SignUploadResponse(BaseModel):
    object_key: str
    gcs_uri: str
    signed_url: str
    expires_at: datetime
    ambiente: str


class FinalizeRequest(BaseModel):
    object_key: str


class FinalizeResponse(BaseModel):
    exists: bool
    tamanho: int
    checksum: str
    content_type: Optional[str] = None


class SignDownloadRequest(BaseModel):
    gcs_uri: str


class SignDownloadResponse(BaseModel):
    signed_url: str
    expires_at: datetime
```

### 3.3 `src/api/v1/endpoints/osg_documentos.py` — novo arquivo

> Reusa o que já existe: `get_current_user` (`src/core/auth.py`), `get_gcs_client`
> (`src/core/dependencies.py`), `generate_signed_url` (`src/utils/gcs_signing.py`,
> já trata signBlob keyless no Cloud Run) e as exceções globais (`GCSError`→503,
> `FileNotFoundError`→404, definidas em `src/exceptions.py` e mapeadas em `src/main.py`).
> **Não** vincula `Content-Type` na assinatura — assim o navegador pode mandar o
> Content-Type do arquivo sem risco de divergência de assinatura.

```python
# stdlib
import re
import uuid
from datetime import datetime, timedelta, timezone

# third-party
from fastapi import APIRouter, Depends, HTTPException, Request
from google.cloud import storage
from slowapi import Limiter
from slowapi.util import get_remote_address

# local
from src.core.auth import get_current_user
from src.core.config import settings
from src.core.dependencies import get_gcs_client
from src.core.logging import logger
from src.exceptions import FileNotFoundError, GCSError
from src.schemas.osg_documentos import (
    FinalizeRequest,
    FinalizeResponse,
    SignDownloadRequest,
    SignDownloadResponse,
    SignUploadRequest,
    SignUploadResponse,
)
from src.utils.gcs_signing import generate_signed_url

router = APIRouter(prefix="/osg/documentos", tags=["osg-documentos"])
limiter = Limiter(key_func=get_remote_address)

ALLOWED_EXTS = {"pdf", "jpg", "jpeg", "png", "doc", "docx", "xls", "xlsx"}
UPLOAD_URL_TTL = timedelta(minutes=15)
DOWNLOAD_URL_TTL = timedelta(minutes=15)
# {ambiente}/{cliente_uuid}/{objeto_uuid}.{ext}
_KEY_RE = re.compile(r"^(prod|dev)/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.[a-z0-9]+$")


def _ambiente() -> str:
    """Deriva o ambiente do APP_ENV (alinha com a coluna `ambiente` do Supabase: prod|dev)."""
    return "prod" if settings.APP_ENV == "production" else "dev"


def _osg_bucket(client: storage.Client) -> storage.Bucket:
    return client.bucket(settings.OSG_DOCS_BUCKET_NAME)


@router.post("/sign-upload", response_model=SignUploadResponse)
@limiter.limit("60/minute")
async def sign_upload(
    request: Request,
    body: SignUploadRequest,
    current_user: dict = Depends(get_current_user),
    gcs_client: storage.Client = Depends(get_gcs_client),
) -> SignUploadResponse:
    """Gera uma signed URL de PUT e a chave opaca do objeto. Não grava nada no banco."""
    user_id = current_user.get("id")

    ext = body.filename.rsplit(".", 1)[-1].lower() if "." in body.filename else ""
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_FILE_TYPE", "error_message": f"Extensão '{ext}' não permitida."},
        )
    try:
        uuid.UUID(body.cliente_id)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_CLIENTE_ID", "error_message": "cliente_id inválido."},
        )

    ambiente = _ambiente()
    object_key = f"{ambiente}/{body.cliente_id}/{uuid.uuid4()}.{ext}"
    blob = _osg_bucket(gcs_client).blob(object_key)

    try:
        url = generate_signed_url(blob, UPLOAD_URL_TTL, method="PUT")
    except Exception as e:  # noqa: BLE001
        logger.error("osg_sign_upload_failed", user_id=user_id, error=str(e))
        raise GCSError(f"Failed to sign upload URL: {e}")

    logger.info("osg_sign_upload", user_id=user_id, cliente_id=body.cliente_id, object_key=object_key)
    return SignUploadResponse(
        object_key=object_key,
        gcs_uri=f"gs://{settings.OSG_DOCS_BUCKET_NAME}/{object_key}",
        signed_url=url,
        expires_at=datetime.now(timezone.utc) + UPLOAD_URL_TTL,
        ambiente=ambiente,
    )


@router.post("/finalize", response_model=FinalizeResponse)
@limiter.limit("60/minute")
async def finalize(
    request: Request,
    body: FinalizeRequest,
    current_user: dict = Depends(get_current_user),
    gcs_client: storage.Client = Depends(get_gcs_client),
) -> FinalizeResponse:
    """Confirma que o objeto chegou ao GCS e devolve tamanho + checksum (crc32c)."""
    user_id = current_user.get("id")

    if not _KEY_RE.match(body.object_key):
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_OBJECT_KEY", "error_message": "object_key fora do padrão esperado."},
        )

    blob = _osg_bucket(gcs_client).blob(body.object_key)
    try:
        if not blob.exists():
            raise FileNotFoundError(f"Objeto não encontrado: {body.object_key}")
        blob.reload()
    except FileNotFoundError:
        raise
    except Exception as e:  # noqa: BLE001
        logger.error("osg_finalize_failed", user_id=user_id, error=str(e))
        raise GCSError(f"Failed to stat blob: {e}")

    logger.info("osg_finalize", user_id=user_id, object_key=body.object_key, size=blob.size)
    return FinalizeResponse(
        exists=True,
        tamanho=blob.size or 0,
        checksum=blob.crc32c or "",
        content_type=blob.content_type,
    )


@router.post("/sign-download", response_model=SignDownloadResponse)
@limiter.limit("120/minute")
async def sign_download(
    request: Request,
    body: SignDownloadRequest,
    current_user: dict = Depends(get_current_user),
    gcs_client: storage.Client = Depends(get_gcs_client),
) -> SignDownloadResponse:
    """Gera signed URL de GET para uma gcs_uri que pertença ao bucket OSG."""
    user_id = current_user.get("id")

    prefix = f"gs://{settings.OSG_DOCS_BUCKET_NAME}/"
    if not body.gcs_uri.startswith(prefix):
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_GCS_URI", "error_message": "gcs_uri fora do bucket OSG."},
        )

    object_key = body.gcs_uri[len(prefix):]
    blob = _osg_bucket(gcs_client).blob(object_key)
    try:
        url = generate_signed_url(blob, DOWNLOAD_URL_TTL, method="GET")
    except Exception as e:  # noqa: BLE001
        logger.error("osg_sign_download_failed", user_id=user_id, error=str(e))
        raise GCSError(f"Failed to sign download URL: {e}")

    logger.info("osg_sign_download", user_id=user_id, object_key=object_key)
    return SignDownloadResponse(
        signed_url=url,
        expires_at=datetime.now(timezone.utc) + DOWNLOAD_URL_TTL,
    )
```

### 3.4 `src/main.py` — registrar o router

Na linha de import dos endpoints (linha ~18), adicione `osg_documentos`:

```python
from src.api.v1.endpoints import queries, downloads, efd, ncm_classificacao, ibs_cbs_classificacao, calculadora_ibs_cbs, perdcomp_sync, cadastros_sync, selic, balancete, pis_cofins, saida_icms, osg_documentos
```

E no bloco de `include_router` (linhas ~199-210), adicione:

```python
app.include_router(osg_documentos.router, prefix="/api/v1")
```

> CORS do FastAPI (`src/main.py`) já permite `PUT/POST` e expõe `Content-Disposition` —
> nada a mudar lá. O CORS que importa para o upload é o **do bucket** (seção 2).

### 3.5 Teste de backend — `tests/unit/test_osg_documentos.py` (novo)

Espelhe o estilo dos testes existentes em `tests/unit/`. Mínimo aceitável:

```python
# stdlib
from unittest.mock import MagicMock, patch

# third-party
import pytest
from fastapi.testclient import TestClient

# local
from src.main import app
from src.core.auth import get_current_user

client = TestClient(app)


@pytest.fixture(autouse=True)
def _override_auth():
    app.dependency_overrides[get_current_user] = lambda: {"id": "user-1", "email": "x@y.z"}
    yield
    app.dependency_overrides.clear()


@patch("src.api.v1.endpoints.osg_documentos.generate_signed_url", return_value="https://signed.example/put")
@patch("src.api.v1.endpoints.osg_documentos.get_gcs_client")
def test_sign_upload_ok(mock_client, _mock_sign):
    mock_client.return_value.bucket.return_value.blob.return_value = MagicMock()
    app.dependency_overrides[__import__("src.core.dependencies", fromlist=["get_gcs_client"]).get_gcs_client] = lambda: mock_client.return_value
    r = client.post("/api/v1/osg/documentos/sign-upload", json={
        "cliente_id": "11111111-1111-1111-1111-111111111111", "filename": "matricula.pdf",
    })
    app.dependency_overrides.pop(__import__("src.core.dependencies", fromlist=["get_gcs_client"]).get_gcs_client, None)
    assert r.status_code == 200
    body = r.json()
    assert body["object_key"].endswith(".pdf")
    assert body["gcs_uri"].startswith("gs://")


def test_sign_upload_rejects_bad_extension():
    r = client.post("/api/v1/osg/documentos/sign-upload", json={
        "cliente_id": "11111111-1111-1111-1111-111111111111", "filename": "virus.exe",
    })
    assert r.status_code == 400
    assert r.json()["detail"]["error_code"] == "INVALID_FILE_TYPE"
```

> Rode: `cd psa-backend-api && pytest tests/unit/test_osg_documentos.py -v` e
> `ruff check src/ tests/`. Ajuste o mock do client se necessário — o ponto é cobrir
> os caminhos feliz/erro; não persiga 100% se o mock de GCS der trabalho.

---

## 4. Banco — migração Supabase (`psa-consultores`)

Crie `supabase/migrations/<TIMESTAMP>_osg_documento_arquivo.sql`, onde `<TIMESTAMP>`
deve ser **maior que a última migração existente** (verifique com
`ls supabase/migrations | tail -1`; hoje a mais recente é `20260621100000_*`, então use
algo como `20260622120000`).

> Decisões já confirmadas no schema deste projeto:
> - RLS usa `public.has_role_or_higher(auth.uid(), 'team_member'::app_role)` para
>   select/insert/update e `public.has_role(auth.uid(), 'admin'::app_role)` para delete
>   (espelha as policies de `public.bem` e `public.matricula`).
> - `excluido` e `ambiente` são convenções existentes no schema.
> - **Nome `documento_arquivo`** (não `documento`): já existem `documentos_processo`
>   (catálogo de tipos do fluxo BPM) e `documento_gerado` (gerador). Esta tabela guarda
>   **arquivos físicos**.
> - Soft-delete (`excluido=true`), nunca hard-delete: o arquivo recebido é evidência.

```sql
-- OSG · armazenamento de documentos recebidos do cliente (binário no GCS, metadado aqui).
BEGIN;

-- enums (guards porque CREATE TYPE não tem IF NOT EXISTS)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_doc_fonte') then
    create type public.osg_doc_fonte as enum ('cliente', 'psa', 'arquivar');
  end if;
  if not exists (select 1 from pg_type where typname = 'osg_doc_categoria') then
    create type public.osg_doc_categoria as enum (
      'bens_direitos', 'cadastros_fiscais', 'declaracao_ir', 'agrarios',
      'pessoais', 'societarios', 'sucessorios', 'outros'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'osg_doc_status') then
    create type public.osg_doc_status as enum ('pendente', 'ativo');
  end if;
end $$;

create table if not exists public.documento_arquivo (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.cliente(id) on delete restrict,
  fonte               public.osg_doc_fonte     not null default 'cliente',
  categoria           public.osg_doc_categoria not null,
  -- vínculos polimórficos (nullable); v1 popula bem/matricula/pessoa
  bem_id              uuid references public.bem(id)        on delete set null,
  matricula_id        uuid references public.matricula(id)  on delete set null,
  pessoa_id           uuid references public.pessoa(id)     on delete set null,
  contribuinte_id     uuid,  -- reservado
  org_projects_id     uuid,  -- reservado
  documento_gerado_id uuid references public.documento_gerado(id) on delete set null,  -- reservado p/ fatia 2
  -- binário no GCS
  nome_original       text not null,       -- nome legível p/ o usuário; a chave GCS é opaca
  gcs_uri             text,                -- preenchido após o finalize
  checksum            text,                -- crc32c vindo do GCS
  mime                text,
  tamanho             bigint,
  status              public.osg_doc_status not null default 'pendente',
  -- convenções do schema
  excluido            boolean not null default false,
  ambiente            text not null default 'dev',
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  updated_at          timestamptz not null default now(),
  updated_by          uuid default auth.uid()
);

create index if not exists idx_doc_arq_cliente   on public.documento_arquivo (cliente_id)   where excluido = false;
create index if not exists idx_doc_arq_bem        on public.documento_arquivo (bem_id)       where excluido = false;
create index if not exists idx_doc_arq_matricula  on public.documento_arquivo (matricula_id) where excluido = false;
create index if not exists idx_doc_arq_pessoa     on public.documento_arquivo (pessoa_id)    where excluido = false;

-- updated_at automático
create or replace function public.documento_arquivo_touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_doc_arq_updated_at on public.documento_arquivo;
create trigger trg_doc_arq_updated_at
  before update on public.documento_arquivo
  for each row execute function public.documento_arquivo_touch_updated_at();

alter table public.documento_arquivo enable row level security;

drop policy if exists "team_member+ can view documento_arquivo" on public.documento_arquivo;
create policy "team_member+ can view documento_arquivo" on public.documento_arquivo
  for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can insert documento_arquivo" on public.documento_arquivo;
create policy "team_member+ can insert documento_arquivo" on public.documento_arquivo
  for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "team_member+ can update documento_arquivo" on public.documento_arquivo;
create policy "team_member+ can update documento_arquivo" on public.documento_arquivo
  for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

drop policy if exists "admin can delete documento_arquivo" on public.documento_arquivo;
create policy "admin can delete documento_arquivo" on public.documento_arquivo
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

COMMIT;
```

Aplicar: a migração entra no pipeline do Supabase/Lovable ao ser commitada; localmente,
`supabase db push` (ou o fluxo de migração do projeto).

---

## 5. Types do Supabase — `src/integrations/supabase/types.ts`

`types.ts` é **gerado automaticamente**. O melhor caminho é **regenerar** após aplicar a
migração (o Lovable regenera ao aplicar; ou
`npx supabase gen types typescript --project-id <PROJECT_ID> > src/integrations/supabase/types.ts`).

Se for editar à mão, insira o bloco abaixo dentro de `Database['public']['Tables']`
(em ordem alfabética, perto de `documento_gerado`):

```ts
      documento_arquivo: {
        Row: {
          id: string
          cliente_id: string
          fonte: Database["public"]["Enums"]["osg_doc_fonte"]
          categoria: Database["public"]["Enums"]["osg_doc_categoria"]
          bem_id: string | null
          matricula_id: string | null
          pessoa_id: string | null
          contribuinte_id: string | null
          org_projects_id: string | null
          documento_gerado_id: string | null
          nome_original: string
          gcs_uri: string | null
          checksum: string | null
          mime: string | null
          tamanho: number | null
          status: Database["public"]["Enums"]["osg_doc_status"]
          excluido: boolean
          ambiente: string
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          cliente_id: string
          fonte?: Database["public"]["Enums"]["osg_doc_fonte"]
          categoria: Database["public"]["Enums"]["osg_doc_categoria"]
          bem_id?: string | null
          matricula_id?: string | null
          pessoa_id?: string | null
          contribuinte_id?: string | null
          org_projects_id?: string | null
          documento_gerado_id?: string | null
          nome_original: string
          gcs_uri?: string | null
          checksum?: string | null
          mime?: string | null
          tamanho?: number | null
          status?: Database["public"]["Enums"]["osg_doc_status"]
          excluido?: boolean
          ambiente?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          cliente_id?: string
          fonte?: Database["public"]["Enums"]["osg_doc_fonte"]
          categoria?: Database["public"]["Enums"]["osg_doc_categoria"]
          bem_id?: string | null
          matricula_id?: string | null
          pessoa_id?: string | null
          contribuinte_id?: string | null
          org_projects_id?: string | null
          documento_gerado_id?: string | null
          nome_original?: string
          gcs_uri?: string | null
          checksum?: string | null
          mime?: string | null
          tamanho?: number | null
          status?: Database["public"]["Enums"]["osg_doc_status"]
          excluido?: boolean
          ambiente?: string
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
```

E em `Database['public']['Enums']` adicione:

```ts
      osg_doc_fonte: "cliente" | "psa" | "arquivar"
      osg_doc_categoria: "bens_direitos" | "cadastros_fiscais" | "declaracao_ir" | "agrarios" | "pessoais" | "societarios" | "sucessorios" | "outros"
      osg_doc_status: "pendente" | "ativo"
```

---

## 6. Frontend — hook `src/hooks/useDocumentoArquivo.ts` (novo)

> Reusa `useApiAuth().fetchWithAuth` (anexa o JWT do Supabase e trata refresh/retry),
> `getApiUrl`/`currentAmbiente` de `@/config/api`, `supabase` client e `toast`.
> **Atenção:** o `PUT` ao GCS NÃO passa por `fetchWithAuth` — usar `fetch` puro, sem
> header `Authorization` (a assinatura É a credencial; mandar o JWT quebra o PUT).

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useApiAuth } from '@/hooks/useApiAuth';
import { getApiUrl, currentAmbiente } from '@/config/api';
import type { Database } from '@/integrations/supabase/types';

export type DocumentoArquivoRow = Database['public']['Tables']['documento_arquivo']['Row'];
export type DocCategoria = Database['public']['Enums']['osg_doc_categoria'];

export interface VinculoDoc {
  bemId?: string | null;
  matriculaId?: string | null;
  pessoaId?: string | null;
}

const LIST_KEY = 'documento-arquivo';
const listKey = (clienteId: string, v: VinculoDoc) =>
  [LIST_KEY, clienteId, v.bemId ?? '∅', v.matriculaId ?? '∅', v.pessoaId ?? '∅'];

/** Lista os documentos ativos de um vínculo (bem | matrícula | pessoa) de um cliente. */
export function useDocumentosByVinculo(clienteId: string | null, v: VinculoDoc) {
  return useQuery({
    queryKey: clienteId ? listKey(clienteId, v) : [LIST_KEY, '∅'],
    enabled: !!clienteId && !!(v.bemId || v.matriculaId || v.pessoaId),
    queryFn: async (): Promise<DocumentoArquivoRow[]> => {
      let q = supabase
        .from('documento_arquivo')
        .select('*')
        .eq('cliente_id', clienteId!)
        .eq('excluido', false)
        .eq('status', 'ativo');
      if (v.bemId) q = q.eq('bem_id', v.bemId);
      if (v.matriculaId) q = q.eq('matricula_id', v.matriculaId);
      if (v.pessoaId) q = q.eq('pessoa_id', v.pessoaId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentoArquivoRow[];
    },
  });
}

interface UploadArgs {
  clienteId: string;
  vinculo: VinculoDoc;
  categoria: DocCategoria;
  file: File;
}

/** Orquestra sign-upload → PUT direto no GCS → finalize → insert da linha no Supabase. */
export function useUploadDocumento() {
  const { fetchWithAuth } = useApiAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ clienteId, vinculo, categoria, file }: UploadArgs): Promise<DocumentoArquivoRow> => {
      // 1) signed PUT URL
      const signRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-upload'), {
        method: 'POST',
        body: JSON.stringify({ cliente_id: clienteId, filename: file.name, content_type: file.type }),
      });
      if (!signRes.ok) throw new Error('Falha ao solicitar URL de upload');
      const sign = (await signRes.json()) as {
        object_key: string; gcs_uri: string; signed_url: string; ambiente: string;
      };

      // 2) PUT direto no GCS (fetch puro, SEM Authorization)
      const put = await fetch(sign.signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) throw new Error('Falha ao enviar o arquivo para o storage');

      // 3) finalize (confirma + captura tamanho/checksum)
      const finRes = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/finalize'), {
        method: 'POST',
        body: JSON.stringify({ object_key: sign.object_key }),
      });
      if (!finRes.ok) throw new Error('Falha ao finalizar o upload');
      const fin = (await finRes.json()) as { tamanho: number; checksum: string; content_type: string | null };

      // 4) grava a linha (RLS)
      const { data, error } = await supabase
        .from('documento_arquivo')
        .insert({
          cliente_id: clienteId,
          fonte: 'cliente',
          categoria,
          bem_id: vinculo.bemId ?? null,
          matricula_id: vinculo.matriculaId ?? null,
          pessoa_id: vinculo.pessoaId ?? null,
          nome_original: file.name,
          gcs_uri: sign.gcs_uri,
          checksum: fin.checksum,
          mime: fin.content_type ?? file.type ?? null,
          tamanho: fin.tamanho,
          status: 'ativo',
          ambiente: sign.ambiente ?? currentAmbiente,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as DocumentoArquivoRow;
    },
    onSuccess: (_row, vars) => {
      qc.invalidateQueries({ queryKey: listKey(vars.clienteId, vars.vinculo) });
      toast({ title: 'Documento anexado' });
    },
    onError: (e: unknown) => {
      toast({ title: 'Erro ao anexar documento', description: (e as Error).message, variant: 'destructive' });
    },
  });
}

/** Soft-delete: marca excluido=true (o blob permanece no bucket versionado). */
export function useExcluirDocumento(clienteId: string, vinculo: VinculoDoc) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documento_arquivo').update({ excluido: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey(clienteId, vinculo) });
      toast({ title: 'Documento removido' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao remover', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Pede a signed GET URL e abre o download em nova aba. */
export function useBaixarDocumento() {
  const { fetchWithAuth } = useApiAuth();
  return useMutation({
    mutationFn: async (row: DocumentoArquivoRow) => {
      if (!row.gcs_uri) throw new Error('Documento sem arquivo associado');
      const res = await fetchWithAuth(getApiUrl('/api/v1/osg/documentos/sign-download'), {
        method: 'POST',
        body: JSON.stringify({ gcs_uri: row.gcs_uri }),
      });
      if (!res.ok) throw new Error('Falha ao gerar link de download');
      const { signed_url } = (await res.json()) as { signed_url: string };
      window.open(signed_url, '_blank', 'noopener');
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao baixar', description: (e as Error).message, variant: 'destructive' }),
  });
}
```

---

## 7. Frontend — componente `src/components/equipe/osg/documentos/DocumentosTab.tsx` (novo)

> Reutilizável pelos 3 modais. Usa `fieldCls` de `@/components/equipe/osg/formKit` e o
> `AlertDialog` (mesmo padrão de confirmação usado nos modais). Limite de 50 MB e
> allowlist de extensões alinhados com o backend.

```tsx
import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { fieldCls } from '@/components/equipe/osg/formKit';
import {
  useBaixarDocumento,
  useDocumentosByVinculo,
  useExcluirDocumento,
  useUploadDocumento,
  type DocCategoria,
  type DocumentoArquivoRow,
  type VinculoDoc,
} from '@/hooks/useDocumentoArquivo';

const CATEGORIAS: { value: DocCategoria; label: string }[] = [
  { value: 'bens_direitos', label: 'Bens e Direitos' },
  { value: 'cadastros_fiscais', label: 'Cadastros Fiscais' },
  { value: 'declaracao_ir', label: 'Declaração IR' },
  { value: 'agrarios', label: 'Agrários' },
  { value: 'pessoais', label: 'Pessoais' },
  { value: 'societarios', label: 'Societários' },
  { value: 'sucessorios', label: 'Sucessórios' },
  { value: 'outros', label: 'Outros' },
];

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx';

function formatBytes(n: number | null): string {
  if (!n) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

interface Props {
  clienteId: string;
  vinculo: VinculoDoc;
  categoriaPadrao: DocCategoria;
}

export function DocumentosTab({ clienteId, vinculo, categoriaPadrao }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [categoria, setCategoria] = useState<DocCategoria>(categoriaPadrao);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

  const { data: docs = [], isLoading } = useDocumentosByVinculo(clienteId, vinculo);
  const upload = useUploadDocumento();
  const excluir = useExcluirDocumento(clienteId, vinculo);
  const baixar = useBaixarDocumento();

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Limite de 50 MB.', variant: 'destructive' });
      return;
    }
    upload.mutate({ clienteId, vinculo, categoria, file });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Categoria</span>
          <select
            className={fieldCls}
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as DocCategoria)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Anexar arquivo
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.nome_original}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORIAS.find((c) => c.value === d.categoria)?.label} · {formatBytes(d.tamanho)} ·{' '}
                  {new Date(d.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => baixar.mutate(d)} title="Baixar">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setAExcluir(d)} title="Remover">
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" deixará de aparecer na lista. O arquivo permanece arquivado no storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aExcluir) excluir.mutate(aExcluir.id);
                setAExcluir(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

> Confirme o caminho de import do `AlertDialog` (provavelmente `@/components/ui/alert-dialog`,
> o mesmo usado pelos modais OSG) e do `Button` (`@/components/ui/button`).

---

## 8. Frontend — fiação nos 3 modais

Padrão comum: a aba "Documentos" só faz sentido **depois** que a entidade existe (não dá
para anexar arquivo a um bem ainda não salvo). Por isso o `TabsTrigger` recebe
`disabled={!isEdit}` — exatamente como as abas "impedimentos"/"administracao" já fazem.

> Em cada modal, calcule (ou reaproveite) `const isEdit = !!<entidade>?.id;` e use o `id`
> da entidade no vínculo. Confirme os nomes exatos das props ao editar.

### 8.1 `src/components/equipe/osg/diagnostico-patrimonial/BemModal.tsx`

- Import (junto aos demais, topo do arquivo):
  ```tsx
  import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
  ```
- **Atenção:** hoje `const mostrarTabsList = temTitularidade;` (linha ~189). A lista de
  abas só aparece quando há titularidade. Para a aba "Documentos" ser alcançável ao
  editar, troque por:
  ```tsx
  const isEdit = !!bem?.id;
  const mostrarTabsList = temTitularidade || isEdit;
  ```
- Dentro do `<TabsList>` (linhas ~319-337), após o `TabsTrigger value="titulares"`, adicione:
  ```tsx
  <TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>
    Documentos
  </TabsTrigger>
  ```
- Após o `<TabsContent value="titulares">` (fecha por volta da linha ~730), adicione:
  ```tsx
  <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">
    {isEdit && bem?.id && (
      <DocumentosTab clienteId={clienteId} vinculo={{ bemId: bem.id }} categoriaPadrao="bens_direitos" />
    )}
  </TabsContent>
  ```

### 8.2 `src/components/equipe/osg/diagnostico-patrimonial/MatriculaModal.tsx`

A `<TabsList>` aqui já aparece sempre (linha ~408). `isEdit` já existe no arquivo
(a aba "impedimentos" usa `disabled={!isEdit}`).

- Import:
  ```tsx
  import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
  ```
- No `<TabsList>`, após `TabsTrigger value="impedimentos"`:
  ```tsx
  <TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>
    Documentos
  </TabsTrigger>
  ```
- Após o `<TabsContent value="impedimentos">` (fecha ~linha 884), adicione (confirme os
  nomes das props/ids da matrícula e do bem-pai no componente):
  ```tsx
  <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">
    {isEdit && matriculaId && (
      <DocumentosTab
        clienteId={clienteId}
        vinculo={{ matriculaId, bemId: bemId ?? null }}
        categoriaPadrao="agrarios"
      />
    )}
  </TabsContent>
  ```

### 8.3 `src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx`

Hoje `const mostrarTabsList = !isPF;` (linha ~294) — só PJ vê abas. Documentos deve valer
para PF e PJ.

- Import:
  ```tsx
  import { DocumentosTab } from '@/components/equipe/osg/documentos/DocumentosTab';
  ```
- Troque o gate da lista de abas:
  ```tsx
  const mostrarTabsList = !isPF || isEdit;   // isEdit = !!pessoa?.id (confirme a prop)
  ```
- No `<TabsList>` (linhas ~470-479), após o `TabsTrigger value="administracao"`:
  ```tsx
  <TabsTrigger value="documentos" disabled={!isEdit} className={osgTabTriggerCls}>
    Documentos
  </TabsTrigger>
  ```
- Após o `<TabsContent value="administracao">` (fecha ~linha 926):
  ```tsx
  <TabsContent value="documentos" className="mt-0 focus-visible:ring-0">
    {isEdit && pessoa?.id && (
      <DocumentosTab clienteId={clienteId} vinculo={{ pessoaId: pessoa.id }} categoriaPadrao="pessoais" />
    )}
  </TabsContent>
  ```

---

## 9. Testes e validação manual

### Backend
```bash
cd /home/bernardo/Documentos/repos/psa-backend-api
ruff check src/ tests/
pytest tests/unit/test_osg_documentos.py -v
# Dev local:
python -m uvicorn src.main:app --reload   # checar /docs → endpoints /api/v1/osg/documentos/*
```

### Frontend
```bash
cd /home/bernardo/Documentos/repos/psa-consultores
npm run lint       # ou o linter do projeto
npx tsc --noEmit   # garante que os tipos novos compilam
npm run dev        # sobe o front; aponta para a API local (localhost) ou dev (preview)
```

### Teste end-to-end (manual)
1. Aplicar a migração no Supabase de dev e regenerar `types.ts`.
2. Subir backend local com `OSG_DOCS_BUCKET_NAME` apontando para um bucket de dev com
   CORS configurado (seção 2).
3. No front (logado como usuário `team_member+`): abrir um **bem já salvo** → aba
   "Documentos" → anexar um PDF. Confirmar: toast de sucesso, item na lista, linha em
   `documento_arquivo` (status `ativo`, `gcs_uri`/`checksum`/`tamanho` preenchidos),
   objeto no bucket com a chave `dev/<cliente>/<uuid>.pdf`.
4. Baixar o arquivo (abre em nova aba). Remover → some da lista; a linha fica com
   `excluido=true` e o objeto permanece no bucket.
5. Repetir em matrícula e pessoa.

---

## 10. Critérios de aceitação

- [ ] Bucket `psa-osg-documentos` existe, com versionamento e CORS; a SA do Cloud Run
      assina URLs (signBlob) e tem `storage.objectAdmin`.
- [ ] `GET /api/v1/osg/documentos/*` aparece no `/docs` do backend; `sign-upload` rejeita
      extensão fora da allowlist (400) e `cliente_id` inválido (400).
- [ ] Tabela `documento_arquivo` criada com RLS espelhando `bem`/`matricula`; `types.ts`
      atualizado e o projeto compila (`tsc --noEmit`).
- [ ] Aba "Documentos" aparece (habilitada só ao editar) em BemModal, MatriculaModal e
      PessoaModal, com o vínculo e a categoria padrão corretos.
- [ ] Upload → arquivo no GCS + linha `ativo` no Supabase; download abre o arquivo;
      remover faz soft-delete.
- [ ] O `PUT` ao GCS é feito sem header `Authorization` (apenas a signed URL).

---

## 11. Fora de escopo (v1) — não implementar

- Congelar o `.docx` gerado no "registrar" (fatia 2 — reusa esta infra + a coluna
  `documento_gerado_id`).
- Eventarc/Cloud Function de finalização e faxineiro de objetos órfãos (`pendente`).
- Geração de PDF junto do `.docx`.
- Árvore virtual espelhando o Google Drive (v1 = lista plana por vínculo).
- Balde de escape (anexo sem vínculo, embaixo do cliente) — todo anexo nasce de uma
  entidade. Requer uma tela "Documentos do Cliente" central, que não existe ainda.
- Migração dos ~150 clientes do Drive.
- Endurecer `sign-download` por prefixo de cliente acessível ao usuário.

## 12. Riscos / gotchas

1. **CORS do bucket** (seção 2) é o ponto mais provável de falha do upload. Sem ele, o
   `PUT` do navegador falha por CORS.
2. **Não vincular `Content-Type` na assinatura** (já seguido no código): se assinar com
   content-type, o navegador precisa mandar exatamente o mesmo, e qualquer divergência
   gera 403 do GCS.
3. **`PUT` sem `Authorization`**: usar `fetch` puro, não `fetchWithAuth` (que injeta o JWT).
4. **`types.ts` é gerado**: prefira regenerar a editar à mão; se editar, mantenha os
   três blocos (Row/Insert/Update) e os enums coerentes com a migração.
5. **Gate `isEdit` nos modais**: a aba só funciona com a entidade já salva (precisa do
   `id` para o vínculo). Confirme os nomes reais das props (`bem`, `pessoa`, ids da
   matrícula/bem-pai) ao aplicar as edições da seção 8.
6. **Ambiente alinhado**: o backend deriva `ambiente` do `APP_ENV` e o devolve; o front
   grava esse valor na linha — assim o prefixo da chave GCS e a coluna `ambiente` batem.
```