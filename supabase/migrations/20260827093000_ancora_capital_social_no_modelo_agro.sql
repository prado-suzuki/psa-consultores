-- A âncora `capital_social` no bloco de capital do modelo (Agro).
--
-- Sem ela, TODA alteração contratual sobre o modelo
-- `Contrato Social — Sociedade Limitada (Agro)` morre inteira, com
-- `Placeholder não resolvido: {{refs.capital_social}}`, em qualquer cenário.
--
-- Como o furo nasceu: a migration 20260826143800 deu âncora estável às três
-- cláusulas que as resoluções citam pela numeração real, e pôs `capital_social`
-- no PAR de blocos "Capital social integralizado em moeda corrente"
-- (constituição e consolidação), que é a redação do modelo (Participações). O
-- modelo (Agro) não usa esse par: o capital dele é um bloco só, `Capital Social
-- - Agro`, que integraliza imóveis e não moeda corrente. Ele ficou sem âncora, e
-- as quatro resoluções semeadas citam `{{ refs.capital_social }}`.
--
-- Por que derruba o documento inteiro e não só a cláusula: `refsNumeracao`
-- publica em `{{ refs.<ancora> }}` a posição REAL de cada bloco ancorado na
-- composição (src/lib/templates/index.ts). Âncora que ninguém publica não existe
-- no contexto, e `render.ts` trata placeholder não resolvido como erro de
-- composição, não como campo vazio. Auditoria no sandbox: no (Agro), quatro
-- blocos CITAM `refs.capital_social` e zero o PUBLICAM; `sede_social` e
-- `administracao_social` publicam dois cada, nos dois modelos. Este é o único
-- caso.
--
-- Diferente do (Participações), aqui a âncora vai num bloco SEM flag: `Capital
-- Social - Agro` entra na constituição e na consolidação, então a referência
-- resolve nas duas sem precisar de gêmeo. O par do outro modelo precisava
-- compartilhar a âncora justamente porque os dois lados são mutuamente
-- exclusivos por `e_constituicao` / `e_alteracao`.
--
-- FICA PENDENTE, e não é o que esta migration trata: o bloco está no futuro ("o
-- capital social da empresa SERÁ de"), que é redação de constituição. Na
-- consolidação de uma alteração o tempo devia ser o presente, como o par do
-- (Participações) faz desde a Frente C (20260826143600). Corrigir isso é
-- redação, e pede o gêmeo de consolidação do bloco do (Agro).
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.
--
-- Idempotente: a guarda por `IS DISTINCT FROM` faz a reaplicação não escrever.

UPDATE public.tmpl_bloco
   SET ancora = 'capital_social',
       updated_at = now()
 WHERE id = '0e65aae6-bffe-41a6-be5c-f39498acf100'::uuid
   AND ancora IS DISTINCT FROM 'capital_social';
