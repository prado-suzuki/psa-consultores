# Relatórios de teste por tarefa de sprint

Um arquivo por tarefa. Passos numerados `T1`, `T2`, … e bugs numerados `B1`, `B2`, … no próprio
arquivo, para poderem ser citados na tarefa e nas correções.

- [`ale-31-teste-integracao-fluxo-solicitacao.md`](./ale-31-teste-integracao-fluxo-solicitacao.md) —
  **Sprint 10.** Fluxo de solicitação de documentos ponta a ponta, do consultor ao cliente e de volta,
  sobre OS real em dev. 8 passos e 4 bordas. 3 bugs: portal do cliente ignora o status da solicitação
  (funcional), `documento_arquivo.solicitacao_id` nunca preenchido, lista vazia não convida a gerar da OS.

## Importar tarefas no backlog

O botão **Importar tarefas** em `/equipe/backlog` lê arquivos `.md` (vários de uma vez) e mostra
cada tarefa numa tela de revisão antes de gravar. Nada entra no backlog sem confirmação.

- **Arquivo com `#` no topo** — os `TAREFA_*.md` destas pastas — vira **uma** tarefa. O título sai
  do `#`, sem o prefixo `TAREFA` (`TAREFA 1 —`, `TAREFA 1:`, `TAREFA:`). A descrição é o primeiro
  bloco de citação (`>`), ou o primeiro parágrafo, com o nome do arquivo no fim. Dá para
  selecionar a pasta inteira: o `README.md` é ignorado, e arquivo que abre com "APOSENTADA" entra
  desmarcado.
- **Arquivo sem `#`** é uma lista: cada `##` vira uma tarefa, e o texto abaixo dele vira a descrição.
  Logo abaixo do `##`, antes do texto, valem três linhas opcionais:

```markdown
## Lista geral de solicitações de documentos
prioridade: alta
horas: 8
projeto: OSG Work

Não existe tela que mostre todas as solicitações.
```

`prioridade` aceita baixa, média ou alta; sem ela, a tarefa fica média. `projeto` é casado pelo
nome cadastrado, sem diferenciar acento e maiúscula. Valor que não se reconhece não trava a
importação: aparece como aviso na revisão, para você corrigir ali. Quem lê os arquivos é
`src/lib/importarTarefasBacklog.ts`.
