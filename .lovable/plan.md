

## Plano: Criar mapeamento produto_segmento ↔ servicos_prestados

### Etapa 1 — Migration: criar tabela `produto_servico`

```sql
CREATE TABLE public.produto_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_segmento_id uuid NOT NULL REFERENCES public.produto_segmento(id) ON DELETE CASCADE,
  servico_prestado_id uuid NOT NULL REFERENCES public.servicos_prestados(id) ON DELETE CASCADE,
  UNIQUE(produto_segmento_id, servico_prestado_id)
);

ALTER TABLE public.produto_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view produto_servico"
  ON public.produto_servico FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage produto_servico"
  ON public.produto_servico FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

A policy de admin usa query direta em `user_roles` em vez de `has_role()`. Recomendo trocar por `public.has_role(auth.uid(), 'admin')` para manter consistência com o restante do projeto e evitar problemas de recursão RLS futuros. Fora isso, a estrutura está correta.

### Etapa 2 — Popular 31 vínculos via INSERT

Usar a ferramenta de inserção (não migration) para executar INSERTs com subqueries que resolvem os UUIDs dinamicamente:

```sql
INSERT INTO public.produto_servico (produto_segmento_id, servico_prestado_id)
VALUES
  ((SELECT id FROM produto_segmento WHERE codigo = 'PTR'), (SELECT id FROM servicos_prestados WHERE nome = 'Planejamento Tributário')),
  ((SELECT id FROM produto_segmento WHERE codigo = 'ACF'), (SELECT id FROM servicos_prestados WHERE nome = 'Diagnóstico Contábil e Tributário')),
  -- ... demais 29 linhas
ON CONFLICT (produto_segmento_id, servico_prestado_id) DO NOTHING;
```

Total: 31 vínculos cobrindo 9 produtos (PTR, ACF, RRT, RTJ, DTB, EDP, RSC, REA, ADJ). Os demais produtos ficam sem vínculo por enquanto.

### Etapa 3 — Nenhuma alteração no frontend

Integração no formulário será feita em prompt separado.

### Observação técnica

Sugiro ajustar a policy de admin para usar `has_role()`:

```sql
CREATE POLICY "Admins can manage produto_servico"
  ON public.produto_servico FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

Isso segue o padrão SECURITY DEFINER já estabelecido no projeto.

