# Spec 03 — Dois clientes de exemplo no sandbox

**Para:** subagent em **Opus 5**
**Branch:** `suc-01-calculadora-itcmd`
**Serve de:** dado para o critério de aceite da SUC-01C — *"um caso homologado é montado e aprovado sem planilha"*
**Estado:** versão inicial. Depende do schema da spec 02 estar decidido.

---

## 1. Por que existe

Hoje o sandbox tem **valor de mercado vazio em 26 de 26 matrículas** e valor de ITR vazio em tudo. Só o contábil tem dado. Sem isso, a calculadora mostra um cenário funcionando e dois em branco, e não há como validar a comparação entre os três — que é a razão de existir da ferramenta.

Esta spec cadastra, no sandbox, os dois casos que a OSG entregou como modelo: **Fazenda Santa Terezinha** e **Agro Aliança**. Com eles, o aceite da tela deixa de ser opinião e passa a ser conferência: dirigir a tela e sair R$ 186.864,00 por donatário no cenário contábil do Santa Terezinha.

## 2. Regra dura: escrever e não aplicar

**Você escreve a migration e não a executa. Nunca.** Sem `supabase db push`, sem `apply_migration`, sem `INSERT` por MCP. Leitura é `SELECT` e só.

Quem valida é o agente principal; quem aprova é o Alexandre. Ao terminar, diga na mesma mensagem que há migration pendente de aprovação e o caminho do arquivo.

Migration **exclusiva do sandbox nunca altera schema, só dados** — é o que o AGENTS.md permite. Se você concluir que falta coluna, **pare e reporte**: isso é spec 02, não esta.

## 3. De onde vêm os dados

Duas origens, e as duas precisam ser lidas:

**No repositório** — `docs/osg/sucessao/arquivos exemplo/`:

- `Cópia de WP_Cálculo ITCMD_MT - revisado por Luana(1).xlsx`, aba `Doação` — é a **âncora**. O QUADRO 2 tem denominação, matrícula, área, município e os três valores por imóvel; o QUADRO 1 tem a composição societária.
- `Apresentação_Eixo Sucessório Santa Terezinha_11.03(1).pptx` — slides 9, 10 e 12.
- `Apresentação_Agro Aliança_Eixo Sucessório (1).pptx` — slide 17 em diante, um quadro por cenário.

**Nos drives compartilhados** — para completar o que o WP não traz (documento de matrícula, contrato social, instrumento de doação):

```
G:\Drives compartilhados\OSG - Sucessão\Fazenda Santa Terezinha
G:\Drives compartilhados\OSG - Sucessão\Agro Aliança
```

Prefira versões mais recentes e as marcadas como definitivas. **Leia os arquivos um a um; não delegue a leitura.**

## 4. Regra de desempate e de fidelidade

**Quando o WP e a apresentação divergirem, vale o WP.** Isso já está decidido e não se reabre.

Cadastre o que os artefatos dizem, **sem corrigir**. Se um número parecer errado, ele entra como está e você reporta — a auditoria dos artefatos da OSG não é nosso trabalho. Duas exceções conhecidas, já registradas em `golden-master.json`, que você **não** deve tentar consertar: os três valores de ITCD do slide 12 do Santa Terezinha não reproduzem pela tabela (bloqueio D7), e o universo de quotas tem três versões diferentes entre WP, apresentação e minutas (D1).

Use o universo do **WP**: 6.649.400 quotas no Santa Terezinha, com Cristiano em 6.086.672 e Fabiane em 562.728.

## 5. O que cadastrar

Reaproveitando as tabelas de cadastro que já existem — `cliente`, `pessoa`, `parentesco`, `bem`, `matricula`, `titularidade`, `cartorio`, `quadro_societario`. Não crie estrutura paralela.

| Bloco | Conteúdo |
|---|---|
| Cliente | um por caso, marcado no `ambiente` de teste conforme a convenção do repositório |
| Pessoas | fundadores com `is_fundador`, filhos, com `parentesco` tipo `Filho(a)`, e `regime_bens` dos casados |
| Empresa | a PJ cujas quotas são doadas, com `quadro_societario` refletindo o estado **anterior** à doação |
| Imóveis | um `bem` por fazenda, com `matricula`, área, município e cartório |
| Valores | os três por imóvel: contábil, ITR e mercado, como estão no QUADRO 2 do WP |
| Titularidade | fração por matrícula, de fato e de direito |

Ponto de atenção sobre o quadro societário: no MMS Agro ele está com o estado **depois** da doação, e isso confunde a calculadora, que trata quota pré-existente e doação anterior como coisas diferentes. Cadastre o estado **antes**, e registre a doação anterior, quando houver, como dado declarado.

## 6. Entregáveis

- migration de dados em `supabase/migrations/`, com prefixo que a marque como exclusiva do sandbox, idempotente, **não aplicada**;
- um documento curto ao lado desta spec listando, por imóvel e por pessoa, **de qual arquivo e de qual página ou célula** cada valor saiu — sem isso ninguém confere o cadastro depois;
- versão inicial de retrospectiva e anexo da tarefa que o Alexandre indicar, pelas skills em `.claude/skills/criar-retrospectiva` e `criar-anexo`.

## 7. Reportar

O que foi cadastrado, com a contagem por tabela. O que **não** foi encontrado nos artefatos e ficou faltando. E toda divergência entre WP, apresentação e documento do drive que você tenha visto — registrada, não resolvida.
