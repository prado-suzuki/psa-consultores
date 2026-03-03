

# Trocar checkboxes em tabela por dropdown multi-select (Líder Geral e Sublíder)

## Alteração

Substituir as tabelas com checkboxes dos campos "Líder Geral" e "Sublíder" por um componente **Popover + Command** (padrão combobox multi-select), onde:

- O trigger mostra os nomes selecionados como badges (ou placeholder se vazio)
- Ao clicar, abre um dropdown com lista pesquisável
- Cada item tem checkbox inline para multi-seleção
- Clicar em um item alterna a seleção sem fechar o dropdown

## Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Linhas ~1032-1145: substituir as duas tabelas de checkboxes por Popover+Command multi-select |

## Implementação

Usar `Popover` + `Command` (já disponíveis no projeto via `cmdk`) para criar um dropdown multi-select para cada campo:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="w-full justify-between">
      {formData.leader_ids.length > 0
        ? <badges dos selecionados>
        : "Selecione líderes..."}
      <ChevronsUpDown />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <Command>
      <CommandInput placeholder="Buscar líder..." />
      <CommandList>
        {lideres.map(m => (
          <CommandItem onSelect={toggle}>
            <Check className={selected ? 'opacity-100' : 'opacity-0'} />
            {m.first_name} {m.last_name}
          </CommandItem>
        ))}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Mesmo padrão para Sublíder com `sublideres` e `sublider_ids`.

