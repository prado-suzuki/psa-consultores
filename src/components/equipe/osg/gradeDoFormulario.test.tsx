import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PessoaDadosTab } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import { FORM_GRID_MIN_PX, formGridCls, formScopeCls, formSpanCls } from '@/lib/osgFormGrid';
import { emptyPessoaDraft } from '@/lib/pessoaModalModel';

/**
 * Trava do conserto das grades: o formulário passou a decidir o número de colunas
 * pela largura do CONTÊINER. O que importa não regredir é o modal largo — 848px
 * de contêiner (max-w-4xl com px-6), acima do limite, portanto multi-coluna como
 * sempre foi — e a coluna estreita de 384px, que precisa de uma coluna limpa,
 * sem col-span pedindo coluna que não existe.
 */

const LARGURA_DO_MODAL = 848;
const LARGURA_DA_COLUNA_ESTREITA = 384;

const FORMULARIOS = [
  'src/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab.tsx',
  'src/components/equipe/osg/diagnostico-patrimonial/bem/BemDadosTab.tsx',
  'src/components/equipe/osg/diagnostico-patrimonial/matricula/MatriculaDadosTab.tsx',
  'src/components/equipe/osg/diagnostico-patrimonial/titularidade/TitularInicialSection.tsx',
];

const HOSPEDEIROS = [
  'src/components/equipe/osg/qualificacao-das-partes/PessoaModal.tsx',
  'src/components/equipe/osg/diagnostico-patrimonial/BemModal.tsx',
  'src/components/equipe/osg/diagnostico-patrimonial/MatriculaModal.tsx',
  'src/components/equipe/osg/documentos/classificar/FichaColuna.tsx',
];

describe('limite de coluna', () => {
  it('fica entre a coluna estreita e o modal largo', () => {
    expect(FORM_GRID_MIN_PX).toBeGreaterThan(LARGURA_DA_COLUNA_ESTREITA);
    expect(FORM_GRID_MIN_PX).toBeLessThan(LARGURA_DO_MODAL);
  });

  it('gera classes de contêiner, não de janela', () => {
    expect(formScopeCls).toBe('@container');
    expect(formGridCls(3)).toBe('grid grid-cols-1 @2xl:grid-cols-3');
    expect(formSpanCls(2)).toBe('@2xl:col-span-2');
  });
});

describe('formulários de cadastro', () => {
  it.each(FORMULARIOS)('%s não decide colunas por breakpoint de janela', (arquivo) => {
    const fonte = readFileSync(arquivo, 'utf8');
    expect(fonte).not.toMatch(/md:grid-cols-\d/);
    expect(fonte).not.toMatch(/md:col-span-\d/);
    expect(fonte).toMatch(/formGridCls\(/);
  });

  it.each(HOSPEDEIROS)('%s declara o contêiner de consulta', (arquivo) => {
    expect(readFileSync(arquivo, 'utf8')).toMatch(/formScopeCls/);
  });
});

describe('PessoaDadosTab renderizado', () => {
  const renderTab = () =>
    render(
      <PessoaDadosTab
        draft={{ ...emptyPessoaDraft(), tipo_pessoa: 'PF' }}
        setDraft={vi.fn()}
        pessoaCandidates={[]}
        parenteCandidates={[]}
        parentesco={{ parenteId: '', tipo: '', natureza: '' }}
        setParentesco={vi.fn()}
      />,
    );

  it('toda grade cai para uma coluna e sobe pelo contêiner', () => {
    const { container } = renderTab();
    const grades = Array.from(container.querySelectorAll('.grid'));
    expect(grades.length).toBeGreaterThan(0);
    for (const grade of grades) {
      const classes = grade.className;
      expect(classes).toContain('grid-cols-1');
      expect(classes).toMatch(/@2xl:grid-cols-\d/);
      expect(classes).not.toMatch(/\bmd:grid-cols-\d/);
    }
  });

  it('nenhum campo largo cria coluna fantasma na coluna estreita', () => {
    const { container } = renderTab();
    const largos = Array.from(container.querySelectorAll('[class*="col-span-"]'));
    expect(largos.length).toBeGreaterThan(0);
    for (const campo of largos) {
      // O span só vale acima do limite do contêiner; sem prefixo ele valeria sempre.
      expect(campo.className).toMatch(/@2xl:col-span-\d/);
      expect(campo.className).not.toMatch(/(^|\s)col-span-\d/);
    }
  });
});
