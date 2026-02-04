

# Plano: Adaptar Layout para Gestao de Projetos Agil

## Problema Identificado

O layout atual (ProjetosDemandas.tsx) divide a tela em 3 paineis fixos:
- Sidebar de filtros (240px)
- Lista central 
- Painel de detalhes (400px)

Isso cria um visual "engessado" onde a tabela fica comprimida.

## Solucao: Layout Agil

### Novo Layout

```text
+------------------------------------------------------------------+
| FISCAL                                                           |
|------------------------------------------------------------------|
| [ Caixa de Entrada ] [ Pacotes de Trabalho ] [ Clientes ]        |
|------------------------------------------------------------------|
|                                                                  |
| [Projeto: v] [Filtrar v] [Buscar...             ] [+ Criar]      |
|                                                                  |
| +--------------------------------------------------------------+ |
| | ID  | Assunto                    | Tipo | Status | Resp  |..| |
| |-----|----------------------------|------|--------|-------|--| |
| | #37 | > Preparacao de documentos | FASE | Novo   | Joao  |  | |
| |     |   > 107 Abertura fiscal    | TAR  | Pend   | Maria |  | |
| | #38 | > Validacao de dados       | FASE | Prog   | Pedro |  | |
| +--------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+
                              |
                              | (ao clicar numa linha)
                              v
+------------------------------------------------------------------+
|                                                       [X]        |
| Sheet desliza da direita com detalhes do item                    |
| (nao divide a tela, abre sobre o conteudo)                       |
+------------------------------------------------------------------+
```

### Mudancas Principais

1. **Tabela ocupa 100% da largura** - sem paineis laterais fixos
2. **Detalhes abrem em Sheet** (painel deslizante) - nao em coluna fixa
3. **Filtros no topo** - como dropdowns compactos
4. **Hierarquia preservada** - FASE > TAREFA com indentacao

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/equipe/fiscal/FiscalDashboard.tsx` | Implementar sistema de 3 abas |
| `src/components/equipe/fiscal/FiscalLayout.tsx` | Simplificar - remover sidebar vazia |

## Novos Componentes

| Componente | Descricao |
|------------|-----------|
| `src/components/equipe/fiscal/FiscalInbox.tsx` | Caixa de entrada (notificacoes) |
| `src/components/equipe/fiscal/FiscalWorkPackages.tsx` | Pacotes de trabalho com tabela full-width |
| `src/components/equipe/fiscal/FiscalClients.tsx` | Gestao de clientes |
| `src/components/equipe/fiscal/WorkPackageSheet.tsx` | Sheet de detalhes (substitui painel fixo) |

---

## Detalhamento: FiscalWorkPackages

### Estrutura

```typescript
const FiscalWorkPackages = () => {
  const [selectedId, setSelectedId] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const handleRowClick = (wp: WorkPackage) => {
    setSelectedId(wp.id);
    setSheetOpen(true);
  };
  
  return (
    <div className="space-y-4">
      {/* Barra de Filtros no Topo */}
      <div className="flex items-center justify-between gap-4">
        {/* Dropdown Projeto */}
        <Select value={project} onValueChange={setProject}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>...</SelectContent>
        </Select>
        
        <div className="flex items-center gap-2">
          {/* Dropdown Filtrar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ListFilter className="h-4 w-4 mr-2" />
                {activeFilterLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Todos abertos</DropdownMenuItem>
              <DropdownMenuItem>Atrasados</DropdownMenuItem>
              <DropdownMenuItem>Atribuidos a mim</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Busca */}
          <Input placeholder="Buscar..." className="w-[200px]" />
          
          {/* Criar */}
          <Button><Plus className="h-4 w-4 mr-2" />Criar</Button>
        </div>
      </div>
      
      {/* Tabela Hierarquica - FULL WIDTH */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Atribuido</TableHead>
              <TableHead>Responsavel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchicalData.map(({ wp, depth, hasChildren }) => (
              <TableRow 
                key={wp.id} 
                onClick={() => handleRowClick(wp)}
                className="cursor-pointer hover:bg-slate-50"
              >
                {/* Conteudo com indentacao */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Sheet de Detalhes (abre da direita) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[450px] sm:max-w-lg">
          <WorkPackageSheet 
            workPackageId={selectedId}
            onClose={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};
```

### WorkPackageSheet (Painel Deslizante)

Conteudo similar ao WorkPackageDetail atual, mas dentro de um Sheet:

- Header com titulo e navegacao
- Seletor de status
- Secoes: Pessoas, Detalhes, Datas, Estimativas
- Abas: Atividade, Arquivos, Relacoes

---

## FiscalLayout Simplificado

Remover a sidebar de navegacao vazia e manter apenas:
- Header compacto
- Area de conteudo full-width
- Footer com acoes (Trocar area, Sair)

```typescript
const FiscalLayout = ({ children, title }: Props) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Compacto */}
      <header className="h-14 bg-white border-b px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-emerald-600" />
          <h1 className="font-semibold text-slate-900">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/equipe/projetos')}>
            Trocar area
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>
      
      {/* Conteudo Full Width */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};
```

---

## Secao Tecnica

### Componentes Reutilizados

| Componente | Uso |
|------------|-----|
| `Sheet` (shadcn) | Painel deslizante para detalhes |
| `DropdownMenu` | Filtros no topo |
| `Select` | Seletor de projeto |
| `StatusBadge`, `TypeBadge` | Badges visuais |
| `ActivityTimeline` | Timeline de atividades |

### Filtros Disponiveis

- **Todos abertos**: status != 'concluido'
- **Ultima atividade**: ordenado por updated_at desc
- **Atrasado**: due_date < hoje AND status != 'concluido'
- **Criado por mim**: created_by = user.id
- **Atribuido a mim**: assigned_to = user.id

### Hierarquia na Tabela

Mantida atraves de indentacao visual (paddingLeft) e icones de expansao:

```text
> 37  Preparacao de documentos  FASE  Novo
    107  Abertura fiscal         TAREFA  Pendente
    108  Validacao cadastral     TAREFA  Em revisao
> 38  Contabilidade mensal       FASE  Em progresso
```

---

## Resumo das Entregas

1. **FiscalLayout** simplificado sem sidebar
2. **FiscalDashboard** com 3 abas (Caixa de Entrada, Pacotes de Trabalho, Clientes)
3. **FiscalWorkPackages** com:
   - Filtros como dropdowns no topo
   - Tabela hierarquica ocupando 100% da largura
   - Detalhes em Sheet deslizante (nao painel fixo)
4. **FiscalInbox** para notificacoes
5. **FiscalClients** para gestao de clientes
6. **WorkPackageSheet** com detalhes do item selecionado

