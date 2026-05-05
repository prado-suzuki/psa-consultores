# Kit de Novo Cliente, OSG

Este é o esqueleto-padrão para entrada de qualquer cliente novo na OSG.

## Como usar

1. Copie esta pasta inteira (`_KIT_NOVO_CLIENTE`) para `01_Clientes_Ativos/`
2. Renomeie a cópia seguindo a convenção: `[Nome_Fantasia]_[CNPJ_Curto]`, exemplo `Fazenda_SaoJoao_12345678`
3. Apague este arquivo `LEIA-ME.md` da nova pasta (ele só serve para o template)
4. Dentro de `01_Projetos/`, renomeie a subpasta-modelo seguindo a convenção `[AAAA-MM]_[TipoProjeto]_[Codigo]`
5. Preencha o `00_Dossie_Cliente/Contatos.md` com os contatos-chave

## Estrutura

- `00_Dossie_Cliente/`, dados gerais que não pertencem a um projeto específico (CNPJ, contatos, histórico)
- `01_Projetos/`, um subdiretório por projeto contratado
- `02_Comunicacao_Cliente/`, atas de reunião e e-mails de marco

## Subpastas dentro de cada projeto

| Pasta | O que vai aqui |
|---|---|
| 01_Documentos_Recebidos | Tudo que o cliente envia, em estado bruto |
| 02_Diagnostico_Patrimonial | DP em construção e versões |
| 03_WP_Socios | Qualificação, organograma, riscos sucessórios |
| 04_Minutas_e_Documentos | Contratos, atas, instrumentos agrários, etc |
| 05_Apresentacoes | pptx inicial, de execução e final |
| 06_Final_Liberado_Cliente | Cópia limpa do que foi efetivamente entregue |

A pasta 06 é a única "intocável", o que está nela é o que foi liberado, ponto.
