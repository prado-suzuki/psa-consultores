

# Plano de Ação — Fase 6: Decomposição Visual do NewClientModal

## Diagnóstico

O arquivo tem **3.807 linhas**. O JSX das 5 abas ocupa ~2.500 linhas (linhas 1185–3695). Distribuição:

| Aba | Linhas JSX | Tamanho |
|---|---|---|
| cliente | 1185–1332 | ~150 |
| contribuintes | 1334–2328 | ~1.000 |
| participantes | 2330–2718 | ~390 |
| contratos | 2720–3600 | ~880 |
| faturamento | 3602–3695 | ~90 |

## Estrutura de Arquivos

```
src/components/equipe/fiscal/
├── NewClientModal.tsx          (orquestrador: ~600 linhas)
├── client-form/
│   ├── ClienteTab.tsx          (~150 linhas)
│   ├── ContribuintesTab.tsx    (~1.000 linhas)
│   ├── ParticipantesTab.tsx    (~390 linhas)
│   ├── ContratosTab.tsx        (~880 linhas)
│   ├── FaturamentoTab.tsx      (~90 linhas)
│   ├── DateFieldWithInput.tsx  (~70 linhas)
│   ├── CurrencyField.tsx       (~30 linhas)
│   └── constants.ts            (UF_STATES, TIPO_PARTICIPANTE, SITUACAO_PROJETO, masks)
```

## Estratégia de Comunicação (Props)

O orquestrador (`NewClientModal`) continuará sendo o **dono de todos os estados de draft**. Cada componente de aba receberá via props exatamente o que precisa — sem Context, sem stores adicionais.

### Padrão de Props por Aba

**`ClienteTab`**
```typescript
interface ClienteTabProps {
  clientData: typeof defaultClientData;
  setClientData: React.Dispatch<...>;
  lideres: any[];
  isReadOnly: boolean;
}
```

**`ContribuintesTab`** (a maior)
```typescript
interface ContribuintesTabProps {
  // Listas
  entities: DraftEntity[];
  setEntities: React.Dispatch<...>;
  inscricoesMap: Record<string, InscricaoIE[]>;
  setInscricoesMap: React.Dispatch<...>;
  // Drafts
  draftEntity: Partial<DraftEntity>;
  setDraftEntity: React.Dispatch<...>;
  draftInscricoes: InscricaoIE[];
  setDraftInscricoes: React.Dispatch<...>;
  // Inline edit
  editingEntityId: number | null;
  editingEntityData: Partial<DraftEntity> | null;
  expandedEntityId: number | null;
  setExpandedEntityId: React.Dispatch<...>;
  // Handlers (delegados do orquestrador)
  onAddEntity: () => void;
  onStartEdit: (ent: DraftEntity) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onCnpjBlur: (v: string) => void;
  onCepBlur: (v: string) => void;
  onInlineCnpjBlur: (v: string) => void;
  onInlineCepBlur: (v: string) => void;
  onCopyFirstAddress: () => void;
  // Loading
  cnpjLoading: boolean;
  cepLoading: boolean;
  isReadOnly: boolean;
}
```

**`ParticipantesTab`** e **`ContratosTab`** seguirão o mesmo padrão: recebem dados, setters e handlers via props.

**`FaturamentoTab`** receberá apenas `entities: DraftEntity[]` (read-only, sem setters).

### Componentes Utilitários

`DateFieldWithInput` e `CurrencyField` já são componentes auto-contidos (definidos fora do componente principal). Serão movidos para seus próprios arquivos sem alteração de interface.

### Constantes

`UF_STATES`, `TIPO_PARTICIPANTE_OPTIONS`, `SITUACAO_PROJETO_OPTIONS` e as funções de máscara (`formatCpfCnpj`, `formatCep`, `formatPhone`, `formatBRLInput`, `formatDateMask`, etc.) serão movidas para `constants.ts`, importadas onde necessário.

## Plano de Execução

| Passo | Ação |
|---|---|
| 1 | Criar `client-form/constants.ts` com constantes e funções de máscara |
| 2 | Criar `client-form/DateFieldWithInput.tsx` e `client-form/CurrencyField.tsx` |
| 3 | Criar `client-form/FaturamentoTab.tsx` (a menor, menor risco) |
| 4 | Criar `client-form/ClienteTab.tsx` |
| 5 | Criar `client-form/ParticipantesTab.tsx` |
| 6 | Criar `client-form/ContribuintesTab.tsx` |
| 7 | Criar `client-form/ContratosTab.tsx` |
| 8 | Refatorar `NewClientModal.tsx` — remover JSX das abas, constantes, componentes utilitários; importar os novos componentes; manter toda a lógica de estado e handlers |

## Escopo Protegido

- Nenhum hook será alterado (`useClientFormOptions`, `useClientEditData`, `useExternalConsults`, `useSaveClientTransaction`)
- Nenhuma lógica de negócio será movida — apenas JSX e apresentação visual
- Os handlers permanecem no orquestrador e são passados via props
- A experiência do usuário permanece idêntica

## Resultado Esperado

O `NewClientModal.tsx` cairá de ~3.800 para ~600 linhas, contendo apenas: estados, hooks, handlers, lógica de navegação entre abas, AlertDialogs e o shell do Dialog com `<Tabs>` renderizando os 5 componentes filhos.

