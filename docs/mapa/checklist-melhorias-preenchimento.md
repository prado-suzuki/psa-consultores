# MAPA — Checklist de melhorias de preenchimento

**Origem:** teste de uso do fluxo de mapeamento (`/equipe/digital/mapa` → Projeto → Processo → Mapear → "Como Era").
**Data:** 2026-07-14
**Como foi verificado:** rodado **ao vivo no navegador** (login real no localhost:8080), criando o projeto **"teste"** e o processo **"processo teste"**, com prints por etapa; mais testes de formulário (32/32 verdes), `typecheck` e leitura do código.

**Total: 10 tarefas — 4 Alta · 3 Média · 3 Baixa.** (+ 1 ponto verificado como OK, ao final.)

> Cada tarefa tem duas partes:
> 🗣️ **Em português claro** — o problema e o que melhora, pra qualquer pessoa entender.
> 🛠️ **Técnico** — onde mexer no código e como validar (pro Alexandre).

---

## 🔴 Prioridade Alta — qualidade de dado / correção

### 1. Nome da etapa obrigatório *(confirmado ao vivo: campo "Nome" sem `*`)*
🗣️ **Em português claro:** hoje dá pra salvar uma etapa **sem nome**. Quando isso acontece, o relatório (SOP) e o diagrama do processo saem com uma etapa "em branco", e depois alguém precisa descobrir que etapa era aquela. Com o ajuste, o sistema **não deixa salvar sem nome** e avisa qual etapa está faltando — os documentos saem sempre completos.
*Exemplo:* o analista mapeia 6 etapas com pressa e esquece o nome da etapa 4; hoje salva assim e o SOP do cliente sai com uma etapa sem título.
🛠️ **Técnico:** `cleanEtapa` (`src/pages/equipe/mapa/MapearProcessoPage.tsx:279`) só filtra chips vazios e `handleSaveEtapas` (`:405`) grava sem checar o nome. Marcar Nome como obrigatório (`:797`) com `*` e bloquear "Salvar todas" apontando a etapa sem nome. **Aceite:** salvar com etapa sem nome → bloqueado, com mensagem clara.

### 2. O que você apaga tem que sumir de verdade (Volume/Complexidade) *(confirmado no código)*
🗣️ **Em português claro:** se você **apaga um número** já preenchido (ex.: Volume Anual) e salva, o sistema **não apaga de verdade** — o valor antigo continua guardado e continua entrando nas contas do ROI. Com o ajuste, o que você apaga some mesmo e os cálculos ficam corretos.
*Exemplo:* um processo tinha Volume = 20; percebeu-se que era errado, apagou e salvou. Hoje o banco continua com 20 e o Dashboard ROI segue calculando em cima de 20.
🛠️ **Técnico:** `ProcessoFormModal.tsx:99,101` envia `undefined` ao esvaziar; `useUpdate` faz `.update(patch)` direto (`src/hooks/_createEntityHooks.ts:95-98`) e `undefined` some no JSON. Enviar `null` quando o campo é limpo. **Aceite:** Volume=20 → apagar → salvar → recarregar: campo vazio no banco.

### 3. Ferramenta criada "na hora" já nasce no cliente certo *(confirmado ao vivo: "Novo Sistema" abre com cluster em branco)*
🗣️ **Em português claro:** quando você cria uma **ferramenta/sistema nova no meio do mapeamento**, ela deveria já nascer no **cliente (cluster) do processo** que você está mapeando. Hoje ela nasce "sem cliente" e você escolhe na mão — se errar, o **custo dessa ferramenta vai pro cliente errado** e bagunça o ROI. Com o ajuste, ela já vem no cliente certo.
*Exemplo:* mapeando um processo de "PSA Consultores", você cria "Sistema SPED" na hora; hoje o cliente vem em branco e, se escolher "PSA OSG" por engano, o custo do SPED cai no lugar errado.
🛠️ **Técnico:** `NovoSistemaModal` usa o filtro global (`NovoSistemaModal.tsx:44`); a resolução do vínculo é por cluster (`MapearProcessoPage.tsx:402`). Ao abrir a partir do Mapear, priorizar `procClusterId` (`MapearProcessoPage.tsx:177`). **Aceite:** criar sistema inline num processo do cluster X → Cluster já vem X.

### 4. Botão de excluir processo está quebrado (navega em vez de excluir) *(confirmado ao vivo)*
🗣️ **Em português claro:** na lista de Processos, clicar na **lixeira** de um processo **não abre a confirmação de exclusão** — em vez disso, **abre a tela de Mapear** daquele processo. Ou seja, hoje **não dá pra excluir um processo pela tela** (e ainda há o risco de um clique acidental te jogar pra outra página). O excluir do **projeto** funciona; o do **processo** não.
*Exemplo:* pra apagar o "processo teste", a lixeira só levava pro Mapear; foi preciso apagá-lo por fora da interface.
🛠️ **Técnico:** o clique na lixeira "vaza" para o `onClick` do card (que navega pro `/mapear`), provavelmente por falta de `stopPropagation` no handler do botão de excluir na `ProcessosPage`; a navegação desmonta o diálogo de confirmação antes de ele renderizar. Adicionar `e.stopPropagation()` no handler do excluir (comparar com o card de Projeto, cujo excluir abre `alertdialog` normalmente). **Aceite:** clicar na lixeira do processo abre a confirmação e, ao confirmar, exclui — sem navegar.

---

## 🟡 Prioridade Média — fluxo / robustez

### 5. Dá pra adicionar processo de dentro do projeto (fim do beco sem saída) *(confirmado ao vivo)*
🗣️ **Em português claro:** depois de criar um projeto, quando você abre ele pra começar a trabalhar, as abas **"Processos" e "AS-IS" só dizem "nenhum processo" e não têm botão pra adicionar**. Você é obrigado a sair, ir em outro menu e criar por lá. Com o ajuste, dá pra adicionar o processo **ali mesmo** e já começar a mapear.
*Exemplo:* você cria o projeto "Reorganização Societária", abre pra colocar o 1º processo e trava numa tela que só diz "nenhum processo vinculado".
🛠️ **Técnico:** abas Processos/AS-IS do painel do projeto exibem só o estado vazio. Adicionar um CTA "Adicionar processo"/"Vincular processo" no painel quando vazio. **Aceite:** criar/vincular processo sem sair do painel do projeto.

### 6. Quando o "Salvar todas" falha, dizer qual etapa deu erro
🗣️ **Em português claro:** se der erro ao salvar um processo com **várias etapas**, o aviso é genérico e você não sabe **qual** etapa causou. Com o ajuste, o sistema diz exatamente qual etapa deu problema e você conserta direto.
*Exemplo:* processo com 8 etapas, uma com valor inválido; hoje você revisa as 8 no chute.
🛠️ **Técnico:** `MapearProcessoPage.tsx:405` — erro de persistência genérico. Incluir nome/nº da etapa na mensagem. **Aceite:** forçar erro numa etapa → a mensagem aponta a etapa.

### 7. Garantir que o export do ROI não quebre
🗣️ **Em português claro:** o botão de **exportar o Dashboard de ROI (em PDF)** depende de peças que hoje não estão instaladas no ambiente. Se faltarem, o botão **quebra bem na hora** de gerar o relatório pro cliente. O ajuste garante que o export funcione sempre.
*Exemplo:* o consultor finaliza o ROI, clica "Exportar PDF" pra mandar ao cliente e o botão dá erro.
🛠️ **Técnico:** `html-to-image` e `jspdf` estão no `package.json` mas ausentes no `node_modules`; usados em `src/lib/roiVisualExport.ts`. Rodar `bun install`, conferir o lockfile e testar o export. **Aceite:** export do Dashboard ROI gera o arquivo sem erro.

---

## 🟢 Prioridade Baixa — usabilidade / cosmético

### 8. Deixar visível que dá pra "Cadastrar novo" na hora
🗣️ **Em português claro:** a opção de **cadastrar um sistema/documento/pessoa novo** fica meio escondida: você só acha depois de clicar "Adicionar" e abrir a lista. Muita gente não descobre e deixa em branco. Com o ajuste, fica claro que dá pra criar na hora.
*Exemplo:* na 1ª vez, você precisa do documento "Balancete" que não está cadastrado e não percebe que dá pra criar sem sair da tela.
🛠️ **Técnico:** o "+ Cadastrar novo" vive no rodapé do dropdown (`ChipSelector.tsx:146` + `Select.tsx:253`), atrás de "Adicionar". Expor um botão dedicado. **Aceite:** dá pra criar sem precisar primeiro adicionar uma linha vazia.

### 9. Não deixar linha vazia sobrando ao cancelar *(observado ao vivo)*
🗣️ **Em português claro:** se você clica "Adicionar" num campo e desiste, sobra uma **linha vazia "Selecione..."** que confunde ("tem alguma coisa aqui ou não?"). Com o ajuste, essa linha some sozinha.
*Exemplo:* clica "Adicionar" em Sistemas, cancela o cadastro, e fica uma linha órfã na etapa.
🛠️ **Técnico:** ao cancelar o cadastro inline sem seleção, remover o chip vazio recém-criado (sem dano de dado hoje, `cleanEtapa` filtra, mas polui a UI). **Aceite:** cancelar o cadastro inline não deixa linha órfã.

### 10. Ajustar a seção "Operação" (um campo só)
🗣️ **Em português claro:** a seção **"Operação"** do formulário tem **um campo só**, ocupando bastante espaço à toa. Juntando com outra seção, o formulário fica mais curto e rápido de preencher. (mudança só visual)
*Exemplo:* a cada etapa você rola por um bloco inteiro que tem apenas o campo "Execução".
🛠️ **Técnico:** `MapearProcessoPage.tsx:805-818` — agrupar com Identificação/Métricas ou reequilibrar. **Aceite:** layout mais equilibrado.

---

## ✅ Verificado ao vivo — está OK (não mexer)

- **Cadastro inline sem sair da página (a dor original):** no Mapear → Sistemas → "+ Cadastrar novo sistema", o modal **abre por cima do editor, é clicável**, e ao fechar **o rascunho da etapa é preservado**. O receio de "modais empilhados / z-index" **não se confirmou** — funciona.
- **Cadastro do AS-IS end-to-end:** criar etapa → preencher → "Salvar todas" → recarregar → persiste no banco (confirmado). O card do processo troca de "Mapear" para "Ver detalhes" ao virar mapeado.
- **Excluir projeto** funciona (abre confirmação e apaga). **Salvamento rápido** (~1s); a UI mostra "Salvando...".

## Decisões (não fazer)

- **Auto-select do item criado inline** — avaliado e **descartado** pela Patrícia (2026-07-14). O item criado via "+ Cadastrar novo" **não** entra selecionado automaticamente; o usuário reescolhe na mão. Não reimplementar.
