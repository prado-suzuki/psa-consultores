# Gerador de Documentos OSG — docs de design

Documentação de design do gerador de documentos jurídicos da área OSG (contratos societários e
instrumentos agrários). **Não contém migrations nem schema final** — é o mapa que orienta as
decisões de implementação.

- [`arquitetura-sintese.md`](./arquitetura-sintese.md) — síntese de arquitetura a partir de
  contratos reais: as 4 famílias de documento, as camadas (domínio → vocabulário → primitivos →
  cláusulas → composição → render), lacunas de dados e o sequenciamento em 4 fases.
- [`catalogo-familias-e-flags.md`](./catalogo-familias-e-flags.md) — catálogo das *vagas (slots)*,
  *famílias de blocos* (o "hot swap") e *flags* que selecionam variantes, por tipo de documento;
  catálogo consolidado de flags; iterações; e pontos de schema a decidir.

Base de conhecimento de domínio (fora do repo): vault Obsidian em
`~/Documentos/vaults/osg_vault/Arquitetura/`.
