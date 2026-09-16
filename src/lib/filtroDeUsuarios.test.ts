import { describe, it, expect } from 'vitest';
import type { AppRole } from '@/hooks/useUsersWithRoles';
import { SEM_AREA, type AreasPorUsuario } from './acessosPorArea';
import {
  FILTRO_VAZIO,
  ORDEM_PADRAO,
  ariaSortDe,
  contarPorPapel,
  filtrarUsuarios,
  filtroEstaVazio,
  normalizarTexto,
  ordenarUsuarios,
  ordenarUsuariosPor,
  pesoDoPapel,
  proximaOrdem,
} from './filtroDeUsuarios';

/* Teste de CARACTERIZAÇÃO: estas funções saíram do `useMemo` da aba"Usuários
   Estrutura" sem mudar de comportamento, e é isso que os casos abaixo travam.
   Se um deles cair numa refatoração futura, a aba de Usuários mudou junto. */

const usuario = (id: string, first: string, last: string, roles: AppRole[]) =>
  ({ id, first_name: first, last_name: last, roles });

const usuarios = [
  usuario('u-hercio', 'Hércio', 'Junior', ['team_member']),
  usuario('u-anne', 'Anne', 'Strini', ['sublider']),
  usuario('u-washington', 'Washington', 'Lima', ['lider']),
  usuario('u-patricia', 'Patricia', 'Melo', ['admin', 'team_member']),
  usuario('u-sem-papel', 'Zulmira', 'Alves', []),
];

const areasPorUsuario: AreasPorUsuario = {
  'u-hercio': [{ id: 'a-tax', name: 'Tax', color: null, color_index: null }],
  'u-anne': [{ id: 'a-osg', name: 'OSG', color: null, color_index: null }],
  'u-washington': [{ id: 'a-tax', name: 'Tax', color: null, color_index: null }],
};

describe('normalizarTexto', () => {
  it('tira acento e caixa, para"hercio" achar"Hércio"', () => {
    expect(normalizarTexto('Hércio')).toBe('hercio');
    expect(normalizarTexto('ÁREA Ç')).toBe('area c');
  });
});

describe('filtrarUsuarios', () => {
  it('sem filtro nenhum devolve a lista inteira', () => {
    expect(filtrarUsuarios(usuarios, FILTRO_VAZIO, areasPorUsuario)).toHaveLength(5);
  });

  it('busca por nome ignora acento e caixa', () => {
    const achados = filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, termo: 'hercio' }, areasPorUsuario);
    expect(achados.map((u) => u.id)).toEqual(['u-hercio']);
  });

  it('busca casa também no sobrenome', () => {
    const achados = filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, termo: 'lima' }, areasPorUsuario);
    expect(achados.map((u) => u.id)).toEqual(['u-washington']);
  });

  it('termo só de espaço não filtra nada', () => {
    expect(filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, termo: '   ' }, areasPorUsuario)).toHaveLength(5);
  });

  it('filtra por papel, e quem tem dois papéis aparece nos dois', () => {
    const admins = filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, papel: 'admin' }, areasPorUsuario);
    expect(admins.map((u) => u.id)).toEqual(['u-patricia']);
    const membros = filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, papel: 'team_member' }, areasPorUsuario);
    expect(membros.map((u) => u.id)).toEqual(['u-hercio', 'u-patricia']);
  });

  it('filtra por área, e `SEM_AREA` traz quem não tem vínculo', () => {
    const tax = filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, areaId: 'a-tax' }, areasPorUsuario);
    expect(tax.map((u) => u.id)).toEqual(['u-hercio', 'u-washington']);
    const sem = filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, areaId: SEM_AREA }, areasPorUsuario);
    expect(sem.map((u) => u.id)).toEqual(['u-patricia', 'u-sem-papel']);
  });

  it('os três filtros se acumulam', () => {
    const achados = filtrarUsuarios(
      usuarios,
      { termo: 'a', papel: 'lider', areaId: 'a-tax' },
      areasPorUsuario,
    );
    expect(achados.map((u) => u.id)).toEqual(['u-washington']);
  });

  it('não muta a lista recebida', () => {
    const copia = [...usuarios];
    filtrarUsuarios(usuarios, { ...FILTRO_VAZIO, papel: 'admin' }, areasPorUsuario);
    expect(usuarios).toEqual(copia);
  });
});

describe('ordenarUsuarios', () => {
  it('hierarquia de papel primeiro, nome depois', () => {
    expect(ordenarUsuarios(usuarios).map((u) => u.id)).toEqual([
      'u-patricia',   // admin
      'u-washington', // lider
      'u-anne',       // sublider
      'u-hercio',     // team_member
      'u-sem-papel',  // nenhum papel vai para o fim
    ]);
  });

  it('quem tem dois papéis é ordenado pelo mais alto', () => {
    expect(pesoDoPapel(usuario('x', 'X', 'Y', ['client', 'admin']))).toBe(0);
  });

  it('desempata por nome com collator pt-BR (acento não joga para o fim)', () => {
    const iguais = [
      usuario('u-z', 'Zulmira', 'A', ['team_member']),
      usuario('u-e', 'Érica', 'B', ['team_member']),
      usuario('u-a', 'Ana', 'C', ['team_member']),
    ];
    expect(ordenarUsuarios(iguais).map((u) => u.id)).toEqual(['u-a', 'u-e', 'u-z']);
  });

  it('não muta a lista recebida', () => {
    const ordem = usuarios.map((u) => u.id);
    ordenarUsuarios(usuarios);
    expect(usuarios.map((u) => u.id)).toEqual(ordem);
  });
});

describe('contarPorPapel', () => {
  it('conta cada papel e traz o total em `all`', () => {
    const contagem = contarPorPapel(usuarios);
    expect(contagem.all).toBe(5);
    expect(contagem.team_member).toBe(2);
    expect(contagem.admin).toBe(1);
    expect(contagem.marketing).toBe(0);
  });

  it('a soma dos papéis pode passar do total — quem tem dois conta nos dois', () => {
    /* No fixture inteiro a soma EMPATA com o total (5), porque a Zulmira sem
       papel nenhum cancela a Patricia que tem dois — o empate é coincidência de
       fixture, não regra. Tirando quem não tem papel, o excesso aparece. */
    const contagem = contarPorPapel(usuarios.filter((u) => u.roles.length > 0));
    const soma = contagem.admin + contagem.lider + contagem.sublider + contagem.team_member
      + contagem.client + contagem.timecliente + contagem.marketing;
    expect(contagem.all).toBe(4);
    expect(soma).toBe(5);
  });
});

describe('filtroEstaVazio', () => {
  it('reconhece o filtro limpo e o termo só de espaço', () => {
    expect(filtroEstaVazio(FILTRO_VAZIO)).toBe(true);
    expect(filtroEstaVazio({ ...FILTRO_VAZIO, termo: '  ' })).toBe(true);
    expect(filtroEstaVazio({ ...FILTRO_VAZIO, papel: 'admin' })).toBe(false);
    expect(filtroEstaVazio({ ...FILTRO_VAZIO, areaId: 'a-tax' })).toBe(false);
  });
});

/* ── A ordenação clicável, acrescentada em 14/09/2026 a pedido dela ──────── */

const comEmail = [
  { id: 'u-c', first_name: 'Carla', last_name: 'Souza', roles: ['team_member'] as AppRole[], email: 'carla@psa.com' },
  { id: 'u-a', first_name: 'Ana', last_name: 'Lima', roles: ['admin'] as AppRole[], email: 'ana@psa.com' },
  { id: 'u-b', first_name: 'Bruno', last_name: 'Dias', roles: ['admin'] as AppRole[], email: 'bruno@psa.com' },
  { id: 'u-s', first_name: 'Zilda', last_name: 'Nunes', roles: [] as AppRole[], email: null },
];
/** "Tem o papel de admin" — o que a coluna Admin da matriz desenha. */
const ehAdmin = (u: (typeof comEmail)[number]) => u.roles.includes('admin');

describe('proximaOrdem', () => {
  it('o ciclo é crescente → decrescente → padrão', () => {
    const um = proximaOrdem(ORDEM_PADRAO, 'nome');
    expect(um).toEqual({ campo: 'nome', coluna: undefined, ascendente: true });
    const dois = proximaOrdem(um, 'nome');
    expect(dois.ascendente).toBe(false);
    expect(proximaOrdem(dois, 'nome')).toEqual(ORDEM_PADRAO);
  });

  it('coluna nova recomeça em crescente, não herda o sentido da anterior', () => {
    const decrescenteNoNome = { campo: 'nome' as const, ascendente: false };
    expect(proximaOrdem(decrescenteNoNome, 'email').ascendente).toBe(true);
  });

  it('duas colunas da matriz são alvos distintos, mesmo com o campo igual', () => {
    const emAdmin = proximaOrdem(ORDEM_PADRAO, 'coluna', 'admin');
    const emMembro = proximaOrdem(emAdmin, 'coluna', 'team_member');
    expect(emMembro).toEqual({ campo: 'coluna', coluna: 'team_member', ascendente: true });
  });
});

describe('ordenarUsuariosPor', () => {
  it('`padrao` é exatamente a ordem de chegada (hierarquia, depois nome)', () => {
    expect(ordenarUsuariosPor(comEmail, ORDEM_PADRAO, ehAdmin).map((u) => u.id)).toEqual(
      ordenarUsuarios(comEmail).map((u) => u.id),
    );
  });

  it('por nome, crescente e decrescente', () => {
    const asc = ordenarUsuariosPor(comEmail, { campo: 'nome', ascendente: true }, ehAdmin);
    expect(asc.map((u) => u.id)).toEqual(['u-a', 'u-b', 'u-c', 'u-s']);
    const desc = ordenarUsuariosPor(comEmail, { campo: 'nome', ascendente: false }, ehAdmin);
    expect(desc.map((u) => u.id)).toEqual(['u-s', 'u-c', 'u-b', 'u-a']);
  });

  it('quem não tem e-mail fica no fim NOS DOIS sentidos — ausente não é menor', () => {
    for (const ascendente of [true, false]) {
      const ordenado = ordenarUsuariosPor(comEmail, { campo: 'email', ascendente }, ehAdmin);
      expect(ordenado[ordenado.length - 1].id).toBe('u-s');
    }
  });

  it('coluna da matriz: o primeiro clique põe QUEM TEM no topo', () => {
    const ordenado = ordenarUsuariosPor(comEmail, { campo: 'coluna', coluna: 'admin', ascendente: true }, ehAdmin);
    expect(ordenado.slice(0, 2).map((u) => u.id)).toEqual(['u-a', 'u-b']);
  });

  it('coluna da matriz, decrescente: quem não tem no topo', () => {
    const ordenado = ordenarUsuariosPor(comEmail, { campo: 'coluna', coluna: 'admin', ascendente: false }, ehAdmin);
    expect(ordenado.slice(0, 2).map((u) => u.id)).toEqual(['u-c', 'u-s']);
  });

  it('DENTRO do bloco a ordem é o nome — sem isso a tabela pareceria instável', () => {
    // `comEmail` chega com Carla antes de Ana; ordenar por coluna não pode
    // deixar o bloco "tem admin" na ordem de chegada.
    const ordenado = ordenarUsuariosPor(comEmail, { campo: 'coluna', coluna: 'admin', ascendente: true }, ehAdmin);
    expect(ordenado.map((u) => u.first_name)).toEqual(['Ana', 'Bruno', 'Carla', 'Zilda']);
  });

  it('ordenar é estável entre chamadas com entrada embaralhada', () => {
    const ordem = { campo: 'coluna' as const, coluna: 'admin', ascendente: true };
    const umaVez = ordenarUsuariosPor(comEmail, ordem, ehAdmin).map((u) => u.id);
    const embaralhado = [comEmail[3], comEmail[1], comEmail[2], comEmail[0]];
    expect(ordenarUsuariosPor(embaralhado, ordem, ehAdmin).map((u) => u.id)).toEqual(umaVez);
  });

  it('não muta a lista recebida', () => {
    const antes = comEmail.map((u) => u.id);
    ordenarUsuariosPor(comEmail, { campo: 'nome', ascendente: false }, ehAdmin);
    expect(comEmail.map((u) => u.id)).toEqual(antes);
  });
});

describe('ariaSortDe', () => {
  it('só a coluna ativa anuncia sentido; as outras dizem "none"', () => {
    const ordem = { campo: 'coluna' as const, coluna: 'admin', ascendente: true };
    expect(ariaSortDe(ordem, 'coluna', 'admin')).toBe('ascending');
    expect(ariaSortDe(ordem, 'coluna', 'client')).toBe('none');
    expect(ariaSortDe(ordem, 'nome')).toBe('none');
    expect(ariaSortDe({ ...ordem, ascendente: false }, 'coluna', 'admin')).toBe('descending');
  });

  it('no padrão, nenhuma coluna anuncia ordenação', () => {
    expect(ariaSortDe(ORDEM_PADRAO, 'nome')).toBe('none');
    expect(ariaSortDe(ORDEM_PADRAO, 'coluna', 'admin')).toBe('none');
  });
});
