

## Plano: Melhorar visual do campo OS e reorganizar layout

### 1. Campo "Ordem de Serviço" — novo visual (draft mode, ~linha 3762-3773)

Substituir o Badge "Auto" + texto "Gerada automaticamente" por um `Input` desabilitado com fundo suave (`bg-blue-50 border-blue-200`), exibindo o número real (`draftContract.ordem_servico`) ou "Gerando..." se vazio.

### 2. Reorganizar campos — modo criação (draft, ~linhas 3761-3973)

Nova ordem dentro do grid `grid-cols-2`:

| Linha | Coluna 1 | Coluna 2 |
|---|---|---|
| 1 | Ordem de Serviço (readonly) | Data de Emissão |
| 2 | Data Início | Data Fim |
| 3 | Tipo de Produto/Segmento | Situação do Projeto |
| 4 | Valor do Projeto (R$) | *(vazio)* |
| 5 | Reembolso por KM (R$) | Reembolso Refeição (R$) |

Após o grid (full-width):
- **Empresa** (mover de dentro do bloco Serviço Contratado para campo separado acima)
- **Serviço Contratado**
- **Observações** (mover para o final, depois de Distribuição de Receita)

Mover **Tipo de Produto/Segmento** do bloco separado (`border-dashed`, ~3952-3973) para dentro do grid principal na linha 3.

### 3. Reorganizar campos — modo edição (~linhas 3380-3530)

Mesma ordem do draft:
1. OS (disabled) | Data Emissão
2. Data Início | Data Fim
3. Tipo de Produto/Segmento | Situação do Projeto
4. Valor do Projeto | *(vazio)*
5. Reembolso KM | Reembolso Refeição
6. Empresa
7. Serviço Contratado
8. Observações (mover para o final)

### 4. Reorganizar campos — modo leitura (~linhas 3291-3370)

Reordenar os `FieldPair` na mesma sequência:
1. OS, Data Emissão, Data Início, Data Fim
2. Tipo de Produto/Segmento, Situação do Projeto
3. Valor do Projeto
4. Reembolso KM, Reembolso Refeição
5. Empresa (exibir nome do cluster do serviço selecionado)
6. Serviço Contratado
7. Observações (por último)

### Arquivo alterado

- `src/components/equipe/dev/NewClientModal.tsx`

