

# Plano: NCM como Coluna + Salvamento em difal_sessao/difal_decisao

## Resumo das Alterações

1. **NCM como coluna separada** - Mover o NCM para sua própria coluna na tabela
2. **Criar sessão ao iniciar busca** - Registrar sessão em `difal_sessao` quando o usuário busca itens
3. **Salvar decisão em `difal_decisao`** - Ao confirmar regra no modal, salvar imediatamente na tabela de decisões
4. **Botão "Salvar Alterações"** - Envia as decisões da sessão para o endpoint de sync (banco principal)
5. **Indicador "Não Salvo"** - Badge visual quando há decisões pendentes de sincronização

---

## Arquitetura do Novo Fluxo

```text
+-------------------+       +-------------------+       +-------------------+
|  Usuário clica    |  -->  |  Cria sessão em   |  -->  | Sessão ativa      |
|  em "Buscar"      |       |  difal_sessao     |       | (status: EM_ANDAMENTO) |
+-------------------+       +-------------------+       +-------------------+
                                                                 |
                                                                 v
+-------------------+       +-------------------+       +-------------------+
|  Usuário clica    |  -->  |  Abre modal e     |  -->  | Salva em          |
|  em item pendente |       |  seleciona regra  |       | difal_decisao     |
+-------------------+       +-------------------+       +-------------------+
                                                                 |
                                                                 v
                            +-------------------+       +-------------------+
                            |  Badge mostra     |  <--  | Decisões locais   |
                            |  "X não salvas"   |       | contabilizadas    |
                            +-------------------+       +-------------------+
                                                                 |
                                                                 v
+-------------------+       +-------------------+       +-------------------+
|  Botão "Salvar    |  -->  |  POST /sync com   |  -->  | Atualiza sessão   |
|  Alterações"      |       |  decisões         |       | (status: SINCRONIZADO) |
+-------------------+       +-------------------+       +-------------------+
```

---

## Estrutura das Tabelas (Existentes)

**difal_sessao** (Cabeçalho da sessão):
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| usuario_id | text | ID do usuário |
| cliente_id | text | ID do cliente |
| cliente_nome | text | Nome do cliente |
| periodo | text | Período da busca |
| uf | text | UF destino |
| request_original | jsonb | Dados originais da requisição |
| status | text | EM_ANDAMENTO / SINCRONIZADO |
| criado_em | timestamp | Data de criação |
| sincronizado_em | timestamp | Data de sincronização |

**difal_decisao** (Decisões individuais):
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| sessao_id | uuid | FK para difal_sessao |
| cod_ncm | text | Código NCM |
| decisao | text | Tipo de decisão |
| id_icms_st_bq | text | ID da regra ICMS-ST (BigQuery) |
| decidido_em | timestamp | Data da decisão |

---

## Alterações Detalhadas

### 1. Tabela de Itens - Coluna NCM Separada

**Arquivo:** `src/pages/equipe/dev/AuditoriaFiscal.tsx`

Alterar o TableHeader para adicionar coluna NCM:

**Antes:**
```typescript
<TableHead>Item</TableHead>
```

**Depois:**
```typescript
<TableHead>Item</TableHead>
<TableHead className="w-[100px]">NCM</TableHead>
```

Alterar TableRow para separar NCM:

**Antes:**
```typescript
<TableCell>
  <div className="space-y-0.5">
    <p className="font-medium text-slate-900 line-clamp-1">{item.xProd}</p>
    <div className="flex gap-2 text-xs text-slate-500">
      <span>Cod: {item.cod_produto}</span>
      <span>•</span>
      <span className="font-mono">NCM: {item.cod_ncm}</span>
    </div>
  </div>
</TableCell>
```

**Depois:**
```typescript
<TableCell>
  <div className="space-y-0.5">
    <p className="font-medium text-slate-900 line-clamp-1">{item.xProd}</p>
    <p className="text-xs text-slate-500">Cod: {item.cod_produto}</p>
  </div>
</TableCell>
<TableCell>
  <span className="font-mono text-sm">{item.cod_ncm}</span>
</TableCell>
```

---

### 2. Estado para Gerenciar Sessão Ativa

**Arquivo:** `src/pages/equipe/dev/AuditoriaFiscal.tsx`

Adicionar estados para sessão e decisões:

```typescript
// Estado da sessão ativa
const [activeSessaoId, setActiveSessaoId] = useState<string | null>(null);
const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);
const [isSaving, setIsSaving] = useState(false);
```

---

### 3. Criar Sessão ao Buscar

Modificar `handleSearch` para criar sessão:

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
    // Criar sessão em difal_sessao
    const { data: session, error } = await supabase
      .from('difal_sessao')
      .insert({
        usuario_id: user?.id || 'unknown',
        cliente_id: selectedCliente,
        cliente_nome: clientes?.find(c => c.id === selectedCliente)?.nome || '',
        periodo: `${dataInicio} a ${dataFim}`,
        uf: ufDestino,
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

    setActiveSessaoId(session.id);
    setPendingDecisionsCount(0);
    setSearchTriggered(true);

    toast({
      title: 'Sessão iniciada',
      description: 'As decisões serão salvas automaticamente.',
    });
  } catch (error) {
    toast({
      title: 'Erro ao criar sessão',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  }
};
```

---

### 4. Modificar Modal para Salvar em difal_decisao

**Arquivo:** `src/components/equipe/dev/DifalAuditModal.tsx`

Adicionar prop `sessaoId` e modificar salvamento:

**Props atualizadas:**
```typescript
interface DifalAuditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DifalItem | null;
  ufDestino: string;
  sessaoId: string | null; // Nova prop
  onDecisionSaved: () => void; // Callback para incrementar contador
}
```

**Substituir mutation para API por insert no Supabase:**
```typescript
const handleSaveDecision = async (decisao: TipoDecisao, regraId: string | null = null) => {
  if (!item || !sessaoId) return;

  if (decisao === 'REGRA_SELECIONADA' && !regraId) {
    toast({
      title: 'Selecione uma regra',
      description: 'É necessário selecionar uma regra ICMS-ST.',
      variant: 'destructive',
    });
    return;
  }

  setIsSaving(true);

  try {
    // Salvar decisão em difal_decisao (Supabase)
    const { error } = await supabase
      .from('difal_decisao')
      .upsert({
        sessao_id: sessaoId,
        cod_ncm: item.cod_ncm,
        decisao: decisao,
        id_icms_st_bq: regraId,
        decidido_em: new Date().toISOString(),
      }, {
        onConflict: 'sessao_id,cod_ncm', // Constraint única
      });

    if (error) throw error;

    toast({
      title: 'Decisão registrada',
      description: 'Clique em "Salvar Alterações" para enviar ao banco principal.',
    });

    onDecisionSaved(); // Incrementar contador
    queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });
    onOpenChange(false);
  } catch (error) {
    toast({
      title: 'Erro ao salvar decisão',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsSaving(false);
  }
};
```

---

### 5. Botões de Ação + Indicador "Não Salvo"

**Arquivo:** `src/pages/equipe/dev/AuditoriaFiscal.tsx`

Adicionar junto ao botão de exportar:

```typescript
{/* Botões de Ação */}
{searchTriggered && itemsWithStatus.length > 0 && (
  <div className="flex justify-end gap-2 mb-4">
    {/* Indicador de decisões pendentes */}
    {pendingDecisionsCount > 0 && (
      <Badge variant="destructive" className="flex items-center gap-1 h-9 px-3">
        <AlertCircle className="h-4 w-4" />
        {pendingDecisionsCount} decisão(ões) não sincronizada(s)
      </Badge>
    )}
    
    {/* Botão Salvar Alterações */}
    <Button
      variant="default"
      size="sm"
      onClick={handleSaveChanges}
      disabled={pendingDecisionsCount === 0 || isSaving}
      className="gap-2 bg-teal-600 hover:bg-teal-700"
    >
      {isSaving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      Salvar Alterações
    </Button>
    
    {/* Botão Exportar Excel */}
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportExcel}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Exportar Excel
    </Button>
  </div>
)}
```

---

### 6. Função de Sincronização Final

```typescript
const handleSaveChanges = async () => {
  if (!activeSessaoId || pendingDecisionsCount === 0) return;

  setIsSaving(true);

  try {
    // 1. Buscar decisões da sessão atual
    const { data: decisoes, error: fetchError } = await supabase
      .from('difal_decisao')
      .select('*')
      .eq('sessao_id', activeSessaoId);

    if (fetchError) throw fetchError;

    // 2. Montar payload para API de sync
    const payload: SyncPayload = {
      sessao_id: activeSessaoId,
      decisoes: (decisoes || []).map(d => ({
        id_contribuinte: flatItems[0]?.id_contribuinte || '',
        cod_produto: '', // Será mapeado pela API baseado no NCM
        cod_ncm: d.cod_ncm,
        decisao: d.decisao as TipoDecisao,
        id_icms_st: d.id_icms_st_bq,
      })),
    };

    // 3. Enviar para endpoint de sync
    const response = await fetchWithAuth(
      `${API_BASE_URL}/api/v1/classificacoes/sync`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      throw new Error('Erro ao sincronizar classificações');
    }

    // 4. Atualizar status da sessão
    await supabase
      .from('difal_sessao')
      .update({
        status: 'SINCRONIZADO',
        sincronizado_em: new Date().toISOString(),
      })
      .eq('id', activeSessaoId);

    // 5. Limpar estado e invalidar cache
    setPendingDecisionsCount(0);
    queryClient.invalidateQueries({ queryKey: ['difal-classificacoes'] });

    toast({
      title: 'Alterações salvas',
      description: `${decisoes?.length || 0} decisão(ões) sincronizada(s) com sucesso.`,
    });
  } catch (error) {
    toast({
      title: 'Erro ao sincronizar',
      description: error instanceof Error ? error.message : 'Erro desconhecido',
      variant: 'destructive',
    });
  } finally {
    setIsSaving(false);
  }
};
```

---

## Resumo dos Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/equipe/dev/AuditoriaFiscal.tsx` | Coluna NCM, estados de sessão, criar sessão ao buscar, botões, função sync |
| `src/components/equipe/dev/DifalAuditModal.tsx` | Nova prop sessaoId, salvar em difal_decisao ao invés de API |
| `src/types/difal.ts` | Não precisa modificar (tipos já existem) |

---

## Seção Técnica

### Imports Adicionais (AuditoriaFiscal.tsx)

```typescript
import { Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
```

### Passagem de Props para o Modal

```typescript
<DifalAuditModal
  open={modalOpen}
  onOpenChange={setModalOpen}
  item={selectedItem}
  ufDestino={ufDestino}
  sessaoId={activeSessaoId}
  onDecisionSaved={() => setPendingDecisionsCount(prev => prev + 1)}
/>
```

### Callback no Modal

```typescript
const handleDecisionSaved = () => {
  setPendingDecisionsCount(prev => prev + 1);
};
```

---

## Fluxo Visual do Usuário

1. Seleciona cliente, contribuinte e período
2. Clica em **Buscar** → Cria sessão em `difal_sessao`
3. Vê grid de itens com coluna NCM separada
4. Clica em item pendente → Abre modal
5. Seleciona regra e confirma → Salva em `difal_decisao`
6. Badge mostra **"X decisão(ões) não sincronizada(s)"**
7. Clica em **Salvar Alterações** → Envia para API de sync
8. Sessão atualizada para status `SINCRONIZADO`

