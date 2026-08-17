import { PostgresMeta } from '@supabase/postgres-meta';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
});

const meta = new PostgresMeta({ pool, queryTimeout: 30000 });
const { data: columns, error } = await meta.columns.list({ includeSystemColumns: false });
if (error) throw error;

const interesting = columns.filter(c => 
  (c.schema === 'public' && c.table_name === 'solicitacao_item') ||
  (c.schema === 'public' && c.table_name === 'org_comments_feed') ||
  (c.schema === 'public' && c.table_name === 'documento_arquivo')
);

for (const c of interesting) {
  console.log(JSON.stringify({
    table: c.table_name,
    name: c.name,
    data_type: c.data_type,
    udt_name: c.udt_name,
    format: c.format,
    enum: c.enum,
    enums: c.enums,
    is_nullable: c.is_nullable,
  }, null, 2));
}
await pool.end();
