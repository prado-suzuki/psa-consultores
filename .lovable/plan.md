

# Novo Modal de Cadastro Completo de Cliente

## Resumo

Substituir o modal simples de "+ Novo Cliente" (linhas 895-1009 do GestaoClientes.tsx) por um modal full-screen com 4 secoes em scroll vertical, seguindo a estrutura do arquivo modelo `NewClientModal.tsx`. O modal de **edicao** (icone lapis) permanece inalterado.

---

## 1. Migracao: Criar tabela `participante` / `participante_dev`

Baseado na estrutura fornecida:

```text
CREATE TABLE public.participante (
  id_participante uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cargo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.participante_dev (
  id_participante uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente uuid NOT NULL REFERENCES public.cliente_dev(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cargo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participante_dev ENABLE ROW LEVEL SECURITY;

-- Politicas (mesmas das tabelas existentes - team_member e admin)
CREATE POLICY "team_members_all_participante" ON public.participante
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('team_member','admin'))
  );

CREATE POLICY "team_members_all_participante_dev" ON public.participante_dev
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('team_member','admin'))
  );
```

---

## 2. Mapeamento de Campos por Tabela

### Secao 1 - Dados do Cliente -> `cliente` / `cliente_dev`
| Campo Modal | Coluna BD |
|---|---|
| Nome do Cliente | `nome` |
| Categoria | `categoria` |
| Status (Switch) | `ativo` |
| Tipo (Fixo/Pontual) | `fixo` ("Sim"/"Nao") |
| Telefone | `telefone` |
| Municipio | `municipio` |
| UF | `uf` |

### Secao 2 - Contribuintes -> `contribuinte` / `contribuinte_dev`
| Campo Modal | Coluna BD |
|---|---|
| Tipo (PJ/PF) | `tipo_pessoa` |
| CPF/CNPJ | `cpf_cnpj` |
| Razao Social | `nome_razao_social` |
| Insc. Estadual | `inscricao_estadual` |
| CNAE | `cod_cnae` |
| Setor | `setor` |
| Simples Nacional | `simples_nacional` |
| (auto) | `cliente_id` -> FK do cliente recem-criado |

### Secao 3 - Participantes -> `participante` / `participante_dev` (NOVA)
| Campo Modal | Coluna BD |
|---|---|
| Nome | `nome` |
| Cargo | `cargo` |
| E-mail | `email` |
| Telefone | `telefone` |
| (auto) | `id_cliente` -> FK do cliente recem-criado |

Nota: o campo `obs` e `linked_entity_id` do modelo serao removidos pois a tabela real nao os possui. O participante se vincula ao **cliente**, nao ao contribuinte.

### Secao 4 - Contratos -> `contrato` + `servico`
| Campo Modal | Coluna BD (`contrato`) |
|---|---|
| Tipo (Mensal/Pontual) | `tipo_contrato` |
| Numero | `numero_contrato` |
| Data Inicio | `data_inicio` |
| Data Fim | `data_fim` |
| Valor | `valor_fixo` |
| Aliquota % | `aliquota_contrato` |
| (auto) | `id_cliente` -> FK do cliente |

Sub-itens de servico por contrato:

| Campo Modal | Coluna BD (`servico`) |
|---|---|
| Descricao | `descricao` |
| Valor | `valor` |
| Catalogo | `id_catalog_client` -> FK da `catalog_clients` |
| (auto) | `id_contrato` -> FK do contrato recem-criado |

O dropdown de servicos buscara da tabela `catalog_clients` (Fiscal, Consultoria, Fixos, Transversal) como catalogo base.

---

## 3. Estrutura do Novo Modal

```text
+------------------------------------------------------+
| [Plus icon] Cadastro Completo                    [X]  |
| "Adicione todos os dados..."                          |
+------------------------------------------------------+
| [ScrollArea - 95vh]                                   |
|                                                       |
| (1) Dados do Cliente [circulo azul]                   |
|   Nome* | Categoria | Status                          |
|   Tipo(toggle) | Telefone | Municipio | UF            |
|                                                       |
| (2) Contribuintes (N) [circulo roxo]                  |
|   [cards dos adicionados - grid 2 cols]               |
|   [form inline: tipo, cpf, razao, ie, cnae, setor,   |
|    simples] + botao "Adicionar"                       |
|                                                       |
| (3) Participantes (N) [circulo amber]                 |
|   [cards dos adicionados - grid 2 cols]               |
|   [form inline: nome, cargo, email, telefone]         |
|   + botao "Adicionar"                                 |
|                                                       |
| (4) Contratos (N) [circulo emerald]                   |
|   [cards dos adicionados com servicos listados]       |
|   [form inline: tipo, numero, datas, valor,           |
|    aliquota + dropdown servicos catalogo]              |
|   + botao "Adicionar Contrato"                        |
|                                                       |
+------------------------------------------------------+
| [Cancelar]              [Salvar Cliente Completo]     |
+------------------------------------------------------+
```

---

## 4. Detalhes Tecnicos

### Arquivo: `src/pages/equipe/dev/GestaoClientes.tsx`

**Novos estados** (adicionados junto aos existentes, ~linha 138):
```text
// Novo modal de cadastro completo
const [novoClienteModalOpen, setNovoClienteModalOpen] = useState(false);
const [novoClienteData, setNovoClienteData] = useState({...});
const [draftEntities, setDraftEntities] = useState<DraftEntity[]>([]);
const [draftEntity, setDraftEntity] = useState<Partial<DraftEntity>>({...});
const [draftParticipants, setDraftParticipants] = useState<DraftParticipant[]>([]);
const [draftParticipant, setDraftParticipant] = useState<Partial<DraftParticipant>>({...});
const [draftContracts, setDraftContracts] = useState<DraftContract[]>([]);
const [draftContract, setDraftContract] = useState<Partial<DraftContract>>({...});
const [draftServices, setDraftServices] = useState<DraftService[]>([]);
const [savingNovoCliente, setSavingNovoCliente] = useState(false);
```

**Query para catalogo de servicos**:
Buscar `catalog_clients` para popular o dropdown de servicos no contrato.

**Novo handler `handleSaveNovoCliente`**:
Cadeia sequencial de inserts:
1. INSERT `cliente` -> obtem `id`
2. INSERT em lote `contribuinte` (cada um com `cliente_id`)
3. INSERT em lote `participante` (cada um com `id_cliente`)
4. Para cada contrato: INSERT `contrato` (com `id_cliente`) -> obtem `id_contrato` -> INSERT em lote `servico` (com `id_contrato`)
5. Sync DW (fire-and-forget) para cliente e contribuintes
6. Invalidar queries, fechar modal, toast de sucesso

**Botao "+ Novo Cliente"** (linha ~480):
- Chamar `setNovoClienteModalOpen(true)` em vez de `handleNovoCliente()`
- O modal antigo (linhas 895-1009) permanece exclusivo para **edicao** (`editingClienteId`)

**Componentes UI utilizados** (design existente do projeto):
- `Dialog` / `DialogContent` (com `className="max-w-5xl max-h-[95vh]"`)
- `ScrollArea` para o corpo
- `Input`, `Label`, `Select`, `Switch`, `Checkbox`, `Badge`, `Button` do projeto
- `toast` (sonner) para feedback
- Cores: `bg-teal-600` para botao primario, circulos numerados com cores do modelo (blue, purple, amber, emerald)

**Tabela ambiente**:
Usar a mesma logica de `isProductionEnvironment` para definir `participanteTable`:
```text
const participanteTable = isProductionEnvironment ? 'participante' : 'participante_dev';
```

### Arquivos modificados:
- `src/pages/equipe/dev/GestaoClientes.tsx` - modal novo + estados + handler de save completo

### Migracao de banco:
- Criar tabelas `participante` e `participante_dev` com RLS

