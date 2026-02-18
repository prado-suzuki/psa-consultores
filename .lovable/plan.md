

# Calculadora de IBS e CBS - Replicar Interface do DIFAL Inteligente

## Objetivo
Criar uma nova ferramenta "Calculadora de IBS e CBS" replicando exatamente o design, filtros, logica de busca, agrupamento e interface do DIFAL Inteligente. Nesta etapa, a interface sera identica mas com nomenclatura adaptada. Endpoints, tabelas e logica especifica de IBS/CBS serao adicionados em etapas futuras.

## Arquivos a criar

### 1. `src/types/ibscbs.ts`
Replicar os tipos de `src/types/difal.ts` com nomes adaptados (IbsCbsGroupedItem, IbsCbsApiGroupedResponse, etc.). Manter a mesma estrutura de dados por enquanto, pois os endpoints serao os mesmos temporariamente.

### 2. `src/pages/equipe/dev/CalculadoraIbsCbs.tsx`
Copia completa de `AuditoriaFiscal.tsx` (~1111 linhas) com as seguintes substituicoes:
- Titulo: "Calculadora de IBS e CBS" (ao inves de "DIFAL Inteligente")
- Subtitulo: "Calculo e classificacao dos novos impostos IBS e CBS"
- Importar tipos de `@/types/ibscbs` ao inves de `@/types/difal`
- Query keys prefixadas com `ibscbs-` ao inves de `difal-`
- Tabelas de sessao/decisao: usar as mesmas (`difal_sessao`, `difal_decisao`) temporariamente (serao substituidas em etapa futura)
- Empty state com texto sobre IBS e CBS
- Manter mesmos endpoints de API (serao trocados em etapa futura)
- Nome do arquivo de exportacao: `IBS_CBS_` ao inves de `DIFAL_`

### 3. `src/components/equipe/dev/IbsCbsAuditModal.tsx`
Copia de `DifalAuditModal.tsx` com nomes adaptados (IbsCbsAuditModal, IbsCbsAuditModalProps). Mesma logica e design. Titulo do modal: "Classificar Item - IBS/CBS".

## Arquivos a modificar

### 4. `src/components/equipe/dev/DevLayout.tsx`
Adicionar novo item no menu lateral:
```
{ icon: Calculator, label: 'Calculadora IBS/CBS', path: '/equipe/dev/calculadora-ibs-cbs' }
```

### 5. `src/App.tsx`
Adicionar rota:
```
<Route path="/equipe/dev/calculadora-ibs-cbs" element={<TeamRoute><PageAccessGate pagePath="/equipe/dev/calculadora-ibs-cbs"><CalculadoraIbsCbs /></PageAccessGate></TeamRoute>} />
```

## Sem alteracoes de banco de dados
Nesta etapa nao serao criadas tabelas novas. A interface usara temporariamente as mesmas tabelas e endpoints do DIFAL. Em etapas futuras serao criadas tabelas `ibs_cbs_sessao`, `ibs_cbs_decisao` e novos endpoints.

## Resumo de entregaveis

| Arquivo | Acao |
|---------|------|
| `src/types/ibscbs.ts` | Criar (replica de difal.ts) |
| `src/pages/equipe/dev/CalculadoraIbsCbs.tsx` | Criar (replica de AuditoriaFiscal.tsx) |
| `src/components/equipe/dev/IbsCbsAuditModal.tsx` | Criar (replica de DifalAuditModal.tsx) |
| `src/components/equipe/dev/DevLayout.tsx` | Adicionar item no menu |
| `src/App.tsx` | Adicionar rota |

