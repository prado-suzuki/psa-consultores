import { describe, it, expect } from 'vitest';
import type { AppRole } from '@/hooks/useUsersWithRoles';
import { SEM_AREA, type AreasPorUsuario } from './acessosPorArea';
import {
  FILTRO_VAZIO,
  contarPorPapel,
  filtrarUsuarios,
  filtroEstaVazio,
  normalizarTexto,
  ordenarUsuarios,
  pesoDoPapel,
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
