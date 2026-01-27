

# Plano: Remover Toggle PIS/COFINS + Sessão Permanente por Usuário

## Resumo das Alterações

1. **Remover toggle ICMS-ST/PIS-COFINS** - A consulta sempre será ICMS-ST
2. **Remover campos e lógica de PIS/COFINS** - Simplificar tipos e interface
3. **Sessão permanente por usuário** - Ao entrar na ferramenta, carregar última sessão do usuário
4. **Lógica de busca atualizada** - Reutilizar sessão existente ou criar nova apenas se necessário

---

## Arquitetura do Novo Fluxo de Sessão

```text
+-------------------+       +-------------------+       +-------------------+
|  Usuário abre     |  -->  |  Busca última     |  -->  | Sessão encontrada?|
|  a ferramenta     |       |  sessão do user   |       |                   |
+-------------------+       +-------------------+       +-------------------+
                                                                 |
                            +------------------------------------+
                            |                                    |
                            v                                    v
                   +------------------+               +------------------+
                   |  SIM: Carregar   |               |  NÃO: Estado     |
                   |  filtros e dados |               |  inicial limpo   |
                   +------------------+               +------------------+
                            |
                            v
              +---------------------------+
              |  Exibir decisões          |
              |  já salvas na sessão      |
              +---------------------------+
```

---

## Alterações no Banco de Dados

**Nenhuma alteração necessária** - A tabela `difal_sessao` já possui `usuario_id` como campo de texto que podemos usar para filtrar.

---

## Alterações Detalhadas

### 1. Remover Tipo DifalModo e Campos PIS/COFINS

**Arquivo:** `src/types/difal.ts`

Remover:
- `DifalModo` type
- Campos `cst_pis` e `cst_cofins` do `DifalItem`
- Campos `PIS` e `COFINS` do `NFeProduto`

### 2. Remover Toggle e Lógica Relacionada

**Arquivo:** `src/pages/equipe/dev/AuditoriaFiscal.tsx`

**Remover:**
- Import de `ToggleGroup` e `ToggleGroupItem`
- Estado `modo`
- Componente `ToggleGroup` do JSX (linhas 594-614)
- Lógica condicional baseada em `modo` na tabela

### 3. Carregar Última Sessão ao Iniciar

Adicionar `useEffect` para carregar sessão anterior:

```typescript
// Carregar última sessão do usuário ao entrar
useEffect(() => {
  const loadLastSession = async () => {
    if (!user?.id) return;

    const { data: lastSession, error } = await supabase
      .from('difal_sessao')
      .select('*')
      .eq('usuario_id', user.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !lastSession) return;

    // Restaurar estado da sessão
    setActiveSessaoId(lastSession.id);
    setSelectedCliente(lastSession.cliente_id);
    
    // Parse do request_original para restaurar filtros
    const request = lastSession.request_original as {
      contribuinte_id?: string;
      data_inicio?: string;
      data_fim?: string;
    };
    
    if (request.contribuinte_id) {
      setSelectedContribuinte(request.contribuinte_id);
    }
    if (request.data_inicio) {
      setDataInicio(request.data_inicio);
    }
    if (request.data_fim) {
      setDataFim(request.data_fim);
    }

    // Carregar contagem de decisões pendentes
    const { count } = await supabase
      .from('difal_decisao')
      .select('*', { count: 'exact', head: true })
      .eq('sessao_id', lastSession.id);

    setPendingDecisionsCount(count || 0);
    
    // Se sessão ainda está em andamento, disparar busca
    if (lastSession.status === 'EM_ANDAMENTO') {
      setSearchTriggered(true);
    }
  };

  loadLastSession();
}, [user?.id]);
```

### 4. Atualizar handleSearch

Modificar para atualizar sessão existente ou criar nova:

```typescript
const handleSearch = async () => {
  if (!selectedContribuinte) {
    toast({
      title: 'Selecione um contribuinte',
      description: 'É necessário selecionar um contribuinte para buscar.',
      variant: 'destructive',
    });
    return;
  }

  try {
    // Verificar se já existe uma sessão ativa para este usuário
    const { data: existingSession } = await supabase
      .from('difal_sessao')
      .select('id')
      .eq('usuario_id', user?.id || 'unknown')
      .eq('status', 'EM_ANDAMENTO')
      .maybeSingle();

    let sessionId: string;

    if (existingSession) {
      // Atualizar sessão existente com novos parâmetros
      const { error } = await supabase
        .from('difal_sessao')
        .update({
          cliente_id: selectedCliente,
          cliente_nome: clientes?.find(c => c.id === selectedCliente)?.nome || '',
          periodo: `${dataInicio} a ${dataFim}`,
          uf: 'MT',
          request_original: {
            contribuinte_id: selectedContribuinte,
            data_inicio: dataInicio,
            data_fim: dataFim,
          },
        })
        .eq('id', existingSession.id);

      if (error) throw error;
      sessionId = existingSession.id;
    } else {
      // Criar nova sessão
      const { data: session, error } = await supabase
        .from('difal_sessao')
        .insert({
          usuario_id: user?.id || 'unknown',
          cliente_id: selectedCliente,
          cliente_nome: clientes?.find(c => c.id === selectedCliente)?.nome || '',
          periodo: `${dataInicio} a ${dataFim}`,
          uf: 'MT',
          request_original: {
            contribuinte_id: selectedContribuinte,
            data_inicio: dataInicio,
            data_fim: dataFim,
          },
          status: 'EM_ANDAMENTO',
        })
        .select('id')
        .single();

      if (error) throw error;
      sessionId = session.id;
    }

    setActiveSessaoId(sessionId);
    
    // Buscar contagem de decisões existentes
    const { count } = await supabase
      .from('difal_decisao')
      .select('*', { count: 'exact', head: true })
      .eq('sessao_id', sessionId);

    setPendingDecisionsCount(count || 0);
    setSearchTriggered(true);

    toast({
      title: existingSession ? 'Sessão atualizada' : 'Sessão iniciada',
      description: 'As decisões serão salvas automaticamente.',
    });
  } catch (error) {
    toast({
      title: 'Erro ao gerenciar sessão',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  }
};
```

### 5. Simplificar Coluna de Tabela (Remover Lógica PIS/COFINS)

A última coluna da tabela atualmente mostra MVA/ST ou Natureza baseado no modo. Simplificar para sempre mostrar MVA/ST:

**Antes (linha 754-834):**
```typescript
{modo === 'icms' ? (
  <TableHead className="w-[120px]">MVA/ST</TableHead>
) : (
  <TableHead className="w-[120px]">Natureza</TableHead>
)}
```

**Depois:**
```typescript
<TableHead className="w-[120px]">MVA/ST</TableHead>
```

E simplificar a célula da tabela para sempre mostrar dados ICMS-ST.

---

## Resumo dos Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/types/difal.ts` | Remover `DifalModo`, campos PIS/COFINS |
| `src/pages/equipe/dev/AuditoriaFiscal.tsx` | Remover toggle, adicionar carregamento de sessão, simplificar tabela |

---

## Seção Técnica

### Imports a Remover (AuditoriaFiscal.tsx)

```typescript
// Remover estas linhas
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DifalModo } from '@/types/difal';
```

### Estados a Remover

```typescript
// Remover
const [modo, setModo] = useState<DifalModo>('icms');
```

### Lógica de Achatamento Simplificada

Remover campos PIS/COFINS do `flattenNFeItems`:

```typescript
const flattenNFeItems = (
  nfes: NFeRecord[],
  cnpj: string
): DifalItem[] => {
  return nfes.flatMap((nfe) =>
    (nfe.produtos || []).map((prod: NFeProduto) => ({
      id_contribuinte: cnpj,
      cod_produto: prod.cProd,
      cod_ncm: prod.NCM,
      xProd: prod.xProd,
      vProd: prod.vProd,
      cfop: prod.CFOP,
      uf_emit: nfe.emit?.UF || '??',
      uf_dest: nfe.dest?.UF || '??',
      cst_icms: prod.ICMS?.CST || null,
      aliq_icms: prod.ICMS?.pICMS || null,
      chave_nfe: nfe.chave_nfe,
      nItem: prod.nItem,
    }))
  );
};
```

---

## Comportamento Esperado Após a Correção

1. Usuário abre `/equipe/dev/auditoria-fiscal`
2. Sistema busca última sessão do usuário no banco
3. Se existir sessão `EM_ANDAMENTO`:
   - Restaura filtros (cliente, contribuinte, período)
   - Carrega contagem de decisões pendentes
   - Dispara busca automaticamente
4. Usuário pode continuar classificando itens
5. Decisões são salvas em `difal_decisao` a cada confirmação
6. Ao clicar em "Salvar Alterações", sincroniza com banco principal

