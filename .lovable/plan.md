# Plano: Configuracoes globais do contribuinte + campo "Detalhamento" no upload de balancete

## Resumo

Criar uma tabela `contribuinte_bal_config` para armazenar configuracoes globais por contribuinte (comecando com `balancete_detalhamento`). No modal de upload, ao selecionar um contribuinte pela primeira vez, perguntar se o balancete possui detalhamento. Nas vezes seguintes, pre-preencher o campo com o valor salvo.

---

## Fase 1: Migracao SQL

Criar a tabela `contribuinte_bal_config` :


| Coluna                   | Tipo                 | Default             | Descricao                          |
| ------------------------ | -------------------- | ------------------- | ---------------------------------- |
| `id`                     | uuid PK              | `gen_random_uuid()` | Identificador                      |
| `id_contribuinte`        | uuid NOT NULL UNIQUE | -                   | Referencia ao contribuinte (1:1)   |
| `balancete_detalhamento` | boolean              | NULL                | Se o balancete possui detalhamento |
| `created_at`             | timestamptz          | `now()`             | -                                  |
| `updated_at`             | timestamptz          | `now()`             | -                                  |


- Constraint UNIQUE em `id_contribuinte` para garantir 1 registro por contribuinte.
- RLS: mesmas politicas das tabelas operacionais (team_member + admin).
- Trigger `update_updated_at_column` para atualizar `updated_at` automaticamente.

---

## Fase 2: Frontend -- `UploadBalanceteModal.tsx`

### 2.1 Consultar config ao selecionar contribuinte

Quando o usuario seleciona um contribuinte, fazer query em `contribuinte_bal_config` filtrando por `id_contribuinte`:

- Se existir registro com `balancete_detalhamento` preenchido: pre-preencher o switch de detalhamento e mostrar o campo normalmente.
- Se NAO existir registro (primeira vez): exibir um alerta/prompt inline perguntando "O balancete deste contribuinte possui detalhamento?" com opcoes Sim/Nao. Ao responder, salvar (upsert) na tabela `contribuinte_bal_config` e pre-preencher o campo.

### 2.2 Adicionar campo "Detalhamento" ao formulario

- Novo campo Switch (Sim/Nao) entre o seletor de contribuinte e o periodo.
- Estado: `detalhamento: boolean | null` -- comeca `null`, preenchido apos consulta ou resposta do usuario.
- O campo fica desabilitado ate que um contribuinte seja selecionado.

### 2.3 Enviar no payload

Adicionar `formData.append('detalhamento', String(detalhamento))` ao `handleSubmit`, enviando `'true'` ou `'false'` junto ao POST para `/api/v1/contabil/balancetes`.

### 2.4 Permitir alteracao

O usuario pode trocar o valor do switch manualmente no formulario (caso queira enviar um balancete diferente do padrao). Isso NAO altera a config salva -- so o envio atual. Para alterar a config padrao, o usuario precisaria de uma acao separada (fora do escopo agora).

---

## Arquivos impactados


| Arquivo                    | Alteracao                                                                   |
| -------------------------- | --------------------------------------------------------------------------- |
| Migracao SQL               | CREATE TABLE `contribuinte_bal_config` , RLS, trigger                       |
| `UploadBalanceteModal.tsx` | Query de config, switch de detalhamento, logica de primeiro acesso, payload |
