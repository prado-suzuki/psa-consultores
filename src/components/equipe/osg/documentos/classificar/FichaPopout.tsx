import { BemModal } from '@/components/equipe/osg/diagnostico-patrimonial/BemModal';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';
import { PessoaModal } from '@/components/equipe/osg/qualificacao-das-partes/PessoaModal';
import type { ParentescoDraft } from '@/components/equipe/osg/qualificacao-das-partes/pessoa/PessoaDadosTab';
import type { BemRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { NovoCadastro, TipoFicha } from '@/lib/classificarFicha';
import type {
  DraftBem, DraftMatricula, TitularInicialDraft,
} from '@/lib/diagnosticoPatrimonialModalModels';
import type { PessoaDraft } from '@/lib/pessoaModalModel';

/** Tudo o que a coluna estreita tem digitado, na forma que os modais entendem. */
export interface RascunhoFicha {
  pessoa: PessoaDraft;
  parentesco: ParentescoDraft;
  bem: DraftBem;
  matricula: DraftMatricula;
  titular: TitularInicialDraft;
  /** Imóvel a que a matrícula pertence: campo da coluna, não do MatriculaModal. */
  bemIdMatricula: string;
}

/* Props numerosas de propósito: este componente é fiação, não tela. Ele não
   guarda estado nem decide nada — só liga a coluna ao modal certo. */
interface Props {
  aberto: boolean;
  tipo: TipoFicha;
  clienteId: string;
  pessoasCliente: PessoaRow[];
  imoveis: BemRow[];
  rascunho: RascunhoFicha;
  /** O mesmo rótulo do botão da coluna, com a contagem da leva: o clique aqui
   *  dentro grava o cadastro E os vínculos, e precisa dizer isso. */
  rotuloSalvar: string;
  /** O que o consultor mexeu no modal, de volta para a coluna. */
  onDevolver: (patch: Partial<RascunhoFicha>) => void;
  onFechar: () => void;
  /** Mesmo caminho do botão da coluna: cadastra E vincula a leva do balde. */
  onCadastrar: (novo: NovoCadastro) => void;
}

/**
 * O formulário da ficha em tela cheia. Não é um modal novo: é o MESMO modal de
 * cadastro que o consultor usa nas outras telas (PessoaModal, BemModal,
 * MatriculaModal), aberto com o rascunho que já estava na coluna e devolvendo-o
 * ao fechar. Gravar dali NÃO cria o cadastro sozinho — devolve o payload para o
 * classificador, que cria e vincula a leva de arquivos marcada no balde; se o
 * modal gravasse por conta própria, os arquivos marcados ficariam órfãos.
 */
export function FichaPopout({
  aberto, tipo, clienteId, pessoasCliente, imoveis, rascunho, rotuloSalvar,
  onDevolver, onFechar, onCadastrar,
}: Props) {
  if (tipo === 'bem') {
    return (
      <BemModal
        open={aberto}
        clienteId={clienteId}
        bem={null}
        pessoasCliente={pessoasCliente}
        onClose={onFechar}
        rascunhoExterno={{
          draft: rascunho.bem,
          titular: rascunho.titular,
          rotuloSalvar,
          onSalvar: (values, titular) => onCadastrar({ tipo: 'bem', values, titular }),
          onDevolver: (bem, titular) => onDevolver({ bem, titular }),
        }}
      />
    );
  }

  if (tipo === 'matricula') {
    // O tipo do imóvel governa quais campos a matrícula mostra; na coluna ele sai
    // do bem escolhido no formulário, e é isso que o modal espera receber pronto.
    const bemTipo = imoveis.find((item) => item.id === rascunho.bemIdMatricula)?.tipo_bem ?? null;
    return (
      <MatriculaModal
        open={aberto}
        bemId={rascunho.bemIdMatricula || null}
        bemTipo={bemTipo}
        matricula={null}
        pessoasCliente={pessoasCliente}
        matriculasDoBem={[]}
        onClose={onFechar}
        rascunhoExterno={{
          draft: rascunho.matricula,
          titular: rascunho.titular,
          rotuloSalvar,
          onSalvar: (values, titular) => onCadastrar({ tipo: 'matricula', values, titular }),
          onDevolver: (matricula, titular) => onDevolver({ matricula, titular }),
        }}
      />
    );
  }

  return (
    <PessoaModal
      open={aberto}
      clienteId={clienteId}
      pessoa={null}
      pessoasCliente={pessoasCliente}
      defaultTipo={tipo === 'PJ' ? 'PJ' : 'PF'}
      onClose={onFechar}
      rascunhoExterno={{
        draft: rascunho.pessoa,
        parentesco: rascunho.parentesco,
        rotuloSalvar,
        onSalvar: (values, parentesco) => onCadastrar({ tipo: 'pessoa', values, parentesco }),
        onDevolver: (pessoa, parentesco) => onDevolver({ pessoa, parentesco }),
      }}
    />
  );
}
