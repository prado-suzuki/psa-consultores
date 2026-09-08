# Pedido ao chat do Lovable — card 4 (documento com modelo) + GO-08

**Escrito em 08/09/2026.** Uma mensagem só, e sem SQL dentro dela: as quatro mudanças de
banco são **arquivos de migration na `main`** (commits `7d11bfbf` e `ff2c5b9c`), como manda
o `AGENTS.md`. Assim ficam versionadas, passam pela CI, o sandbox consegue reproduzir, e o
chat não vira o lugar onde mora o estado de produção.

**Escopo:** o card 4 e o GO-08. Nada além.

## Já feito, por você, sem gastar crédito

1. ✅ **Bucket `osg-modelos`** criado pelo painel de Storage, privado. É o padrão da casa:
   nenhuma migration do repositório cria bucket. As *policies* dele, sim, vão em migration.
2. ✅ **Os dois modelos no balde**, conferidos por SELECT em `storage.objects`:

   ```
   documento-tipo/bem--relacao-de-areas-exploradas-por-imovel/Modelo_Relacao_de_areas_exploradas_por_imovel.xlsx   30,3 KB
   documento-tipo/bem--planilha-de-resultado-projetado-pf-e-pj/Modelo_DRE_Projetada.xlsx                           13,9 KB
   ```

   Uma pasta por `codigo` do catálogo, que é a chave natural: o endereço já diz qual linha
   de `documento_tipo` o arquivo serve, e trocar a versão não corre risco de colisão de
   nome. O primeiro é a planilha de áreas exploradas com as duas colunas que a Mônica pediu
   (`Remuneração` em R$ e `Participantes`); o segundo é só a aba "DRE Projetada", extraída
   em arquivo próprio.

⚠️ **Não suba ao balde o `Lista de solicitação - Planejamento Tributário.xlsx`** (o original
de onde a DRE saiu). Ele carrega 101.918 valores em cache de 27 planilhas externas,
incluindo plano de contas e saldos do `Condominio Scheffer` — dado contábil de terceiro,
invisível quando se abre o arquivo, e a leitura do balde é liberada para qualquer usuário
logado, inclusive o papel `client`. O `Modelo_DRE_Projetada.xlsx` é a versão limpa: 13,9 KB
contra 747 KB, com a aba idêntica byte a byte e as 139 fórmulas. Pelo mesmo motivo, **não**
suba o `Modelo_Planilha de Diag. Tributário para ppt.xlsx`.

---

## A mensagem

```
Aplique em produção o SQL destes quatro arquivos de migration, que estão na main, nesta
ordem. As quatro são idempotentes.

  supabase/migrations/20260908113717_modelo_de_documento_no_catalogo.sql
  supabase/migrations/20260908114720_catalogo_planilhas_duplicadas_saem_do_catalogo.sql
  supabase/migrations/20260908134451_modelo_policies_do_bucket_e_caminho_dos_dois_modelos.sql
  supabase/migrations/20260908134550_go08_apaga_as_cinco_solicitacoes_de_teste_sem_os.sql

O que cada uma faz está no cabeçalho do próprio arquivo. Em resumo: a primeira acrescenta
três colunas em documento_tipo e recria as duas RPCs do portal do cliente para devolverem
a chave "modelo" (a assinatura das duas continua () returns jsonb, e o corpo é o de
produção com 18 linhas novas); a segunda desativa duas linhas duplicadas do catálogo; a
terceira cria as policies do bucket osg-modelos em storage.objects e grava o caminho dos
dois modelos; a quarta apaga cinco solicitações de teste que estão sem ordem de serviço.

Não aplique mais nada além desses quatro arquivos: existem outras migrations no
repositório que ainda não devem ir a produção.

Ao terminar, regenere o types.ts.
```

---

## Depois, o que eu confiro por SELECT (grátis, pelo MCP)

`documento_tipo` de 20 para 23 colunas · as duas linhas duplicadas em `ativo = false` · as
duas linhas certas com `modelo_bucket`, `modelo_path` e `modelo_nome` batendo com os
objetos que estão no balde · as quatro policies de `osg-modelos` em `storage.objects` · as
cinco solicitações de teste fora, com os 92 itens que o CASCADE leva · e o `types.ts`
regenerado na `main`, que é o que me libera para escrever o front.

## O que isto NÃO resolve

O botão só aparece quando o **front** for escrito, e ele ainda não existe. Migration
aplicada e arquivo no balde, sem o código, não muda nada em tela nenhuma — a tela fica como
hoje e o modelo continua indo por e-mail. Para o go-live de 09/09 isso é degradação
aceitável, não quebra. O código vai num push depois, e só depois de as colunas existirem em
produção.
