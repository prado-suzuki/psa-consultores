// A seção "Período" da OS em edição: as três datas e a situação do projeto.
//
// Mora fora do `ContratosTab` porque é o bloco que carrega a regra do período: a
// OS é a origem das datas do projeto, que herda início e fim daqui e não oferece
// campo de data próprio. Início e fim são obrigatórios por isso, a emissão é
// travada porque nasce na criação, e as três só fazem sentido lidas juntas.
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RequiredMark } from "@/components/ui/required-mark";
import type { DraftOrdemServico } from "@/types/clientForm";
import { SITUACAO_PROJETO_OPTIONS, isoToMasked } from "./constants";
import DateFieldWithInput from "./DateFieldWithInput";
import MarcaPendencia from "./MarcaPendencia";

const ROTULO = "text-xs font-semibold uppercase text-muted-foreground";

export interface OsPeriodoFieldsProps {
  contrato: DraftOrdemServico;
  onChange: (patch: Partial<DraftOrdemServico>) => void;
  /** A frase da falta de um campo, quando há. Ver `camposObrigatorios`. */
  falta: (campo: string) => string | undefined;
  /** Id da frase da falta, para o `aria-describedby` do campo. */
  idFalta: (campo: string) => string;
}

export default function OsPeriodoFields({ contrato, onChange, falta, idFalta }: OsPeriodoFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 [&>*]:min-w-0">
      {/* As três datas num subgrupo apertado: separadas pela grade principal
          elas ficavam longe umas das outras. */}
      <div className="md:col-span-2 grid grid-cols-3 gap-2 [&>*]:min-w-0">
        {/* Início e Fim são obrigatórios porque o cadastro de projeto herda os
            dois daqui e não oferece campo de data — OS salva sem período deixa o
            projeto impossível de criar, sem saída pela interface. */}
        <div>
          <Label className={ROTULO}>Data Início<RequiredMark /></Label>
          <div className="mt-1">
            <DateFieldWithInput
              value={contrato.data_inicio_projeto || ""}
              onChange={(v) => onChange({ data_inicio_projeto: v })}
              falta={falta('data_inicio_projeto')}
              idFalta={idFalta('data_inicio_projeto')}
            />
            <MarcaPendencia id={idFalta('data_inicio_projeto')}>{falta('data_inicio_projeto')}</MarcaPendencia>
          </div>
        </div>
        <div>
          <Label className={ROTULO}>Data Fim<RequiredMark /></Label>
          <div className="mt-1">
            <DateFieldWithInput
              value={contrato.data_fim_projeto || ""}
              onChange={(v) => onChange({ data_fim_projeto: v })}
              falta={falta('data_fim_projeto')}
              idFalta={idFalta('data_fim_projeto')}
            />
            <MarcaPendencia id={idFalta('data_fim_projeto')}>{falta('data_fim_projeto')}</MarcaPendencia>
          </div>
        </div>
        <div>
          <Label className={ROTULO}>Data de Emissão</Label>
          {/* Travada: é a data em que a OS foi emitida, preenchida
              automaticamente na criação. Mudá-la depois desalinharia a OS do
              documento entregue ao cliente. */}
          <div className="mt-1">
            <Input
              value={contrato.data_emissao ? isoToMasked(contrato.data_emissao) : "—"}
              readOnly disabled
              className="h-8 cursor-not-allowed bg-muted/60"
              title="Data de emissão da OS, preenchida na criação. Não é editável."
            />
          </div>
        </div>
      </div>
      <div>
        <Label className={ROTULO}>Situação do Projeto</Label>
        <div className="mt-1">
          <Select
            value={contrato.situacao_projeto || "em_andamento"}
            onValueChange={(v) => onChange({ situacao_projeto: v })}
          >
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SITUACAO_PROJETO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
