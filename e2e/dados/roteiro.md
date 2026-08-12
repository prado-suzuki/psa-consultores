# Roteiro do teste e2e de geração de contrato — Grupo MMS

Dados: `e2e/dados/dossie.json`. Estado da execução: `e2e/dados/estado.json`.

Um passo = **um formulário salvo**. O critério de sucesso é sempre **o registro aparecer na
lista**, nunca o toast. Ao fim de cada passo, gravar o resultado em `estado.json` (status, id
gerado, achados). Se a sessão cair ou o contexto compactar, retomar lendo o `estado.json`, não
a conversa.

## Ambiente

- App: Vite em `http://localhost:8080` (já rodando).
- `currentAmbiente` resolve para `dev` em localhost (`src/config/api.ts:45`), então o cliente
  nasce com `ambiente='dev'` e não aparece em produção. **Não executar por URL de produção.**
- Login: `bi@psaconsultores.com.br` (credencial fora do repo, passada na sessão).

## Passos

| # | Passo | Onde | Verificação |
|---|---|---|---|
| P00 | Login | `/equipe` → área OSG → email/senha | cai numa rota `/equipe/osg/*` autenticada |
| P01 | Criar cliente `[TESTE E2E] Grupo MMS` | `/equipe/osg/projetos/clientes` | cliente na lista; anotar `cliente_id` |
| P02 | Selecionar o cliente na barra da área Work | qualquer `/equipe/osg/work/*` | páginas Work param de pedir cliente |
| P03 | Pessoa PF-01 José Eduardo (fundador) | `/equipe/osg/work/qualificacao-das-partes` | linha na lista de PF |
| P04 | Pessoa PF-02 Maria Auxiliadora (fundadora) + cônjuge PF-01 | idem | vínculo de cônjuge visível |
| P05 | Voltar em PF-01 e vincular cônjuge PF-02 | idem | o vínculo existe nos dois sentidos |
| P06 | Pessoa PF-03 Camila (+ cônjuge, filiação, parentesco) | idem | filiação aponta para PF-01/PF-02 |
| P07 | Pessoa PF-04 Eduardo Mirandola (genro) | idem | parentesco "Genro/Nora", natureza "Afim" |
| P08 | Pessoa PF-05 Bruna (solteira) | idem | sem campo de regime de bens |
| P09 | Pessoa PJ-01 MMS Agro (tipo PR) + administração | idem | administradores apontam para PF-01/PF-02 |
| P10 | Pessoa PJ-02 MMS Participações (tipo CN) + administração | idem | idem |
| P11 | Cartório 1º Ofício de Lucas do Rio Verde | `CartorioSelect` no modal de matrícula | aparece como opção selecionável |
| P12 | Bem BS-08 Fazenda Tarumã (IR) | `/equipe/osg/work/diagnostico-patrimonial` | linha na lista de bens |
| P13 | Matrícula 9.617 no BS-08 | modal do bem → Matrículas | matrícula listada dentro do bem |
| P14 | Bem BS-09 Terreno Urbano (IB) | idem | campos de endereço/área construída aparecem |
| P15 | Matrícula 25.365 no BS-09 | idem | área em m², não em ha |
| P16 | Bem BS-01 Lote 05 / Ipê Amarelo (IR) | idem | — |
| P17 | Matrícula 2.424 no BS-01 | idem | — |
| P18 | Bem BS-02 Fazenda Capuaba (IR) | idem | — |
| P19 | Matrículas 2.623 **e** 2.625 no BS-02 | idem | **duas** matrículas sob um bem, mesmo CCIR |
| P20 | Bem BS-03 Fazenda Cristalina (IR) | idem | — |
| P21 | Matrículas 2.627 **e** 2.628 no BS-03 | idem | idem P19 |
| P22 | Bem BS-51 Quotas Cooperbio (PS) | idem | `participa_estruturacao` desligado |
| P23 | Quadro societário MMS Agro | `/equipe/osg/work/quadro-societario` | MMS Participações com 4.234.822 quotas |
| P24 | Quadro societário MMS Participações | idem | Bruna e Camila com 4.770.898 cada |
| P25 | Gerar o contrato | `/equipe/osg/work/gerar-documento` | documento gerado, `.docx` baixado |
| P26 | Conferir o `.docx` contra os gabaritos | fora do browser | relatório de campos errados/vazios |
| P27 | Limpeza | — | cliente e dependentes removidos |

## Pontos de atenção já conhecidos

- **P11 antes de P13.** O campo Cartório é um select alimentado pela tabela `cartorio`. Se o
  cartório de Lucas do Rio Verde não existir, cadastrá-lo é parte do teste.
- **P05 existe porque a ordem importa.** O select de cônjuge só lista PF já cadastradas, então
  o vínculo do primeiro fundador só pode ser fechado depois de criar o segundo.
- **P19 e P21 são o caso interessante.** Duas matrículas sob um bem, compartilhando o mesmo
  CCIR. Se o app recusar CCIR repetido ou tratá-lo como único por matrícula, aparece aqui.
- **P22 é um controle negativo.** As quotas da cooperativa não participam da estruturação e o
  contrato gerado **não** deve citá-las.
- **Vocabulário divergente.** O Diagnóstico Patrimonial diz "Próprio" onde o select do app só
  oferece Exploração Direta / Arrendamento / Parceria / Comodato / Posse / Outro.
- **Gabaritos de conferência.** `descricao_psa_completa` de cada matrícula é o texto esperado
  para o bloco de imóvel. As 10 entradas de `_divergencias` no dossiê listam onde os próprios
  documentos discordam, para não confundir divergência de origem com bug do gerador.

## Aberto

- **Qual contrato gerar em P25** e se o modelo já existe na Biblioteca de Modelos. A ser
  resolvido olhando a Biblioteca com o app aberto.
