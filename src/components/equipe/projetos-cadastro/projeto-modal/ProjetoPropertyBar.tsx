import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';
import { CHIP_INPUT, CHIP_LABEL, CHIP_TRIGGER } from '@/lib/modalChipStyles';
import { projectStatusConfig, projectStatusList } from '@/lib/projetoStatusColors';
import { cn } from '@/lib/utils';

/**
 * Faixa de propriedades do modo edição: status, responsável executor e o período
 * do projeto em controles compactos, lado a lado.
 *
 * É uma segunda apresentação dos mesmos campos que o formulário de criação
 * mostra empilhados — aqui o controle é uma pílula de leitura rápida, lá é um
 * campo com rótulo completo. Mesma divisão do modal de tarefa.
 */
export function ProjetoPropertyBar() {
  const { formData, setFormData, executores } = useProjetosCadastro();
  const status = projectStatusConfig(formData.status);
  const responsavel = executores.find((member) => member.id === formData.responsible_id);

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-y bg-muted/20 px-6 py-3 sm:grid-cols-4">
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="projeto-status" className={CHIP_LABEL}>
          Status
        </Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData((previous) => ({ ...previous, status: value }))}
        >
          <SelectTrigger id="projeto-status" className={cn(CHIP_TRIGGER, 'border', status.badge)}>
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', status.dot)} />
              <span className="truncate">{status.label}</span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {projectStatusList.map((option) => (
              <SelectItem key={option.key} value={option.key}>
                <span className="flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', option.dot)} />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="projeto-responsavel" className={CHIP_LABEL}>
          Responsável
        </Label>
        <Select
          value={formData.responsible_id || '_none'}
          onValueChange={(value) =>
            setFormData((previous) => ({
              ...previous,
              responsible_id: value === '_none' ? '' : value,
            }))
          }
        >
          <SelectTrigger id="projeto-responsavel" className={CHIP_TRIGGER}>
            <span className="flex min-w-0 items-center">
              <span className={cn('truncate', !responsavel && 'text-muted-foreground')}>
                {responsavel ? `${responsavel.first_name} ${responsavel.last_name}` : 'Selecione'}
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">Selecione...</SelectItem>
            {executores.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DateChip
        id="projeto-inicio"
        label="Início"
        value={formData.start_date}
        onChange={(value) => setFormData((previous) => ({ ...previous, start_date: value }))}
      />
      <DateChip
        id="projeto-termino"
        label="Término"
        value={formData.end_date}
        onChange={(value) => setFormData((previous) => ({ ...previous, end_date: value }))}
      />
    </div>
  );
}

function DateChip({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id} className={CHIP_LABEL}>
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CHIP_INPUT}
      />
    </div>
  );
}
