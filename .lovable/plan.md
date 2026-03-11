

## Plano: Criar tabela `inscricao_contribuinte` e UI de múltiplas IEs

### Etapa 1 — Migration: criar tabela

```sql
CREATE TABLE public.inscricao_contribuinte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribuinte_id uuid NOT NULL,
  situacao text NOT NULL DEFAULT 'sim',  -- 'sim', 'nao', 'isento'
  numero_ie text,
  uf text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.inscricao_contribuinte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage inscricoes"
ON public.inscricao_contribuinte FOR ALL TO authenticated
USING (true) WITH CHECK (true);
```

A FK não é declarada formalmente pois `contribuinte_id` pode apontar para `contribuinte` ou `contribuinte_dev` (mesma lógica já usada em outras tabelas do projeto).

### Etapa 2 — Data migration (via insert tool): copiar IEs existentes

```sql
INSERT INTO public.inscricao_contribuinte (contribuinte_id, situacao, numero_ie, uf)
SELECT id, situacao_inscricao_estadual, inscricao_estadual, uf
FROM public.contribuinte
WHERE situacao_inscricao_estadual IS NOT NULL AND situacao_inscricao_estadual != '';

INSERT INTO public.inscricao_contribuinte (contribuinte_id, situacao, numero_ie, uf)
SELECT id, situacao_inscricao_estadual, inscricao_estadual, uf
FROM public.contribuinte_dev
WHERE situacao_inscricao_estadual IS NOT NULL AND situacao_inscricao_estadual != '';
```

### Etapa 3 — Frontend: `NewClientModal.tsx`

**3a. Estado e queries:**
- Adicionar estado `inscricoesMap: Record<string, InscricaoIE[]>` (mapa contribuinte_id → lista de IEs)
- Carregar IEs de `inscricao_contribuinte` no `loadData` para cada contribuinte existente
- No `handleSave`, persistir IEs: upsert das existentes, insert das novas, delete das removidas

**3b. UI — dentro do card de cada contribuinte (modo visualização e edição):**
- Abaixo do campo "Inscrição Estadual" existente (que passa a ser legado/read-only ou removido), adicionar seção "Inscrições Estaduais"
- Exibir lista de IEs cadastradas como badges/chips: `UF - Nº IE` (ou "Isento" / "Não")
- Botão "Adicionar IE" que mostra uma linha inline com:
  - Select de UF (todos os 27 estados do Brasil) — na mesma linha
  - Select de situação (Sim / Não / Isento)
  - Input de número da IE (visível apenas quando situação = "sim")
  - Botão confirmar / remover

**3c. Manter compatibilidade:**
- Os campos `situacao_inscricao_estadual` e `inscricao_estadual` na tabela de contribuinte não serão removidos neste momento (evita breaking changes). A nova tabela é a fonte primária.

### O que NÃO será feito
- Não remove colunas legadas das tabelas contribuinte/contribuinte_dev (feito em etapa futura)
- Nenhuma alteração em outras tabelas ou RLS existentes

