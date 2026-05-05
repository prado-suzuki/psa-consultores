# PSA OSG, Convenções de Organização

Este documento define como nomear pastas, arquivos e como navegar a estrutura da OSG. A regra é simples: **busca em menos de 30 segundos por qualquer documento**.

## Princípios

1. Cliente é a unidade primária, não o código de projeto. Ninguém lembra códigos de cor.
2. Modelos centralizados em `00_Modelos_e_Bibliotecas`. Quem precisa de um Contrato Social padrão sempre sabe onde buscar.
3. Pastas numeradas (00, 01, 02...) controlam a ordem de exibição no Windows.
4. Cada cliente ativo tem o mesmo esqueleto de subpastas. Treinou uma vez, sabe trabalhar com qualquer um.

## Convenção de nomes de pasta

### Cliente
Formato: `[Nome_Fantasia]_[CNPJ_Curto]`
Exemplo: `Fazenda_SaoJoao_12345678`

Use underline em vez de espaço. Mantém compatibilidade entre Windows, Mac, Drive e SharePoint.

### Projeto
Formato: `[AAAA-MM]_[TipoProjeto]_[Codigo]`
Exemplo: `2026-04_Reestruturacao_OSG-127`

A data no início garante ordenação cronológica natural. Tipos de projeto sugeridos:
- `Reestruturacao`
- `Sucessorio`
- `Constituicao`
- `Rural`
- `DiagnosticoTributario`
- `MA` (cisão, fusão, incorporação)

## Convenção de nomes de arquivo

Formato: `[AAAA-MM-DD]_[Cliente]_[TipoDoc]_v[N].extensao`

Exemplos:
- `2026-04-15_FazendaSaoJoao_DP_v1.docx`
- `2026-04-22_FazendaSaoJoao_ContratoSocial_v3.docx`
- `2026-04-25_FazendaSaoJoao_Apresentacao_DP_v2.pptx`
- `2026-04-27_FazendaSaoJoao_ITCD_calculo_v1.xlsx`

Tipos de documento padronizados:
- `DP` (Diagnóstico Patrimonial)
- `WPSocios`
- `ContratoSocial`
- `AlteracaoContratual`
- `Ata`
- `Apresentacao_DP` / `Apresentacao_Final`
- `ITCD_calculo`
- `DiagTributario`
- `InstrumentoAgrario_Parceria` / `_Comodato` / `_Arrendamento`
- `Termo_Encerramento_Safra`

## Versionamento

- `v1`, `v2`, `v3`... para versões em construção
- `vFINAL` apenas quando liberado ao cliente
- Nunca sobrescrever o vFINAL. Se houver alteração, vira `v[N+1]`

## Esqueleto de cliente ativo

Quando um novo cliente entra, copie a pasta `_KIT_NOVO_CLIENTE` para `01_Clientes_Ativos/`, renomeie e siga o esqueleto:

```
[Cliente]/
├── 00_Dossie_Cliente/
│   ├── CNPJ_Cartao.pdf
│   ├── Contatos.md
│   └── Historico_Atendimento.md
├── 01_Projetos/
│   └── [AAAA-MM]_[Tipo]_[Codigo]/
│       ├── 01_Documentos_Recebidos/
│       ├── 02_Diagnostico_Patrimonial/
│       ├── 03_WP_Socios/
│       ├── 04_Minutas_e_Documentos/
│       ├── 05_Apresentacoes/
│       └── 06_Final_Liberado_Cliente/
└── 02_Comunicacao_Cliente/
    ├── Atas_Reuniao/
    └── Emails_Importantes/
```

## Quando arquivar

Projeto concluído e validado pelo cliente, mover a pasta inteira do cliente (ou do projeto, se o cliente continua ativo) para `05_Arquivo_Concluidos/[ANO]/`.

Regra prática: 90 dias após a entrega final sem novas demandas, arquiva.

## O que NÃO fazer

- Salvar documento na pasta pessoal ou no desktop. Mata a estrutura.
- Criar pasta com nome em maiúsculas misturadas (`PSA OSG` no meio de pastas com underline).
- Nomear como "FINAL_FINAL_DEFINITIVO_v3.docx". Use a convenção.
- Pular o `_KIT_NOVO_CLIENTE` na entrada de novos clientes. Vira bagunça em 6 meses.

## Sincronização

Se a pasta estiver em OneDrive, Google Drive ou SharePoint, usar a mesma estrutura. Sem variação por canal.

---

Versão 1.0, abril 2026
Manutenção: Patrícia Melo, Coordenação Transformação Digital PSA
