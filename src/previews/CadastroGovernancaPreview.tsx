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
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  CartaoItem, EtiquetaOrigem, Explicando, GrupoItens, ModalItem,
} from './cadastroGovernancaUi';
import '@/index.css';

const GRUPOS = [
  {
    titulo: '1 · A base',
    explica: 'Não geram documento. Definem as colunas da Matriz e do Protocolo.',
    etapa: 'base' as const,
  },
  {
    titulo: '2 · O que a família decide',
    explica: 'As decisões de governança. Vêm antes de qualquer registro, e é aqui que está o trabalho.',
    etapa: 'decide' as const,
  },
  {
    titulo: '3 · O que vai a registro',
    explica: 'Leva as decisões acima para o contrato social, na Junta Comercial. Depende de todas elas.',
    etapa: 'registra' as const,
  },
  {
    titulo: '4 · Quem assume',
    explica: 'Só depois do registro: a reunião elege e cada eleito assina o termo de posse.',
    etapa: 'assume' as const,
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
    <TooltipProvider delayDuration={150}>
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
            <GrupoItens key={g.etapa} titulo={g.titulo} explica={g.explica}>
              {ITENS.filter((i) => i.etapa === g.etapa)
                // Ordena pelo número, que é a ordem do fluxo. A ordem física no
                // arquivo de itens não acompanha, e mover blocos de 200 linhas só
                // para isso trocaria clareza por churn.
                .sort((a, b) => a.numero.localeCompare(b.numero))
                .map((item) => (
                <CartaoItem key={item.id} item={item} onAbrir={() => setAbertoId(item.id)} />
              ))}
            </GrupoItens>
          ))}

          <footer className="mt-12 flex flex-col gap-3 border-t border-osg-100 pt-5 text-[13px] text-osg-500">
            {/*
              CORREÇÃO. A versão anterior desta nota dizia que "garante" e "fornece
              informações" não apareciam em célula nenhuma, e pedia para a
              consultoria confirmar. Estava errado: lendo a planilha do modelo por
              POSIÇÃO de célula, as duas aparecem. A afirmação vinha de uma contagem
              feita sobre texto extraído sem a grade, que perdia células.
            */}
            <p className="max-w-[76ch]">
              <strong className="font-semibold">A lista de palavras da célula não é fechada, e é
              bem maior que catorze.</strong>{' '}
              Lendo o modelo célula a célula, aparecem também <em>elege</em>, <em>participa</em>,{' '}
              <em>define</em>, <em>realiza</em>, <em>valida</em>, <em>implanta</em>,{' '}
              <em>outorga</em>, <em>solicita</em> e <em>elabora</em>. E 25 das 85 células têm mais
              de um verbo, como "sugere ao Diretor e aprova dos demais". A lista de catorze é
              fechada de propósito, ou cada consultor escreve o que precisa?
            </p>
            {/*
              As duas perguntas que estavam aqui foram RESPONDIDAS pela consultoria
              em 14/08 e 20/08. Ficam registradas como resposta, e não como dúvida,
              porque as duas mudam o desenho.
            */}
            <p className="max-w-[76ch]">
              <strong className="font-semibold">Duas respostas da consultoria, já aplicadas.</strong>{' '}
              A lista de órgãos <strong>não é fixa</strong>: "vai de como o cliente atua e atuará,
              alguns não possuem o órgão de Conselho de Administração, somente Diretoria". E o
              Diagnóstico <strong>não gera documento</strong>: "é sempre o sócio ou gerente que conduz
              com o cliente, às vezes não elaborando de fato um documento físico, sem passar por
              arquivo nenhum". Por isso ele não é item desta tela.
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
    </TooltipProvider>
  );
};

const raiz = document.getElementById('root');
if (raiz) createRoot(raiz).render(<CadastroGovernancaPreview />);

export default CadastroGovernancaPreview;
