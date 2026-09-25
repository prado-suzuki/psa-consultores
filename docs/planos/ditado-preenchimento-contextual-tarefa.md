Preenchimento contextual de tarefas por ditado
Status: planejado  
Escopo: extrair responsável, cliente, projeto e horas estimadas da fala, resolver referências para IDs válidos e preencher o modal de criação de tarefa.
Decisões
- A IA extrai nomes e valores, nunca IDs.
- Campos não mencionados pela pessoa ficam vazios.
- Se o projeto não for mencionado, o projeto selecionado no feed pode ser usado como contexto.
- Se o projeto for identificado, o cliente será derivado de org_projects.external_client_id.
- Correspondências ambíguas ficam vazias.
- A tarefa continua abrindo no modal para revisão.
- Os campos continuam obrigatórios no salvamento conforme as regras atuais.
- Nenhuma tabela ou coluna nova será criada em org_tasks.
Fluxo esperado
1. Transcrever o áudio.
2. Classificar a intenção.
3. Extrair uma tarefa estruturada:
{
  "titulo": "Revisar apuração",
  "descricao": "Revisar a apuração antes do envio.",
  "responsavel_mencionado": "Ana",
  "cliente_mencionado": null,
  "projeto_mencionado": "Recuperação de PIS",
  "horas_estimadas": 4
}
4. Resolver as referências contra os cadastros permitidos.
5. Derivar o cliente do projeto resolvido.
6. Abrir TaskModal com os campos encontrados.
7. Manter vazios os campos ausentes, ambíguos ou inválidos.
1. Evoluir o contrato de enriquecimento
Alterar supabase/functions/_shared/enriquecimentoTexto.ts para que campos estruturados possam declarar:
- tipo: "texto" | "numero"
- nullable: boolean
- descrição do campo
Manter compatibilidade com perfis persistidos no formato antigo:
{
  "descricao": "Título da tarefa"
}
Campos antigos serão interpretados como texto obrigatório.
O schema da ferramenta enviada ao modelo deverá gerar corretamente:
{
  "type": ["string", "null"]
}
ou:
{
  "type": ["number", "null"]
}
A interpretação da resposta deverá validar tipo, nulabilidade, campos ausentes e campos extras.
2. Migration do perfil de tarefa
Criar migration idempotente para:
- Atualizar enriquecimento_contrato_saida_valido.
- Aceitar os metadados tipo e nullable.
- Atualizar explicitamente o perfil comentario-para-tarefa.
- Não depender do ON CONFLICT DO NOTHING da migration original.
Campos do perfil:
- titulo: texto obrigatório.
- descricao: texto obrigatório.
- responsavel_mencionado: texto anulável.
- cliente_mencionado: texto anulável.
- projeto_mencionado: texto anulável.
- horas_estimadas: número anulável.
As instruções devem dizer explicitamente para não deduzir nomes ausentes e devolver null quando não houver menção.
Aplicação:
1. Criar migration com timestamp real.
2. Executar bun run db:sync --apply no sandbox.
3. Verificar idempotência.
4. Confirmar que não houve alteração de tipos gerados.
5. Solicitar aplicação humana em produção antes de publicar o código dependente.
3. Atualizar a gestão dos perfis
Adaptar:
- src/lib/enriquecimentoPerfis.ts
- src/components/acessos/enriquecimento/PerfilEnriquecimentoForm.tsx
O formulário administrativo precisa ler e preservar tipo e nullable. Caso contrário, editar o perfil removeria silenciosamente esses metadados.
Adicionar controles simples de tipo e nulabilidade para cada campo estruturado.
4. Ampliar o resultado do ditado
Atualizar supabase/functions/ditar/index.ts para devolver:
{
  tipo: 'abrir_tarefa';
  titulo: string;
  descricao: string;
  responsavel_mencionado: string | null;
  cliente_mencionado: string | null;
  projeto_mencionado: string | null;
  horas_estimadas: number | null;
  classificacao: Classificacao;
}
Validar que horas_estimadas seja finita e maior que zero. Valores inválidos tornam-se null.
Preservar o fallback atual: se o enriquecimento falhar, devolver a transcrição como texto comum.
5. Atualizar os contratos frontend
Ampliar em src/hooks/useDitado.ts:
- ResultadoDitado
- TarefaSugeridaDoDitado
Repassar os novos campos em src/components/shared/BotaoDitado.tsx.
Nenhum ID será recebido da Edge Function.
6. Criar o resolvedor determinístico
Criar:
- src/lib/resolverTarefaDitada.ts
- src/lib/resolverTarefaDitada.test.ts
Responsabilidades:
- Remover acentos.
- Normalizar caixa e espaços.
- Comparar nomes completos.
- Para pessoas, aceitar primeiro nome somente quando houver um único candidato.
- Para clientes e projetos, aceitar correspondência parcial somente quando for única.
- Nunca escolher entre múltiplos resultados.
- Nunca consultar cadastros fora das listas permitidas.
Ordem para o projeto:
1. Projeto mencionado e resolvido unicamente.
2. Se nenhum projeto foi mencionado, usar o projeto do contexto da tela.
3. Se houve menção, mas ela é ambígua ou inválida, deixar vazio; não substituir silenciosamente pelo contexto da tela.
Ordem para o cliente:
1. Derivar do projeto resolvido.
2. Sem projeto, resolver o cliente mencionado.
3. Se projeto e cliente mencionados forem incompatíveis, preservar o vínculo cadastral do projeto e informar a inconsistência ao usuário.
Ordem para o responsável:
1. Resolver entre os membros permitidos do projeto.
2. Sem projeto, resolver entre os membros disponíveis da área.
3. Se houver mais de uma correspondência, deixar vazio.
7. Criar hook de resolução
Criar src/hooks/useTarefaDitadaResolvida.ts.
O hook deve compor os hooks existentes:
- useOrgProjectsList
- useExternalClients
- useTeamProfilesSafe
- useProjectMembers
Ele receberá:
- Sugestão extraída.
- Projeto atual da tela.
- Membros da área.
E devolverá:
{
  carregando: boolean;
  valores: TaskModalInitialValues;
  camposNaoResolvidos: string[];
  conflitos: string[];
}
Não haverá chamada direta ao Supabase em componentes.
8. Integrar ao modal
Ampliar TaskModalInitialValues em TaskModal.tsx:
interface TaskModalInitialValues {
  title: string;
  description: string;
  project_id?: string;
  client_id?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  estimated_hours?: number;
}
Ao abrir uma tarefa sugerida:
- Aplicar somente os valores resolvidos.
- Não preencher responsável com o usuário atual.
- Não preencher horas com valor padrão.
- Preservar as regras existentes que sincronizam projeto e cliente.
- Manter o rascunho antigo subordinado aos valores vindos da IA.
Adaptar FeedNovoComentario.tsx para armazenar a sugestão completa e resolver os campos antes de abrir o modal.
9. Feedback para ambiguidades
Mostrar um aviso não bloqueante quando algum valor mencionado não puder ser resolvido:
Não foi possível identificar com segurança o responsável “Ana”. Selecione-o antes de criar a tarefa.
Não criar diálogo adicional no primeiro ciclo. Os campos obrigatórios e suas mensagens atuais continuam impedindo salvamento incompleto.
10. Testes
Adicionar ou atualizar testes para:
- Contratos antigos continuarem válidos.
- Campos anuláveis aceitarem null.
- Campos numéricos recusarem strings e números inválidos.
- Edge Function devolver todos os campos.
- Campo não mencionado permanecer null.
- Nome completo ser resolvido.
- Primeiro nome único ser resolvido.
- Duas pessoas chamadas Ana resultarem em vazio.
- Projeto mencionado prevalecer sobre o contexto da tela.
- Contexto da tela ser usado quando nenhum projeto for mencionado.
- Projeto mencionado e inválido não cair silenciosamente no projeto da tela.
- Cliente ser derivado do projeto.
- Responsável ser restrito aos membros do projeto.
- TaskModal aplicar todos os valores iniciais.
- Fluxo anterior de título e descrição continuar funcionando.
- A opção de usar a fala como comentário continuar preservando a transcrição original.
11. Verificação
Executar:
bun run test
bun run typecheck
bun run lint
bun run build
bun scripts/checa-idempotencia-migrations.ts supabase/migrations/<migration>.sql
Fazer verificação manual com:
1. Todos os campos mencionados.
2. Nenhum campo adicional mencionado.
3. Projeto vindo apenas do filtro da tela.
4. Responsável ambíguo.
5. Cliente derivado do projeto.
6. Horas faladas como “quatro horas” e “uma hora e meia”.
7. Nome com acentos e variação de caixa.
Critérios de aceite
- A IA nunca devolve IDs de cadastros.
- Nenhum LIKE aberto é executado contra profiles.
- Somente opções acessíveis e do ambiente atual participam da resolução.
- Ausência ou ambiguidade não gera preenchimento especulativo.
- Projeto de contexto só é usado quando a fala não menciona projeto.
- Cliente é derivado do projeto resolvido.
- O usuário sempre revisa o modal antes da criação.
- A criação continua passando por useCreateOrgTask e sua auditoria existente.
