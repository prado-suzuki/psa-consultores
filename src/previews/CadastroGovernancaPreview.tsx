/**
 * Mockup do cadastro de governança — EDU-14.
 *
 * Tela de mentira: nada salva, nada consulta banco, nada valida. Serve para a
 * consultoria olhar e dizer o que falta, o que sobra e se o nome está certo,
 * antes de existir código de produção.
 *
 * Não tem rota no `App.tsx` de propósito. Abre por
 * `/mockup-cadastro-governanca.html`, no mesmo molde da prévia do Sísifo.
 *
 * COMPOSIÇÃO: é LISTA mais MODAL, e não uma página de formulário. Foi a correção
 * pedida: a tela lista os itens de governança do cliente, com o estado de
 * preenchimento de cada um, e o formulário só existe dentro do modal que abre ao
 * clicar — o mesmo desenho dos cadastros de cliente, matrícula, bem e pessoa. Os
 * grupos da lista são o DESTINO do documento, então o único item interno (o
 * Protocolo de Remuneração) não fica mais no meio dos que viram cláusula.
 *
 * O conteúdo de cada item está em `cadastroGovernancaItens.tsx`, as peças de
 * apresentação em `cadastroGovernancaUi.tsx` e os campos em
 * `cadastroGovernancaDados.ts`. A origem de cada campo está documentada em
 * `docs/osg/campos-governanca.md`.
 */
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { ITENS } from './cadastroGovernancaItens';
import { MolduraOsgWork } from './cadastroGovernancaMoldura';
import {
  CartaoItem, EtiquetaOrigem, Explicando, GrupoItens, ModalItem,
} from './cadastroGovernancaUi';
import '@/index.css';

const GRUPOS = [
  {
    titulo: 'Parâmetros do cliente',
    explica: 'Não geram documento. São a base que os itens abaixo consomem.',
    destino: 'base' as const,
  },
  {
    titulo: 'Vão para o contrato social',
    explica: 'O que for preenchido aqui vira cláusula e é registrado na Junta Comercial.',
    destino: 'contrato' as const,
  },
  {
    titulo: 'Fica interno',
    explica: 'Documento da família. Não é registrado, e só a remuneração global desce ao contrato.',
    destino: 'interno' as const,
  },
];

export const CadastroGovernancaPreview = () => {
  const [explicando, setExplicando] = useState(true);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const aberto = ITENS.find((i) => i.id === abertoId);

  // O modal sai por portal, direto no `body`, então o tema não pode estar só no
  // `main`: as superfícies da OSG são definidas DENTRO de `.osg-theme` no
  // `index.css`. É o que o `OsgLayout` faz no app.
  useEffect(() => {
    document.documentElement.classList.add('osg-theme');
    return () => document.documentElement.classList.remove('osg-theme');
  }, []);

  const documentos = ITENS.filter((i) => i.destino !== 'base');
  const feitos = documentos.filter((i) => i.preenchido).length;

  return (
    <Explicando.Provider value={explicando}>
      <div className="osg-theme font-sans text-foreground">
        <MolduraOsgWork
          titulo="Cadastro de Governança"
          subtitulo={`${feitos} de ${documentos.length} documentos preenchidos · mockup, nada aqui funciona`}
          acoes={
            <button
              type="button"
              onClick={() => setExplicando((v) => !v)}
              className="rounded-md border border-osg-moss bg-osg-moss/10 px-3 py-1.5 text-[12px] font-semibold text-osg-moss"
            >
              {explicando ? 'esconder explicações' : 'explicar campos'}
            </button>
          }
        >
          <p className="max-w-[92ch] text-[13px] leading-relaxed text-osg-500">
            É um <strong className="font-semibold">cadastro</strong>, não um documento: cada item
            guarda os parâmetros de governança deste cliente, e os documentos saem depois pela tela
            Gerar Documento. Clique num item para preencher.
          </p>

          {/* Legenda das origens e das duas etiquetas de campo. Fica na tela de fora
              porque vale para todos os modais. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-osg-500">
            <span className="flex items-center gap-1.5">
              <EtiquetaOrigem origem="existe" /> o sistema já guarda
            </span>
            <span className="flex items-center gap-1.5">
              <EtiquetaOrigem origem="derivado" /> sai de outro campo
            </span>
            <span className="flex items-center gap-1.5">
              <EtiquetaOrigem origem="novo" /> precisa ser criado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded-full border border-osg-moss/40 bg-osg-moss/[0.07] px-2 py-0.5 text-[10.5px] leading-tight text-osg-moss">
                vira cláusula
              </span>
              o campo é registrado no contrato social
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">inteiro</span>
              o tipo do campo, que o gerador usa para escrever o número por extenso
            </span>
          </div>

          {GRUPOS.map((g) => (
            <GrupoItens key={g.destino} titulo={g.titulo} explica={g.explica}>
              {ITENS.filter((i) => i.destino === g.destino).map((item) => (
                <CartaoItem key={item.id} item={item} onAbrir={() => setAbertoId(item.id)} />
              ))}
            </GrupoItens>
          ))}

          <footer className="mt-12 flex flex-col gap-3 border-t border-osg-100 pt-5 text-[13px] text-osg-500">
            {/*
              Achado medido no próprio modelo VF: das 14 palavras do vocabulário,
              12 aparecem nas 21 linhas e duas não aparecem em nenhuma. Ou a
              consultoria usa em cliente que não estava na amostra, ou o
              vocabulário tem sobra.
            */}
            <p className="max-w-[76ch]">
              <strong className="font-semibold">Duas palavras do vocabulário podem estar
              sobrando.</strong>{' '}
              Contamos as 21 linhas do modelo: <em>garante</em> e{' '}
              <em>fornece informações</em> não aparecem em nenhuma célula. Vocês usam essas duas em
              algum cliente, ou elas podem sair da lista?
            </p>
            <p className="max-w-[76ch]">
              <strong className="font-semibold">Duas decisões que dependem de vocês.</strong>{' '}
              Primeira: a lista de órgãos do item A é fixa ou sai da estrutura de cada cliente?
              Segunda: o Diagnóstico produz três coisas que não estão em documento nenhum, a
              qualidade que une os sócios, o organograma macro e os interesses profissionais de cada
              um. Elas entram como texto livre no cadastro ou ficam fora?
            </p>
            <p className="max-w-[76ch] text-osg-300">
              Cliente fictício; a estrutura é a dos documentos reais. Nada aqui salva, consulta ou
              valida.
            </p>
          </footer>
        </MolduraOsgWork>
      </div>
      {aberto && <ModalItem item={aberto} onFechar={() => setAbertoId(null)} />}
    </Explicando.Provider>
  );
};

const raiz = document.getElementById('root');
if (raiz) createRoot(raiz).render(<CadastroGovernancaPreview />);

export default CadastroGovernancaPreview;
