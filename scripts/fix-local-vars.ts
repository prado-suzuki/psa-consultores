// Renomeia variáveis locais snake_case → camelCase em arquivos específicos.
// O script rename-fields.ts foi over-eager e renomeou identifiers em
// destructuring de useState. Volta os 4 nomes mais comuns pra camelCase.

import { readFileSync, writeFileSync } from 'node:fs';

interface FileFix {
  file: string;
  renames: [string, string][]; // [from, to] — exact identifier
}

const FIXES: FileFix[] = [
  // src/components/equipe/dev/procedimentos/ReviewProcedimentoModal.tsx
  { file: 'src/components/equipe/dev/procedimentos/ReviewProcedimentoModal.tsx',
    renames: [['complexity_level', 'complexidade']] },
  // src/contexts/AuditoriaContext.tsx
  { file: 'src/contexts/AuditoriaContext.tsx',
    renames: [['start_date', 'dataInicio'], ['end_date', 'dataFim']] },
  // src/pages/equipe/dev/ConsultaXMLs.tsx
  { file: 'src/pages/equipe/dev/ConsultaXMLs.tsx',
    renames: [['start_date', 'dataInicio'], ['end_date', 'dataFim']] },
  // src/pages/equipe/dev/IcmsSaidas.tsx
  { file: 'src/pages/equipe/dev/IcmsSaidas.tsx',
    renames: [['start_date', 'dataInicio'], ['end_date', 'dataFim']] },
  // src/pages/equipe/dev/ProcedimentosDev.tsx
  { file: 'src/pages/equipe/dev/ProcedimentosDev.tsx',
    renames: [['complexity_level', 'complexidade']] },
  // src/pages/equipe/dev/ProcessoDifal.tsx
  { file: 'src/pages/equipe/dev/ProcessoDifal.tsx',
    renames: [['start_date', 'dataInicio'], ['end_date', 'dataFim']] },
  // src/pages/equipe/mapa/GargalosPage.tsx
  { file: 'src/pages/equipe/mapa/GargalosPage.tsx',
    renames: [['melhoria_id', 'melhoriaId']] },
  // src/pages/equipe/mapa/SetorEvolucaoPage.tsx
  { file: 'src/pages/equipe/mapa/SetorEvolucaoPage.tsx',
    renames: [['start_date', 'dataInicio'], ['end_date', 'dataFim']] },
];

for (const fix of FIXES) {
  let content = readFileSync(fix.file, 'utf8');
  let total = 0;
  for (const [from, to] of fix.renames) {
    // Word boundary, mas só rename quando o identifier NÃO é precedido de
    // `.`, `:`, `'` ou `"` — pra preservar:
    //   - acessos de propriedade (obj.start_date — pode ser DB column)
    //   - keys de object literal (start_date: ...)
    //   - string literals ('start_date')
    const re = new RegExp(`(?<![\\.:'"\`a-zA-Z0-9_])${from}\\b`, 'g');
    const newContent = content.replace(re, () => { total++; return to; });
    content = newContent;
  }
  writeFileSync(fix.file, content);
  console.log(`${fix.file}: ${total} renames`);
}
