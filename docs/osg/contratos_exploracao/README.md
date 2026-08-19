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
- `05-modelo-parceria-rural.md` e `06-modelo-composse-rural.md`: modelo de
  contrato replicável, cláusula a cláusula sobre o texto real dos contratos em
  `docs/notebooklm/exemplo-*.md`, com variáveis (`{{campo}}`) e blocos
  condicionais (`[[BLOCO]]`) nos pontos de variação real confirmados entre os
  exemplos. Insumo para o gerador da Oficina de Contratos, não um documento
  assinável por si só — os pontos marcados como pendência ainda precisam de
  confirmação com a consultora antes de ir para produção.
