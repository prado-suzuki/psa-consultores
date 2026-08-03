import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// Lista curada: cada linguagem registrada entra no bundle, então só o que o time
// realmente cola nas tarefas. Para adicionar, importe do highlight.js e registre aqui.
export const lowlight = createLowlight({
  bash,
  css,
  javascript,
  json,
  markdown,
  python,
  sql,
  typescript,
  xml,
  yaml,
});

/** Opções do seletor de linguagem do bloco de código (valor = nome no lowlight). */
export const LINGUAGENS_CODIGO = [
  { value: 'plaintext', label: 'Texto' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash' },
  { value: 'xml', label: 'HTML / XML' },
  { value: 'yaml', label: 'YAML' },
  { value: 'css', label: 'CSS' },
  { value: 'markdown', label: 'Markdown' },
] as const;
