# Plano - Metadados GCS para Georreferenciamento OSG

## Objetivo

Adicionar metadados customizados no blob do GCS para que a ingestao de PDFs de georreferenciamento consiga preencher os campos de contexto das tabelas minimas no BigQuery, sem consultar o Supabase para resolver vinculos basicos.

O conteudo tecnico do memorial continua sendo extraido do PDF. Os metadados do blob devem carregar apenas o contexto operacional que o PDF nao informa de forma confiavel.

## Metadados do blob

Nao incluir metadado de ambiente.

Metadados obrigatorios para documentos da categoria `georreferenciamento`:

```text
id_georef
id_cliente
id_matricula
nr_matricula
adicionado_por
```

Metadados opcionais, mas uteis para rastreabilidade:

```text
id_documento_arquivo
categoria
nome_arquivo_original
```

## Mapeamento para BigQuery

Tabela `psa_osg.georef_cabecalho`:

```text
id_georef          <- blob.metadata.id_georef
id_cliente         <- blob.metadata.id_cliente
id_matricula       <- blob.metadata.id_matricula
nr_matricula       <- blob.metadata.nr_matricula
sistema_referencia <- extraido do PDF
area_ha            <- extraido do PDF
perimetro_m        <- extraido do PDF
certificacao_sigef <- extraido do PDF
data_certificacao  <- extraido do PDF
gcs_path           <- caminho do proprio blob/evento GCS
adicionado_por     <- blob.metadata.adicionado_por
timestamp_ingestao <- CURRENT_TIMESTAMP() na ingestao
```

Tabela `psa_osg.georef_detalhe`:

```text
id_vertice        <- gerado na ingestao
id_georef         <- blob.metadata.id_georef
sequencia         <- ordem da linha no PDF
cod_vertice       <- extraido do PDF
longitude_dcm     <- extraido e convertido do PDF
latitude_dcm      <- extraido e convertido do PDF
altitude_m        <- extraido do PDF
cod_vante         <- extraido do PDF
azimute_dcm       <- extraido e convertido do PDF
dist_vante_m      <- extraido do PDF
confrontacoes     <- extraido do PDF
```

## Estrategia tecnica

Gravar os metadados no proprio upload para o GCS, usando headers `x-goog-meta-*` no `PUT` assinado.

Essa abordagem faz o blob nascer no GCS com os metadados e evita depender de um `patch` posterior no endpoint `finalize`.

Os headers de metadata precisam entrar na assinatura da signed URL e precisam ser enviados exatamente pelo frontend no `PUT` direto ao GCS.

## Frontend

Arquivos principais:

```text
src/hooks/useDocumentoArquivo.ts
src/components/equipe/osg/documentos/DocUploadDialog.tsx
```

Alteracoes:

1. Para categoria `georreferenciamento`, exigir que o documento esteja vinculado a uma matricula.

2. Obter o numero da matricula selecionada para enviar junto ao pedido de assinatura.

3. Enviar para `sign-upload` os campos adicionais:

```ts
{
  cliente_id: clienteId,
  filename: file.name,
  content_type: file.type,
  categoria,
  matricula_id: vinculo.matriculaId,
  nr_matricula: numeroDaMatricula,
}
```

4. Ajustar o tipo da resposta de `sign-upload`:

```ts
{
  object_key: string;
  gcs_uri: string;
  signed_url: string;
  ambiente: string;
  id_georef: string;
  upload_headers: Record<string, string>;
}
```

5. Enviar os headers retornados pela API no `PUT` para o GCS:

```ts
await fetch(sign.signed_url, {
  method: 'PUT',
  headers: {
    ...sign.upload_headers,
    'Content-Type': file.type || 'application/octet-stream',
  },
  body: file,
});
```

6. Manter a gravacao no Supabase em `documento_arquivo` como hoje, usando `gcs_uri`, `checksum`, `mime`, `tamanho`, `categoria` e vinculos.

## Backend API

Arquivos principais:

```text
/home/bernardo/Documentos/repos/psa-backend-api/src/schemas/osg_documentos.py
/home/bernardo/Documentos/repos/psa-backend-api/src/api/v1/endpoints/osg_documentos.py
/home/bernardo/Documentos/repos/psa-backend-api/src/utils/gcs_signing.py
```

### Schemas

Adicionar campos opcionais ao `SignUploadRequest`:

```py
matricula_id: str | None = None
nr_matricula: str | None = None
```

Adicionar campos ao `SignUploadResponse`:

```py
id_georef: str | None = None
upload_headers: dict[str, str] = {}
```

`id_georef` e `upload_headers` podem ser vazios ou `None` para categorias que nao sejam `georreferenciamento`.

### Endpoint sign-upload

Quando `categoria == "georreferenciamento"`:

1. Validar que `matricula_id` foi informado e e UUID valido.

2. Validar que `nr_matricula` foi informado e nao esta vazio.

3. Gerar `id_georef` no backend.

4. Usar o usuario autenticado como `adicionado_por`. Nao aceitar esse valor do frontend.

Exemplo de montagem dos headers:

```py
id_georef = str(uuid.uuid4())

metadata_headers = {
    "x-goog-meta-id_georef": id_georef,
    "x-goog-meta-id_cliente": body.cliente_id,
    "x-goog-meta-id_matricula": body.matricula_id,
    "x-goog-meta-nr_matricula": body.nr_matricula,
    "x-goog-meta-adicionado_por": user_id,
}
```

Para outras categorias, `metadata_headers` pode ser `{}`.

### Assinatura da URL

Alterar `generate_signed_url` para aceitar headers:

```py
def generate_signed_url(
    blob: Blob,
    expiration: timedelta,
    method: str = "GET",
    headers: dict[str, str] | None = None,
) -> str:
```

Passar `headers=headers` para `blob.generate_signed_url(...)` nos dois caminhos atuais:

```text
Cloud Run/IAM signing
Local signing com service account key
```

No `sign_upload`, assinar a URL de upload assim:

```py
url = generate_signed_url(
    blob,
    UPLOAD_URL_TTL,
    method="PUT",
    headers=metadata_headers,
)
```

Retornar os headers para o frontend:

```py
return SignUploadResponse(
    object_key=object_key,
    gcs_uri=f"gs://{settings.OSG_DOCS_BUCKET_NAME}/{object_key}",
    signed_url=url,
    expires_at=datetime.now(timezone.utc) + UPLOAD_URL_TTL,
    ambiente=ambiente,
    id_georef=id_georef,
    upload_headers=metadata_headers,
)
```

## Endpoint finalize

O `finalize` pode continuar confirmando existencia, tamanho, checksum e `content_type`.

Adicionar uma validacao opcional para documentos de georreferenciamento:

```py
blob.reload()
metadata = blob.metadata or {}
```

Verificar se existem os metadados obrigatorios:

```text
id_georef
id_cliente
id_matricula
nr_matricula
adicionado_por
```

Se faltar algum metadado obrigatorio em objeto de `georreferenciamento`, retornar erro e nao permitir que o frontend grave uma linha incompleta em `documento_arquivo`.

## CORS do bucket

Depois da mudanca, testar o upload pelo navegador.

Se o preflight falhar, ajustar o CORS do bucket para permitir:

```text
Content-Type
x-goog-meta-id_georef
x-goog-meta-id_cliente
x-goog-meta-id_matricula
x-goog-meta-nr_matricula
x-goog-meta-adicionado_por
```

Alternativamente, permitir `x-goog-meta-*` se a configuracao do bucket aceitar esse padrao.

## Testes recomendados

Backend:

1. `sign-upload` de `georreferenciamento` retorna `id_georef` e `upload_headers`.

2. `sign-upload` rejeita `georreferenciamento` sem `matricula_id`.

3. `sign-upload` rejeita `georreferenciamento` sem `nr_matricula`.

4. `generate_signed_url` repassa `headers` para `blob.generate_signed_url`.

5. `finalize` rejeita objeto de `georreferenciamento` sem metadata obrigatoria, se essa validacao for implementada.

Frontend:

1. Upload de georreferenciamento envia `matricula_id` e `nr_matricula` para `sign-upload`.

2. `PUT` para GCS inclui exatamente os `upload_headers` retornados pela API.

3. Upload de outras categorias continua funcionando sem metadata customizada.

## Criterios de pronto

1. Um PDF de georreferenciamento enviado pela UI chega ao GCS com os metadados customizados obrigatorios.

2. A linha em `documento_arquivo` continua sendo criada normalmente apos o `finalize`.

3. A ingestao para BigQuery consegue preencher `id_georef`, `id_cliente`, `id_matricula`, `nr_matricula`, `gcs_path`, `adicionado_por` e `timestamp_ingestao` sem consultar o Supabase.

4. Uploads de categorias nao georreferenciamento nao quebram.
