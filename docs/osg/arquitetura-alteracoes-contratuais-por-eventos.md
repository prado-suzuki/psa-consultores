# Alteracoes contratuais por eventos

Proposta de 08/09/2026. Pesquisa do codigo local, planos existentes e amostra dirigida dos PDFs em `/home/bernardo/Documentos/contratos_exemplo`. Nao e homologacao juridica, auditoria integral dos contratos ou verificacao do ambiente de producao. A implementacao veio depois: ver a secao "Estado da implementacao em 08/09/2026", no fim.

Consolidacao com `docs/planos/radar-de-alteracoes-contratuais.md` e decisao do Bernardo: reutilizar os checkboxes de AC, com eventos detectados pre-marcados, sem botoes separados de aceitar, adiar e dispensar. Este documento registra o desenho resultante; o radar permanece como proposta de origem, nao como backlog cumulativo.

## Recomendacao

Evoluir o gerador existente com uma camada de estado contratual e eventos tipados. O cadastro descreve a informacao atual; o estado registrado descreve o que foi confirmado no instrumento; a proposta de AC descreve apenas as mudancas aprovadas para aquele ato.

```text
Instrumento registrado confirmado -> estado-base imutavel
Cadastro + movimentos pendentes   -> estado atual observado
                ambos            -> diferencas normalizadas
Diferencas + regras homologadas   -> candidatos com evidencias
Checkboxes pre-marcados           -> conferencia e confirmacao humana
Selecao confirmada               -> eventos aprovados e ordenados
Base + eventos aprovados         -> estado proposto
Eventos + estado proposto        -> resolucoes + consolidado opcional
Revisao e confirmacao do registro -> nova base, arquivo e rastreabilidade
```

Nao construir outro motor de templates, um editor generico de regras juridicas ou um event sourcing de todo o cadastro. As duas tarefas de sede e qualificacao devem consumir esse mesmo caminho.

O primeiro recorte modela somente os dados necessarios ao caso homologado, preservando as demais materias do instrumento-base. Nao exigir modelagem completa de capital, governanca ou sucessao para entregar sede. Um caso por tarefa delimita o aceite, sem obrigar um documento separado por evento.

## O que existe

| Ponto | Evidencia no codigo | Aproveitamento |
| --- | --- | --- |
| Cliente compartilhado no Work | `src/contexts/OsgWorkContext.tsx:3` | Manter contexto pequeno; sociedade continua selecao explicita. |
| Dashboard de ferramentas | `src/pages/equipe/osg/OsgWorkDashboard.tsx:66` | Entrada para pendencias agrupadas por sociedade. |
| PF/PJ e administracao | `src/pages/equipe/osg/QualificacaoDasPartes.tsx:173`, `src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx:207` | Fontes atuais e atalhos para resolver pendencias. |
| Livro e quadro projetado | `src/pages/equipe/osg/QuadroSocietario.tsx:198`, `src/hooks/useMovimentacaoQuotas.ts` | Preservar movimentos, sua ordem e vinculo ao ato que os formaliza. |
| Seis familias de eventos | `src/lib/osg/eventosDaAlteracao.ts:108` | Sede, aumento, integralizacao, cessao/doacao, ingresso/retirada e administracao ja sao sugeridos. |
| Estado anterior parcial | `src/lib/osg/baselineDaPeca.ts:30` | Hoje extrai capital e CPF/CNPJ dos socios; ampliar com contrato tipado. |
| Snapshots documentais | `src/hooks/useDocumentoGerado.ts:15` | Preservar dados, flags e versoes de blocos; acrescentar dominio sem confundir com strings de apresentacao. |
| Duas linhagens | `src/hooks/useDocumentoGerado.ts` | Revisoes da mesma peca usam raiz/anterior; sucessao de instrumentos usa `substitui_documento_id`. |
| Motor e DOCX | `src/lib/templates/`, `src/components/equipe/osg/gerar/renderizarVersao.ts` | Reutilizar composicao, familias, numeracao, preview e exportador. |

O fluxo existente valida/congela, registra, formaliza movimentos e inicia AC ligada ao instrumento anterior. A consolidacao e recomposta pelo modelo com o contexto atual, nao por aplicacao controlada de mudancas ao contrato anterior.

### Lacunas que afetam a proposta

1. Sede deriva da presenca de edicao em `endereco_*`, nao de antes/depois. O hook descarta os valores do diff e usa uma janela posterior a `snapshot_validado_em`: `useEventosDaAlteracao.ts:49-75`, `eventosDaAlteracao.ts:122-135`. Editar A para B e voltar a A pode continuar sugerindo evento.
2. Socios sao comparados por CPF/CNPJ: `baselineDaPeca.ts:17-22`, `eventosDaAlteracao.ts:187-195`. Corrigir o CPF pode parecer retirada e ingresso. A identidade precisa ser independente do documento corrigido.
3. Desmarcar eventos controla flags, mas a projecao e as listas ainda abrangem movimentos vivos: `useGeracaoDocumento.ts:469`, `:527`, `:614`, `useGerarDocumentoController.ts:1057`. O consolidado pode incorporar uma mudanca nao aprovada.
4. O registro acontece antes do carimbo e da atualizacao dos bens: `useGerarDocumentoController.ts:689-714`, `useEventosDaAlteracao.ts:166-184`. A falha intermediaria pode deixar formalizacao parcial. Os movimentos sao recalculados no registro em vez de virem de uma selecao congelada.
5. A head registrada ainda compoe com Biblioteca atual: `useGerarDocumentoController.ts:305`, `:1434`. O historico tem caminho de snapshot separado, em `:1706`. Bloquear edicao da tela nao garante reproducao imutavel.
6. Inicio de AC depende de respostas de flags: `useGerarDocumentoController.ts:175`, `useDomainFlagsManuais.ts:296`. A proposta precisa existir mesmo em modelo sem flags e admitir cancelamento explicito.

Esses achados sao de leitura do codigo, nao de reproducao ponta a ponta nesta analise. Corrigi-los em entregas separadas da extracao estrutural, com testes de caracterizacao primeiro.

## O que os documentos ensinam

Paginas abaixo sao posicoes fisicas no PDF, incluindo capas. Leitura dirigida, sem contagem estatistica dos eventos. Nomes abreviados remetem aos arquivos da pasta da respectiva empresa.

| Caso | Evidencia | Implicacao |
| --- | --- | --- |
| Fartura, 11a AC, pp. 3-4 | Resolucao expressa de alteracao da sede e endereco consolidado. | Bom candidato de referencia para sede, sujeito a selecao do modelo e homologacao. |
| ITFD Participacoes, 2a AC, pp. 3-5 | Atualizacao postal da qualificacao e da sede em resolucoes separadas; complemento nao coincide em todas as ocorrencias. | Separar os assuntos e bloquear inconsistencia entre resolucao e consolidado. |
| GMS, 7a AC, pp. 4-5 | Atualizacao postal, qualificacao, sede e filiais. | CEP alterado nao comprova deslocamento fisico; filiais nao entram no evento de sede. |
| AL Lehnen, 3a AC chancelada, p. 7 | Retificacao de data de nascimento. | Caso de qualificacao, nao prova de correcao de CPF. |
| Fartura, 8a AC, pp. 3-6 | Qualificacao, reestruturacao de clausulas e aumento de capital. | Uma AC contem eventos distintos; uniao estavel e estado civil nao sao necessariamente uma unica escolha. |
| Boscoli, 3a AC, pp. 1-3 | Corrige descricao de imovel sem alterar valor contabil; ratifica sem consolidacao integral. | Retificacao nao implica novo aporte; consolidacao nao e universalmente obrigatoria. |
| Boscoli, 9a AC, pp. 4-5 | Corrige tratamento de novas matriculas por georreferenciamento como nova integralizacao. | Identidade do bem nao pode ser a matricula; alvo da correcao pode ser ato historico. |
| GMS, arquivo 08b, pp. 3-8 | Corrige percentuais de imoveis sem mudar os valores daquela integralizacao e depois aumenta capital por outros meios. | Efeitos pertencem ao evento, nao a um unico tipo do documento. |
| Tres Coqueiros II, 1a AC, pp. 3, 11-13 | Aumento, quadro intermediario, cessao a holding e quadro final. | Aplicar eventos em ordem; nao confundir estado intermediario e final. |
| Hervalense Participacoes, 1a AC, pp. 2-3, e 2a AC, p. 6 | Mesma pessoa muda entre administradora socia e nao socia. | Identidade, participacao e funcao sao dimensoes separadas. |
| MMS Participacoes, 3a AC, pp. 1-7 | Doacao, usufruto, voto, restricoes e administracao. | Quadro de quotas sozinho nao descreve todos os direitos. |
| Fartura, 10a AC, pp. 3-5, e 12a AC, pp. 3-5 | Criacao de filial e complementacao posterior de identificadores registrais. | Complementar CNPJ/NIRE nao e abrir novamente a filial. |

Nao foi identificado caso expresso de correcao de CPF nos trechos examinados. Ha exemplos de outras mudancas de qualificacao. Nao declarar AC-01C homologada por analogia.

Existem cadeias incompletas, como a ausencia do original da 7a AC da GB na listagem. Sufixos `b` podem ser outra copia do mesmo ato: trechos e metadados de registro de GB 06/06b e GMS 08/08b indicam essa possibilidade, mas nao houve comparacao integral. Nomes de arquivos nao definem ordem juridica nem identidade do ato. Extensoes `.PDF` e `.pdf` precisam entrar no inventario.

Os contratos reais tambem contem divergencias aparentes de valores, qualificacao e numeracao. Golden-master deve ser a expectativa revisada e homologada, nao a reproducao cega de todo erro da fonte. Preservar a fonte original e registrar cada divergencia aprovada. Nao versionar PDFs reais ou dados pessoais como fixtures publicas.

## Contratos de dominio propostos

Os nomes abaixo sao conceituais, nao tabelas existentes nem um DDL aprovado.

| Conceito | Conteudo e responsabilidade |
| --- | --- |
| Estado contratual versionado | Sociedade, instrumento-base, versao do schema, sede, pessoas por ID estavel, qualificacoes, participacoes, capital, administracao e materias/clausulas preservadas. Campos nao conhecidos permanecem desconhecidos, nunca inferidos como vazios. |
| Diferenca detectada | Entidade e caminho semantico, antes/depois tipados, fonte, momento da observacao e normalizacao aplicada. Mantem valor bruto para evidencia. |
| Evento proposto | Tipo e versao da regra, causa declarada, alvo, antes/depois, evidencias, movimentos abrangidos, dependencias, dados faltantes e estado de revisao. |
| Proposta de AC | Base exata, selecao confirmada de eventos incluidos/nao incluidos, antes/depois abrangido, sequencia, estado resultante, modelo homologado e versoes, responsavel pela confirmacao e revisoes. Sem motivo obrigatorio para desmarcar. |
| Confirmacao de registro | Evidencia do registro, identificadores e datas pertinentes, arquivo efetivamente registrado e sua relacao com a versao aprovada. Nao confundir arquivo gerado com arquivo arquivado. |

Usar `pessoa.id` como identidade nos novos snapshots. Para snapshots legados, permitir conciliacao revisada e versionada fora do original; CPF/nome podem sugerir correspondencias, mas nao decidir correcoes de identidade. Bem e matriculas precisam conservar relacao de continuidade quando essa familia for suportada.

O snapshot pode ser a versao da qualificacao: nao e obrigatorio criar uma tabela historica de toda edicao da pessoa. Ele precisa, entretanto, conter a identidade estavel e os valores pertinentes ao instrumento. Isso e pre-condicao para corrigir CPF, nao uma melhoria adiada para filiais.

Separar a identidade semantica da clausula de sua numeracao de exibicao. Preservar clausulas especificas, excecoes de administracao e overrides do instrumento-base. Migrar para outra versao de modelo e uma decisao visivel, com diff juridico, nao atualizacao silenciosa da Biblioteca.

### Tres estados, uma regra de composicao

`base registrada` + `eventos aprovados` = `estado proposto`.

O cadastro atual e fonte de candidatos, nao fonte irrestrita do consolidado. Se sede e profissao mudaram, mas somente sede foi aprovada, a qualificacao contratual antiga permanece. A mudanca de profissao continua pendente, salvo decisao juridica explicita de outro tratamento.

Para eventos acoplados, o sistema exige o conjunto coerente ou adia a operacao inteira. Nao permitir aceitar uma cessao e omitir sua alteracao do quadro final. Nao criar automaticamente renuncia, preco, anuencia, poderes ou causa juridica ausentes.

Datas de instrumento, fato/efeito declarado, protocolo, registro e captura do snapshot sao distintas. Confirmacao do registro promove a base operacional; isso nao afirma que todo efeito juridico nasce naquela data. Modelar datas pertinentes por evento homologado.

### Marco do registro

Incorporar ao gesto de registrar os metadados de protocolo, data do registro, numero do registro, Junta/UF e NIRE quando pertinente, distinguindo identificacao da sociedade e do arquivamento. Vincular o PDF efetivamente registrado por `documento_arquivo`. O desenho fisico e os campos obrigatorios dependem da modalidade homologada; nao usar apenas `status = registrado` como prova suficiente.

O conteudo confirmado define a base. A data de registro serve para cronologia e citacao, nao como filtro exclusivo de diferencas: uma edicao entre validacao e registro pode nao estar no arquivo registrado e continuar pendente. A procedencia por auditoria deve admitir essa janela sem classificar automaticamente a data do fato.

## Deteccao e catalogo

Comecar com funcoes TypeScript puras em `src/lib/osg/`, testaveis sem banco. Um registro pequeno de handlers por familia define campos observados, comparacao, classificacao, validacoes, aplicacao ao estado, dependencias e materias afetadas. Evitar DSL de regras e cadastro livre de expressoes nesta fase.

Cada regra tem tres capacidades independentes: detectar, permitir revisao e gerar com modelo homologado. Detectar objeto ou sucessao nao autoriza gerar automaticamente suas clausulas.

### Mapa de impacto documental

Reaproveitar os mapeadores existentes para manter correspondencia com a folha, mas comparar valores de dominio normalizados e preservar sua apresentacao. Diferencas de ordem em listas, mascara ou formatacao nao podem criar evento. Identificar itens por entidade estavel, nunca pela posicao `socio[2]`.

Relacionar cada diferenca aos blocos e ocorrencias afetados usando o snapshot efetivo, incluindo familias, condicionais e overrides. `extrairCampos` ajuda a montar o indice, mas sozinho lista placeholders de ramos que podem nao ter sido publicados e nao resolve dependencias de valores derivados ou texto literal.

Esse mapa explica onde a mudanca repercute; nao substitui homologacao juridica. Campo citado pode nao exigir ato, e situacao nova ausente do texto anterior pode exigir analise. Manter regras de dominio e campos/causas homologados separados do indice de placeholders.

Classificar separadamente:

- Diferenca de formatacao, sem mudanca semantica.
- Atualizacao cadastral/postal, com tratamento juridico a confirmar.
- Fato ou deliberacao nova.
- Retificacao de informacao de ato anterior, com alvo e causa identificados.
- Inconsistencia ou evidencia insuficiente, que produz pendencia.

Rerratificacao e uma natureza transversal, nao uma familia concorrente com sede/capital/bens. Alteracao de governanca deliberada pode nascer de entrada manual com evidencia, mesmo sem diferenca de cadastro.

Usar auditoria para origem e invalidacao das consultas, nao como unica verdade do antes/depois. Comparacao deve funcionar mesmo se um log faltar e suprimir o falso positivo A -> B -> A. Movimentos continuam sendo evidencia propria: duas operacoes podem produzir saldo final identico sem deixar de precisar de analise.

A selecao confirmada referencia base, identidade do evento e fingerprint do antes/depois. Se o valor mudar novamente, exigir nova conferencia, sem substituir silenciosamente os dados confirmados. Desmarcar exclui o evento somente daquela proposta; nao silencia o campo e nao representa dispensa juridica permanente. Mudanca de pessoa gera analise independente por sociedade onde sua qualificacao aparece, inclusive vinculos presentes na base e ausentes no cadastro atual.

Persistencia de dispensa permanente fica fora do primeiro recorte. Se alertas repetidos justificarem essa funcao, oferecer depois uma acao secundaria com motivo e escopo de base/evento/valor, sem ignorar futuras mudancas do mesmo campo.

## Geracao e registro

O plano aprovado alimenta tanto as resolucoes quanto o estado consolidado. Os handlers nao escrevem DOCX; entregam contexto estruturado para os blocos/familias atuais. Flags passam a ser projecao dos eventos aceitos para compatibilidade com o motor, nao a fonte primaria de verdade juridica.

O par resolucao/clausula consolidada e um padrao util para sede, nao a cardinalidade obrigatoria de todo evento. Qualificacao pode afetar varios papeis e ocorrencias; capital pode precisar de quadros intermediarios. A unidade de impacto e a materia/ocorrencia, com redacao mantida na Biblioteca.

Congelar eventos, IDs dos movimentos, dados tipados, valores de apresentacao, flags, blocos, familias e overrides efetivos na validacao. O artefato arquivado preserva a prova exata, pois executar o mesmo snapshot com outra versao do motor nao garante os mesmos bytes ou paginacao. Separar hash do snapshot, hash do arquivo gerado e hash do arquivo registrado.

Registro deve validar a versao da base e da proposta, permissao, abrangencia dos movimentos e snapshot aprovado em uma transacao de banco. Atualiza status, vinculos, formalizacao e auditoria sem estados intermediarios. Retry com a mesma chave retorna o mesmo resultado; tentativa concorrente com base superada exige revisao. Upload de arquivo nao e transacional com Postgres: enviar antes, validar referencia/checksum e somente depois concluir a transacao, com tratamento de arquivo orfao.

Nao atualizar retroativamente a base antiga. Exigencia ou mudanca no documento protocolado gera nova revisao e nova conferencia. Cancelar proposta nao cancela registro. O caminho inicial pode exigir consolidacao para o modelo homologado de sede, sem impor isso a todos os futuros instrumentos.

### Retificacao delimitada

Antecipar um caso homologado de retificacao pura: instrumento-alvo identificado por registro/protocolo, clausula/alinea, texto anterior e texto corrigido, com evidencia e ratificacao. Prever vinculo de retificacao distinto da sucessao do instrumento, sem concluir que toda exigencia cartorial se resolve por esse caminho.

Natureza do evento e formato da peca sao independentes. Retificacao pode coexistir com fatos novos e consolidacao, como nos exemplos da GMS. O evento corretivo nao cria movimento automaticamente; uma peca combinada pode formalizar movimentos de outros eventos aprovados. Operacoes combinadas ficam para homologacao posterior ao caso puro.

## Persistencia e integracao

Reaproveitar `documento_gerado` para snapshots e linhagem, `documento_arquivo` para evidencias/artefatos e `movimentacao_quotas` para o livro. Avaliar reaproveitamento de `ato_societario` antes de criar outra entidade equivalente. O mapa local confirma essas estruturas em `docs/rls/mapa-do-banco.md`; o desenho fisico final exige leitura dirigida das migrations e garantias de cada tabela.

Propostas e selecoes precisam de persistencia explicita na confirmacao do assistente, anterior a geracao. Reutilizar os checkboxes e a integracao de flags nao significa limitar o dominio a booleanos em `projeto_flag_valor`: guardar tambem antes/depois, movimentos, alvo de retificacao quando houver e identidade dos eventos abrangidos. Preferir tabelas relacionais pequenas para proposta/eventos consultaveis e JSON versionado para estados congelados, sem duplicar todos os cadastros em tabelas historicas nem criar entidades separadas de adiamento/dispensa no primeiro recorte.

Novos hooks de dados seguem `useDomain<Feature>`; componentes nao conhecem Supabase. Escopo de cliente e ambiente, RLS e auditoria CUD com diff sao obrigatorios. Nova pagina protegida exige registro em `protectedPages.ts`. O controller existente tem 1.861 linhas: extrair primeiro comparacao/aplicacao/composicao puras com testes, sem criar um segundo controller monolitico.

Mudancas de schema/RPC serao entregas futuras: migration idempotente no repo, aplicacao somente no sandbox pelo fluxo `db:sync`, producao por humano no Lovable antes do codigo dependente chegar a main. Esta proposta nao autoriza executar essas mudancas.

## Experiencia no OSG Work

### Detectar, pre-selecionar, conferir e confirmar

Reutilizar `AlteracaoContratualDialog` e os checkboxes de AC existentes. Nao adicionar um conjunto de botoes aceitar/adiar/dispensar a cada item. A confirmacao do assistente e o gesto de aprovacao da selecao inteira; pre-marcacao nao e aprovacao nem autorizacao de registro.

1. Ao abrir uma nova proposta, detectar os eventos e pre-marcar os suportados, com regra/modelo homologados e evidencias suficientes.
2. Mostrar resumo antes/depois por item. Origem, campos individuais e clausulas afetadas ficam em detalhes recolhidos.
3. O consultor desmarca o que nao entra na peca, sem justificativa obrigatoria. Eventos agrupados mostram exatamente quais pessoas, campos ou movimentos o checkbox abrange.
4. Ao confirmar, validar dependencias e persistir os eventos incluidos e nao incluidos com os valores conferidos. Se a combinacao for incoerente, explicar o ajuste necessario, sem incluir eventos ocultamente.
5. Gerar resolucoes e consolidado a partir da mesma selecao confirmada.

```text
[x] Alteracao da sede
    Endereco registrado -> endereco atual

[x] Atualizacao da qualificacao de 2 socios
    Endereco e profissao                         Ver detalhes

[ ] Alteracao da administracao
```

Desmarcar significa somente "nao incluir nesta AC". A divergencia continua disponivel para sugestao na proxima proposta, caso persista. Na mesma proposta, reabrir restaura a selecao salva e nao remarca automaticamente o que foi desmarcado. Cancelar o modal nao confirma suas edicoes locais.

Depois da confirmacao, novas divergencias ou novos valores aparecem como novidade para revisao, sem alterar selecao, abrangencia ou documento congelado automaticamente. A adocao exige nova conferencia e confirmacao. Divergencias ambiguas, sem dado obrigatorio ou sem modelo homologado ficam como pendencia, nao como evento geravel pre-marcado. Perguntas especificas, como fato novo versus erro material, aparecem apenas quando necessarias ao caso.

### Superficies progressivas

Comecar na folha da peca registrada, dentro do assistente existente. Depois mostrar resumo por sociedade no quadro societario e, por ultimo, agregacao por cliente/carteira no dashboard. O resumo informa base registrada, mudancas detectadas, pendencias de evidencia e AC em elaboracao. Nao exigir o radar da carteira para entregar os dois primeiros eventos.

Na pessoa, mostrar as sociedades afetadas, sem expor outras carteiras fora da permissao. Confirmar AC de uma sociedade nao encerra a pendencia das demais. Atalhos precisam levar sociedade e documento/proposta por parametros explicitos, pois hoje essas selecoes sao locais no gerador e no quadro.

Recalcular inicialmente na abertura/refetch e invalidar apos mutations relevantes. Consulta agregada por cliente evita uma instancia do controller por empresa. Notificacoes persistentes em background so depois, se o uso exigir; nao introduzir fila e microservico para o primeiro caso.

## Ordem de entrega

1. **Base minima e marco do registro.** Caracterizar fluxo atual; fechar identidade, conteudo confirmado, metadados/evidencia de registro e reproducao congelada. Preservar clausulas legadas. Nao declarar AC-01A entregue apenas porque ledger e flags ja existem.
2. **Radar no assistente atual.** Comparador puro, mapa de impacto e checkboxes pre-marcados. Resumo antes/depois, detalhes recolhidos e pendencias ambiguas. Pode ser entregue como assistencia a revisao, sem anunciar geracao completa.
3. **Selecao confirmada e estado proposto.** Persistir selecao e abrangencia, restaurar ao reabrir, verificar dependencias e aplicar somente eventos aprovados. Comprovar que desmarcar remove os efeitos tanto das resolucoes quanto do consolidado. Essa garantia fecha parte ainda pendente de AC-01A.
4. **Primeiro evento ponta a ponta.** Preferir AC-01B (sede) com um modelo homologado; qualificacao delimitada pode vir antes se seu caso/modelo estiver homologado primeiro. Para sede, validar endereco completo, deslocamento versus atualizacao postal e escopo territorial suportado (mesmo municipio, outro municipio ou outra UF), sem presumir regras iguais. Gerar resolucao, clausula, ocorrencias, ratificacao e numeracao. Filiais nao entram nesse handler. Usar Fartura 11 como candidato e ITFD 2 como contraexemplo de consistencia, apos revisao.
5. **Fechamento e segundo evento.** Corrigir formalizacao/concorrencia em entrega identificada antes do aceite de registro ponta a ponta. Completar o outro evento. Para AC-01C, homologar campos/causas e ocorrencias por papel; data de nascimento tem exemplo na amostra, CPF requer caso e decisao proprios. Nao inferir troca de socio. Validar o conjunto com golden-master.
6. **Retificacao pura e radar ampliado.** Homologar um caso textual restrito com instrumento-alvo e vinculo de retificacao. Expandir visualizacao para sociedade e depois cliente/carteira. Nao exigir dispensa permanente; avaliar sua necessidade a partir do uso.
7. **Catalogo seguinte, em entregas independentes.** Nome empresarial, objeto/CNAEs e filiais dependem de dominio e modelos proprios. Administracao aproveita parte existente, mas poderes/excecoes dependem de governanca homologada. Reenquadrar capital/cessao no plano aprovado, sem tratar derivacao atual como homologacao. Retificacao de bens/matriculas, diferentes meios de integralizacao, doacao/usufruto, sucessao e atos entre sociedades permanecem especializados.

Nao bloquear sede apenas pela existencia de filial, mas bloquear a declaracao de documento completo se o modelo nao consegue preservar suas clausulas ou se a selecao exige mudanca de filial nao suportada. O recorte inicial nao autoriza apagar materias fora de escopo do consolidado.

Importacao de instrumento externo e uma trilha separada quando a sociedade nao tem base interna confiavel: inventariar e deduplicar atos, identificar registro, extrair estado e clausulas com evidencia de pagina, revisar e confirmar a base. IA/OCR podem auxiliar a extracao, mediante autorizacao para processamento dos documentos, nunca aprovar estado ou completar lacunas automaticamente. A base pode exigir varios instrumentos quando o ultimo nao consolida. Nao reconstruir cadeia faltante por suposicao.

## Testes e decisoes de aceite

- Testes puros: formatacao, A -> B -> A, ausente versus vazio, identidade estavel, campos nao homologados, endereco de PF versus sede/filial e ordem de eventos.
- Testes de selecao: aceitar so sede nao adota qualificacao nem movimentos pendentes; eventos dependentes nao podem produzir estado contraditorio.
- Testes do assistente: eventos elegiveis pre-marcados na primeira abertura; ambiguos nao pre-marcados; desmarcar nao exige motivo e persiste apos confirmar; reabrir nao remarca; cancelar nao aplica edicoes locais; nova proposta pode sugerir novamente divergencia persistente.
- Testes de atualizacao: nova divergencia, mudanca no antes/depois ou novo movimento apos confirmacao exige conferencia, sem expandir automaticamente evento ja marcado ou alterar a peca.
- Testes do mapa de impacto: inclusoes, condicionais, derivados, overrides e listas reordenadas nao confundem referencia de template com ocorrencia publicada ou relevancia juridica.
- Testes de rastreabilidade: mudar CPF nao cria socio; a mudanca permanece pendente independentemente em cada sociedade; base antiga nunca muda.
- Testes de consistencia: resolucoes, clausulas alteradas e consolidado usam os mesmos valores aprovados; campos historicos de uma retificacao permanecem antigos onde juridicamente pertinente.
- Testes de persistencia: registro atomico, falha/retry, duas sessoes, base superada, movimento novo apos validacao e cancelamento sem flags.
- Testes documentais: golden-master anonimizado homologado, clausulas preservadas, remissoes, numeracao e XML do DOCX; revisao visual de paginacao separada da igualdade semantica.
- Testes de reproducao: alterar cadastro, Biblioteca ou overrides nao modifica documento registrado; arquivo efetivamente registrado continua acessivel.

Decisoes humanas antes da implementacao: modelo societario e jurisdicao inicial; campos/causas homologados de qualificacao; tratamento juridico da atualizacao postal; politica para clausulas especificas do legado; evidencia exigida para confirmar registro. Nao prometer CPF homologado sem caso real nem todas as familias no primeiro ciclo.

## Planos existentes

- `docs/planos/radar-de-alteracoes-contratuais.md`: origem do marco do registro, observador puro, mapa de impacto e entrada progressiva pelo assistente. Incorporados com as restricoes acima. Nao adotados: substituir homologacao por placeholders, fechar AC-01A sem provar selecao/consolidado, tratar toda rerratificacao como peca sem movimentos ou obrigar tres gestos por divergencia.
- `docs/sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md:330-386`: escopo de AC-01A/B/C.
- `docs/planos/derivacao-de-eventos-e-carimbo.md:165-243`: estado anterior, movimentos e registro.
- `docs/planos/formato-real-da-alteracao-contratual.md`: moldura, ratificacao e consolidacao.
- `docs/planos/render-from-snapshot.md`: congelamento e adocao explicita.
- `docs/planos/notificacoes-mudanca-variavel.md`: avisos cadastrais nao substituem evento juridico.
- `docs/osg/ensaio-reorganizacao-societaria.md:567-592`: limites dos ensaios e homologacao humana.

Esta proposta complementa esses planos. Status historico de entrega em sandbox nao comprova homologacao juridica nem implantacao atual em producao.

As frequencias do corpus citadas no radar nao foram incorporadas como criterio de prioridade: precisam de memoria de calculo, explicacao de categorias sobrepostas e deduplicacao de copias/atos. Codigos da capa da Junta ajudam no inventario, mas nao substituem leitura do conteudo nem comprovam aumento de capital ou outro efeito especifico.

## Estado da implementacao em 08/09/2026

Esta secao registra o que saiu do plano e virou codigo na `develop`, o que ficou tecnicamente
pronto mas nao homologado, e o que ainda depende de alguem. Tudo abaixo esta coberto por
teste automatizado (suite completa: 406 arquivos, 5.054 testes; 44 testes PostgreSQL da
migration em container isolado). Nada foi aplicado em banco compartilhado.

### Decisao juridica tomada nesta rodada

Bernardo homologou **somente a mudanca fisica de sede no mesmo municipio e UF**, com a 11a AC
da Fartura como referencia de modelo. Qualificacao de socio (profissao, endereco, estado
civil, RG, nascimento) e correcao de CPF continuam **detectadas e bloqueadas**: aparecem no
assistente como pendencia, nunca como evento geravel. Atualizacao postal e erro material
(retificacao) tambem ficam bloqueados na propria causa da sede. Nenhum dos tres tem modelo
ou decisao expressa; os PDFs locais nao trazem correcao de CPF (AL Lehnen retifica data de
nascimento, o que nao e analogia valida).

### O que esta implementado

| Peca | Onde | O que faz |
| --- | --- | --- |
| Comparacao por identidade estavel | `src/lib/osg/alteracaoPorEventos.ts` | `analisarAlteracao(base, atual)` compara o snapshot registrado com o cadastro de hoje, normalizado (caixa, espacos, mascaras de CPF/CEP), por `pessoa.id` e pelo id da sociedade. Produz candidatos com antes/depois, evidencia, pendencias e fingerprint. A→B→A nao gera evento; desconhecido (`null`) nao e vazio (`''`). |
| Elegibilidade da sede | idem | Sede elegivel so quando os campos estruturados existem nos dois lados, municipio e UF nao mudam e as ocorrencias da sociedade sao consistentes. Base legada (registrada antes de `sedeLogradouro/sedeNumero/sedeComplemento` existirem) compara por `sedeEndereco`, `sedeBairro`, `sedeMunicipio`, `sedeUf`, `sedeCep` e `sede`; mudanca visivel so na prosa vira pendencia. |
| Endereco de socio PF | idem | A qualificacao passa a ser separada POR MATERIA. `CAMPOS_DE_ENDERECO_PESSOA` (`endereco`) vira candidato proprio (`enderecoSocio:<pessoaId>`, flag `evento_alteracao_qualificacao`) quando a pessoa e PF **e** consta no quadro societario dos dois estados; o resto da qualificacao da mesma pessoa continua como candidato `qualificacao`, inelegivel. Fora do recorte (socia PJ, pessoa que so administra) o endereco volta ao residuo com o motivo escrito. Causas: `mudanca_de_domicilio` e `atualizacao_postal` homologadas, `erro_material` bloqueada. |
| Confirmacao e revisao | idem | `confirmarPropostaAC` valida a selecao (sede e enderecos de socio, sem pendencias; `mudanca_fisica` para a sede, causa homologada para a qualificacao) e devolve a `PropostaAC` v1 com base, candidatos, selecao, eventos confirmados e movimentos abrangidos. `propostaPrecisaRevisao` acusa valor, candidato, pendencia ou movimento novo depois da conferencia. |
| Estado proposto | `src/lib/osg/estadoProposto.ts` | `comporEstadoProposto` aplica a regra `base registrada + eventos confirmados` por materia: sede pelo evento de sede; quadro, capital, aportes, cessoes e retirantes pelos eventos de movimento; administracao pelo evento dela; assinaturas por qualquer dos dois; identificacao da PJ completada quando vazia na base; qualificacao das pessoas a da base para quem ja constava, **exceto o endereco aprovado**. `aplicarEnderecosDeSocios` escreve o endereco confirmado em todas as ocorrencias da pessoa (quadro, administracao, assinaturas, bindings unitarios) e redereiva a prosa `qualificacao`, inclusive nas listas que ficaram congeladas na base. A lista `requalificados` e composta dos candidatos confirmados, na ordem do quadro. `validarSelecaoDeEventos` recusa mudanca de socios sem a causa marcada. |
| Sede estruturada no mapeador | `src/lib/templates/mapeadores.ts`, `vocabulario.ts` | `sociedade.*` ganhou `sedeLogradouro`, `sedeNumero` e `sedeComplemento`. Snapshots novos ja nascem comparaveis campo a campo. |
| Sede fora do audit_logs | `src/lib/osg/eventosDaAlteracao.ts` | A derivacao por janela de `audit_logs` nao acende mais a sede. Administracao e movimentos seguem como estavam. |
| Proposta persistida | `useConfirmarPropostaAC` em `src/hooks/useDocumentoGerado.ts` | Confirmar o assistente grava a alteracao como head em rascunho **ainda nao validada** (`snapshot_validado_em` nulo), com `snapshot_dados = estadoProposto + propostaAC` e as flags projetadas. Reconfirmar atualiza e desvalida. As respostas booleanas em `projeto_flag_valor` continuam sendo gravadas (compatibilidade e legado). |
| Folha e validacao | `src/hooks/useGerarDocumentoController.ts` | A alteracao (proposta, legada ou validada) compoe do estado proposto, nao do cadastro. Validar sela esse estado com `propostaAC` e `movimentosFormalizados` congelados, e recusa quando `propostaPrecisaRevisao` acusa mudanca. `snapshot_versoes_blocos.contextoRender` passa a ser calculado do snapshot que esta sendo gravado. Campo editado a mao na folha prevalece. |
| Assistente | `AlteracaoContratualDialog.tsx`, `ComparacaoAntesDepois.tsx` | Sede pre-marcada so quando elegivel, com evidencia antes → depois, tabela campo a campo recolhida, causa da mudanca (so mudanca fisica confirma) e bloco de pendencias. A qualificacao ganhou o mesmo tratamento: interruptor unico para o evento, tabela com uma linha por socio (a nao elegivel marcada "nao entra nesta peca") e as tres causas de endereco. Um interruptor vale para todos os enderecos elegiveis, como na 7a da GMS, que requalifica quatro socios numa clausula so. Cancelar nao aplica; reabrir restaura a selecao gravada e volta ao passo 1. |
| Resolucao de qualificacao | `supabase/migrations/20260909205536_resolucao_qualificacao_endereco_socio.sql`, colecao `requalificados` em `binding.ts`, `mapearRequalificados`/`vocabularioDaRequalificacao` em `mapeadores.ts` | Flag `evento_alteracao_qualificacao` no catalogo (antes era constante orfa no codigo), bloco `livre` de redacao modelada em GMS 7a, ITFD Participacoes 2a, MMS Participacoes 1a e Fartura 8a, e posicao 4 — a PRIMEIRA das resolucoes, como nos quatro instrumentos. Concordancia de numero e genero no codigo; lista vazia derruba o bloco por 'lista-vazia', como na clausula de retirada. **Aplicada no sandbox em 09/09/2026**; producao pendente. **A redacao ainda precisa do aceite de quem responde pelo texto juridico.** |
| Resolucoes da doacao de quotas | `supabase/migrations/20260910212126_resolucao_doacao_quotas_usufruto.sql`, colecoes `doacoes`/`usufrutos`/`gravamesQuotas`/`quadroUsufruto` em `binding.ts`, `mapearListasDaDoacao` em `mapeadores.ts` | A doacao deixa de ser um caso da cessao: flag propria `evento_doacao_quotas` na derivacao, na selecao e no estado proposto, e cinco blocos `livre` logo depois da cessao (doacao, reserva de usufruto, gravames, anuencia e renuncia a preferencia, quadro de usufruto e voto). As tres primeiras colecoes saem dos onus DESTE ato; o quadro de usufruto e voto sai de todos os onus vigentes, porque e estado da sociedade. A resolucao de cessao ganhou versao exclusivamente onerosa, sem o ramo `{{#seDoacao}}`. **Aplicada no sandbox em 10/09/2026**; producao pendente. **A redacao ainda precisa do aceite de quem responde pelo texto juridico.** Detalhe em `docs/osg/doacao-de-quotas-com-usufruto.md`. |
| Ecos do onus no consolidado | `supabase/migrations/20260910220109_ecos_do_onus_na_consolidacao.sql`, `mapearEstadoDosOnus` em `mapeadores.ts`, `conferirSomasDoUsufruto` em `usufrutoDoAto.ts` | Gravame e usufruto sao ESTADO da sociedade, nao texto da peca que os criou: `quadroUsufruto` e `gravamesVigentes` entram em `LISTAS_VIVAS_SEMPRE`, excecao declarada a regra `base + eventos confirmados`, senao a AC de sede seguinte apagaria os dois do contrato vigente. Tres blocos SEM flag no consolidado (nota de gravame no capital, clausula autonoma de usufruto e voto, ressalva na alienacao), no fim de cada corrida de paragrafos para nao renumerar o que outras clausulas citam. Sem onus, o descarte por 'lista-vazia' derruba os tres. As tres somas da tabela viram pendencia da folha. **Aplicada no sandbox em 10/09/2026**; producao pendente. **Redacao pendente de aceite juridico.** |
| Variantes do onus (fatia 4) | `src/lib/osg/onusDaSociedade.ts`, `useInstituicaoDeUsufruto.ts`, sub-rogacao em `useRegistrarMovimento` | SUB-ROGACAO: o gravame e da QUOTA e acompanha o bem quando ela muda de mao. As livres saem primeiro; a inalienabilidade barra a cessao onerosa e nao a gratuita; a nua propriedade indo para quem ja usufrui extingue o usufruto por consolidacao (art. 1.410, VI, do CC). O onus antigo morre inteiro e renasce dividido, preso ao movimento, e `extinto_por_movimento_id` faz o reverter ressuscita-lo. INSTITUICAO AVULSA: ato proprio, sem lancamento no livro, onus preso ao ato por `ato_id`. O consolidado ja publica as duas pela fatia 3. **Falta a resolucao da instituicao na peca**: o bloco existe e a flag nao acende, porque a instituicao nao tem movimento para carimbar de formalizada (decisao aberta 4 do doc da frente). |
| Registro com marco | `RegistrarNaJuntaDialog.tsx`, `useRegistrarDocumento`, `useEnviarArquivoRegistrado` | Registrar exige protocolo, numero de arquivamento, tres datas em ordem, junta/UF e o PDF chancelado. O PDF sobe antes (GCS + `documento_arquivo` aprovado, vinculado a peca e a PJ); depois um UPDATE so vira o status e grava `snapshot_dados.registroContratual`. `confirmacaoId` estavel por abertura e arquivo reaproveitado no retry. O carimbo dos movimentos usa o conjunto congelado na validacao. |
| Ordem do fluxo | `src/lib/osg/estadoDaSociedade.ts` | Fato novo `validada`: alteracao confirmada e nao validada esta "em composicao" e nao pode ser registrada. |
| Peca registrada | controller + `renderizarVersao.ts` | A head registrada renderiza so do snapshot; sem snapshot de blocos a folha mostra o erro explicativo em vez da etapa de escolhas. Flags e bindings do assistente vem do modelo, nao do retrato da peca anterior. |
| Registro atomico no banco | `supabase/migrations/20260908211755_registro_contratual_atomico.sql` | Trigger BEFORE que valida snapshot, escopo, arquivo e metadata, carimba movimentos e bens na mesma transacao, audita e torna registrados/formalizados imutaveis. **Aplicada no sandbox em 09/09/2026**; producao pendente (passo humano pelo Lovable). O app deixou de gravar trilha e carimbo por conta propria. Contrato em `docs/osg/registro-contratual-atomico.md`. |

### O que fica tecnicamente suportado e nao homologado

- Qualificacao FORA do endereco de socio PF (CPF, profissao, estado civil, RG, data de
  nascimento, filiacao, naturalidade): detectada por id estavel, exibida como pendencia, sem
  interruptor. O estado proposto mantem a qualificacao registrada para quem ja constava.
  Falta decisao juridica sobre campos e causas, e um modelo com a resolucao de cada materia.
- Endereco de socio: o modelo existe e a geracao esta ligada, mas a REDACAO da resolucao foi
  derivada dos instrumentos registrados sem aceite de quem responde pelo texto juridico.
  Antes de produção, ela precisa desse aceite (ver a linha da migration na tabela acima).
- Endereco de socia PJ e de quem so administra: detectado, com o motivo, e sem interruptor.
  A resolucao homologada nomeia socio pessoa fisica.
- Atualizacao postal e erro material da sede: a causa existe no assistente e bloqueia a
  confirmacao com o motivo.
- Eventos de movimento parcialmente marcados: a folha segue a projecao viva do livro quando
  qualquer evento de quota esta marcado (comportamento anterior preservado). Desmarcar uma
  cessao com um aporte marcado ainda nao retira o efeito dela do quadro. E a lacuna 3 do plano,
  ainda aberta; a dependencia coberta e "mudanca de socios sem causa".

### Pendencias que dependem de alguem

1. ~~Aplicar a migration do registro atomico no sandbox~~ **Feita em 09/09/2026**, com a
   remocao do `logAction` de status em `useRegistrarDocumento` e da chamada a
   `useFormalizarMovimentos` em `confirmarRegistro`. Efeito colateral aceito: no sandbox, quem
   registrar por codigo antigo (outras branches) passa a ser recusado pela trigger, porque ela
   exige snapshot completo, escopo congelado e metadata de registro. **Producao**: passo humano
   pelo Lovable, obrigatorio antes de a `develop` chegar a `main`, senao registrar la fica sem
   trilha e sem carimbo.
2. **Cancelar proposta**: a RLS de DELETE em `documento_gerado` e so de admin, e o CHECK de
   `status` nao tem valor para "cancelado". Hoje o consultor desmarca tudo e reconfirma. Precisa
   de migration (novo valor no CHECK) e de `useDocumentoSucessor` ignorar esse status.
3. **Evidencia dos movimentos** (`snapshot_dados.movimentosEvidencia`): a trigger a confere
   quando presente, mas o app ainda nao a grava (precisa das linhas cruas de
   `movimentacao_quotas`, que `useMovimentosDaEmpresa` nao devolve). Sem ela o banco garante o
   conjunto de ids e a titularidade, nao o valor de cada movimento entre validacao e registro.
4. **Verificacao no app rodando**: os fluxos foram exercitados por teste de tela (jsdom), nao
   no navegador. Roteiro abaixo.
5. **Golden-master homologado**: os testes usam dados sinteticos. A fixture anonimizada da
   Fartura 11a ainda nao foi produzida.

### Roteiro de teste no app (sandbox)

Sede:

1. Escolha uma sociedade com contrato social **registrado** e snapshot completo (validada
   depois desta entrega, para ter `sedeLogradouro/sedeNumero/sedeComplemento`; uma base antiga
   funciona por `sedeEndereco`, mas mudanca so no complemento vira pendencia).
2. Em Qualificacao das Partes, troque logradouro, numero ou complemento da PJ **sem** mudar
   municipio e UF. Opcionalmente troque tambem a profissao de um socio.
3. Em Gerar Documento, na folha registrada, clique "Gerar alteracao contratual". A sede vem
   marcada com "Sede: A -> B"; a profissao aparece em "Divergencias que nao viram evento".
4. Abra "Ver antes e depois", mantenha a causa "Mudanca fisica", Continuar, Confirmar. O rail
   passa a "Alteracao contratual · confirmada, por validar". A folha mostra a resolucao e o
   consolidado com o endereco novo e o socio com a profissao antiga.
5. Troque o numero da sede de novo no cadastro e tente "Validar versao": o toast pede nova
   conferencia. Reabra "Rever os eventos", confirme, e valide.
6. Registrar na junta so aparece depois de validar. Preencha protocolo, arquivamento, datas,
   junta e anexe um PDF. Sem a trigger aplicada, o carimbo dos movimentos continua sendo
   feito pelo app, com o conjunto congelado.

Qualificacao e CPF: repita o passo 2 alterando so o CPF ou a profissao de um socio. O
assistente nao oferece interruptor; a pendencia diz "Qualificacao detectada, sem autorizacao
juridica". Confirmar sem eventos gera uma peca cujo consolidado e igual ao registrado.
