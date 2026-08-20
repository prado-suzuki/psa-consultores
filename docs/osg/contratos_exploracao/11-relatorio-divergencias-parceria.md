# 11 — Relatório de divergências: Parceria Rural

Leitura completa e direta (sem sub-agente) de todos os arquivos em
`docs/osg/contratos_exploracao/Documentos Agrários/` relativos à Parceria:

- `Contrato Modelo Parceria Benfeitorias não indenizaveis.pdf` (6 páginas)
- `VF_Contrato Modelo Parceria Benfeitorias não indenizaveis.docx` (mesma redação do PDF, confirmado por diff)
- `VF_Contrato Modelo Parceria Benfeitorias não indenizaveis_Com cláusula do Ciclo Completo.docx`
- `VF_Modelo Anexo Único_Parceria.docx`

Cruzado clausula a cláusula contra `src/previews/contratoRuralBlocos.ts` (`BLOCOS_PARCERIA`).

**Achado estrutural prévio:** existem DUAS versões físicas do modelo oficial de
Parceria — uma com a cláusula do "ciclo completo" (pecuária), outra sem. As duas
divergem entre si em vários pontos, não só na cláusula de ciclo completo. O texto do
PDF é idêntico ao do `.docx` sem ciclo completo (diff vazio) — não há divergência
entre PDF e docx do mesmo conteúdo, só entre os dois modelos.

## 1. Gaps de conteúdo — parágrafos inteiros ausentes na nossa transcrição

| # | Cláusula real | Texto que falta no nosso bloco | Onde deveria entrar |
|---|---|---|---|
| 1 | Cláusula Quinta (frutos) | Parágrafo inteiro: *"Os PARCEIROS OUTORGADOS se responsabilizam pela limpeza, beneficiamento e demais operações necessárias a padronização dos frutos a serem pagos à PARCEIRA OUTORGANTE, como também os custos relacionados ao transporte destes produtos até o depósito, armazém, cerealista ou compradora indicada pela PARCEIRA OUTORGANTE. Ademais, não sendo possível o rateio dos frutos, eventual diferença será compensada à PARCEIRA OUTORGANTE em uma das próximas safras[, e se apurada essa diferença na última safra, será paga em pecúnia ou compensada em outros frutos]."* | Entre `par-c5-periodo` e `par-c5-mora` |
| 2 | Cláusula Nona (preferência) | Parágrafo Terceiro: *"A alienação ou ainda a imposição de ônus reais sobre os imóveis objetos de exploração da presente parceria não interromperá a vigência deste instrumento."* | Depois de `par-c9-p2` |
| 3 | Cláusula Décima (devolução dos bens) | Parágrafo Primeiro: *"Competirão aos PARCEIROS OUTORGADOS suportar as despesas decorrentes da manutenção das benfeitorias existentes nesta data edificadas sobre os imóveis até a efetiva devolução dos imóveis à PARCEIRA OUTORGANTE."* — falta também o **Parágrafo Terceiro**: *"Os PARCEIROS OUTORGADOS se obrigam a cumprir, na posse da terra a sua função social e o bem estar coletivo de acordo com os direitos e deveres estabelecidos em lei e nos limites estabelecidos no presente instrumento."* | Antes e depois de `par-c10-p2` (hoje só existe o "p2", sem p1 nem p3 — o próprio nome do bloco já denuncia o buraco) |
| 4 | Cláusula Décima Primeira (uso do solo) | Parágrafo Único inteiro: *"Qualquer penalidade ou ação civil, criminal, trabalhista, tributária e/ou qualquer tipo de indenização pleiteada, seja por ente público ou particular, direcionada aos PARCEIROS OUTORGADOS, por motivo exclusivo de erro, falta, desobediência, negligência ou imprudência deste, serão de sua inteira responsabilidade; devendo aqueles ressarcirem à PARCEIRA OUTORGANTE os eventuais prejuízos que ela for obrigada a suportar por força de atos culposos ou dolosos realizados pelos PARCEIROS OUTORGADOS."* | Depois de `par-c11` |

## 2. Parafraseamento que perde conteúdo específico (não some o parágrafo, mas encolhe o que ele diz)

| Cláusula | Real | Nosso bloco | O que se perde |
|---|---|---|---|
| Segunda, §1º | "...independentemente de notificação **ou interpelação judicial ou extrajudicial**, os imóveis..." | "...independentemente de notificação, os imóveis..." | a ressalva de interpelação judicial/extrajudicial |
| Quarta (despesas) | "...mão de obra, insumos, defensivos, adubos, corretivos de solo, máquinas, **equipamentos**, combustíveis, bem como, **as despesas de aquisição de gado, vermífugos, ração, vacina, sais minerais** e tudo mais que se fizer necessário para a subsistência, manutenção e desenvolvimento dos animais; ressalvadas as despesas expressamente assumidas pela PARCEIRA OUTORGANTE neste instrumento, **incluindo o disposto na Cláusula Sétima**..." | "...máquinas, combustíveis e demais itens necessários à exploração — ressalvadas as despesas do imóvel em si..." | "equipamentos" some da lista; a itemização específica de custo pecuário (gado, vermífugos, ração, vacina, sais minerais) vira "demais itens"; a remissão à Cláusula Sétima desaparece |
| Décima Primeira (uso do solo) | "...proibindo o uso de defensivos não autorizados pelo **Ministério da Agricultura**. [...] para a preservação de **reservas florestais, mananciais, animais, meio ambiente, trabalho escravo, utilização/produção de trabalho ilegal**, invasões de terra, incêndios por queimada..." | "...proibido uso de defensivos não autorizados; respeito a leis ambientais e trabalhistas, sem invasão de terra nem queimadas irregulares." | o órgão específico (Ministério da Agricultura) e a lista literal de bens jurídicos protegidos somem numa generalização |
| Quinta, §5º/6º (mora) | "...os preços apurados pelo **IMEA – Instituto Mato-grossense de Economia e Agropecuária** na praça do foro..." | "...os preços apurados pelo **IMEA** na praça do foro..." | nome completo do índice (cosmético) |

## 3. Divergência entre os DOIS arquivos-fonte (não é erro nosso — é a fonte que diverge)

- **Instrução da Cláusula Primeira sobre o proprietário**: a versão *com* Ciclo Completo diz só "sem os limites e confrontações" (o proprietário pode ser citado); a versão *sem* Ciclo Completo diz explicitamente **"SEM INFORMAR A PROPRIEDADE** e os limites e confrontações". Conferido contra a prática real (`exemplo-02-parceria-bela-vista.md`, contrato assinado): o texto assinado **inclui** "Todos os imóveis são de propriedade de [outorgante]..." na Cláusula Primeira — igual ao que já fazemos. **Conclusão: não é erro nosso** — a versão que seguimos bate com a prática real; só registro que as duas versões do arquivo oficial se contradizem nesse ponto.
- **Ordem/presença dos parágrafos pecuários da Cláusula Quinta**: a versão *com* Ciclo Completo tem 6 parágrafos (cria, recria/engorda, ciclo completo, exercício fiscal, limpeza/transporte, inadimplemento); a versão *sem* tem 5, na ordem recria/engorda, cria, exercício fiscal, limpeza/transporte, inadimplemento. Já sabíamos que isso é "família de blocos com variante, a banca troca de arquivo" (achado de 19/08) — a novidade aqui é só a confirmação exata do texto e da ordem.
- **Testemunha "CPF:" vs "CPF/MF:"**: a versão *com* Ciclo Completo (a que seguimos) usa `CPF:`; a versão *sem* Ciclo Completo usa `CPF/MF:` — igual ao padrão da Composse (ver relatório da Composse, achado 6). Peso da evidência favorece `CPF/MF:`.
- Dois erros de digitação identificados **no próprio arquivo oficial** `.docx` sem Ciclo Completo (não nossos, não replicar): "estarãoá a os PARCEIROS" (deveria ser "estarão os") e "instituições bancáarias" (deveria ser "bancárias").

## 4. Conferido e sem divergência

- PDF vs `.docx` do mesmo conteúdo (sem Ciclo Completo): diff vazio, texto idêntico.
- Cláusulas 6ª, 7ª, 8ª, 12ª, 13ª, 14ª–17ª (anuência/penhor), 15ª–19ª (disposições gerais), 20ª (foro): conteúdo confere com o que já está implementado.
- Cláusula Terceira (culturas): a lista fixa do `.docx` (14 culturas) diverge da lista do contrato assinado real (8 culturas diferentes) — já documentado em `10-conferencia-contra-docx-oficial.md` como prova de que `culturas` é campo por cliente, não texto fixo. Confirmado de novo, sem achado novo aqui.
- Anexo Único: nenhum dos dois `.docx` "Modelo Anexo Único" contém uma tabela Word real (`<w:tbl>` ausente, confirmado por inspeção do XML) — só a frase narrativa de abertura. A tabela de 7 colunas que implementamos foi corretamente extraída do exemplo real assinado (`exemplo-05-anexo-imoveis-bela-vista.md`), não do arquivo em branco — não é erro, mas o rótulo da coluna no exemplo real é **"Área total do imóvel"**, e o nosso bloco usa só **"Área total"** (cosmético).
