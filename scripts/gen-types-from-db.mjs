// Gera src/integrations/supabase/types.ts diretamente do banco,
// sem depender do Supabase CLI nem de access token de management API.
// Usa as variáveis de ambiente PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, PGSSLMODE.
import PostgresMeta from '@supabase/postgres-meta/dist/lib/PostgresMeta.js';
import { getGeneratorMetadata } from '@supabase/postgres-meta/dist/lib/generators.js';
import fs from 'fs';

const OUT = 'src/integrations/supabase/types.ts';

const connectionString = `postgresql://${process.env.PGUSER}:${encodeURIComponent(process.env.PGPASSWORD)}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}?sslmode=${process.env.PGSSLMODE || 'require'}`;

const pgMeta = new PostgresMeta({ connectionString, max: 5 });

const { data: meta, error } = await getGeneratorMetadata(pgMeta, {
  includedSchemas: ['public'],
});

if (error) {
  console.error(error);
  process.exit(1);
}

await pgMeta.end();

// Mapa de type_id -> type object
const typeById = new Map(meta.types.map(t => [t.id, t]));

// Enums do schema public
const enumTypes = meta.types.filter(t => t.schema === 'public' && t.enums && t.enums.length > 0);
const enumNames = new Set(enumTypes.map(t => t.name));

function pgTypeToTs(typeObj, { nullable = false, forInsert = false, forUpdate = false } = {}) {
  if (!typeObj) return 'unknown';

  let ts;
  if (typeObj.enums && typeObj.enums.length > 0) {
    // user-defined enum
    ts = `Database["public"]["Enums"]["${typeObj.name}"]`;
  } else if (typeObj.name === 'uuid') {
    ts = 'string';
  } else if (['text', 'varchar', 'char', 'bpchar', 'character varying', 'character', 'name'].includes(typeObj.name)) {
    ts = 'string';
  } else if (['int2', 'int4', 'int8', 'integer', 'bigint', 'smallint', 'serial', 'bigserial'].includes(typeObj.name)) {
    ts = 'number';
  } else if (['numeric', 'decimal', 'real', 'double precision', 'float4', 'float8'].includes(typeObj.name)) {
    ts = 'number';
  } else if (['bool', 'boolean'].includes(typeObj.name)) {
    ts = 'boolean';
  } else if (['timestamptz', 'timestamp with time zone', 'timestamp', 'timestamp without time zone', 'date', 'time', 'time with time zone', 'time without time zone'].includes(typeObj.name)) {
    ts = 'string';
  } else if (['json', 'jsonb'].includes(typeObj.name)) {
    ts = 'Json';
  } else if (typeObj.name === 'void') {
    ts = 'undefined';
  } else if (typeObj.name === '_text') {
    ts = 'string[]';
  } else if (typeObj.name === '_uuid') {
    ts = 'string[]';
  } else if (typeObj.name.startsWith('_')) {
    const elem = typeObj.name.slice(1);
    const elemTs = pgTypeToTs({ ...typeObj, name: elem, enums: [] });
    ts = `${elemTs}[]`;
  } else if (typeObj.name === 'record' || typeObj.name === 'pg_catalog.record') {
    ts = 'Record<string, unknown>';
  } else if (typeObj.name === 'ARRAY') {
    // fallback
    ts = 'unknown[]';
  } else {
    ts = 'unknown';
  }

  if (nullable) ts += ' | null';
  return ts;
}

const typeByName = new Map(meta.types.map(t => [t.name, t]));

function columnTsType(col) {
  let typeObj = typeById.get(col.type_id);
  if (!typeObj && col.udt_name) typeObj = typeByName.get(col.udt_name);
  if (!typeObj && col.data_type) typeObj = typeByName.get(col.data_type);
  if (!typeObj) typeObj = { name: col.format || col.data_type };
  return pgTypeToTs(typeObj, { nullable: col.is_nullable });
}

function isRequiredForInsert(col) {
  return !col.is_nullable && !col.default_value && !col.is_identity;
}

function generateTable(table) {
  const cols = meta.columns.filter(c => c.schema === table.schema && c.table_id === table.id);
  const rels = meta.relationships.filter(r => r.schema === table.schema && r.relation === table.name);

  const rowLines = cols.map(c => `          ${c.name}: ${columnTsType(c)}`);
  const insertLines = cols.map(c => {
    const required = isRequiredForInsert(c);
    return `          ${c.name}${required ? '' : '?'}: ${columnTsType(c)}`;
  });
  const updateLines = cols.map(c => `          ${c.name}?: ${columnTsType(c)}`);

  const relLines = rels.map(r => [
    '          {',
    `            foreignKeyName: "${r.foreign_key_name}"`,
    `            columns: [${r.columns.map(c => `"${c}"`).join(', ')}]`,
    `            isOneToOne: ${r.is_one_to_one}`,
    `            referencedRelation: "${r.referenced_relation}"`,
    `            referencedColumns: [${r.referenced_columns.map(c => `"${c}"`).join(', ')}]`,
    '          }',
  ].join('\n')).join(',\n');

  return [
    `      ${table.name}: {`,
    '        Row: {',
    ...rowLines,
    '        }',
    '        Insert: {',
    ...insertLines,
    '        }',
    '        Update: {',
    ...updateLines,
    '        }',
    '        Relationships: [',
    relLines,
    '        ]',
    '      }',
  ].join('\n');
}

function generateView(view) {
  const cols = meta.columns.filter(c => c.schema === view.schema && c.table_id === view.id);
  const rels = meta.relationships.filter(r => r.schema === view.schema && r.relation === view.name);

  const rowLines = cols.map(c => `          ${c.name}: ${columnTsType(c)}`);
  const relLines = rels.map(r => [
    '          {',
    `            foreignKeyName: "${r.foreign_key_name}"`,
    `            columns: [${r.columns.map(c => `"${c}"`).join(', ')}]`,
    `            isOneToOne: ${r.is_one_to_one}`,
    `            referencedRelation: "${r.referenced_relation}"`,
    `            referencedColumns: [${r.referenced_columns.map(c => `"${c}"`).join(', ')}]`,
    '          }',
  ].join('\n')).join(',\n');

  return [
    `      ${view.name}: {`,
    '        Row: {',
    ...rowLines,
    '        }',
    '        Relationships: [',
    relLines,
    '        ]',
    '      }',
  ].join('\n');
}

function parseFunctionArgType(argTypeStr) {
  // e.g. "uuid", "text", "org_comment_entity", "uuid[]", "timestamp with time zone"
  const m = argTypeStr.match(/^(.*?)\s*(?:\[\])?$/);
  const base = m ? m[1].trim() : argTypeStr;
  const isArray = argTypeStr.includes('[]');
  return { base, isArray };
}

function functionBaseTypeToTs(base, isArray) {
  const typeObj = meta.types.find(t => t.name === base && (t.schema === 'public' || t.schema === 'pg_catalog'));
  let ts;
  if (typeObj) {
    ts = pgTypeToTs(typeObj);
  } else if (base === 'uuid') ts = 'string';
  else if (['text', 'varchar'].includes(base)) ts = 'string';
  else if (['integer', 'int4', 'bigint', 'int8', 'numeric'].includes(base)) ts = 'number';
  else if (['boolean', 'bool'].includes(base)) ts = 'boolean';
  else if (base.includes('timestamp') || base === 'date') ts = 'string';
  else if (['json', 'jsonb'].includes(base)) ts = 'Json';
  else if (base === 'void') ts = 'undefined';
  else ts = 'unknown';
  if (isArray) ts += '[]';
  return ts;
}

function parseArgumentTypes(argumentTypes) {
  if (!argumentTypes) return [];
  // Split by commas not inside angle brackets/parentheses
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of argumentTypes) {
    if (['<', '(', '['].includes(ch)) { depth++; current += ch; }
    else if (['>', ')', ']'].includes(ch)) { depth--; current += ch; }
    else if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  if (current.trim()) parts.push(current.trim());

  return parts.map(part => {
    // part like: "_user_id uuid" or "_role app_role DEFAULT 'admin'::app_role"
    const defaultMatch = part.match(/^(.*?)\s+DEFAULT\s+(.+)$/i);
    let rest = part;
    let hasDefault = false;
    if (defaultMatch) {
      rest = defaultMatch[1].trim();
      hasDefault = true;
    }
    const modeMatch = rest.match(/^(IN|OUT|INOUT|VARIADIC)\s+(.+)$/i);
    if (modeMatch) rest = modeMatch[2].trim();
    // name is first word, type is rest
    const firstSpace = rest.indexOf(' ');
    const name = firstSpace > 0 ? rest.slice(0, firstSpace) : rest;
    const typeStr = firstSpace > 0 ? rest.slice(firstSpace + 1).trim() : 'unknown';
    const { base, isArray } = parseFunctionArgType(typeStr);
    return { name, typeStr, base, isArray, hasDefault };
  });
}

function generateFunction(func) {
  const args = parseArgumentTypes(func.argument_types);
  const argLines = args.map(a => `          ${a.name}${a.hasDefault ? '?' : ''}: ${functionBaseTypeToTs(a.base, a.isArray)}`);

  let returns;
  if (func.return_type_relation_id) {
    const relTable = meta.tables.find(t => t.id === func.return_type_relation_id);
    const relView = meta.views.find(v => v.id === func.return_type_relation_id);
    const relName = relTable?.name || relView?.name;
    if (relName) {
      if (func.is_set_returning_function) {
        returns = `Database["public"]["Tables"]["${relName}"]["Row"][]`;
      } else {
        returns = `Database["public"]["Tables"]["${relName}"]["Row"]`;
      }
    } else {
      returns = 'unknown';
    }
  } else if (func.return_type_id === 2249) {
    // record / TABLE(...)
    const tableMatch = func.return_type.match(/TABLE\s*\((.*)\)/i);
    if (tableMatch) {
      const cols = parseArgumentTypes(tableMatch[1]);
      const fields = cols.map(c => `${c.name}: ${functionBaseTypeToTs(c.base, c.isArray)}`).join('; ');
      returns = `{ ${fields} }[]`;
    } else if (func.is_set_returning_function) {
      returns = 'Record<string, unknown>[]';
    } else {
      returns = 'Record<string, unknown>';
    }
  } else {
    const typeObj = typeById.get(func.return_type_id);
    returns = pgTypeToTs(typeObj);
  }

  return [
    `      ${func.name}: {`,
    '        Args: {',
    ...argLines,
    '        }',
    `        Returns: ${returns}`,
    '      }',
  ].join('\n');
}

function generateEnum(type) {
  const values = type.enums.map(v => `        "${v}"`).join(' |\n');
  return `      ${type.name}:\n${values}`;
}

const tablesSection = meta.tables.map(generateTable).join('\n');
const viewsSection = meta.views.map(generateView).join('\n');
const functionsSection = meta.functions.map(generateFunction).join('\n');
const enumsSection = enumTypes.map(generateEnum).join('\n');

const output = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
${tablesSection}
    }
    Views: {
${viewsSection}
    }
    Functions: {
${functionsSection}
    }
    Enums: {
${enumsSection}
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof Database["public"]["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
${enumTypes.map(t => `      ${t.name}: [\n${t.enums.map(v => `        "${v}"`).join(',\n')}\n      ]`).join(',\n')}
    },
  },
} as const
`;

fs.writeFileSync(OUT, output);
console.log(`Wrote ${OUT} (${output.split('\n').length} lines)`);
