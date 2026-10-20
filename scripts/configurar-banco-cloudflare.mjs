import { readFile, writeFile } from "node:fs/promises";
const local = process.argv.includes("--local");
const id = local
  ? "00000000-0000-0000-0000-000000000001"
  : process.argv[2] || process.env.ATLAS_D1_DATABASE_ID;
if (
  !id ||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id) ||
  (!local && id.startsWith("00000000-"))
) {
  console.error(
    "Informe o UUID do banco D1: npm run db:configure -- <database_id>. Use --local somente para testar localmente.",
  );
  process.exit(1);
}
const file = new URL("../.output/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(file, "utf8"));
config.d1_databases = [
  ...(config.d1_databases || []).filter((b) => b.binding !== "ATLAS_DB"),
  {
    binding: "ATLAS_DB",
    database_name: "atlas-finance",
    database_id: id,
    migrations_dir: "../../migrations",
  },
];
await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
console.log(
  local
    ? "Binding D1 LOCAL preparado. Aplique as migrações com --local antes de iniciar o Wrangler."
    : "Binding ATLAS_DB preparado no build. Aplique as migrações do banco antes de publicar.",
);
