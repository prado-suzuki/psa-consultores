

## Plano: Renomear itens do menu lateral no DevLayout

### Arquivo: `src/components/equipe/dev/DevLayout.tsx`

**3 mudanças pontuais:**

1. **Linha 57-60** — Reordenar e renomear `pisCofinsSubItems`: Mapa NCM vai para o topo, Apuração para baixo
   ```ts
   const pisCofinsSubItems: NavItem[] = [
     { icon: FileSpreadsheet, label: 'Mapa NCM (PIS/COFINS)', path: '/equipe/dev/mapa-ncm-pis-cofins' },
     { icon: FileText, label: 'Apuração do cliente', path: '/equipe/dev/apuracao-pis-cofins' },
   ];
   ```

2. **Linhas 203, 213, 229** — Trocar "Análise PIS/COFINS" por "Levantamento de Créditos" (título do collapsible e tooltip)

1 arquivo, ~5 linhas alteradas.

