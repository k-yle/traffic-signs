import { promises as fs } from "node:fs";
import path from "node:path";
import deepmerge from "deepmerge";
import { fetchFromWikimedia } from "./sources/wikimedia.js";
import type { DB } from "./helpers/common.js";
import { fetchFromTfNSW } from "./sources/AU-tfnsw.js";

async function main() {
  let database: DB = {};

  await fetchFromWikimedia(database);
  await fetchFromTfNSW(database);

  // add custom overrides
  const overides = JSON.parse(
    await fs.readFile(
      path.join(import.meta.dirname, "../data/manual_overrides.json"),
      "utf8",
    ),
  );
  database = deepmerge(database, overides);

  await fs.writeFile(
    path.join(import.meta.dirname, "../data/index.json"),
    JSON.stringify(database, null, 2),
  );
}

main();
