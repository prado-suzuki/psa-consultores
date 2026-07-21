import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ExportProfile } from '@/hooks/useExportProfiles';
import { Plus, Star, Trash2 } from 'lucide-react';

interface Props {
  profiles: ExportProfile[];
  loading: boolean;
  selectedProfile: string;
  selectedIsDefault: boolean;
  defaultPending: boolean;
  onApply: (key: string) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onDefault: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export function EFDExportProfiles(props: Props) {
  const selectedId = props.selectedProfile.startsWith('user_') ? props.selectedProfile.replace('user_', '') : null;
  return <div className="flex flex-wrap gap-4 items-end justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-4">
    <div className="flex-1 min-w-[280px]">
      <Label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Carregar Perfil</Label>
      <div className="flex gap-2">
        <Select value={props.selectedProfile} onValueChange={props.onApply}>
          <SelectTrigger className="flex-1 h-11 bg-slate-50 dark:bg-slate-800"><SelectValue placeholder={props.loading ? 'Carregando...' : 'Selecione um perfil...'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-slate-500">Nenhum</SelectItem><SelectItem value="all">Todos os Registros</SelectItem>
            {props.profiles.length > 0 && <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />}
            {props.profiles.map(profile => <div key={`user_${profile.id}`} className="relative flex items-center pr-10 group">
              <SelectItem value={`user_${profile.id}`} className="flex-1"><span className="flex items-center gap-2">{profile.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}{profile.name}</span></SelectItem>
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity z-10" onMouseDown={event => { event.stopPropagation(); event.preventDefault(); props.onDelete(profile.id); }}><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-11 w-11" title="Salvar seleção como perfil" onClick={props.onSave}><Plus className="h-5 w-5" /></Button>
        {props.profiles.length > 0 && <Button variant="outline" size="icon" className="h-11 w-11" title={!selectedId ? 'Selecione um perfil para favoritar' : props.selectedIsDefault ? 'Perfil padrão' : 'Definir como padrão'} onClick={() => selectedId && props.onDefault(selectedId)} disabled={props.defaultPending || !selectedId}><Star className={cn('h-5 w-5', props.selectedIsDefault && 'text-yellow-500 fill-yellow-500')} /></Button>}
      </div>
    </div>
    <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-700 pl-4 h-10"><button onClick={props.onSelectAll} className="text-sm font-bold text-primary hover:underline">Selecionar Todos</button><button onClick={props.onClear} className="text-sm font-bold text-slate-500 hover:text-red-500 hover:underline">Limpar</button></div>
  </div>;
}
