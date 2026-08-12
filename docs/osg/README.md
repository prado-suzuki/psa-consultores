# Gerador de Documentos OSG — docs de design

Documentação de design do gerador de documentos jurídicos da área OSG (contratos societários e
instrumentos agrários). **Não contém migrations nem schema final** — é o mapa que orienta as
decisões de implementação.

- [`briefing-geracao-documentos.md`](./briefing-geracao-documentos.md) — **estado implementado** em
  uma página: as três telas, a sintaxe do template, o pipeline de geração, de onde vêm os dados,
  versionamento/overrides e o que ainda não existe. Feito para colar como contexto num prompt de IA.
- [`arquitetura-sintese.md`](./arquitetura-sintese.md) — síntese de arquitetura a partir de
  contratos reais: as 4 famílias de documento, as camadas (domínio → vocabulário → primitivos →
  cláusulas → composição → render), lacunas de dados e o sequenciamento em 4 fases.
- [`catalogo-familias-e-flags.md`](./catalogo-familias-e-flags.md) — catálogo das *vagas (slots)*,
  *famílias de blocos* (o "hot swap") e *flags* que selecionam variantes, por tipo de documento;
  catálogo consolidado de flags; iterações; e pontos de schema a decidir.
- [`plano-binding-namespaced.md`](./plano-binding-namespaced.md) — **plano de execução** (handoff para
  implementação) da 1ª etapa: vocabulário namespaced por entidade + binding por papel + concordância de
  gênero + tela Gerar com múltiplas entidades. Objetivo, critérios de pronto, passos ordenados e decisões
  já tomadas. Sem flags, sem migrations.

- [`memorial-georref-por-imovel.md`](./memorial-georref-por-imovel.md) — **lacuna aberta** do B15: o
  memorial de georreferenciamento ainda pende de UMA matrícula; o dado por item já existe, falta a
  migration de conteúdo que faz o bloco repetir sobre `imoveis`. Desenho fechado + handoff.
- [`tela-gerar-descarte-visivel.md`](./tela-gerar-descarte-visivel.md) — decisão de como a tela Gerar
  conta os blocos que saíram e anuncia os que o motor descartou (emenda 9.2 do contrato L2/L3).

Base de conhecimento de domínio (fora do repo): vault Obsidian em
`~/Documentos/vaults/osg_vault/Arquitetura/`.
