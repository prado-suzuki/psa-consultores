# ALE-27 · Conferência dos dois números do catálogo

**Decisão de Alexandre Silva, 04/08/2026.** Corrigido na migration
`20260803235000_catalogo_e_vinculos_pos_8_produtos.sql`.

O número **(a)** era problema real e está corrigido. O número **(b)** não existe: é erro de
aritmética no enunciado.

## (a) Cinco itens sem produto → decisão: vincular os 3 ativos

Dois dos cinco eram esperados (`RG / CNH` e `Balanço / Balancete / DRE`, desmembrados e já excluídos). Os outros três eram documentos ativos da matrícula **rural**, sem vínculo com produto nenhum — e a `gerar_solicitacao_os` só pede o que está ligado a um produto contratado.
Efeito: **nenhum cliente era solicitado a entregar a matrícula de inteiro teor de imóvel rural**, sendo que a maioria dos clientes é rural.

| Documento (matrícula rural)                 | Decisão      | Produtos                                                |
| ------------------------------------------- | ------------ | ------------------------------------------------------- |
| Matrícula do imóvel (inteiro teor)          | **vincular** | os 7 em que o gêmeo urbano está                         |
| Contrato particular de compra e venda (CCV) | **vincular** | Estruturação Societária                                 |
| Escritura pública de compra e venda         | **vincular** | Diagnóstico Soc., Suc. e Gov. · Estruturação Societária |

Nenhum é para desativar. **Causa:** a carga usou a planilha `Documentos_por_Produto_OSG`, que colapsa o par rural×urbano numa linha só (dedup declarado no gerador), e a linha colapsada foi resolvida para o código urbano. Na migration o vínculo é derivado por join a partir do gêmeo urbano, não escrito à mão.

## (b) «260 contra 228 previstos» → não há divergência

A contagem esperada por produto que o próprio enunciado lista — ES 48 · DSS 34 · PS 26 · RSA 23 · CFI 22 · GOV 21 · RSC 18 · RSI 18 · RSF 18 · RST 16 · MC 16 — **soma 260**, não 228.
Conferido contra o banco: bate unidade por unidade nos 11 produtos, delta zero. Não existem 32 vínculos extras nem 3 documentos a mais.

Isso também explica por que (a) passou meses despercebido: o dedup do par **preserva a contagem**. O total estava certo; só a identidade de 14 vínculos estava no lado errado.

## Verificação

```sql
select t.codigo from public.documento_tipo t
 where t.ativo
   and not exists (select 1 from public.produto_documento_tipo p where p.item_padrao_id = t.id);
```

Esperado: **nenhuma linha**. A migration tem essa mesma checagem como trava de saída.

**Antes de rodar a consulta, note que o estado mudou desde a abertura do card:** o catálogo foi de 58 para 67 documentos (ALE-26) e os produtos OSG de 11 para 8 (as 5 modalidades de reorganização viraram uma). Antes da correção a consulta devolvia **15** linhas — os 3 rurais mais os 12 documentos novos da ALE-26 que ainda não tinham vínculo. Não é regressão.
