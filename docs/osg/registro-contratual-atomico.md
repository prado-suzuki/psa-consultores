# Registro contratual atômico

Migration: `supabase/migrations/20260908211755_registro_contratual_atomico.sql`.
Aplicada no **sandbox** em 09/09/2026 (`bun run db:sync --apply`). Em produção ainda não: é passo humano pelo chat do Lovable, com o mesmo SQL, e tem de entrar antes de a `develop` chegar à `main`, porque o app já não grava mais a trilha nem o carimbo por conta própria (ver "Estado da integração").

## Contrato de escrita

O registro é um `UPDATE` de `documento_gerado`, de `rascunho` para `registrado`, sob usuário autenticado com `team_member` ou superior e acesso ao cliente. A transação usa `READ COMMITTED`, padrão do PostgREST. Não há RPC nova, coluna nova ou FK para `auth.users`.

Na validação, persistir antes do registro:

- `snapshot_validado_em` não nulo.
- `snapshot_flags` como array.
- `snapshot_versoes_blocos` como objeto com `blocos` não vazio, `familias` como objeto e `contextoRender` como objeto não vazio. Blocos precisam de `id` e `conteudo` string.
- `snapshot_dados` com `empresaId` igual à PJ da peça e os objetos `selecao`, `registroPorBinding`, `valoresLivres`, `itensPorLista`.
- `snapshot_dados.movimentosFormalizados`: array de UUIDs string sem duplicação. `[]` declara explicitamente que esta peça não formaliza movimentos. Não recalcular na confirmação do registro.
- Opcionalmente, `snapshot_dados.movimentosEvidencia`: objeto indexado pelo UUID de cada movimento, cobrindo exatamente o escopo. Cada valor é a linha do movimento sem `created_at`, `created_by`, `updated_at`, `updated_by` e `documento_gerado_id`. Quando presente, divergência de qualquer campo aborta o registro.

O UPDATE de registro deve preservar todos os campos e snapshots anteriores, acrescentando somente `snapshot_dados.registroContratual` e mudando `status`. `updated_at` e `updated_by` são técnicos; o autor final vem de `auth.uid()`.

```json
{
  "versao": 1,
  "confirmacaoId": "UUID estável desta confirmação",
  "protocolo": "protocolo da junta",
  "dataRegistro": "2026-01-03",
  "numeroArquivamento": "número do arquivamento",
  "juntaUf": "MT",
  "junta": "JUCEMAT",
  "arquivoId": "UUID da linha em documento_arquivo"
}
```

Obrigatórios: `versao`, `confirmacaoId`, **`protocolo`** e **`dataRegistro`** (`Metadata obrigatoria: <campo>`). Os dois últimos são o que faz a peça dizer qual registro a tornou oponível; `confirmacaoId` é técnico, é ele que faz o retry ser reconhecido como o mesmo gesto.

`numeroArquivamento`, `juntaUf`, `junta` e `arquivoId` são **opcionais**, sem chaves extras, porque a junta devolve cada coisa num dia e exigi-las no gesto obrigava a inventar valor ou a atrasar o marco. A chave **ausente** é o "ainda não devolveu"; chave presente com string vazia ou só espaço é recusada (`Campo do registro em branco: <campo>`). `dataRegistro` tem de existir no calendário e não estar no futuro; `juntaUf`, quando presente, tem de ser UF real. `confirmacaoId` não é token de autorização nem chave global de deduplicação. O retry é pelo mesmo documento e metadata idêntica.

**`dataInstrumento` e `dataProtocolo` saíram de v1 em 09/09/2026** e agora são chave extra (`registroContratual v1 invalido`), não campo opcional. Nenhum consumidor as lia: a linhagem das ACs é de coluna (`substitui_documento_id`, `documento_raiz_id`, `papel`, `status`), e do jsonb o banco só usa `versao` (prova de que o caminho atômico rodou, lida pela constraint adiada) e `confirmacaoId`. Linha gravada antes disso pode carregá-las; nada revalida marco antigo, só o que está sendo escrito, e o formulário não as regrava.

Quando `arquivoId` está presente, o arquivo já deve existir, ter upload finalizado e estar associado a `documento_gerado_id` e `pessoa_id` exatos. Exige cliente/ambiente coincidentes, `excluido=false`, `status=ativo`, `revisao=aprovado`, revisor/data de revisão, categoria `societarios`, URI `gs://`, checksum CRC32C em base64, tamanho positivo, MIME e nome não vazios. A operação não sobe arquivos nem muda a revisão deles.

## Completar o marco depois do registro

Uma peça registrada aceita **uma** escrita: substituir `snapshot_dados.registroContratual`. É o mesmo `UPDATE`, sob as mesmas checagens de auth/acesso, e a trigger recusa (`Documento registrado e imutavel`) qualquer outro campo, snapshot ou elo de linhagem que viaje junto. Não há status a virar, movimento a carimbar nem bem a integralizar: isso aconteceu no registro, uma vez.

Duas coisas não mudam depois:

- `confirmacaoId` (`Confirmacao do registro e imutavel`): completar não é re-registrar, e o ato continua sendo o que foi confirmado naquele gesto.
- `arquivoId` já eleito (`Arquivo registrado e imutavel`): o PDF pode **chegar** depois, e nesse momento é conferido com as mesmas regras do registro; trocar o que já foi conferido deixaria a peça apontando para arquivo não verificado e órfão o que a trigger do arquivo protege.

A trilha é do banco: `audit_logs` de `documento_gerado` com `changed_fields.registroContratual` (antes e depois do marco), na mesma transação. Metadata idêntica à gravada não escreve nem audita, e o `UPDATE` volta com zero linhas (o integrador relê e devolve o estado atual, como no retry).

Peça registrada **sem** `registroContratual` (registro anterior a este contrato) não recebe marco por aqui: dar-lhe um significaria inventar a confirmação de um ato que não teve nenhuma, e `registroContratual` v1 é justamente o que a constraint adiada `trg_movimento_registro_confere` aceita como prova de que o caminho atômico rodou.


## Efeitos e guardas

A trigger BEFORE trava a sociedade, raiz/base, arquivo, movimentos e bens. Confere existência e ownership de todas as linhas do escopo, incluindo origem/destino no cliente. Não aceita movimento já ligado a outra peça, nem carimbo antecipado na própria peça. Base de alteração precisa estar registrada e pertencer à mesma PJ/cliente. Outra linhagem já registrada sobre a mesma base impede o registro; versões em revisão da mesma linhagem não impedem.

Movimentos recebem o documento dentro da mesma transação. Só bens desses movimentos e com status `Aprovado` ou `Aprovado para 2ª Instancia` mudam para `Integralizado`. Recusados e demais status são preservados. Bens invisíveis, indisponíveis para lock pela RLS ou fora da PJ abortam, em vez de serem ignorados.

Auditoria de documento, movimentos e bens usa `audit_logs`, área `osg`, ação `updated`, autor autenticado e diff `{campo: {old, new}}`. É o contrato de `useAuditLog`/`computeFieldDiff`, com o precedente SQL de `20260831210000_itcd_gravacao_transacional.sql`. Não existe helper SQL genérico de auditoria no repositório. Chamar um hook React dentro do PostgreSQL não é possível; os inserts ocorrem na transação e a falha de qualquer log desfaz tudo.

Documentos registrados ficam imutáveis, inclusive status, snapshots, linhagem e exclusão. A exceção é `snapshot_dados.registroContratual` (ver "Completar o marco depois do registro"). Retry idêntico retorna sucesso SQL com **zero linhas alteradas**, sem nova auditoria. O integrador não deve tratar `.single()` sobre esse UPDATE como confirmação de sucesso: após zero linhas, reler o documento e comparar metadata.

Carimbos de movimentos são conferidos por constraint trigger `DEFERRABLE INITIALLY DEFERRED`. Isso permite que o BEFORE do documento escreva o carimbo antes de publicar a linha registrada, mas recusa o carimbo manual no commit se não houver documento registrado e escopo congelado correspondente. Não se usa GUC ou profundidade de trigger como credencial. Não antecipar `SET CONSTRAINTS ALL IMMEDIATE` nesse fluxo.

Movimentos já formalizados, inclusive legados, não podem ser alterados ou excluídos. O arquivo eleito no registro não pode ser substituído, alterado ou excluído. As funções são `SECURITY INVOKER`, têm `search_path` fixo e execução direta revogada de `public`, `anon` e `authenticated`.

O único consumidor de carimbo manual encontrado foi `useFormalizarMovimentos`, chamado pelo controller do gerador. Cadastros de movimentos sem documento continuam funcionando. Edição/exclusão de carimbos legados passa a falhar deliberadamente; reparar histórico exigirá procedimento humano específico, não bypass no aplicativo.

## Limites de segurança

**Registro sem PDF é registro sem prova documental.** O mínimo exigido identifica o registro (protocolo e data), mas uma peça pode constar como registrada sem número de arquivamento, sem junta e sem o PDF chancelado. Isso é deliberado, e o preço é que a completude desses quatro passa a ser pendência operacional, não garantia do banco: a lista "Registros na junta" no rail do gerador é quem a cobra, peça por peça. Quem precisar da garantia forte terá de exigir os campos numa camada acima (relatório, fechamento), não nesta trigger.

**A metadata persistida não prova a existência física nem a integridade atual do arquivo no GCS.** O fluxo existente permite que a equipe grave metadata em `documento_arquivo` após `finalize`. A trigger valida seu formato e vínculo, mas não possui recibo assinado do backend nem acesso ao storage. A revisão aprovada também é uma declaração de usuário autorizado. Não considerar esta migration uma prova antifraude de upload ou de registro na junta.

A integridade física exige que o backend finalize/verifique o objeto e que o storage impeça sua substituição/exclusão por fora do banco. Validar essa fronteira antes de habilitar a feature. Se o requisito for resistir a metadata forjada por membro autorizado, será necessário um contrato adicional de atestação confiável do backend; a solução atual não oferece essa garantia.

A validação SQL do template é estrutural. Ela não executa o motor TypeScript nem prova que todas as famílias/variáveis renderizam corretamente. O integrador deve validar a reprodução completa antes de congelar. Sem `movimentosEvidencia`, o banco garante o conjunto de IDs e ownership, mas não detecta mudanças em quotas/valores entre validação e registro. Recomenda-se sempre persistir a evidência.

## Testes locais

```sh
node supabase/tests/registro-contratual/run.mjs
bun scripts/checa-idempotencia-migrations.ts supabase/migrations/20260908211755_registro_contratual_atomico.sql
```

O runner cria PostgreSQL 17 em Docker com `--network none`, dados em tmpfs e sem porta publicada. Não aceita URL de banco, não lê `.env` e remove o container ao terminar. Aplica a migration duas vezes somente ali.

Os testes executam SQL real como `authenticated`, com RLS habilitada. Cobrem commit conjunto, rollback na falha final de auditoria, retry sequencial/concorrente, dois sucessores concorrentes, edição concorrente do arquivo, ownership, metadata inválida, escopo adulterado/duplicado/incompleto, evidência, bens recusados, negativas de RLS e imutabilidade.

**A fixture é reduzida.** Helpers de identidade/cluster são simulados e as policies representam os casos consultados no baseline, sem replay integral de migrations. Os testes provam esses comportamentos transacionais nessa fixture, não equivalência ao schema vivo, autenticação JWT, GCS ou ausência de drift. Antes de aplicar, executar a suíte contra uma reprodução isolada do schema alvo e revisar `pg_policies`, grants e triggers reais.

## Estado da integração em 09/09/2026

A trigger está no sandbox e o app escreve no contrato dela:

- `movimentosFormalizados` é congelado na validação (`validarVersao`/`revalidar`), e o carimbo
  do registro usa esse conjunto, não a lista viva.
- `snapshot_versoes_blocos.contextoRender` é calculado do snapshot que está sendo gravado.
- O registro grava `registroContratual` v1 no mesmo UPDATE que vira o status, com
  `confirmacaoId` estável por abertura do diálogo e `arquivoId` de uma linha de
  `documento_arquivo` aprovada, vinculada à peça e à PJ, subida antes (`useEnviarArquivoRegistrado`).
  O diálogo exige protocolo e data do registro; o que fica em branco é OMITIDO do jsonb
  (`marcoPreenchido`, em `src/lib/osg/registrosDaSociedade.ts`), nunca gravado vazio.
- Retry: zero linhas com o mesmo `confirmacaoId` sobre peça registrada devolve a peça; outra
  confirmação é conflito.

Removidos do app em 09/09/2026, junto com a aplicação no sandbox: o `logAction` de status em
`useRegistrarDocumento` e a chamada a `useFormalizarMovimentos` em `confirmarRegistro`. A trilha e
o carimbo são só do banco agora. `useFormalizarMovimentos` continua existindo (e testado) sem
consumidor no fluxo de registro; carimbar por fora é o que a constraint adiada recusa. As
invalidações de livro, aportes, cessões e bens elegíveis que ele fazia passaram para o
`onSuccess` de `useRegistrarDocumento`. Consequência para produção: enquanto a migration não
for aplicada lá, registrar pela `develop` não deixa auditoria nem carimba movimentos.

Não gravado ainda: `movimentosEvidencia` (o app não tem as linhas cruas dos movimentos).

## Marco mínimo e completável, em 09/09/2026

O marco encolheu para seis campos, dois deles obrigatórios, e passou a ser completável depois do registro (seção "Completar o marco depois do registro"). No app:

- `RegistrarNaJuntaDialog` mostra seis campos: protocolo e data do registro obrigatórios, arquivamento, UF, junta e PDF opcionais. Barra o mínimo ausente e a **incoerência** (data no futuro, UF inexistente), e diz antes do clique o que vai ficar sem. O mesmo diálogo serve o modo `completar`, com o marco gravado pré-carregado.
- `useCompletarRegistroContratual` faz o UPDATE do marco sobre a peça registrada, preservando `confirmacaoId` e `arquivoId` já eleito, e trata zero linhas como "já está assim". Sem `logAction`: a trilha é a da trigger.
- `RegistrosNaJunta` (rail do gerador) lista TODAS as peças registradas da sociedade (`useRegistradosDaSociedade`), na ordem da sucessão, com o que falta em cada uma. É o caminho de volta depois de vários registros seguidos: a tela mostra uma peça só, a head da combinação cliente+modelo+empresa.
- O PDF chancelado pode subir no registro ou depois, sempre vinculado à peça alvo.

Testes: os seis casos novos em `supabase/tests/registro-contratual/run.mjs` (mínimo exigido e campo fora de v1, registro mínimo + completar com trilha, marco parcial/incoerente, confirmação e arquivo imutáveis, arquivo que chega depois, acesso), `src/lib/osg/registrosDaSociedade.test.ts` e dois casos em `src/pages/equipe/osg/GerarDocumento.test.tsx`.

## Checklist de integração

1. Congelar escopo e evidência no passo de validação, junto ao template completo e `contextoRender`. Revalidar rascunhos antigos; não completar snapshots durante o registro.
2. Finalizar upload externo, conferir a fronteira de confiança acima e persistir arquivo aprovado com os vínculos exatos. Preservar o mesmo arquivo/`confirmacaoId` no retry.
3. ~~Trocar a sequência do controller por um único UPDATE com metadata. Remover a chamada posterior a `useFormalizarMovimentos` neste fluxo e não duplicar os logs já escritos no banco.~~ Feito em 09/09/2026.
4. Tratar zero linhas no retry com releitura/comparação (feito: `useRegistrarDocumento` relê a peça e compara `confirmacaoId`). `23505` e `40P01` traduzidos em mensagem (feito em 09/09/2026); a nova tentativa com a mesma confirmação é o clique de novo no diálogo aberto. Erros de validação/RLS exigem correção ou nova validação.
5. Invalidar documento/head, sucessores, constitutivos registrados, movimentos/aportes/cessões, integralizações e histórico de auditoria após confirmar o resultado.
6. Conferir drift e testar com schema/policies reais isolados. Em especial, `team_member` lê cliente mas não pode atualizá-lo; por isso a consulta ao cliente não pede lock de escrita.
7. ~~Só depois da integração e revisão, autorizar aplicação no sandbox.~~ Aplicada no sandbox em 09/09/2026. Produção continua sendo aplicação humana pelo Lovable, obrigatória antes do merge em `main`.
