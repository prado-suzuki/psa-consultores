# TAREFA (próxima sprint) — Atrito de uso no cadastro de clientes (Tax)

> **Origem:** análise pedida pela Patrícia em 2026-08-11 sobre `/equipe/tax/projetos/clientes` — "não impedem nada, mas custam tempo e produzem erro silencioso de digitação".
> **Escopo:** o modal de cliente inteiro (`NewClientModal`: Cliente/Grupo, Contribuintes, Representantes, OS, Faturamento) + a lista e a busca da tela.
> **Nada aqui exige mudança de estrutura de banco.** Os dois pontos que mexem em dado já gravado estão marcados ⚠️ e são decisão da Patrícia.
> **O "como" é do tech lead.** Cada item traz o sintoma, onde ele mora no código e como conferir que acabou.

## Contexto (o que está errado hoje)

O cadastro só valida **presença** e **tamanho** de campo (tem CEP? UF tem 2 letras?). Ele não valida **conteúdo**: um CNPJ inválido com 14 dígitos, uma UF que não existe, um município escrito de dois jeitos e um e-mail com espaço no fim passam todos pelo "Salvar Alterações" sem uma palavra. Como a tela nunca reclama, o erro só aparece semanas depois — no faturamento, no painel do sócio ou no cliente que não recebeu a notificação.

Três consequências que já dá para ver:
- a base tem CPF/CNPJ em formatos mistos (com e sem máscara) — o próprio código de duplicidade contorna isso buscando as duas variações (`src/hooks/useContribuinteDuplicateCheck.ts:12-27`);
- a aba **Faturamento** mostra dados que ninguém escolheu e ignora as inscrições estaduais que foram cadastradas;
- a busca da lista não acha cliente com acento, e a checagem de duplicidade também é exata — as duas juntas produzem cliente cadastrado em dobro.

**Se for para escolher três:** A2 + A3 (faturamento errado é dinheiro), A1 (CNPJ inválido contamina tudo o que vem depois) e A4 + A11 juntos (é o mesmo problema: texto livre onde devia ter lista, e busca que não acha o que existe).

---

## Grupo A — grava dado errado sem ninguém ver

### A1 — CPF/CNPJ entra sem ser conferido
**Sintoma:** a validação só conta dígitos: 11 ou 14 e está aprovado. CNPJ digitado errado (dígito verificador inválido) entra normal. Numa linha marcada **PJ** dá para salvar um CPF de 11 dígitos, que a máscara ainda mostra como um CNPJ quebrado (`12.345.678/901`). A consulta à Receita falha com um aviso que some sozinho ("CNPJ não encontrado na base federal") e o Salvar aceita mesmo assim.
**Onde:** `src/lib/clientFormValidation.ts:65-76` (`validateContribuinteDocumento`) e o espelho em `src/lib/camposObrigatorios.ts:82-86`; máscara em `src/components/equipe/client-form/constants.ts:36-51`; consulta em `src/hooks/useExternalConsults.ts:11-43`.
**Aceite:** documento com dígito verificador inválido não salva; documento com quantidade de dígitos incompatível com o Tipo (PF/PJ) não salva; consulta à Receita que não encontra o CNPJ aparece como pendência do campo, não como aviso que passa.

### A2 — Contribuinte de faturamento sem ninguém ter escolhido
**Sintoma:** se o switch "Contribuinte de Faturamento" não é ligado em ninguém, a aba Faturamento mostra o **primeiro contribuinte da lista** como se fosse o escolhido — sem dizer que é um palpite. Se dois estiverem ligados, mostra um e ignora o outro. Faturamento sai no CNPJ errado e a tela parece certa.
**Onde:** `src/components/equipe/client-form/FaturamentoTab.tsx:9` (`entities.find(...) || entities[0]`); switch em `src/components/equipe/client-form/ContribuinteDadosFiscais.tsx:111-120`; não existe nenhuma regra sobre isso em `src/lib/clientFormValidation.ts`.
**Aceite:** com nenhum contribuinte marcado, a aba diz que falta escolher (não escolhe sozinha); com mais de um marcado, o cadastro não salva; a aba Faturamento sempre mostra o contribuinte que está marcado.

### A3 — A Inscrição Estadual cadastrada não chega no Faturamento
**Sintoma:** as IEs são cadastradas numa lista por UF (Sim/Não/Isento + número), mas a aba Faturamento e a lista de contribuintes ainda leem o campo **antigo** de IE, que o formulário nem edita mais. Resultado: contribuinte com IE cadastrada aparece como **"Isento"** no Faturamento e sem IE na lista.
**Onde:** `src/components/equipe/client-form/FaturamentoTab.tsx:63` (`inscricao_estadual || "Isento"`) e `src/pages/equipe/fiscal/GestaoClientes.tsx:169` (`IE ${c.inscricao_estadual}`); as IEs vivas estão em `inscricoesMap` / `src/components/equipe/client-form/InscricoesEstaduaisEditor.tsx`; o save só repassa o campo legado (`src/hooks/useSaveClientTransaction.ts:308`).
**Aceite:** contribuinte com IE em MT aparece com essa IE no Faturamento e na lista; "Isento" só aparece para quem foi marcado como isento.

### A4 — UF, Município, Bairro e Logradouro são texto livre
**Sintoma:** UF é uma caixinha de 2 letras: aceita `mt`, `SP ` (com espaço), `XX`. Município aceita "Cuiaba" e "Cuiabá" como duas cidades diferentes. Isso quebra qualquer agrupamento por estado/município nos painéis, e ninguém percebe porque os dois valores existem lado a lado. A lista de UFs já existe no sistema e já é usada nas inscrições estaduais.
**Onde:** `src/components/equipe/client-form/ContribuintesTab.tsx:543-567` (município e UF); lista pronta em `src/components/equipe/client-form/constants.ts:22-25` (`UF_STATES`), em uso em `InscricoesEstaduaisEditor.tsx:47`; gravação sem `trim`/maiúscula em `src/hooks/useSaveClientTransaction.ts:321-322`.
**Aceite:** UF só entra pela lista de 27 estados; município/bairro/logradouro entram sem espaço sobrando; contar clientes por UF e por município não gera duas linhas para o mesmo lugar.
**⚠️ Decisão da Patrícia:** consertar a entrada **não** conserta o que já está gravado. Padronizar as UFs e os municípios que já entraram torto é um acerto de dados à parte (script pontual, sem mudar estrutura) — vale a pena? Sem isso, os painéis continuam com as duas grafias do histórico.

### A5 — E-mail do representante salvo exatamente como foi digitado
**Sintoma:** espaço no fim, maiúscula no meio — a validação aceita (ela confere o e-mail já limpo, mas grava o texto cru). Se esse representante tem **acesso a chamados**, o acesso e as notificações simplesmente não chegam, e nada na tela acusa: o cadastro parece completo.
**Onde:** campo em `src/components/equipe/client-form/RepresentantesTab.tsx:300-310`; validação em `src/lib/clientFormValidation.ts:141-142`; gravação em `src/hooks/useSaveClientTransaction.ts:458-460`.
**Aceite:** e-mail é gravado sem espaço e em minúsculas; um e-mail repetido entre dois representantes do mesmo cliente é avisado.

### A6 — Cliente duplicado só é pego com o nome idêntico
**Sintoma:** a checagem compara o nome **letra por letra**. "Agro Amazônia Produtos Agropecuários S.a." e "AGRO AMAZONIA PRODUTOS AGROPECUARIOS SA" entram os dois, sem nem a pergunta "cadastrar mesmo assim?". E na **edição** do nome não há checagem nenhuma: dá para renomear um cliente para o nome de outro que já existe.
**Onde:** `src/hooks/useSaveClientTransaction.ts:192-204` (`.eq("nome", ...)`, dentro de `if (!isEditing)`).
**Aceite:** nome que só difere por acento, maiúscula ou espaço cai na confirmação de duplicado; renomear para um nome existente também cai.

### A7 — CNPJ já cadastrado em outro cliente só gera um aviso que passa
**Sintoma:** ao sair do campo aparece "Contribuinte já cadastrado no cliente X" — e o Salvar aceita de qualquer forma. O save só barra documento repetido **dentro do mesmo cliente**. Quem colar o CNPJ e salvar direto pode nem ver o aviso.
**Onde:** aviso em `src/components/equipe/client-form/ContribuintesTab.tsx:165-224`; regra do save em `src/lib/clientFormValidation.ts:111-133` + `src/hooks/useSaveClientTransaction.ts:167-176`.
**Aceite:** CNPJ que já é contribuinte de outro cliente não salva (CPF continua podendo repetir entre clientes — sócio pode ser contribuinte de mais de um, isso é intencional).

### A8 — A consulta do CNPJ apaga o que já foi digitado
**Sintoma:** quando a Receita não devolve nome fantasia ou atividade principal, esses campos voltam a **vazio** — apagando o que a pessoa tinha escrito, sem avisar. E o CEP volta **sem máscara** (`78000000` em vez de `78000-000`), que é uma das origens dos formatos mistos na base.
**Onde:** `src/hooks/useExternalConsults.ts:24` (nome fantasia), `:26` (atividade principal), `:27` (CEP).
**Aceite:** a consulta preenche o que está vazio e não apaga o que foi digitado; CEP fica no mesmo formato, tenha vindo da consulta ou da mão.

### A9 — Datas da OS aceitam data que não existe
**Sintoma:** `31/02/2026` é aceito (o formulário só confere dia 1-31, mês 1-12, ano 2000-2060). Data de fim antes da data de início também passa.
**Onde:** `src/components/equipe/client-form/constants.ts:86-96` (`parseDateMask`); `validateOrdemServico` em `src/lib/clientFormValidation.ts:154-182` não olha as datas; campos em `src/components/equipe/client-form/ContratosTab.tsx:388-389`.
**Aceite:** data inexistente não é aceita; fim antes do início não salva.

### A10 — Campos sem formato: CNAE, número da IE, telefone do contribuinte
**Sintoma:** CNAE é texto livre (sem os 7 dígitos, sem lista) — errar um dígito é invisível, e a "Atividade Principal" ao lado continua mostrando a descrição antiga. Número de IE é livre até 15 caracteres, sem formato por estado, e **duas IEs da mesma UF** passam (o rateio da OS já barra centro de custo repetido; a IE não). Telefone do contribuinte aceita 8 dígitos, enquanto o do representante exige 10.
**Onde:** CNAE em `src/components/equipe/client-form/ContribuinteDadosFiscais.tsx:70-79`; IE em `src/components/equipe/client-form/InscricoesEstaduaisEditor.tsx:64-70`; telefone do contribuinte em `src/components/equipe/client-form/ContribuintesTab.tsx:476-479` vs. a regra do representante em `src/lib/clientFormValidation.ts:143-145`.
**Aceite:** CNAE só entra no formato válido; duas IEs da mesma UF não salvam; telefone segue a mesma regra nas duas abas.

### A11 — Categoria e Tipo de relacionamento já vêm marcados
**Sintoma:** todo cliente novo nasce **Bronze** e **Fixo** sem ninguém escolher — e a Categoria não tem nem opção de "não classificado". Isso vira número no board do sócio como se fosse uma decisão comercial.
**Onde:** `src/components/equipe/client-form/constants.ts:115-125` (`defaultClientData`) e o select sem opção vazia em `src/components/equipe/client-form/ClienteTab.tsx:138-152`.
**Aceite:** cliente novo começa sem categoria e sem tipo de relacionamento definido; um dos dois (ou os dois) precisa ser escolhido para salvar — **a Patrícia decide se são obrigatórios ou se aceitam "a definir"**.

---

## Grupo B — não erra o dado, mas custa tempo

### B1 — A busca da lista não acha o cliente que existe
**Sintoma:** o campo diz "Pesquisar por todos os clientes...", mas procura só no **nome do cliente** e não ignora acento: "amazonia" não encontra "Agro Amazônia". CNPJ e nome de contribuinte não são pesquisáveis. O cliente parece não existir → cadastram de novo, e aí cai no A6.
**Onde:** `src/pages/equipe/fiscal/GestaoClientes.tsx:222-227`; campo em `src/components/equipe/clientes/ClientesFilterBar.tsx:171-181`.
**Aceite:** "amazonia" acha "Amazônia"; colar um CNPJ acha o cliente do contribuinte; buscar o nome de um contribuinte acha o cliente dele.

### B2 — "Copiar de outro" não deixa escolher de quem
**Sintoma:** o botão copia o endereço do **primeiro** contribuinte da lista que tenha CEP. Com vários contribuintes, quase nunca é o que a pessoa queria — e ela só descobre pelo aviso, depois de copiar.
**Onde:** `src/components/equipe/client-form/ContribuintesTab.tsx:268-279`.
**Aceite:** o botão pergunta de qual contribuinte copiar quando há mais de um candidato.

### B3 — Autofill por CPF traz endereço antigo sem revisão
**Sintoma:** ao digitar um CPF que já existe na base, os campos vazios são preenchidos a partir da **cópia mais recente** daquele CPF. Se o cadastro antigo estava desatualizado, o endereço velho entra e ninguém confere — só passa um aviso.
**Onde:** `src/components/equipe/client-form/ContribuintesTab.tsx:127-156`.
**Aceite:** os campos vindos de outro cadastro ficam visivelmente marcados como "vindos de um cadastro anterior — confira", até serem confirmados.

---

## Fora de escopo desta tarefa (registrado para não sumir)

- **Rótulo x dado do Tipo de relacionamento:** a tela mostra "Fixo / Pontual / Em Análise", mas o banco guarda `Sim` / `Não` / `Em Análise` (`ClienteTab.tsx:46-50`, `ClientesFilterBar.tsx:45-50`). Quem lê o dado cru (export, relatório, consulta) vê "Sim" e precisa saber traduzir. Renomear os valores é mudança em dado gravado ⚠️ — decisão da Patrícia, em outra tarefa.
- **Telefone/município/UF do cliente (grupo):** existem no cadastro e são gravados, mas o formulário não tem campo para eles (`constants.ts:115-125` vs. `ClienteTab.tsx`). Ou ganham campo, ou saem — hoje são um dado que ninguém consegue corrigir pela tela.
