-- O flag `integralizador` para de mandar no texto do contrato.
--
-- Última fatia de docs/planos/valor-contabil-por-titular-e-integralizacao-parcial.md.
--
-- Ele elegia UM titular por imóvel para liderar a descrição ("50% de
-- propriedade de FULANO, remanescente de SICRANA") e mandava os demais para a
-- área remanescente. Era uma decisão de texto tomada à mão, e os valores por
-- titular passaram a contradizê-la: quem integraliza é quem tem valor a
-- integralizar, e quem fica de fora é quem não tem. Dois mecanismos decidindo a
-- mesma frase, e um deles sem nada que o mantenha coerente com o outro.
--
-- Quem lidera a alínea hoje é o SÓCIO DO PARÁGRAFO, decidido pelo próprio
-- `mapearIntegralizacoes` a cada alínea; o imóvel avulso (binding unitário) lê
-- os valores. Nenhuma tela escreve mais nesta coluna, e nenhuma leitura a pede.
--
-- Os índices saem AGORA porque eles são a única coisa que a coluna ainda impõe:
-- um único parcial por imóvel, que travaria qualquer escrita futura. A COLUNA
-- fica, e só é derrubada num ciclo depois do corte validado em uso real (mesmo
-- padrão da `quadro_societario`): enquanto ela existir, um rollback do código
-- volta a funcionar sozinho, e os `audit_logs` que citam o campo continuam
-- legíveis.
--
-- Nada aqui aplica em produção. Sandbox pelo `bun run db:sync --apply`.

drop index if exists public.idx_titularidade_integralizador_matricula;
drop index if exists public.idx_titularidade_integralizador_bem;

comment on column public.titularidade.integralizador is
  'APOSENTADO em 14/09/2026 e a ser derrubado num ciclo seguinte. Elegia o titular que liderava a descrição do imóvel; hoje quem lidera a alínea é o sócio do parágrafo e o remanescente é quem não tem `vlr_integralizar`. Nenhum código escreve nem lê esta coluna.';