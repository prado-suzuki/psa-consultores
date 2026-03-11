

## Análise: Centro de Custo não persiste na OS

### Causa raiz

Todas as chamadas `setDraftContract` dos campos simples (ordem_servico, data_emissao, valor_projeto, id_servico, situacao_projeto, etc.) usam a forma **não-funcional**:

```js
setDraftContract({ ...draftContract, ordem_servico: e.target.value })
```

Enquanto os handlers de `distribuicao_receita` já foram corrigidos para a forma funcional (`prev => ...`).

O problema: quando o usuário seleciona um centro de custo (atualizado corretamente via `prev =>`), e depois altera **qualquer outro campo** do formulário de OS (ex: observações, valor, datas), o `setDraftContract({ ...draftContract, ... })` usa o closure stale que ainda contém a `distribuicao_receita` **antiga** (com `id_centro_custo: ""`), sobrescrevendo a seleção feita.

O warning "Select is changing from uncontrolled to controlled" confirma que o `value` do Select alterna entre estados porque o dado é sobrescrito.

### Correção

**Arquivo:** `src/components/equipe/dev/NewClientModal.tsx`

Converter **todas** as chamadas `setDraftContract({ ...draftContract, campo: valor })` para a forma funcional `setDraftContract(prev => ({ ...prev, campo: valor }))`. São aproximadamente 15 ocorrências nos campos:

- `ordem_servico` (linha ~3722)
- `data_emissao` (linha ~3736)
- `data_inicio_projeto` (linha ~3748)
- `data_fim_projeto` (linha ~3760)
- `valor_projeto` (linha ~3772)
- `situacao_projeto` (linha ~3784)
- `valor_reembolso_km` (linha ~3807)
- `valor_reembolso_refeicao` (linha ~3820)
- `observacoes_projeto` (linha ~3833)
- `id_servico` (linha ~3863)
- `id_produto_segmento` (linha ~3914)
- Reset no `handleClearSection` (linha ~454)

Isso garante que nenhuma alteração em um campo sobrescreva mudanças feitas em outro campo (incluindo a `distribuicao_receita`).

