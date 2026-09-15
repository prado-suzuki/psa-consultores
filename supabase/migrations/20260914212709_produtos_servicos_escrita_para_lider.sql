-- A bancada Produtos & Serviços ganha um endereço na Gerencial da Tax, que é
-- líder+. Abrir a porta da sala sem abrir o cofre deixaria o líder entrar,
-- clicar no checkbox e levar 42501: o banco não pergunta de qual tela veio o
-- clique, pergunta o papel de quem clicou.
--
-- As três tabelas da tela estavam desencontradas, e a medição no sandbox em
-- 14/09/2026 é a fonte disto: `produto_segmento` já aceitava escrita de
-- team_member+, enquanto `servicos_prestados` e `produto_servico` aceitavam só
-- admin — e `produto_servico` é justamente o que a tela grava a cada clique.
-- Aqui as duas admin-only passam a líder+. `produto_segmento` NÃO é tocada:
-- apertá-la seria outra mudança, que ninguém pediu.
--
-- A LEITURA DAS TRÊS CONTINUA team_member+, e não é sobra. O cadastro de projeto
-- (/equipe/tax/projetos/cadastro) lê produto e serviço para montar as tarefas do
-- projeto novo; fechar o SELECT em líder+ deixaria o consultor sem conseguir
-- criar projeto. As policies de SELECT não aparecem neste arquivo de propósito.
--
-- Por que `for all` não fecha a leitura de ninguém: policy permissiva SOMA. O
-- team_member segue lendo pela policy de SELECT ao lado, que continua de pé.
--
-- As policies de admin são DERRUBADAS em vez de conviver com as novas:
-- `has_role_or_higher(..., 'lider')` já resolve para ('lider','admin'), então
-- admin não perde nada, e duas policies permissivas dizendo quase a mesma coisa
-- é o tipo de coisa que a próxima pessoa lê como se uma delas restringisse.

drop policy if exists admin_all_servicos_prestados on public.servicos_prestados;
drop policy if exists lider_manage_servicos_prestados on public.servicos_prestados;
create policy lider_manage_servicos_prestados
  on public.servicos_prestados
  for all
  to authenticated
  using (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role))
  with check (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));

drop policy if exists "Admins can manage produto_servico" on public.produto_servico;
drop policy if exists lider_manage_produto_servico on public.produto_servico;
create policy lider_manage_produto_servico
  on public.produto_servico
  for all
  to authenticated
  using (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role))
  with check (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));
