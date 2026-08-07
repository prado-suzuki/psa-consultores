import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BlocoComVersao, BlocoVersaoRow } from '@/hooks/useBibliotecaModelos';
import { FichaBloco } from './FichaBloco';

// As fixtures seguem a família que está no banco (supabase/migrations/
// 20260806140000_seed_familia_descricao_imovel.sql): cabeça sem versão, sem flag e
// sem repete_colecao, variantes tipo 'livre' em v1, seletor com os caminhos
// imovel.rural/urbano/inteiro/fracionado/posse, e a ordem 1 é a de direitos.

const versao = (conteudo: string, numero_versao = 1): BlocoVersaoRow =>
  ({ id: `v-${numero_versao}`, conteudo, numero_versao, atual: true }) as unknown as BlocoVersaoRow;

const bloco = (over: Partial<BlocoComVersao> = {}): BlocoComVersao =>
  ({
    id: 'bloco-1',
    nome: 'Bloco',
    tipo: 'paragrafo',
    categoria: 'capital',
    descricao: null,
    ativo: true,
    repete_colecao: null,
    ancora: null,
    familia_id: null,
    variante_seletor: null,
    variante_rotulo: null,
    variante_ordem: null,
    versao_atual: null,
    flag_ids: [],
    variantes: [],
    ...over,
  }) as BlocoComVersao;

const variante = (
  ordem: number,
  rotulo: string,
  seletor: Record<string, unknown>,
  conteudo: string | null,
  over: Partial<BlocoComVersao> = {},
): BlocoComVersao =>
  bloco({
    id: `variante-${ordem}`,
    nome: `Descrição de imóvel: ${rotulo}`,
    tipo: 'livre',
    familia_id: 'bloco-1',
    variante_rotulo: rotulo,
    variante_seletor: seletor,
    variante_ordem: ordem,
    versao_atual: conteudo ? versao(conteudo) : null,
    ...over,
  });

const DESCRICAO_FAMILIA =
  'Família de variantes: uma redação por caso de imóvel (rural x urbano, exclusiva x condomínio, propriedade x direitos). Quem monta o modelo referencia esta cabeça; a variante é escolhida por imóvel na geração.';

const VARIANTES = [
  variante(
    1,
    'Direitos de escritura não averbada',
    { 'imovel.posse': 'sim' },
    'Um imóvel rural com área de {{ imovel.area }}, de posse/propriedade de {{ imovel.proprietario }}, cujos direitos e créditos são provenientes de Contrato de Promessa de Venda e Compra firmado em {{ imovel.promessaData }}.',
  ),
  variante(
    2,
    'Rural, propriedade exclusiva',
    { 'imovel.rural': 'sim', 'imovel.inteiro': 'sim' },
    'Um imóvel rural com área de {{ imovel.area }}, denominado {{ imovel.denominacao }}, de propriedade de {{ imovel.proprietario }}, inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}.',
  ),
  variante(
    3,
    'Rural, condomínio',
    { 'imovel.rural': 'sim', 'imovel.fracionado': 'sim' },
    '{{ imovel.percentual }} de um imóvel rural denominado {{ imovel.denominacao }}. A área remanescente é dos seguintes condôminos: {{ imovel.remanescente }}.',
  ),
];

const cabeca = (variantes = VARIANTES, over: Partial<BlocoComVersao> = {}) =>
  bloco({
    nome: 'Descrição de imóvel',
    descricao: DESCRICAO_FAMILIA,
    variantes,
    ...over,
  });

const renderFicha = (b: BlocoComVersao, props: { varianteDestaqueId?: string } = {}) => {
  const onEditar = vi.fn();
  const onToggleAtivo = vi.fn();
  const arvore = (p: { varianteDestaqueId?: string }) => (
    <FichaBloco
      bloco={b}
      tipo="paragrafo"
      nomeDaFlag={new Map()}
      delay={0}
      onEditar={onEditar}
      onToggleAtivo={onToggleAtivo}
      {...p}
    />
  );
  const { rerender } = render(arvore(props));
  const carta = screen.getByText(b.nome).closest('[role="button"]') as HTMLElement;
  return {
    carta,
    onEditar,
    onToggleAtivo,
    /** Re-renderiza com outro destaque (busca casando outra variante, ou busca apagada). */
    rerenderCom: (p: { varianteDestaqueId?: string }) => rerender(arvore(p)),
  };
};

/** Abre o HoverCard de prévia pelo foco na carta (o mesmo caminho do teclado). */
const abrirPrevia = async (carta: HTMLElement) => {
  carta.focus();
  fireEvent.focus(carta);
  await waitFor(() => expect(screen.getByText('Prévia do texto')).toBeInTheDocument());
  return folhaAberta();
};

const folhaAberta = () => screen.getByText('Prévia do texto').closest('div')!.parentElement as HTMLElement;

describe('FichaBloco', () => {
  describe('bloco sem família', () => {
    it('renderiza a ficha de sempre, sem nenhum cromo de deck', () => {
      renderFicha(bloco({ nome: 'Cláusula do objeto', versao_atual: versao('Texto simples do bloco.') }));

      expect(screen.getByText('Cláusula do objeto')).toBeInTheDocument();
      expect(screen.getByText('Texto simples do bloco.')).toBeInTheDocument();
      expect(screen.queryByLabelText('Próxima variante')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Variante anterior')).not.toBeInTheDocument();
      expect(screen.queryByText(/de 3$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/variantes$/)).not.toBeInTheDocument();
    });

    it('bloco sem conteúdo continua com o vazio antigo, sem falar de variante', async () => {
      const { carta } = renderFicha(bloco({ nome: 'Cláusula vazia' }));

      // A carta do bloco normal sem texto não ganha linha de explicação nenhuma.
      expect(screen.queryByText('esta variante ainda não tem versão publicada')).not.toBeInTheDocument();

      const previa = await abrirPrevia(carta);
      expect(within(previa).getByText('sem conteúdo')).toBeInTheDocument();
      expect(within(previa).queryByText('esta variante ainda não tem versão publicada')).not.toBeInTheDocument();
    });

    it('família sem variantes cadastradas continua sendo uma ficha normal', () => {
      renderFicha(cabeca([], { versao_atual: versao('Texto da cabeça, {{ imovel.nome }}.') }));

      expect(screen.queryByLabelText('Próxima variante')).not.toBeInTheDocument();
      expect(screen.queryByText(/variantes$/)).not.toBeInTheDocument();
      // Sem variante para exibir, a descrição da cabeça volta a ser o resumo.
      expect(screen.getByText(DESCRICAO_FAMILIA)).toBeInTheDocument();
    });
  });

  describe('cabeça de família', () => {
    it('vira deck: contagem, posição, rótulo e seletor da variante da frente', () => {
      renderFicha(cabeca());

      expect(screen.getByText('3 variantes')).toBeInTheDocument();
      expect(screen.getByText('1 de 3')).toBeInTheDocument();
      expect(screen.getByText('Direitos de escritura não averbada')).toBeInTheDocument();
      expect(screen.getByText('imovel.posse')).toBeInTheDocument();
      expect(screen.getByText('sim')).toBeInTheDocument();
      // O resumo é o texto da variante; a descrição da cabeça segue visível, em linha própria.
      expect(screen.getByText(/de posse\/propriedade de ____/)).toBeInTheDocument();
      expect(screen.getByText(DESCRICAO_FAMILIA)).toBeInTheDocument();
    });

    it('avança e volta pelas setas, e dá a volta nos dois extremos', async () => {
      const user = userEvent.setup();
      const { onEditar } = renderFicha(cabeca());

      await user.click(screen.getByLabelText('Próxima variante'));
      expect(screen.getByText('2 de 3')).toBeInTheDocument();
      expect(screen.getByText('Rural, propriedade exclusiva')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Próxima variante'));
      expect(screen.getByText('3 de 3')).toBeInTheDocument();

      // Extremo direito: volta para a primeira.
      await user.click(screen.getByLabelText('Próxima variante'));
      expect(screen.getByText('1 de 3')).toBeInTheDocument();

      // Extremo esquerdo: cai na última.
      await user.click(screen.getByLabelText('Variante anterior'));
      expect(screen.getByText('3 de 3')).toBeInTheDocument();
      expect(screen.getByText('Rural, condomínio')).toBeInTheDocument();

      // Ciclar é navegação local: não abre o editor do bloco.
      expect(onEditar).not.toHaveBeenCalled();
    });

    it('cicla pelas setas do teclado quando a carta tem foco', async () => {
      const user = userEvent.setup();
      const { carta, onEditar } = renderFicha(cabeca());

      carta.focus();
      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('2 de 3')).toBeInTheDocument();

      await user.keyboard('{ArrowLeft}{ArrowLeft}');
      expect(screen.getByText('3 de 3')).toBeInTheDocument();
      expect(onEditar).not.toHaveBeenCalled();

      // Enter continua abrindo o editor.
      await user.keyboard('{Enter}');
      expect(onEditar).toHaveBeenCalledTimes(1);
    });

    it('Enter com foco na seta cicla, não abre o editor', async () => {
      const user = userEvent.setup();
      const { onEditar } = renderFicha(cabeca());

      screen.getByLabelText('Próxima variante').focus();
      await user.keyboard('{Enter}');
      expect(screen.getByText('2 de 3')).toBeInTheDocument();
      expect(onEditar).not.toHaveBeenCalled();

      screen.getByLabelText('Variante anterior').focus();
      await user.keyboard('[Space]');
      expect(screen.getByText('1 de 3')).toBeInTheDocument();
      expect(onEditar).not.toHaveBeenCalled();
    });

    it('o botão de ativar/desativar não abre o editor, no clique nem no Enter', async () => {
      const user = userEvent.setup();
      const { onEditar, onToggleAtivo } = renderFicha(cabeca());

      await user.click(screen.getByTitle('Desativar'));
      expect(onToggleAtivo).toHaveBeenCalledTimes(1);
      expect(onEditar).not.toHaveBeenCalled();

      screen.getByTitle('Desativar').focus();
      await user.keyboard('{Enter}');
      expect(onToggleAtivo).toHaveBeenCalledTimes(2);
      expect(onEditar).not.toHaveBeenCalled();
    });

    it('a prévia acompanha a variante selecionada', async () => {
      const user = userEvent.setup();
      const { carta } = renderFicha(cabeca());

      const previa = await abrirPrevia(carta);
      expect(within(previa).getByText(/Direitos de escritura não averbada/)).toBeInTheDocument();
      expect(within(previa).getByText(/1 de 3 · v1/)).toBeInTheDocument();
      expect(within(previa).queryByText('imovel.ccir')).not.toBeInTheDocument();

      // Ciclagem pelo teclado: clicar na seta tira o foco da carta e o HoverCard
      // do Radix fecha no blur, então a prévia aberta se navega pelas setas.
      await user.keyboard('{ArrowRight}');

      const previa2 = folhaAberta();
      expect(within(previa2).getByText(/Rural, propriedade exclusiva/)).toBeInTheDocument();
      expect(within(previa2).getByText(/2 de 3 · v1/)).toBeInTheDocument();
      // O campo aparece como chip no corpo e como campo do rodapé da folha.
      expect(within(previa2).getAllByText('imovel.ccir')).toHaveLength(2);
    });

    it('abre na variante em destaque (busca ou deep-link) e depois cicla normalmente', async () => {
      const user = userEvent.setup();
      renderFicha(cabeca(), { varianteDestaqueId: 'variante-3' });

      expect(screen.getByText('3 de 3')).toBeInTheDocument();
      expect(screen.getByText('Rural, condomínio')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Próxima variante'));
      expect(screen.getByText('1 de 3')).toBeInTheDocument();
    });

    it('destaque inexistente não move o deck', async () => {
      const user = userEvent.setup();
      const { rerenderCom } = renderFicha(cabeca(), { varianteDestaqueId: 'nao-existe' });
      expect(screen.getByText('1 de 3')).toBeInTheDocument();

      await user.click(screen.getByLabelText('Próxima variante'));
      rerenderCom({ varianteDestaqueId: 'tambem-nao-existe' });
      expect(screen.getByText('2 de 3')).toBeInTheDocument();
    });

    it('destaque apagado (busca limpa) não puxa o deck de volta nem desfaz a navegação manual', async () => {
      const user = userEvent.setup();
      const { rerenderCom } = renderFicha(cabeca(), { varianteDestaqueId: 'variante-2' });
      expect(screen.getByText('2 de 3')).toBeInTheDocument();

      // A pessoa avança para comparar com a carta seguinte...
      await user.click(screen.getByLabelText('Próxima variante'));
      expect(screen.getByText('3 de 3')).toBeInTheDocument();

      // ...e apaga a busca: sem destaque, a carta da frente continua a escolhida.
      rerenderCom({});
      expect(screen.getByText('3 de 3')).toBeInTheDocument();
    });

    it('destaque que muda de variante salta para a nova', () => {
      const { rerenderCom } = renderFicha(cabeca(), { varianteDestaqueId: 'variante-2' });
      expect(screen.getByText('2 de 3')).toBeInTheDocument();

      rerenderCom({ varianteDestaqueId: 'variante-3' });
      expect(screen.getByText('3 de 3')).toBeInTheDocument();
    });
  });

  describe('estados vazios e variante inativa', () => {
    it('variante sem versão atual diz o que falta, na carta e na prévia', async () => {
      const semVersao = variante(1, 'Direitos de escritura não averbada', { 'imovel.posse': 'sim' }, null);
      const { carta } = renderFicha(cabeca([semVersao]));

      expect(screen.getByText('esta variante ainda não tem versão publicada')).toBeInTheDocument();
      expect(screen.getByText('1 de 1')).toBeInTheDocument();

      const previa = await abrirPrevia(carta);
      expect(within(previa).getByText('esta variante ainda não tem versão publicada')).toBeInTheDocument();
      expect(within(previa).getByText(/1 de 1 · v—/)).toBeInTheDocument();
    });

    it('variante sem rótulo e com seletor vazio se explica como padrão', () => {
      renderFicha(cabeca([variante(9, '', {}, 'Redação padrão.')]));

      expect(screen.getByText('variante sem rótulo')).toBeInTheDocument();
      expect(screen.getByText('variante padrão')).toBeInTheDocument();
    });

    it('a família anuncia a variante inativa mesmo com carta ativa na frente', () => {
      const inativa = variante(3, 'Rural, condomínio', { 'imovel.fracionado': 'sim' }, 'Texto em condomínio.', {
        ativo: false,
      });
      renderFicha(cabeca([VARIANTES[0], VARIANTES[1], inativa]));

      // Sinal da família: não depende de ciclar até a carta desligada.
      expect(screen.getByText('1 de 3 inativas')).toBeInTheDocument();
      expect(screen.queryByText('variante inativa')).not.toBeInTheDocument();
    });

    it('variante desativada se anuncia na carta da frente', async () => {
      const user = userEvent.setup();
      const inativa = variante(
        2,
        'Rural, propriedade exclusiva',
        { 'imovel.rural': 'sim' },
        'Um imóvel rural desativado.',
        { ativo: false },
      );
      renderFicha(cabeca([VARIANTES[0], inativa]));

      // Na primeira carta (ativa) nada de badge.
      expect(screen.queryByText('variante inativa')).not.toBeInTheDocument();

      await user.click(screen.getByLabelText('Próxima variante'));
      expect(screen.getByText('variante inativa')).toBeInTheDocument();
      // A cabeça segue ativa: quem está desligada é a redação da frente.
      expect(screen.queryByText('inativo')).not.toBeInTheDocument();
    });
  });
});
