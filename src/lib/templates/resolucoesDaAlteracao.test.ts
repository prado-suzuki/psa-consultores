/**
 * A redação das resoluções da alteração contratual, lida das MIGRATIONS que a
 * levam ao banco e renderizada pelo motor. Texto copiado para o teste envelhece
 * sozinho; o que precisa ser guardado é o que vai ao banco.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarComposicao } from './index';
import { removerMarcas } from './marcas';
import type { Bloco, Contexto } from './types';

/** As tuplas (bloco, texto antigo, texto novo) de uma migration de redação. */
function redacoes(arquivo: string): Map<string, { antigo: string; novo: string }> {
  const sql = readFileSync(`supabase/migrations/${arquivo}`, 'utf8');
  const tuplas = sql.matchAll(
    /'([0-9a-f-]{36})'::uuid,\s*\$txt\$([\s\S]*?)\$txt\$,\s*\$txt\$([\s\S]*?)\$txt\$/g,
  );
  return new Map([...tuplas].map(([, id, antigo, novo]) => [id, { antigo, novo }]));
}

/** Bloco sem flag só entra na composição quando é obrigatório. */
function renderizar(blocos: Bloco[], ctx: Contexto, flags: string[] = []): string[] {
  const compostos = blocos.map((b) => (b.flagsRequeridas?.length ? b : { obrigatorio: true, ...b }));
  const { blocos: gerados } = gerarComposicao({ id: 't', nome: 't', blocos: compostos }, ctx, flags);
  return gerados.map((b) => removerMarcas(b.conteudo));
}

describe('a lista de usufrutos é anunciada, e não colada à frase de abertura', () => {
  const textos = redacoes('20260923155427_uso_e_gozo_antes_da_lista_de_usufrutos.sql');
  const usufruto = {
    ordemRomana: 'i', quotas: '184.716', quotasExtenso: 'cento e oitenta e quatro mil, setecentas e dezesseis',
    usufrutuarioNomes: 'Lucas Nogueira e Marina Salgado',
  };
  const nuProprietario = { nomeMaiusculo: 'HEITOR CARDOSO', qualificacao: 'brasileiro' };

  it('reserva de usufruto: "uso e gozo, nos seguintes termos: i) sobre"', () => {
    const { novo } = textos.get('10445d6c-973e-47cb-b7fc-9d8d100f4d8a')!;
    const [texto] = renderizar(
      [{ id: 'r', tipo: 'livre', conteudo: novo }],
      { usufrutos: [{ usufruto, nuProprietario, comVoto: true, semVoto: false }] },
    );
    expect(texto).not.toContain('gozoi)');
    expect(texto).toContain('direitos de uso e gozo, nos seguintes termos: i) sobre 184.716');
  });

  it('instituição de usufruto: "mesma titularidade, nos seguintes termos: i) HEITOR"', () => {
    const { novo } = textos.get('bbaeb5b3-810d-49a7-822a-917873a4d671')!;
    const [texto] = renderizar(
      [{ id: 'r', tipo: 'livre', conteudo: novo }],
      { usufrutosInstituidos: [{ usufruto, nuProprietario, comVoto: true, semVoto: false }] },
    );
    expect(texto).not.toContain('titularidadei)');
    expect(texto).toContain('a mesma titularidade, nos seguintes termos: i) HEITOR CARDOSO');
  });

  it('a guarda confere o texto corrompido que o banco tem hoje', () => {
    for (const { antigo, novo } of textos.values()) {
      expect(antigo).toMatch(/(gozo|titularidade)\{\{#usufrutos/);
      expect(novo).not.toMatch(/(gozo|titularidade)\{\{#usufrutos/);
    }
  });
});

describe('toda resolução sai numerada na série das resoluções', () => {
  const sql = readFileSync('supabase/migrations/20260923155611_resolucoes_livres_viram_clausulas.sql', 'utf8');
  const rubricas = new Map(
    [...sql.matchAll(/'([0-9a-f-]{36})'::uuid, \$r\$([\s\S]*?)\$r\$/g)].map(([, id, r]) => [id, r]),
  );

  it('cobre as resoluções que ainda eram livres: qualificação, doação, usufruto e governança', () => {
    expect([...rubricas.keys()].sort()).toEqual([
      '01a20156-0ae5-4011-9919-d50b3b9e852b',
      '10445d6c-973e-47cb-b7fc-9d8d100f4d8a',
      '17bf4288-6490-40e8-8c68-9cf9be3a7507',
      '22d227a0-0b64-4932-b2db-0388f893d587',
      '82259dcd-a840-496a-add7-2e54f0f3f87f',
      '9009b16c-639f-43b0-96a0-d056c2488f14',
      'ac000001-0000-4000-8000-000000000007',
      'bbaeb5b3-810d-49a7-822a-917873a4d671',
      'c25643d9-f920-4b25-975f-5902a48ddf0e',
    ]);
    expect(sql).toContain("set tipo = 'clausula'");
  });

  it('a doação numera como a cessão, e o consolidado recomeça na Cláusula Primeira', () => {
    const doacao = [
      '9009b16c-639f-43b0-96a0-d056c2488f14',
      '10445d6c-973e-47cb-b7fc-9d8d100f4d8a',
      '82259dcd-a840-496a-add7-2e54f0f3f87f',
      '17bf4288-6490-40e8-8c68-9cf9be3a7507',
      'c25643d9-f920-4b25-975f-5902a48ddf0e',
    ];
    // O que a migration grava: o texto vigente sem a rubrica.
    const resolucoes: Bloco[] = doacao.map((id, i) => {
      const rubrica = rubricas.get(id)!;
      const vigente = `${rubrica}Texto da resolução ${i + 1}.`;
      return { id, tipo: 'clausula', conteudo: vigente.slice(rubrica.length) };
    });
    const textos = renderizar([
      { id: 'secao', tipo: 'livre', conteudo: 'DAS ALTERAÇÕES CONTRATUAIS' },
      ...resolucoes,
      { id: 'ratificacao', tipo: 'clausula', conteudo: 'As demais cláusulas permanecem.' },
      { id: 'consolidacao', tipo: 'clausula', conteudo: 'Os sócios resolvem consolidar.' },
      { id: 'cabecalho', tipo: 'livre', conteudo: 'Cabeçalho da consolidação', reiniciaNumeracao: true },
      { id: 'denominacao', tipo: 'clausula', conteudo: 'A sociedade gira sob o nome X.' },
    ], {});

    expect(textos.slice(1, 6)).toEqual([
      'CLÁUSULA PRIMEIRA: Texto da resolução 1.',
      'CLÁUSULA SEGUNDA: Texto da resolução 2.',
      'CLÁUSULA TERCEIRA: Texto da resolução 3.',
      'CLÁUSULA QUARTA: Texto da resolução 4.',
      'CLÁUSULA QUINTA: Texto da resolução 5.',
    ]);
    expect(textos[6]).toBe('CLÁUSULA SEXTA: As demais cláusulas permanecem.');
    expect(textos.at(-1)).toBe('CLÁUSULA PRIMEIRA: A sociedade gira sob o nome X.');
  });
});
