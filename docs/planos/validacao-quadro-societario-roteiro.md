# Roteiro de validação: a troca de fonte do quadro societário

Roteiro pronto para dar ao agente que dirige o navegador (`cleberson-oliveira`).
Escrito em 20/08/2026, na branch `feat/alteracao-contratual-caminho-b`.

Contexto da mudança: o quadro societário tinha duas fontes (a Proprietária
derivava os sócios dos titulares das matrículas no render, a Controladora lia a
tabela `quadro_societario`). Agora tem uma só, a view `v_quadro_societario`, que
é o acumulado de um livro de movimentos de quota. A tabela velha foi dropada.
Leem essa fonte: Quadro Societário, Gerar Documento, Relatórios e a edge function
`gerar-apresentacao`.

## Setup

Ver `docs/geral/validar-no-app-rodando.md`. Em resumo: app na 8080 apontando para
o sandbox, e o primeiro passo do agente é navegar para
`http://localhost:8080/e2e/semear-sessao.html`, que o deixa logado. Se ele cair
em `/equipe`, a sessão venceu: `node e2e/renovarSessao.mjs`.

## Restrições que precisam estar no prompt do agente

1. **Não clicar em "Gravar quadro societário"** na tela da PR: grava movimentos
   de verdade e muda o texto do contrato daquele cliente.
2. No modal de movimento, exercitar campos e validações e **terminar em Cancelar**.
3. Se algo salvar sem querer, parar e relatar cliente/empresa/tipo/quotas.
4. Leitura e navegação são livres.

## Os casos, com os nomes do sandbox

Os nomes abaixo são os anonimizados do sandbox (os ids são os mesmos de produção,
os nomes não). Contagens conferidas por SELECT em 20/08/2026.

| Cliente | Empresa | Tipo | Quadro | Bens elegíveis | O que o caso prova |
|---|---|---|---|---|---|
| `[TESTE 1 · ENVIAR] Abacaxi Elétrico…` | Nascente Transportes Eireli | CN | 5 | 0 | ordem do preâmbulo preservada (5 `created_at` distintos) |
| idem | Farroupilha Logística S.A. | PR | **0** | 7 | **o fallback derivado da PR**, o caso mais crítico: sem ele o documento sairia sem sócio |
| `[TESTE] Banana Quântica…` | Pantanal Comércio S.A. | CN | 42 | 0 | tabela grande, rodapé de total, busca |
| idem | Rondon Administradora de Bens S.A. | PR | 1 | 0 | PR **já gravada**: mostra o quadro registrado, não a proposta. É o único caso em que o texto do documento muda de propósito |
| `[TESTE] Dinossauro Aposentado…` | Jatobá Sementes S.A. | CN | 2 | 0 | modal de movimento |
| idem | Farroupilha Comércio Ltda | PR | 0 | 5 | segundo fallback derivado |
| `Estiva Transportes Eireli` | Horizonte Agropecuária S.A. | CN | 2 | 0 | |
| idem | Tapajós Participações Eireli | CN | 1 | 2 | CN que também tem bens |

## O que checar em cada tela

**Quadro Societário** (`/equipe/osg/work/quadro-societario`)
- CN: lista de sócios, KPIs (capital, quotas, valor nominal), botão "Registrar
  movimento" no cabeçalho, ícone de movimentar por linha. A soma da coluna Quotas
  fecha com o rodapé, e as participações somam ~100%.
- PR sem movimento: badge "Ainda não gravado" e o **quadro proposto** calculado
  dos bens. Não pode vir lista vazia.
- PR com movimento: "Quadro registrado, apurado da movimentação de quotas".

**Modal de movimento** (abrir pelo ícone de uma linha)
- Vem com tipo **Cessão** e o cedente já preenchido.
- Tipo **Aporte** faz o campo de cedente desaparecer. Tipo **Redução** faz o de
  adquirente desaparecer e o rótulo do cedente virar "De quem as quotas saem".
- Atalho "Mover todas as N quotas" preenche o campo Quotas.
- Quotas acima do saldo do cedente: aviso âmbar dizendo quantas ele tem, e o
  botão de registrar **desabilitado**. Voltar a um valor válido reabilita.
- A linha "Valor de capital das quotas movidas" acompanha o número de quotas.

**Gerar Documento** — a lista de sócios do preâmbulo **não pode sair vazia** e a
cláusula de capital tem de ter valor. Vale para uma CN e, principalmente, para a
PR `Farroupilha Logística S.A.` (o fallback). Só a prévia, sem selar versão.

**Relatórios** (societário / organograma) — os números têm de **bater com os da
tela do Quadro Societário** para a mesma empresa. Divergência entre as duas telas
é exatamente o bug que a mudança existe para eliminar.

## Como o agente deve relatar

Por item: o que fez, o que viu (screenshot ou texto literal) e veredito. Em lista
separada: erro de console, ErrorBoundary ("Algo deu errado"), tela branca, lista
vazia onde devia haver dado, número que não bate entre duas telas. Passo que não
deu para executar entra com o motivo, não sai calado.
