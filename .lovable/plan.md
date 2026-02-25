

## Adicionar campos "Equipe responsavel" e "Regiao" no modal de cadastro (somente UI)

Objetivo: adicionar os 3 campos do CSV no formulario, sem alterar banco de dados. Os novos campos ficam apenas no estado local do componente por enquanto, para validacao da estrutura visual.

### Arquivo alterado: `src/components/equipe/dev/NewClientModal.tsx`

#### 1. Estado `clientData` (linha ~101)
Adicionar dois campos ao estado local:
- `equipe_responsavel: ''`
- `regiao: ''`

Atualizar tambem o `resetAndClose` (linha ~444) para limpar esses campos.
Atualizar o `loadData` para carregar esses campos se existirem no registro (com fallback para string vazia).

**Nota:** como as colunas ainda nao existem no banco, o save (`clientPayload`) NAO incluira esses campos. Eles serao apenas visuais.

#### 2. Renomear label "Tipo" para "Area do negocio" (linha 529)
Trocar o texto do Label de `Tipo` para `Area do negocio`.

#### 3. Corrigir descricoes do campo "Area do negocio" (linhas 534-540)
Alinhar com o CSV:
- `REV - Revendas de insumos, maquinas e cerealistas` (estava incompleto)
- `INS - Instituicoes do agro` (ok)
- `COO - Cooperativas agropecuarias` (ok)
- `AGR - Producao agropecuaria` (ok)
- `IND - Agroindustria` (ok)
- `INF - Infraestrutura e concessoes` (ok)
- `DIV - Outros diversos` (ok)

#### 4. Adicionar Select "Equipe responsavel" (novo campo no grid)
Select com 14 opcoes:
- Administracao Executiva
- Administracao Judicial - PSA Adm Judicial
- Administrativo
- Auditoria - PSA Auditores
- Auditoria - PSA Norte
- CCR - Prado Advogados
- Comercial
- Compliance - Prado Advogados
- Comunicacao
- **Consultoria Fiscal - PSA Consultores** (corrigido de "Prado Consultores")
- Consultoria Tributaria - Prado Advogados
- Legal - Prado Advogados
- OSG - Protenun
- Outsourcing - Profitto

#### 5. Adicionar Select "Regiao" (novo campo no grid)
Select com 7 opcoes, usando codigo como valor e descricao completa como label:
- BRA - Bahia, Goias, Distrito Federal
- 3NO - BR-163 Norte
- 3SU - BR-163 Sul, Vale do Araguaia, Serra da Petrovina, Norte do MS
- PAR - Chapadao do Parecis, regiao sucroalcooleira, Rondonia
- CBA - Baixada Cuiabana
- RAO - Sul do MS, Parana, SC, Cerrado Mineiro, Sao Paulo
- MPT - Mapito, BR-010, Para

#### 6. Layout do grid
Os dois novos Selects serao inseridos na segunda linha do grid (abaixo de Nome/Categoria/Area/Status), ocupando o espaco atual de Telefone e Municipio/UF, reorganizando para:
- Linha 1: Nome (4col) | Categoria (2col) | Area do negocio (3col) | Status (3col)
- Linha 2: Tipo Relacionamento (3col) | Equipe responsavel (4col) | Regiao (5col)
- Linha 3: Telefone (3col) | Municipio (4col) | UF (2col)

### O que NAO muda
- Nenhuma migration de banco de dados
- Nenhuma alteracao em RLS
- O `clientPayload` no save NAO inclui os novos campos (serao adicionados apos validacao)
- `FiscalClients.tsx` -- sem alteracao por enquanto
- `syncCadastrosToDW` -- sem alteracao por enquanto

