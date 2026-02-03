
# Plano: Modal de Detalhes do PER com Gestao de DCOMPs

## Visao Geral

Criar um modal de detalhes ao clicar em uma linha de PER na tabela, seguindo o layout visual do modal EFDAnalysisModal. O modal tera duas colunas: lado esquerdo para gerenciar a situacao do PER, e lado direito para visualizar/adicionar DCOMPs vinculados.

---

## Estrutura do Modal

```text
+-----------------------------------------------------------------------------------+
|  HEADER: Numero PER | Contribuinte | Exercicio/Trimestre | Valor Total | [X]     |
+-----------------------------------------------------------------------------------+
|  SIDEBAR (Esquerda)         |        AREA PRINCIPAL (Direita)                     |
|                             |                                                     |
|  Situacao Atual: Badge      |  +-----------------------------------------------+  |
|                             |  |  Tabela de DCOMPs vinculados                  |  |
|  Atualizar Situacao:        |  |  - Nr Documento                               |  |
|  [Select: Deferido,         |  |  - Mes/Ano                                    |  |
|   Analisado, Em analise]    |  |  - Imposto                                    |  |
|                             |  |  - Valor Compensado                           |  |
|  [Botao Salvar Situacao]    |  |  - Acoes (Editar/Excluir)                     |  |
|                             |  +-----------------------------------------------+  |
|  Historico de Situacoes:    |                                                     |
|  - Data | Situacao          |  Saldo Restante: R$ X.XXX,XX                        |
|  - Data | Situacao          |                                                     |
|                             |  [+ Adicionar DCOMP]                                |
+-----------------------------------------------------------------------------------+
```

---

## Arquivos a Criar/Modificar

### 1. Novo Componente: `PerDetailModal.tsx`
**Caminho:** `src/components/equipe/dev/perdcomp/PerDetailModal.tsx`

O modal principal com layout inspirado no EFDAnalysisModal:
- Header com informacoes do PER selecionado
- Duas colunas: sidebar + area principal
- Estilo visual consistente com o resto do sistema

### 2. Modificar: `ControlePerdcomp.tsx`
**Caminho:** `src/pages/equipe/dev/ControlePerdcomp.tsx`

Alteracoes:
- Adicionar estado para controlar abertura do modal de detalhes
- Adicionar estado para armazenar o PER selecionado
- Tornar a linha da tabela clicavel (onClick na TableRow)
- Importar e renderizar o novo PerDetailModal

---

## Detalhes de Implementacao

### PerDetailModal - Estrutura

```text
Props:
- open: boolean
- onOpenChange: (open: boolean) => void
- per: objeto PER selecionado (ou null)
- contribuinteId: string

Estados internos:
- novaSituacao: string (valor selecionado para atualizar)
- dcompModalOpen: boolean (controla modal de novo DCOMP)
- editDcompData: objeto para edicao de DCOMP

Queries:
- DCOMPs vinculados ao PER (filtra por nr_per_orig)
- Historico de situacoes (tabela per_situacao)

Mutations:
- Atualizar situacao (insert em per_situacao)
- Excluir DCOMP
```

### Layout do Modal

**Header (altura fixa):**
- Icone + Numero do processo
- Badge com tipo de credito (PIS/COFINS)
- Valor total do credito
- Exercicio/Trimestre
- Botao fechar (X)

**Sidebar Esquerda (largura ~280px):**
- Card com situacao atual (Badge colorido)
- Select para nova situacao
- Botao "Atualizar Situacao"
- Divisor
- Lista de historico de situacoes (scroll se necessario)

**Area Principal Direita:**
- Tabela de DCOMPs com colunas:
  - Nr Documento
  - Mes/Ano Exercicio
  - Data Envio
  - Imposto
  - Valor Compensado
  - Acoes (editar/excluir)
- Linha de resumo: Saldo Restante (Valor PER - Soma DCOMPs)
- Botao "+ Novo DCOMP" que abre o DcompFormModal existente

### Calculo do Saldo Restante

```text
saldoRestante = per.vlr_credito - somatorio(dcomps.vlr_compensado)
```

### Atualizacao de Situacao

Ao clicar em "Atualizar Situacao":
1. Inserir novo registro em `per_situacao` com:
   - nr_proc_per: numero do processo do PER
   - situacao: valor selecionado
2. Invalidar queries relacionadas
3. Exibir toast de sucesso

### Opcoes de Situacao

- Deferido
- Analisado
- Em analise

---

## Modificacoes em ControlePerdcomp.tsx

### Novos Estados

```text
detailModalOpen: boolean
selectedPer: objeto PER | null
```

### TableRow Clicavel

Adicionar className cursor-pointer e onClick que:
1. Seta selectedPer com o item
2. Abre detailModalOpen

### Renderizacao do Modal

Adicionar PerDetailModal no final do componente, passando:
- open={detailModalOpen}
- onOpenChange={setDetailModalOpen}
- per={selectedPer}
- contribuinteId={contribuinteId}

---

## Estilos e UX

- Modal em fullscreen similar ao EFDAnalysisModal
- Fundo escurecido (overlay)
- Header com gradiente sutil
- Badges coloridos para situacao:
  - Deferido: verde
  - Analisado: azul
  - Em analise: amarelo
- Tabela de DCOMPs com hover states
- Botao de adicionar DCOMP proeminente
- Saldo restante destacado (verde se positivo, vermelho se negativo/zero)

---

## Fluxo do Usuario

1. Usuario clica em uma linha de PER na tabela principal
2. Modal de detalhes abre com informacoes do PER
3. No lado esquerdo, usuario pode:
   - Ver situacao atual
   - Selecionar nova situacao e salvar
   - Ver historico de alteracoes
4. No lado direito, usuario pode:
   - Ver todos os DCOMPs vinculados
   - Ver saldo restante do PER
   - Adicionar novo DCOMP (abre modal existente pre-configurado)
   - Editar DCOMP existente
   - Excluir DCOMP
5. Usuario fecha o modal clicando no X ou fora do modal

---

## Resumo de Arquivos

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Criar | Modal principal de detalhes do PER |
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Modificar | Adicionar click handler e renderizar modal |
