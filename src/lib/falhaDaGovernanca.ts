import { toast } from 'sonner';

/**
 * O aviso de falha das telas de governança: o que não deu, e por quê.
 *
 * NASCEU DE UM DEFEITO MEDIDO em 18/09/2026, na revisão de copy: 22 mutations da
 * Matriz, do Acordo e do Protocolo escreviam
 *
 *     toast.error(e instanceof Error ? e.message : 'Não consegui criar')
 *
 * e, como o erro quase sempre É um `Error`, o que a consultoria via na tela era a
 * mensagem crua do Postgres:
 *
 *     new row for relation "protocolo_regra" violates check constraint "protocolo_regra_texto_ck"
 *
 * O padrão (`docs/geral/texto-explicativo-na-tela.md`, §4) proíbe isso por nome:
 * nada de tabela, coluna, constraint, código de erro ou inglês do Postgres na
 * tela. E diz para onde vai: o `console.error`, que permite abrir chamado sem
 * reproduzir o erro.
 *
 * MAS TIRAR O INGLÊS NÃO PODE VIRAR "ALGO DEU ERRADO". Mensagem sem motivo é
 * reclamação antiga da consultoria, e o §3 já diz a forma: duas partes, o que
 * aconteceu e o que fazer agora. O toast tem slot próprio para a segunda, então o
 * título leva a ação que falhou e a descrição leva o motivo.
 *
 * O MOTIVO NÃO É INVENTADO. Ele vem da tabela abaixo, que casa o nome da
 * constraint ou a frase do gatilho com uma frase em português. É o mesmo desenho
 * do `erroDeOrgaoGovernanca` (`lib/orgaosGovernancaPadrao.ts`), dos Órgãos, que
 * era a única das quatro frentes a fazer isso. O casamento é ADITIVO: constraint
 * que não estiver aqui não vira causa chutada, cai no genérico e o bruto continua
 * no console.
 *
 * ⚠️ **ISTO NÃO É O CATÁLOGO DE RECUSA.** O `rlsMessages.ts` é de recusa,
 * permissão e falha de cadastro, com uma célula por operação, e o próprio padrão
 * diz que ele não é repositório universal de microcopy.
 */

/**
 * De onde cada marca saiu: as constraints e os índices estão nas migrations
 * `gov02_*`, `gov03_*` e `govf_*`; as três últimas são mensagens dos gatilhos de
 * coerência do Protocolo, que chegam sem acento porque o arquivo SQL é ASCII.
 */
const MOTIVOS: ReadonlyArray<readonly [string, string]> = [
  /* Matriz de Alçadas */
  ['atividade_governanca_nome_uq', 'Já existe uma atividade com esse nome.'],
  ['atividade_governanca_nome_ck', 'O nome da atividade não pode ficar em branco.'],
  ['papel_governanca_nome_uq', 'Já existe um papel com esse nome.'],
  ['papel_governanca_nome_ck', 'O nome do papel não pode ficar em branco.'],
  ['matriz_atividade_uq', 'Esta atividade já está na matriz.'],
  ['matriz_competencia_uq', 'Este órgão já tem uma linha nesta atividade.'],
  ['matriz_alcadas_versao_uq', 'Este cliente já tem uma matriz com esse número de versão.'],
  ['orgao de outro cliente na matriz', 'Este órgão é de outro cliente.'],

  /* Acordo de Quotistas */
  ['acordo_quorum_materia_uq', 'Este acordo já tem um quórum para essa matéria.'],
  ['acordo_quorum_materia_ck', 'A matéria do quórum não pode ficar em branco.'],
  ['acordo_ramo_nome_uq', 'Este acordo já tem um ramo com esse nome.'],
  ['acordo_ramo_nome_ck', 'O nome do fundador do ramo não pode ficar em branco.'],
  ['acordo_signatario_uq', 'Esta pessoa já é signatária do acordo.'],
  ['acordo_sociedade_uq', 'Esta sociedade já está no acordo.'],
  ['acordo_ordem_posicao_uq', 'Já existe alguém nessa posição da ordem.'],
  ['acordo_quotistas_versao_uq', 'Este cliente já tem um acordo com esse número de versão.'],

  /* Protocolo de Remuneração */
  ['protocolo_tema_governanca_nome_uq', 'Já existe um tema com esse nome.'],
  ['protocolo_tema_governanca_nome_ck', 'O nome do tema não pode ficar em branco.'],
  ['protocolo_item_governanca_nome_uq', 'Já existe um item com esse nome.'],
  ['protocolo_item_governanca_nome_ck', 'O nome do item não pode ficar em branco.'],
  ['protocolo_beneficiario_nome_uq', 'Este protocolo já tem uma coluna com esse nome.'],
  ['protocolo_beneficiario_nome_ck', 'O nome da coluna não pode ficar em branco.'],
  ['protocolo_regra_texto_ck', 'A regra não pode ser gravada em branco.'],
  ['protocolo_linha_uq', 'Este item já está no protocolo.'],
  ['protocolo_remuneracao_versao_uq', 'Este cliente já tem um protocolo com esse número de versão.'],
  ['beneficiario de outro protocolo na celula', 'Esta coluna é de outro protocolo.'],
  [
    'beneficiario padrao da casa nao pode receber regra',
    'Esta coluna é a padrão da casa. Acrescente-a ao protocolo antes de escrever nela.',
  ],
  ['item de outro cliente no protocolo', 'Este item é de outro cliente.'],
];

/** O que aconteceu, e o motivo quando ele é conhecido. */
export interface TextoDaFalha {
  titulo: string;
  detalhe?: string;
}

function textoBruto(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (typeof erro === 'string') return erro;
  return (erro as { message?: string })?.message ?? '';
}

export function textoDaFalha(acao: string, erro: unknown): TextoDaFalha {
  const bruto = textoBruto(erro).toLowerCase();

  /* Sem permissão é outra conversa: não adianta tentar de novo, e o título muda
     junto com o motivo. É o mesmo corte que o `erroDeOrgaoGovernanca` faz. */
  if (/row-level security|permission denied/.test(bruto)) {
    return {
      titulo: `Você não tem permissão para ${acao}.`,
      detalhe: 'Peça a quem cuida dos acessos deste cliente.',
    };
  }

  const motivo = MOTIVOS.find(([marca]) => bruto.includes(marca));
  return { titulo: `Não foi possível ${acao}.`, detalhe: motivo?.[1] };
}

/** O `onError` pronto: a pessoa lê em português, o bruto fica no console. */
export function aoFalhar(acao: string) {
  return (erro: unknown) => {
    console.error(`[governança] falha ao ${acao}`, erro);
    const { titulo, detalhe } = textoDaFalha(acao, erro);
    toast.error(titulo, detalhe ? { description: detalhe } : undefined);
  };
}
