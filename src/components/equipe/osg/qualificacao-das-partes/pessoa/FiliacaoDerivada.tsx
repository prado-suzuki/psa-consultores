import { useEffect } from 'react';
import { Link2 } from 'lucide-react';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formGridCls, formSpanCls } from '@/lib/osgFormGrid';
import { useParentescosByCliente, type ParentescoEnriched } from '@/hooks/useQualificacaoDasPartes';
import type { PessoaDraft } from '@/lib/pessoaModalModel';

/** Vínculos que ocupam cada slot da filiação. `Pai/Mãe` é o tipo legado. */
const TIPOS_PAI = ['Pai', 'Pai/Mãe'];
const TIPOS_MAE = ['Mãe', 'Pai/Mãe'];

function filiacaoDoSlot(vinculos: ParentescoEnriched[], tipos: string[]): ParentescoEnriched | null {
  return vinculos.find((vinculo) => tipos.includes(vinculo.tipo ?? '')) ?? null;
}

interface FiliacaoDerivadaProps {
  pessoaId: string;
  clienteId: string;
  draft: PessoaDraft;
  setDraft: React.Dispatch<React.SetStateAction<PessoaDraft>>;
}

/**
 * Filiação de uma pessoa já cadastrada.
 *
 * O mesmo fato tinha duas entradas: estes campos de texto e a lista de vínculos
 * logo abaixo. Dava para escrever um nome aqui e cadastrar outro pai na lista,
 * sem que nada reclamasse. Agora a lista é a origem: existindo vínculo de pai ou
 * de mãe, o campo correspondente vira leitura e mostra o que o vínculo diz (o
 * banco projeta a mesma coisa em `pessoa.filiacao_*`, ver a migration
 * 20260813120200). O campo só continua editável no slot sem vínculo, que é o
 * caso do pai ou da mãe que não tem cadastro próprio: ali o texto é a única
 * origem que existe, e apagá-lo perderia dado.
 */
export function FiliacaoDerivada({ pessoaId, clienteId, draft, setDraft }: FiliacaoDerivadaProps) {
  const { data: todos = [] } = useParentescosByCliente(clienteId);
  const vinculos = todos.filter((vinculo) => vinculo.pessoa_id === pessoaId);
  const pai = filiacaoDoSlot(vinculos, TIPOS_PAI);
  const mae = filiacaoDoSlot(vinculos, TIPOS_MAE);

  // Mantém o rascunho igual à projeção: sem isto, o "Salvar alterações" mandaria
  // de volta o texto antigo por cima do que o vínculo diz.
  const paiNome = pai?.parente_denominacao ?? '';
  const paiId = pai?.parente_pessoa_id ?? '';
  const maeNome = mae?.parente_denominacao ?? '';
  const maeId = mae?.parente_pessoa_id ?? '';
  useEffect(() => {
    setDraft((old) => {
      const proximo = {
        ...old,
        ...(paiId ? { filiacao_pai: paiNome, filiacao_pai_pessoa_id: paiId } : {}),
        ...(maeId ? { filiacao_mae: maeNome, filiacao_mae_pessoa_id: maeId } : {}),
      };
      const igual = proximo.filiacao_pai === old.filiacao_pai
        && proximo.filiacao_pai_pessoa_id === old.filiacao_pai_pessoa_id
        && proximo.filiacao_mae === old.filiacao_mae
        && proximo.filiacao_mae_pessoa_id === old.filiacao_mae_pessoa_id;
      return igual ? old : proximo;
    });
  }, [paiNome, paiId, maeNome, maeId, setDraft]);

  return (
    <div className={`${formGridCls(2)} gap-3 ${formSpanCls(3)}`}>
      <SlotFiliacao
        rotulo="Filiação (pai)"
        vinculado={Boolean(pai)}
        valor={pai ? paiNome : draft.filiacao_pai}
        placeholder="Nome do pai (sem cadastro próprio)"
        onChange={(nome) => setDraft((old) => ({ ...old, filiacao_pai: nome, filiacao_pai_pessoa_id: '' }))}
      />
      <SlotFiliacao
        rotulo="Filiação (mãe)"
        vinculado={Boolean(mae)}
        valor={mae ? maeNome : draft.filiacao_mae}
        placeholder="Nome da mãe (sem cadastro próprio)"
        onChange={(nome) => setDraft((old) => ({ ...old, filiacao_mae: nome, filiacao_mae_pessoa_id: '' }))}
      />
    </div>
  );
}

function SlotFiliacao({ rotulo, vinculado, valor, placeholder, onChange }: {
  rotulo: string; vinculado: boolean; valor: string; placeholder: string; onChange: (valor: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCls}>{rotulo}</Label>
      <Input
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={vinculado}
        readOnly={vinculado}
        aria-label={rotulo}
        className={fieldCls}
      />
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {vinculado
          ? <><Link2 className="h-3 w-3 shrink-0" />Vem do vínculo cadastrado abaixo; edite na lista.</>
          : 'Sem vínculo cadastrado: use este campo só para quem não tem cadastro próprio.'}
      </p>
    </div>
  );
}
