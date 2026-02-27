

# Reorganizar formulario OS para layout identico ao exemplo HTML

## Objetivo

Reestruturar completamente o formulario "Nova OS", o card read-only e o inline edit para ficarem 100% iguais ao HTML de referencia, removendo campos que nao existem no exemplo e ajustando o layout para grid 2 colunas com labels acima dos inputs.

## Arquivo alterado

- `src/components/equipe/dev/NewClientModal.tsx`

## Campos a REMOVER (nao existem no exemplo)

1. **Gestor** (`gestor_responsavel`) - Select com lideres
2. **Projeto** (`nome_projeto`) - Input de texto
3. **Descricao** (`descricao_projeto`) - Textarea com contador 500 chars

Esses campos serao removidos da interface `DraftContract`, do state `draftContract`, da validacao `addContract`, do reset, do card read-only, do inline edit e do formulario "Nova OS".

## Layout final dos campos (identico ao HTML de referencia)

```text
--- DADOS DA OS --- (titulo com borda inferior)

ORDEM DE SERVICO *           DATA DE EMISSAO *
[input text]                 [date input]

DATA INICIO *                DATA FIM
[date input]                 [date input]

VALOR DO PROJETO (R$) *      SITUACAO DO PROJETO *
[R$ currency]                [select]

REEMBOLSO POR KM (R$) *      REEMBOLSO REFEICAO (R$) *
[R$ currency]                [R$ currency]

--- OBSERVACOES --- (titulo de secao)
[textarea full width, placeholder: "Insira observacoes relevantes sobre o projeto..."]

--- SERVICOS CONTRATADOS --- (secao dashed, sem mudancas)
[+ Adicionar Servico]
[select + X] ...

--- DISTRIBUICAO DE RECEITA (CENTROS DE CUSTO) --- (secao dashed, sem mudancas)
[+ Adicionar Centro de Custo]
[select + input % + X] ...
Total Distribuido: XX% - Faltam YY% para completar 100%

[Adicionar OS a Lista]
```

## Mudancas tecnicas detalhadas

### 1. Interface DraftContract (linha 152)

Remover `nome_projeto`, `descricao_projeto`, `gestor_responsavel`:

```typescript
interface DraftContract {
  _id: number;
  ordem_servico: string;
  data_emissao: string;
  data_inicio_projeto: string;
  data_fim_projeto: string;
  valor_projeto: number;
  valor_reembolso_km: number;
  valor_reembolso_refeicao: number;
  situacao_projeto: string;
  observacoes_projeto: string;
  servicos_contratados: string[];
  centros_custo: Array<{ empresa: string; percentual: number }>;
}
```

### 2. State draftContract (linha 528)

Remover valores iniciais de `nome_projeto`, `descricao_projeto`, `gestor_responsavel`.

### 3. Funcao addContract (linha 890)

- Remover validacoes de `nome_projeto` e `gestor_responsavel`
- Remover validacao de `descricao_projeto` (min 20 chars)
- MANTER validacoes de `valor_reembolso_km` e `valor_reembolso_refeicao` como obrigatorios
- Remover reset desses campos no objeto de reset

### 4. Card read-only da OS (linha 2860-3008)

- Na linha do header do card, remover referencia a `cont.nome_projeto` (substituir por apenas "OS {numero}")
- Na grid de FieldPairs, remover: Gestor Responsavel, Nome do Projeto, Descricao
- Reordenar para: OS, Data Emissao, Data Inicio, Data Fim, Valor, Reembolso km, Reembolso refeicao, Situacao, Observacoes, Servicos, Centros de Custo

### 5. Inline edit da OS (linha 3012-3447)

- Remover campos: Gestor (select lideres), Projeto (input), Descricao (textarea + contador)
- Mudar layout de label-left para grid 2 colunas com labels acima
- Ordem dos campos identica ao formulario "Nova OS"

### 6. Formulario "Nova OS" (linha 3456-3837)

Substituir layout inteiro. De rows com label a esquerda para grid 2 colunas com labels acima:

- Adicionar header "DADOS DA OS" com `text-xs font-bold uppercase` e `border-b pb-2 mb-4`
- Grid `grid grid-cols-1 md:grid-cols-2 gap-4`
- Cada campo: `<div><Label class="text-xs font-semibold uppercase text-muted-foreground">LABEL *</Label><Input .../></div>`
- Remover campos Gestor, Projeto, Descricao
- Manter secoes dashed de Servicos Contratados e Centros de Custo como estao (ja corretas)
- Reembolso por KM e Reembolso Refeicao com asterisco (*) e validacao obrigatoria

### 7. Funcao handleSave / load (persistencia)

- Remover referencias a `nome_projeto`, `descricao_projeto`, `gestor_responsavel` nos inserts/updates do banco
- Manter demais campos como estao

### 8. Confirmacao de remocao na AlertDialog

- Atualizar texto de confirmacao de remocao da OS que referencia `cont.nome_projeto` (linha 2908) para usar apenas `cont.ordem_servico`

## Resumo de impacto

- **Banco de dados**: Nenhuma alteracao
- **Interface DraftContract**: 3 campos removidos (`nome_projeto`, `descricao_projeto`, `gestor_responsavel`)
- **Layout**: De label-left vertical para grid 2 colunas com labels acima (identico ao HTML)
- **Validacao**: Reembolso km e Reembolso refeicao permanecem obrigatorios; campos removidos nao sao mais validados
- **Secoes dinamicas**: Servicos Contratados e Centros de Custo permanecem sem alteracoes

