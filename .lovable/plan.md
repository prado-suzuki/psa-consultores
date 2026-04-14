

# Correção: Nome do responsável visível ao cliente em MeusChamados.tsx

## Diagnóstico

O código já faz o JOIN e já renderiza o nome — **o problema é RLS**. A query `profiles!assigned_to` tenta ler o perfil de outro usuário, mas a policy de `profiles` só permite `auth.uid() = id`. O JOIN retorna `null` silenciosamente.

## Solução

Trocar o JOIN de `profiles` (tabela com RLS restritivo) para `profiles_safe` (view sem RLS, expõe apenas `id, first_name, last_name`). Isso segue o padrão do projeto documentado em AI_CONTEXT.

### Arquivo: `src/pages/cliente/MeusChamados.tsx`

**Alteração única** — L100-103, trocar:
```ts
assigned_agent:profiles!assigned_to(first_name, last_name)
```
por:
```ts
assigned_agent:profiles_safe!assigned_to(first_name, last_name)
```

O resto do código (interface, renderização, lógica condicional) permanece inalterado — já funciona corretamente.

## Impacto
- 1 arquivo, 1 linha alterada
- Zero mudança de banco
- Segue o padrão `profiles_safe` já usado em 32+ arquivos do projeto

