## Ajustes no Card Destaque "Estrutura de Pastas do Google Drive"

**Arquivo:** `src/pages/equipe/dev/DevDashboard.tsx` (linhas 236-290 do card inserido anteriormente)

### Mudancas

1. **Paleta de cores: verde em vez de ambar**
   - Trocar todos os tokens `amber-*` por `emerald-*` (borda, gradiente de fundo, icon container, badges, blur orbs, ring focus, sombra).
   - Manter o `teal-50` no lado direito do gradiente para harmonia.

2. **Linguagem imperativa (sem "voce", direta ao analista)**
   - Titulo: "Estrutura de Pastas do Google Drive"
   - Eyebrow: "Fonte dos dados"
   - Descricao em imperativo:
     > "Carregue os arquivos dos clientes no Drive seguindo a estrutura padrao. A coleta para o BigQuery depende dessa organizacao. Quando a estrutura esta correta, todas as ferramentas Digital DEV recebem dados atualizados. Siga o padrao para manter a esteira funcionando."
   - CTA: manter "Abrir manual"

3. **Remover tag "hospedado no..."**
   - Excluir o `<span>` com "hospedado no GitHub Pages" abaixo do botao CTA.

4. **Remover emojis**
   - Confirmar que nenhum emoji e acrescentado na revisao.

### Fora do escopo
- Nenhuma alteracao em rotas, hooks, backend ou outras secoes do dashboard.