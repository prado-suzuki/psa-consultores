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
