# Geração de documentos — OSG Work (briefing)

Resumo de como a geração de contratos funciona **hoje no código**, escrito para ser colado como
contexto num prompt de IA (ou lido por quem chega agora). O desenho de longo prazo está em
[`arquitetura-sintese.md`](./arquitetura-sintese.md); aqui é o estado implementado.

## Ideia central

Contrato não é arquivo Word editado à mão: é um TEMPLATE composto de BLOCOS versionados,
preenchido com dados que vêm do CADASTRO do cliente (pessoa, bem, matrícula, quadro societário,
administração, integralizações). O motor (`src/lib/templates/`) é agnóstico de domínio: conhece
blocos, flags e placeholders — nunca "sócio" ou "contrato social". Cada documento é só um
`Template = { blocos: Bloco[] }`.

## Três telas, nesta ordem (rotas `/equipe/osg/work/...`)

1. **Biblioteca de Modelos** — autoria dos blocos (cláusulas) com versionamento
   (`tmpl_bloco` + `tmpl_bloco_versao`), editor com autocomplete de `{{ }}`.
2. **Montagem de Documentos** — monta o modelo: ordem dos blocos, obrigatório, flags
   (`tmpl_documento` + `tmpl_documento_bloco`).
3. **Gerar Documento** (`GerarDocumento.tsx` → `useGerarDocumentoController.ts`) — escolhe modelo
   + empresa (o cliente vem da barra global da área OSG), liga cada binding a um registro, vê a
   prévia em "folha", valida a versão e baixa o .docx.

`/work/documentos` é checklist/upload de documentos do cliente — não é geração.

## Sintaxe do template

- `{{ binding.campo }}` — caminho pontilhado, resolvido do escopo mais interno para fora.
  Placeholder não resolvido **lança erro** (falha cedo: nada de texto incompleto no cartório).
- `{{#nome}}…{{/nome}}` — a semântica vem do VALOR resolvido: array = repetição (com `sep=` /
  `fim=` para prosa "A; B; e C"), booleano/string = condicional (`{{#sePF}}`).
- Bloco com `repete_colecao` = uma instância por item da coleção (um parágrafo por sócio).
- `tipo` do bloco (`capitulo | clausula | paragrafo | livre`) governa a **numeração automática**
  ("CLÁUSULA QUINTA:", "Parágrafo Único:"); `ancora` publica em `{{ refs.<ancora> }}` e o
  repetidor carimba `{{ ref }}` no item — referência cruzada sempre coerente com a posição real.

## Pipeline (`gerarBlocos`, `src/lib/templates/index.ts`)

`comporBlocos` (filtra por flags ativas) → `expandirRepetidores` → `refsNumeracao` →
`numerarBlocos` → `renderSegmentos` (placeholders + seções, com proveniência por segmento) →
adapters de saída: `unirBlocos` (texto/prévia) e `docx.ts` (Word A4, Arial Narrow 12 justificado,
pacote `docx` por import dinâmico).

## De onde vêm os dados

- **binding = papel** (`proprietario`, `socio`, `imovel`, `sociedade`…) → TIPO de entidade
  (`pessoa | sociedade | bem | matricula | cartorio | vertice`), em `binding.ts`. Os bindings são
  DETECTADOS do conteúdo dos blocos compostos: bloco excluído por flag não pede seleção.
- `vocabulario.ts` — catálogo de campos por entidade + derivados (valor/área/data por extenso,
  concordância de gênero/número, UF por extenso).
- `mapeadores.ts` — linha do banco → campos do vocabulário em prosa jurídica (endereço completo,
  "s/nº", datas BR) + agregados (capital social, % de quotas, totais).
- **Listas plurais** (`socios`, `administradores`, `integralizacoes`) carregam da EMPRESA escolhida
  (o consultor liga a empresa, não cada pessoa); `vertices` vêm do georreferenciamento da matrícula.
- **Flags derivadas declarativas** (`flags.ts`): "campo da empresa == valor" (ex.:
  `tipo_empresa = 'PR'`) ativa/desativa blocos. Há também flags manuais (`tmpl_flag` /
  `projeto_flag_valor`).

## Persistência e versionamento

- `documento_gerado` — instância por (cliente, modelo, empresa), com `snapshot_dados`,
  `snapshot_flags`, `snapshot_versoes_blocos` e a linhagem `documento_anterior_id` /
  `documento_raiz_id`. Validar = **congelar**: a partir daí a prévia renderiza do snapshot, não do
  cadastro vivo. "Atualizar versão" sela a atual e abre uma nova; "Revalidar" re-sincroniza com os
  cadastros na mesma versão.
- `documento_override` (`substituicao` / `supressao` / `adicao`) — editar um bloco na prévia altera
  **só este documento**; o bloco da Biblioteca fica intacto. Exige documento já validado.
- **Notificações**: `audit_logs` dos cadastros que hidratam o documento após o
  `snapshot_validado_em` aparecem numa aba — o consultor vê que o dado mudou depois de validar.
- **Proveniência**: clicar num valor da prévia abre o modal do cadastro de origem
  (pessoa/bem/matrícula); clicar num trecho de texto abre o override.

## Invariantes

Dado nasce no cadastro, nunca digitado no template (elimina a classe de erro "mesmo nome grafado
de dois jeitos"); placeholder órfão é erro, não string vazia; override é escopado ao documento;
versão anterior nunca é sobrescrita.

## O que ainda NÃO existe

Alteração contratual como diff + reconsolidação do estado da sociedade no tempo (ledger de eventos
datados) e partials de qualificação (`{{> qualificacaoPF(socio) }}`). Ver
[`arquitetura-sintese.md`](./arquitetura-sintese.md) e
[`catalogo-familias-e-flags.md`](./catalogo-familias-e-flags.md).
