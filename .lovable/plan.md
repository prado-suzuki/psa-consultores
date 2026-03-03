

# Criar aba "Cadastro Categorias" no Controle de Acessos

## Contexto

O usuário quer gerenciar 3 catálogos que hoje são hardcoded ou sem interface de gestão:
1. **Categorias** — tabela `tax_categorias` (usada nos projetos Tax ao selecionar área)
2. **Tipo de Produto/Segmento** — array `PRODUTO_SEGMENTO_OPTIONS` hardcoded no `NewClientModal.tsx` (ASO, AFI, PFT, etc.)
3. **Serviços Prestados** — também `tax_categorias` (usada como `servicos_contratados` na aba OS do NewClientModal)

## Alterações necessárias

### 1. Criar tabela `produto_segmento` no banco

Nova tabela para substituir o array hardcoded `PRODUTO_SEGMENTO_OPTIONS`:

```sql
CREATE TABLE public.produto_segmento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,       -- ex: 'ASO', 'AFI'
  nome text NOT NULL,                -- ex: 'Auditoria Pessoa Jurídica'
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.produto_segmento ENABLE ROW LEVEL SECURITY;

-- RLS: leitura para autenticados, escrita para admin/lider
CREATE POLICY "Authenticated can read" ON public.produto_segmento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/lider can manage" ON public.produto_segmento
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'lider'));

-- Seed com os valores atuais
INSERT INTO public.produto_segmento (codigo, nome) VALUES
  ('ASO', 'Auditoria Pessoa Jurídica'),
  ('AFI', 'Auditoria Pessoa Física'),
  ('PFT', 'Consultoria Profitto'),
  ('PTN', 'Consultoria Protenun'),
  ('DHU', 'Consultoria em Recursos Humanos'),
  ('FMB', 'Consultoria Family Business'),
  ('OS1', 'Sucessão Familiar - 1.0 (jurídico)'),
  ('OSG', 'Sucessão Familiar - 2.0 (jurídico + governança)'),
  ('SOC', 'Consultoria em Organização Societária'),
  ('OUT', 'Receitas com Parceiros'),
  ('PTR', 'Planejamento Tributário'),
  ('REA', 'Reduções de Encargos na Venda de Ativos'),
  ('ACF', 'Assessoramento Contábil e Fiscal'),
  ('RRT', 'Recuperação e Ressarcimento Tributário Administrativo'),
  ('DTB', 'Defesas Tributárias Federais, Estaduais e Previdenciárias'),
  ('EDP', 'Emissão de Pareceres'),
  ('RTJ', 'Recuperação Tributária Jurídica'),
  ('RSC', 'Reestruturação Societária'),
  ('IPC', 'Implantação de Programa de COMPLIANCE'),
  ('CDI', 'Implantação de Canal de Denúncia e Investigação nas Empresas'),
  ('AIV', 'Ação de Inventário'),
  ('APV', 'Antecipação de Provas'),
  ('AGP', 'Ações de Grande Porte'),
  ('JCM', 'Consultoria Jurídica Civil Mensal'),
  ('ACO', 'Ações Coletivas'),
  ('ADJ', 'Administração Judicial'),
  ('CJP', 'Consultoria Jurídica Pontual'),
  ('DIV', 'Diversos');
```

### 2. Adicionar aba + sub-abas em `EquipeControleAcessos.tsx`

| Alteração | Detalhe |
|---|---|
| Nova TabsTrigger `cadastro_categorias` | Após "Cadastros Clientes" |
| TabsContent com 3 sub-abas internas | Tabs aninhadas: "Categorias", "Produto/Segmento", "Serviços Prestados" |

Cada sub-aba terá:
- Tabela listando os itens existentes (nome, código se aplicável, status ativo/inativo)
- Botão "Adicionar" que abre Dialog para criar novo item
- Botões editar/excluir inline em cada linha

**Sub-aba Categorias**: CRUD sobre `tax_categorias` (id, nome)
**Sub-aba Produto/Segmento**: CRUD sobre `produto_segmento` (id, codigo, nome, is_active)
**Sub-aba Serviços Prestados**: CRUD sobre `tax_categorias` (mesma tabela, mas como interface separada para clareza — pode ser a mesma lista ou filtrada se necessário)

### 3. Atualizar `NewClientModal.tsx`

Substituir o array hardcoded `PRODUTO_SEGMENTO_OPTIONS` por uma query à nova tabela `produto_segmento`, mantendo a opção "Outro (personalizado)".

### Arquivos impactados

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/EquipeControleAcessos.tsx` | Nova aba + 3 sub-abas com CRUD |
| `src/components/equipe/dev/NewClientModal.tsx` | Query `produto_segmento` no lugar do array hardcoded |
| Migration SQL | Criar tabela `produto_segmento` + seed |

