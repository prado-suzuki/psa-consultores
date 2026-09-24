# Calculadora de ITCMD — as bases de cálculo com usufruto

Regras em vigor da Calculadora de ITCMD sobre a base de cálculo das guias com usufruto: o que se
apura, o que se grava e como a tela mostra.

## As duas bases

A GIA com usufruto aceita duas bases, e a diferença é da lei, não da tela:

| Base | Fundamento | Efeito |
|---|---|---|
| Integral, 100% | Decreto 2.125/03, art. 28, §3º, III | encerra a tributação |
| Reduzida, 70% | Decreto 2.125/03, art. 11, §2º, I | deixa parcela devida na extinção do usufruto |

Pagar 70% agora é adiar, não economizar. Valem para as duas guias com usufruto: a doação com reserva e
a instituição de usufruto. A doação sem reserva só existe em 100%, porque a redução é do usufruto.

## Nenhuma é a decisão

A apresentação vai ao cliente antes de ele escolher, e as duas bases estão certas. Por isso:

- a montagem da simulação não tem campo de percentual; fica só "Com reserva de usufruto";
- a calculadora apura e grava as duas bases em toda guia que tem a alternativa;
- a simulação aberta alterna a visualização ("Ver na base de 100% / 70%"), com o aviso de parcela
  diferida em 70%; trocar não grava nada;
- numa cadeia de atos, cada ato pode ser visto numa base, e o total soma cada um na sua;
- a lista de simulações mostra o total em 100%.

## Como grava

- A integral fica nas colunas de sempre de `itcd_simulacao_gia` e `itcd_simulacao_concessao`; a
  reduzida, nas sete colunas `*_alternativa` (`pct_base_alternativa`, `vlr_base_alternativa_*` e
  `vlr_imposto_alternativo_*`), que vêm todas juntas ou nenhuma.
- A reserva não tem guia própria: ela muda a base da guia da doação.
- A conta é feita na gravação, e não no gerador da apresentação: reapurar lá faria o número aprovado
  mudar quando o motor mudasse.
- A guia em 70% é achada pelo par doador → beneficiário, porque a repartição das quotas não depende da
  base. Não achar é defeito, e a gravação falha em vez de gravar a guia com uma base só.
- As duas bases entram no retrato: se uma não apura, a simulação não grava pela metade.

## Simulações antigas

As simulações gravadas antes das duas bases guardavam nas colunas de sempre a base que estava marcada
na tela. `pct_base_reserva` e `pct_base_instituicao` continuam no banco só para dizer em que base
estão essas colunas, e a coluna alternativa aceita 70 ou 100 para completar a outra.

Na leitura, a tela pede uma base e recebe a pedida ou, se ela não foi gravada, a que existe, com a
indicação de qual é: a linha mostra o número e marca "gravada só em 70%" em vez de um traço. Percentual
fora de 100 e 70 é erro, porque adivinhar a base poria o número na coluna errada.

## Doação anterior

A OSG não acompanha a doação anterior: a SEFAZ acumula ao emitir a guia. A coluna saiu do banco
(`itcd_simulacao_gia.vlr_doacao_anterior`) e da gravação; o motor mantém a capacidade sem ninguém na
tela que a preencha.

## Migrations

| Migration | O quê |
|---|---|
| `20260923180813` | `osg_apresentacao.tipo` aceita `sucessoria`; a gravação deixa de gravar a doação anterior |
| `20260923181406` | `drop` de `itcd_simulacao_gia.vlr_doacao_anterior` |
| `20260924131341` | as colunas `*_alternativa` nas duas tabelas de guia; a gravação lê a `base_alternativa` e aceita o payload sem ela |
| `20260924140346` | a alternativa aceita 70 ou 100 |

Em produção, a ordem importa: `180813`, `131341` e `140346`; depois o merge da `develop` na `main`; só
então a `181406`, porque a `main` ainda lê a coluna que ela apaga.
