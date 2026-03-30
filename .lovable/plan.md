

## Plano: Mover botão Menu para dentro do painel lateral

### Problema atual
O botão ☰ (Menu) está fixo no header do `<main>`, fora do painel. O comportamento desejado é estilo Notion: o botão fica **dentro do painel** quando aberto, e **no canto superior esquerdo** (colado à borda) quando fechado.

### Solução

**Arquivo: `src/components/equipe/dev/DevLayout.tsx`**

1. **Remover o botão Menu do header do `<main>`** (linhas 251-258)

2. **Adicionar o botão Menu dentro do `<aside>`**, fora do bloco condicional `{!collapsed && ...}`, para que ele sempre apareça:
   - Quando **expandido**: renderizado no topo da sidebar (dentro do header, ao lado de "Digital Dev"), alinhado à direita
   - Quando **collapsed**: sidebar passa de `w-0` para `w-12` (48px) para acomodar apenas o botão, centralizado no topo

3. **Ajustar largura collapsed**: `w-0` → `w-12` para dar espaço ao botão sem mostrar texto

4. **Estrutura resultante do `<aside>`**:
```text
<aside w-12 | w-64>
  <!-- Sempre visível -->
  <div topo>
    {collapsed ? <Menu centrado /> : <header "Digital Dev" + <Menu à direita>>}
  </div>
  
  <!-- Só quando expandido -->
  {!collapsed && <nav + footer>}
</aside>
```

### Resultado visual

```text
Fechado:             Aberto:
┌────┬───────────┐   ┌──────────────┬──────┐
│ ☰  │ Title     │   │ Digital Dev ☰│Title │
│    │ Content   │   │ Início       │Cont  │
│    │           │   │ XMLs         │      │
└────┴───────────┘   └──────────────┴──────┘
48px                  256px
```

| Arquivo | Alteração |
|---------|-----------|
| `DevLayout.tsx` | Mover botão Menu para `<aside>`, collapsed `w-12`, remover do header |

