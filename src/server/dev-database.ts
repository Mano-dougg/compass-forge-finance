// Development only: never imported by the browser or production Worker.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import type { Database, Statement } from "./database.ts";
mkdirSync(".data", { recursive: true, mode: 0o700 });
const sqlite = new DatabaseSync(".data/atlas.sqlite");
sqlite.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
sqlite.exec(readFileSync("migrations/0001_accounts.sql", "utf8"));
export const devDatabase: Database = {
  prepare(sql) {
    let values: (string | number | null)[] = [];
    const statement: Statement = {
      bind(...next) {
        values = next;
        return statement;
      },
      async first<T>() {
        return (sqlite.prepare(sql).get(...values) as T | undefined) ?? null;
      },
      async run() {
        return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } };
      },
    };
    return statement;
  },
};
