import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ hasDatabase: vi.fn(), getDb: vi.fn(), rows: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ hasDatabase: mocks.hasDatabase, getDb: mocks.getDb }));
import { getMarketplaceCatalog } from "../../lib/marketplace-data";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PHASE", "");
  mocks.hasDatabase.mockReturnValue(true);
  const chain = { from: vi.fn(), innerJoin: vi.fn(), leftJoin: vi.fn(), where: vi.fn(), orderBy: mocks.rows };
  for (const method of [chain.from, chain.innerJoin, chain.leftJoin, chain.where]) method.mockReturnValue(chain);
  mocks.getDb.mockReturnValue({ select: () => chain });
});
afterEach(() => vi.unstubAllEnvs());

describe("production catalog boundary", () => {
  it("returns a real empty catalog when no published artworks exist", async () => {
    mocks.rows.mockResolvedValue([]);
    expect(await getMarketplaceCatalog()).toEqual({ artworks: [], artists: [], databaseReady: true });
  });

  it("fails closed when production has no database configuration", async () => {
    mocks.hasDatabase.mockReturnValue(false);
    await expect(getMarketplaceCatalog()).rejects.toThrow("Production catalog unavailable");
  });

  it("does not replace database failures with demo records", async () => {
    mocks.rows.mockRejectedValue(new Error("database unavailable"));
    await expect(getMarketplaceCatalog()).rejects.toThrow("database unavailable");
  });

  it("retains the visual fallback for unconfigured local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mocks.hasDatabase.mockReturnValue(false);
    const catalog = await getMarketplaceCatalog();
    expect(catalog.databaseReady).toBe(false);
    expect(catalog.artworks.length).toBeGreaterThan(0);
  });
});
