-- ============================================================
-- Importação do histórico de chamados legados
-- ============================================================
-- Gerado a partir de Chamados_legado_todoperiodo_-_Chamados_2.csv
-- Total de linhas no CSV         : 290
-- Inseridas em tickets           : 13
-- Puladas (email/data inválida)  : 277
-- Aliases de email aplicados     : 0
--   simonecavalcante@agrocataratas.com.br -> luisfernando@agrocataratas.com.br
-- Responsáveis sem profile (fallback Maria Lizot): 0
--   Claudionor Ferreira, Matheus Lopes, Mateus Parente,
--   Willian Lima, Prado Suporte, prado_administrador
--
-- Todos os tickets entram com status='resolvido' (legados,
-- já concluídos antes da migração).
-- Sem alteração de schema, sem webhook n8n.
-- Reversão: aplicar arquivo *_revert_legacy_tickets.sql.disabled
-- (renomear para .sql) que faz DELETE pelos UUIDs explícitos.
-- ============================================================

INSERT INTO public.tickets
  (id, user_id, cliente_id, assigned_to, title, description, department,
   status, activity_status, priority, created_at, updated_at)
VALUES
  ('168dd63a-d70a-47cb-be1a-6ddff59ee280'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, 'ec8c2f0e-6999-4387-8417-c617a728b428'::uuid, 'Atualização de mapeamento – Estado do Piauí (ICMS/DIFAL)', '[ Contabilidade Tecnomyl | 24/03/2026 às 11:47 ]
Bom dia, tudo bem?
Solicitamos, por gentileza, a atualização do mapeamento de obrigações acessórias estaduais, bem como do mapeamento de tributação de ICMS (DIFAL), com a inclusão do estado do Piauí.
Adicionalmente, pedimos a verificação quanto à existência de exigências específicas para esse estado, especialmente no que se refere a:
Emissão de documentos fiscais;
Destaque de impostos;
Regras de recolhimento.
Por fim, solicitamos informar:
O código de receita para recolhimento de ICMS via apuração;
O código de receita aplicável ao recolhimento do DIFAL.

[ANEXO]: Mapeamento-de-Obrigacao_Acessorias_Estadual_Atualizado-em-04.2025.xlsx (82K)
[ANEXO]: Mapeamento-de-Tributacao_ICMS_DIFAL_Atualizado-em-06.2025.xlsx (68K)', NULL, 'resolvido', 'resolvido', 'media', '2026-03-24 14:47:00+00', '2026-03-24 14:47:00+00'),
  ('1a241369-5008-4036-8b84-60a7b1d9f235'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'Notificação SEFAZ-SP – Orientação sobre NF-e não escriturada e crédito indevido de ICMS (CT-e)', '[ Contabilidade Tecnomyl | 23/03/2026 às 17:18 ]
Boa tarde, tudo bem?
Recebemos uma notificação fiscal da SEFAZ-SP, referente ao CNPJ 05.280.269/0004-35 e IE 513.154.432.110, a qual foi baixada em 09/12/2025, e hoje a filial está ativa com a IE 298.576.760.115, com o seguinte teor:
“Fica o contribuinte notificado a apresentar os seguintes documentos ou informações, relativos ao período de 01/01/2022 a 31/12/2023:
Informar se a NF-e constante no ANEXO I foi escriturada, visto a sua não localização na Escrituração Fiscal Digital;
Informar a base legal para o crédito de ICMS oriundo dos serviços de transporte constante no ANEXO II, visto que as NF-e das operações associadas (entrada e saída) são amparadas por isenção.
Prazo para atendimento: 10 (dez) dias, a contar da ciência desta.
Base Legal: Artigos 494 e 497 do RICMS (Decreto 45.490/00).”
Em análise interna, identificamos os seguintes pontos:
ANEXO I: trata-se de uma nota fiscal de devolução que não foi escriturada. Além disso, não houve manifestação de “desconhecimento” ou “recusa” da operação, constando apenas o evento de ciência da emissão.
ANEXO II: refere-se a um CT-e devidamente escriturado, no qual foi apropriado crédito de ICMS no valor de R$ 643,70. Contudo, entendemos que o crédito é indevido, uma vez que a operação vinculada trata-se de importação amparada por isenção de ICMS.
Ambos os arquivos seguem anexados, ANEXO I  e ANEXO II.
Diante do exposto, solicitamos orientação sobre como proceder no atendimento à notificação, considerando:
a ausência de manifestação adequada em relação à NF-e de devolução; e
a apropriação indevida de crédito de ICMS no CT-e.
Ficamos no aguardo das orientações para adoção dos procedimentos corretivos e resposta ao fisco.

[ANEXO]: ANEXO_I.pdf (8K)
[ANEXO]: ANEXO_II.pdf (1M)

[ Diego Melo | 31/03/2026 às 18:21 ]
[SISTEMA]: Chamado fechado.

[ Diego Melo | 31/03/2026 às 18:21 ]
Boa tarde!
Tudo bem?
Nesse caso, como já houve retorno da SEFAZ/SP, entendemos que a resposta deve apenas informar o ocorrido em relação aos demais conhecimentos de transporte, seguindo o mesmo procedimento adotado no CTe nº 1094. Contudo, não deverá ser efetuado qualquer recolhimento ou retificação do EFD neste momento, devendo-se aguardar o posicionamento oficial da SEFAZ/SP.
Quanto à atualização de juros e multas, segue a planilha contendo uma prévia da atualização até a data atual.
Lembrando que esse cálculo não considera os valores em auto de infração, sendo que dependerá da análise do Fisco do Estado de São Paulo.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo.

CTEs-notificacao-FL04-SPtjlio1i71774984121.xlsx

[ Contabilidade Tecnomyl | 31/03/2026 às 16:08 ]
Boa tarde, tudo bem?
Em atenção à notificação da SEFAZ-SP, realizamos a resposta conforme orientação inicial e efetuamos o recolhimento do ICMS referente ao CT-e que havia sido creditado indevidamente.
Entretanto, recebemos o seguinte retorno da fiscalização:
“A ciência da notificação fiscal interrompe o benefício da denúncia espontânea (Art. 138 do CTN; Arts. 529 e 533 do RICMS/SP). A partir desse marco, qualquer irregularidade relativa ao imposto não pode mais ser sanada voluntariamente para evitar multas punitivas, uma vez que o procedimento de fiscalização já se encontra instaurado.
Foi reenviado, anexado a este e-mail, o ANEXO II da notificação. Na resposta enviada pelo contribuinte, somente foi citado o caso do CT-e 138667/NF-e 1094. No anexo, há outros CT-es.”
Em análise ao Anexo II reenviado, identificamos 17 CT-es (e não 22, conforme mencionado), os quais foram devidamente planilhados e analisados internamente. Verificamos que todos os casos se referem à mesma natureza de inconsistência: crédito indevido de ICMS, considerando que as NF-e vinculadas tratam de operações isentas ou não tributadas (CST 40 e 41).
Diante disso, entendemos que os créditos foram apropriados indevidamente. Contudo, considerando que já houve ciência da notificação e que o processo se encontra sob fiscalização, temos dúvida quanto ao procedimento correto a ser adotado neste momento.
Ressaltamos que já realizamos o recolhimento do ICMS referente a um dos casos, porém entendemos que pode não ser o procedimento mais adequado diante do cenário atual.
Adicionalmente, encaminharemos em anexo a planilha contendo todos os CT-es constantes no Anexo II, com os respectivos valores de ICMS identificados. Solicitamos, por gentileza, o apoio no cálculo de uma estimativa dos valores atualizados, considerando multa e juros aplicáveis, para fins de avaliação de impacto.
Dessa forma, solicitamos orientação quanto:
à forma correta de tratamento dos demais CT-es identificados;
à necessidade (ou não) de recolhimentos adicionais neste momento;
à estimativa dos valores atualizados com encargos legais;
e à melhor forma de elaboração da resposta à SEFAZ, considerando o cenário de fiscalização já instaurada.
Ficamos no aguardo das orientações para prosseguirmos de forma adequada.

CTEs-notificacao-FL04-SP.xlsx
ANEXO_II-1.pdf

[ Contabilidade Tecnomyl | 31/03/2026 às 16:02 ]
[SISTEMA]: Chamado reaberto.

[ Diego Melo | 27/03/2026 às 17:58 ]
[SISTEMA]: Chamado fechado.

[ Contabilidade Tecnomyl | 27/03/2026 às 08:02 ]
[SISTEMA]: Chamado reaberto.

[ Diego Melo | 26/03/2026 às 18:30 ]
[SISTEMA]: Chamado fechado.

[ Diego Melo | 26/03/2026 às 18:30 ]
Boa tarde,
Tudo bem!
Conforme análise efetuada, diante da notificação da SEFAZ-SP e da análise interna que vocês já realizaram, o caminho mais adequado é preparar uma resposta formal dentro do prazo de 10 dias, esclarecendo os dois pontos levantados:
1. NF-e de devolução (ANEXO I):
Reconhecer que a nota fiscal não foi devidamente escriturada na EFD.
Informar que houve apenas o evento de ciência da emissão, sem manifestação de desconhecimento ou recusa.
Corrigir a escrituração, se ainda possível, ou justificar a falha, demonstrando que não houve intenção de omitir a operação. Ou, se ainda puder comprovar que a operação não ocorreu, por meio de outros documentos.3
Apresentar a documentação comprobatória da regularização sobre a operação de devolução (a própria NF-e e eventuais documentos internos que evidenciem a devolução).
2. CT-e com crédito indevido (ANEXO II):
Informar que o CT-e foi escriturado e que houve apropriação de crédito de ICMS no valor de R$ 643,70.
Reconhecer que, após análise, o crédito é indevido, pois a operação vinculada (importação) é amparada por isenção de ICMS.
Demonstrar a correção: retificação da escrituração ou estorno do crédito indevido.
Se for o caso, efetuar o recolhimento do ICMS referente a apropriação indevida com as devidas correções e juros.
3. Resposta à SEFAZ:
Redigir manifestação clara e objetiva, abordando cada ponto do termo de notificação.
Anexar os documentos solicitados (NF-e e CT-e) e comprovar as correções/retificações realizadas.
Reforçar o compromisso que a empresa está em conformidade fiscal e a sua escrituração está correta.
Observação importante
O prazo de 10 dias é contado da ciência da notificação. Portanto, é essencial protocolar a resposta dentro desse prazo, mesmo que as correções ainda estejam em andamento — nesse caso, informar que já foram iniciadas e apresentar os comprovantes disponíveis.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo.

[ Contabilidade Tecnomyl | 26/03/2026 às 10:58 ]
Boa tarde, tudo sim e vc?
Não recebemos a mercadoria, não tivemos conhecimento da emissão dessa nota.

[ Diego Melo | 24/03/2026 às 14:40 ]
Boa tarde,
Tudo bem?
Sobre a nota fiscal de devolução não escriturada, a Tecnomyl recebeu a mercadoria ou teve conhecimento da emissão dessa nota fiscal de alguma forma?

[ Ricardo Migueis | 24/03/2026 às 08:15 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 24/03/2026 às 08:15 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo', NULL, 'resolvido', 'resolvido', 'media', '2026-03-23 20:18:00+00', '2026-03-31 21:21:51+00'),
  ('11fd5bc8-ddc1-45ce-a947-3b91f32289ab'::uuid, '756cfd61-a763-4624-9f1a-f04f2e787cc1'::uuid, 'de202952-beac-40a0-96dd-024b689dbb48'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'PARCELAMENTO DIFAL COMPRA IMOBILIZADO', '[ Marcela Rech | 23/03/2026 às 15:50 ]
Boa tarde, foi feito compra de caminhão para compor o ativo imobilizado do Estado do Paraná e vamos fazer o parcelamento em 10x do diferencial de alíquota, Estamos com dúvida do cálculo, temos a informação que aplicamos a redução de 70,59 % na base de cálculo, que totalizando dá um percentual de 6,446%, essas informações estão corretas? Em anexo documentação para análise OBS: nas compras anteriores usávamos um porcentual de 5%.

[ANEXO]: CALCULO-ICMS-DIFERENCIAL-DE-ALIQUOTAS-NF-VOLVO.xlsx (71K)

[ Diego Melo | 24/03/2026 às 11:53 ]
Bom dia,
Conforme dispõe o § 3º do artigo 41 do Anexo VII do RICMS/MT, o contribuinte deve recolher 10% (dez por cento) do valor do imposto até o último dia útil do mês em que ocorrer a aquisição do veículo. O saldo remanescente, correspondente a 90% (noventa por cento), será diferido até o último dia útil do 9º (nono) mês subsequente à aquisição, reduzindo-se gradualmente em percentual fixo à medida que se amplia o prazo do diferimento.
Dessa forma, entende-se que não há exigência de recolhimento imediato da primeira parcela para fins de trânsito dos veículos, bastando que o pagamento seja efetuado dentro do prazo legal estabelecido.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo.

[ Diego Melo | 24/03/2026 às 11:53 ]
[SISTEMA]: Chamado fechado.

[ Marcela Rech | 24/03/2026 às 11:44 ]
Bom dia,
Os veículos estão saindo do Estado do Paraná com destino a Mato Grosso. Junto com os documentos, seguem a guia e o comprovante de pagamento da primeira parcela. É necessário que eles circulem também com o protocolo do pedido de parcelamento do diferencial, a fim de evitar multas nos postos fiscais, ou apenas a guia e o comprovante pago já são suficientes?

[ Marcela Rech | 24/03/2026 às 11:38 ]
[SISTEMA]: Chamado reaberto.

[ Diego Melo | 24/03/2026 às 08:36 ]
Bom dia,
Conforme a análise realizada, verificou-se que o cálculo constante na planilha está incorreto. Ressalta-se que, até 1º/01/2024, o cálculo do ICMS relativo ao Diferencial de Alíquotas deve observar o disposto no § 8º do artigo 2º, inciso IX do artigo 71, combinado com o artigo 96, inciso II e § 1º.
Em síntese, o valor do imposto a recolher corresponde à aplicação da diferença entre a alíquota interna e a interestadual sobre a base de cálculo da operação ou prestação, já tributada na unidade federada de origem.
Segue planilha de cálculo do DIFAL.
Atenciosamente,
Diego Correia de Melo.

DIFAL-NF-185181.xlsx

[ Diego Melo | 24/03/2026 às 08:36 ]
[SISTEMA]: Chamado fechado.

[ Ricardo Migueis | 24/03/2026 às 08:16 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 24/03/2026 às 08:16 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo', NULL, 'resolvido', 'resolvido', 'media', '2026-03-23 18:50:00+00', '2026-03-24 14:53:22+00'),
  ('1d136af0-fb39-49a6-b005-f018e330b30b'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, '4a57f82f-8532-47a9-b471-6951072a66f4'::uuid, 'Avaliação de impactos fiscais e operacionais-PARCERIA TECNOMYL X INSTITUTO TRIANGULO MINEIRO', '[ Contabilidade Tecnomyl | 23/03/2026 às 13:57 ]
Prezados, boa tarde,
Estamos avaliando a possibilidade de estabelecer uma parceria entre a TECNOMYL e o Instituto Federal do Triângulo Mineiro (IFTM), localizado em Uberaba-MG.
A proposta consiste na utilização dos laboratórios da instituição para realização de testes voltados à homologação de fornecedores. Por se tratar de uma instituição pública, o IFTM não pode receber repasses financeiros diretos. Dessa forma, a contrapartida da TECNOMYL seria realizada por meio da doação de equipamentos e vidrarias ao instituto. Com isso, teríamos acesso tanto aos equipamentos doados quanto à estrutura já existente no laboratório.
Do ponto de vista operacional, essa parceria pode gerar benefícios relevantes, como:
Redução de custos com análises laboratoriais e sigilo nas informações, visto que hoje, os concorrentes utilizam laboratorios parceiros,
Maior proximidade e acompanhamento na execução dos testes;
Apoio local, considerando que nosso consultor reside em Uberaba e será responsável pelas análises.
Diante disso, solicitamos apoio para avaliação dos seguintes pontos:
1. Impactos fiscais e tributários
Incidência de tributos na doação dos equipamentos (ICMS, PIS, COFINS, etc.);
Necessidade de emissão de nota fiscal de doação e CFOP adequado; deverá ser adquirido pelo CNPJ do laboratorio ( PR) ou poderá ser adquirido pela Estação experimental em MG?
Eventuais créditos ou estornos fiscais relacionados à operação;
Tratamento fiscal da utilização dos equipamentos em ambiente de terceiros.
2. Procedimentos operacionais e contábeis
Forma correta de aquisição dos equipamentos destinados à doação (ativo imobilizado x despesa);
Tratamento contábil da doação;
Possibilidade de caracterização como investimento ou despesa operacional.
3. Lei do Bem (Lei nº 11.196/2005)
Verificar se os valores investidos (aquisição dos equipamentos e estrutura) podem ser enquadrados como dispêndios elegíveis;
Requisitos necessários para caracterização como projeto de P&D;
Riscos ou limitações por envolver instituição pública e doação de ativos.
4. Documentação e formalização
Estrutura recomendada para formalização da parceria (convênio, acordo de cooperação, etc.);
Exigências legais e fiscais para esse tipo de operação.
Em anexo , segue a estimativa dos equipamentos e vidrarias a serem doados para análise.
Ficamos no aguardo das orientações para seguirmos com a estruturação da parceria de forma segura do ponto de vista fiscal e contábil.

Doacao-IFTM.png

[ Marcely Arruda | 31/03/2026 às 12:27 ]
[SISTEMA]: Chamado fechado.

[ Marcely Arruda | 31/03/2026 às 12:27 ]
Bom dia,
Segue anexo estudo relativo ao tema acima questionado.
Atenciosamente,

Estudo_Tecnomyl_Analise-de-Parceria-Publico-Privada.pdf

[ Marcely Arruda | 30/03/2026 às 11:45 ]
Bom dia,
O material encontra-se em fase de revisão e ajustes finais. O envio está previsto para ocorrer ainda nesta semana.
Atenciosamente,

[ Contabilidade Tecnomyl | 30/03/2026 às 11:37 ]
Bom dia,
Algum retorno sobre este questionamento?

[ Ricardo Migueis | 23/03/2026 às 14:13 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 23/03/2026 às 14:13 ]
[SISTEMA]: Representante atribuído ➔ Marcely Arruda', NULL, 'resolvido', 'resolvido', 'media', '2026-03-23 16:57:00+00', '2026-03-31 15:27:16+00'),
  ('b95b4068-20b9-4181-8b8c-afa36d66919b'::uuid, '0f347b7a-76ac-4a02-b8fc-72f7c80536ae'::uuid, '18cbce75-df5a-486b-8e25-d4939995b955'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'CARTA RENÚNICA EMITIDA PELA TRADING', '[ Alined Deon | 18/03/2026 às 16:13 ]
Boa tarde! Em nossos contratos de venda com a Trading COFCO, foi emitida nota com valor fiscal maio que o físico entregue. No entanto a Trading anuncia que não emite devolução simbólica para PJ comércio apenas para produtor PF e PJ. Para Paiol PJ comerciante emite uma carta renúncia, a mesa esta anexo com a legislação que eles apresentam. nesse sentindo, precisamos entender: 1 ) Esta amparado pela legislação a carta renúncia? 2) A Paiol precisa aceitar outro documento senão a devolução simbólica para corrigir a parte fiscal ? 3) Se for necessário aceitar, a Paiol precisa realizar a entrada própria com item de ajuste para ajustar e ainda recolher o ICMS como interrupção do Diferimento? Por fim, precisamos entender o procedimento nesse sentido.

[ANEXO]: CARTA-RENUNCIA-CTR-180945-2414-5107328768.pdf (187K)

[ Diego Melo | 20/03/2026 às 15:15 ]
[SISTEMA]: Chamado fechado.

[ Diego Melo | 20/03/2026 às 15:15 ]
Boa tarde, Aline.
Tudo bem?
Conforme análise efetuada da situação exposta, inicialmente cabe considerar que no Estado de Mato Grosso não há previsão legal para emissão de Carta Renúncia.
Assim, considerando o disposto, deverá ser analisado a possibilidade de considerar o artigo 10-B do Decreto nº 1.261/2000, que dispõe:
Art. 10-B Nas entradas de soja e milho em grãos, o estabelecimento mato-grossense destinatário, na hipótese em que houver desconto de peso em virtude de classificação por excesso de umidade e/ou impurezas, deverá:
I – emitir uma Nota Fiscal Eletrônica – NF-e de saída para fins de devolução simbólica do peso relativo à quantidade descontada em virtude do excesso de umidade e/ou impurezas verificadas;
II – registrar em sua Escrituração Fiscal Digital – EFD a Nota Fiscal que acobertou a entrada do produto, bem como a emitida nos termos do inciso I deste artigo.
Portanto, a operação se enquadrando no disposto do referido artigo, deverá emitir NF-e de devolução simbólica, no que se refere à diferença de peso verificada no momento da entrega.
Lembrando, que deverá analisar as condições de aplicabilidade desse artigo.
Sendo que não há outra previsão legal para emissão de devolução simbólica, além da citada acima.
Em caso de dúvidas estamos à disposição.
Diego Correia de Melo.

[ Ricardo Migueis | 19/03/2026 às 08:31 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 19/03/2026 às 08:31 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo

[ Alined Deon | 18/03/2026 às 16:40 ]
A fim de registro, nosso entendimento é que Não é possível acatar a carta de renúncia para fins fiscais, pois não houve retorno físico da mercadoria.
Para regularização fiscal da operação, é necessário procedimento formal conforme legislação (devolução com NF simbólica, dentro do prazo estabelecido).
A carta pode ser considerada apenas para fins contratuais/financeiros.', NULL, 'resolvido', 'resolvido', 'media', '2026-03-18 19:13:00+00', '2026-03-20 18:15:57+00'),
  ('01001056-b2e9-4685-a002-66369ddee311'::uuid, '756cfd61-a763-4624-9f1a-f04f2e787cc1'::uuid, 'de202952-beac-40a0-96dd-024b689dbb48'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'SPED ICMS IPI', '[ Marcela Rech | 17/03/2026 às 12:20 ]
Bom dia, seria referente PVA SPED ICMS IPI de SP, aonde no bloco 111 e bloco 110 e bloco 116, está constando erro, poderia informa qual procedimento correto a seguir, vou está enviando arquivo no e-mail para conferência.

[ Diego Melo | 19/03/2026 às 07:56 ]
[SISTEMA]: Chamado fechado.

[ Marcela Rech | 18/03/2026 às 14:21 ]
[SISTEMA]: Chamado reaberto.

[ Diego Melo | 18/03/2026 às 10:18 ]
Bom dia!
Tudo bem?
Conforme resposta encaminhada no e-mail, esse chamado será finalizado.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo.

[ Diego Melo | 18/03/2026 às 10:18 ]
[SISTEMA]: Chamado fechado.

[ Diego Melo | 17/03/2026 às 15:06 ]
Boa tarde,
Em qual e-mail foi encaminhado o arquivo do EFD ICMS/IPI?

[ Ricardo Migueis | 17/03/2026 às 14:25 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 17/03/2026 às 14:25 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo', NULL, 'resolvido', 'resolvido', 'media', '2026-03-17 15:20:00+00', '2026-03-19 10:56:44+00'),
  ('39286ec3-5c12-4573-a023-75827102a4fc'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, '9682a160-3eb7-40da-a390-25d5f4bc4adb'::uuid, 'Crédito de PIS/COFINS e ICMS em CT-e com múltiplos documentos referenciados', '[ Contabilidade Tecnomyl | 12/03/2026 às 15:39 ]
Boa tarde, tudo bem?
Gostaríamos de esclarecer um ponto referente ao processo de escrituração de CT-e e à apropriação de créditos de PIS, COFINS e ICMS.
Atualmente, quando escrituramos um CT-e, verificamos a nota fiscal referenciada para validar se o documento gera direito a crédito. Nosso procedimento é o seguinte:
Quando o CT-e está vinculado a nota fiscal de venda, consideramos o crédito de PIS/COFINS e ICMS.
Quando está vinculado a nota fiscal de despesa, não consideramos o crédito.
Entretanto, identificamos situações em que um mesmo CT-e possui mais de um documento referenciado, sendo:
uma nota de venda (com direito a crédito), e
uma nota de despesa (sem direito a crédito).
Nesses casos, o sistema atualmente considera apenas um dos documentos vinculados (o primeiro identificado) para definição do creditamento.
Diante disso, gostaríamos de orientação quanto ao procedimento correto:
Devemos apropriar o crédito de forma proporcional (por valor ou peso) considerando apenas a parcela do frete vinculada ao documento que gera direito a crédito?
É permitido considerar apenas um dos documentos vinculados para fins de crédito?
Ou devemos desconsiderar o crédito integralmente nesses casos?
Qual seria a forma correta de refletir essa situação na escrituração do SPED (EFD Contribuições / EFD ICMS-IPI)?
Agradecemos desde já o apoio para alinharmos o procedimento de forma correta.

[ Gabriel Gama | 30/03/2026 às 11:58 ]
Prezados, bom dia!
Encaminho as orientações pertinentes ao reconhecimento dos créditos relativos à contratação de fretes. Informo que o critério estabelecido aplica-se, simultaneamente, ao PIS/Pasep, à Cofins e ao ICMS.
1. Devemos apropriar o crédito de forma proporcional (por valor ou peso) considerando apenas a parcela do frete vinculada ao documento que gera direito a crédito?
Sim. Conforme previsto no artigo 174 da Instrução Normativa RFB nº 2.121/2022, os valores pagos relativos à contratação de fretes e seguros, quando suportado pelo adquirente, integrará a base do crédito das contribuições para o PIS e para a Cofins.
Desta forma, na situação em que um mesmo documento fiscal contemple frete vinculado simultaneamente a operações que geram direito a crédito e a operação que não geram, embora não haja previsão expressa sobre o procedimento, entende-se que a pessoa jurídica deve segregar os valores proporcionalmente.
2. É permitido considerar apenas um dos documentos vinculados para fins de crédito? ou devemos desconsiderar o crédito integralmente nesses casos?
Não. a apropriação dos créditos deve recair exclusivamente sobre a parcela do frete vinculada às operações que permitem o creditamento, com a devida escrituração na EFD-Contribuições.
3. Qual seria a forma correta de refletir essa situação na escrituração do SPED (EFD Contribuições / EFD ICMS-IPI)?
De acordo com o Guia Prático da EFD Contribuições (Versão 1.35), os documentos relativos a fretes contratados devem ser informados no Registro D100, preenchendo os campos conforme o documento fiscal (CT-e).
Nos Registros D101/D105 (Complemento do Documento de Transporte) serão escrituradas as informações referentes a base de cálculo, alíquota e valor do crédito de PIS/Pasep e Cofins. Sendo:
No campo 03 (Valor total dos itens) – deve ser informado o valor do documento fiscal e;
No campo 06 (Valor da base de cálculo do PIS/Cofins) – deverá ser informado o valor da parcela do frete vinculada às operações que permitem o creditamento.
Atenciosamente,
Gabriel Gama

[ Gabriel Gama | 30/03/2026 às 11:58 ]
[SISTEMA]: Chamado fechado.

[ Ricardo Migueis | 13/03/2026 às 08:21 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 13/03/2026 às 08:21 ]
[SISTEMA]: Representante atribuído ➔ Gabriel Gama', NULL, 'resolvido', 'resolvido', 'media', '2026-03-12 18:39:00+00', '2026-03-30 14:58:28+00'),
  ('45d9af3f-b34f-4fbf-a714-ceafc677c2f8'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, '7d082ece-6710-4148-9bcb-e76287380319'::uuid, 'Contabilização de cotas de investimentos FIDC', '[ Contabilidade Tecnomyl | 10/03/2026 às 15:51 ]
Boa tarde,
A Tecnomyl adquiriu cotas mezanino de um Fundo de Investimento em Direitos Creditórios (FIDC). A dúvida é quanto ao tratamento contábil dessa aquisição, especificamente se as cotas devem ser classificadas como investimentos ou como aplicações financeiras de longo prazo.
Além disso, a cláusula 8.7 do regulamento estabelece que a valorização das cotas não constitui promessa de rendimentos. Nesse contexto, surge também a questão sobre como essa valorização deve ser reconhecida contabilmente e se ela deve impactar o resultado do período. Em anexo o contrato para análise.

[ANEXO]: 6903b8969487ee1b3644d195_Regulamento_Regulamento_03_02_2026_1770230618941-2.pdf (4M)

[ Geizi Andrade | 13/03/2026 às 12:25 ]
Prezados, bom dia!
Tudo bem?
Abaixo segue a resposta do questionamento.
A Tecnomyl adquiriu cotas mezanino de um Fundo de Investimento em Direitos Creditórios (FIDC). A dúvida é quanto ao tratamento contábil dessa aquisição, especificamente se as cotas devem ser classificadas como investimentos ou como aplicações financeiras de longo prazo. Além disso, a cláusula 8.7 do regulamento estabelece que a valorização das cotas não constitui promessa de rendimentos. Nesse contexto, surge também a questão sobre como essa valorização deve ser reconhecida contabilmente e se ela deve impactar o resultado do período.
Legislação Base: Pronunciamento técnico CPC 48.
Com base nas diretrizes contábeis do CPC 48 e no regulamento do fundo, a aquisição de cotas mezanino deve ser lançada na escrituração contábil da empresa como um investimento.
De acordo com o item 4.1.1 do CPC 48, a classificação de um ativo financeiro depende do modelo de negócios da entidade e das características do fluxo de caixa contratual. Sob essa ótica, o ativo não atende ao critério de recebimento de fluxos de caixa contratuais que constituam exclusivamente pagamentos de principal e juros, conforme definido no item 4.1.2(b) do CPC 48.
No caso presente, a cláusula 8.7 do regulamento pág. 97 é determinante ao estabelecer que o procedimento de valoração das cotas não constitui promessa de rendimentos, caracterizando-se apenas como um objetivo de valorização patrimonial da carteira.
Assim, embora a valoração das cotas seja apurada diariamente pelo custo diante para fins informativos (cláusula 8.1), ela não deve gerar o reconhecimento antecipado de receitas no resultado do período. O reconhecimento contábil de eventual ganho ou perda ocorrerá somente quando a cota for efetivamente realizada, ou seja, se ela for alienada ou por ocasião de seu resgate final.
Duvidas estamos a disposição
Geizi Andrade.

[ Geizi Andrade | 13/03/2026 às 12:25 ]
[SISTEMA]: Chamado fechado.

[ Ricardo Migueis | 13/03/2026 às 10:55 ]
[SISTEMA]: Representante atribuído ➔ Geizi Andrade

[ Maria Lizot | 12/03/2026 às 10:16 ]
Bom dia, tudo bem? Estamos avaliando a situação e responderemos o quanto antes!

[ Contabilidade Tecnomyl | 12/03/2026 às 10:01 ]
Prezados, bom dia,
Poderiam priorizar este chamado, por gentileza??

[ Ricardo Migueis | 11/03/2026 às 07:38 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 11/03/2026 às 07:38 ]
[SISTEMA]: Representante atribuído ➔ Maria Lizot', NULL, 'resolvido', 'resolvido', 'media', '2026-03-10 18:51:00+00', '2026-03-13 15:25:42+00'),
  ('a6388f52-a2a2-4f81-9173-588f0ac5f31b'::uuid, '0f347b7a-76ac-4a02-b8fc-72f7c80536ae'::uuid, '18cbce75-df5a-486b-8e25-d4939995b955'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'Solicitação de apoio para formular Defesa de notificação SEFAZ/MT – FETHAB – URGENTE', '[ Alined Deon | 9/03/2026 às 14:43 ]
Prezados, bom dia. Recebemos notificação da SEFAZ/MT referente a suposto não recolhimento de FETHAB em operações de aquisição de soja de produtor rural e solicitamos apoio da consultoria para análise e elaboração da defesa.
Contexto da operação
As operações referem-se a compras de soja de produtor rural vinculadas a operação de barter, em que a mercadoria é entregue diretamente pelo produtor à trading, para a qual realizamos a revenda.   Nessa estrutura operacional, a entrega física do produto ocorre diretamente do produtor para a trading, e a empresa passa a ter conhecimento da documentação fiscal somente após a comunicação formal da trading.
Fato que originou a notificação
As notas fiscais de venda emitidas pelo produtor foram datadas no final de janeiro/2026, porém somente tivemos ciência dessas notas em fevereiro/2026, quando a trading solicitou formalmente a troca vinculada à operação. Dessa forma, as notas foram escrituradas como entrada em fevereiro/2026, mês em que efetivamente tivemos conhecimento da operação.
Evidências da cronologia da operação
Para comprovação dos fatos, estamos encaminhando os seguintes documentos:
Romaneios de entrega do produto;
Contrato da operação de barter.
Livro Registro de Entradas 02/2026.
Consulta Genérica
Solicitação
Diante do exposto, solicitamos apoio da consultoria para:
Análise da notificação recebida;
Avaliação do enquadramento fiscal da operação;
Estruturação da defesa administrativa perante a SEFAZ/MT.
Permanecemos à disposição para envio de quaisquer documentos adicionais que se façam necessários. Aproveito o ensejo par destacar o caráter da urgência dado aos prazos estabelecidos para o DT-e.

[ANEXO]: Notificacao-No.-75793-1908-68-2026.zip (10M)

[ Diego Melo | 10/03/2026 às 17:59 ]
[SISTEMA]: Chamado fechado.

[ Diego Melo | 10/03/2026 às 17:59 ]
Aline, boa tarde!
Tudo bem?
Após a análise realizada, entendemos ser plausível a interposição de recurso contra a notificação. Para tanto, estamos anexando neste chamado o requerimento com nossos argumentos, bem como os documentos que deverão ser juntados posteriormente ao e-Process.
Quanto à avaliação do enquadramento fiscal da operação, consideramos mais adequado que seja examinada em momento oportuno, visto que, neste estágio, a prioridade é assegurar o protocolo do e-Process.
Deverá ser protocolizado:
Assunto: Atendimento à Intimação
Tipo de Processo: Atendimento à Intimação/Notificação – CCDEC Conform Autorregularização Declaração
Diante disso, solicitamos a abertura de um novo chamado, contendo os devidos detalhamentos e exemplos da operação realizada pela empresa Paiol.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo.

Notificacao-no-75793-1908-68-2026.zip

[ Ricardo Migueis | 9/03/2026 às 14:45 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 9/03/2026 às 14:45 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo', NULL, 'resolvido', 'resolvido', 'media', '2026-03-09 17:43:00+00', '2026-03-10 20:59:35+00'),
  ('0c2187ab-c1f2-44df-8b62-36a65679e449'::uuid, '0f347b7a-76ac-4a02-b8fc-72f7c80536ae'::uuid, '18cbce75-df5a-486b-8e25-d4939995b955'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'Solicitação de apoio para formular Defesa de notificação SEFAZ/MT – FETHAB – URGENTE', '[ Alined Deon | 5/03/2026 às 10:04 ]
Prezados, bom dia. Recebemos notificação da SEFAZ/MT referente a suposto não recolhimento de FETHAB em operações de aquisição de soja de produtor rural e solicitamos apoio da consultoria para análise e elaboração da defesa.
Contexto da operação
As operações referem-se a compras de soja de produtor rural vinculadas a operação de barter, em que a mercadoria é entregue diretamente pelo produtor à trading, para a qual realizamos a revenda.   Nessa estrutura operacional, a entrega física do produto ocorre diretamente do produtor para a trading, e a empresa passa a ter conhecimento da documentação fiscal somente após a comunicação formal da trading.
Fato que originou a notificação
As notas fiscais de venda emitidas pelo produtor foram datadas no final de janeiro/2026, porém somente tivemos ciência dessas notas em fevereiro/2026, quando a trading solicitou formalmente a troca vinculada à operação. Dessa forma, as notas foram escrituradas como entrada em fevereiro/2026, mês em que efetivamente tivemos conhecimento da operação.
Evidências da cronologia da operação
Para comprovação dos fatos, estamos encaminhando os seguintes documentos:
E-mail da trading, datado de 02/02/2026, solicitando a formalização da troca da operação;
Comprovantes de encerramento do MDF-e do transporte da mercadoria;
Romaneios de entrega do produto;
Contrato da operação de barter.
Esses documentos demonstram que a empresa somente teve ciência da emissão das notas fiscais após a comunicação da trading, motivo pelo qual a escrituração ocorreu em fevereiro.
Solicitação
Diante do exposto, solicitamos apoio da consultoria para:
Análise da notificação recebida;
Avaliação do enquadramento fiscal da operação;
Estruturação da defesa administrativa perante a SEFAZ/MT.
Permanecemos à disposição para envio de quaisquer documentos adicionais que se façam necessários. Aproveito o ensejo par destacar o caráter da urgência dado aos prazos estabelecidos para o DT-e.

[ANEXO]: Comprovante-Entregas.zip (36M)

[ Diego Melo | 6/03/2026 às 12:32 ]
Aline, bom dia!
Tudo bem?
Após a análise realizada, entendemos ser plausível a interposição de recurso contra a notificação. Para tanto, estamos anexando neste chamado o requerimento com nossos argumentos, bem como os documentos que deverão ser juntados posteriormente ao e-Process.
Quanto à avaliação do enquadramento fiscal da operação, consideramos mais adequado que seja examinada em momento oportuno, visto que, neste estágio, a prioridade é assegurar o protocolo do e-Process.
Deverá ser protocolizado:
Assunto: Atendimento à Intimação
Tipo de Processo: Atendimento à Intimação/Notificação – CCDEC Conform Autorregularização Declaração
Diante disso, solicitamos a abertura de um novo chamado, contendo os devidos detalhamentos e exemplos da operação realizada pela empresa Paiol.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo.

Notificacao-no-75784-1908-68-2026.zip

[ Diego Melo | 6/03/2026 às 12:32 ]
[SISTEMA]: Chamado fechado.

[ Alined Deon | 5/03/2026 às 14:41 ]
Anexo Livro Registro de Entradas

LJ41-Livro-Regristro-de-Entradas-02.2026.pdf

[ Ricardo Migueis | 5/03/2026 às 11:49 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 5/03/2026 às 11:49 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo

[ Alined Deon | 5/03/2026 às 10:53 ]
Consulta Genérica conforme solicitado.

LJ41-Consulta-Generica-IE-140333371.pdf', NULL, 'resolvido', 'resolvido', 'media', '2026-03-05 13:04:00+00', '2026-03-06 15:32:57+00'),
  ('b7fa2b7d-d799-44dc-8a9e-d7d62a008881'::uuid, '0f347b7a-76ac-4a02-b8fc-72f7c80536ae'::uuid, '18cbce75-df5a-486b-8e25-d4939995b955'::uuid, 'b9d78de7-708b-407e-9e5f-14879c4a0a12'::uuid, 'Consulta fiscal – compra e revenda de equipamento agrícola', '[ Alined Deon | 5/03/2026 às 08:23 ]
Prezados, bom dia.
Solicitamos análise sobre a viabilidade fiscal da operação abaixo, a ser realizada pela empresa CNPJ 58.864.055/0001-20, tributada pelo Lucro Real e com atividade principal de revenda de insumos agrícolas.
A empresa pretende adquirir um equipamento agrícola para posterior revenda ao cliente Anderson Fochi, conforme dados:
Equipamentos:
Pulverizador de sulco tandem 600L com monitor SJ1
Piloto automático elétrico NX10 para trator New Holland T6
Valor de compra: R$ 75.300,00
Desconto (biopontos Biotrop): R$ 5.862,00
Valor líquido: R$ 69.438,00
Condição de pagamento ao fornecedor:
20% de entrada
Saldo em 30/08/2026
Valor de venda ao cliente: R$ 90.000,00
Forma de venda: operação troca safra (soja):
50% com vencimento em 30/04/2027
50% com vencimento em 30/04/2028
Recebimento em grãos, com correção de juros.
Garantias: AF + CPR de grãos.
Diante disso, solicitamos orientação quanto a:
Possibilidade de realizar essa operação, considerando que a empresa tem como atividade principal a revenda de insumos.
Se o equipamento poderia ser registrado no ativo imobilizado e posteriormente vendido, ou se a operação deve ser tratada diretamente como revenda mercantil.
Tributação aplicável na compra e na venda (ICMS, PIS, COFINS, IRPJ e CSLL) e eventual aproveitamento de créditos.
Existência de riscos fiscais na estrutura da operação, especialmente por se tratar de troca por grãos com recebimento futuro.
Encaminhamos também modelo da nota fiscal do fornecedor e NCM para complementar a análise.

[ANEXO]: Untitled_design_20260227_175229_0000.pdf (405K)

[ Maria Lizot | 10/03/2026 às 15:08 ]
Prezados, boa tarde. Tudo bem?
1. Viabilidade da operação considerando a atividade da empresa
Em atenção ao questionamento apresentado, segue análise acerca da viabilidade fiscal da operação descrita, considerando a legislação contábil e tributária aplicável e as características informadas.
Preliminarmente, na hipótese de o contribuinte cuja atividade principal consiste na revenda de insumos agrícolas desejar realizar operações de revenda com equipamentos agrícolas, é necessário observar o disposto no artigo 70 do RICMS/MT, que estabelece que a atividade principal do estabelecimento será aquela que lhe trouxer maior contribuição para a geração de receita operacional, devendo constar também a atividade secundária, se for o caso. Nos termos do § 2º do referido artigo, será considerada atividade principal do estabelecimento aquela que lhe traga maior contribuição para geração de receita operacional, devendo constar, também, a atividade secundária, se for o caso. Já o § 3º dispõe que, ressalvada disposição expressa em contrário, não se exigirá vinculação das atividades secundárias do contribuinte à principal.
Considerando o intuito de dar a entrada da mercadoria com posterior comercialização, a operação não poderá se configurar como aquisição de ativo imobilizado, e sim revenda. Porém, se houver interesse em efetuar esse tipo de venda de máquinas de maneira mais recorrente, o ideal é proceder com a alteração cadastral, incluindo a atividade.Podendo aproveitar o crédito normalmente sobre a aquisição, segundo o artigo 99 e 103 do RICMS/MT, uma vez que a saída subsequente seja tributada.
Para que um bem seja classificado como imobilizado, a norma NBC TG 27, item 6, determina que ele:
a) seja mantido para uso na produção ou fornecimento de mercadorias ou serviços, para aluguel ou para fins administrativos;
b) tenha expectativa de uso por mais de um período.
2. Tributação:
IRPJ E CSLL:
A receita obtida na venda integra a receita bruta da empresa, conforme definido no artigo 26 da Instrução Normativa RFB nº 1.700/2017, que considera receita bruta:
a)     o produto da venda de bens nas operações de conta própria
b)     o preço da prestação de serviços
c)     o resultado de operações em conta alheia
d)     as receitas da atividade principal da empresa
No regime do Lucro Real, o resultado da operação comporá o lucro tributável da empresa, incidindo:
·       IRPJ: 15% – Adicional de IRPJ: 10% sobre a parcela do lucro que exceder R$ 20.000,00 por mês do período de apuração, conforme artigo 3º da Lei nº 9.249/1995
·       CSLL: 9%, conforme artigo 3º da Lei nº 7.689/1988
PIS E COFINS:
Como regra geral, no regime não cumulativo, aplicam-se as alíquotas de:
PIS: 1,65% e COFINS: 7,60% conforme previsto na Instrução Normativa RFB nº 2.121/2022, artigos 25 e 150.
A Instrução Normativa RFB n° 2.121/2022, artigo 185, cita que, na aquisição de máquinas e equipamentos novos destinados à produção de bens e à prestação de serviços, a pessoa jurídica poderá apropriar os créditos de forma imediata no seu valor total.
3. Possibilidade de venda estruturada como “troca safra”:
A legislação tributária não veda a comercialização de bens mediante liquidação futura em grãos, prática usual no setor agropecuário.
Nessas situações, a operação normalmente é formalizada por meio de instrumentos como:
·       CPR – Cédula de Produto Rural
·       contratos de entrega futura de grãos
Assim, não há impedimento fiscal para estruturar a venda na modalidade “troca safra”, desde que:
·       os contratos estejam formalmente documentados
·       os valores e condições estejam claramente definidos
Sigo á disposição para duvidas e esclarecimentos.
At.te, Maria Lizot.

[ Maria Lizot | 10/03/2026 às 15:08 ]
[SISTEMA]: Chamado fechado.

[ Ricardo Migueis | 5/03/2026 às 11:49 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 5/03/2026 às 11:49 ]
[SISTEMA]: Representante atribuído ➔ Maria Lizot', NULL, 'resolvido', 'resolvido', 'media', '2026-03-05 11:23:00+00', '2026-03-10 18:08:08+00'),
  ('4ad8914e-43c9-4a91-97db-be75c3e14c89'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, '0e2136ac-7e21-4885-8347-ce436c4c1cf9'::uuid, 'Saldo credor de ICMS – IE baixada (Filial 04 – CNPJ 05.280.269/0004-35)', '[ Contabilidade Tecnomyl | 4/03/2026 às 17:51 ]
Boa tarde, tudo bem?
Temos a filial 04 – CNPJ 05.280.269/0004-35, atualmente estabelecida em Embu das Artes/SP. Anteriormente, a filial estava localizada em Paulínia/SP e, em razão da alteração de endereço, houve mudança de Inscrição Estadual.
A IE anterior (513.154.432.110) foi baixada e passou a vigorar a nova IE (298.576.760.115).
Entretanto, havia saldo credor de ICMS vinculado à IE 513.154.432.110. Diante da baixa dessa inscrição, solicitamos orientação sobre como devemos proceder em relação a esse saldo credor:
É possível realizar a transferência do saldo para a nova IE?
Há necessidade de pedido formal junto à Secretaria da Fazenda e Planejamento do Estado de São Paulo?
Existe procedimento específico a ser adotado (ex.: PER/DCOMP estadual ou outro requerimento)?
Ficamos no aguardo das orientações para que possamos tomar as providências necessárias.

[ Diego Melo | 11/03/2026 às 17:47 ]
Boa tarde,
Tudo bem?
Conforme análise realizada, informa-se que o Regulamento do ICMS do Estado de São Paulo não apresenta previsão específica para essa situação. Entretanto, a SEFAZ/SP, por meio da seção “Perguntas Frequentes”, orienta da seguinte forma:
Quando a empresa alterar sua Inscrição Estadual (IE) durante o período de apuração, deverão ser transmitidas duas GIAS:
GIA da IE antiga: deve conter exclusivamente as operações e prestações realizadas até a data da mudança de IE.
GIA da IE nova: deve conter exclusivamente as operações e prestações realizadas após a mudança de IE.
Em relação à Escrituração Fiscal Digital (EFD), deve-se adotar o mesmo procedimento, informando o Registro 0000 com o período de atividade da IE correspondente. Ressalta-se que os campos CNPJ, IE e período de referência devem estar alinhados com o Cadesp, considerando:
a data de cancelamento da IE antiga;
o início de atividade da nova IE.
Quando a atividade desenvolvida no novo endereço for a continuidade daquela exercida anteriormente, o estabelecimento mantém o direito ao saldo credor de ICMS em sua escrita fiscal.
Procedimentos na escrita fiscal – GIA
O contribuinte deve lançar:
débito equivalente no código genérico 002.99 na IE que está sendo baixada;
crédito equivalente no código genérico 007.99 na nova IE.
No campo “Ocorrência”, deve-se descrever o caso concreto (mudança de endereço do estabelecimento).
No campo “Fundamentação Legal”, deve-se indicar a base legal: artigo 1º, III, “a”, da Portaria CAT 17/2006.
Procedimentos na EFD ICMS/IPI
O contribuinte deve lançar:
débito equivalente no código de ajuste SP000299 – OUTRAS HIPÓTESES – PREENCHIDA PELO CONTRIBUINTE na IE que está sendo baixada;
crédito equivalente no código de ajuste SP020799 – OUTRAS HIPÓTESES – PREENCHIDA PELO CONTRIBUINTE na nova IE, conforme a apuração própria que tenha saldo a transportar.
Nos Registros E111, no campo “DESCR_COMPL_AJ”, deve-se:
descrever o caso concreto (mudança de endereço do estabelecimento);
indicar a fundamentação legal: artigo 1º, III, “a”, da Portaria CAT 17/2006.
Quanto às mercadorias em estoque da IE baixada, conforme a Consulta Tributária nº 2422/2013, a saída de mercadorias e bens em razão de mudança de endereço do estabelecimento não se enquadra no campo de incidência do ICMS, por não constituir operação relativa à circulação de mercadorias.
Dessa forma, deve-se emitir a NF-e contendo os dados das mercadorias, dos bens do ativo imobilizado e dos materiais de uso e consumo, devidamente detalhados nos campos de “Produtos e Serviços” (com capacidade para até 990 itens). O DANFE poderá ser impresso em tantas folhas quantas forem necessárias para contemplar todas as especificações.
A NF-e deverá ser emitida sem destaque de ICMS, indicando como natureza da operação a expressão “Mudança de Endereço”, utilizando o CFOP 5.949. No campo do destinatário, devem constar os dados da própria empresa remetente, e no campo “Informações Complementares” deve ser informado o novo endereço.
A Nota Fiscal Eletrônica (NF-e) deverá emitida da seguinte forma:
Natureza da operação: Mudança de Endereço
Destinatário: Dados da própria empresa com endereço antigo
CFOP: 5.949 (dentro SP)
Descrição dos Produtos: discriminar as mercadorias para revenda, ou mesmo materiais de uso e consumo pelo seu valor médio registrado no Estoque da empresa, respeitando as mesmas descrições e codificações dessas mercadorias ou materiais;
CST do ICMS: (origem do bem) + 41 (não incidência)
Exemplo: Mercadorias nacional à 041
CST do IPI: 99 (outras saídas, se empresa for industrial ou equiparada)
CST do PIS e da COFINS: 49 (outras saídas)
Informações Complementares da NF-e: Em conformidade com Solução de Consulta emanadas pela Secretaria do Estado de São Paulo, é obrigatório indicar o novo endereço da empresa, bem como, as expressões e fundamentações: Não incidência do ICMS conforme Resposta Consulta nº 2.422/2013;
Por fim, a comunicação da mudança de endereço deve ser realizada junto à Secretaria da Fazenda até o último dia útil do mês subsequente ao da ocorrência, conforme dispõe o art. 25 do RICMS/2000.
No entanto, a Consulta Tributária nº 32.345/2025 estabelece que, no que se refere à operacionalização da alteração de endereço do estabelecimento — incluindo movimentação de mercadorias e ativos, documentação necessária, escrituração fiscal e emissão de documentos fiscais — o Contribuinte deverá seguir as orientações fornecidas pelo Posto Fiscal competente, responsável por indicar os procedimentos aplicáveis a situação exposta.
Dessa forma, conforme indicado na Consulta Tributária nº 32.345/2025, a Tecnomyl deverá consultar o Posto Fiscal competente para obter as orientações específicas relativas à movimentação das mercadorias, bem como aos procedimentos de escrituração.
Encaminho também outros entendimentos obtidos por meio de consulta tributária.
Em caso de dúvidas estamos à disposição.
Atenciosamente,
Diego Correia de Melo

Consultas-Tributarias.zip

[ Diego Melo | 11/03/2026 às 17:47 ]
[SISTEMA]: Chamado fechado.

[ Ricardo Migueis | 9/03/2026 às 07:57 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 9/03/2026 às 07:57 ]
[SISTEMA]: Representante atribuído ➔ Diego Melo

[ Contabilidade Tecnomyl | 6/03/2026 às 14:41 ]
Também temos dúvidas quanto ao estoque, como devemos proceder? Tínhamos estoque na antiga IE e agora estamos com a nova, como devemos proceder, temos que enviar EFD fiscal parcial? Como informar no bloco H os estoques?', NULL, 'resolvido', 'resolvido', 'media', '2026-03-04 20:51:00+00', '2026-03-11 20:47:22+00'),
  ('2d3f05ee-234d-4895-a207-3d5786206db1'::uuid, 'd4e9360c-cae8-4c04-bc05-b89640c23fad'::uuid, '5c3ded88-4ba6-4387-aad6-9c8bf07c1579'::uuid, '4a57f82f-8532-47a9-b471-6951072a66f4'::uuid, 'Inclusão/Exclusão de CNAE no Cartão CNPJ da Matriz', '[ Contabilidade Tecnomyl | 3/03/2026 às 17:12 ]
Prezados, Até este momento o cartão CNPJ da matriz contempla todas as atividades desenvolvidas pelas filiais. Como por exemplo a filial 0014-07 tem o CNAE 71.20-1-00 - Testes e análises técnicas, para desenvolver sua atividade de laboratório, e apenas por este motivo incluímos também  no CNPJ da matriz. A cada novo CNAE a ser incluído em uma filial também é incluído no CNPJ da matriz. Pergunta-se: 1- É necessário que o CNPJ da matriz contemple todas os CNAE desenvolvidos pelas filiais? 2- É possível deixar o CNPJ da matriz apenas com atividade administrativa e financeira? 3 - Caso sim no item 2, verificar quanto a atividade de vendas de defensivos e fertilizantes se existe algum impacto em órgão fiscalizador. Desde já agradeço e estou à disposição!

[ANEXO]: CNPJ-matriz.pdf (105K)

[ Marcely Arruda | 16/03/2026 às 15:31 ]
[SISTEMA]: Chamado fechado.

[ Marcely Arruda | 16/03/2026 às 15:31 ]
Prezados, boa tarde!
Segue anexo entendimento ao questionamento realizado.
Atenciosamente,

Estudo_Tecnomyl_CNAE_16.03.pdf

[ Ricardo Migueis | 4/03/2026 às 10:35 ]
[SISTEMA]: Status alterado para ➔ Em Progresso

[ Ricardo Migueis | 4/03/2026 às 10:35 ]
[SISTEMA]: Representante atribuído ➔ Marcely Arruda', NULL, 'resolvido', 'resolvido', 'media', '2026-03-03 20:12:00+00', '2026-03-16 18:31:19+00')
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE 'Pulado legacy_id=2907: data abertura inválida: Última modificação
26/02/2026 às 15:25';
  RAISE NOTICE 'Pulado legacy_id=2878: data abertura inválida: Última modificação
23/02/2026 às 11:17';
  RAISE NOTICE 'Pulado legacy_id=2866: data abertura inválida: Última modificação
20/02/2026 às 16:30';
  RAISE NOTICE 'Pulado legacy_id=2864: data abertura inválida: Última modificação
20/02/2026 às 15:10';
  RAISE NOTICE 'Pulado legacy_id=2863: data abertura inválida: Última modificação
20/02/2026 às 14:49';
  RAISE NOTICE 'Pulado legacy_id=2855: data abertura inválida: Última modificação
19/02/2026 às 14:49';
  RAISE NOTICE 'Pulado legacy_id=2852: data abertura inválida: Última modificação
19/02/2026 às 12:28';
  RAISE NOTICE 'Pulado legacy_id=2836: data abertura inválida: Última modificação
16/02/2026 às 09:46';
  RAISE NOTICE 'Pulado legacy_id=2827: data abertura inválida: Última modificação
11/02/2026 às 15:33';
  RAISE NOTICE 'Pulado legacy_id=2814: data abertura inválida: Última modificação
11/02/2026 às 13:50';
  RAISE NOTICE 'Pulado legacy_id=2799: data abertura inválida: Última modificação
09/02/2026 às 17:24';
  RAISE NOTICE 'Pulado legacy_id=2798: data abertura inválida: Última modificação
09/02/2026 às 16:51';
  RAISE NOTICE 'Pulado legacy_id=2793: data abertura inválida: Última modificação
07/02/2026 às 10:53';
  RAISE NOTICE 'Pulado legacy_id=2774: data abertura inválida: Última modificação
03/02/2026 às 18:52';
  RAISE NOTICE 'Pulado legacy_id=2753: data abertura inválida: Última modificação
02/02/2026 às 18:11';
  RAISE NOTICE 'Pulado legacy_id=2749: data abertura inválida: Última modificação
02/02/2026 às 17:52';
  RAISE NOTICE 'Pulado legacy_id=2744: data abertura inválida: Última modificação
02/02/2026 às 16:09';
  RAISE NOTICE 'Pulado legacy_id=2736: data abertura inválida: Última modificação
02/02/2026 às 09:32';
  RAISE NOTICE 'Pulado legacy_id=2727: data abertura inválida: Última modificação
30/01/2026 às 08:11';
  RAISE NOTICE 'Pulado legacy_id=2710: data abertura inválida: Última modificação
26/01/2026 às 17:37';
  RAISE NOTICE 'Pulado legacy_id=2704: data abertura inválida: Última modificação
26/01/2026 às 12:16';
  RAISE NOTICE 'Pulado legacy_id=2692: data abertura inválida: Última modificação
26/01/2026 às 08:52';
  RAISE NOTICE 'Pulado legacy_id=2660: data abertura inválida: Última modificação
19/01/2026 às 11:49';
  RAISE NOTICE 'Pulado legacy_id=2645: data abertura inválida: Última modificação
13/01/2026 às 16:20';
  RAISE NOTICE 'Pulado legacy_id=2630: data abertura inválida: Última modificação
13/01/2026 às 09:13';
  RAISE NOTICE 'Pulado legacy_id=2629: data abertura inválida: Última modificação
13/01/2026 às 09:03';
  RAISE NOTICE 'Pulado legacy_id=2628: data abertura inválida: Última modificação
13/01/2026 às 08:44';
  RAISE NOTICE 'Pulado legacy_id=2627: data abertura inválida: Última modificação
13/01/2026 às 08:33';
  RAISE NOTICE 'Pulado legacy_id=2616: data abertura inválida: Última modificação
08/01/2026 às 14:23';
  RAISE NOTICE 'Pulado legacy_id=2615: data abertura inválida: Última modificação
08/01/2026 às 14:03';
  RAISE NOTICE 'Pulado legacy_id=2611: data abertura inválida: Última modificação
07/01/2026 às 15:05';
  RAISE NOTICE 'Pulado legacy_id=2599: data abertura inválida: Última modificação
06/01/2026 às 17:25';
  RAISE NOTICE 'Pulado legacy_id=2596: data abertura inválida: Última modificação
06/01/2026 às 10:23';
  RAISE NOTICE 'Pulado legacy_id=2595: data abertura inválida: Última modificação
26/12/2025 às 18:19';
  RAISE NOTICE 'Pulado legacy_id=2591: data abertura inválida: Última modificação
19/12/2025 às 16:29';
  RAISE NOTICE 'Pulado legacy_id=2573: data abertura inválida: Última modificação
15/12/2025 às 16:20';
  RAISE NOTICE 'Pulado legacy_id=2571: data abertura inválida: Última modificação
15/12/2025 às 15:20';
  RAISE NOTICE 'Pulado legacy_id=2565: data abertura inválida: Última modificação
15/12/2025 às 10:18';
  RAISE NOTICE 'Pulado legacy_id=2549: data abertura inválida: Última modificação
11/12/2025 às 14:29';
  RAISE NOTICE 'Pulado legacy_id=2539: data abertura inválida: Última modificação
09/12/2025 às 09:28';
  RAISE NOTICE 'Pulado legacy_id=2533: data abertura inválida: Última modificação
08/12/2025 às 15:41';
  RAISE NOTICE 'Pulado legacy_id=2532: data abertura inválida: Última modificação
05/12/2025 às 15:15';
  RAISE NOTICE 'Pulado legacy_id=2492: data abertura inválida: Última modificação
25/11/2025 às 08:31';
  RAISE NOTICE 'Pulado legacy_id=2485: data abertura inválida: Última modificação
24/11/2025 às 16:53';
  RAISE NOTICE 'Pulado legacy_id=2472: data abertura inválida: Última modificação
18/11/2025 às 17:36';
  RAISE NOTICE 'Pulado legacy_id=2448: data abertura inválida: Última modificação
14/11/2025 às 08:44';
  RAISE NOTICE 'Pulado legacy_id=2447: data abertura inválida: Última modificação
14/11/2025 às 08:38';
  RAISE NOTICE 'Pulado legacy_id=2446: data abertura inválida: Última modificação
14/11/2025 às 08:36';
  RAISE NOTICE 'Pulado legacy_id=2445: data abertura inválida: Última modificação
14/11/2025 às 08:19';
  RAISE NOTICE 'Pulado legacy_id=2437: data abertura inválida: Última modificação
12/11/2025 às 11:06';
  RAISE NOTICE 'Pulado legacy_id=2427: data abertura inválida: Última modificação
10/11/2025 às 09:25';
  RAISE NOTICE 'Pulado legacy_id=2413: data abertura inválida: Última modificação
31/10/2025 às 16:34';
  RAISE NOTICE 'Pulado legacy_id=2410: data abertura inválida: Última modificação
30/10/2025 às 14:42';
  RAISE NOTICE 'Pulado legacy_id=2407: data abertura inválida: Última modificação
29/10/2025 às 18:40';
  RAISE NOTICE 'Pulado legacy_id=2395: data abertura inválida: Última modificação
28/10/2025 às 11:40';
  RAISE NOTICE 'Pulado legacy_id=2369: data abertura inválida: Última modificação
23/10/2025 às 08:52';
  RAISE NOTICE 'Pulado legacy_id=2363: data abertura inválida: Última modificação
23/10/2025 às 08:01';
  RAISE NOTICE 'Pulado legacy_id=2358: data abertura inválida: Última modificação
22/10/2025 às 16:37';
  RAISE NOTICE 'Pulado legacy_id=2355: data abertura inválida: Última modificação
22/10/2025 às 15:46';
  RAISE NOTICE 'Pulado legacy_id=2351: data abertura inválida: Última modificação
20/10/2025 às 10:45';
  RAISE NOTICE 'Pulado legacy_id=2334: data abertura inválida: Última modificação
16/10/2025 às 08:35';
  RAISE NOTICE 'Pulado legacy_id=2333: data abertura inválida: Última modificação
15/10/2025 às 18:20';
  RAISE NOTICE 'Pulado legacy_id=2322: data abertura inválida: Última modificação
13/10/2025 às 13:49';
  RAISE NOTICE 'Pulado legacy_id=2311: data abertura inválida: Última modificação
09/10/2025 às 15:28';
  RAISE NOTICE 'Pulado legacy_id=2306: data abertura inválida: Última modificação
09/10/2025 às 10:37';
  RAISE NOTICE 'Pulado legacy_id=2302: data abertura inválida: Última modificação
09/10/2025 às 10:16';
  RAISE NOTICE 'Pulado legacy_id=2297: data abertura inválida: Última modificação
08/10/2025 às 14:27';
  RAISE NOTICE 'Pulado legacy_id=2292: data abertura inválida: Última modificação
08/10/2025 às 08:54';
  RAISE NOTICE 'Pulado legacy_id=2286: data abertura inválida: Última modificação
07/10/2025 às 18:18';
  RAISE NOTICE 'Pulado legacy_id=2283: data abertura inválida: Última modificação
07/10/2025 às 09:22';
  RAISE NOTICE 'Pulado legacy_id=2274: data abertura inválida: Última modificação
01/10/2025 às 14:48';
  RAISE NOTICE 'Pulado legacy_id=2269: data abertura inválida: Última modificação
30/09/2025 às 16:45';
  RAISE NOTICE 'Pulado legacy_id=2264: data abertura inválida: Última modificação
29/09/2025 às 16:03';
  RAISE NOTICE 'Pulado legacy_id=2254: data abertura inválida: Última modificação
10/09/2025 às 16:07';
  RAISE NOTICE 'Pulado legacy_id=2240: data abertura inválida: Última modificação
03/09/2025 às 16:51';
  RAISE NOTICE 'Pulado legacy_id=2232: data abertura inválida: Última modificação
28/08/2025 às 11:38';
  RAISE NOTICE 'Pulado legacy_id=2223: data abertura inválida: Última modificação
22/08/2025 às 17:55';
  RAISE NOTICE 'Pulado legacy_id=2216: data abertura inválida: Última modificação
22/08/2025 às 08:34';
  RAISE NOTICE 'Pulado legacy_id=2212: data abertura inválida: Última modificação
21/08/2025 às 17:10';
  RAISE NOTICE 'Pulado legacy_id=2201: data abertura inválida: Última modificação
13/08/2025 às 16:26';
  RAISE NOTICE 'Pulado legacy_id=2179: data abertura inválida: Última modificação
06/08/2025 às 15:08';
  RAISE NOTICE 'Pulado legacy_id=2173: data abertura inválida: Última modificação
05/08/2025 às 17:34';
  RAISE NOTICE 'Pulado legacy_id=2170: data abertura inválida: Última modificação
05/08/2025 às 11:40';
  RAISE NOTICE 'Pulado legacy_id=2160: data abertura inválida: Última modificação
05/08/2025 às 08:45';
  RAISE NOTICE 'Pulado legacy_id=2153: data abertura inválida: Última modificação
04/08/2025 às 08:29';
  RAISE NOTICE 'Pulado legacy_id=2147: data abertura inválida: Última modificação
31/07/2025 às 16:07';
  RAISE NOTICE 'Pulado legacy_id=2140: data abertura inválida: Última modificação
29/07/2025 às 16:34';
  RAISE NOTICE 'Pulado legacy_id=2130: data abertura inválida: Última modificação
22/07/2025 às 18:16';
  RAISE NOTICE 'Pulado legacy_id=2126: data abertura inválida: Última modificação
21/07/2025 às 11:57';
  RAISE NOTICE 'Pulado legacy_id=2109: data abertura inválida: Última modificação
15/07/2025 às 17:25';
  RAISE NOTICE 'Pulado legacy_id=2068: data abertura inválida: Última modificação
30/06/2025 às 09:51';
  RAISE NOTICE 'Pulado legacy_id=2059: data abertura inválida: Última modificação
25/06/2025 às 10:13';
  RAISE NOTICE 'Pulado legacy_id=2048: data abertura inválida: Última modificação
18/06/2025 às 14:57';
  RAISE NOTICE 'Pulado legacy_id=2035: data abertura inválida: Última modificação
16/06/2025 às 14:23';
  RAISE NOTICE 'Pulado legacy_id=2028: data abertura inválida: Última modificação
16/06/2025 às 08:55';
  RAISE NOTICE 'Pulado legacy_id=2027: data abertura inválida: Última modificação
16/06/2025 às 08:33';
  RAISE NOTICE 'Pulado legacy_id=2003: data abertura inválida: Última modificação
05/06/2025 às 08:07';
  RAISE NOTICE 'Pulado legacy_id=1995: data abertura inválida: Última modificação
04/06/2025 às 17:00';
  RAISE NOTICE 'Pulado legacy_id=1992: data abertura inválida: Última modificação
04/06/2025 às 15:32';
  RAISE NOTICE 'Pulado legacy_id=1982: data abertura inválida: Última modificação
03/06/2025 às 15:04';
  RAISE NOTICE 'Pulado legacy_id=1978: data abertura inválida: Última modificação
03/06/2025 às 10:53';
  RAISE NOTICE 'Pulado legacy_id=1974: data abertura inválida: Última modificação
02/06/2025 às 18:24';
  RAISE NOTICE 'Pulado legacy_id=1959: data abertura inválida: Última modificação
29/05/2025 às 15:02';
  RAISE NOTICE 'Pulado legacy_id=1941: data abertura inválida: Última modificação
28/05/2025 às 15:40';
  RAISE NOTICE 'Pulado legacy_id=1937: data abertura inválida: Última modificação
28/05/2025 às 08:21';
  RAISE NOTICE 'Pulado legacy_id=1929: data abertura inválida: Última modificação
27/05/2025 às 12:41';
  RAISE NOTICE 'Pulado legacy_id=1923: data abertura inválida: Última modificação
26/05/2025 às 17:02';
  RAISE NOTICE 'Pulado legacy_id=1918: data abertura inválida: Última modificação
26/05/2025 às 11:47';
  RAISE NOTICE 'Pulado legacy_id=1884: data abertura inválida: Última modificação
20/05/2025 às 10:32';
  RAISE NOTICE 'Pulado legacy_id=1883: data abertura inválida: Última modificação
20/05/2025 às 10:24';
  RAISE NOTICE 'Pulado legacy_id=1873: data abertura inválida: Última modificação
16/05/2025 às 12:09';
  RAISE NOTICE 'Pulado legacy_id=1862: data abertura inválida: Última modificação
15/05/2025 às 17:44';
  RAISE NOTICE 'Pulado legacy_id=1861: data abertura inválida: Última modificação
15/05/2025 às 17:43';
  RAISE NOTICE 'Pulado legacy_id=1860: data abertura inválida: Última modificação
15/05/2025 às 17:41';
  RAISE NOTICE 'Pulado legacy_id=1859: data abertura inválida: Última modificação
15/05/2025 às 17:39';
  RAISE NOTICE 'Pulado legacy_id=1854: data abertura inválida: Última modificação
14/05/2025 às 18:18';
  RAISE NOTICE 'Pulado legacy_id=1850: data abertura inválida: Última modificação
14/05/2025 às 14:53';
  RAISE NOTICE 'Pulado legacy_id=1838: data abertura inválida: Última modificação
09/05/2025 às 17:18';
  RAISE NOTICE 'Pulado legacy_id=1791: data abertura inválida: Última modificação
28/04/2025 às 14:23';
  RAISE NOTICE 'Pulado legacy_id=1744: data abertura inválida: Última modificação
22/04/2025 às 16:23';
  RAISE NOTICE 'Pulado legacy_id=1743: data abertura inválida: Última modificação
22/04/2025 às 16:23';
  RAISE NOTICE 'Pulado legacy_id=1742: data abertura inválida: Última modificação
22/04/2025 às 16:22';
  RAISE NOTICE 'Pulado legacy_id=1741: data abertura inválida: Última modificação
22/04/2025 às 16:21';
  RAISE NOTICE 'Pulado legacy_id=1740: data abertura inválida: Última modificação
22/04/2025 às 16:21';
  RAISE NOTICE 'Pulado legacy_id=1739: data abertura inválida: Última modificação
22/04/2025 às 16:20';
  RAISE NOTICE 'Pulado legacy_id=1738: data abertura inválida: Última modificação
22/04/2025 às 16:19';
  RAISE NOTICE 'Pulado legacy_id=1737: data abertura inválida: Última modificação
22/04/2025 às 16:18';
  RAISE NOTICE 'Pulado legacy_id=1736: data abertura inválida: Última modificação
22/04/2025 às 16:18';
  RAISE NOTICE 'Pulado legacy_id=1735: data abertura inválida: Última modificação
22/04/2025 às 16:16';
  RAISE NOTICE 'Pulado legacy_id=1734: data abertura inválida: Última modificação
22/04/2025 às 16:15';
  RAISE NOTICE 'Pulado legacy_id=1733: data abertura inválida: Última modificação
22/04/2025 às 16:14';
  RAISE NOTICE 'Pulado legacy_id=1731: data abertura inválida: Última modificação
22/04/2025 às 15:56';
  RAISE NOTICE 'Pulado legacy_id=1721: data abertura inválida: Última modificação
16/04/2025 às 12:21';
  RAISE NOTICE 'Pulado legacy_id=1711: data abertura inválida: Última modificação
08/04/2025 às 12:31';
  RAISE NOTICE 'Pulado legacy_id=1659: data abertura inválida: Última modificação
27/03/2025 às 09:34';
  RAISE NOTICE 'Pulado legacy_id=1654: data abertura inválida: Última modificação
26/03/2025 às 17:32';
  RAISE NOTICE 'Pulado legacy_id=1641: data abertura inválida: Última modificação
26/03/2025 às 16:21';
  RAISE NOTICE 'Pulado legacy_id=1640: data abertura inválida: Última modificação
26/03/2025 às 16:19';
  RAISE NOTICE 'Pulado legacy_id=1628: data abertura inválida: Última modificação
26/03/2025 às 10:02';
  RAISE NOTICE 'Pulado legacy_id=1627: data abertura inválida: Última modificação
26/03/2025 às 10:01';
  RAISE NOTICE 'Pulado legacy_id=1626: data abertura inválida: Última modificação
25/03/2025 às 15:04';
  RAISE NOTICE 'Pulado legacy_id=1614: data abertura inválida: Última modificação
20/03/2025 às 11:45';
  RAISE NOTICE 'Pulado legacy_id=1589: data abertura inválida: Última modificação
18/03/2025 às 12:19';
  RAISE NOTICE 'Pulado legacy_id=1574: data abertura inválida: Última modificação
14/03/2025 às 12:50';
  RAISE NOTICE 'Pulado legacy_id=1568: data abertura inválida: Última modificação
13/03/2025 às 10:10';
  RAISE NOTICE 'Pulado legacy_id=1555: data abertura inválida: Última modificação
11/03/2025 às 10:43';
  RAISE NOTICE 'Pulado legacy_id=1536: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=1532: data abertura inválida: Última modificação
10/03/2025 às 09:19';
  RAISE NOTICE 'Pulado legacy_id=1511: data abertura inválida: Última modificação
28/02/2025 às 09:00';
  RAISE NOTICE 'Pulado legacy_id=1496: data abertura inválida: Última modificação
27/02/2025 às 09:56';
  RAISE NOTICE 'Pulado legacy_id=1485: data abertura inválida: Última modificação
21/02/2025 às 09:16';
  RAISE NOTICE 'Pulado legacy_id=1482: data abertura inválida: Última modificação
21/02/2025 às 09:08';
  RAISE NOTICE 'Pulado legacy_id=1433: data abertura inválida: Última modificação
17/02/2025 às 13:39';
  RAISE NOTICE 'Pulado legacy_id=1426: data abertura inválida: Última modificação
14/02/2025 às 10:17';
  RAISE NOTICE 'Pulado legacy_id=1420: data abertura inválida: Última modificação
11/02/2025 às 08:16';
  RAISE NOTICE 'Pulado legacy_id=1405: data abertura inválida: Última modificação
05/02/2025 às 17:56';
  RAISE NOTICE 'Pulado legacy_id=1400: data abertura inválida: Última modificação
05/02/2025 às 12:21';
  RAISE NOTICE 'Pulado legacy_id=1396: data abertura inválida: Última modificação
03/02/2025 às 16:14';
  RAISE NOTICE 'Pulado legacy_id=1387: data abertura inválida: Última modificação
30/01/2025 às 09:41';
  RAISE NOTICE 'Pulado legacy_id=1373: data abertura inválida: Última modificação
23/01/2025 às 08:00';
  RAISE NOTICE 'Pulado legacy_id=1365: data abertura inválida: Última modificação
20/01/2025 às 17:17';
  RAISE NOTICE 'Pulado legacy_id=1357: data abertura inválida: Última modificação
15/01/2025 às 19:32';
  RAISE NOTICE 'Pulado legacy_id=1351: data abertura inválida: Última modificação
15/01/2025 às 11:20';
  RAISE NOTICE 'Pulado legacy_id=1327: data abertura inválida: Última modificação
06/01/2025 às 16:05';
  RAISE NOTICE 'Pulado legacy_id=1312: data abertura inválida: Última modificação
02/01/2025 às 16:31';
  RAISE NOTICE 'Pulado legacy_id=1301: data abertura inválida: Última modificação
27/12/2024 às 18:24';
  RAISE NOTICE 'Pulado legacy_id=1300: data abertura inválida: Última modificação
27/12/2024 às 15:32';
  RAISE NOTICE 'Pulado legacy_id=1297: data abertura inválida: Última modificação
23/12/2024 às 16:10';
  RAISE NOTICE 'Pulado legacy_id=1287: data abertura inválida: Última modificação
11/12/2024 às 15:46';
  RAISE NOTICE 'Pulado legacy_id=1263: data abertura inválida: Última modificação
29/11/2024 às 16:13';
  RAISE NOTICE 'Pulado legacy_id=1253: data abertura inválida: Última modificação
27/11/2024 às 10:37';
  RAISE NOTICE 'Pulado legacy_id=1244: data abertura inválida: Última modificação
25/11/2024 às 09:11';
  RAISE NOTICE 'Pulado legacy_id=1233: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=1227: data abertura inválida: Última modificação
21/11/2024 às 12:06';
  RAISE NOTICE 'Pulado legacy_id=1197: data abertura inválida: Última modificação
07/11/2024 às 17:13';
  RAISE NOTICE 'Pulado legacy_id=1195: data abertura inválida: Última modificação
07/11/2024 às 16:40';
  RAISE NOTICE 'Pulado legacy_id=1187: data abertura inválida: Última modificação
05/11/2024 às 10:41';
  RAISE NOTICE 'Pulado legacy_id=1183: data abertura inválida: Última modificação
01/11/2024 às 12:44';
  RAISE NOTICE 'Pulado legacy_id=1173: data abertura inválida: Última modificação
24/10/2024 às 11:14';
  RAISE NOTICE 'Pulado legacy_id=1172: data abertura inválida: Última modificação
24/10/2024 às 10:40';
  RAISE NOTICE 'Pulado legacy_id=1155: data abertura inválida: Última modificação
15/10/2024 às 11:45';
  RAISE NOTICE 'Pulado legacy_id=1139: data abertura inválida: Última modificação
11/10/2024 às 12:22';
  RAISE NOTICE 'Pulado legacy_id=1120: data abertura inválida: Última modificação
30/09/2024 às 11:28';
  RAISE NOTICE 'Pulado legacy_id=1111: data abertura inválida: Última modificação
26/09/2024 às 11:07';
  RAISE NOTICE 'Pulado legacy_id=1092: data abertura inválida: Última modificação
23/09/2024 às 14:48';
  RAISE NOTICE 'Pulado legacy_id=1090: data abertura inválida: Última modificação
23/09/2024 às 14:40';
  RAISE NOTICE 'Pulado legacy_id=1080: data abertura inválida: Última modificação
19/09/2024 às 11:20';
  RAISE NOTICE 'Pulado legacy_id=1064: data abertura inválida: Última modificação
13/09/2024 às 10:37';
  RAISE NOTICE 'Pulado legacy_id=1056: data abertura inválida: Última modificação
11/09/2024 às 09:42';
  RAISE NOTICE 'Pulado legacy_id=1046: data abertura inválida: Última modificação
10/09/2024 às 11:05';
  RAISE NOTICE 'Pulado legacy_id=1041: data abertura inválida: Última modificação
09/09/2024 às 08:13';
  RAISE NOTICE 'Pulado legacy_id=1031: data abertura inválida: Última modificação
03/09/2024 às 11:39';
  RAISE NOTICE 'Pulado legacy_id=1024: data abertura inválida: Última modificação
29/08/2024 às 11:01';
  RAISE NOTICE 'Pulado legacy_id=1012: data abertura inválida: Última modificação
28/08/2024 às 16:29';
  RAISE NOTICE 'Pulado legacy_id=1006: data abertura inválida: Última modificação
26/08/2024 às 17:54';
  RAISE NOTICE 'Pulado legacy_id=983: data abertura inválida: Última modificação
15/08/2024 às 15:28';
  RAISE NOTICE 'Pulado legacy_id=980: data abertura inválida: Última modificação
14/08/2024 às 14:32';
  RAISE NOTICE 'Pulado legacy_id=967: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=957: data abertura inválida: Última modificação
12/08/2024 às 17:25';
  RAISE NOTICE 'Pulado legacy_id=945: data abertura inválida: Última modificação
09/08/2024 às 11:42';
  RAISE NOTICE 'Pulado legacy_id=918: data abertura inválida: Última modificação
05/08/2024 às 16:40';
  RAISE NOTICE 'Pulado legacy_id=903: data abertura inválida: Última modificação
29/07/2024 às 18:33';
  RAISE NOTICE 'Pulado legacy_id=902: data abertura inválida: Última modificação
29/07/2024 às 18:31';
  RAISE NOTICE 'Pulado legacy_id=901: data abertura inválida: Última modificação
29/07/2024 às 16:27';
  RAISE NOTICE 'Pulado legacy_id=899: data abertura inválida: Última modificação
29/07/2024 às 11:33';
  RAISE NOTICE 'Pulado legacy_id=878: data abertura inválida: Última modificação
15/07/2024 às 09:05';
  RAISE NOTICE 'Pulado legacy_id=1080: data abertura inválida: Última modificação
19/09/2024 às 11:20';
  RAISE NOTICE 'Pulado legacy_id=1064: data abertura inválida: Última modificação
13/09/2024 às 10:37';
  RAISE NOTICE 'Pulado legacy_id=1056: data abertura inválida: Última modificação
11/09/2024 às 09:42';
  RAISE NOTICE 'Pulado legacy_id=1046: data abertura inválida: Última modificação
10/09/2024 às 11:05';
  RAISE NOTICE 'Pulado legacy_id=1041: data abertura inválida: Última modificação
09/09/2024 às 08:13';
  RAISE NOTICE 'Pulado legacy_id=1031: data abertura inválida: Última modificação
03/09/2024 às 11:39';
  RAISE NOTICE 'Pulado legacy_id=1024: data abertura inválida: Última modificação
29/08/2024 às 11:01';
  RAISE NOTICE 'Pulado legacy_id=1012: data abertura inválida: Última modificação
28/08/2024 às 16:29';
  RAISE NOTICE 'Pulado legacy_id=1006: data abertura inválida: Última modificação
26/08/2024 às 17:54';
  RAISE NOTICE 'Pulado legacy_id=983: data abertura inválida: Última modificação
15/08/2024 às 15:28';
  RAISE NOTICE 'Pulado legacy_id=980: data abertura inválida: Última modificação
14/08/2024 às 14:32';
  RAISE NOTICE 'Pulado legacy_id=967: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=957: data abertura inválida: Última modificação
12/08/2024 às 17:25';
  RAISE NOTICE 'Pulado legacy_id=945: data abertura inválida: Última modificação
09/08/2024 às 11:42';
  RAISE NOTICE 'Pulado legacy_id=918: data abertura inválida: Última modificação
05/08/2024 às 16:40';
  RAISE NOTICE 'Pulado legacy_id=903: data abertura inválida: Última modificação
29/07/2024 às 18:33';
  RAISE NOTICE 'Pulado legacy_id=902: data abertura inválida: Última modificação
29/07/2024 às 18:31';
  RAISE NOTICE 'Pulado legacy_id=901: data abertura inválida: Última modificação
29/07/2024 às 16:27';
  RAISE NOTICE 'Pulado legacy_id=899: data abertura inválida: Última modificação
29/07/2024 às 11:33';
  RAISE NOTICE 'Pulado legacy_id=878: data abertura inválida: Última modificação
15/07/2024 às 09:05';
  RAISE NOTICE 'Pulado legacy_id=631: data abertura inválida: Última modificação
10/04/2024 às 08:00';
  RAISE NOTICE 'Pulado legacy_id=628: data abertura inválida: Última modificação
09/04/2024 às 08:05';
  RAISE NOTICE 'Pulado legacy_id=610: data abertura inválida: Última modificação
26/03/2024 às 09:44';
  RAISE NOTICE 'Pulado legacy_id=608: data abertura inválida: Última modificação
25/03/2024 às 17:47';
  RAISE NOTICE 'Pulado legacy_id=606: data abertura inválida: Última modificação
25/03/2024 às 17:05';
  RAISE NOTICE 'Pulado legacy_id=582: data abertura inválida: Última modificação
12/03/2024 às 16:20';
  RAISE NOTICE 'Pulado legacy_id=566: email não mapeado/sem user_id: marcus.laurentino@prado-advogados.com';
  RAISE NOTICE 'Pulado legacy_id=557: data abertura inválida: Última modificação
01/03/2024 às 11:02';
  RAISE NOTICE 'Pulado legacy_id=534: data abertura inválida: Última modificação
29/02/2024 às 10:07';
  RAISE NOTICE 'Pulado legacy_id=512: data abertura inválida: Última modificação
26/02/2024 às 10:33';
  RAISE NOTICE 'Pulado legacy_id=511: data abertura inválida: Última modificação
26/02/2024 às 10:29';
  RAISE NOTICE 'Pulado legacy_id=507: data abertura inválida: Última modificação
26/02/2024 às 08:13';
  RAISE NOTICE 'Pulado legacy_id=498: data abertura inválida: Última modificação
22/02/2024 às 16:20';
  RAISE NOTICE 'Pulado legacy_id=492: data abertura inválida: Última modificação
21/02/2024 às 16:33';
  RAISE NOTICE 'Pulado legacy_id=482: data abertura inválida: Última modificação
15/02/2024 às 12:12';
  RAISE NOTICE 'Pulado legacy_id=450: data abertura inválida: Última modificação
06/02/2024 às 10:27';
  RAISE NOTICE 'Pulado legacy_id=444: data abertura inválida: Última modificação
05/02/2024 às 18:10';
  RAISE NOTICE 'Pulado legacy_id=441: data abertura inválida: Última modificação
05/02/2024 às 10:34';
  RAISE NOTICE 'Pulado legacy_id=431: data abertura inválida: Última modificação
31/01/2024 às 16:42';
  RAISE NOTICE 'Pulado legacy_id=428: data abertura inválida: Última modificação
30/01/2024 às 16:46';
  RAISE NOTICE 'Pulado legacy_id=419: data abertura inválida: Última modificação
25/01/2024 às 12:36';
  RAISE NOTICE 'Pulado legacy_id=405: data abertura inválida: Última modificação
02/01/2024 às 12:02';
  RAISE NOTICE 'Pulado legacy_id=386: data abertura inválida: Última modificação
05/12/2023 às 17:53';
  RAISE NOTICE 'Pulado legacy_id=381: data abertura inválida: Última modificação
05/12/2023 às 16:16';
  RAISE NOTICE 'Pulado legacy_id=361: data abertura inválida: Última modificação
09/11/2023 às 17:58';
  RAISE NOTICE 'Pulado legacy_id=349: data abertura inválida: Última modificação
06/11/2023 às 09:57';
  RAISE NOTICE 'Pulado legacy_id=344: data abertura inválida: Última modificação
31/10/2023 às 17:41';
  RAISE NOTICE 'Pulado legacy_id=328: data abertura inválida: Última modificação
24/10/2023 às 11:54';
  RAISE NOTICE 'Pulado legacy_id=315: data abertura inválida: Última modificação
19/10/2023 às 11:06';
  RAISE NOTICE 'Pulado legacy_id=308: data abertura inválida: Última modificação
17/10/2023 às 07:57';
  RAISE NOTICE 'Pulado legacy_id=289: data abertura inválida: Última modificação
26/09/2023 às 08:53';
  RAISE NOTICE 'Pulado legacy_id=283: data abertura inválida: Última modificação
21/09/2023 às 15:13';
  RAISE NOTICE 'Pulado legacy_id=260: data abertura inválida: Última modificação
01/09/2023 às 11:31';
  RAISE NOTICE 'Pulado legacy_id=258: data abertura inválida: Última modificação
01/09/2023 às 11:30';
  RAISE NOTICE 'Pulado legacy_id=255: data abertura inválida: Última modificação
01/09/2023 às 11:10';
  RAISE NOTICE 'Pulado legacy_id=248: data abertura inválida: Última modificação
31/08/2023 às 09:20';
  RAISE NOTICE 'Pulado legacy_id=230: data abertura inválida: Última modificação
15/08/2023 às 11:11';
  RAISE NOTICE 'Pulado legacy_id=195: data abertura inválida: Última modificação
07/08/2023 às 17:40';
  RAISE NOTICE 'Pulado legacy_id=193: data abertura inválida: Última modificação
07/08/2023 às 13:49';
  RAISE NOTICE 'Pulado legacy_id=192: data abertura inválida: Última modificação
07/08/2023 às 13:48';
  RAISE NOTICE 'Pulado legacy_id=191: data abertura inválida: Última modificação
07/08/2023 às 13:46';
  RAISE NOTICE 'Pulado legacy_id=190: data abertura inválida: Última modificação
07/08/2023 às 13:45';
  RAISE NOTICE 'Pulado legacy_id=188: data abertura inválida: Última modificação
03/08/2023 às 17:01';
  RAISE NOTICE 'Pulado legacy_id=185: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=184: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=177: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=169: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=163: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=156: email não mapeado/sem user_id: solange.silva@tecnomyl.com';
  RAISE NOTICE 'Pulado legacy_id=152: email não mapeado/sem user_id: cliente@pradoconsultores.com';
  RAISE NOTICE 'Pulado legacy_id=66: email não mapeado/sem user_id: cliente@pradoconsultores.com';
END $$;
