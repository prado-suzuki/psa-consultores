import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CabecalhoDoCard, cardDoQuadroCls } from './quadroKit';

// Card do quadro cujo DETALHE é recolhível, e cuja EXISTÊNCIA não é.
//
// A distinção é a razão de o componente existir. A tabela de usufruto e a lista
// de atos são longas e quase sempre consultadas depois do quadro, então ficam
// fechadas; mas esconder que há ônus vigente sobre as quotas, ou que há atos que
// ainda podem ser desfeitos, faria o consultor tomar decisão sem saber. Por isso
// o cabeçalho e a frase de resumo continuam sempre visíveis, e o que recolhe é
// só o corpo.
//
// O estado é local e por empresa (a página remonta pelo `key` da empresa) e não
// se persiste: preferência guardada faria a próxima sessão abrir com um detalhe
// expandido sem que ninguém pedisse.

interface SecaoRecolhivelProps {
  icone: ReactNode;
  titulo: ReactNode;
  /** A frase que continua visível com o corpo fechado. */
  resumo: ReactNode;
  rotuloAbrir: string;
  rotuloFechar: string;
  children: ReactNode;
  /** Atraso da entrada (ms), na cascata da página. */
  delay?: number;
}

export function SecaoRecolhivel({
  icone, titulo, resumo, rotuloAbrir, rotuloFechar, children, delay = 0,
}: SecaoRecolhivelProps) {
  const [aberta, setAberta] = useState(false);

  return (
    <Collapsible open={aberta} onOpenChange={setAberta}>
      <Card
        className={cn(cardDoQuadroCls, 'animate-osg-rise motion-reduce:animate-none')}
        style={{ animationDelay: `${delay}ms` }}
      >
        <CabecalhoDoCard
          icone={icone}
          titulo={titulo}
          acoes={
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5">
                {aberta ? rotuloFechar : rotuloAbrir}
                <ChevronDown
                  aria-hidden
                  className={cn('h-3.5 w-3.5 transition-transform', aberta && 'rotate-180')}
                />
              </Button>
            </CollapsibleTrigger>
          }
          apoio={<p className="text-xs text-muted-foreground">{resumo}</p>}
        />
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
