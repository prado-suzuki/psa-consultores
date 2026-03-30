

## Plano: Reordenar tabelas de Apuração — PIS em cima, COFINS embaixo

### Alteração (arquivo único: `ApuracaoPisCofins.tsx`)

Na aba "Apuração" (L574-843), as seções estão na ordem:
1. Apuração (resumo PIS+COFINS) — L577-636
2. Apuração do Débito de **COFINS** — L638-722
3. Apuração do Débito de **PIS** — L724-800
4. Isenções e Exclusões — L802-842

Trocar a ordem das seções 2 e 3 para que fique:
1. Apuração (resumo)
2. Apuração do Débito de **PIS** (atual L724-800)
3. Apuração do Débito de **COFINS** (atual L638-722)
4. Isenções e Exclusões

Apenas mover os blocos `<section>` — sem alteração de lógica ou estilo.

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoPisCofins.tsx` | Inverter ordem das seções PIS e COFINS na aba Apuração |

