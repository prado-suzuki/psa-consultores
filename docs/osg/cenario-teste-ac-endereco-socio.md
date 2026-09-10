# Cenário de teste: alteração contratual por endereço de sócio

Montado em 10/09/2026 no **sandbox** (`vgzomuwnsdgrxbkyoavq`), cliente
`[TESTE] Furão Notário Cartório Subterrâneo S.A.`. Serve para exercitar à mão o
fluxo entregue nos commits `d6e55f66` … `3fd453b0`.

Nada aqui existe em produção. O registro da montagem, com a qualificação
completa de cada parte, está em `e2e/dados/cenario-ac-furao-notario.json`.

## A regra que organiza tudo: uma AC por peça, e sem desfazer

Confirmar o assistente **cria** a alteração e **consome** o botão "Gerar
alteração contratual" daquela peça registrada: a botoeira passa a ser "Rever os
eventos". Não há excluir na tela (`travaDaSucessao.ts` impede a segunda AC
nascer da mesma peça, e o app nunca deleta `documento_gerado`).

Isso NÃO limita o teste, desde que se saiba a ordem:

- **Abrir o assistente e cancelar não grava nada.** Dá para conferir detecção,
  evidência, tabela e pendências quantas vezes quiser, de graça.
- Depois de confirmar, **"Rever os eventos" reabre e reconfirma**. Mudar o
  cadastro e revisar é o caminho para testar os outros ramos.
- O que não se repete é a experiência de *primeira* AC. Para isso é preciso
  outra sociedade registrada — há 53 clientes `dev` vazios no sandbox.

## As sociedades

| | Para quê |
| --- | --- |
| **`[TESTE] Cofre Subterrâneo Guarda de Acervos Ltda`** | **A sua.** Contrato social registrado, nenhuma AC em cima. |
| `[TESTE] Toca Notarial Registros Subterrâneos Ltda` | Gêmea, já consumida pelo ensaio de montagem. Não usar. |

`Cofre Subterrâneo`: CNPJ 66.331.122/0001-79, NIRE 51900000789, capital
**R$ 1.000.000,00** em 1.000.000 de quotas de R$ 1,00. Registro: protocolo
21/300146-1, arquivamento 20210325002, JUCEMT/MT, 25/03/2021.

O milhão redondo é de propósito: é o caso do fix mais recente, então o contrato
já sai com "um milhão de reais" em vez de "um milhão reais".

## O quadro, e o motivo de cada parte

| Parte | Quotas | Papel | Existe para testar |
| --- | --- | --- | --- |
| **Nivaldo Tabosa Furtado** · CPF 307.448.200-14 | 500.000 | sócio **e administrador** | singular masculino, e o endereço chegando na cláusula de administração |
| **Marlene Furtado Cavalcanti** · CPF 518.629.371-76 | 300.000 | sócia **e administradora** | singular feminino, e o plural junto com o Nivaldo |
| **[TESTE] Galeria Profunda Participações Ltda** · CNPJ 55.887.799/0001-71 | 200.000 | sócia PJ | o caso que **não** homologa: tem de virar pendência, não evento |

Endereços **como estão agora** no cadastro (é o que a peça registrada publicou):

- **Nivaldo** — Rua Barão de Melgaço, n.º 1200, Sala 3, Centro Sul, Cuiabá/MT, CEP 78020-800
- **Marlene** — Rua Joaquim Murtinho, n.º 450, Apto 702, Centro Norte, Cuiabá/MT, CEP 78010-100
- **Galeria Profunda** — Avenida Fernando Corrêa da Costa, n.º 3000, Sala 12, Coxipó, Cuiabá/MT, CEP 78090-000

## Os caminhos

**Mudar endereço:** Qualificação das Partes → lápis na linha da pessoa → bloco
CEP/Logradouro/Número/Complemento/Bairro/Município/UF → "Salvar alterações".
Preencha o **CEP primeiro e espere**: a busca automática sobrescreve os outros
campos uns 2 segundos depois.

**Abrir o assistente:** Gerar Documento → cliente `[TESTE] Furão Notário…` →
modelo `Contrato Social - (Participações)` → sociedade
`[TESTE] Cofre Subterrâneo…` → aba `Conferência` → `Gerar alteração contratual`.

## Roteiro

Os cinco primeiros passos não gravam nada: são abrir e cancelar.

### 1. Nada mudou, nada é oferecido
Abra o assistente com o cadastro intocado. O evento "Houve mudança de endereço
de sócio pessoa física" tem de estar **desligado**, com "nada no cadastro
registra este evento". Cancele.

### 2. Um sócio homem
Troque o endereço do **Nivaldo**. Abra o assistente. Esperado:
- o interruptor **nasce ligado**, e a causa já vem em "Mudança de domicílio";
- a evidência diz `Endereço de Nivaldo Tabosa Furtado: <antigo> -> <novo>`;
- "Ver antes e depois, sócio a sócio" abre uma tabela com uma linha.

Cancele e confira que nada foi gravado.

### 3. A sócia PJ não entra
Devolva o Nivaldo e troque o endereço da **Galeria Profunda**. Esperado: os sete
interruptores desligados, e a divergência aparecendo em "Divergências que não
viram evento nesta peça" com o texto *"só o endereço de sócio pessoa física está
homologado"*. Cancele e devolva.

### 4. Endereço e profissão juntos
Troque o endereço **e** a profissão do Nivaldo (Tabelião → outra coisa).
Esperado: **dois** itens — o endereço como evento ligado, e a profissão como
pendência separada, sem interruptor. Cancele.

### 5. Correção de erro material bloqueia
Com o endereço do Nivaldo trocado, abra e escolha a causa "Correção de erro do
instrumento anterior". O botão de confirmar tem de ficar **desabilitado**, com o
motivo escrito. Cancele.

### 6. Gerar de verdade (a partir daqui grava)
Volte a profissão ao original, deixe só o endereço do Nivaldo trocado, escolha
"Mudança de domicílio" e confirme. No documento:
- a resolução é a **primeira**, antes da cláusula primeira;
- `Altera-se a qualificação do sócio NIVALDO TABOSA FURTADO, para fazer constar
  o atual endereço deste`;
- o endereço novo aparece na qualificação reproduzida **e no consolidado**;
- **e também na cláusula de administração** — é o defeito da primeira rodada de
  QA, e o lugar onde ele reaparecia.

Baixe o `.docx` e confira no arquivo, não só na prévia.

### 7. Plural, por "Rever os eventos"
Troque também o endereço da **Marlene** e use "Rever os eventos". Esperado:
`Alteram-se as qualificações dos sócios NIVALDO TABOSA FURTADO e MARLENE
FURTADO CAVALCANTI, para fazer constar os atuais endereços destes`.

### 8. Causa postal
Reveja os eventos e troque a causa para "Atualização postal". A resolução passa
a abrir com `Em decorrência da atualização do Código de Endereçamento Postal —
CEP, alteram-se as qualificações…`, com o verbo em minúscula.

**Recarregue a página (F5) e baixe o .docx de novo.** Este passo é o que pegou
um defeito real: a abertura sumia depois do reload e nunca chegava ao arquivo.

### 9. Só a mulher (opcional)
Devolva o endereço do Nivaldo e reveja: `Altera-se a qualificação da sócia
MARLENE FURTADO CAVALCANTI … o atual endereço desta`.

## Ruído esperado, que não é defeito

- O diálogo mostra sempre, mesmo com cadastro intocado, linhas do tipo
  *"Atual/Base: qualificacao sem id estavel; CPF/CNPJ nao concilia identidade"*.
  Vem de ocorrências do snapshot que não carregam id (administrador, signatário);
  é ruído conhecido, não impede nada.
- Os campos de "Preencher à mão" (data de assinatura, testemunhas) **só gravam
  se a versão for validada na mesma sessão**. Sem isso o `.docx` sai marcado
  como rascunho.
- O `.docx` da alteração sai como rascunho enquanto a versão não for validada.

## O que este cenário NÃO cobre

- **Aumento de capital, cessão e retirada**: o quadro está estático de propósito.
- **A cláusula de integralização vazia no caminho de cessão**, que está
  aguardando decisão de produto.
- **`1.000.000 (um milhão) de quotas`**: hoje sai sem o "de", porque a
  preposição teria de vir do modelo e são nove blocos do catálogo. Decisão
  pendente; nas quotas o texto atual é o de sempre.
