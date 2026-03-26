

## Plano: Adicionar SOPs e remover ícones no Hub de Ferramentas

### Alterações em `src/pages/equipe/dev/DevDashboard.tsx`

**1. Adicionar `sopUrl` às ferramentas:**
- EFD ICMS/IPI: `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/`
- ECD: `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECD/`
- ECF: `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/ECF/`
- Controle PER/DCOMP: `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/controle-perdcomp`

**2. Remover ícones de todas as ferramentas:**
- Remover props `icon` e `iconBg` do tipo `ToolEntry` e de cada item do array `tools`
- Remover o `<div>` com ícone no card (`tool.iconBg` / `tool.icon`)
- Remover imports de ícones Lucide não utilizados (FileText, ShieldAlert, BookOpen, Calculator, Database, BarChart3, FileCheck, Receipt)

