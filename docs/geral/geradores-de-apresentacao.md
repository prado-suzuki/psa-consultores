# Os dois geradores de apresentação: o que se compartilha e o que se repete

**Para:** Tech Lead · **De:** Alexandre · **21/09/2026**

São dois geradores de `.pptx`, tratados pela migração como um só. Há **três camadas** e só
uma é geração de slide — o que separa **reusar** (um código, chamado pelos dois) de
**replicar** (mesmo desenho, código próprio). Importar o xlsx e cadastrar o papel de
trabalho são ingestão, não geração, e ficam fora daqui.

---

## 1. As três camadas

| Camada | Tributário | OSG | Veredito |
|---|---|---|---|
| Origem do dado | xlsx importado, congelado | cadastro vivo | fora de escopo |
| Conteúdo do deck | 5 slides, número fixo | 3 a 24, conforme o cadastro | **replicar** |
| Montagem do XML | preenche célula de molde fixo | duplica slide, posiciona em EMU | de cada um |
| Primitivas OOXML | `_shared/ooxml/` | `_shared/ooxml/` | **já reusado** |
| Publicação do arquivo | versiona, grava, devolve URL | **não existe** | **reusar** |

Na hora de gerar, **os dois leem tabela**; o xlsx é camada de cima. O que diverge é o volume:
~1.499 linhas por revisão tributária, contra **7 bens** no maior cliente da OSG (21/09).

## 2. Reusar não é replicar

**Reusar** cabe onde a regra é idêntica: as primitivas de OOXML, que os dois já importam, e a
casca de publicação — validar, versionar, subir, registrar, assinar URL. São ~90 das 646
linhas do tributário, presas dentro do `serve` dele.

**Replicar** é o caso do conteúdo: os moldes diferem em estrutura, e unificar significaria
reescrever o do tributário. Repete-se o arranjo — conteúdo puro, montagem à parte, gabarito.

## Pendências

| Pendência | Dono |
|---|---|
| Extrair a casca exige editar `gerar-slides-tributarios` | decisão do Tech Lead |
| `osg_apresentacao` e bucket de saída: é migration | Alexandre |

O código está em `develop` local, sem push. A função foi publicada só no sandbox.
