

## Plano: Exibir Setor/Segmento na tabela e modal do Mapa NCM

A tabela `pis_cofins_regra` já possui `id_segmento` (string). A tabela `setor_cliente` possui `id`, `nome`, `sigla`. Precisamos fazer o JOIN para exibir o nome do setor na tabela e permitir seleção no formulário.

### 1. Hook `useRegrasNCM.ts` — JOIN com setor_cliente

- Alterar a query de `select('*')` para `select('*, setor_cliente:id_segmento(id, nome, sigla)')` (foreign key join)
- Se não houver FK configurada, usar abordagem alternativa: carregar setores separadamente via `useSetoresCliente()` e mapear no componente
- Como `id_segmento` hoje recebe `'geral'` (string literal, não UUID), e `setor_cliente.id` é UUID, **não há FK natural**. Estratégia: usar `useSetoresCliente()` no componente para criar um mapa `id → nome/sigla`

### 2. Página `MapaNCMPisCofins.tsx` — Coluna na tabela

- Importar `useSetoresCliente` e criar mapa `Record<string, SetorCliente>`
- Adicionar coluna "Setor" no `<TableHeader>` (entre "NCM" e "CST PIS/COFINS")
- No `<TableBody>`, exibir `setorMap[regra.id_segmento]?.sigla` ou `regra.id_segmento` como fallback
- Adicionar filtro por setor no search (buscar também pela sigla/nome do setor)

### 3. Modal `RegraFormSheet.tsx` — Campo de seleção

- Receber prop `setores: SetorCliente[]`
- Adicionar campo `id_segmento` ao schema zod (string, obrigatório)
- Adicionar `<Select>` com opções dos setores no formulário (entre NCM e CST)
- Exibir setor no modo view via `DetailField`
- No `useEffect` de reset, preencher `id_segmento` a partir da regra

### 4. Hook `useRegrasNCM.ts` — Atualizar mutations

- Remover o hardcoded `id_segmento: 'geral'` do `createRegra`
- Passar `id_segmento` vindo do formulário

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/equipe/dev/MapaNCMPisCofins.tsx` | Coluna setor + mapa de setores |
| `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx` | Campo select setor no form + view |
| `src/hooks/useRegrasNCM.ts` | Remover hardcode `id_segmento: 'geral'` |

3 arquivos editados, ~60 linhas de alteração.

