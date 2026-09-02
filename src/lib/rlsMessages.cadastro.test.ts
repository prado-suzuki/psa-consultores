import { describe, it, expect } from 'vitest';
import {
  mensagemDeRecusa,
  mensagemDoSalvamentoRecusado,
  textoDeRecusa,
  textoDaRecusa,
  textoDoSalvamentoRecusado,
  regraDeNegocioDaRecusa,
  categoriaDaRecusa,
  recusaDeOperacao,
  RlsPrecheckError,
  type CadastroAcao,
  type CadastroItem,
  type CadastroOperacao,
} from './rlsMessages';

/**
 * As mensagens de recusa do cadastro de cliente, célula por célula.
 *
 * A fonte é `docs/sprints/sprint-12/TAREFA_mensagens-de-recusa.md` (tabelas A e
 * B, texto fechado em 02/09/2026). O teste existe para que "arrumar o texto"
 * numa próxima passagem apareça como falha, e não como divergência silenciosa
 * entre o que foi decidido e o que a tela mostra.
 */

const FECHO_SUPORTE = 'Tente novamente. Se o problema continuar, entre em contato com o suporte.';
const FECHO_ATUALIZE = 'Atualize os dados e tente novamente.';
const FECHO_ZERO = 'Os dados podem ter sido modificados. Atualize a página e tente novamente.';
const PAPEL = 'É necessário ter o papel de Sublíder ou superior para realizar esta ação.';

/** Uma linha por célula das tabelas A e B, com o fecho da Falha. */
const CELULAS: Array<{
  item: CadastroItem;
  acao: CadastroAcao;
  falha: string;
  permissao: string;
  fecho: string;
}> = [
  { item: 'cliente', acao: 'cadastrar', falha: 'cadastrar o cliente', permissao: 'cadastrar este cliente', fecho: FECHO_SUPORTE },
  { item: 'cliente', acao: 'atualizar', falha: 'atualizar o cliente', permissao: 'atualizar este cliente', fecho: FECHO_SUPORTE },
  { item: 'cliente', acao: 'excluir', falha: 'desfazer o cadastro do cliente', permissao: 'excluir este cliente', fecho: FECHO_SUPORTE },
  { item: 'cluster', acao: 'cadastrar', falha: 'vincular o cluster ao cliente', permissao: 'vincular este cluster ao cliente', fecho: FECHO_SUPORTE },
  { item: 'cluster', acao: 'excluir', falha: 'remover o cluster do cliente', permissao: 'remover este cluster do cliente', fecho: FECHO_SUPORTE },
  { item: 'contribuinte', acao: 'cadastrar', falha: 'cadastrar o contribuinte', permissao: 'cadastrar este contribuinte', fecho: FECHO_SUPORTE },
  { item: 'contribuinte', acao: 'atualizar', falha: 'atualizar o contribuinte', permissao: 'atualizar este contribuinte', fecho: FECHO_SUPORTE },
  { item: 'contribuinte', acao: 'excluir', falha: 'excluir o contribuinte', permissao: 'excluir este contribuinte', fecho: FECHO_SUPORTE },
  { item: 'inscricao', acao: 'cadastrar', falha: 'cadastrar a inscrição estadual', permissao: 'cadastrar esta inscrição estadual', fecho: FECHO_SUPORTE },
  { item: 'inscricao', acao: 'atualizar', falha: 'atualizar a inscrição estadual', permissao: 'atualizar esta inscrição estadual', fecho: FECHO_SUPORTE },
  { item: 'inscricao', acao: 'excluir', falha: 'excluir a inscrição estadual', permissao: 'excluir esta inscrição estadual', fecho: FECHO_SUPORTE },
  { item: 'representante', acao: 'cadastrar', falha: 'cadastrar o representante', permissao: 'cadastrar este representante', fecho: FECHO_SUPORTE },
  { item: 'representante', acao: 'atualizar', falha: 'atualizar o representante', permissao: 'atualizar este representante', fecho: FECHO_SUPORTE },
  { item: 'representante', acao: 'excluir', falha: 'excluir o representante', permissao: 'excluir este representante', fecho: FECHO_SUPORTE },
  { item: 'os', acao: 'cadastrar', falha: 'cadastrar a ordem de serviço', permissao: 'cadastrar esta ordem de serviço', fecho: FECHO_SUPORTE },
  { item: 'os', acao: 'atualizar', falha: 'atualizar a OS 1234', permissao: 'atualizar a OS 1234', fecho: FECHO_ATUALIZE },
  { item: 'os', acao: 'excluir', falha: 'excluir a OS 1234', permissao: 'excluir a OS 1234', fecho: FECHO_SUPORTE },
  { item: 'rateio', acao: 'cadastrar', falha: 'cadastrar o rateio de receita', permissao: 'cadastrar este rateio de receita', fecho: FECHO_SUPORTE },
  { item: 'rateio', acao: 'atualizar', falha: 'atualizar o rateio de receita da OS 1234', permissao: 'atualizar este rateio de receita', fecho: FECHO_ATUALIZE },
  { item: 'rateio', acao: 'excluir', falha: 'excluir o rateio de receita', permissao: 'excluir este rateio de receita', fecho: FECHO_SUPORTE },
  { item: 'produto', acao: 'cadastrar', falha: 'adicionar o produto à OS', permissao: 'adicionar este produto à OS', fecho: FECHO_SUPORTE },
  { item: 'produto', acao: 'atualizar', falha: 'atualizar o produto contratado', permissao: 'atualizar este produto contratado', fecho: FECHO_SUPORTE },
  { item: 'produto', acao: 'excluir', falha: 'excluir o produto contratado', permissao: 'excluir este produto contratado', fecho: FECHO_SUPORTE },
];

const op = (item: CadastroItem, acao: CadastroAcao): CadastroOperacao => ({ item, acao, numeroOs: '1234' });

/**
 * As recusas de regra de negócio como o banco as devolve.
 *
 * Frases e códigos conferidos no schema de produção em 02/09/2026
 * (`criar_cliente_com_clusters`, `enforce_cliente_tem_cluster`,
 * `enforce_cliente_cluster_last` e as duas constraints de unicidade). Note que
 * todas citam identificador interno ou nome de tabela — é por isso que a frase
 * da tela vem do catálogo, e não daqui.
 */
const ERROS_DE_REGRA = [
  { code: '23514', message: 'Selecione ao menos 1 cluster' },
  {
    code: '23514',
    message:
      'Cliente Frigobom (0f8f2c1e-4b7a-4c3d-9e21-5a6b7c8d9e01) precisa estar vinculado a ' +
      'pelo menos 1 cluster (cliente_clusters).',
  },
  {
    code: '23514',
    message:
      'Não é possível remover o último cluster do cliente ' +
      '3a1c4d5e-6f70-4812-9a3b-4c5d6e7f8091. Vincule outro cluster antes.',
  },
  {
    code: '23505',
    message: 'duplicate key value violates unique constraint "unique_cliente_cluster"',
    details: 'Key (cliente_id, cluster_id)=(0f8f2c1e-4b7a-4c3d-9e21-5a6b7c8d9e01, 1) already exists.',
  },
  {
    code: '23505',
    message:
      'duplicate key value violates unique constraint ' +
      '"os_produtos_contratados_ordem_servico_id_produto_segmento_i_key"',
  },
];

describe('mensagens de recusa do cadastro de cliente', () => {
  describe.each(CELULAS)('$item / $acao', ({ item, acao, falha, permissao, fecho }) => {
    it('falha: nomeia o item e orienta', () => {
      expect(mensagemDeRecusa(op(item, acao), 'falha')).toBe(`Não foi possível ${falha}.\n${fecho}`);
    });

    it('zero linhas: manda recarregar, nunca vira sucesso', () => {
      expect(mensagemDeRecusa(op(item, acao), 'zero_linhas')).toBe(`Não foi possível ${falha}.\n${FECHO_ZERO}`);
    });

    it('permissão: informa o papel necessário', () => {
      expect(mensagemDeRecusa(op(item, acao), 'permissao')).toBe(
        `Você não tem permissão para ${permissao}.\n${PAPEL}`,
      );
    });
  });

  it('usa o papel que o banco informou, quando ele informa', () => {
    expect(mensagemDeRecusa(op('contribuinte', 'excluir'), 'permissao', 'lider')).toContain(
      'É necessário ter o papel de Líder ou superior',
    );
  });

  it('OS sem número não expõe identificador interno', () => {
    const texto = mensagemDeRecusa({ item: 'os', acao: 'atualizar' }, 'falha');
    expect(texto).toBe(`Não foi possível atualizar a OS (sem número).\n${FECHO_ATUALIZE}`);
  });
});

describe('nada de linguagem técnica no texto da tela', () => {
  const PROIBIDOS = [
    'row-level',
    'row level',
    'violates row',
    'permission denied',
    'rls',
    '42501',
    'upsert',
    'contribuinte_faturamento',
    'ordem_servico',
    'os_produtos_contratados',
    'inscricao_contribuinte',
    'cliente_clusters',
    'distribuicao_receita',
    'soft_delete',
    'can_perform',
    'excluido',
    'fale com a liderança',
  ];
  const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  const RECUSA_POR_CARGO = () =>
    new RlsPrecheckError({ allowed: false, reason: 'rls_blocked', required_role: 'sublider' });

  const todasAsFrases = (): string[] => {
    const frases: string[] = [];
    for (const { item, acao } of CELULAS) {
      for (const categoria of ['falha', 'zero_linhas', 'permissao'] as const) {
        frases.push(mensagemDeRecusa(op(item, acao), categoria));
        frases.push(
          mensagemDoSalvamentoRecusado(
            recusaDeOperacao(op(item, acao), categoria === 'permissao' ? RECUSA_POR_CARGO() : undefined, {
              zeroLinhas: categoria === 'zero_linhas',
            }),
          ),
        );
      }
    }
    // As regras de negócio conhecidas também passam pela varredura.
    for (const erro of ERROS_DE_REGRA) {
      const recusa = recusaDeOperacao({ item: 'cliente', acao: 'atualizar' }, erro);
      frases.push(recusa.message, mensagemDoSalvamentoRecusado(recusa));
    }
    return frases;
  };

  it.each(PROIBIDOS)('nenhuma frase contém "%s"', (termo) => {
    for (const frase of todasAsFrases()) {
      expect(frase.toLowerCase()).not.toContain(termo);
    }
  });

  it('nenhuma frase carrega identificador interno', () => {
    for (const frase of todasAsFrases()) {
      expect(frase).not.toMatch(UUID);
    }
  });

  it('não repassa o texto cru do banco, mesmo quando ele vem', () => {
    const erro = {
      code: '42501',
      message: 'new row violates row-level security policy for table "contribuinte"',
    };
    const recusa = recusaDeOperacao({ item: 'contribuinte', acao: 'cadastrar' }, erro);
    expect(recusa.message).not.toContain('row-level');
    // O diagnóstico continua disponível — fora da tela.
    expect(recusa.detalheTecnico).toContain('row-level');
    expect(recusa.detalheTecnico).toContain('42501');
  });
});

describe('a categoria vem do motivo, não de palavra na mensagem', () => {
  it('código de permissão cru não afirma cargo enquanto a recusa puder ser por cluster', () => {
    // As tarefas 1 a 3 é que deixam a escrita só por cargo. Antes delas, um
    // 42501 pode ser cluster — dizer "papel de Sublíder" mentiria para quem já
    // é sublíder.
    expect(categoriaDaRecusa({ code: '42501', message: 'permission denied' })).toBe('falha');
  });

  it('a recusa de cargo da criação de cliente é permissão, e diz o papel', () => {
    // Única 42501 que `criar_cliente_com_clusters` levanta, conferida em
    // produção: ali o motivo é o cargo, não o cluster.
    const erro = { code: '42501', message: 'Sem permissão para cadastrar cliente' };
    const recusa = recusaDeOperacao({ item: 'cliente', acao: 'cadastrar' }, erro);
    expect(recusa.categoria).toBe('permissao');
    expect(textoDaRecusa(recusa)).toEqual({
      titulo: 'Você não tem permissão para cadastrar este cliente.',
      detalhe: PAPEL,
    });
  });

  it('precheck sem o papel também não afirma cargo', () => {
    const erro = new RlsPrecheckError({ allowed: false, reason: 'rls_blocked' });
    expect(categoriaDaRecusa(erro)).toBe('falha');
  });

  it('precheck que diz que a policy barra é permissão, com o papel', () => {
    const erro = new RlsPrecheckError({ allowed: false, reason: 'rls_blocked', required_role: 'sublider' });
    const recusa = recusaDeOperacao({ item: 'inscricao', acao: 'atualizar' }, erro);
    expect(recusa.categoria).toBe('permissao');
    expect(recusa.papel).toBe('sublider');
  });

  it('linha que não existe mais cai em "os dados podem ter sido modificados"', () => {
    const erro = new RlsPrecheckError({ allowed: false, reason: 'row_not_found' });
    expect(categoriaDaRecusa(erro)).toBe('zero_linhas');
  });

  it('erro do banco sem sinal de permissão é falha, não "sem permissão"', () => {
    const unicidade = {
      code: '23505',
      message: 'duplicate key value violates unique constraint "os_produtos_contratados_uk"',
    };
    expect(categoriaDaRecusa(unicidade)).toBe('falha');
    expect(mensagemDeRecusa({ item: 'produto', acao: 'cadastrar' }, categoriaDaRecusa(unicidade))).toContain(
      'Não foi possível adicionar o produto à OS.',
    );
  });

  it('mensagem em português não é rebaixada nem promovida por palavra (B2)', () => {
    const erro = { message: 'Você precisa do papel "Sublíder" ou superior para realizar essa ação.' };
    // Sem código e sem precheck, o sistema NÃO sabe que foi permissão.
    expect(categoriaDaRecusa(erro)).toBe('falha');
  });

  it('zero linhas sem erro nenhum nunca é sucesso', () => {
    const recusa = recusaDeOperacao({ item: 'representante', acao: 'atualizar' }, null, { zeroLinhas: true });
    expect(recusa.categoria).toBe('zero_linhas');
    expect(recusa.message).toContain('Não foi possível atualizar o representante.');
  });
});

describe('regra de negócio conhecida aparece, curada e acionável', () => {
  it('cliente sem cluster diz o que fazer, nos dois caminhos', () => {
    for (const erro of ERROS_DE_REGRA.slice(0, 2)) {
      const recusa = recusaDeOperacao({ item: 'cliente', acao: 'cadastrar' }, erro);
      expect(recusa.categoria).toBe('regra');
      expect(textoDaRecusa(recusa)).toEqual({
        titulo: 'É necessário informar pelo menos um cluster.',
        detalhe: 'Selecione um cluster para o cliente e salve novamente.',
      });
    }
  });

  it('remover o último cluster explica a consequência, não a regra', () => {
    const recusa = recusaDeOperacao({ item: 'cluster', acao: 'excluir' }, ERROS_DE_REGRA[2]);
    expect(textoDaRecusa(recusa)).toEqual({
      titulo: 'O cliente precisa permanecer vinculado a pelo menos um cluster.',
      detalhe: 'Vincule outro cluster antes de remover este.',
    });
  });

  it('cluster repetido é reconhecido pelo nome da constraint', () => {
    const recusa = recusaDeOperacao({ item: 'cluster', acao: 'cadastrar' }, ERROS_DE_REGRA[3]);
    expect(recusa.categoria).toBe('regra');
    expect(textoDaRecusa(recusa)).toEqual({
      titulo: 'Este cluster já está vinculado ao cliente.',
      detalhe: 'Remova o item duplicado e salve novamente.',
    });
  });

  it('produto repetido na mesma OS diz qual é a regra (B5)', () => {
    const recusa = recusaDeOperacao({ item: 'produto', acao: 'cadastrar', numeroOs: '1234' }, ERROS_DE_REGRA[4]);
    expect(textoDaRecusa(recusa)).toEqual({
      titulo: 'Este produto já está vinculado à OS.',
      detalhe: 'Remova o item duplicado e salve novamente.',
    });
  });

  it('as duas duplicidades usam a mesma construção', () => {
    const cluster = recusaDeOperacao({ item: 'cluster', acao: 'cadastrar' }, ERROS_DE_REGRA[3]);
    const produto = recusaDeOperacao({ item: 'produto', acao: 'cadastrar' }, ERROS_DE_REGRA[4]);
    expect(textoDaRecusa(cluster).titulo).toMatch(/^Este .+ já está vinculado a/);
    expect(textoDaRecusa(produto).titulo).toMatch(/^Este .+ já está vinculado à/);
    expect(textoDaRecusa(produto).detalhe).toBe(textoDaRecusa(cluster).detalhe);
  });

  it('no salvamento, a regra vem abaixo de "não foi possível salvar", não escondida por ele', () => {
    const recusa = recusaDeOperacao({ item: 'cliente', acao: 'atualizar' }, ERROS_DE_REGRA[1]);
    expect(textoDoSalvamentoRecusado(recusa)).toEqual({
      titulo: 'Não foi possível salvar o cliente.',
      detalhe: 'É necessário informar pelo menos um cluster. Selecione um cluster para o cliente e salve novamente.',
    });
  });

  it('regra desconhecida não inventa causa: cai em falha', () => {
    const erro = { code: '23514', message: 'violates check constraint "alguma_regra_nova"' };
    expect(categoriaDaRecusa(erro)).toBe('falha');
    expect(regraDeNegocioDaRecusa(erro)).toBeNull();
  });

  it('mesma frase sem código de regra não é promovida', () => {
    expect(regraDeNegocioDaRecusa({ message: 'Selecione ao menos 1 cluster' })).toBeNull();
  });
});

describe('mensagem final do salvamento completo', () => {
  it('nomeia a etapa que falhou', () => {
    const recusa = recusaDeOperacao({ item: 'contribuinte', acao: 'cadastrar' }, { code: '23502' });
    expect(mensagemDoSalvamentoRecusado(recusa)).toBe(
      'Não foi possível salvar o cliente.\nOcorreu um problema ao cadastrar o contribuinte. Tente novamente.',
    );
  });

  it('na OS, manda recarregar os dados', () => {
    const recusa = recusaDeOperacao({ item: 'os', acao: 'atualizar', numeroOs: '1234' }, null, { zeroLinhas: true });
    expect(mensagemDoSalvamentoRecusado(recusa)).toBe(
      'Não foi possível salvar o cliente.\nOcorreu um problema ao atualizar a OS 1234. ' +
        'Os dados podem ter sido modificados. Atualize a página e tente novamente.',
    );
  });

  it('na recusa por permissão, diz que o salvamento não aconteceu e qual papel resolve', () => {
    const recusa = recusaDeOperacao(
      { item: 'inscricao', acao: 'atualizar' },
      new RlsPrecheckError({ allowed: false, reason: 'rls_blocked', required_role: 'sublider' }),
    );
    expect(mensagemDoSalvamentoRecusado(recusa)).toBe(
      'Não foi possível salvar o cliente.\n' +
        `Você não tem permissão para atualizar esta inscrição estadual. ${PAPEL}`,
    );
  });

  it('o aviso vem partido em título e detalhe, para o toast não colar as frases', () => {
    const recusa = recusaDeOperacao({ item: 'produto', acao: 'excluir' }, null, { zeroLinhas: true });
    expect(textoDoSalvamentoRecusado(recusa)).toEqual({
      titulo: 'Não foi possível salvar o cliente.',
      detalhe:
        'Ocorreu um problema ao excluir o produto contratado. ' +
        'Os dados podem ter sido modificados. Atualize a página e tente novamente.',
    });
    expect(textoDeRecusa({ item: 'produto', acao: 'excluir' }, 'zero_linhas')).toEqual({
      titulo: 'Não foi possível excluir o produto contratado.',
      detalhe: 'Os dados podem ter sido modificados. Atualize a página e tente novamente.',
    });
  });
});
