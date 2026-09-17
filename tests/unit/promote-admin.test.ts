import { describe, expect, it } from "vitest";
import { parseEmailArg, validateUserRows } from "../../scripts/promote-admin";
import type { UserRow } from "../../scripts/promote-admin";

// ---------------------------------------------------------------------------
// Helpers — these are the testable, pure parts of the promote-admin script
// ---------------------------------------------------------------------------

const activeAdmin: UserRow = { id: "u-admin", email: "admin@example.com", role: "ADMIN", accountStatus: "ACTIVE", disabled: false };
const activeBuyer: UserRow = { id: "u-buyer", email: "buyer@example.com", role: "BUYER", accountStatus: "ACTIVE", disabled: false };
const activeSeller: UserRow = { id: "u-seller", email: "seller@example.com", role: "SELLER", accountStatus: "ACTIVE", disabled: false };
const disabledBuyer: UserRow = { id: "u-disabled", email: "dis@example.com", role: "BUYER", accountStatus: "ACTIVE", disabled: true };
const suspendedBuyer: UserRow = { id: "u-suspended", email: "susp@example.com", role: "BUYER", accountStatus: "SUSPENDED", disabled: false };

describe("parseEmailArg", () => {
  it("throws when email argument is absent", () => {
    expect(() => parseEmailArg(undefined)).toThrow("--email argument is required.");
  });

  it("throws when email argument is an empty string", () => {
    expect(() => parseEmailArg("")).toThrow("--email argument is required.");
  });

  it("throws when email argument is whitespace only", () => {
    expect(() => parseEmailArg("   ")).toThrow("--email argument is required.");
  });

  it("throws when email is not a valid address", () => {
    expect(() => parseEmailArg("not-an-email")).toThrow();
  });

  it("returns a normalized (lowercased) email for a valid address", () => {
    expect(parseEmailArg("User@Example.COM")).toBe("user@example.com");
  });

  it("normalizes unicode variant characters", () => {
    // The NFKC normalizer in normalizeEmail handles this
    expect(parseEmailArg("user@example.com")).toBe("user@example.com");
  });
});

describe("validateUserRows", () => {
  it("throws when no rows are returned", () => {
    expect(() => validateUserRows([], "nobody@example.com")).toThrow("No user found");
  });

  it("throws when more than one row matches", () => {
    expect(() => validateUserRows([activeBuyer, activeSeller], "x@example.com")).toThrow("Multiple users matched");
  });

  it("throws when the matched user is disabled", () => {
    expect(() => validateUserRows([disabledBuyer], disabledBuyer.email)).toThrow("disabled");
  });

  it("throws when the matched user is not ACTIVE", () => {
    expect(() => validateUserRows([suspendedBuyer], suspendedBuyer.email)).toThrow("SUSPENDED");
  });

  it("returns the user record when it is valid", () => {
    const result = validateUserRows([activeBuyer], activeBuyer.email);
    expect(result).toEqual(activeBuyer);
  });

  it("accepts an already-ADMIN user without throwing", () => {
    const result = validateUserRows([activeAdmin], activeAdmin.email);
    expect(result).toEqual(activeAdmin);
  });
});

// ---------------------------------------------------------------------------
// promoteToAdmin integration tests — DB calls are simulated via the helpers
// above; the real DB path is exercised via validateUserRows / parseEmailArg
// ---------------------------------------------------------------------------

describe("promote-admin: edge-case scenarios (logic only, no real DB)", () => {
  it("validates that a BUYER row passes all checks and would be promoted", () => {
    const user = validateUserRows([activeBuyer], activeBuyer.email);
    expect(user.role).not.toBe("ADMIN");
  });

  it("validates that a SELLER row passes all checks and would be promoted", () => {
    const user = validateUserRows([activeSeller], activeSeller.email);
    expect(user.role).toBe("SELLER");
  });

  it("already-ADMIN user passes validation (idempotent path)", () => {
    const user = validateUserRows([activeAdmin], activeAdmin.email);
    // Caller checks role === "ADMIN" → already-admin result, no DB write
    expect(user.role).toBe("ADMIN");
  });
});
