

## Plano: Normalizar `setor_cliente` — Implementação aprovada com dual-write

### Fase 1 — Migration SQL (uma única migration)

```sql
-- Tabela setor_cliente
CREATE TABLE public.setor_cliente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  sigla text NOT NULL UNIQUE,
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- Dados iniciais
INSERT INTO setor_cliente (nome, sigla, descricao) VALUES
  ('Transportadora', 'TRA', 'Atividades relacionadas ao setor de transportes'),
  ('Agropecuária', 'AGR', 'Atividades relacionadas ao setor agropecuário'),
  ('Revenda', 'REV', 'Atividades relacionadas a revenda'),
  ('Indústria', 'IND', 'Atividades relacionadas ao setor industrial'),
  ('Cooperativa', 'COO', 'Atividades relacionadas a cooperativas'),
  ('Infraestrutura', 'INF', 'Atividades relacionadas a infraestrutura'),
  ('Diversificado', 'DIV', 'Atividades diversificadas'),
  ('Instituições do agro', 'INS', 'Instituições do setor agropecuário');

-- FK na tabela cliente
ALTER TABLE public.cliente ADD COLUMN setor_cliente_id uuid REFERENCES public.setor_cliente(id);

-- Backfill
UPDATE public.cliente c SET setor_cliente_id = sc.id
FROM public.setor_cliente sc WHERE c.setor_cliente = sc.sigla AND c.setor_cliente IS NOT NULL;

-- RLS
ALTER TABLE public.setor_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read" ON public.setor_cliente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert" ON public.setor_cliente FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update" ON public.setor_cliente FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete" ON public.setor_cliente FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

### Fase 2 — Novo hook: `src/hooks/useSetorCliente.ts`

Query simples que busca todos os setores ordenados por nome. Retorna `{ id, nome, sigla, descricao }[]`.

### Fase 3 — Frontend: `NewClientModal.tsx`

| Local | Alteração |
|---|---|
| Estado `defaultClientData` (linha 619) | Adicionar `setor_cliente_id: ""` ao lado de `setor_cliente` |
| Carregamento edição (linha 768) | Carregar `setor_cliente_id` do cliente existente |
| Dropdown "Área do negócio" (linhas 1884-1905) | Trocar itens hardcoded por `setores.map()` da query; `value` = `setor.id`; label = `sigla - nome` |
| `onValueChange` do Select | Setar AMBOS: `setor_cliente_id = setor.id` e `setor_cliente = setor.sigla` (busca sigla do array de setores) |
| `executeSave` payload (linha 1356-1367) | Incluir `setor_cliente_id: clientData.setor_cliente_id \|\| null` + manter `setor_cliente: clientData.setor_cliente \|\| null` (dual-write) |

**Dual-write no `executeSave`**: ao montar `clientPayload`, busca a sigla correspondente ao `setor_cliente_id` selecionado no array de setores e grava ambos os campos. Isso garante compatibilidade com `FiscalClients.tsx`, `GestaoClientes.tsx`, `GerenciarDados.tsx` e `sync-cadastros`.

### Arquivos afetados

| Arquivo | Tipo |
|---|---|
| Migration SQL | Novo |
| `src/hooks/useSetorCliente.ts` | Novo |
| `src/components/equipe/fiscal/NewClientModal.tsx` | Alterado |

Nenhum outro arquivo precisa de mudança — todos continuam lendo `setor_cliente` (texto).

