
# Plano: Atualizar Dados do Escritório Barreiras

## Dados Atuais → Novos

| Campo | Antes | Depois |
|-------|-------|--------|
| **E-mail** | barreiras@psaconsultores.com.br | contato@pradosuzuki.com |
| **Telefone** | (77) 3614-0000 | +55 (77) 3611-0217 |
| **Endereço** | Rua Exemplo, 123 - Centro, Barreiras - BA, 47800-000 | Rua 12 de Outubro, 520, Renato Gonçalves – Barreiras/BA, CEP 47806-072 |

## Alteração

### Arquivo: `src/components/OfficesSection.tsx`

**Linhas 26-34** - Atualizar objeto do escritório de Barreiras:

```typescript
{
  id: "barreiras",
  city: "Barreiras",
  state: "BA",
  type: "Filial",
  email: "contato@pradosuzuki.com",
  phone: "+55 (77) 3611-0217",
  address: "Rua 12 de Outubro, 520, Renato Gonçalves – Barreiras/BA, CEP 47806-072",
},
```

## Resumo

| Aspecto | Detalhes |
|---------|----------|
| **Arquivo** | `src/components/OfficesSection.tsx` |
| **Alteração** | Atualizar 3 campos do escritório Barreiras |
| **Linhas** | 31-33 |
