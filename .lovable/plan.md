
Problema confirmado: o PATCH continua disparando imediatamente ao clicar em “Editar”, mesmo com `type="button"` no botão de leitura. Pelos arquivos atuais e pelos requests capturados, a causa mais provável é a troca de modo dentro do mesmo footer: o botão clicado é reconciliado no mesmo slot e vira o botão “Salvar” externo ao form (`type="submit" form="regra-form"`), disparando o submit com os valores já populados.

Plano de correção:

1. Arquivo alvo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

2. Remover o submit externo implícito
- Trocar o botão “Salvar” de:
  - `type="submit" form="regra-form"`
- Para:
  - `type="button"`
  - `onClick={form.handleSubmit(onSubmit)}`
- Assim o salvar só acontece por clique explícito no botão, sem depender do `form` externo.

3. Quebrar a reconciliação entre os modos
- Colocar `key` diferente nos blocos condicionais de leitura e edição:
  - conteúdo (`view-content` / `edit-content`)
  - footer (`view-footer` / `edit-footer`)
- Isso força desmontagem/remontagem real ao trocar de modo e evita reaproveitamento do mesmo botão no mesmo ciclo de clique.

4. Manter submit por Enter apenas dentro do form
- Preservar `onSubmit={form.handleSubmit(onSubmit)}` no `<form>`
- Remover a dependência do atributo `form="regra-form"` no footer externo

5. Validação final esperada
- Clicar em “Editar” apenas troca para modo edição
- Nenhum PATCH deve ocorrer nesse clique
- PATCH só deve acontecer ao clicar em “Salvar” ou pressionar Enter dentro do formulário

Impacto:
- Alteração pontual em 1 arquivo
- Zero mudança de layout, regras de negócio ou CRUD
- Correção focada no fluxo do modal e no bug de auto-save
