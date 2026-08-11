-- =============================================================================
-- Cenário ruim: já existem duas matrículas iguais DENTRO do mesmo cliente
-- =============================================================================
-- Roda sobre um banco separado, em cima do mesmo fixture. Aqui a unicidade
-- global é derrubada à mão antes de sujar o dado — é o estado que a migration
-- 20260602190000 (cópia de cadastro para um cliente de dev, reusando `numero` e
-- `cartorio_id`) sugere que já existiu em produção. Com isso, a criação do
-- índice novo falharia.
--
-- O que se prova em seguida (no run.sh): a migration ABORTA, com a lista das
-- linhas ofensoras na mensagem, ANTES de derrubar qualquer coisa — e não com um
-- "could not create unique index" seco depois de já ter mexido no banco.
-- =============================================================================

ALTER TABLE public.matricula DROP CONSTRAINT matricula_numero_cartorio_unq;
DROP INDEX public.matricula_cartorio_numero_unique;

-- Duas matrículas, mesmo cartório, mesmo número, MESMO cliente (as duas
-- penduradas no mesmo bem do cliente A).
INSERT INTO public.matricula (id, bem_id, cartorio_id, numero) VALUES
  ('f0000000-0000-4000-8000-000000000001',
   'a1111111-0000-4000-8000-00000000000a',
   '11111111-0000-4000-8000-000000000001', '4.242'),
  ('f0000000-0000-4000-8000-000000000002',
   'a1111111-0000-4000-8000-00000000000a',
   '11111111-0000-4000-8000-000000000001', '4.242');
