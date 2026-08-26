import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { switchBoxCls } from '@/components/equipe/osg/formKit';
import type { CalculadoraItcmd } from '@/hooks/useCalculadoraItcmdController';
import { quotasDeBigint } from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';

const ROTULO_ORIGEM: Record<'parentesco' | 'filiacao' | 'ambos', string> = {
  parentesco: 'vínculo de parentesco',
  filiacao: 'filiação na pessoa',
  ambos: 'parentesco e filiação',
};

interface ParticipantesDaDoacaoProps {
  calc: CalculadoraItcmd;
}

/**
 * Passo 3: doadores e donatários. O cadastro PROPÕE — sócio marcado como
 * `is_fundador` para doador, filho para donatário — e o analista confirma.
 *
 * A tela **não** decide quem é herdeiro necessário e **não** aplica o art. 1.829,
 * I do Código Civil: o regime de bens não resolve sozinho (em comunhão parcial
 * depende de haver bens particulares, e o campo de separação total não distingue
 * convencional de obrigatória). Ver SPEC §4.
 */
export function ParticipantesDaDoacao({ calc }: ParticipantesDaDoacaoProps) {
  const { candidatosDoador, candidatosDonatario, doadores } = calc;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">
          Doadores ({doadores.length} de {candidatosDoador.length})
        </p>
        {candidatosDoador.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum sócio pessoa física nesta sociedade. Quem doa quota é pessoa natural.
          </p>
        ) : candidatosDoador.map((c) => (
          <label key={c.pessoaId} className={`${switchBoxCls} cursor-pointer justify-between`}>
            <span className="flex min-w-0 items-center gap-2.5">
              <Checkbox
                checked={calc.doadorMarcado(c)}
                onCheckedChange={(v) => calc.alternarDoador(c.pessoaId, v === true)}
              />
              <span className="truncate text-sm font-medium">{c.denominacao}</span>
              {c.propostoPorFundador && (
                <Badge variant="outline" className="shrink-0 text-[10px]">fundador</Badge>
              )}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {quotasDeBigint(c.quotas)} quotas
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-osg-700">
          Donatários ({calc.donatarios.length} de {candidatosDonatario.length})
        </p>
        {doadores.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Escolha ao menos um doador: os donatários propostos são os filhos dele.
          </p>
        ) : candidatosDonatario.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            O cadastro não tem filho vinculado a estes doadores, por nenhum dos dois caminhos
            (vínculo de parentesco ou filiação na pessoa). Cadastre o vínculo na Qualificação
            das Partes.
          </p>
        ) : candidatosDonatario.map((c) => {
          const nome = calc.nomeDaPessoa(c.pessoaId);
          return (
            <label key={c.pessoaId} className={`${switchBoxCls} cursor-pointer justify-between`}>
              <span className="flex min-w-0 items-center gap-2.5">
                <Checkbox
                  checked={calc.donatarioMarcado(c.pessoaId)}
                  onCheckedChange={(v) => calc.alternarDonatario(c.pessoaId, v === true)}
                />
                <span className="truncate text-sm font-medium">{nome}</span>
              </span>
              <Badge variant="outline" className="shrink-0 text-[10px]">
                {ROTULO_ORIGEM[c.origem]}
              </Badge>
            </label>
          );
        })}
        <Label className="block text-[11px] font-normal text-muted-foreground">
          A tela propõe; a confirmação de quem é herdeiro necessário é do analista.
        </Label>
      </div>
    </div>
  );
}
