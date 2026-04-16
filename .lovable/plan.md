

# Refatoração UX/UI — ConsultaXMLs.tsx

## 1. Tabela de Tooltips

Cada label de filtro receberá um ícone `<Info>` alinhado com `flex items-center gap-1.5`. Botões desabilitados serão envolvidos em `<span>` dentro do `TooltipTrigger` para contornar a limitação do Radix.

| Elemento | Texto do Tooltip |
|---|---|
| **Cliente** | "Selecione o grupo econômico. A lista de contribuintes será filtrada automaticamente conforme o cliente escolhido. Caso selecione 'Todos', todos os contribuintes cadastrados serão exibidos." |
| **Contribuinte** | "Empresa ou pessoa física vinculada ao cliente selecionado (CNPJ/CPF). Apenas um contribuinte por consulta. Se houver apenas um cadastrado, a seleção será automática. Campo obrigatório para acionar a busca." |
| **Tipo Doc.** | "Tipo de documento fiscal: NFe (Nota Fiscal Eletrônica) ou CTe (Conhecimento de Transporte Eletrônico). A tabela de resultados e as colunas de exportação se adaptam ao tipo selecionado." |
| **Tipo Mov.** | "Filtra a direção da operação: Entrada (documentos recebidos pelo contribuinte) ou Saída (documentos emitidos). Selecione 'Todos' para exibir ambos." |
| **Data Início** | "Data inicial do período de emissão dos documentos. Obrigatório. Define o limite inferior da consulta junto com a Data Fim." |
| **Data Fim** | "Data final do período de emissão. Obrigatório. O intervalo entre Data Início e Data Fim determina o escopo completo da busca." |
| **CPF/CNPJ Emitente** | "Filtra documentos por CPF ou CNPJ de quem emitiu o documento. Opcional. Aceita somente números — a formatação é removida automaticamente." |
| **CPF/CNPJ Destinatário** | "Filtra documentos por CPF ou CNPJ do destinatário. Opcional. Aceita somente números." |
| **Chave de Acesso** | "Chave numérica única de 44 dígitos que identifica o documento fiscal (NFe ou CTe). Opcional. Quando informada, a busca retorna apenas o documento correspondente." |
| **Botão Buscar** | "Executa a consulta com os filtros aplicados. Requer ao menos um Contribuinte selecionado e o período definido." |
| **Botão Limpar filtros** | "Redefine todos os filtros para os valores padrão e limpa os resultados da tabela, permitindo iniciar uma nova consulta." |
| **Botão Baixar XMLs** | "Baixa em lote todos os arquivos XML do resultado atual (respeitando os filtros aplicados). O download será um arquivo .zip quando houver múltiplos documentos, ou .xml quando for apenas um." |
| **Botão Exportar Excel** | "Abre o painel de exportação avançada. Permite selecionar colunas, salvar perfis de exportação e visualizar um preview antes de gerar a planilha. A exportação inclui todos os registros do filtro, não apenas a página atual." |
| **Botão Download (linha)** | "Baixa o arquivo XML original deste documento específico." |
| **Botão Anterior/Próximo** | "Navega entre as páginas de resultados. A tabela exibe 10 registros por página." |

## 2. Novo Texto da Introdução (Banner)

Substituir o `div` azul atual por um `Alert` com visual mais rico:

> **Como usar esta ferramenta**
>
> **1.** Preencha os filtros obrigatórios: **Cliente**, **Contribuinte**, **Tipo de Documento** e o **período** (Data Início e Data Fim).
> Opcionalmente, refine por Tipo de Movimentação, CPF/CNPJ do Emitente ou Destinatário, ou busque diretamente pela Chave de Acesso (44 dígitos).
>
> **2.** Clique em **Buscar** para consultar a base de documentos fiscais.
>
> **3.** Analise os resultados na tabela — cada linha representa um XML (NFe ou CTe) com dados de emitente, chave, valor e data.
>
> **4.** Use **Exportar Excel** para gerar uma planilha personalizada com todos os registros do filtro (não apenas a página visível), ou **Baixar XMLs** para obter os arquivos originais em lote (.zip).

Implementação: usar o componente `Alert` existente com ícone `Info`, estilizado com `bg-blue-50/80 border-blue-200`.

## 3. Melhorias Visuais

| Melhoria | Detalhe |
|---|---|
| **TooltipProvider único** | Envolver todo o componente em um único `<TooltipProvider delayDuration={300}>` em vez de múltiplos providers aninhados por célula. |
| **Labels com Info icon** | Cada `<label>` vira `<label className="flex items-center gap-1.5 ...">Texto <Tooltip><TooltipTrigger><Info .../></TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip></label>` |
| **Disabled button wrapper** | Botões `Buscar`, `Limpar filtros`, `Baixar XMLs` e download por linha: quando `disabled`, envolver em `<span>` dentro do `TooltipTrigger` para garantir hover. |
| **Empty state refinado** | No estado "Pronto para buscar", adicionar texto secundário mais descritivo: "Preencha Cliente, Contribuinte e período, depois clique em Buscar." |
| **Contagem no header da tabela** | Mover o badge de contagem `{totalRecords} registro(s)` para dentro de um `Badge variant="secondary"` para destaque visual. |
| **Paginação melhorada** | Adicionar indicador visual de página atual com `font-semibold` e `text-foreground` no texto "Página X de Y". |

## 4. Escopo Técnico

- **Arquivo alterado**: `src/pages/equipe/dev/ConsultaXMLs.tsx` (único arquivo)
- **Sem novos componentes**: tudo inline, usando imports já existentes (Tooltip, Alert, Info icon)
- **Sem mudança de lógica**: apenas camada de apresentação e textos

