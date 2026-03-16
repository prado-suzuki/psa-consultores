

# Plano: Adicionar Links de Manual ao Dashboard Dev

## Objetivo
Adicionar links de manual (SOP) para as ferramentas **Controle PER/DCOMP** e **EFD ICMS/IPI** no dashboard da área Digital Dev.

## Mudanças

**Arquivo**: `src/pages/equipe/dev/DevDashboard.tsx`

Adicionar a propriedade `sopUrl` nas entradas do array `tools`:

| Ferramenta | Linha | URL a adicionar |
|------------|-------|-----------------|
| EFD ICMS/IPI | 81 | `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/` |
| Controle PER/DCOMP | 108 | `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp/` |

A UI já renderiza o link "Ler Manual (SOP)" automaticamente quando `sopUrl` está presente (linhas 231-241).

