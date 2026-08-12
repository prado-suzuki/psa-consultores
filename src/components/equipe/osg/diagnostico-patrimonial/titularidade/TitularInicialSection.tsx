import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldSection, fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import { formGridCls } from '@/lib/osgFormGrid';
import { FRACAO_STEP, clampFracaoInput } from '@/components/equipe/osg/diagnostico-patrimonial/fracaoUtils';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { TitularInicialDraft } from '@/lib/diagnosticoPatrimonialModalModels';

interface TitularInicialSectionProps {
  entity: 'bem' | 'matrícula';
  pessoas: PessoaRow[];
  value: TitularInicialDraft;
  onChange: (value: TitularInicialDraft) => void;
}

export function TitularInicialSection({ entity, pessoas, value, onChange }: TitularInicialSectionProps) {
  return (
    <FieldSection number="01" title="Titular inicial — Propriedade de Direito (DT)">
      <div className="rounded-md border border-osg-moss/20 bg-osg-moss/[0.04] p-4">
        {pessoas.length === 0 ? (
          <p className="text-xs text-amber-600">
            Nenhuma pessoa disponível. Cadastre o titular na Qualificação das Partes (ou selecione
            um cliente) antes de criar {entity === 'bem' ? 'o bem' : 'a matrícula'}.
          </p>
        ) : (
          <div className={`${formGridCls(2)} gap-3`}>
            <div className="space-y-1.5" data-campo="titular_pessoa_id">
              <Label className={labelCls}>Titular<RequiredMark /></Label>
              <Select value={value.titular_pessoa_id || undefined} onValueChange={(id) => onChange({ ...value, titular_pessoa_id: id })}>
                <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {pessoas.map((pessoa) => (
                    <SelectItem key={pessoa.id} value={pessoa.id}>
                      {pessoa.denominacao} <span className="text-xs text-muted-foreground">({pessoa.tipo_pessoa})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5" data-campo="titular_fracao">
              <Label className={labelCls}>Fração (%) — opcional</Label>
              <Input type="number" step={FRACAO_STEP} min="0" max="100" value={value.fracao}
                onChange={(event) => onChange({ ...value, fracao: clampFracaoInput(event.target.value) })}
                placeholder="ex: 50" className={`${fieldCls} font-mono`} />
            </div>
          </div>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          {entity === 'bem' ? (
            <>Todo bem sem matrícula precisa de ao menos um titular. Ele entra como Propriedade de Direito (DT); demais titulares (FT e DT) podem ser adicionados depois de salvar.</>
          ) : (
            <>Toda matrícula precisa de ao menos um titular — é ele que define o cliente. Ele entra como Propriedade de Direito (DT); titulares de FT e demais de DT podem ser adicionados depois de salvar.</>
          )}
        </p>
      </div>
    </FieldSection>
  );
}
