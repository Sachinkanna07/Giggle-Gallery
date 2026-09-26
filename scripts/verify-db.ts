/** Read-only schema check. Load credentials externally; never echo the URL or driver errors. */
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { getDb } from "../db/index";

const required = ["auctions", "auction_bids", "auction_events", "auction_payment_attempts"];

async function main() {
  if (!process.env.DATABASE_URL) {
    process.stdout.write("Database connectivity: FAILED (DATABASE_URL missing)\n");
    process.exitCode = 1;
    return;
  }
  try {
    const result = await getDb().execute(sql`
      select table_name from information_schema.tables
      where table_schema = 'public'
      and table_name in ('auctions', 'auction_bids', 'auction_events', 'auction_payment_attempts')
    `);
    const present = new Set(result.rows.map((row) => String(row.table_name)));
    process.stdout.write("Database connectivity: OK\n");
    for (const name of required) process.stdout.write(`${name}: ${present.has(name) ? "PRESENT" : "MISSING"}\n`);
    const journal = await getDb().execute(sql`select to_regclass('drizzle.__drizzle_migrations') is not null as present`);
    process.stdout.write(`Drizzle migration journal: ${journal.rows[0]?.present ? "PRESENT" : "MISSING"}\n`);
    let latestApplied = false;
    if (journal.rows[0]?.present) {
      const local = JSON.parse(readFileSync(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8")) as { entries: Array<{ when: number }> };
      const latestExpected = Math.max(...local.entries.map((entry) => entry.when));
      const migrationRows = await getDb().execute(sql`select max(created_at) as latest from drizzle.__drizzle_migrations`);
      latestApplied = migrationRows.rows[0]?.latest != null && BigInt(String(migrationRows.rows[0].latest)) >= BigInt(latestExpected);
    }
    process.stdout.write(`Latest checked-in migration: ${latestApplied ? "APPLIED" : "MISSING"}\n`);
    if (required.some((name) => !present.has(name)) || !latestApplied) process.exitCode = 1;
  } catch {
    process.stdout.write("Database connectivity or schema check: FAILED\n");
    process.exitCode = 1;
  }
}

void main();
