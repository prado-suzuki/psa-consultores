import { definirClassificador } from '../definirClassificador.ts';

export const classificadorIntencaoDitado = definirClassificador({
  nome: 'intencao-ditado',
  versao: 1,
  modelo: 'google/gemini-3-flash-preview',
  instrucoes: [
    'Classifique qual ação o sistema deve tomar depois de um ditado no compositor de comentários.',
    'Use criar_tarefa apenas quando a pessoa pedir, assumir ou registrar uma ação futura concreta.',
    'Imperativos, lembretes e compromissos explícitos são tarefas.',
    'Relatos do que já aconteceu, atualizações, explicações, perguntas e observações são comentários.',
    'Se houver contexto e uma ação concreta na mesma fala, classifique como criar_tarefa.',
    'Use indeterminado quando não for possível distinguir com segurança.',
  ].join('\n'),
  classes: {
    registrar_comentario: {
      descricao: 'Preservar a fala como comentário ou transcrição no editor atual.',
    },
    criar_tarefa: {
      descricao: 'Preparar uma nova tarefa acionável e abrir o formulário para revisão.',
    },
    indeterminado: {
      descricao: 'A fala não permite escolher uma ação com segurança.',
    },
  },
  classeSegura: 'registrar_comentario',
  exemplos: [
    {
      entrada: { texto: 'Preciso revisar a apuração do cliente amanhã.' },
      classe: 'criar_tarefa',
    },
    {
      entrada: { texto: 'Revise a apuração do cliente e me avise.' },
      classe: 'criar_tarefa',
    },
    {
      entrada: { texto: 'A apuração do cliente foi revisada ontem.' },
      classe: 'registrar_comentario',
    },
    {
      entrada: { texto: 'O cliente perguntou quando vamos revisar a apuração.' },
      classe: 'registrar_comentario',
    },
  ],
});

export function classificacaoPedeTarefa(resultado: {
  classe: string;
  certeza: string;
  fallback: boolean;
}): boolean {
  return resultado.classe === 'criar_tarefa' && resultado.certeza === 'alta' && !resultado.fallback;
}
