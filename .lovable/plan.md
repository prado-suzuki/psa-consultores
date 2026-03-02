

# Plano: Atualizar filtro de situacao do PERDCOMP

## Problema

O filtro de situacao busca apenas valores distintos ja cadastrados no banco (`per_situacao`). Se uma situacao nunca foi usada, ela nao aparece no filtro. O usuario quer ver todas as opcoes possiveis.

## Situacoes existentes no sistema

Existem duas listas de situacoes no codigo:

**SituacaoFormModal.tsx** (formulario de cadastro):
- Pendente de Analise, Em Analise, Deferido, Deferido Parcialmente, Indeferido, Pago, Cancelado, Aguardando Documentacao

**PerDetailModal.tsx** (detalhe do PER):
- Analise concluida, Analise preliminar disponibilizada, Cancelado, Contribuinte intimado, Despacho decisorio emitido, Em analise, Em discussao administrativa - CARF/CSRF/DRJ, Homologado, Nao admitido, Pedido de cancelamento deferido, PER deferido, Retificado

Alem disso, o PER e criado automaticamente com situacao "Analisado".

## Alteracao

Em `ControlePerdcomp.tsx`:

1. Substituir a query `allSituacoes` (que busca apenas valores do banco) por uma lista estatica completa, unificando todas as situacoes dos dois formularios mais "Analisado".

2. Manter merge com valores do banco para cobrir situacoes customizadas que possam existir.

3. A opcao "Todas" ja existe (quando nenhuma checkbox esta marcada, exibe "Todas"). O botao "Limpar selecao" tambem ja funciona como "Todos".

## Lista unificada final

```
Aguardando Documentacao
Analise concluida
Analise preliminar disponibilizada
Analisado
Cancelado
Contribuinte intimado
Deferido
Deferido Parcialmente
Despacho decisorio emitido
Em Analise
Em discussao administrativa - CARF
Em discussao administrativa - CSRF
Em discussao administrativa - DRJ
Homologado
Indeferido
Nao admitido
Pago
Pedido de cancelamento deferido
PER deferido
Pendente de Analise
Retificado
```

## Arquivo impactado

| Arquivo | Alteracao |
|---|---|
| `ControlePerdcomp.tsx` | Substituir query de situacoes distintas por lista estatica unificada + merge com DB |

