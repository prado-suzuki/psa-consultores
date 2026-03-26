

## Plano: Remover ícones dos itens de navegação do Digital Dev

Arquivo único: `src/components/equipe/dev/DevLayout.tsx`

### Alterações

1. **L151**: Remover `<item.icon className={...} />` dos navItems (Dashboard, Nova ferramenta, Consulta de XMLs)
2. **L168**: Remover `<BookOpen>` do botão collapsed de Consulta SPED
3. **L181**: Remover `<BookOpen>` do trigger expanded de Consulta SPED
4. **L200**: Remover `<item.icon>` dos sub-itens SPED (EFD Contribuições, EFD ICMS, ECD, ECF)
5. **L220**: Remover `<HandCoins>` do botão collapsed de Levantamento de Créditos
6. **L233**: Remover `<HandCoins>` do trigger expanded de Levantamento de Créditos
7. **L252**: Remover `<item.icon>` dos sub-itens PIS/COFINS (Mapa NCM, Apuração, Auditoria Cruzada, Revisão de Registros)
8. **L272**: Remover `<item.icon>` dos navItemsAfterSped (DIFAL, Calculadora IBS/CBS, Controle PERDCOMP, Controle Balancetes, Procedimentos, Gerenciar dados)

### O que NÃO muda
- Ícones do header (Code2), footer (User, ArrowLeft, LogOut), toggle (ChevronLeft/Right), e chevrons de collapsible (ChevronDown) permanecem
- Cores, fontes, espaçamentos, ordem e estrutura intactos
- Quando collapsed, os botões ficam sem ícone — exibirão apenas o `title` tooltip no hover

### Nota técnica
Ao remover os ícones, o `mr-3` que estava no ícone some junto, mantendo o texto alinhado ao início do botão sem espaço fantasma.

