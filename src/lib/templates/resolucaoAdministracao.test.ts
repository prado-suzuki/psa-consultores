/**
 * A resolução da mudança na administração cita o regramento que ESTÁ no contrato.
 *
 * Com órgãos de governança, a cláusula da administração simples sai pela flag e
 * leva a âncora `administracao_social` junto; a resolução que a citava fazia a
 * AC inteira falhar. Os vínculos bloco→flag e a redação nova vêm da migration,
 * que é o que vai ao banco.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gerarBlocos } from './index';
import type { Bloco, Template } from './types';

const MIGRATION = 'supabase/migrations/20260923154552_resolucao_mudanca_administracao_na_governanca.sql';
const sql = readFileSync(MIGRATION, 'utf8');

const RESOLUCAO_SIMPLES = 'ac000001-0000-4000-8000-000000000005';
const RESOLUCAO_GOVERNANCA = '40dd930b-701b-4c6d-821d-b4f6b6d5ae23';

/** Flags que o sandbox tinha antes da migration: só o evento. */
const FLAGS_DO_SANDBOX: Record<string, string[]> = {
  [RESOLUCAO_SIMPLES]: ['evento_mudanca_administracao'],
};

function flagsDaMigration(): Record<string, string[]> {
  const flags: Record<string, string[]> = { ...FLAGS_DO_SANDBOX };
  for (const [, bloco, flag] of sql.matchAll(/\['([0-9a-f-]{36})', '(\w+)'\]/g)) {
    flags[bloco] = [...(flags[bloco] ?? []), flag];
  }
  return flags;
}

const redacaoGovernanca = sql.match(/\$txt\$([\s\S]*?)\$txt\$/)?.[1] ?? '';

function modelo(flags: Record<string, string[]>): Template {
  const blocos: Bloco[] = [
    {
      id: RESOLUCAO_SIMPLES,
      tipo: 'clausula',
      conteudo: 'Altera-se a administração da sociedade, modificando-se as disposições contidas na {{ refs.administracao_social }} do contrato social.',
      flagsRequeridas: flags[RESOLUCAO_SIMPLES],
    },
    {
      id: RESOLUCAO_GOVERNANCA,
      tipo: 'clausula',
      conteudo: redacaoGovernanca,
      flagsRequeridas: flags[RESOLUCAO_GOVERNANCA],
    },
    { id: 'objeto', tipo: 'clausula', conteudo: 'Objeto de {{ sociedade.razaoSocial }}.', obrigatorio: true, reiniciaNumeracao: true },
    { id: 'capitulo', tipo: 'capitulo', conteudo: 'Administração', obrigatorio: true, ancora: 'capituloAdministracao' },
    {
      id: 'administracao-consolidacao',
      tipo: 'clausula',
      conteudo: 'A sociedade é administrada isoladamente por {{ sociedade.razaoSocial }}.',
      flagsRequeridas: ['administracao_simples', 'e_alteracao'],
      ancora: 'administracao_social',
    },
    {
      id: 'governanca-composicao',
      tipo: 'clausula',
      conteudo: 'A sociedade é administrada pelo Conselho e pela Diretoria.',
      flagsRequeridas: ['governanca_por_orgaos'],
    },
  ];
  return { id: 'ac', nome: 'Contrato Social', blocos };
}

const CONTEXTO = { sociedade: { razaoSocial: 'Acme Ltda' } };
const SIMPLES = ['e_alteracao', 'administracao_simples', 'evento_mudanca_administracao'];
const GOVERNANCA = ['e_alteracao', 'governanca_por_orgaos', 'evento_mudanca_administracao'];

const textoDe = (flags: Record<string, string[]>, ativas: string[]) =>
  gerarBlocos(modelo(flags), CONTEXTO, ativas).map((b) => b.conteudo).join('\n');

describe('resolução da mudança na administração', () => {
  it('controle: com os vínculos de antes, a AC com governança falha cedo', () => {
    expect(() => textoDe(FLAGS_DO_SANDBOX, GOVERNANCA))
      .toThrow('Placeholder não resolvido: {{refs.administracao_social}}');
  });

  it('sem governança, cita a cláusula da administração simples', () => {
    const texto = textoDe(flagsDaMigration(), SIMPLES);
    expect(texto).toContain('disposições contidas na Cláusula Segunda do contrato social');
    expect(texto).not.toContain('Capítulo I do contrato social');
  });

  it('com governança, cita o capítulo e não reescreve a administração isolada', () => {
    const texto = textoDe(flagsDaMigration(), GOVERNANCA);
    expect(texto).toContain('disposições contidas no Capítulo I do contrato social');
    expect(texto).not.toContain('administrada isoladamente');
    expect(texto).not.toContain('refs.');
  });
});
