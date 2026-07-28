# Plan (revisado) — `gerar-apresentacao`: parar de persistir, devolver `.pptx` inline (base64)

## Objetivo
Desbloquear a geração na `main`: o front já espera `b64`, mas a edge ainda persiste e devolve `url`. Remove também dois efeitos colaterais (download 400 no Explorador e o `.pptx` marcando itens do checklist via `categoria`).

## Escopo
- **Único arquivo alterado:** `supabase/functions/gerar-apresentacao/index.ts`.
- **Sem tocar:** front (`useGerarApresentacao.ts`), hooks/versionamento de minutas, bucket `osg-apresentacoes`, tabelas `documento_gerado` / `documento_arquivo`, migrations.

## Mudanças no `index.ts`

### 1. Laço `for (const tipo of decks)` (~686–718)
- Desestruturar **apenas `{ bytes }`** de `gerarPatrimonial` / `gerarSocietaria` (hoje é `{ bytes, contagens }`; `contagens` só era consumido pelo `upsertDocumentoGerado` e sobraria como var não usada).
- Remover: `admin.storage.from(BUCKET_OUTPUT).upload(...)`, `upsertDocumentoGerado(...)`, `upsertDocumentoArquivo(...)` e `createSignedUrl(...)`.
- Empurrar em `arquivos` um `{ tipo, nome, b64 }`, com `nome = PSA_<Tipo>_<slug>.pptx`.
- Manter o `try/catch` que empurra falhas em `erros` (contrato `{ arquivos, erros }` preservado).

### 2. Tipagem
- `arquivos: Array<{ tipo: DeckTipo; nome: string; b64: string }>` (troca `url` por `b64`).

### 3. Base64 (compatível com `deno check`)
- Confirmado: `packPptx` retorna `Uint8Array`, então `bytes: Uint8Array`.
- `encode` de `std@0.168.0/encoding/base64.ts` é tipado `(data: ArrayBuffer | string) => string` e **não aceita `Uint8Array` diretamente** no typecheck.
- **Caminho adotado:** passar um `ArrayBuffer` derivado do view, cobrindo exatamente `byteOffset..byteOffset+byteLength` — chamada equivalente a `encode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))`. Isso compila sem `as any` e evita bug caso o `Uint8Array` seja um sub-view de um buffer maior.
- Import: `import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";` (mesmo pin já usado no arquivo).

### 4. Código morto — remover
- Funções `upsertDocumentoGerado` (~541–583) e `upsertDocumentoArquivo` (~585–621).
- Constantes órfãs após a remoção: `BUCKET_OUTPUT`, `SIGNED_URL_TTL`, `TEMPLATE_IDS` (~46–53).
- **`GENERATOR_VERSION`** (linha 54): usado só dentro de `upsertDocumentoGerado` → **remover**.
- Qualquer import que fique sem uso após a limpeza (ex.: helpers de signed URL).

### 5. Código morto — **NÃO** remover
- **`TEMPLATE_PATHS`** (linha 42): usado ativamente por `gerarPatrimonial` (linhas 128–129) e `gerarSocietaria` (linhas 487–488, 512–513) para baixar os templates do bucket `BUCKET_TEMPLATES`. **Manter intacto.**
- `BUCKET_TEMPLATES`, `unpackPptx`, `packPptx`, `readText`, `writeText`, `listPaths`, `slugify`, todos os builders OOXML.

### 6. Preservado
- Validação de auth + JWT, isolamento por cluster, lookup do `cliente`, pipelines `gerarPatrimonial` / `gerarSocietaria`, forma da resposta `{ arquivos, erros }`.

## Contrato final
```
{
  arquivos: [{ tipo: 'patrimonial' | 'societaria', nome: string, b64: string }],
  erros?:   [{ tipo, message }]
}
```
Idêntico ao que o `useGerarApresentacao` já consome.

## Minutas — intocadas
`documento_gerado` continua servindo o versionamento de minutas OSG Work. Este plano **não altera** tabela, hooks ou RPCs; apenas para de **escrever** a partir desta edge. Nada existente é apagado.

## Guardrail de dados
Sem `DELETE`/`UPDATE`, sem remoção de objetos no Storage, sem migration. Só remoção das chamadas de gravação no handler.

## Validação
- `deno check` / typecheck da função (compila sem `contagens`, `GENERATOR_VERSION` e as funções removidas).
- Smoke via UI: acionar "Gerar apresentação" (ambas / patrimonial / societaria) e conferir download `PSA_<Tipo>_<slug>.pptx`.
- Conferir que nenhuma linha nova aparece em `documento_arquivo` / `documento_gerado` e que o checklist do cliente não é mais tocado.

## Assumido
- `slugify` continua importado no arquivo (usado hoje na composição do caminho do Storage; passa a alimentar só o `nome`).
- Único consumidor server-side é o hook do front, já atualizado — nenhum outro caller depende de `url`.
