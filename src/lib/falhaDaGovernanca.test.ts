import { describe, expect, it } from 'vitest';

import { textoDaFalha } from '@/lib/falhaDaGovernanca';

describe('a falha das telas de governança', () => {
  it('não põe o erro do banco na tela, mas diz o motivo em português', () => {
    const doPostgres = new Error(
      'new row for relation "protocolo_regra" violates check constraint "protocolo_regra_texto_ck"',
    );

    expect(textoDaFalha('salvar a linha', doPostgres)).toEqual({
      titulo: 'Não foi possível salvar a linha.',
      detalhe: 'A regra não pode ser gravada em branco.',
    });
  });

  it('lê a frase do gatilho, que chega sem acento porque o SQL é ASCII', () => {
    const doGatilho = new Error(
      'Beneficiario padrao da casa nao pode receber regra: copie-o para o protocolo antes',
    );

    expect(textoDaFalha('salvar a linha', doGatilho).detalhe).toBe(
      'Esta coluna é a padrão da casa. Acrescente-a ao protocolo antes de escrever nela.',
    );
  });

  it('separa a recusa de permissão, que pede outra ação da pessoa', () => {
    const recusa = new Error(
      'new row violates row-level security policy for table "protocolo_linha"',
    );

    expect(textoDaFalha('salvar a linha', recusa)).toEqual({
      titulo: 'Você não tem permissão para salvar a linha.',
      detalhe: 'Peça a quem cuida dos acessos deste cliente.',
    });
  });

  it('constraint que não está na tabela NÃO vira causa chutada', () => {
    /* O casamento é aditivo: sem marca conhecida, sobra o título. O motivo
       continua no console, que é onde o padrão manda pôr. */
    const desconhecido = new Error('violates check constraint "algo_que_ninguem_traduziu_ck"');

    expect(textoDaFalha('criar a matriz', desconhecido)).toEqual({
      titulo: 'Não foi possível criar a matriz.',
      detalhe: undefined,
    });
  });

  it('aceita erro que não é Error, que é de onde vinha o texto antigo', () => {
    expect(textoDaFalha('criar a matriz', 'permission denied for table matriz_alcadas').titulo).toBe(
      'Você não tem permissão para criar a matriz.',
    );
  });

  it('duplicidade de nome diz qual nome, e não o nome do índice', () => {
    const duplicado = new Error(
      'duplicate key value violates unique constraint "protocolo_beneficiario_nome_uq"',
    );

    expect(textoDaFalha('acrescentar a coluna', duplicado).detalhe).toBe(
      'Este protocolo já tem uma coluna com esse nome.',
    );
  });
});
