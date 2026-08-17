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

console.log('Schemas:', meta.schemas.length);
console.log('Tables:', meta.tables.length);
console.log('Views:', meta.views.length);
console.log('Functions:', meta.functions.length);
console.log('Types:', meta.types.length);
console.log('Columns sample:', meta.columns.slice(0, 3));
console.log('Relationships sample:', meta.relationships.slice(0, 3));

await pgMeta.end();
