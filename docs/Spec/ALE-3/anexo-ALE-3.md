# ALE-3 — Parceria e Composse rural: campos mapeados e protótipo do cadastro

O cadastro de Parceria e Composse rural tem agora um **levantamento campo a campo**,
conferido contra banco, cadastros existentes e contratos reais, e um **protótipo
funcional** da tela — não um esboço estático, um componente real que dá pra clicar.
Nada foi implementado em produção; isso é o que destrava a Sprint 12.

O levantamento completo está em `docs/osg/levantamento-contratos-rurais.md`; o resumo
para o tech lead avaliar reaproveito de campos, em `docs/osg/campos-exploracao-rural.md`;
o protótipo clicável, na branch `ale-3-levantamento-contratos-rurais`.

## O que o protótipo já cobre

| Situação | O que a tela faz |
|---|---|
| Trocar o Tipo de exploração (Parceria ↔ Composse) | Muda os campos visíveis: partes, percentual e documento de origem |
| Mais de um outorgante, outorgado ou compossuidor | Aceita lista, cada pessoa com sua própria fração |
| Um instrumento cobrindo mais de um imóvel | Aceita lista de imóveis, cada um com origem própria |
| Imóvel cuja posse veio de uma composse anterior | Tipo de origem inclui "Composse", além de Parceria/Arrendamento/Herança/Outro |
| Matrícula já usada por outra Parceria ativa | Avisa e mostra quanto % ainda está livre — não bloqueia |

## Pendências

| Pendência | Dono |
|---|---|
| Fechar os nomes dos papéis (outorgante/outorgado, partes extras) no acordo do dia 1 | Bernardo + Alexandre |
| Confirmar com a OSG se o encadeamento Parceria→Composse→nova Parceria ocorre na prática | Alexandre |
| Migrações candidatas do levantamento (seção 6), aguardando aprovação | Bernardo |

Protótipo e levantamento estão na branch `ale-3-levantamento-contratos-rurais`, sem
commit dos últimos ajustes (outorgantes/exploradores em lista, origem "Composse").
