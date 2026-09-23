# Plano: Botões de edição cruzada no Digital MAPA

## Contexto
O objetivo é que, sempre que uma informação de **outra página** apareça na página atual, exista um botão de editar que abra o **exato mesmo modal de edição** daquela entidade. A regra vale para **páginas**, não abas. As páginas isentas são: **Evolução do Setor**, **Dashboard ROI** e **Cascata**.

## Escopo de alterações

### 1. `ProjetosPage` → `ProjetoDetalheModal`
- **Aba Processos**: cada processo listado ganha botão de editar que abre `ProcessoFormModal`.
- **Aba Backlog**: cada melhoria listada ganha botão de editar que abre `MelhoriaFormModal`.
- **Ações**:
  - Importar `ProcessoFormModal` e `MelhoriaFormModal` na página.
  - Adicionar estados `procEmEdicao` e `melEmEdicao`.
  - Passar callbacks `onEditarProcesso` e `onEditarMelhoria` para `ProjetoDetalheModal`.

### 2. `ProcessosPage` → `ProcessoDetalheModal`
- **Cabeçalho (projeto)**: ao lado do nome do projeto, botão para editar o projeto (`ProjetoFormModal`).
- **Seção Documentos**: cada documento (chip) vira clicável para editar (`DocumentoFormModal`). IDs resolvidos via `documentoId` presente em `DocRef` das etapas.
- **Seção Sistemas**: cada sistema (chip) vira clicável para editar (`SistemaFormModal`). Nome resolvido para ID via mapa `sistemaIdByNome` construído na página.
- **Seção Responsáveis**: cada responsável (chip) vira clicável para editar (`ResponsavelFormModal`). ID resolvido via `responsavelId` em `ResponsavelEtapa`.
- **Seção Gargalos**: cada gargalo (chip) vira clicável para editar (`GargaloFormModal`). ID já disponível.
- **Seção Melhorias**: cada melhoria (chip) vira clicável para editar (`MelhoriaFormModal`). ID já disponível.
- **Ações**:
  - Importar `ProjetoFormModal`, `DocumentoFormModal`, `SistemaFormModal`, `ResponsavelFormModal`, `GargaloFormModal`, `MelhoriaFormModal` na página.
  - Adicionar estados para cada entidade em edição.
  - Passar mapas `sistemaIdByNome` e `responsavelIdByNome` e callbacks para `ProcessoDetalheModal`.
  - No modal, adicionar pequeno ícone de lápis (`Pencil` dentro de `IconTooltip`) em cada item cruzado, seguindo o padrão `cadastro-item-acao`.

### 3. `MapearProcessoPage` — abas "Como era" / "Como ficou"
- Cada **etapa** exibe chips de Documentos, Sistemas, Responsáveis e Gargalos.
- Adicionar botão de editar em cada chip que abra o modal correspondente:
  - Documento → `DocumentoFormModal` (usa `docIdByNome`).
  - Sistema → `SistemaFormModal` (usa `sisIdByNome`).
  - Responsável → `ResponsavelFormModal` (usa `respIdByNome`).
  - Gargalo → `GargaloFormModal` (usa `gargaloIdByNome`).
- **Ações**:
  - Importar os 4 modais na página.
  - Adicionar estados `docEmEdicao`, `sisEmEdicao`, `respEmEdicao`, `gargEmEdicao`.
  - Passar callbacks `onEditarDocumento`, `onEditarSistema`, `onEditarResponsavel`, `onEditarGargalo` para `ComoEraView` e `ComoFicouView`.
  - Reutilizar os mapas de ID já existentes (`docIdByNome`, `sisIdByNome`, `respIdByNome`, `gargaloIdByNome`).

### 4. `MapearProcessoPage` — aba "Configurar ROI" (WizardRoi)
- O Wizard já possui `handleEditarItem` que navega para outras páginas ou abre o modal de etapas.
- O usuário exigiu que, como o Wizard está na **mesma página** das etapas (mas aba diferente), o redirecionamento deve ser **com foco para a aba**.
- **Ação**:
  - No callback `onEditarEtapas` do `WizardRoi` (definido em `MapearProcessoPage`), antes de chamar `openEditEtapas`, mudar a aba ativa para `'como-era'` (se modo `era`) ou `'como-ficou'` (se modo `ficou`).
  - Isso garante que o usuário seja "redirecionado" visualmente para a aba correta antes do modal abrir.

### 5. `MelhoriasPage` → `MelhoriaFormModal`
- Dentro do modal de melhoria, a seção **"Gargalos resolvidos"** aparece como leitura.
- Adicionar botão de editar em cada gargalo que abra `GargaloFormModal`.
- **Ação**:
  - Importar `GargaloFormModal` na página.
  - Adicionar estado `gargEmEdicao`.
  - Passar callback `onEditarGargalo` para `MelhoriaFormModal` (nova prop).

### 6. Padrão visual
- Em todos os pontos, usar o componente `IconTooltip` + ícone `Pencil` (tamanho 14) com classe `cadastro-item-acao` já existente, mantendo consistência com `CadastroItem` e `ProcessoItem`.
- Nos chips, o botão aparece no hover (CSS) para não poluir a visualização em repouso.

## Não será alterado
- `DashboardRoiPage`
- `CascataPage`
- `SetorEvolucaoPage`
- Modais autogerados e arquivos de configuração (`components.json`, `supabase/config.toml`, etc.)
- Nenhuma chamada direta ao Supabase em componentes (todos os modais usam hooks existentes).

## Ordem de implementação sugerida
1. Ajustar `MapearProcessoPage` (Wizard + views ComoEra/ComoFicou) — página mais complexa, padrão de mapas já pronto.
2. Ajustar `ProcessosPage` + `ProcessoDetalheModal` — maior número de modais cruzados.
3. Ajustar `ProjetosPage` + `ProjetoDetalheModal`.
4. Ajustar `MelhoriasPage` + `MelhoriaFormModal`.
5. Testar navegação de ponta a ponta (clique em chip → modal abre → salva → fecha → pai reflete).
