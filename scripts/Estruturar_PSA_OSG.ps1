# =============================================================================
#  PSA Digital, Estruturação da pasta de execução do projeto OSG
#  Versão 2, calibrada com base no padrão real do PSA_Fiscal
#  ----------------------------------------------------------------------------
#  Cria a estrutura padronizada de cliente interno em:
#    G:\Drives compartilhados\PSA Digital\03_Clientes_Internos\PSA_OSG
#
#  Mudanças desta versão:
#    1. Remove a divisão "Projetos vs Processos" do Fiscal (Projetos virava cemitério)
#    2. Remove o binário "Como Era / Como Ficou" (criava pastas vazias por meses)
#    3. Preserva os 4 padrões que funcionam: triplo de mapeamento (MAPA + Tango + Fluxograma),
#       dupla SOP (docx + pptx), tripla de manual (md + html + pdf), área de trabalho com reuniões datadas
#    4. Separa em 3 dimensões: Mapeamento (descoberta), Ferramentas (construção), Sprints (tempo)
#
#  Como rodar:
#    1. Abra o PowerShell na sua máquina
#    2. Vá até a pasta deste script:
#         cd "C:\Users\Patricia Melo\Repos\psa-consultores\scripts"
#    3. Libere a execução nesta janela:
#         Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#    4. Rode:
#         .\Estruturar_PSA_OSG.ps1
# =============================================================================

$BASE = "G:\Drives compartilhados\PSA Digital\03_Clientes_Internos\PSA_OSG"
$LOCAL = Split-Path $PSScriptRoot -Parent   # raiz do repo (este script vive em \scripts)

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  PSA Digital, Estruturando pasta do projeto OSG (v2)" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Destino: $BASE" -ForegroundColor Yellow
Write-Host ""

# ----------------------------------------------------------------------------
# Estrutura de pastas
# ----------------------------------------------------------------------------
$pastas = @(
    # 00 Briefing
    "00_Briefing",
    "00_Briefing\Documentos_Originais_OSG",
    "00_Briefing\Identidade_Visual_PSA",

    # 01 Mapeamento de Processos (herda os 5 padrões que funcionam no Fiscal)
    "01_Mapeamento_Processos",
    "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\Mapeamento_MAPA",
    "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\Mapeamento_Tango",
    "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\Fluxogramas",
    "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\Documentos_Exemplo",
    "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\SOP",
    "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\Notas",

    "01_Mapeamento_Processos\01_DP_Diagnostico_Patrimonial",
    "01_Mapeamento_Processos\02_WP_Socios",
    "01_Mapeamento_Processos\03_Atas_e_Alteracoes_Contratuais",
    "01_Mapeamento_Processos\04_Contrato_Estatuto_Social",
    "01_Mapeamento_Processos\05_Cisao_Fusao_Incorporacao",
    "01_Mapeamento_Processos\06_Instrumentos_Agrarios",
    "01_Mapeamento_Processos\07_ITCD_e_Sucessorios",
    "01_Mapeamento_Processos\08_Diagnostico_Tributario",
    "01_Mapeamento_Processos\09_Apresentacoes_de_Projeto",

    # 02 Diagnóstico Estratégico (a fase atual)
    "02_Diagnostico_Estrategico\Analise_Estrategica",
    "02_Diagnostico_Estrategico\Forms\Configuracao",
    "02_Diagnostico_Estrategico\Forms\Respostas_Socios",
    "02_Diagnostico_Estrategico\Forms\Respostas_Seniores",
    "02_Diagnostico_Estrategico\Forms\Respostas_Assistentes",
    "02_Diagnostico_Estrategico\Entrevistas_1on1\Fernando",
    "02_Diagnostico_Estrategico\Entrevistas_1on1\Cuba",
    "02_Diagnostico_Estrategico\Entrevistas_1on1\Seniores",
    "02_Diagnostico_Estrategico\Entrevistas_1on1\Assistentes",
    "02_Diagnostico_Estrategico\Relatorio_Final",

    # 03 Roadmap e Backlog
    "03_Roadmap_e_Backlog",
    "03_Roadmap_e_Backlog\Matriz_Impacto_Esforco",
    "03_Roadmap_e_Backlog\Roadmap_Visual",
    "03_Roadmap_e_Backlog\_Backlog_Futuras_Ferramentas",

    # 04 Ferramentas (espelha o que dá certo no COMO FICOU do Fiscal)
    "04_Ferramentas",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\01_Especificacao",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\02_Fluxograma_TOBE",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\03_Build",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\04_Validacao_Equipe_OSG",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\05_Manual",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\06_Entregas",
    "04_Ferramentas\_TEMPLATE_FERRAMENTA\07_Area_Trabalho",

    # 05 Sprints (dimensão temporal, separada das ferramentas)
    "05_Sprints",
    "05_Sprints\_TEMPLATE_SPRINT\01_Planejamento",
    "05_Sprints\_TEMPLATE_SPRINT\02_Execucao",
    "05_Sprints\_TEMPLATE_SPRINT\03_Entregas",
    "05_Sprints\_TEMPLATE_SPRINT\04_Retrospectiva",
    "05_Sprints\_TEMPLATE_SPRINT\05_Demo_Socios",

    # 06 Stakeholders e comunicação
    "06_Stakeholders_e_Comunicacao\Apresentacoes_Socios",
    "06_Stakeholders_e_Comunicacao\Reunioes_Status",
    "06_Stakeholders_e_Comunicacao\Comunicacao_Equipe_OSG",

    # 07 Indicadores e ROI
    "07_Indicadores_ROI\Baseline_Pre_Projeto",
    "07_Indicadores_ROI\Medicoes_Wave1",
    "07_Indicadores_ROI\Medicoes_Wave2",
    "07_Indicadores_ROI\Relatorios_Mensais",

    # 08 Handover
    "08_Handover\Manuais_Operacionais",
    "08_Handover\Material_Treinamento",
    "08_Handover\Documentacao_Tecnica",

    # Scratch
    "_Scratch"
)

# ----------------------------------------------------------------------------
Write-Host "[1/4] Criando pastas..." -ForegroundColor Green
foreach ($p in $pastas) {
    $caminho = Join-Path $BASE $p
    if (-not (Test-Path $caminho)) {
        New-Item -ItemType Directory -Path $caminho -Force | Out-Null
        Write-Host "    + $p" -ForegroundColor DarkGray
    }
}

# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Criando LEIA-MEs e arquivos de apoio..." -ForegroundColor Green

# README raiz
$readmeRaiz = @"
# PSA OSG, Execução do Projeto de Transformação Digital

Pasta de cliente interno da PSA Digital. Aqui mora a execução do projeto tendo a OSG (Organização Societária e Governança) como cliente interno.

## Lógica das pastas (3 dimensões separadas)

A estrutura foi desenhada com base no que funciona no PSA_Fiscal e no que não funciona.

Dimensão 1, conhecimento (descoberta de processos):
- 00_Briefing, contexto e setup do cliente interno
- 01_Mapeamento_Processos, AS-IS dos blocos de trabalho da OSG
- 02_Diagnostico_Estrategico, forms, entrevistas, análise estratégica

Dimensão 2, produto (construção de ferramentas):
- 03_Roadmap_e_Backlog, priorização e backlog futuro
- 04_Ferramentas, cada ferramenta como produto autocontido

Dimensão 3, tempo (execução em ciclos):
- 05_Sprints, ciclos de 2 semanas
- 06_Stakeholders_e_Comunicacao, apresentações, atas, decisões
- 07_Indicadores_ROI, baseline e medições
- 08_Handover, entrega final pra OSG sustentar sozinha

Mais:
- _Scratch, rascunho livre da equipe da PSA Digital

## Por que essa estrutura é diferente da PSA_Fiscal

Removida a divisão Projetos vs Processos (no Fiscal, Projetos virou pasta morta).
Removido o binário Como Era / Como Ficou (criava 6 subpastas vazias por meses).
Preservados os 4 padrões que funcionam no Fiscal:
1. Triplo de mapeamento, MAPA + Tango + Fluxograma
2. Dupla SOP, docx + pptx
3. Tripla de manual, md + html + pdf
4. Área de trabalho com reuniões datadas (onde a iteração com cliente acontece)

## Convenção de nomes

Arquivos:    AAAA-MM-DD_Tema_TipoDoc_v[N].extensao
Sprints:     S[NN]_AAAA-MM_Tema (ex: S01_2026-04_Diagnostico_Inicial)
Ferramentas: F[NN]_NomeCurto (ex: F01_DP_Inteligente)
Reuniões:    AAAA-MM-DD_Tipo_Reuniao_OSG.ext (ex: 2026-05-12_Validacao_DP_OSG.docx)

## Regras de decisão (onde salvar quando há dúvida)

Cinco situações em que duas pastas podem disputar o mesmo conteúdo. Estas regras evitam duplicação e bagunça depois.

### Regra 1, achados de entrevista versus notas de processo

Áudio, transcrição e ata de uma entrevista 1:1 ficam em 02_Diagnostico_Estrategico/Entrevistas_1on1/[Pessoa]. Quando você destila um achado que se aplica a um bloco específico (ex: "Fernando relatou que DP leva 2 semanas"), copia esse trecho como nota em 01_Mapeamento_Processos/[bloco]/Notas. Resumo: 02 é a fonte primária, 01 é a destilação por bloco.

### Regra 2, fluxograma AS-IS versus TO-BE

AS-IS sempre em 01_Mapeamento_Processos/[bloco]/Fluxogramas.
TO-BE sempre em 04_Ferramentas/F[NN]/02_Fluxograma_TOBE.

### Regra 3, demo e apresentação aos sócios

Demo de fim de sprint vai SEMPRE em 05_Sprints/SX/05_Demo_Socios.
Se houver desdobramento técnico por ferramenta, copia referência em 04_Ferramentas/F[NN]/07_Area_Trabalho.
Apresentação pontual com sócios FORA de fim de sprint (pitch de roadmap, ajuste estratégico) vai em 06_Stakeholders_e_Comunicacao/Apresentacoes_Socios.
Reunião técnica de validação SEM sócios vai em 04/F[NN]/07.

### Regra 4, manual em 04 versus manual em 08_Handover

04_Ferramentas/F[NN]/05_Manual é a versão viva durante a construção (md + html + pdf por ferramenta).
08_Handover/Manuais_Operacionais é o pacote final consolidado, entregue à OSG no encerramento do projeto. Não é cópia, é versão final agregada.

### Regra 5, indicadores específicos versus consolidados

Métrica de impacto de UMA ferramenta vive em 04_Ferramentas/F[NN]/06_Entregas (ou em subpasta dedicada se a equipe preferir).
07_Indicadores_ROI da raiz é o consolidado com todas as métricas agregadas, organizado em baseline, Wave 1, Wave 2 e relatórios mensais que vão pros sócios.

## Onde salvar respostas dos formulários

A planilha consolidada (gerada pelo .gs com 3 abas) vive em 02_Diagnostico_Estrategico/Forms.
As 3 subpastas Respostas_Socios, Respostas_Seniores e Respostas_Assistentes guardam exports/snapshots, análises individuais por nível e observações qualitativas.
O cruzamento das 3 visões (convergência, divergência, dores silenciosas) vai em 02_Diagnostico_Estrategico/Relatorio_Final.

## Status atual

Sprint 01, Diagnóstico Estratégico em andamento. Forms enviados (Sócios prazo 29/04, Seniores e Assistentes 7 dias). Entrevistas 1:1 a marcar.

## Manutenção

Patrícia Melo, Coordenação Transformação Digital PSA
"@
Set-Content -Path (Join-Path $BASE "LEIA-ME.md") -Value $readmeRaiz -Encoding UTF8

# README do template de processo
$readmeProcesso = @"
# Template de Processo para Mapeamento

Use este esqueleto pra mapear cada bloco de trabalho da OSG. As 6 subpastas refletem os 5 padrões que funcionam no PSA_Fiscal mais um espaço para notas de campo.

## Subpastas

- Mapeamento_MAPA, saída da metodologia D.A.T.A.S. (.txt e relacionados)
- Mapeamento_Tango, tutoriais em PDF do Tango.us
- Fluxogramas, diagramas em PNG ou drawio do processo AS-IS
- Documentos_Exemplo, arquivos reais (xlsx, docx, txt, xml) que circulam no processo
- SOP, par de Standard Operating Procedure (docx procedural + pptx visual)
- Notas, anotações de campo, transcrições de entrevista, observações

## Como usar

Quando entrar num bloco de trabalho novo (DP, WP Sócios, etc), copie esta pasta-modelo para dentro do número do bloco e comece a alimentar.

Não force conteúdo nas 6 subpastas. Se um bloco não tem fluxograma ainda, deixa a pasta vazia, sem inventar arquivo de placeholder.
"@
Set-Content -Path (Join-Path $BASE "01_Mapeamento_Processos\_TEMPLATE_PROCESSO\LEIA-ME.md") -Value $readmeProcesso -Encoding UTF8

# README do template de ferramenta
$readmeFerramenta = @"
# Template de Ferramenta

Cada ferramenta é um produto autocontido. As 7 subpastas espelham o ciclo que funciona em P5 PERDCOMP e P6 Dashboards no PSA_Fiscal.

## Como usar

Copie esta pasta inteira (`_TEMPLATE_FERRAMENTA`) e renomeie no formato:
   F[NN]_NomeCurto         ex: F01_DP_Inteligente

## Subpastas

- 01_Especificacao, visão geral, requisitos, decisões de design
- 02_Fluxograma_TOBE, como o processo fica depois da ferramenta
- 03_Build, arquivos em construção (códigos, planilhas, modelos)
- 04_Validacao_Equipe_OSG, artefatos formais de validação (plano de testes, lista consolidada de bugs/ajustes, documento de aprovação assinado)
- 05_Manual, trio de manual final (md + html + pdf)
- 06_Entregas, versões liberadas, controle de release
- 07_Area_Trabalho, reuniões datadas, atas, anotações, iteração viva com a equipe-cliente

## Onde salvar reuniões (regra da equipe)

A equipe faz muitas reuniões de validação. Para não criar bagunça, use esta regra:

1. Reunião sobre ESTA ferramenta (validação, ajuste, redesign):
   -> 07_Area_Trabalho/AAAA-MM-DD_Validacao_Tema/
   Dentro da subpasta da reunião:
     - Ata_Reuniao.gdoc (ou .docx)
     - Anotacoes_[Nome].md
     - Apontamentos_Equipe_OSG.md
     - Materiais_Compartilhados/

2. Aprovação formal de validação (fim de ciclo):
   -> 04_Validacao_Equipe_OSG/
   Aqui só entram artefatos formais que fecham a validação. Não é onde se joga ata.

3. Reunião sobre o projeto OSG no geral, não sobre uma ferramenta:
   -> ../../06_Stakeholders_e_Comunicacao/Reunioes_Status/AAAA-MM-DD_Status_Sprint_NN/

Resumo: 07 é grossa, viva, cronológica. 04 é fina, formal, de fechamento.

## Lista de ferramentas previstas no roadmap

- F01_DP_Inteligente
- F02_Biblioteca_Minutas
- F03_Calculadora_ITCD
- F04_Dashboard_OSG
- F05_Integracao_OSG_Fiscal
- F06_Template_Diag_Tributario

Apague este LEIA-ME após copiar e renomear.
"@
Set-Content -Path (Join-Path $BASE "04_Ferramentas\_TEMPLATE_FERRAMENTA\LEIA-ME.md") -Value $readmeFerramenta -Encoding UTF8

# README do template de sprint
$readmeSprint = @"
# Template de Sprint

Copie esta pasta e renomeie:
   S[NN]_AAAA-MM_Tema      ex: S03_2026-05_Wave1_Construcao

## Subpastas

- 01_Planejamento, objetivos do sprint, backlog selecionado, capacidade
- 02_Execucao, trabalho do sprint, notas diárias
- 03_Entregas, o que ficou pronto
- 04_Retrospectiva, o que funcionou, o que melhorar, ações próximo sprint
- 05_Demo_Socios, deck e material da apresentação aos sócios

Apague este LEIA-ME após copiar e renomear.
"@
Set-Content -Path (Join-Path $BASE "05_Sprints\_TEMPLATE_SPRINT\LEIA-ME.md") -Value $readmeSprint -Encoding UTF8

# Stakeholders.md
$stakeholders = @"
# Stakeholders, Projeto OSG

## Sócios (decisão e patrocínio)
- Fernando, Sócio
- Cuba, Sócio

## Seniores (operação, 6 consultores)
- (preencher nomes)

## Assistentes (3 níveis)
- Assistente A, (nome)
- Assistente B, (nome)
- Assistente C, (nome)

## Áreas com interface
- PSA Fiscal, Felipe e Ricardo
- PSA Consultoria, Washington
- Advogados externos

## Time PSA Digital
- Patrícia Melo, Coordenação
- (demais membros)
"@
Set-Content -Path (Join-Path $BASE "00_Briefing\Stakeholders.md") -Value $stakeholders -Encoding UTF8

# Contexto_OSG.md
$contexto = @"
# Contexto da OSG

A OSG (Organização Societária e Governança) é uma das áreas da holding PSA Prado Suzuki. Entrega reestruturação societária, governança corporativa, planejamento sucessório, holdings patrimoniais e instrumentos da atividade rural.

## Características da área
- 9 pessoas no total (2 sócios, 6 seniores, 3 assistentes)
- Capacidade mensal: 1.440 horas úteis
- 40 a 55 por cento do tempo em trabalho manual e coleta (estimativa a validar)
- 7 de 10 blocos de trabalho com alto potencial de padronização

## Por que entrou no roadmap de Transformação Digital
Após o ciclo Fiscal (21 ferramentas, 8 sprints, 92 por cento aderência), a OSG é a próxima área da holding com maior potencial de impacto.

## Janela de retorno estimada
- 90 a 140 horas/mês recuperadas
- R$ 86k a R$ 201k/ano em premissa conservadora
"@
Set-Content -Path (Join-Path $BASE "00_Briefing\Contexto_OSG.md") -Value $contexto -Encoding UTF8

# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/4] Copiando arquivos do projeto para a estrutura..." -ForegroundColor Green

$arquivos = @(
    @{
        Origem = "docs\osg\apresentacoes\Analise_Estrategica_PSA_OSG.html"
        Destino = "02_Diagnostico_Estrategico\Analise_Estrategica\2026-04-27_OSG_Analise_Estrategica_v1.html"
    },
    @{
        Origem = "scripts\osg\Gerar_Forms_PSA_OSG.gs"
        Destino = "02_Diagnostico_Estrategico\Forms\Configuracao\Gerar_Forms_PSA_OSG.gs"
    },
    @{
        Origem = "docs\osg\apresentacoes\Guia_Estrutura_Projeto_OSG.html"
        Destino = "LEIA-ME_Estrutura_Visual.html"
    }
)

foreach ($a in $arquivos) {
    $orig = Join-Path $LOCAL $a.Origem
    $dest = Join-Path $BASE $a.Destino
    if (Test-Path $orig) {
        Copy-Item -Path $orig -Destination $dest -Force
        Write-Host "    + $($a.Origem)  ->  $($a.Destino)" -ForegroundColor DarkGray
    } else {
        Write-Host "    ! Arquivo nao encontrado: $orig" -ForegroundColor Yellow
    }
}

# ----------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/4] Concluido." -ForegroundColor Green
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
$totalPastas = (Get-ChildItem -Path $BASE -Recurse -Directory | Measure-Object).Count
$totalArquivos = (Get-ChildItem -Path $BASE -Recurse -File | Measure-Object).Count
Write-Host "  $totalPastas pastas e $totalArquivos arquivos criados em:" -ForegroundColor Cyan
Write-Host "  $BASE" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "  1. Abrir LEIA-ME.md na raiz e revisar a logica das 3 dimensoes"
Write-Host "  2. Compartilhar com a equipe (printar essa visao na proxima reuniao)"
Write-Host "  3. Quando comecar Sprint 01, copiar _TEMPLATE_SPRINT, renomear"
Write-Host "  4. Quando abrir uma ferramenta, copiar _TEMPLATE_FERRAMENTA"
Write-Host "  5. Para cada bloco da OSG, copiar _TEMPLATE_PROCESSO em 01_Mapeamento"
Write-Host ""
