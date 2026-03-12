

## Plano: Adicionar data de emissão ao card da OS

### Problema
O card da OS no modal "Novo Projeto" exibe apenas Data Início e Data Fim, mas a tabela `ordem_servico` possui também o campo `data_emissao` que deveria aparecer primeiro.

### Correção

**Arquivo**: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`, linhas 743-756

Reordenar o bloco de datas para exibir três campos na seguinte ordem:
1. **Emissão** — `os.data_emissao`
2. **Início** — `os.data_inicio`
3. **Fim** — `os.data_fim`

Adicionar o bloco de `data_emissao` antes dos dois existentes, seguindo o mesmo padrão visual (ícone Calendar + label + formato dd/MM/yyyy).

