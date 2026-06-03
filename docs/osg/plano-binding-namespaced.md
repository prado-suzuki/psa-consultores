# Plano de execução — Binding namespaced por entidade (Oficina de Contratos)

> **Handoff para implementação.** Este documento é autossuficiente: contém objetivo, critérios
> de pronto, arquivos relevantes, passos ordenados e as decisões já tomadas (com o porquê) para
> não serem refeitas. Contexto de fundo em [`arquitetura-sintese.md`](./arquitetura-sintese.md) e
> [`catalogo-familias-e-flags.md`](./catalogo-familias-e-flags.md).

## 1. Objetivo

Aproximar o gerador de documentos OSG ("Oficina de Contratos") do fluxo real, **focando no
binding de dados**: trocar o vocabulário plano/global (centrado em uma matrícula) por um
**vocabulário namespaced por entidade** (`{{ proprietario.nome }}`, `{{ imovel.area }}`), permitir
que a tela Gerar **ligue múltiplas entidades** do cliente (pessoas + imóveis), e resolver
**concordância de gênero** a partir de `pessoa.genero`.

### Restrições firmes (não violar)
- **Sem flags / hot-swap** nesta etapa — a composição (`comporBlocos`) fica como está.
- **Sem migrations** — só código sobre as tabelas existentes.
- **Fora de escopo**: administração, quotas, quadro societário, capital, iteração/coleções,
  partials de qualificação. (As tabelas `administracao`/`quadro_societario`/`capital_integralizacao`
  existem no schema mas **não** devem ser usadas agora.)

## 2. Critérios de pronto (Definition of Done)

- [ ] Vocabulário reorganizado em **catálogos por entidade** (`pessoa`, `bem`, `matricula`, `cartorio`); placeholders passam a ser `binding.campo`.
- [ ] **Modelo de binding** implementado: detecção dos bindings de um modelo, resolução do tipo de entidade por papel, e montagem de **contexto aninhado** consumido pelo render pontilhado **sem alterar `render.ts`**.
- [ ] **Concordância de gênero** funcionando (formas masc/fem derivadas de `pessoa.genero`).
- [ ] Tela **Gerar**: detecta bindings do modelo, mostra **um seletor de registro por binding** (filtrado pelo cliente da barra global), preenche por mapeador, mantém campos **editáveis** como fallback, e renderiza ao vivo.
- [ ] **Autocomplete** do editor de blocos passa a sugerir placeholders namespaced, agrupados por entidade; chips continuam funcionando.
- [ ] `npx tsc --build --noEmit` limpo, `npx eslint` sem erros nos arquivos tocados.
- [ ] `npx vitest run src/lib/templates` verde — `render.test.ts`/`extenso.test.ts` **inalterados**; `vocabulario.test.ts` atualizado, com paridade da Mat. 9.617 em namespace `imovel.*` e ≥1 caso de concordância (M vs F).
- [ ] `npx vite build` ok.
- [ ] Verificação manual ponta a ponta (ver §7) passa.

## 3. Estado atual / arquivos relevantes (já identificados)

**Alavanca-chave**: `src/lib/templates/render.ts` — `renderConteudo` já resolve **caminho pontilhado**
(`/\{\{\s*([\w.]+)\s*\}\}/g` + `split('.').reduce`) sobre contexto aninhado. Logo `{{ socio.nome }}`
já resolve se o contexto for `{ socio: { nome } }`. **Não alterar** este arquivo.

| Arquivo | Papel hoje | Toca? |
|---|---|---|
| `src/lib/templates/render.ts` | resolve `{{ a.b }}` aninhado; `extrairCampos` | **NÃO** |
| `src/lib/templates/extenso.ts` | por extenso pt-BR (`areaExtenso`, `valorExtenso`, `cardinalExtenso`, `formatarArea`, `formatarValor`) | **NÃO** (reusar) |
| `src/lib/templates/composition.ts` | `comporBlocos(template, flagsAtivas)` | **NÃO** (sem flags) |
| `src/lib/templates/index.ts` / `types.ts` | `gerarDocumento`; `Contexto = Record<string,unknown>` (já aninhável) | **NÃO** |
| `src/lib/templates/vocabulario.ts` | array PLANO global (areaHa, valorContabil, livro, folha, denominacao, proprietario, municipio, uf, matricula, cartorio, comarca, ufCartorio, ccir, confrontacoes); `camposNecessarios`, `montarContextoDeEntradas`, `listarPlaceholders` | **EDITAR** |
| `src/lib/templates/vocabulario.test.ts` | testa mapeamento + Mat. 9.617 (fixture inline) | **EDITAR** |
| `src/hooks/useGeracaoDocumento.ts` | `useEntradasMatricula(matriculaId)` → Record plano (JOIN matricula→bem→cartorio→titularidade→pessoa); contém `ufPorExtenso` | **EDITAR** |
| `src/pages/equipe/osg/GerarDocumento.tsx` | escolhe modelo + 1 matrícula; form dinâmico via `camposNecessarios`; render ao vivo; tem `EXEMPLO` hardcoded (Mat. 9.617) | **EDITAR** |
| `src/components/equipe/osg/EditorConteudoModelo.tsx` | editor contentEditable; autocomplete via `listarPlaceholders()`; chips | **EDITAR** (fonte do autocomplete) |
| `src/pages/equipe/osg/MontagemDocumentos.tsx` | sequência de blocos; não toca vocabulário | **NÃO** |

**Hooks/dados a reusar (já existem):**
- `usePessoasByCliente(clienteId)` — `src/hooks/useQualificacaoDasPartes.ts:33`
- `useBensByCliente(clienteId)` — `src/hooks/useDiagnosticoPatrimonial.ts:83`
- `useAllMatriculas()` — `src/hooks/useDiagnosticoPatrimonial.ts:302` (filtrar por cliente: lógica já em `GerarDocumento.tsx` via `bem_cliente_id`/`titular_cliente_ids`)
- `useCartorios()` — `src/hooks/useDiagnosticoPatrimonial.ts:782`

**Campos disponíveis HOJE (tabelas reais):**
- `pessoa`: `denominacao`, `cpf_cnpj`, `tipo_pessoa` (PF/PJ), **`genero` (`'M'`/`'F'`)**, `data_nascimento`, `estado_civil`, `profissao`, `nacionalidade`, `endereco_{logradouro,numero,complemento,bairro,municipio,uf,cep}`, `documento_identidade_{tipo,numero,orgao,uf}`, `filiacao_pai`, `filiacao_mae`, `naturalidade_{municipio,uf}`, `objeto_social`, `regime_bens`.
- `bem`: `denominacao`, `referencia_dp`, `tipo_bem`, `vlr_contabil`, `vlr_mercado`, `ccir_codigo`, `inscricao_municipal`.
- `matricula`: `numero`, `livro`, `folha`, `municipio_imovel`, `uf_imovel`, `area_documento`, `area_unidade`, `confrontacoes_texto`, `descricao_psa_completa`, `data_matricula`, `cartorio_id`, `bem_id`.
- `cartorio`: `nome_completo`, `comarca`, `uf`, `numero_oficio`.
- `titularidade`: `titular_pessoa_id`, `tipo`, `fracao`, `matricula_id` | `bem_id`.

## 4. Modelo de binding (decisão central)

- Placeholder = `<binding>.<campo>` (ex.: `{{ proprietario.nome }}`, `{{ imovel.area }}`).
- **Binding** = nome (papel-lite) + **tipo de entidade** (`pessoa | bem | matricula | cartorio`),
  resolvido por um mapa `PAPEIS` (`proprietario→pessoa`, `imovel→matricula`, `cartorio→cartorio`…),
  com fallback por prefixo (`socio2→socio`) para múltiplos do mesmo papel. O prefixo desambigua
  campos homônimos (`proprietario.denominacao` vs `imovel.denominacao`).
- `Binding` carrega `cardinalidade: 'um'` — **campo reservado**; **não** implementar `'lista'`/coleções
  agora (é o gancho para a fase futura de iteração).
- Na geração, o consultor liga cada binding a um **registro** do cadastro do cliente; o mapeador
  converte o registro nos campos do vocabulário (com derivados); `montarContexto` monta o objeto
  aninhado `{ proprietario:{...}, imovel:{...} }` que o `renderConteudo` consome.

## 5. Passos ordenados de implementação

1. **`src/lib/templates/vocabulario.ts`** — substituir o array plano por catálogos por entidade
   `ENTIDADES: Record<TipoEntidade, { tipo, label, campos: CampoEntidade[] }>` (pessoa/bem/matricula/
   cartorio). `CampoEntidade { id, label, tipo, derivadoDe? }`. Novas funções: `camposDaEntidade(tipo)`,
   `derivarCampos(tipo, valores)` (re-deriva extensos/concordância na edição manual), e
   `listarPlaceholders()` agora emite sugestões namespaced agrupadas
   (`{ placeholder:'proprietario.nome', label:'Proprietário — Nome', grupo:'Proprietário', tipo }`).
   Manter o tipo `TipoCampo`.
2. **`src/lib/templates/concordancia.ts`** (novo) — `concordar(genero:'M'|'F'|null, m, f)` + dicionário
   de pares jurídicos (artigo `o/a`, `nascido(a)`, `portador(a)`, `residente e domiciliado(a)`,
   `inscrito(a)`, `casado(a)` combinando `estado_civil`+`genero`, `brasileiro(a)`). **Mover `ufPorExtenso`
   para cá** (sai de `useGeracaoDocumento.ts`). Conjunto inicial pequeno e extensível.
3. **`src/lib/templates/binding.ts`** (novo) — `type Binding { nome, tipo, cardinalidade:'um' }`,
   `PAPEIS` (mapa nome→{tipo,label}), `resolverTipoDoBinding(nome)` (PAPEIS → exato; senão `nome===tipo`;
   senão prefixo; senão `null`), `detectarBindings(placeholders): { bindings: Binding[], desconhecidos: string[] }`
   (placeholders sem ponto → `desconhecidos`/texto livre, compat com modelos legados).
4. **`src/lib/templates/mapeadores.ts`** (novo) — mapeadores puros (sem React, testáveis):
   `mapearPessoa(row)`, `mapearBem(row)`, `mapearMatricula(rowEnriquecida)`, `mapearCartorio(row)`
   → `Record<campoId,string>` já com derivados (extensos via `extenso.ts`, concordância via
   `concordancia.ts`). `mapearMatricula` reusa a lógica de `useEntradasMatricula` (área m²→ha,
   uf por extenso, **bem+cartório+titulares achatados** sob o binding). `montarContexto(bindings,
   selecao, desconhecidos): Contexto` monta o objeto aninhado.
5. **`src/hooks/useGeracaoDocumento.ts`** — substituir `useEntradasMatricula` por
   `useRegistrosPorTipo(clienteId)` que reusa `usePessoasByCliente`, `useBensByCliente`,
   `useAllMatriculas` (filtrada por cliente) e `useCartorios`, devolvendo por tipo `{ id, label, row }`
   (guarda a linha crua para o mapeador). Delegar o mapeamento de matrícula a `mapearMatricula`.
6. **`src/pages/equipe/osg/GerarDocumento.tsx`** — reescrever o miolo: `detectarBindings(placeholders)`
   → para cada binding um `<Select>` de registro do tipo certo → ao escolher, mapeia e preenche
   `selecao[binding]` (campos editáveis como fallback, re-derivando com `derivarCampos`) →
   `montarContexto(...)` → `gerarDocumento(template, ctx)` ao vivo. Estado passa de `Record<string,string>`
   para `Record<binding, Record<campoId,string>>`. Atualizar o `EXEMPLO` (Mat. 9.617) para o formato
   namespaced (ou remover).
7. **`src/components/equipe/osg/EditorConteudoModelo.tsx`** — trocar a fonte do autocomplete para o
   `listarPlaceholders()` namespaced e **agrupar o dropdown por entidade**. Tokenização/chips/cursor
   **não mudam** (regex já casa `[\w.]+`). Inserção cola o caminho com prefixo de binding.
8. **`src/lib/templates/vocabulario.test.ts`** — atualizar o fixture para namespace (`{{ imovel.area }}`,
   `{{ proprietario.nome }}`) preservando a paridade da Mat. 9.617; adicionar ≥1 caso de concordância
   de gênero (M vs F). Considerar testes novos para `binding.ts`, `concordancia.ts`, `mapeadores.ts`.

## 6. Decisões já tomadas (e o porquê — não refazer)

1. **Foco em binding de dados** (não flags). *Por quê:* escolha do usuário; é o eixo que destrava
   documentos com pessoas + imóveis usando o que os cadastros já têm.
2. **Só código, sem migrations.** *Por quê:* restrição do usuário; o render pontilhado e as tabelas
   atuais (incl. `pessoa.genero`) já bastam.
3. **`imovel` traz bem+cartório+titular juntos** ao escolher uma matrícula (em vez de ligar
   `bem`/`cartorio` separadamente). *Por quê:* casa com a realidade dos contratos (a "qualificação de
   imóvel" é uma unidade única) e reaproveita o JOIN que `useEntradasMatricula` já faz; menos cliques,
   menos risco de inconsistência. Bindings crus (`bem`, `cartorio`) seguem disponíveis se um modelo precisar.
4. **Derivação dos extensos migra para os mapeadores** (não mais `produzir(bruto)` por campo). *Por quê:*
   o dado vem do banco; `derivarCampos` cobre a edição manual. Mais coeso por entidade.
5. **Concordância via dicionário masc/fem derivado de `pessoa.genero`**, exposta como campos derivados
   (ex.: `{{ proprietario.casado }}`), **sem nova sintaxe no template**. *Por quê:* não exige tocar o
   `render.ts` (uma função de template exigiria estender regex/resolver).
6. **Modelos legados** (placeholders sem ponto) → texto livre na Gerar, sem migração automática.
   *Por quê:* sem migration; reescrevíveis com o autocomplete novo.
7. **`render.ts`/`extenso.ts`/`composition.ts`/`index.ts`/`types.ts`/`MontagemDocumentos.tsx` não mudam.**
   *Por quê:* o caminho pontilhado aninhado já existe; composição é sem flags; montagem não toca vocabulário.
8. **Papéis iniciais** (`PAPEIS`, só dados): `proprietario, socio, conjuge, outorgante, outorgado,
   doador, donatario, pessoa` (pessoa); `imovel, matricula` (matrícula); `bem` (bem); `cartorio` (cartório).
   *Por quê:* cobre os documentos analisados; é só um mapa, trivial de estender.

## 7. Verificação (end-to-end)

1. `npx tsc --build --noEmit` e `npx eslint <arquivos tocados>` — sem erros.
2. `npx vitest run src/lib/templates` — `render.test.ts`/`extenso.test.ts` inalterados passam;
   `vocabulario.test.ts` verde com paridade Mat. 9.617 em `imovel.*` e caso de concordância (M vs F).
3. `npm run dev` → **Biblioteca de Modelos**: criar bloco, digitar `{{` e ver autocomplete **agrupado por
   entidade** (Proprietário/Imóvel/…), com chips namespaced.
4. **Montagem de Documentos**: montar um modelo curto usando `{{ proprietario.nome }}`,
   `{{ proprietario.casado }}`, `{{ imovel.area }}`, `{{ imovel.cartorio }}`.
5. **Gerar Documento**: escolher cliente na barra → escolher modelo → ver **um seletor por binding**
   (Proprietário=pessoa, Imóvel=matrícula) → escolher registros reais → documento montado com dados reais
   e **concordância correta** (testar pessoa `F` e `M`) → editar um campo e ver re-render → Copiar.
6. `npx vite build` — bundle ok.

## 8. Riscos / pontos de atenção

- **Campos homônimos** (`denominacao` em `pessoa` e `bem`): resolvidos pelo prefixo de binding; garantir
  que `resolverTipoDoBinding` nunca caia em ambiguidade silenciosa (papel desconhecido → `desconhecidos`).
- **`render.ts` lança erro em placeholder não resolvido**: ao trocar de binding/registro, garantir que o
  contexto tenha o sub-objeto (mesmo vazio) para não quebrar a prévia; tratar erro como hoje (mensagem na UI).
- **`genero` pode ser `null`**: `concordar` deve ter fallback (masculino) e não quebrar.
- **Paridade da Mat. 9.617**: o teste é o guard-rail de que o namespace `imovel.*` reproduz o texto atual.
