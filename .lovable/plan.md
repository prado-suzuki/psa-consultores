

# Plano de Melhorias na Ferramenta Controle PERDCOMP

## Resumo das Alteracoes

Este plano implementa diversas melhorias no modal de cadastro de PER e na tabela de visualizacao, conforme solicitado:

---

## 1. Remover Coluna "Analisar" da Tabela

**Arquivo:** `src/pages/equipe/dev/ControlePerdcomp.tsx`

- Remover a coluna `<TableHead>Analisar</TableHead>` do cabecalho
- Remover a celula correspondente que renderiza o botao "Analisar" / "Verificado!"
- Remover estados relacionados: `analisarModalOpen`, `selectedPerNumero`, `selectedPerSituacao`, `recentlyVerified`
- Remover funcoes `handleAnalisar` e `handleAnalisarSuccess`
- Remover componente `AnalisarPerModal` (nao sera mais utilizado)

---

## 2. Remover Botao de Excluir PER

**Arquivo:** `src/pages/equipe/dev/ControlePerdcomp.tsx`

- Remover o botao de `<Trash2>` da coluna de acoes para PER
- Manter o botao de editar (Pencil) apenas
- A mutation de delete e o AlertDialog podem ser removidos ou mantidos apenas para DCOMP

---

## 3. Formatacao Automatica do Numero do Processo

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

Implementar formatacao automatica no padrao: `31942.50758.311024.1.1.18-1220`

**Logica de formatacao:**
- Posicoes dos separadores: `.` apos 5, 11, 17, 19 e 21 caracteres; `-` apos 24 caracteres
- Padrao regex: `XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX`

```
Funcao formatProcessNumber(value):
  1. Remove tudo que nao for numero
  2. Limita a 26 caracteres numericos
  3. Insere pontos e hifen nas posicoes corretas
  4. Retorna string formatada
```

---

## 4. Tipo de Credito como Dropdown (PIS/COFINS)

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

- Substituir o `<Input>` por um `<Select>` com opcoes:
  - PIS
  - COFINS

---

## 5. Valor do Credito Formatado como R$ 0,00

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

- Implementar input com mascara de moeda brasileira
- O usuario digita apenas numeros e o campo exibe formatado (R$ 1.234,56)
- Ao salvar, converter para numero (1234.56) para armazenar no banco

---

## 6. Campo Data Solicitada com Calendario

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

- Substituir `<Input type="date">` por um Popover + Calendar (mesmo padrao de ConsultaXMLs)
- Importar componentes necessarios: `Calendar`, `Popover`, `PopoverContent`, `PopoverTrigger`
- Usar `format` e `parse` do date-fns com locale ptBR
- Adicionar classe `pointer-events-auto` no Calendar para garantir interatividade

---

## 7. Criar Situacao "Analisado" ao Cadastrar PER

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

Na mutation de criacao (`createMutation`):
1. Apos inserir o PER com sucesso
2. Automaticamente inserir um registro em `per_situacao` com:
   - `nr_proc_per`: numero do processo criado
   - `situacao`: "Analisado"

Isso garante que todo novo PER ja apareca com a situacao correta na tabela.

---

## Detalhes Tecnicos

### Componentes e Imports Necessarios

```typescript
// PerFormModal.tsx - imports adicionais
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
```

### Funcao de Formatacao do Numero do Processo

```typescript
const formatProcessNumber = (value: string): string => {
  // Remove tudo que nao for numero
  const digits = value.replace(/\D/g, '').slice(0, 26);
  
  // Aplica a mascara: XXXXX.XXXXX.XXXXXX.X.X.XX-XXXX
  let formatted = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 5 || i === 10 || i === 16 || i === 17 || i === 18 || i === 20) {
      formatted += '.';
    }
    if (i === 22) {
      formatted += '-';
    }
    formatted += digits[i];
  }
  return formatted;
};
```

### Funcao de Formatacao de Moeda

```typescript
const formatCurrencyInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const numberValue = parseInt(digits || '0', 10) / 100;
  return numberValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const parseCurrencyToNumber = (value: string): number => {
  const digits = value.replace(/\D/g, '');
  return parseInt(digits || '0', 10) / 100;
};
```

### Criacao Automatica de Situacao

```typescript
// Dentro de createMutation.mutationFn
const { error: perError } = await supabase.from('per').insert([...]);
if (perError) throw perError;

// Criar situacao inicial automaticamente
const { error: situacaoError } = await supabase.from('per_situacao').insert({
  nr_proc_per: data.numero_processo_per,
  situacao: 'Analisado',
});
if (situacaoError) {
  console.error('Erro ao criar situacao inicial:', situacaoError);
}
```

---

## Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Remover coluna Analisar, remover botao excluir PER |
| `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Formatacao numero processo, dropdown tipo credito, mascara moeda, calendario, criacao automatica situacao |

---

## Resultado Esperado

- A tabela de PERs tera uma coluna a menos (sem "Analisar")
- Novos PERs serao automaticamente marcados como "Analisado"
- O modal de cadastro tera campos mais intuitivos e formatados
- Nao sera possivel excluir PERs (apenas editar)

