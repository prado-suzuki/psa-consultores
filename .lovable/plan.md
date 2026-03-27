

## Plano: Otimizar Edge Function `processar-procedimento` para evitar timeouts e 502s

### Diagnóstico

A função faz 2 chamadas sequenciais à AI Gateway com até 50.000 caracteres de conteúdo. Isso causa:
- **502 Server Error**: o gateway fecha a conexão por timeout
- **Processamento lento**: o card fica eternamente em "Analisando documento..."

### Alterações em `supabase/functions/processar-procedimento/index.ts`

**1. Reduzir conteúdo enviado à IA** — de 50.000 para 15.000 caracteres. A IA precisa apenas do suficiente para entender o procedimento, não do documento inteiro.

**2. Usar tool calling para extração estruturada** — em vez de pedir JSON no prompt (propenso a erros de parsing), usar `tools` + `tool_choice` para forçar output estruturado. Isso elimina a necessidade de todo o bloco de repair/cleanup de JSON.

**3. Salvar resultado de texto ANTES de gerar imagem** — atualizar o registro com `status_geracao: 'gerado'` imediatamente após o parsing. A geração de capa vira uma etapa separada que atualiza apenas `ai_cover_url` depois. Se falhar, o procedimento já está disponível sem capa.

**4. Adicionar retry com backoff para 502** — se a gateway retorna 502, aguardar 5s e tentar novamente (máximo 2 tentativas).

**5. Timeout na chamada fetch** — usar `AbortSignal.timeout(55000)` para não estourar o limite do edge runtime (~60s).

### Resultado esperado

- Processamento em ~10-20s em vez de timeout
- Cards saem de "Analisando documento..." rapidamente
- Imagem de capa aparece depois (ou não, sem bloquear)
- Erros 502 transitórios são retentados automaticamente

