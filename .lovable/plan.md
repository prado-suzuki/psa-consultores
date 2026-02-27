

# Implementar Validation Trigger para `per.id_contribuinte`

## Contexto

A tabela `per` possui a FK `per_id_contribuinte_fkey` que referencia apenas `contribuinte` (producao). Isso impede que o Preview (que usa `contribuinte_dev`) insira registros validos. A solucao e substituir a FK rigida por um trigger de validacao que aceite IDs de ambas as tabelas.

## Etapas

### 1. Migration SQL

Executar uma unica migration que:

1. **Remove a FK existente:**
   ```text
   ALTER TABLE public.per DROP CONSTRAINT per_id_contribuinte_fkey;
   ```

2. **Cria a funcao de validacao:**
   ```text
   CREATE OR REPLACE FUNCTION public.validate_per_contribuinte()
   RETURNS trigger AS $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM public.contribuinte WHERE id = NEW.id_contribuinte
     ) AND NOT EXISTS (
       SELECT 1 FROM public.contribuinte_dev WHERE id = NEW.id_contribuinte
     ) THEN
       RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado em contribuinte nem contribuinte_dev', NEW.id_contribuinte;
     END IF;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
   ```

3. **Cria o trigger na tabela `per`:**
   ```text
   CREATE TRIGGER trg_validate_per_contribuinte
     BEFORE INSERT OR UPDATE ON public.per
     FOR EACH ROW
     EXECUTE FUNCTION public.validate_per_contribuinte();
   ```

### 2. Codigo (nenhuma alteracao)

O `PerFormModal.tsx` ja usa `TABLE_NAMES.cliente` e `TABLE_NAMES.contribuinte` (alteracao anterior). Com o trigger no lugar da FK, os IDs de `contribuinte_dev` serao aceitos no Preview e os de `contribuinte` continuarao funcionando em producao.

## Resumo

| Item | Acao |
|---|---|
| FK `per_id_contribuinte_fkey` | Remover |
| Funcao `validate_per_contribuinte()` | Criar |
| Trigger `trg_validate_per_contribuinte` | Criar na tabela `per` |
| Codigo frontend | Nenhuma alteracao necessaria |

## Riscos

- **Baixo**: a validacao continua existindo, apenas aceita IDs de ambas as tabelas
- **Sem CASCADE**: a FK original nao tinha `ON DELETE CASCADE`, entao nao ha perda de comportamento automatico de exclusao

