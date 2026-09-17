/**
 * Operator-only admin promotion script.
 *
 * Usage (dry run — shows what would happen, no changes):
 *   npm run admin:promote -- --email user@example.com
 *
 * Usage (apply — actually updates the role):
 *   npm run admin:promote -- --email user@example.com --apply
 *
 * DATABASE_URL must be set in the environment (e.g. via .env.local).
 * Never commit real credentials.
 */

import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { users } from "../db/schema";
import { normalizeEmail } from "../lib/identity/rules";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserRow = {
  id: string;
  email: string;
  role: string;
  accountStatus: string;
  disabled: boolean;
};

export type PromoteResult =
  | { status: "already-admin"; user: UserRow }
  | { status: "would-promote"; user: UserRow }
  | { status: "promoted"; user: UserRow }
  | { status: "error"; reason: string };

// ---------------------------------------------------------------------------
// Core helper — testable without a real DB connection
// ---------------------------------------------------------------------------

/** Validate a raw email argument and return the normalized form or throw. */
export function parseEmailArg(raw: string | undefined): string {
  if (!raw || raw.trim() === "") throw new Error("--email argument is required.");
  // normalizeEmail throws a Zod error if the value is not a valid email.
  return normalizeEmail(raw.trim());
}

/** Decide whether rows from the DB are valid for promotion. */
export function validateUserRows(rows: UserRow[], normalizedEmail: string): UserRow {
  if (rows.length === 0) throw new Error(`No user found with email: ${normalizedEmail}`);
  if (rows.length > 1) throw new Error(`Multiple users matched email: ${normalizedEmail} — cannot safely identify one.`);
  const user = rows[0]!;
  if (user.disabled) throw new Error(`User ${user.id} is disabled. Cannot promote a disabled account.`);
  if (user.accountStatus !== "ACTIVE") throw new Error(`User ${user.id} has accountStatus=${user.accountStatus}. Only ACTIVE accounts may be promoted.`);
  return user;
}

// ---------------------------------------------------------------------------
// Database interaction
// ---------------------------------------------------------------------------

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Configure it via .env.local before running this script.");
  return drizzle({ connection: url });
}

async function findUserByEmail(normalizedEmail: string): Promise<UserRow[]> {
  const db = getDb();
  return db
    .select({ id: users.id, email: users.email, role: users.role, accountStatus: users.accountStatus, disabled: users.disabled })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(2) as Promise<UserRow[]>;
}

async function applyAdminRole(userId: string): Promise<void> {
  const db = getDb();
  await db.update(users).set({ role: "ADMIN", updatedAt: new Date() }).where(eq(users.id, userId));
}

// ---------------------------------------------------------------------------
// Main promotion logic — also exported for unit tests
// ---------------------------------------------------------------------------

export async function promoteToAdmin(
  rawEmail: string | undefined,
  apply: boolean,
): Promise<PromoteResult> {
  let normalizedEmail: string;
  try {
    normalizedEmail = parseEmailArg(rawEmail);
  } catch (err) {
    return { status: "error", reason: (err as Error).message };
  }

  let rows: UserRow[];
  try {
    rows = await findUserByEmail(normalizedEmail);
  } catch (err) {
    return { status: "error", reason: (err as Error).message };
  }

  let user: UserRow;
  try {
    user = validateUserRows(rows, normalizedEmail);
  } catch (err) {
    return { status: "error", reason: (err as Error).message };
  }

  if (user.role === "ADMIN") {
    return { status: "already-admin", user };
  }

  if (!apply) {
    return { status: "would-promote", user };
  }

  try {
    await applyAdminRole(user.id);
  } catch (err) {
    return { status: "error", reason: `Database update failed: ${(err as Error).message}` };
  }

  return { status: "promoted", user };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");
  const rawEmail = emailIdx !== -1 ? args[emailIdx + 1] : undefined;
  const apply = args.includes("--apply");

  console.log("\n=== Giggle Gallery Admin Promotion ===");
  if (!apply) {
    console.log("Mode: DRY RUN (pass --apply to commit changes)");
  } else {
    console.log("Mode: APPLY");
  }
  console.log("");

  const result = await promoteToAdmin(rawEmail, apply);

  switch (result.status) {
    case "error":
      console.error(`ERROR: ${result.reason}`);
      process.exitCode = 1;
      break;

    case "already-admin":
      console.log(`User is already ADMIN — no changes needed.`);
      console.log(`  ID:    ${result.user.id}`);
      console.log(`  Email: ${result.user.email}`);
      console.log(`  Role:  ${result.user.role}`);
      break;

    case "would-promote":
      console.log(`DRY RUN: Would promote user from ${result.user.role} to ADMIN.`);
      console.log(`  ID:           ${result.user.id}`);
      console.log(`  Email:        ${result.user.email}`);
      console.log(`  Current role: ${result.user.role}`);
      console.log(`  New role:     ADMIN`);
      console.log("");
      console.log(`Run with --apply to commit this change.`);
      break;

    case "promoted":
      console.log(`SUCCESS: User promoted to ADMIN.`);
      console.log(`  ID:           ${result.user.id}`);
      console.log(`  Email:        ${result.user.email}`);
      console.log(`  Previous role: ${result.user.role}`);
      console.log(`  New role:     ADMIN`);
      console.log("");
      console.log(`The user must sign out and sign back in for the new role to take effect.`);
      break;
  }

  console.log("");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exitCode = 1;
});
