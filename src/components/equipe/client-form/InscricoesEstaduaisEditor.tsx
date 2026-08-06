// Editor da lista de inscrições estaduais de um contribuinte.
//
// Sai do `ContribuintesTab` por dois motivos. O arquivo da aba passava do teto
// de linhas do AGENTS.md, e a lógica daqui era repetida em cada linha: toda
// alteração recalculava a chave do mapa e reescrevia o mapa inteiro à mão. Aqui
// o componente recebe a lista já resolvida e devolve a lista nova, e é a aba que
// sabe onde guardá-la.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { UF_STATES } from './constants';
import MarcaPendencia from './MarcaPendencia';
import type { InscricaoIE } from '@/types/clientForm';

export interface InscricoesEstaduaisEditorProps {
  inscricoes: InscricaoIE[];
  onChange: (lista: InscricaoIE[]) => void;
  /** Frase da falta, quando alguma inscrição está incompleta. */
  pendencia?: string;
}

export default function InscricoesEstaduaisEditor({
  inscricoes,
  onChange,
  pendencia,
}: InscricoesEstaduaisEditorProps) {
  const alterar = (indice: number, patch: Partial<InscricaoIE>) =>
    onChange(inscricoes.map((ie, i) => (i === indice ? { ...ie, ...patch } : ie)));

  return (
    <div className="rounded-lg border border-dashed p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-muted-foreground">Inscrições Estaduais</span>
        <Button
          type="button" size="sm" variant="outline" className="gap-1 text-xs"
          onClick={() => onChange([...inscricoes, { _tempId: Date.now() + Math.random(), situacao: 'sim', numero_ie: '', uf: '' }])}
        >
          <Plus size={12} /> Adicionar IE
        </Button>
      </div>

      {inscricoes.map((ie, indice) => (
        <div key={ie._tempId} className="mt-1 flex items-center gap-2">
          <Select value={ie.uf || undefined} onValueChange={(v) => alterar(indice, { uf: v })}>
            <SelectTrigger className="h-8 w-24 shrink-0"><SelectValue placeholder="UF" /></SelectTrigger>
            <SelectContent>{UF_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
          </Select>

          {/* Trocar para "não" ou "isento" apaga o número: mantê-lo gravaria uma
              inscrição que o contribuinte declarou não ter. */}
          <Select
            value={ie.situacao || undefined}
            onValueChange={(v) => alterar(indice, { situacao: v, numero_ie: v !== 'sim' ? '' : ie.numero_ie })}
          >
            <SelectTrigger className="h-8 w-28 shrink-0"><SelectValue placeholder="Situação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
              <SelectItem value="isento">Isento</SelectItem>
            </SelectContent>
          </Select>

          {ie.situacao === 'sim' && (
            <Input
              value={ie.numero_ie}
              onChange={(e) => alterar(indice, { numero_ie: e.target.value })}
              placeholder="Nº IE" maxLength={15} className="h-8 flex-1"
            />
          )}

          <Button
            type="button" size="icon" variant="ghost"
            className="h-8 w-8 shrink-0 text-destructive"
            aria-label="Remover inscrição estadual"
            onClick={() => onChange(inscricoes.filter((_, i) => i !== indice))}
          >
            <X size={14} />
          </Button>
        </div>
      ))}

      {inscricoes.length === 0 && (
        <p className="mt-1 text-xs italic text-muted-foreground">Nenhuma IE cadastrada.</p>
      )}
      <MarcaPendencia>{pendencia}</MarcaPendencia>
    </div>
  );
}
