-- Novo papel SUPER_ADMIN (dono). O backfill do dono (nexusai360@gmail.com) é
-- feito pelo entrypoint via criar-admin.js (upsert) após as migrations, evitando
-- o uso do novo valor de enum na mesma transação da migration.
ALTER TYPE "Papel" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
