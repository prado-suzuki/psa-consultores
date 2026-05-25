Criar as tabelas `pessoa` e `parentesco` no Supabase com as colunas especificadas e comments apropriados.

### Correção de schema
- O segundo `created_by` (após `updated_at`) na `pessoa` será renomeado para `updated_by` (FK com profiles).

### Tabela `pessoa`
- Colunas: `id` (uuid PK), `cliente_id` (uuid FK), `contribuinte_id` (uuid FK nullable), `tipo_pessoa` (text), `denominacao` (text), `cpf_cnpj` (text), endereço completo (logradouro, numero, complemento, bairro, municipio, uf, cep).
- Campos PF only (com comment): `nacionalidade`, `estado_civil`, `regime_bens`, `data_nascimento`, `filiacao_pai`, `filiacao_mae`, `profissao`, `rg_numero`, `rg_orgao_emissor`, `rg_uf`, `conjuge_id` (FK auto-ref).
- Campos PJ only (com comment): `nire`, `junta_comercial_uf`, `data_constituicao`, `objeto_social`, `status_constituicao`.
- Auditoria: `created_at`, `created_by` (FK profiles), `updated_at`, `updated_by` (FK profiles).

### Tabela `parentesco`
- Colunas: `id` (uuid PK), `pessoa_id` (uuid FK → pessoa), `parente_pessoa_id` (uuid FK → pessoa), `tipo` (text), `natureza` (text).
- Auditoria: `created_at`, `created_by` (FK profiles), `updated_at`, `updated_by` (FK profiles).

### Padrões do projeto aplicados
- RLS habilitado em ambas, com policies usando `has_role_or_higher` (team_member+ leitura/escrita, admin delete).
- Trigger `update_updated_at_column` para `updated_at` nas duas tabelas.
- Índices em FKs.
