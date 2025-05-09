import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const connectionString = "postgresql://postgres:1406@localhost:5432/Discord";
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    console.log('Running migration...');
    const sql = fs.readFileSync(path.join(__dirname, 'migrations', '0001_add_bot_config_columns.sql'), 'utf8');
    await client.unsafe(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate(); 