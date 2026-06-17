# Gerador de Documentos OSG — síntese de arquitetura

Documento de design para o gerador de documentos jurídicos da área OSG (contratos
societários e instrumentos agrários). Consolida o que a análise de **contratos reais**
revelou e define o sequenciamento de implementação.

O catálogo concreto de vagas/famílias/flags que sai desta síntese está em
[`catalogo-familias-e-flags.md`](./catalogo-familias-e-flags.md).

Base de conhecimento de domínio (não versionada neste repo): vault Obsidian em
`~/Documentos/vaults/osg_vault/Arquitetura/` — em especial
`05_Sintese_dos_Modelos_Reais_e_Sequenciamento.md` (espelho desta nota) e
`03_Arquitetura_de_Templates_e_Documentos.md` (três camadas, flags, overrides).

## Estado atual do código

- Motor de templates em `src/lib/templates/`:
  - `render.ts` — `renderConteudo` resolve `{{ caminho }}` com **caminho pontilhado** (`[\w.]+`) e lança erro se faltar; `extrairCampos` lista placeholders.
  - `composition.ts` — `comporBlocos` monta blocos por flags ativas.
  - `vocabulario.ts` — catálogo **plano e global** de campos (sem namespace por entidade), com `produzir()` por campo e derivados por extenso; `listarPlaceholders()` alimenta o autocomplete.
  - `index.ts` — `gerarDocumento(template, contexto, flags)`.
- Editor de blocos: `src/pages/equipe/osg/BibliotecaModelos.tsx` + `src/components/equipe/osg/EditorConteudoModelo.tsx` (autocomplete `{{`, chips de variável).
- Geração: `src/pages/equipe/osg/GerarDocumento.tsx` + `src/hooks/useGeracaoDocumento.ts` (`useEntradasMatricula` faz JOIN matrícula→bem→cartório→titularidade e devolve um `Record` achatado).
- Tabelas template builder: `tmpl_documento`, `tmpl_bloco`, `tmpl_bloco_versao`, `tmpl_bloco_flag`, `tmpl_documento_bloco`, `tmpl_flag`, `projeto_flag_valor`, `documento_gerado` (com `documento_anterior_id`/`documento_raiz_id` + snapshots), `documento_override`.

## Corpus analisado

- Constituição operacional/agro: modelo Agro; preenchidos MMS Agro, Bragança.
- Constituição holding: modelo Controladora; Barralcool (41 sócios, 1 sócio PJ, 3 espólios).
- Alteração contratual: 1ª MMS Participações; 2ª MMS Agro.
- Instrumentos agrários: Parceria (benfeitorias não indenizáveis) e Composse (pro indiviso) — Chiapinotto.

## 3 descobertas que remodelam o desenho

### 1. O reutilizável transversal são os "primitivos de qualificação"

Atravessam todas as famílias: qualificação de **PF** (variante casado/solteiro/viúvo × regime de
bens), de **PJ** (CNPJ/NIRE/sede/representantes), de **espólio** (falecido + inventariante) e de
**imóvel + memorial** (georreferenciado vs rumos; integral vs desmembrado). As cláusulas são
composições por cima desses átomos.

→ Falta o conceito de **bloco embutível (partial) com binding**: `{{> qualificacaoPF(socio) }}`,
`{{> qualificacaoImovel(item) }}`. É o núcleo da biblioteca.

### 2. Alteração não é um documento — é um diff versionado sobre o estado da sociedade

A 2ª Alteração da MMS Agro, num só instrumento: muda endereço, aumenta capital, integraliza
imóveis, cede a totalidade das quotas (vira unipessoal) e troca administração — e **reconsolida o
contrato inteiro re-numerado**. Referencia o anterior por **delta** ("capital atual de X passará a
Y"), nomeia as cláusulas alteradas e ratifica as demais.

Requisitos: (1) **estado vigente da sociedade**; (2) **ledger de eventos** datados que produz o
delta; (3) **dupla emissão** — resoluções (diff) + consolidado (re-render). A cadeia
`documento_anterior_id`/`documento_raiz_id` + snapshots é a semente; falta o **domínio da
sociedade ao longo do tempo**.

### 3. Papéis são N:N com pessoas e variam por família

Mesma pessoa em vários papéis (sócio + administrador + cônjuge-outorgante; na parceria, sócios da
PJ outorgante = outorgados). O binding precisa de pessoa→muitos papéis, e papéis por tipo de doc.

## Arquitetura em camadas

```
6. Render        {{ socio.nome }} + concordância, sobre contexto aninhado (dotted path já existe)
5. Composição    papéis + iteração aninhada (sócio→bens→matrícula); alteração: diff + consolidação
4. Cláusulas     blocos + flags de variante (agro/holding, isolada/conjunta, uni/plural, bens/moeda)
3. Primitivos    qualificações PF/PJ/espólio/imóvel — partials autoráveis, com condicional interna
2. Vocabulário   campos por entidade + derivações: extenso, concordância gênero/número, agregados
1. Domínio       cadastros atuais + NOVO: sociedade, quadro societário/quotas-ledger, eventos, admin
```

Novidades empíricas: camada 3 elevada a primeira-classe; concordância de gênero/número na camada
2; iteração aninhada + diff na camada 5. O caminho pontilhado de `render.ts` já entrega
`{{ socio.conjuge.nome }}` e `{{ item.matricula.cartorio.comarca }}` quando o contexto for aninhado.

## Lacunas no modelo de dados (camada 1)

- **Gênero/sexo em `pessoa`** — inexistente hoje; metade das frases flexiona (sócio/sócia,
  casado/casada, portador/portadora; singular/plural por cardinalidade). Pequeno, mas crítico.
- **Domínio da sociedade**: PJ rica (razão/CNPJ/NIRE/sede/objeto-CNAE/regência/exercício/foro) +
  **quadro societário como ledger** (pessoa↔sociedade: quotas, valor, %, eventos datados:
  subscrição/integralização/cessão/retirada) + **administração** (isolada/conjunta/diretoria,
  mandato, quórum, alçada, poderes — o "tipo de administração").
- **Forma de integralização** por aporte: dinheiro / bens / quotas de outra PJ, com origem rastreável.
- **Enriquecimentos de imóvel**: CCIR/INCRA/CAFIR/CNIR, memorial (georref vs rumos), área-mãe
  (desmembramento → imóvel origem), área objeto ≠ área total.
- **Instrumentos de origem da posse** (parceria/arrendamento) para composse — entidade própria.
- **Acordo de quotistas** (flag + referência/data).

## Derivações exigidas no vocabulário (camada 2)

- **Por extenso**: valor, quota, área, fração/percentual, data, prazo. *(parcialmente em `extenso.ts`)*
- **Concordância de gênero/número**: derivada de `pessoa` e da cardinalidade da coleção. *(novo)*
- **Agregados**: capital total = soma; % = quotas/total; quotas = valor/valor nominal; soma de
  áreas; soma de frações = 100%. *(novo)*

## Validação como feature

Os documentos-fonte têm erros reais (grafias divergentes do mesmo nome, CCIR repetido,
"31,330,22%", "0131 de JulhoAgosto", cláusulas duplicadas). Binding a partir de cadastro único
elimina essa classe inteira de erro — justificativa direta para a abordagem banco-vs-template.

## Sequenciamento sugerido

1. **Namespacing + vocabulário por entidade + derivações** (extenso já existe; somar concordância e
   agregados) + autocomplete agrupado por entidade. → melhora o editor atual; cobre constituição
   com binding manual. *Mexe em: `vocabulario.ts`, `EditorConteudoModelo.tsx`.*
2. **Primitivos/qualificações como partials autoráveis + papéis** para constituição. → cobre
   contrato social agro e holding. *Exige expandir `render.ts`/`composition.ts` para partials.*
3. **Coleções/repetição aninhada** (tabela de capital, imóveis por sócio). → fecha a constituição.
   *Iteração na composição (bloco "itera sobre X") ou loop no render.*
4. **Domínio da sociedade + ledger de eventos** → habilita **alterações** (diff + consolidação).
   Maior esforço, maior valor. Parceria e composse reaproveitam os primitivos das fases 1–3.

## Decisões em aberto

- Origem do gênero/sexo em `pessoa` (campo novo? derivar?).
- Papéis fixos por tipo de documento (em código) ou definíveis na UI por modelo?
- Partials de qualificação: blocos normais autoráveis/versionados ou primitivos fixos em código?
