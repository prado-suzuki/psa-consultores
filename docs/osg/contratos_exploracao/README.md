# Prévia — cadastro de exploração rural

Esta pasta contém o mockup HTML isolado e notas de evidência da ALE-3.

O único artefato canônico de aceite é
[`../levantamento-contratos-rurais.md`](../levantamento-contratos-rurais.md). Ele
contém a tabela exigida pela tarefa, os marcadores do gerador, as pendências de
conferência, o desenho cabeçalho/detalhes e as migrações candidatas da próxima
sprint.

## Abrir o mockup pelo Vite

Com `bun run dev` em execução:

- Parceria:
  `http://localhost:8080/docs/osg/contratos_exploracao/mockup.html?abrir=1&tipo=parceria`
- Composse:
  `http://localhost:8080/docs/osg/contratos_exploracao/mockup.html?abrir=1&tipo=composse`

O HTML não integra o roteamento React, não entra no bundle de produção, não consulta
o banco e não salva dados.

## Notas auxiliares

- `03-fontes-e-lastro.md`: inventário das evidências consultadas.
- `01-campos.md`, `02-fluxo-processo.md` e `04-perguntas-abertas.md`: notas de
  trabalho anteriores à consolidação. Podem conter hipóteses superadas e não devem
  ser usadas como requisito, schema ou resposta assinada.
