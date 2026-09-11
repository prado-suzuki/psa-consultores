import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import DateFieldWithInput from '@/components/equipe/client-form/DateFieldWithInput';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { formGridCls, formScopeCls } from '@/lib/osgFormGrid';
import { Campo } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/CampoComDica';
import { PessoaSelect } from '@/components/equipe/osg/diagnostico-patrimonial/exploracao-rural/PartesPanel';
import { novaOrigemExterna, type OrigemExternaDraft } from '@/lib/exploracaoRuralModalModels';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';

/**
 * Cadastro do instrumento anterior que deu posse aos imóveis — o Considerando V
 * da composse.
 *
 * O OUTORGANTE é uma pessoa do cadastro, não um nome digitado: quem cedeu a posse
 * é qualificado no contrato pelo mesmo mapeador que qualifica qualquer outra
 * parte, e digitar nome/CNPJ/NIRE aqui criaria a mesma empresa duas vezes no
 * banco — com a redação da qualificação divergindo entre o preâmbulo e o
 * Considerando V. Terceiro que não é cliente também é pessoa: o cadastro de
 * pessoas é o dossiê do cliente, não a lista de clientes.
 *
 * Ficam aqui só os dois dados que são da RELAÇÃO, e não da pessoa: o capital
 * social na data daquele contrato (retrato histórico, que `pessoa` não guarda) e
 * quem representou a empresa naquele ato.
 *
 * Ambos são anuláveis por evidência, não por preguiça: o achado E do relatório 14
 * mostra a própria banca emitindo um Considerando V **sem capital social**, num
 * contrato em que a exigência do template pedia. Bloquear aqui impediria de
 * registrar o contrato real como ele é.
 */
interface Props {
  open: boolean;
  /** Origem em edição; `null` abre em branco. */
  origem: OrigemExternaDraft | null;
  /** Quantos imóveis já usam esta origem — muda o aviso de impacto da edição. */
  imoveisQueUsam: number;
  /** Pessoas do cliente, para escolher quem cedeu a posse. */
  pessoas: PessoaRow[];
  onSalvar: (origem: OrigemExternaDraft) => void;
  onClose: () => void;
}

export function OrigemExternaDialog({ open, origem, imoveisQueUsam, pessoas, onSalvar, onClose }: Props) {
  const [draft, setDraft] = useState<OrigemExternaDraft>(() => novaOrigemExterna());

  useEffect(() => {
    if (!open) return;
    setDraft(origem ?? novaOrigemExterna());
  }, [open, origem]);

  const set = <K extends keyof OrigemExternaDraft>(key: K, value: OrigemExternaDraft[K]) =>
    setDraft((atual) => ({ ...atual, [key]: value }));

  const editando = !!origem;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* `max-h` + corpo rolável: sem isso o diálogo cresce além da janela e o título
          sai por cima do topo. `formScopeCls` no corpo é o que faz a grade existir —
          as grades da OSG são container queries (`@2xl:`), então sem um ancestral
          marcado como `@container` elas caem para uma coluna só, e o formulário vira
          uma lista vertical. */}
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 space-y-1 px-6 pb-4 pt-6 text-left">
          <DialogTitle>{editando ? 'Editar origem externa' : 'Nova origem externa'}</DialogTitle>
          <DialogDescription>
            O instrumento anterior de onde vem a posse destes imóveis, e quem cedeu essa posse.
            {editando && imoveisQueUsam > 1 && (
              <>
                {' '}
                <b className="text-osg-700">
                  Esta origem é usada por {imoveisQueUsam} imóveis
                </b>{' '}
                — alterar aqui muda em todos, que é o motivo de ela ser cadastrada uma vez só.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className={`min-h-0 flex-1 overflow-y-auto px-6 pb-2 ${formScopeCls}`}>
        <div className={`${formGridCls(4)} items-end gap-3`}>
          <Campo
            label="Título do instrumento"
            colunas={3}
            dica="Como o contrato anterior se chama, do jeito que está escrito nele."
          >
            <Input
              value={draft.titulo_instrumento}
              onChange={(e) => set('titulo_instrumento', e.target.value)}
              className={fieldCls}
              placeholder="ex: Contrato de Parceria Agrícola e Outras Avenças"
            />
          </Campo>
          <Campo
            label="Data de assinatura"
            dica="Quando o contrato anterior foi assinado."
          >
            <DateFieldWithInput
              value={draft.data_assinatura}
              onChange={(v) => set('data_assinatura', v)}
            />
          </Campo>

          <Campo
            label="Quem cedeu a posse"
            colunas={2}
            campo="outorgante_pessoa_id"
            dica="A pessoa ou empresa que cedeu a posse no contrato anterior. Sai do cadastro de pessoas: é de lá que vem a qualificação completa que o contrato escreve."
          >
            <PessoaSelect
              value={draft.outorgante_pessoa_id}
              pessoas={pessoas}
              onChange={(v) => set('outorgante_pessoa_id', v)}
            />
          </Campo>
          <Campo
            label="Capital social na assinatura"
            dica="O capital que a empresa tinha na data em que aquele contrato foi assinado — valor histórico, não o de hoje."
          >
            <CurrencyInput
              value={draft.outorgante_capital_social_na_assinatura}
              onChange={(v) => set('outorgante_capital_social_na_assinatura', v)}
              className={`${fieldCls} font-mono`}
            />
          </Campo>
          <Campo
            label="Representada por"
            dica="Quem assinou pela empresa naquele contrato. Fica na origem, e não na pessoa, porque quem representou a empresa em um contrato antigo pode não ser quem a representa hoje."
          >
            <Input
              value={draft.outorgante_representante}
              onChange={(e) => set('outorgante_representante', e.target.value)}
              className={fieldCls}
              placeholder="ex: seus administradores Fulano e Beltrana"
            />
          </Campo>
        </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-osg-100 px-6 py-3.5">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => {
              onSalvar(draft);
              onClose();
            }}
          >
            {editando ? 'Salvar origem' : 'Adicionar origem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
