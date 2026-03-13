

# Plano de Ajustes Visuais: Modal de Clientes e Botão de Novo Projeto

## 1. GestaoClientes.tsx - Ajustes no Cabeçalho

**Objetivo**: Remover texto auxiliar e reposicionar botão de "Novo cliente" para o canto direito.

**Mudanças**:
- **Remover**: Bloco de texto "Gerencie sua base de dados de clientes" (linhas 238-241)
- **Reposicionar**: Botão "Novo cliente" alinhado à direita com `justify-end` ou inversão da estrutura flex

**Código atual (linhas 226-242)**:
```text
<div className="flex justify-between items-center">
  <Button ...>Novo cliente</Button>
  <div className="hidden md:flex items-center text-slate-500 gap-2">
    <Search className="h-4 w-4" />
    <span className="text-sm">Gerencie sua base de dados de clientes</span>
  </div>
</div>
```

**Novo código**:
```text
<div className="flex justify-end items-center">
  <Button ...>Novo cliente</Button>
</div>
```

## 2. FiscalProjetosCadastro.tsx - Padronização de Cor do Botão

**Objetivo**: Ajustar cor do botão "Novo Projeto" para padronizar com outros botões de área (teal/primary).

**Mudança**:
- **Linha 412**: Substituir `className="bg-emerald-600 hover:bg-emerald-700"` por classe padrão do sistema (remover classes customizadas ou usar `className="bg-teal-600 hover:bg-teal-700"` se houver padronização teal)

