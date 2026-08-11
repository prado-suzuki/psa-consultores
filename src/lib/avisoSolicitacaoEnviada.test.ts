import { describe, expect, it } from 'vitest';

import {
  mensagemDoAviso,
  resolverProjetoDoAviso,
  type ProjetoCandidato,
} from '@/lib/avisoSolicitacaoEnviada';

const OS = 'os-1';
const CLIENTE = 'cliente-1';

const projeto = (over: Partial<ProjetoCandidato> = {}): ProjetoCandidato => ({
  id: 'p-1',
  ordem_servico_id: null,
  external_client_id: null,
  ...over,
});

describe('resolverProjetoDoAviso', () => {
  it('resolve pela ordem de servico', () => {
    const alvo = projeto({ id: 'p-os', ordem_servico_id: OS });
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: OS },
      [alvo, projeto({ id: 'p-outro', ordem_servico_id: 'os-outra' })],
    );
    expect(resolvido).toBe('p-os');
  });

  it('resolve pelo cliente quando nao ha projeto com a ordem de servico', () => {
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: OS },
      [projeto({ id: 'p-cliente', external_client_id: CLIENTE })],
    );
    expect(resolvido).toBe('p-cliente');
  });

  it('resolve pelo cliente quando a solicitacao nao tem ordem de servico', () => {
    // Caso previsto em Onboarding.tsx: solicitacao aberta sem OS.
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: null },
      [projeto({ id: 'p-cliente', external_client_id: CLIENTE })],
    );
    expect(resolvido).toBe('p-cliente');
  });

  it('a ordem de servico ganha quando os dois caminhos resolvem', () => {
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: OS },
      [
        projeto({ id: 'p-cliente', external_client_id: CLIENTE }),
        projeto({ id: 'p-os', ordem_servico_id: OS }),
      ],
    );
    expect(resolvido).toBe('p-os');
  });

  it('nao publica quando nenhum caminho resolve', () => {
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: OS },
      [projeto({ id: 'p-alheio', ordem_servico_id: 'os-outra', external_client_id: 'cliente-2' })],
    );
    expect(resolvido).toBeNull();
  });

  it('nao publica quando a lista de candidatos esta vazia', () => {
    // E o caminho de todas as solicitacoes hoje: org_projects e do Tax e a
    // solicitacao e da OSG, entao a leitura nao devolve candidato nenhum.
    expect(resolverProjetoDoAviso({ cliente_id: CLIENTE, ordem_servico_id: OS }, [])).toBeNull();
  });

  it('nao publica quando mais de um projeto tem a mesma ordem de servico', () => {
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: OS },
      [
        projeto({ id: 'p-a', ordem_servico_id: OS }),
        projeto({ id: 'p-b', ordem_servico_id: OS }),
      ],
    );
    expect(resolvido).toBeNull();
  });

  it('nao publica quando mais de um projeto tem o mesmo cliente', () => {
    // Medido no banco: 2 solicitacoes caem exatamente aqui.
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: null },
      [
        projeto({ id: 'p-a', external_client_id: CLIENTE }),
        projeto({ id: 'p-b', external_client_id: CLIENTE }),
      ],
    );
    expect(resolvido).toBeNull();
  });

  it('ambiguidade na ordem de servico nao cai para o caminho do cliente', () => {
    // Publicar na thread errada e pior que nao publicar.
    const resolvido = resolverProjetoDoAviso(
      { cliente_id: CLIENTE, ordem_servico_id: OS },
      [
        projeto({ id: 'p-a', ordem_servico_id: OS }),
        projeto({ id: 'p-b', ordem_servico_id: OS }),
        projeto({ id: 'p-cliente', external_client_id: CLIENTE }),
      ],
    );
    expect(resolvido).toBeNull();
  });
});

describe('mensagemDoAviso', () => {
  it('nao repete o rotulo do evento de sistema', () => {
    const mensagem = mensagemDoAviso();
    expect(mensagem).not.toContain('Documentos solicitados ao cliente');
    expect(mensagem).toContain('enviada ao cliente');
  });
});
