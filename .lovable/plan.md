

## Refatoracao: Dashboard Dev -> Hub de Trabalho

### Arquivos alterados

**1. `src/pages/equipe/dev/GerenciarDados.tsx`** — Adicionar bloco Debug ao final
- Mover todo o bloco de Debug (estado `testLoading`, `testResult`, `copied`, funcoes `testApiHealth`, `copyJwt`, e o JSX do Card amarelo) para o final desta pagina, abaixo da secao de PERDCOMPs/Template CSV.
- Importar `Zap`, `Copy`, `CheckCircle`, `AlertCircle` do lucide e `getApiUrl`.

**2. `src/pages/equipe/dev/DevDashboard.tsx`** — Reescrever completamente
- Remover: bloco Debug, MetricCards de estatisticas, Quick Access Cards antigos, Tools List do banco.
- Remover queries `tools` e `tool_access`, e estados de debug.

Nova estrutura do Dashboard:

```
Secao 1: "Sessoes em Andamento"
- Card de alerta com fundo suave (bg-amber-50 border-amber-200)
- Dados mockados: 2 items exemplo
  - { ferramenta: "DIFAL Inteligente", lastModified: "08/03/2026", desc: "3 auditorias pendentes" }
  - { ferramenta: "EFD Contribuicoes", lastModified: "07/03/2026", desc: "Analise CNPJ 12.345..." }
- Cada item: icone Clock, nome ferramenta, data, botao "Retomar trabalho"

Secao 2: "Hub de Ferramentas"
- Barra de pesquisa (Input com icone Search) para filtrar por nome
- Grid 3 colunas (md:grid-cols-3) com cards para cada ferramenta:

| Ferramenta | Rota | SOP URL |
|---|---|---|
| Consulta de XMLs | /equipe/dev/consulta-xmls | .../consulta-xmls/ |
| DIFAL Inteligente | /equipe/dev/auditoria-fiscal | .../difal-inteligente/ |
| EFD Contribuicoes | /equipe/dev/consulta-efd | .../efd-contribuicoes/ |
| EFD ICMS | /equipe/dev/consulta-efd-icms | null |
| ECD | /equipe/dev/consulta-ecd | null |
| ECF | /equipe/dev/consulta-ecf | null |
| Calculadora IBS/CBS | /equipe/dev/calculadora-ibs-cbs | null |
| Controle PERDCOMP | /equipe/dev/controle-perdcomp | null |
| Controle Balancetes | /equipe/dev/controle-balancetes | null |
| Gerenciar dados | /equipe/dev/gerenciar-dados | null |

- Cada card tera: icone colorido, nome, descricao curta, botao "Acessar Ferramenta", e link "Ler Manual (SOP)" (verde com ExternalLink icon) quando houver URL de manual.
```

### Resumo de arquivos
1. `DevDashboard.tsx` — reescrita completa (Hub + Sessoes mockadas)
2. `GerenciarDados.tsx` — adicionar bloco Debug no final

Sem alteracoes de banco de dados.

